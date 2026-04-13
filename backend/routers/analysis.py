import httpx
import os
import logging
from fastapi import APIRouter, File, UploadFile, HTTPException

logger = logging.getLogger(__name__)

# This matches the frontend expectation: /api/analyze/
router = APIRouter(prefix="/analyze", tags=["analysis"])

@router.post("/")
async def analyze_video(video: UploadFile = File(...)):
    """
    Proxy lightweight backend route that forwards the video directly to the standalone GPU-bound AI service.
    """
    # Fetch decoupled AI inference service URL from env, default properly
    ai_url = os.getenv("AI_API_URL", "http://127.0.0.1:8001")
    endpoint = f"{ai_url}/analyze/"
    
    logger.info(f"Proxying video analysis to ACTUAL AI service at {endpoint}")
    
    try:
        async with httpx.AsyncClient() as client:
            # Read the file content safely into memory
            content = await video.read()
            files = {'video': (video.filename, content, video.content_type)}
            
            # Send file via multi-part POST
            response = await client.post(endpoint, files=files, timeout=300.0, follow_redirects=True)
            
            # Surface proxy errors correctly
            if response.status_code != 200:
                logger.error(f"AI Service error: {response.text}")
                raise HTTPException(
                    status_code=response.status_code, 
                    detail="AI Service Analysis Failed. Please ensure the AI backend is active."
                )
                
            return response.json()

    except httpx.ConnectError:
        logger.error(f"Could not connect to AI Service at {ai_url}")
        raise HTTPException(
            status_code=503, 
            detail="AI Backend is unreachable. Please ensure the AI microservice is running on port 8213."
        )
    except Exception as exc:
        logger.exception("Failed to proxy to AI service")
        raise HTTPException(status_code=500, detail=f"Proxy error: {exc}")