from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import httpx

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/pincode/{pincode}")
async def get_pincode_details(pincode: str):
    """
    Fetch city and state details for a given Indian pincode.
    """
    # Validation: Must be 6 digits
    if len(pincode) != 6 or not pincode.isdigit():
        raise HTTPException(status_code=400, detail="Invalid pincode format. Must be 6 digits.")
    
    async with httpx.AsyncClient() as client:
        try:
            # Call external API
            response = await client.get(f"https://api.postalpincode.in/pincode/{pincode}")
            data = response.json()
            
            # Check for success status from external API
            if data and isinstance(data, list) and len(data) > 0 and data[0].get("Status") == "Success":
                post_office_data = data[0].get("PostOffice", [])
                
                if not post_office_data:
                    raise HTTPException(status_code=404, detail="No details found for this pincode.")
                
                # Extract first result
                details = post_office_data[0]
                
                return {
                    "city": details.get("District"),
                    "state": details.get("State")
                }
            else:
                raise HTTPException(status_code=404, detail="Pincode not found or invalid.")
                
        except httpx.RequestError as e:
            raise HTTPException(status_code=503, detail=f"External API unreachable: {str(e)}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
