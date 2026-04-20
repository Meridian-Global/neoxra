from __future__ import annotations

import logging

from ..api.access_groups import build_internal_router, build_public_router
from ..core.abuse_monitor import ABUSE_MONITOR
from ..core.demo_access import get_demo_surface_summary, get_runtime_mode
from ..core.generation_metrics import get_generation_metrics_snapshot
from ..core.neoxra_core_diagnostics import get_neoxra_core_diagnostics
from ..core.rate_limits import get_rate_limit_backend_name
from ..db import check_database_connection, is_database_enabled

public_router = build_public_router()
internal_router = build_internal_router()


logger = logging.getLogger(__name__)


@public_router.get("/", tags=["health"])
async def root_health() -> dict[str, object]:
    return {"status": "ok", "service": "neoxra-api"}


@public_router.get("/healthz", tags=["health"])
async def healthz() -> dict[str, object]:
    return {"status": "ok", "database_enabled": is_database_enabled()}


@public_router.get("/health/db", tags=["health"])
async def db_health() -> dict[str, object]:
    if not is_database_enabled():
        return {"status": "disabled", "database_enabled": False}
    try:
        check_database_connection()
    except Exception:
        logger.exception("database connectivity check failed")
        return {"status": "degraded", "database_enabled": True}
    return {"status": "ok", "database_enabled": True}


@public_router.get("/health/core", tags=["health"])
async def core_health() -> dict[str, object]:
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


@public_router.get("/health/runtime", tags=["health"])
async def runtime_health() -> dict[str, object]:
    runtime_mode = get_runtime_mode()
    return {
        "status": "ok",
        "runtime_mode": runtime_mode,
        "demo_surfaces": get_demo_surface_summary(runtime_mode),
    }


@internal_router.get("/health/generation-metrics", tags=["health"])
async def generation_metrics_health() -> dict[str, object]:
    snapshot = get_generation_metrics_snapshot()
    snapshot["status"] = "ok"
    return snapshot


@internal_router.get("/internal/guardrails", tags=["internal"])
async def guardrail_health() -> dict[str, object]:
    return {
        "status": "ok",
        "rate_limit_backend": get_rate_limit_backend_name(),
        "abuse_monitor": await ABUSE_MONITOR.snapshot(),
    }
