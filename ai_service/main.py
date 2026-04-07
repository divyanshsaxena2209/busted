import os
import asyncio
import base64
import tempfile
import logging
from collections import Counter
from typing import List, Optional, Tuple

import cv2
import numpy as np
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="AI Inference Service")

@app.get("/")
def health():
    return{"status":"AI Service running"}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
            model_path = os.path.join(os.path.dirname(__file__), "models", "yolov8n.pt")
            
            # Load from repo, do not download inside container normally
            if os.path.exists(model_path):
                _yolo_model = YOLO(model_path)
            else:
                _yolo_model = YOLO("yolov8n.pt")  # fallback if missing

            logger.info("[AI] YOLOv8 loaded globally.")
        except Exception as exc:
            logger.error(f"[AI] YOLOv8 load failed: {exc}")
    return _yolo_model

def _yolo_device() -> str:
    try:
        import torch
        return "cpu"
    except Exception:
        return "cpu"

def _get_ocr():
    global _ocr_reader
    if _ocr_reader is None:
        try:
            import easyocr
            import torch
            _ocr_reader = easyocr.Reader(["en"], gpu=False)
            logger.info("[AI] EasyOCR loaded globally.")
        except Exception as exc:
            logger.error(f"[AI] EasyOCR load failed: {exc}")
    return _ocr_reader



# ---------------------------------------------------------------------------
# COCO labels and Constants
# ---------------------------------------------------------------------------
COCO_MOTORCYCLE      = "motorcycle"
COCO_PERSON          = "person"
HELMET_PROXY_CLASSES = {"sports ball"}

_YOLO_IMGSZ          = 416
_YOLO_CONF           = 0.25
_MAX_PROCESSED       = 20
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
# Helpers
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

# ---------------------------------------------------------------------------
# Image enhancement
# ---------------------------------------------------------------------------
def _sharpen(img: np.ndarray) -> np.ndarray:
    blur = cv2.GaussianBlur(img, (0, 0), 3)
    return cv2.addWeighted(img, 1.5, blur, -0.5, 0)

def _enhance_plate_roi(roi: np.ndarray) -> np.ndarray:
    h, w  = roi.shape[:2]
    big   = cv2.resize(roi, (w * _PLATE_UPSCALE, h * _PLATE_UPSCALE), interpolation=cv2.INTER_CUBIC)
    gray  = cv2.cvtColor(big, cv2.COLOR_BGR2GRAY) if big.ndim == 3 else big
    gray  = cv2.fastNlMeansDenoising(gray, h=10, templateWindowSize=7, searchWindowSize=21)
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    gray  = clahe.apply(gray)
    kernel = np.array([[-1, -1, -1], [-1,  9, -1], [-1, -1, -1]], dtype=np.float32)
    gray  = cv2.filter2D(gray, -1, kernel)
    return np.clip(gray, 0, 255).astype(np.uint8)

# ---------------------------------------------------------------------------
# Crop helpers
# ---------------------------------------------------------------------------
def _padded_crop(frame: np.ndarray, box: List[float], pad: float = _ANNOT_PAD) -> np.ndarray:
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

def _crop_plate_roi(frame: np.ndarray, moto_box: List[float], h_pad: float = 0.30, v_start: float = 0.48) -> Optional[np.ndarray]:
    fh, fw = frame.shape[:2]
    x1, y1, x2, y2 = moto_box
    bw = x2 - x1
    bh = y2 - y1
    rx1 = max(0,  int(x1 - bw * h_pad))
    ry1 = max(0,  int(y1 + bh * v_start))
    rx2 = min(fw, int(x2 + bw * h_pad))
    ry2 = min(fh, int(y2 + bh * 1.10))
    if (rx2 - rx1) < 15 or (ry2 - ry1) < 8:
        rx1 = max(0,  int(x1))
        ry1 = max(0,  int(y1))
        rx2 = min(fw, int(x2))
        ry2 = min(fh, int(y2))
        if rx2 <= rx1 or ry2 <= ry1: return None
    return frame[ry1:ry2, rx1:rx2]

# ---------------------------------------------------------------------------
# Annotation helpers
# ---------------------------------------------------------------------------
def _draw_violation_annotation(frame: np.ndarray, draw_box: List[float], violation: str, confidence: float) -> np.ndarray:
    out = frame.copy()
    fh, fw = out.shape[:2]
    x1, y1, x2, y2 = [int(v) for v in draw_box]
    x1, y1 = max(0, x1), max(0, y1)
    x2, y2 = min(fw - 1, x2), min(fh - 1, y2)
    cv2.rectangle(out, (x1, y1), (x2, y2), (0, 0, 255), 2)
    font = cv2.FONT_HERSHEY_SIMPLEX
    fs = 0.45
    thick = 1
    red = (0, 0, 255)
    l1 = f"Violation: {violation}"
    l2 = f"Conf: {confidence * 100:.0f}%"
    (w1, h1), _  = cv2.getTextSize(l1, font, fs, thick)
    (w2, h2), bl = cv2.getTextSize(l2, font, fs, thick)
    tx1 = max(0, x2 - w1)
    ty1 = max(h1, y1 - 4 - h2 - 3 - bl)
    if ty1 < h1: ty1 = y1 + h1 + 4
    tx2 = max(0, x2 - w2)
    ty2 = ty1 + h2 + 3
    cv2.putText(out, l1, (tx1, ty1), font, fs, red, thick, cv2.LINE_AA)
    cv2.putText(out, l2, (tx2, ty2), font, fs, red, thick, cv2.LINE_AA)
    return out

def _draw_plate_annotation(roi: np.ndarray, plate_text: str, ocr_bbox: Optional[List] = None) -> np.ndarray:
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
    label = f"Plate: {plate_text}"
    font = cv2.FONT_HERSHEY_SIMPLEX
    fs, thick = 0.48, 1
    (tw, th), bl = cv2.getTextSize(label, font, fs, thick)
    tx = max(0, (w - tw) // 2)
    ty = min(h - 2, max(th + bl + 2, text_y_base))
    cv2.putText(out, label, (tx, ty), font, fs, red, thick, cv2.LINE_AA)
    return out

# ---------------------------------------------------------------------------
# Core analysis
# ---------------------------------------------------------------------------
def _estimate_motion(prev_gray: Optional[np.ndarray], curr_gray: np.ndarray) -> float:
    if prev_gray is None or prev_gray.shape != curr_gray.shape: return 0.0
    try:
        flow = cv2.calcOpticalFlowFarneback(prev_gray, curr_gray, None, 0.5, 3, 15, 3, 5, 1.2, 0)
        mag, _ = cv2.cartToPolar(flow[..., 0], flow[..., 1])
        return float(mag.mean())
    except Exception: return 0.0

def _ocr_roi(roi: np.ndarray, ocr, min_conf: float = _PLATE_OCR_MIN_CONF) -> Optional[Tuple[str, float, Optional[List]]]:
    if ocr is None or roi is None or roi.size == 0: return None
    try:
        hits = ocr.readtext(roi, detail=1, paragraph=False, allowlist="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-")
        hits = sorted(hits, key=lambda x: x[2], reverse=True)
        for (bbox, text, prob) in hits:
            cleaned = text.strip().replace(" ", "-").upper()
            prob = float(prob)
            if prob < min_conf: continue
            if not (4 <= len(cleaned) <= 13): continue
            if not (any(c.isalpha() for c in cleaned) and any(c.isdigit() for c in cleaned)): continue
            return cleaned, prob, bbox
    except Exception: pass
    return None

def _find_driver_box(person_boxes: List[List[float]], moto_box: List[float]) -> Optional[List[float]]:
    if not person_boxes: return None
    best_box = None
    best_score = -1.0
    moto_cx, moto_cy = _box_center(moto_box)
    moto_w = max(moto_box[2] - moto_box[0], 1.0)
    for pb in person_boxes:
        score = (1.5*_iou(pb, moto_box) - 0.2 * (_dist(_box_center(pb), (moto_cx, moto_cy)) / moto_w) + 0.3*(1-abs((_box_center(pb)[0]-moto_cx)/moto_w)))
        if score > best_score: best_score, best_box = score, pb
    if best_box is not None:
        if _iou(best_box, moto_box) < _IOU_DRIVER_THRESH and _dist(_box_center(best_box), _box_center(moto_box)) > 1.5 * moto_w:
            return None
    return best_box

def _frame_to_b64(frame: np.ndarray) -> str:
    frame = _limit_dim(frame)
    if frame.ndim == 3: frame = _sharpen(frame)
    ok, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, _OUTPUT_JPEG_QUALITY, cv2.IMWRITE_JPEG_OPTIMIZE, 1])
    return base64.b64encode(buf.tobytes()).decode("utf-8") if ok else ""

def _best_plate_from_list(plates: List[Tuple[str, float]]) -> Optional[str]:
    if not plates: return None
    freq = Counter(p[0] for p in plates)
    max_freq = freq.most_common(1)[0][1]
    top = [t for t, f in freq.items() if f == max_freq]
    def mean_conf(t: str) -> float:
        vals = [c for txt, c in plates if txt == t]
        return float(np.mean(vals)) if vals else 0.0
    return max(top, key=mean_conf)

def _analyse_frames(video_path: str) -> dict:
    print(f"INFO: Starting to process video: {video_path}")
    model = _get_yolo()
    ocr = _get_ocr()
    device = _yolo_device()
    if model is None: raise RuntimeError("YOLOv8 model not available.")

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened(): raise ValueError("Cannot open video")
    print("INFO: Video processed and opened successfully.")

    violations_detected, confidence_scores, plates_detected = [], [], []
    best_violation_conf, best_violation_conf_raw = 0.0, 0.0
    best_violation_frame = best_violation_draw_box = None
    best_violation_label = ""
    best_plate_conf, best_plate_raw_roi, best_plate_text, best_plate_bbox = 0.0, None, "", None
    last_plate_raw_roi = last_plate_text = last_plate_bbox = None

    raw_frame_idx, proc_frame_idx = 0, 0
    violations_count, plates_count, moto_frames_no_plate = 0, 0, 0
    prev_gray = prev_moto_cx = None
    direction_flips = 0
    stride = 4

    try:
        print("INFO: Extracting frames...")
        while True:
            ret, frame = cap.read()
            if not ret or proc_frame_idx >= _MAX_PROCESSED: break
            if raw_frame_idx % stride != 0:
                raw_frame_idx += 1
                continue
            raw_frame_idx += 1
            orig_frame = frame
            orig_h, orig_w = orig_frame.shape[:2]

            small = _resize_to_width(frame, _YOLO_IMGSZ)
            gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)
            if _laplacian_variance(gray) < _BLUR_THRESHOLD:
                prev_gray = gray
                continue
            proc_frame_idx += 1

            try: results = model(small, imgsz=_YOLO_IMGSZ, conf=_YOLO_CONF, device=device, verbose=False)
            except Exception:
                prev_gray = gray
                continue

            prev_gray = gray
            if results is None: continue
            if isinstance(results, list) and len(results) == 0: continue
            if not isinstance(results, list): results = [results]
            if len(results[0].boxes) == 0: continue
            
            if proc_frame_idx == 1:
                print("INFO: First detections computed successfully.")

            det = results[0]
            names, boxes = det.names, det.boxes
            raw_xyxy = [[float(v) for v in box] for box in boxes.xyxy.tolist()]
            labels = [names[int(c)] for c in boxes.cls.tolist()]
            confs = [float(c) for c in boxes.conf.tolist()]

            moto_boxes, person_boxes, has_helmet_proxy = [], [], False
            for lbl, box in zip(labels, raw_xyxy):
                if lbl == COCO_MOTORCYCLE: moto_boxes.append(box)
                elif lbl == COCO_PERSON: person_boxes.append(box)
                elif lbl in HELMET_PROXY_CLASSES: has_helmet_proxy = True

            if not moto_boxes:
                prev_moto_cx = None
                continue
            stride = 3
            moto_box = max(moto_boxes, key=lambda b: (b[2] - b[0]) * (b[3] - b[1]))
            moto_conf_val = next((c for l, c in zip(labels, confs) if l == COCO_MOTORCYCLE), 0.5)

            driver_box = _find_driver_box(person_boxes, moto_box)
            has_driver = driver_box is not None
            rider_count = sum(1 for pb in person_boxes if (_iou(pb, moto_box) >= _IOU_DRIVER_THRESH or _dist(_box_center(pb), _box_center(moto_box)) <= 1.5 * max(moto_box[2] - moto_box[0], 1.0)))

            motion_mag = _estimate_motion(prev_gray, gray)
            curr_moto_cx = _box_center(moto_box)[0]
            if prev_moto_cx is not None and ((curr_moto_cx - prev_moto_cx) * (prev_moto_cx - curr_moto_cx) < 0): direction_flips += 1
            prev_moto_cx = curr_moto_cx

            violation, frame_conf = None, 0.0
            if has_driver and not has_helmet_proxy:
                driver_conf = next((c for l, c, b in zip(labels, confs, raw_xyxy) if l == COCO_PERSON and _iou(b, driver_box) > 0.8), moto_conf_val)
                frame_conf, violation = float(np.mean([moto_conf_val, driver_conf])), "No Helmet Detected"
            elif rider_count >= 2:
                frame_conf, violation = float(moto_conf_val), "Triple Riding Detected"
            elif not has_driver and not has_helmet_proxy:
                frame_conf, violation = float(moto_conf_val) * 0.75, "No Helmet Detected"

            if violation is None and motion_mag > _MOTION_SPEED_THR:
                violation, frame_conf = "Overspeeding", min(0.55 + motion_mag / 200.0, 0.85)

            if violation is None and direction_flips >= 3:
                violation, frame_conf = "Wrong Side Driving", 0.60

            if violation:
                violations_detected.append(violation)
                confidence_scores.append(frame_conf)
                violations_count += 1
                sharpness = _laplacian_variance(gray)
                frame_score = frame_conf * min(sharpness / 200.0, 1.0)
                if frame_score > best_violation_conf:
                    best_violation_conf, best_violation_conf_raw, best_violation_label = frame_score, frame_conf, violation
                    best_violation_draw_box = driver_box if driver_box is not None else moto_box
                    best_violation_frame = orig_frame.copy()

            scale_x, scale_y = orig_w / small.shape[1], orig_h / small.shape[0]
            moto_box_orig = [moto_box[0] * scale_x, moto_box[1] * scale_y, moto_box[2] * scale_x, moto_box[3] * scale_y]

            plate_found_this_frame = False
            if ocr is not None:
                raw_roi = _crop_plate_roi(orig_frame, moto_box_orig)
                if raw_roi is not None and raw_roi.size > 0:
                    hit = None
                    try:
                        hit = _ocr_roi(_enhance_plate_roi(raw_roi), ocr)
                    except Exception: pass
                    if hit is None: hit = _ocr_roi(raw_roi, ocr, min_conf=0.28)

                    if hit is not None:
                        plate_text, plate_prob, ocr_bbox = hit
                        plates_detected.append((plate_text, plate_prob))
                        plates_count += 1
                        plate_found_this_frame = True
                        moto_frames_no_plate = 0
                        last_plate_raw_roi, last_plate_text, last_plate_bbox = raw_roi.copy(), plate_text, ocr_bbox
                        plate_score = plate_prob * min(_laplacian_variance(gray) / 200.0, 1.0)
                        if plate_score > best_plate_conf:
                            best_plate_conf, best_plate_raw_roi, best_plate_text, best_plate_bbox = plate_score, raw_roi.copy(), plate_text, ocr_bbox

            if not plate_found_this_frame: moto_frames_no_plate += 1

            if moto_frames_no_plate >= _NO_PLATE_FRAMES and not plates_detected:
                violations_detected.append("No Number Plate")
                confidence_scores.append(0.70)
                violations_count += 1
                moto_frames_no_plate = 0

            if violations_count >= _EARLY_STOP_VIOLS and plates_count >= _EARLY_STOP_PLATE: break
    finally:
        cap.release()

    final_violation, final_confidence = ("No Violation Detected", 0.0)
    if violations_detected:
        freq = Counter(violations_detected)
        top = [v for v, f in freq.items() if f == freq.most_common(1)[0][1]]
        def mean_vconf(label: str) -> float:
            vals = [c for v, c in zip(violations_detected, confidence_scores) if v == label]
            return float(np.mean(vals)) if vals else 0.0
        final_violation = max(top, key=mean_vconf)
        final_confidence = mean_vconf(final_violation)

    final_plate = _best_plate_from_list(plates_detected) or "UNDETECTED"

    annotated_viol = best_violation_frame
    if best_violation_frame is not None and best_violation_draw_box is not None:
        annotated_viol = _padded_crop(_draw_violation_annotation(best_violation_frame, best_violation_draw_box, best_violation_label, best_violation_conf_raw), best_violation_draw_box)

    res_raw = best_plate_raw_roi if best_plate_raw_roi is not None else last_plate_raw_roi
    res_text = best_plate_text if best_plate_text else last_plate_text
    res_bbox = best_plate_bbox if best_plate_bbox is not None else last_plate_bbox

    annotated_plate = None
    if res_raw is not None:
        h, w = res_raw.shape[:2]
        display_roi = _sharpen(cv2.resize(res_raw, (w * 2, h * 2), interpolation=cv2.INTER_CUBIC))
        scaled_bbox = [[int(p[0] * 2), int(p[1] * 2)] for p in res_bbox] if res_bbox is not None else None
        annotated_plate = _draw_plate_annotation(display_roi, res_text, scaled_bbox)

    return {
        "violation": final_violation,
        "plate": final_plate,
        "confidence": round(final_confidence, 4),
        "violation_frame": _frame_to_b64(annotated_viol) if annotated_viol is not None else "",
        "plate_frame": _frame_to_b64(annotated_plate) if annotated_plate is not None else "",
    }

# ---------------------------------------------------------------------------
# API Endpoint
# ---------------------------------------------------------------------------
@app.post("/analyze")
async def analyze(file: UploadFile = File(...)):
    if not (file.content_type.startswith("video/") or file.filename.endswith((".mp4", ".mov", ".avi", ".mkv"))):
        return JSONResponse(
            status_code=400,
            content={"success": False, "error": "File does not appear to be a video."}
        )
    tmp_path = None
    try:
        print(f"INFO: File received: {file.filename}")
        suffix = os.path.splitext(file.filename)[1] or ".mp4"
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp_path = tmp.name
            while chunk := await file.read(1024 * 1024): 
                tmp.write(chunk)
                
        print("INFO: Starting AI processing logic...")
        result = await asyncio.to_thread(_analyse_frames, tmp_path)
        
        # Prevent silent failures, add success flag
        result["success"] = True
        return result
    except Exception as e:
        print("ERROR:", str(e))
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)}
        )
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try: os.remove(tmp_path)
            except OSError: pass
