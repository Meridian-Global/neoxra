"""
Neoxra FastAPI app.

Run with:
  cd backend && uvicorn app.main:app --reload
"""

import os
import logging
from pathlib import Path

from dotenv import load_dotenv

BACKEND_ROOT = Path(__file__).resolve().parents[1]

load_dotenv(BACKEND_ROOT / ".env", override=False)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.routes import router
from .api.integrations_routes import router as integrations_router
from .api.instagram_routes import router as instagram_router
from .core.neoxra_core_diagnostics import (
    format_neoxra_core_diagnostics,
    get_neoxra_core_diagnostics,
)

DEFAULT_CORS_ORIGINS = (
    "https://neoxra.com",
    "https://www.neoxra.com",
    "http://localhost:3000",
)


def _get_allowed_origins() -> list[str]:
    configured_origins = os.getenv("CORS_ALLOWED_ORIGINS", "")
    parsed_origins = [
        origin.strip().rstrip("/")
        for origin in configured_origins.split(",")
        if origin.strip()
    ]
    if parsed_origins:
        return parsed_origins
    return list(DEFAULT_CORS_ORIGINS)


logger = logging.getLogger(__name__)
app = FastAPI(title="Neoxra API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_get_allowed_origins(),
    allow_methods=["POST", "GET", "OPTIONS"],
    allow_headers=["*"],
    allow_credentials=False,
)

app.include_router(router)
app.include_router(integrations_router)
app.include_router(instagram_router)

logger.info(
    "neoxra_core startup status: %s",
    format_neoxra_core_diagnostics(get_neoxra_core_diagnostics()),
)


@app.get("/", tags=["health"])
async def root_health() -> dict:
    return {"status": "ok", "service": "neoxra-api"}


@app.get("/healthz", tags=["health"])
async def healthz() -> dict:
    return {"status": "ok"}
