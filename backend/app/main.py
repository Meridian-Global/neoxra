"""
Neoxra FastAPI app.

Run with:
  cd backend && uvicorn app.main:app --reload
"""

import os
import logging
import time
import uuid
from pathlib import Path

from dotenv import load_dotenv

BACKEND_ROOT = Path(__file__).resolve().parents[1]

load_dotenv(BACKEND_ROOT / ".env", override=False)

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from .api.routes import router
from .api.integrations_routes import router as integrations_router
from .api.instagram_routes import router as instagram_router
from .core.logging_utils import (
    configure_logging,
    reset_request_id,
    set_request_id,
)
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
configure_logging()
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


@app.middleware("http")
async def add_request_context(request: Request, call_next) -> Response:
    request_id = request.headers.get("X-Request-ID") or uuid.uuid4().hex[:12]
    request.state.request_id = request_id
    token = set_request_id(request_id)
    start = time.perf_counter()

    logger.info(
        "request started method=%s path=%s client=%s",
        request.method,
        request.url.path,
        request.client.host if request.client else "-",
    )

    try:
        response = await call_next(request)
    except Exception:
        duration_ms = round((time.perf_counter() - start) * 1000, 1)
        logger.exception(
            "request failed method=%s path=%s duration_ms=%s",
            request.method,
            request.url.path,
            duration_ms,
        )
        reset_request_id(token)
        raise

    duration_ms = round((time.perf_counter() - start) * 1000, 1)
    response.headers["X-Request-ID"] = request_id
    logger.info(
        "request completed method=%s path=%s status_code=%s duration_ms=%s",
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
    )
    reset_request_id(token)
    return response


@app.get("/", tags=["health"])
async def root_health() -> dict:
    return {"status": "ok", "service": "neoxra-api"}


@app.get("/healthz", tags=["health"])
async def healthz() -> dict:
    return {"status": "ok"}


@app.get("/health/core", tags=["health"])
async def core_health() -> dict:
    diagnostics = get_neoxra_core_diagnostics()
    return {
        "status": "ok" if diagnostics.get("import_ok") else "degraded",
        "core": diagnostics,
        "summary": format_neoxra_core_diagnostics(diagnostics),
    }


@app.on_event("startup")
async def log_core_diagnostics_on_startup() -> None:
    diagnostics = get_neoxra_core_diagnostics()
    logger.info(
        "startup configuration environment=%s log_level=%s cors_allowed_origins=%s anthropic_model=%s",
        os.getenv("ENVIRONMENT", "development"),
        os.getenv("LOG_LEVEL", "INFO"),
        ",".join(_get_allowed_origins()),
        os.getenv("ANTHROPIC_MODEL", "claude-haiku-4-5"),
    )
    logger.info(
        "startup neoxra_core import_ok=%s version=%s source=%s verified_imports=%s",
        diagnostics.get("import_ok"),
        diagnostics.get("distribution_version", "unknown"),
        diagnostics.get("direct_url", diagnostics.get("core_git_url", "unknown")),
        diagnostics.get("verified_imports", []),
    )
    logger.info("neoxra_core startup status: %s", format_neoxra_core_diagnostics(diagnostics))
    logger.info("neoxra_core startup diagnostics: %s", diagnostics)
