from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import pincode, analysis

app = FastAPI(
    title="Busted Backend",
    description="API for Busted Traffic Reporting Application",
    version="1.0.0"
)

origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(pincode.router)
app.include_router(analysis.router, prefix="/api")

@app.get("/")
async def root():
    return {"status": "active", "service": "Busted API"}