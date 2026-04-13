import asyncio
import sys
import os

# Load env variables from root .env manually to avoid missing python-dotenv dependency
dotenv_path = os.path.join(os.path.dirname(__file__), '..', '.env')
if os.path.exists(dotenv_path):
    with open(dotenv_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, val = line.split("=", 1)
                os.environ[key.strip()] = val.strip()

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import pincode, analysis

app = FastAPI(
    title="Busted Backend",
    description="API for Busted Traffic Reporting Application",
    version="1.0.0"
)

# CORS configuration to allow frontend access
origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ FIXED: Routers
# We remove the prefix="/api" here because your analysis router 
# already defines its own prefix as "/analyze". 
# This ensures the endpoint is available at /analyze/ to match your frontend.
app.include_router(pincode.router)
app.include_router(analysis.router) 

@app.get("/")
async def root():
    return {"status": "active", "service": "Busted API"}