from fastapi import APIRouter, File, UploadFile, HTTPException
import asyncio
import base64
import os
import cv2
import numpy as np
import tempfile
import logging
from collections import Counter
from typing import List, Optional, Tuple

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analyze", tags=["analysis"])

# ---------------------------------------------------------------------------
# Global model loading
# ---------------------------------------------------------------------------
_yolo_model = None
_ocr_reader = None


def _get_yolo():
    global _yolo_model
    if _yolo_model is None:
        try:
            from ultralytics import YOLO
            _yolo_model = YOLO("yolov8n.pt")
            logger.info("[AI] YOLOv8 loaded.")
        except Exception as exc:
            logger.error(f"[AI] YOLOv8 load failed: {exc}")
    return _yolo_model


def _yolo_device() -> str:
    try:
        import torch
        return "0" if torch.cuda.is_available() else "cpu"
    except Exception:
        return "cpu"


def _get_ocr():
    global _ocr_reader
    if _ocr_reader is None:
        try:
            import easyocr, torch
            _ocr_reader = easyocr.Reader(["en"], gpu=torch.cuda.is_available())
            logger.info("[AI] EasyOCR loaded.")
        except Exception as exc:
            logger.error(f"[AI] EasyOCR load failed: {exc}")
    return _ocr_reader


try:
    _get_yolo()
    _get_ocr()
except Exception:
    pass

# ---------------------------------------------------------------------------
# COCO labels
# ---------------------------------------------------------------------------
COCO_MOTORCYCLE      = "motorcycle"
COCO_PERSON          = "person"
HELMET_PROXY_CLASSES = {"sports ball"}

# ---------------------------------------------------------------------------
# Tuning constants
# ---------------------------------------------------------------------------
_YOLO_IMGSZ          = 640
_YOLO_CONF           = 0.25
_MAX_PROCESSED       = 60
_EARLY_STOP_VIOLS    = 2
_EARLY_STOP_PLATE    = 1
_BLUR_THRESHOLD      = 40.0
_IOU_DRIVER_THRESH   = 0.10
_MOTION_SPEED_THR    = 35.0
_NO_PLATE_FRAMES     = 12
_ANNOT_PAD           = 0.20
_PLATE_OCR_MIN_CONF  = 0.35
_OUTPUT_JPEG_QUALITY = 95
_PLATE_UPSCALE       = 3
_OUTPUT_MAX_DIM      = 960

# ---------------------------------------------------------------------------
# Geometry helpers
# ---------------------------------------------------------------------------

def _iou(a: List[float], b: List[float]) -> float:
    xA, yA = max(a[0], b[0]), max(a[1], b[1])
    xB, yB = min(a[2], b[2]), min(a[3], b[3])
    inter  = max(0.0, xB - xA) * max(0.0, yB - yA)
    if inter == 0.0:
        return 0.0
    return inter / ((a[2]-a[0])*(a[3]-a[1]) + (b[2]-b[0])*(b[3]-b[1]) - inter + 1e-6)


def _box_center(b: List[float]) -> Tuple[float, float]:
    return ((b[0] + b[2]) / 2.0, (b[1] + b[3]) / 2.0)


def _dist(a: Tuple[float, float], b: Tuple[float, float]) -> float:
    return ((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2) ** 0.5


def _laplacian_variance(gray: np.ndarray) -> float:
    return float(cv2.Laplacian(gray, cv2.CV_64F).var())


def _resize_to_width(frame: np.ndarray, width: int) -> np.ndarray:
    h, w = frame.shape[:2]
    if w == width:
        return frame
    return cv2.resize(frame, (width, int(h * width / w)), interpolation=cv2.INTER_LINEAR)


def _limit_dim(frame: np.ndarray, max_dim: int = _OUTPUT_MAX_DIM) -> np.ndarray:
    h, w = frame.shape[:2]
    longest = max(h, w)
    if longest <= max_dim:
        return frame
    s = max_dim / longest
    return cv2.resize(frame, (int(w * s), int(h * s)), interpolation=cv2.INTER_AREA)


def _boxes_equal(a: List[float], b: List[float]) -> bool:
    """
    Safe element-wise equality for two bounding-box coordinate lists.

    The plain Python expression ``a == b`` is ambiguous when the items come
    from boxes.xyxy.tolist() because PyTorch / NumPy may return objects whose
    __eq__ produces an array rather than a scalar bool, triggering:

        ValueError: The truth value of an array with more than one element
                    is ambiguous. Use a.any() or a.all()

    This helper converts every element to a plain Python float before
    comparing, so the result is always a scalar bool regardless of the
    underlying tensor type.
    """
    if len(a) != len(b):
        return False
    return all(float(x) == float(y) for x, y in zip(a, b))

# ---------------------------------------------------------------------------
# Image enhancement
# ---------------------------------------------------------------------------

def _sharpen(img: np.ndarray) -> np.ndarray:
    blur = cv2.GaussianBlur(img, (0, 0), 3)
    return cv2.addWeighted(img, 1.5, blur, -0.5, 0)


def _enhance_plate_roi(roi: np.ndarray) -> np.ndarray:
    """Upscale + denoise + CLAHE + sharpen for better OCR accuracy."""
    h, w  = roi.shape[:2]
    big   = cv2.resize(roi, (w * _PLATE_UPSCALE, h * _PLATE_UPSCALE),
                       interpolation=cv2.INTER_CUBIC)
    gray  = cv2.cvtColor(big, cv2.COLOR_BGR2GRAY) if big.ndim == 3 else big
    gray  = cv2.fastNlMeansDenoising(gray, h=10, templateWindowSize=7,
                                     searchWindowSize=21)
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    gray  = clahe.apply(gray)
    kernel = np.array([[-1, -1, -1],
                       [-1,  9, -1],
                       [-1, -1, -1]], dtype=np.float32)
    gray  = cv2.filter2D(gray, -1, kernel)
    return np.clip(gray, 0, 255).astype(np.uint8)

# ---------------------------------------------------------------------------
# Crop helpers
# ---------------------------------------------------------------------------

def _padded_crop(frame: np.ndarray, box: List[float],
                 pad: float = _ANNOT_PAD) -> np.ndarray:
    fh, fw = frame.shape[:2]
    x1, y1, x2, y2 = box
    bw, bh = x2 - x1, y2 - y1
    rx1 = max(0,  int(x1 - bw * pad))
    ry1 = max(0,  int(y1 - bh * pad))
    rx2 = min(fw, int(x2 + bw * pad))
    ry2 = min(fh, int(y2 + bh * pad))
    if rx2 <= rx1 or ry2 <= ry1:
        return frame
    return frame[ry1:ry2, rx1:rx2]


def _crop_plate_roi(frame: np.ndarray,
                    moto_box: List[float],
                    h_pad: float = 0.30,
                    v_start: float = 0.48) -> Optional[np.ndarray]:
    """
    Crop the lower portion of the motorcycle box from the original full-res
    frame.

    h_pad   - horizontal padding fraction each side
    v_start - start Y at this fraction of box height from y1
              (0.48 = lower half, where the plate lives)
    """
    fh, fw = frame.shape[:2]
    x1, y1, x2, y2 = moto_box
    bw = x2 - x1
    bh = y2 - y1

    rx1 = max(0,  int(x1 - bw * h_pad))
    ry1 = max(0,  int(y1 + bh * v_start))
    rx2 = min(fw, int(x2 + bw * h_pad))
    ry2 = min(fh, int(y2 + bh * 1.10))

    # Guard degenerate crops - fallback to full moto box
    if (rx2 - rx1) < 15 or (ry2 - ry1) < 8:
        rx1 = max(0,  int(x1))
        ry1 = max(0,  int(y1))
        rx2 = min(fw, int(x2))
        ry2 = min(fh, int(y2))
        if rx2 <= rx1 or ry2 <= ry1:
            return None

    return frame[ry1:ry2, rx1:rx2]

# ---------------------------------------------------------------------------
# Annotation helpers
# ---------------------------------------------------------------------------

def _draw_violation_annotation(frame: np.ndarray, draw_box: List[float],
                                violation: str, confidence: float) -> np.ndarray:
    out = frame.copy()
    fh, fw = out.shape[:2]
    x1, y1, x2, y2 = [int(v) for v in draw_box]
    x1, y1 = max(0, x1), max(0, y1)
    x2, y2 = min(fw - 1, x2), min(fh - 1, y2)
    cv2.rectangle(out, (x1, y1), (x2, y2), (0, 0, 255), 2)

    font  = cv2.FONT_HERSHEY_SIMPLEX
    fs    = 0.45
    thick = 1
    red   = (0, 0, 255)

    l1 = f"Violation Detected: {violation}"
    l2 = f"Confidence Score: {confidence * 100:.0f}%"
    (w1, h1), _  = cv2.getTextSize(l1, font, fs, thick)
    (w2, h2), bl = cv2.getTextSize(l2, font, fs, thick)

    tx1 = max(0, x2 - w1)
    ty1 = max(h1, y1 - 4 - h2 - 3 - bl)
    if ty1 < h1:
        ty1 = y1 + h1 + 4
    tx2 = max(0, x2 - w2)
    ty2 = ty1 + h2 + 3

    cv2.putText(out, l1, (tx1, ty1), font, fs, red, thick, cv2.LINE_AA)
    cv2.putText(out, l2, (tx2, ty2), font, fs, red, thick, cv2.LINE_AA)
    return out


def _draw_plate_annotation(roi: np.ndarray, plate_text: str,
                            ocr_bbox: Optional[List] = None) -> np.ndarray:
    out = roi.copy()
    h, w = out.shape[:2]
    red  = (0, 0, 255)

    if ocr_bbox is not None:
        pts = np.array(ocr_bbox, dtype=np.int32)
        cv2.polylines(out, [pts], isClosed=True, color=red, thickness=2)
        text_y_base = min(h - 4, int(max(p[1] for p in ocr_bbox)) + 18)
    else:
        cv2.rectangle(out, (2, 2), (w - 3, h - 3), red, 2)
        text_y_base = h - 6

    label = f"Number Plate: {plate_text}"
    font  = cv2.FONT_HERSHEY_SIMPLEX
    fs    = 0.48
    thick = 1
    (tw, th), bl = cv2.getTextSize(label, font, fs, thick)
    tx = max(0, (w - tw) // 2)
    ty = min(h - 2, max(th + bl + 2, text_y_base))
    cv2.putText(out, label, (tx, ty), font, fs, red, thick, cv2.LINE_AA)
    return out

# ---------------------------------------------------------------------------
# Motion
# ---------------------------------------------------------------------------

def _estimate_motion(prev_gray: Optional[np.ndarray],
                     curr_gray: np.ndarray) -> float:
    if prev_gray is None or prev_gray.shape != curr_gray.shape:
        return 0.0
    try:
        flow = cv2.calcOpticalFlowFarneback(
            prev_gray, curr_gray, None, 0.5, 3, 15, 3, 5, 1.2, 0)
        mag, _ = cv2.cartToPolar(flow[..., 0], flow[..., 1])
        return float(mag.mean())
    except Exception:
        return 0.0

# ---------------------------------------------------------------------------
# OCR
# ---------------------------------------------------------------------------

def _ocr_roi(roi: np.ndarray, ocr,
             min_conf: float = _PLATE_OCR_MIN_CONF
             ) -> Optional[Tuple[str, float, Optional[List]]]:
    if ocr is None or roi is None or roi.size == 0:
        return None
    try:
        hits = ocr.readtext(
            roi, detail=1, paragraph=False,
            allowlist="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-",
        )
        hits = sorted(hits, key=lambda x: x[2], reverse=True)
        for (bbox, text, prob) in hits:
            cleaned = text.strip().replace(" ", "-").upper()
            prob    = float(prob)
            if prob < min_conf:
                continue
            if not (4 <= len(cleaned) <= 13):
                continue
            if not (any(c.isalpha() for c in cleaned) and
                    any(c.isdigit() for c in cleaned)):
                continue
            return cleaned, prob, bbox
    except Exception as exc:
        logger.warning(f"[OCR] readtext failed: {exc}")
    return None

# ---------------------------------------------------------------------------
# Driver detection
# ---------------------------------------------------------------------------

def _find_driver_box(person_boxes: List[List[float]],
                     moto_box: List[float]) -> Optional[List[float]]:
    if not person_boxes:
        return None
    best_box:  Optional[List[float]] = None
    best_score = -1.0
    moto_cx, moto_cy = _box_center(moto_box)
    moto_w = max(moto_box[2] - moto_box[0], 1.0)
    for pb in person_boxes:
        score = (1.5*_iou(pb, moto_box)
                 - 0.2 * (_dist(_box_center(pb), (moto_cx, moto_cy)) / moto_w)
                 +0.3*(1-abs((_box_center(pb)[0]-moto_cx)/moto_w)))
        if score > best_score:
            best_score = score
            best_box   = pb
    if best_box is not None:
        if (_iou(best_box, moto_box) < _IOU_DRIVER_THRESH and
                _dist(_box_center(best_box), _box_center(moto_box)) > 1.5 * moto_w):
            return None
    return best_box

# ---------------------------------------------------------------------------
# Output encoding
# ---------------------------------------------------------------------------

def _frame_to_b64(frame: np.ndarray) -> str:
    frame = _limit_dim(frame)
    if frame.ndim == 3:
        frame = _sharpen(frame)
    ok, buf = cv2.imencode(
        ".jpg", frame,
        [cv2.IMWRITE_JPEG_QUALITY, _OUTPUT_JPEG_QUALITY,
         cv2.IMWRITE_JPEG_OPTIMIZE, 1])
    return base64.b64encode(buf.tobytes()).decode("utf-8") if ok else ""


def _best_plate_from_list(plates: List[Tuple[str, float]]) -> Optional[str]:
    if not plates:
        return None
    freq     = Counter(p[0] for p in plates)
    max_freq = freq.most_common(1)[0][1]
    top      = [t for t, f in freq.items() if f == max_freq]

    def mean_conf(t: str) -> float:
        vals = [c for txt, c in plates if txt == t]
        return float(np.mean(vals)) if vals else 0.0

    return max(top, key=mean_conf)

# ---------------------------------------------------------------------------
# Core analysis
# ---------------------------------------------------------------------------

def _analyse_frames(video_path: str) -> dict:
    model  = _get_yolo()
    ocr    = _get_ocr()
    device = _yolo_device()

    if model is None:
        raise RuntimeError("YOLOv8 model not available.")

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError(f"Cannot open video: {video_path}")

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps          = cap.get(cv2.CAP_PROP_FPS) or 25.0
    logger.info(f"[LOOP] {video_path}  frames={total_frames}  fps={fps:.1f}")

    violations_detected: List[str]               = []
    confidence_scores:   List[float]             = []
    plates_detected:     List[Tuple[str, float]] = []

    best_violation_conf      = 0.0
    best_violation_frame:    Optional[np.ndarray] = None
    best_violation_draw_box: Optional[List[float]] = None
    best_violation_label     = ""
    best_violation_conf_raw  = 0.0

    best_plate_conf          = 0.0
    best_plate_raw_roi:  Optional[np.ndarray] = None
    best_plate_text          = ""
    best_plate_bbox:     Optional[List]       = None

    last_plate_raw_roi:  Optional[np.ndarray] = None
    last_plate_text          = ""
    last_plate_bbox:     Optional[List]       = None

    raw_frame_idx        = 0
    proc_frame_idx       = 0
    violations_count     = 0
    plates_count         = 0
    moto_frames_no_plate = 0

    prev_gray:    Optional[np.ndarray] = None
    prev_moto_cx: Optional[float]      = None
    direction_flips = 0

    stride = 4

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                logger.info(f"[LOOP] EOF at raw={raw_frame_idx}")
                break
            if proc_frame_idx >= _MAX_PROCESSED:
                logger.info(f"[LOOP] _MAX_PROCESSED={_MAX_PROCESSED} hit.")
                break
            if raw_frame_idx % stride != 0:
                raw_frame_idx += 1
                continue
            raw_frame_idx += 1

            # Keep original for high-res plate crop
            orig_frame = frame
            orig_h, orig_w = orig_frame.shape[:2]

            # Resize to 640 ONLY for YOLO
            small = _resize_to_width(frame, _YOLO_IMGSZ)
            gray  = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)

            blur_val = _laplacian_variance(gray)
            if blur_val < _BLUR_THRESHOLD:
                logger.debug(f"[BLUR] raw={raw_frame_idx} var={blur_val:.1f} SKIP")
                prev_gray = gray
                continue

            proc_frame_idx += 1
            logger.info(f"[PROC] raw={raw_frame_idx} proc={proc_frame_idx} "
                        f"blur={blur_val:.1f}")

            try:
                results = model(small, imgsz=_YOLO_IMGSZ, conf=_YOLO_CONF,
                                device=device, verbose=False)
            except Exception as exc:
                logger.error(f"[YOLO] Inference error: {exc}")
                prev_gray = gray
                continue

            prev_gray = gray

            if not results:
                continue

            det   = results[0]
            names = det.names
            boxes = det.boxes

            if boxes is None or len(boxes) == 0:
                logger.debug(f"[YOLO] No boxes at raw={raw_frame_idx}")
                continue

            # ── Convert box tensors to plain Python float lists ──────────
            # ROOT FIX: Force every coordinate to a plain Python float.
            # boxes.xyxy.tolist() can return 0-d tensors in some ultralytics
            # builds; wrapping with float() guarantees scalar values so that
            # any downstream == comparison is always a scalar bool and never
            # raises "The truth value of an array is ambiguous."
            raw_xyxy: List[List[float]] = [
                [float(v) for v in box] for box in boxes.xyxy.tolist()
            ]
            labels: List[str]   = [names[int(c)] for c in boxes.cls.tolist()]
            confs:  List[float] = [float(c) for c in boxes.conf.tolist()]

            logger.info(f"[YOLO] {list(zip(labels, [f'{c:.2f}' for c in confs]))}")

            moto_boxes:   List[List[float]] = []
            person_boxes: List[List[float]] = []
            has_helmet_proxy = False

            for lbl, box in zip(labels, raw_xyxy):
                if lbl == COCO_MOTORCYCLE:
                    moto_boxes.append(box)
                elif lbl == COCO_PERSON:
                    person_boxes.append(box)
                elif lbl in HELMET_PROXY_CLASSES:
                    has_helmet_proxy = True

            if not moto_boxes:
                prev_moto_cx = None
                continue

            stride = 3  # tighten once motorcycle found

            moto_box = max(moto_boxes, key=lambda b: (b[2] - b[0]) * (b[3] - b[1]))
            moto_conf_val = next(
                (c for l, c in zip(labels, confs) if l == COCO_MOTORCYCLE), 0.5)

            logger.info(f"[MOTO] box={[int(v) for v in moto_box]}  "
                        f"conf={moto_conf_val:.2f}  persons={len(person_boxes)}")

            driver_box  = _find_driver_box(person_boxes, moto_box)
            has_driver  = driver_box is not None
            rider_count = sum(
                1 for pb in person_boxes
                if (_iou(pb, moto_box) >= _IOU_DRIVER_THRESH or
                    _dist(_box_center(pb), _box_center(moto_box))
                    <= 1.5 * max(moto_box[2] - moto_box[0], 1.0))
            )

            motion_mag   = _estimate_motion(prev_gray, gray)
            curr_moto_cx = _box_center(moto_box)[0]
            if prev_moto_cx is not None:
                if ((curr_moto_cx - prev_moto_cx) *
                        (prev_moto_cx - curr_moto_cx) < 0):
                    direction_flips += 1
            prev_moto_cx = curr_moto_cx

            # ── Violation classification ──────────────────────────────────
            violation:  Optional[str] = None
            frame_conf: float         = 0.0

            if has_driver and not has_helmet_proxy:
                # Use _boxes_equal() to compare box lists safely.
                # The old "b == driver_box" expression caused the crash when
                # either side held a NumPy/Torch array instead of plain floats.
                driver_conf = next(
                    (c for l, c, b in zip(labels, confs, raw_xyxy)
                     if l == COCO_PERSON and _iou(b, driver_box)>0.8),
                    moto_conf_val,
                )
                frame_conf = float(np.mean([moto_conf_val, driver_conf]))
                violation  = "No Helmet Detected"
            elif rider_count >= 2:
                frame_conf = float(moto_conf_val)
                violation  = "Triple Riding Detected"
            elif not has_driver and not has_helmet_proxy:
                frame_conf = float(moto_conf_val) * 0.75
                violation  = "No Helmet Detected"

            if violation is None and motion_mag > _MOTION_SPEED_THR:
                violation  = "Overspeeding"
                frame_conf = min(0.55 + motion_mag / 200.0, 0.85)

            if violation is None and direction_flips >= 3:
                violation  = "Wrong Side Driving"
                frame_conf = 0.60

            if violation:
                logger.info(f"[VIOLATION] {violation}  conf={frame_conf:.2f}")
                violations_detected.append(violation)
                confidence_scores.append(frame_conf)
                violations_count += 1

                sharpness   = _laplacian_variance(gray)
                frame_score = frame_conf * min(sharpness / 200.0, 1.0)
                if frame_score > best_violation_conf:
                    best_violation_conf     = frame_score
                    best_violation_conf_raw = frame_conf
                    best_violation_label    = violation
                    best_violation_draw_box = (driver_box if driver_box is not None
                                               else moto_box)
                    best_violation_frame    = orig_frame.copy()

            # ── OCR: crop plate ROI from ORIGINAL full-res frame ─────────
            # Scale YOLO (640-wide) box coords back to original frame coords
            scale_x = orig_w / small.shape[1]
            scale_y = orig_h / small.shape[0]
            moto_box_orig = [
                moto_box[0] * scale_x, moto_box[1] * scale_y,
                moto_box[2] * scale_x, moto_box[3] * scale_y,
            ]

            plate_found_this_frame = False
            if ocr is not None:
                raw_roi = _crop_plate_roi(orig_frame, moto_box_orig)
                logger.info(
                    f"[OCR] ROI={raw_roi.shape if raw_roi is not None else 'None'}")

                if raw_roi is not None and raw_roi.size > 0:
                    # Pass 1: enhanced greyscale
                    hit = None
                    try:
                        enhanced = _enhance_plate_roi(raw_roi)
                        hit = _ocr_roi(enhanced, ocr)
                        if hit:
                            logger.info(
                                f"[OCR] Pass-1: {hit[0]}  conf={hit[1]:.2f}")
                    except Exception as exc:
                        logger.warning(f"[OCR] Pass-1 error: {exc}")

                    # Pass 2: raw BGR with lower confidence floor
                    if hit is None:
                        hit = _ocr_roi(raw_roi, ocr, min_conf=0.28)
                        if hit:
                            logger.info(
                                f"[OCR] Pass-2: {hit[0]}  conf={hit[1]:.2f}")

                    if hit is not None:
                        plate_text, plate_prob, ocr_bbox = hit
                        plates_detected.append((plate_text, plate_prob))
                        plates_count          += 1
                        plate_found_this_frame = True
                        moto_frames_no_plate   = 0

                        last_plate_raw_roi = raw_roi.copy()
                        last_plate_text    = plate_text
                        last_plate_bbox    = ocr_bbox

                        sharpness   = _laplacian_variance(gray)
                        plate_score = plate_prob * min(sharpness / 200.0, 1.0)
                        if plate_score > best_plate_conf:
                            best_plate_conf    = plate_score
                            best_plate_raw_roi = raw_roi.copy()
                            best_plate_text    = plate_text
                            best_plate_bbox    = ocr_bbox
                            logger.info(
                                f"[OCR] New best: {plate_text}  "
                                f"score={plate_score:.3f}")
                    else:
                        logger.info("[OCR] No valid plate text in ROI.")
                else:
                    logger.warning("[OCR] ROI None/empty.")

            if not plate_found_this_frame:
                moto_frames_no_plate += 1

            if moto_frames_no_plate >= _NO_PLATE_FRAMES and not plates_detected:
                violations_detected.append("No Number Plate")
                confidence_scores.append(0.70)
                violations_count     += 1
                moto_frames_no_plate  = 0

            if (violations_count >= _EARLY_STOP_VIOLS and
                    plates_count >= _EARLY_STOP_PLATE):
                logger.info(
                    f"[LOOP] Early stop  viols={violations_count}  "
                    f"plates={plates_count}")
                break

        cap.release()

    except Exception:
        cap.release()
        raise

    logger.info(
        f"[DONE] violations={violations_detected}  plates={plates_detected}")

    # ── Temporal aggregation — violation ─────────────────────────────────
    if violations_detected:
        freq     = Counter(violations_detected)
        max_freq = freq.most_common(1)[0][1]
        top      = [v for v, f in freq.items() if f == max_freq]

        def mean_vconf(label: str) -> float:
            vals = [c for v, c in zip(violations_detected, confidence_scores)
                    if v == label]
            return float(np.mean(vals)) if vals else 0.0

        final_violation  = max(top, key=mean_vconf)
        final_confidence = mean_vconf(final_violation)
    else:
        final_violation  = "No Violation Detected"
        final_confidence = 0.0

    final_plate = _best_plate_from_list(plates_detected) or "UNDETECTED"

    # ── Annotate violation frame ──────────────────────────────────────────
    if best_violation_frame is not None and best_violation_draw_box is not None:
        annotated_viol = _draw_violation_annotation(
            best_violation_frame, best_violation_draw_box,
            best_violation_label, best_violation_conf_raw)
        annotated_viol = _padded_crop(annotated_viol, best_violation_draw_box)
    else:
        annotated_viol = best_violation_frame

    # ── Plate frame: best first, then last ───────────────────────────────
    res_raw  = best_plate_raw_roi if best_plate_raw_roi is not None else last_plate_raw_roi
    res_text = best_plate_text if best_plate_text else last_plate_text
    res_bbox = best_plate_bbox if best_plate_bbox is not None else last_plate_bbox

    if res_raw is not None:
        h, w        = res_raw.shape[:2]
        display_roi = cv2.resize(res_raw, (w * 2, h * 2),
                                 interpolation=cv2.INTER_CUBIC)
        display_roi = _sharpen(display_roi)
        scaled_bbox = None
        if res_bbox is not None:
            try:
                scaled_bbox = [[int(p[0] * 2), int(p[1] * 2)] for p in res_bbox]
            except Exception:
                pass
        annotated_plate = _draw_plate_annotation(display_roi, res_text, scaled_bbox)
    else:
        annotated_plate = None
        logger.warning("[DONE] No plate frame to output.")

    violation_frame_b64 = (_frame_to_b64(annotated_viol)
                           if annotated_viol  is not None else "")
    plate_frame_b64     = (_frame_to_b64(annotated_plate)
                           if annotated_plate is not None else "")

    return {
        "violation":       final_violation,
        "plate":           final_plate,
        "confidence":      round(final_confidence, 4),
        "violation_frame": violation_frame_b64,
        "plate_frame":     plate_frame_b64,
    }

# ---------------------------------------------------------------------------
# FastAPI endpoint
# ---------------------------------------------------------------------------

@router.post("/")
async def analyze_video(video: UploadFile = File(...)):
    ct = video.content_type or ""
    fn = video.filename or "upload.mp4"
    if not (ct.startswith("video/") or fn.endswith((".mp4", ".mov", ".avi", ".mkv"))):
        raise HTTPException(status_code=400,
                            detail="File does not appear to be a video.")

    suffix   = os.path.splitext(fn)[1] or ".mp4"
    tmp_path: Optional[str] = None

    try:
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp_path = tmp.name
            while chunk := await video.read(1024 * 1024):
                tmp.write(chunk)

        logger.info(f"[API] Saved {tmp_path}, analysing...")
        result = await asyncio.to_thread(_analyse_frames, tmp_path)
        logger.info(f"[API] Done: {result}")
        return result

    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        logger.exception("[API] Unexpected error")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {exc}")
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except OSError:
                pass