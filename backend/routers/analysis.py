from fastapi import APIRouter, File, UploadFile
import asyncio
import random
import os

router = APIRouter(
    prefix="/analyze",
    tags=["analysis"]
)

# Simulated variables for mock output
VIOLATIONS = [
    "No Helmet Detected",
    "Red Light Jump",
    "Triple Riding Detected",
    "Wrong Lane Violation",
    "Zebra Crossing Violation",
    "Overspeeding",
    "No Parking"
]

PLATES = [
    "MH-02-DN-4829",
    "DL-3C-AB-9921",
    "KA-05-XY-1234",
    "TN-01-BK-5678",
    "HR-26-DQ-0001"
]

@router.post("/")
async def analyze_video(video: UploadFile = File(...)):
    # 1. Create temp directory if it doesn't exist
    temp_dir = "backend/temp"
    os.makedirs(temp_dir, exist_ok=True)
    
    file_path = os.path.join(temp_dir, video.filename or "unknown_video.mp4")
    
    # 2. Save the uploaded file block by block (for large videos)
    with open(file_path, "wb") as buffer:
        while chunk := await video.read(1024 * 1024):  # 1MB chunks
            buffer.write(chunk)
            
    # 3. Simulate processing time for AI Model Inference
    await asyncio.sleep(2.5)
    
    # 4. Construct AI Response Payload
    violation = random.choice(VIOLATIONS)
    plate = random.choice(PLATES)
    confidence = round(random.uniform(85.0, 99.9), 1)
    evidence_id = f"EVD-{random.randint(100000, 999999)}"
    
    print(f"[AI PIPELINE] Successfully analyzed {video.filename} -> {violation} ({plate})")
    
    return {
        "violation": violation,
        "plate": plate,
        "confidence": confidence,
        "evidenceId": evidence_id,
        "saved_path": file_path
    }
