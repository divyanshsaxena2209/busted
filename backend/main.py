from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routers import pincode, analysis

app = FastAPI(
    title="Busted Backend",
    description="API for Busted Traffic Reporting Application",
    version="1.0.0"
)

# CORS Configuration
origins = [
    "http://localhost:3000",      # React/Next.js default
    "http://localhost:5173",      # Vite default
    "http://127.0.0.1:3000",      # IP based React
    "http://127.0.0.1:5173",      # IP based Vite
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Register Routers
app.include_router(pincode.router)
app.include_router(analysis.router)

@app.get("/")
async def root():
    return {"status": "active", "service": "Busted API"}
