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
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response

from .api.routes import router
from .api.integrations_routes import router as integrations_router
from .api.instagram_routes import router as instagram_router
from .core.error_handling import json_error_response
from .core.generation_metrics import get_generation_metrics_snapshot
from .core.logging_utils import (
    configure_logging,
    format_log_fields,
    reset_request_id,
    set_request_id,
)
from .core.request_guards import get_client_ip, get_generation_body_limit_bytes
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


def _default_error_code_for_status(status_code: int) -> str:
    return {
        401: "UNAUTHORIZED",
        403: "FORBIDDEN",
        404: "NOT_FOUND",
        413: "REQUEST_BODY_TOO_LARGE",
        422: "VALIDATION_ERROR",
        429: "RATE_LIMITED",
        500: "INTERNAL_SERVER_ERROR",
        502: "UPSTREAM_ERROR",
        503: "SERVICE_UNAVAILABLE",
    }.get(status_code, "REQUEST_FAILED")


@app.exception_handler(StarletteHTTPException)
async def safe_http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    request_id = getattr(request.state, "request_id", None)
    detail = exc.detail
    error_code = _default_error_code_for_status(exc.status_code)

    if isinstance(detail, dict):
        safe_detail = detail.get("detail") or detail.get("message") or "Request failed."
        error_code = detail.get("error_code", error_code)
    else:
        safe_detail = str(detail)

    headers = dict(exc.headers or {})
    if request_id:
        headers["X-Request-ID"] = request_id

    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": safe_detail,
            "error_code": error_code,
        },
        headers=headers,
    )


@app.exception_handler(RequestValidationError)
async def safe_validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    request_id = getattr(request.state, "request_id", None)
    logger.warning(
        "request validation failed %s",
        format_log_fields(
            {
                "method": request.method,
                "path": request.url.path,
                "client": getattr(request.state, "client_ip", "-"),
                "error_count": len(exc.errors()),
            }
        ),
    )
    return json_error_response(
        status_code=422,
        detail="Request validation failed.",
        error_code="VALIDATION_ERROR",
        request_id=request_id,
    )


@app.middleware("http")
async def add_request_context(request: Request, call_next) -> Response:
    request_id = request.headers.get("X-Request-ID") or uuid.uuid4().hex[:12]
    request.state.request_id = request_id
    request.state.client_ip = get_client_ip(request)
    token = set_request_id(request_id)
    start = time.perf_counter()

    logger.info(
        "request started %s",
        format_log_fields(
            {
                "method": request.method,
                "path": request.url.path,
                "client": request.state.client_ip,
            }
        ),
    )

    body_limit_bytes = None
    if request.method == "POST":
        body_limit_bytes = get_generation_body_limit_bytes(request.url.path)
    if body_limit_bytes is not None:
        # Fast rejection: check Content-Length header before buffering the body.
        content_length_header = request.headers.get("content-length")
        if content_length_header is not None:
            try:
                if int(content_length_header) > body_limit_bytes:
                    reset_request_id(token)
                    return json_error_response(
                        status_code=413,
                        detail="Request body too large for generation endpoint.",
                        error_code="REQUEST_BODY_TOO_LARGE",
                        request_id=request_id,
                    )
            except ValueError:
                pass  # malformed Content-Length; fall through to body read
        body = await request.body()
        if len(body) > body_limit_bytes:
            logger.warning(
                "request rejected %s",
                format_log_fields(
                    {
                        "method": request.method,
                        "path": request.url.path,
                        "client": request.state.client_ip,
                        "reason": "body_too_large",
                        "body_bytes": len(body),
                        "body_limit_bytes": body_limit_bytes,
                    }
                ),
            )
            reset_request_id(token)
            return json_error_response(
                status_code=413,
                detail="Request body too large for generation endpoint.",
                error_code="REQUEST_BODY_TOO_LARGE",
                request_id=request_id,
            )

    try:
        response = await call_next(request)
    except Exception:
        duration_ms = round((time.perf_counter() - start) * 1000, 1)
        logger.exception(
            "request failed %s",
            format_log_fields(
                {
                    "method": request.method,
                    "path": request.url.path,
                    "duration_ms": duration_ms,
                }
            ),
        )
        reset_request_id(token)
        raise

    duration_ms = round((time.perf_counter() - start) * 1000, 1)
    response.headers["X-Request-ID"] = request_id
    logger.info(
        "request completed %s",
        format_log_fields(
            {
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration_ms": duration_ms,
            }
        ),
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
    import_ok = bool(diagnostics.get("import_ok"))
    return {
        "status": "ok" if import_ok else "degraded",
        "core": {
            "import_ok": import_ok,
            "distribution_installed": diagnostics.get("distribution_installed", False),
            "distribution_version": diagnostics.get("distribution_version", "unknown"),
        },
        "summary": "Core dependencies available." if import_ok else "Core dependencies unavailable.",
    }


@app.get("/health/generation-metrics", tags=["health"])
async def generation_metrics_health() -> dict:
    snapshot = get_generation_metrics_snapshot()
    snapshot["status"] = "ok"
    return snapshot


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
        "startup neoxra_core import_ok=%s version=%s",
        diagnostics.get("import_ok"),
        diagnostics.get("distribution_version", "unknown"),
    )
    logger.info("neoxra_core startup status: %s", format_neoxra_core_diagnostics(diagnostics))
