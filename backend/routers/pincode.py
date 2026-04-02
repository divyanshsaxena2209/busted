from fastapi import APIRouter, Path
from fastapi.responses import JSONResponse
from backend.services.pincode_service import get_pincode_info

router = APIRouter(
    prefix="/api/pincode",
    tags=["Pincode"]
)

@router.get("/{pincode}")
async def get_pincode_details(
    pincode: str = Path(..., title="Pincode", min_length=6, max_length=6, pattern=r"^\d{6}$")
):
    """
    Get City and State for a 6-digit Indian Pincode.
    """
    # 1. Fetch data using service (handles caching and external API)
    data = await get_pincode_info(pincode)

    # 2. Return success response
    if data:
        return data

    # 3. Return specific error format if invalid or not found
    return JSONResponse(
        status_code=404,
        content={"error": "Invalid Pincode"}
    )
