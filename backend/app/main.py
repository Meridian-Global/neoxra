"""
Neoxra FastAPI app.

Run with:
  cd backend && uvicorn app.main:app --reload
"""

from pathlib import Path

from dotenv import load_dotenv

BACKEND_ROOT = Path(__file__).resolve().parents[1]

load_dotenv(BACKEND_ROOT / ".env", override=False)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.routes import router
from .api.integrations_routes import router as integrations_router
from .api.instagram_routes import router as instagram_router

app = FastAPI(title="Neoxra API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST", "GET", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(router)
app.include_router(integrations_router)
app.include_router(instagram_router)


@app.get("/", tags=["health"])
async def root_health() -> dict:
    return {"status": "ok", "service": "neoxra-api"}


@app.get("/healthz", tags=["health"])
async def healthz() -> dict:
    return {"status": "ok"}
