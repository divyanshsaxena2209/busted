import httpx
from async_lru import alru_cache
from typing import Optional, Dict, Any

# Cache up to 128 unique pincode requests
@alru_cache(maxsize=128)
async def get_pincode_info(pincode: str) -> Optional[Dict[str, str]]:
    """
    Fetches city and state for a pincode from the external API.
    Returns a dictionary with city/state or None if invalid.
    """
    url = f"https://api.postalpincode.in/pincode/{pincode}"
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, timeout=5.0)
            response.raise_for_status()
            data = response.json()
        except Exception:
            # Log error in production
            return None

    # Validate API Response Structure
    if not data or not isinstance(data, list):
        return None

    result = data[0]
    
    if result.get("Status") != "Success":
        return None

    post_offices = result.get("PostOffice")
    
    if not post_offices or not isinstance(post_offices, list):
        return None

    # Extract details from the first Post Office entry
    office = post_offices[0]
    
    return {
        "city": office.get("District", ""),
        "state": office.get("State", "")
    }
