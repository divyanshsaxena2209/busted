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

router = APIRouter(
    prefix="/analyze",
    tags=["analysis"]
)

# ---------------------------------------------------------------------------
# Global model loading — runs once at import time, not per request
# ---------------------------------------------------------------------------
_yolo_model = None
_ocr_reader = None


def _get_yolo():
    global _yolo_model
    if _yolo_model is None:
        try:
            from ultralytics import YOLO
            _yolo_model = YOLO("yolov8n.pt")
            logger.info("[AI] YOLOv8 model loaded successfully.")
        except Exception as exc:
            logger.error(f"[AI] Failed to load YOLOv8: {exc}")
    return _yolo_model


def _yolo_device() -> str:
    """Return '0' (first GPU) when CUDA is available, else 'cpu'."""
    try:
        import torch
        return "0" if torch.cuda.is_available() else "cpu"
    except Exception:
        return "cpu"


def _get_ocr():
    global _ocr_reader
    if _ocr_reader is None:
        try:
            import easyocr
            import torch
            use_gpu = torch.cuda.is_available()
            _ocr_reader = easyocr.Reader(["en"], gpu=use_gpu)
            logger.info(f"[AI] EasyOCR loaded (gpu={use_gpu}).")
        except Exception as exc:
            logger.error(f"[AI] Failed to load EasyOCR: {exc}")
    return _ocr_reader


# Eagerly initialise on module load (background-friendly)
try:
    _get_yolo()
    _get_ocr()
except Exception:
    pass


# ---------------------------------------------------------------------------
# COCO class names that YOLOv8n knows about
# ---------------------------------------------------------------------------
COCO_MOTORCYCLE = "motorcycle"
COCO_PERSON = "person"

# YOLOv8 / COCO does not have an explicit "helmet" class.
# We approximate helmet detection by checking whether a tight bounding box
# above the detected person overlaps with a high-confidence "sports ball" or
# any object whose detected label includes head-like items.  For production,
# you would fine-tune on a helmet dataset; here we use the pragmatic heuristic:
# if a person is very close to a motorcycle AND there is no clearly separated
# head-region detection, we flag "No Helmet".
HELMET_PROXY_CLASSES = {"sports ball"}   # placeholder until custom model


# ---------------------------------------------------------------------------
# Core analysis helpers (synchronous — run via asyncio.to_thread)
# ---------------------------------------------------------------------------

# ── Tuning constants ────────────────────────────────────────────────────────
_YOLO_IMGSZ       = 640          # inference resolution
_YOLO_CONF        = 0.30         # detection threshold
_MAX_PROCESSED    = 55           # hard cap on frames we ever run YOLO on
_EARLY_STOP_VIOLS = 2            # early-exit: violations confirmed
_EARLY_STOP_PLATE = 1            # early-exit: plates confirmed
_OCR_EVERY_N      = 10           # fallback: run OCR every N processed frames
_BLUR_THRESHOLD   = 80.0         # Laplacian variance; below → discard frame
_IOU_DRIVER_THRESH = 0.10        # min IoU between person and motorcycle boxes
# ────────────────────────────────────────────────────────────────────────────


def _iou(boxA: List[float], boxB: List[float]) -> float:
    """Compute Intersection-over-Union for two [x1,y1,x2,y2] boxes."""
    xA = max(boxA[0], boxB[0])
    yA = max(boxA[1], boxB[1])
    xB = min(boxA[2], boxB[2])
    yB = min(boxA[3], boxB[3])
    inter = max(0.0, xB - xA) * max(0.0, yB - yA)
    if inter == 0.0:
        return 0.0
    aA = (boxA[2] - boxA[0]) * (boxA[3] - boxA[1])
    aB = (boxB[2] - boxB[0]) * (boxB[3] - boxB[1])
    return inter / (aA + aB - inter + 1e-6)


def _box_center(box: List[float]) -> Tuple[float, float]:
    return ((box[0] + box[2]) / 2.0, (box[1] + box[3]) / 2.0)


def _dist(a: Tuple[float, float], b: Tuple[float, float]) -> float:
    return ((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2) ** 0.5


def _laplacian_variance(gray: np.ndarray) -> float:
    """Higher value = sharper frame."""
    return float(cv2.Laplacian(gray, cv2.CV_64F).var())


def _resize_to_width(frame: np.ndarray, width: int = 640) -> np.ndarray:
    h, w = frame.shape[:2]
    if w == width:
        return frame
    scale  = width / w
    new_h  = int(h * scale)
    return cv2.resize(frame, (width, new_h), interpolation=cv2.INTER_LINEAR)


def _crop_plate_roi(frame: np.ndarray, moto_box: List[float],
                    pad: float = 0.15) -> Optional[np.ndarray]:
    """
    Return the lower-half region of the motorcycle bounding box, padded
    slightly, as the plate ROI.  Returns None if the crop is degenerate.
    """
    fh, fw = frame.shape[:2]
    x1, y1, x2, y2 = moto_box
    # plate lives in the lower portion → take bottom 55 %
    mid_y = y1 + (y2 - y1) * 0.45
    rx1 = max(0, int(x1 - (x2 - x1) * pad))
    ry1 = max(0, int(mid_y))
    rx2 = min(fw, int(x2 + (x2 - x1) * pad))
    ry2 = min(fh, int(y2 + (y2 - y1) * pad))
    if rx2 <= rx1 or ry2 <= ry1:
        return None
    return frame[ry1:ry2, rx1:rx2]


def _find_driver_box(
    person_boxes: List[List[float]],
    moto_box: List[float],
) -> Optional[List[float]]:
    """
    From a list of detected person boxes, return the one most likely to be
    the driver (i.e. highest IoU with the motorcycle box, falling back to
    the person whose center is closest to the motorcycle's center).
    Returns None if no person is close enough.
    """
    if not person_boxes:
        return None

    moto_cx, moto_cy = _box_center(moto_box)

    best_box:  Optional[List[float]] = None
    best_score: float                = -1.0

    for pb in person_boxes:
        iou   = _iou(pb, moto_box)
        dist  = _dist(_box_center(pb), (moto_cx, moto_cy))
        # Combine: prefer high IoU, penalise distance
        # Normalise distance by motorcycle width so it is scale-independent
        moto_w = max(moto_box[2] - moto_box[0], 1.0)
        score  = iou - 0.3 * (dist / moto_w)

        if score > best_score:
            best_score = score
            best_box   = pb

    # Reject if the winner has neither overlap nor proximity
    if best_box is not None:
        if _iou(best_box, moto_box) < _IOU_DRIVER_THRESH:
            moto_w = max(moto_box[2] - moto_box[0], 1.0)
            if _dist(_box_center(best_box), _box_center(moto_box)) > 1.5 * moto_w:
                return None

    return best_box


def _ocr_roi(roi: np.ndarray, ocr) -> Optional[Tuple[str, float]]:
    """
    Run EasyOCR on a pre-cropped ROI.
    Returns (cleaned_text, confidence) or None.
    """
    if ocr is None or roi is None or roi.size == 0:
        return None
    try:
        hits = ocr.readtext(roi, detail=1, paragraph=False)
        for (_bbox, text, prob) in hits:
            cleaned = text.strip().replace(" ", "-").upper()
            alnum   = sum(c.isalnum() for c in cleaned)
            if 5 <= len(cleaned) <= 14 and alnum >= 4 and float(prob) >= 0.40:
                return cleaned, float(prob)
    except Exception as exc:
        logger.warning(f"[OCR] roi readtext failed: {exc}")
    return None


# ---------------------------------------------------------------------------
# Small helpers used only by _analyse_frames
# ---------------------------------------------------------------------------

def _frame_to_b64(frame: np.ndarray) -> str:
    """Encode an OpenCV BGR frame as a JPEG base64 string."""
    ok, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
    if not ok:
        return ""
    return base64.b64encode(buf.tobytes()).decode("utf-8")


def _best_plate_from_list(plates: List[Tuple[str, float]]) -> Optional[str]:
    """
    Given a list of (plate_text, ocr_confidence) tuples, return the most
    reliable plate string.

    Strategy (two-pass):
      1. Frequency vote  — if one text appears ≥2 times, prefer it.
      2. Quality tiebreak — among candidates with equal frequency, pick the
         one with the highest mean OCR confidence.
    """
    if not plates:
        return None

    texts = [p[0] for p in plates]
    freq  = Counter(texts)
    max_freq = freq.most_common(1)[0][1]

    top_candidates = [t for t, f in freq.items() if f == max_freq]

    def mean_conf(text: str) -> float:
        confs = [c for t, c in plates if t == text]
        return float(np.mean(confs)) if confs else 0.0

    return max(top_candidates, key=mean_conf)


def _analyse_frames(video_path: str) -> dict:
    """
    Optimised multi-frame analysis with:
      • Frame budget cap (_MAX_PROCESSED) + early stopping
      • Per-frame resize to 640 px wide before YOLO
      • YOLO with imgsz=640, conf=0.30, GPU when available
      • Blur rejection via Laplacian variance
      • Driver identification: person with highest IoU / proximity to bike
      • ROI-based OCR: crop lower motorcycle region, reject distant plates
      • OCR gating: only when violation present OR every _OCR_EVERY_N frames
      • Independent violation / plate accumulators (may come from diff frames)
      • Same aggregation logic (majority vote + mean-conf tiebreak)
      • Same output schema
    """
    model  = _get_yolo()
    ocr    = _get_ocr()
    device = _yolo_device()

    if model is None:
        raise RuntimeError("YOLOv8 model is not available.")

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError(f"Cannot open video file: {video_path}")

    # ── Accumulators (unchanged shape, same as before) ──────────────────
    violations_detected: List[str]               = []
    confidence_scores:   List[float]             = []
    plates_detected:     List[Tuple[str, float]] = []

    best_violation_conf:  float               = 0.0
    best_violation_frame: Optional[np.ndarray] = None

    best_plate_conf:  float               = 0.0
    best_plate_frame: Optional[np.ndarray] = None

    # ── Loop counters ────────────────────────────────────────────────────
    raw_frame_idx  = 0   # every frame read from the video
    proc_frame_idx = 0   # frames actually passed to YOLO
    violations_count = 0
    plates_count     = 0

    # ── Dynamic stride: skip more frames when nothing is happening ───────
    # Start at stride 5; tighten to 3 once we see a motorcycle.
    stride = 5

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                break

            # ── Frame budget hard cap ────────────────────────────────────
            if proc_frame_idx >= _MAX_PROCESSED:
                break

            # ── Dynamic stride sampling ──────────────────────────────────
            if raw_frame_idx % stride != 0:
                raw_frame_idx += 1
                continue
            raw_frame_idx += 1

            # ── Resize to 640 px wide (keeps aspect ratio) ───────────────
            small = _resize_to_width(frame, _YOLO_IMGSZ)

            # ── Blur check on greyscale thumbnail ────────────────────────
            gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)
            if _laplacian_variance(gray) < _BLUR_THRESHOLD:
                continue   # skip blurry frames entirely

            proc_frame_idx += 1

            # ── YOLO inference ───────────────────────────────────────────
            results = model(
                small,
                imgsz=_YOLO_IMGSZ,
                conf=_YOLO_CONF,
                device=device,
                verbose=False,
            )
            if not results:
                continue

            detections = results[0]
            names = detections.names
            boxes = detections.boxes

            if boxes is None or len(boxes) == 0:
                continue

            raw_xyxy = boxes.xyxy.tolist()   # [[x1,y1,x2,y2], ...]
            labels   = [names[int(cls)] for cls in boxes.cls.tolist()]
            confs    = boxes.conf.tolist()

            # ── Collect motorcycle and person boxes ──────────────────────
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

            # ── No motorcycle → nothing relevant; tighten stride later ───
            if not moto_boxes:
                continue

            # Motorcycle found → tighten stride so we sample more densely
            stride = 3

            # ── Pick the largest (closest) motorcycle box ────────────────
            moto_box = max(
                moto_boxes,
                key=lambda b: (b[2] - b[0]) * (b[3] - b[1]),
            )

            # ── Driver detection ─────────────────────────────────────────
            driver_box = _find_driver_box(person_boxes, moto_box)
            has_person = driver_box is not None

            # ── Confidence for this frame ────────────────────────────────
            moto_conf_val = next(
                (c for lbl, c in zip(labels, confs) if lbl == COCO_MOTORCYCLE),
                0.5,
            )

            # ── Violation rule ───────────────────────────────────────────
            violation: Optional[str] = None
            frame_conf: float        = 0.0

            if has_person and not has_helmet_proxy:
                violation = "No Helmet Detected"
                driver_conf = next(
                    (
                        c for lbl, c, box in zip(labels, confs, raw_xyxy)
                        if lbl == COCO_PERSON and box == driver_box
                    ),
                    moto_conf_val,
                )
                frame_conf = float(np.mean([moto_conf_val, driver_conf]))
            elif not has_person and not has_helmet_proxy:
                # Rider may be partially out of frame
                violation  = "No Helmet Detected"
                frame_conf = float(moto_conf_val) * 0.75   # lower weight

            # ── Accumulate violation ─────────────────────────────────────
            if violation:
                violations_detected.append(violation)
                confidence_scores.append(frame_conf)
                violations_count += 1

                # Sharpness-weighted best frame: prefer sharp + high-conf
                sharpness = _laplacian_variance(gray)
                frame_score = frame_conf * min(sharpness / 200.0, 1.0)
                if frame_score > best_violation_conf:
                    best_violation_conf  = frame_score
                    best_violation_frame = small.copy()   # already resized

            # ── OCR gating ───────────────────────────────────────────────
            # Run only when: violation seen THIS frame OR every _OCR_EVERY_N
            run_ocr = (violation is not None) or (proc_frame_idx % _OCR_EVERY_N == 0)

            if run_ocr and ocr is not None:
                roi = _crop_plate_roi(small, moto_box)
                hit = _ocr_roi(roi, ocr)

                if hit is not None:
                    plate_text, plate_prob = hit
                    plates_detected.append((plate_text, plate_prob))
                    plates_count += 1

                    if plate_prob > best_plate_conf:
                        best_plate_conf  = plate_prob
                        best_plate_frame = (roi if roi is not None else small).copy()

            # ── Early stopping ───────────────────────────────────────────
            if violations_count >= _EARLY_STOP_VIOLS and plates_count >= _EARLY_STOP_PLATE:
                logger.info(
                    f"[AI] Early stop at raw frame {raw_frame_idx} "
                    f"(processed={proc_frame_idx}, viols={violations_count}, "
                    f"plates={plates_count})"
                )
                break

        cap.release()

    except Exception:
        cap.release()
        raise

    # ── Temporal aggregation — violation (unchanged logic) ───────────────
    if violations_detected:
        freq     = Counter(violations_detected)
        max_freq = freq.most_common(1)[0][1]
        top_violations = [v for v, f in freq.items() if f == max_freq]

        def mean_vconf(label: str) -> float:
            paired = [c for v, c in zip(violations_detected, confidence_scores) if v == label]
            return float(np.mean(paired)) if paired else 0.0

        final_violation  = max(top_violations, key=mean_vconf)
        final_confidence = mean_vconf(final_violation)
    else:
        final_violation  = "No Violation Detected"
        final_confidence = 0.0

    # ── Temporal aggregation — plate (unchanged logic) ───────────────────
    final_plate = _best_plate_from_list(plates_detected) or "UNDETECTED"

    # ── Convert best frames to base64 JPEG strings ───────────────────────
    violation_frame_b64 = _frame_to_b64(best_violation_frame) if best_violation_frame is not None else ""
    plate_frame_b64     = _frame_to_b64(best_plate_frame)     if best_plate_frame     is not None else ""

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
    """
    Accept a video upload, run YOLOv8 object detection and EasyOCR plate
    reading, and return a structured violation report.
    """
    # Validate MIME type loosely
    content_type = video.content_type or ""
    if not (content_type.startswith("video/") or video.filename.endswith((".mp4", ".mov", ".avi", ".mkv"))):
        raise HTTPException(status_code=400, detail="Uploaded file does not appear to be a video.")

    # Save upload to a temp file
    suffix = os.path.splitext(video.filename or "upload.mp4")[1] or ".mp4"
    tmp_path: Optional[str] = None

    try:
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp_path = tmp.name
            while chunk := await video.read(1024 * 1024):   # 1 MB chunks
                tmp.write(chunk)

        logger.info(f"[API] Saved upload to {tmp_path}, starting analysis…")

        # Run blocking CV2 / YOLO work off the event loop
        result = await asyncio.to_thread(_analyse_frames, tmp_path)

        logger.info(f"[API] Analysis complete: {result}")
        return result

    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        logger.exception("[API] Unexpected error during analysis")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {exc}")
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except OSError:
                pass