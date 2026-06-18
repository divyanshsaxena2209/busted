import os
import logging
import shutil
import torch
import cv2
import base64
import numpy as np
from fastapi import APIRouter, File, UploadFile, HTTPException
from ultralytics import YOLO
import easyocr

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/analyze", tags=["analysis"])

# ── Device & Model Setup (global, loaded once) ──────────────────────────────
DEVICE = 'cuda' if torch.cuda.is_available() else 'cpu'
logger.info(f"AI CORE: Using {DEVICE.upper()} for processing")

# ✅ GPU verification logs
logger.info(f"CUDA available: {torch.cuda.is_available()}")
if torch.cuda.is_available():
    logger.info(f"GPU: {torch.cuda.get_device_name(0)}")

model = YOLO("models/yolov8n.pt")
model.to(DEVICE)
model.fuse()

reader = easyocr.Reader(['en'], gpu=(DEVICE == 'cuda'))

# ── Helpers ──────────────────────────────────────────────────────────────────
def frame_to_base64(frame: np.ndarray) -> str:
    _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
    return base64.b64encode(buffer).decode('utf-8')


def crop_box(frame: np.ndarray, box, padding: int = 10) -> np.ndarray:
    h, w = frame.shape[:2]
    x1 = max(0, int(box.xyxy[0][0]) - padding)
    y1 = max(0, int(box.xyxy[0][1]) - padding)
    x2 = min(w, int(box.xyxy[0][2]) + padding)
    y2 = min(h, int(box.xyxy[0][3]) + padding)
    return frame[y1:y2, x1:x2]


def run_ocr(cropped: np.ndarray) -> str:
    results = reader.readtext(cropped, detail=0, paragraph=True)
    return ' '.join(results).strip().upper() if results else "NOT DETECTED"


def get_class_label(model, class_id: int) -> str:
    return model.names.get(int(class_id), f"class_{class_id}")


# ── Route ─────────────────────────────────────────────────────────────────────
@router.post("/")
async def analyze_video(video: UploadFile = File(...)):
    logger.info(f"Received: {video.filename}")

    temp_dir = "temp_uploads"
    os.makedirs(temp_dir, exist_ok=True)
    file_path = os.path.join(temp_dir, video.filename)

    try:
        with open(file_path, "wb") as buf:
            shutil.copyfileobj(video.file, buf)

        cap = cv2.VideoCapture(file_path)
        if not cap.isOpened():
            raise HTTPException(status_code=400, detail="Cannot open video file.")

        total_frames    = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 1
        frame_skip      = 10   # ✅ updated
        max_frames      = 300
        frame_count     = 0
        frames_checked  = 0

        violation_frame_b64 = None
        plate_frame_b64     = None
        violation_label     = "No Violation"
        plate_text          = "NOT DETECTED"
        best_confidence     = 0.0

        while cap.isOpened() and frames_checked < max_frames:
            ret, frame = cap.read()
            if not ret:
                break

            frame_count += 1
            if frame_count % frame_skip != 0:
                continue

            frames_checked += 1

            # ✅ FORCE GPU
            results = model(frame, device=DEVICE, verbose=False)

            for r in results:
                if len(r.boxes) == 0:
                    continue

                confidences = r.boxes.conf.cpu().numpy()
                best_idx    = int(np.argmax(confidences))
                best_box    = r.boxes[best_idx]
                confidence  = float(confidences[best_idx]) * 100

                if confidence < 40:
                    continue

                if confidence <= best_confidence:
                    continue

                best_confidence  = confidence
                class_id         = int(best_box.cls[0])
                violation_label  = get_class_label(model, class_id)

                violation_frame_b64 = frame_to_base64(frame)

                violation_crop = crop_box(frame, best_box)

                # ✅ OCR only on strong detections
                if violation_crop.size > 0 and confidence > 70:
                    plate_frame_b64 = frame_to_base64(violation_crop)
                    plate_text      = run_ocr(violation_crop)

                annotated = frame.copy()
                x1 = int(best_box.xyxy[0][0]); y1 = int(best_box.xyxy[0][1])
                x2 = int(best_box.xyxy[0][2]); y2 = int(best_box.xyxy[0][3])
                cv2.rectangle(annotated, (x1, y1), (x2, y2), (0, 0, 255), 2)
                cv2.putText(
                    annotated,
                    f"{violation_label} {confidence:.1f}%",
                    (x1, max(y1 - 10, 0)),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2
                )
                violation_frame_b64 = frame_to_base64(annotated)

                # ✅ BREAK EARLY
                if best_confidence > 80:
                    break

        cap.release()

        return {
            "violation": violation_label,
            "plate": plate_text,
            "confidence": round(best_confidence, 1),

            "violation_image": violation_frame_b64,
            "plate_image": plate_frame_b64,

            "status": f"processed on {DEVICE}",
            "frames_processed": frames_checked,
            "total_frames": total_frames,

            "violation_box": {"x1": 0, "y1": 0, "x2": 0, "y2": 0},
            "violation_frame_width": 0,
            "violation_frame_height": 0,
            "plate_box": None,
            "plate_frame_width": 0,
            "plate_frame_height": 0,
        }

    except HTTPException:
        raise

    except Exception as exc:
        logger.exception("GPU Analysis failed")
        raise HTTPException(status_code=500, detail=f"AI Error: {exc}")

    finally:
        if os.path.exists(file_path):
            os.remove(file_path)