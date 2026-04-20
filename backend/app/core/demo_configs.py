from __future__ import annotations

import logging
from copy import deepcopy
from typing import Any

from ..db import TenantConfig, create_session, is_database_enabled

logger = logging.getLogger(__name__)


DEFAULT_DEMO_CONFIGS: dict[str, dict[str, Any]] = {
    "landing-public": {
        "demo_key": "landing-public",
        "surface": "landing",
        "display_name": "Landing Demo",
        "profile": "public",
        "preset_profile": "landing-public",
        "deterministic_fallback": {
            "enabled": False,
            "mode": "disabled",
            "fallback_key": None,
            "label": "Fallback unavailable",
        },
    },
    "instagram-public": {
        "demo_key": "instagram-public",
        "surface": "instagram",
        "display_name": "Instagram Studio",
        "profile": "public",
        "preset_profile": "instagram-public",
        "deterministic_fallback": {
            "enabled": True,
            "mode": "manual",
            "fallback_key": "instagram-public",
            "label": "Use Sample Output",
        },
    },
    "legal-client": {
        "demo_key": "legal-client",
        "surface": "legal",
        "display_name": "Legal Client Demo",
        "profile": "client",
        "preset_profile": "legal-client",
        "deterministic_fallback": {
            "enabled": True,
            "mode": "manual",
            "fallback_key": "legal-golden",
            "label": "Use Golden Scenario",
        },
    },
    "internal-sales": {
        "demo_key": "internal-sales",
        "surface": "instagram",
        "display_name": "Internal Sales Demo",
        "profile": "sales",
        "preset_profile": "startup-generic",
        "deterministic_fallback": {
            "enabled": True,
            "mode": "auto",
            "fallback_key": "sales-startup",
            "label": "Use Sales Fallback",
        },
    },
}

SURFACE_DEFAULT_KEYS = {
    "landing": "landing-public",
    "instagram": "instagram-public",
    "legal": "legal-client",
}


def _deep_merge(base: dict[str, Any], overrides: dict[str, Any]) -> dict[str, Any]:
    result = deepcopy(base)
    for key, value in overrides.items():
        if isinstance(value, dict) and isinstance(result.get(key), dict):
            result[key] = _deep_merge(result[key], value)
        else:
            result[key] = value
    return result


def _load_tenant_config(*, demo_key: str, environment: str) -> dict[str, Any] | None:
    if not is_database_enabled():
        return None

    session = create_session()
    try:
        tenant = (
            session.query(TenantConfig)
            .filter(TenantConfig.tenant_key == demo_key, TenantConfig.environment == environment)
            .one_or_none()
        )
        if tenant is None:
            tenant = (
                session.query(TenantConfig)
                .filter(TenantConfig.tenant_key == demo_key, TenantConfig.environment == "default")
                .one_or_none()
            )
        return dict(tenant.config_json or {}) if tenant else None
    except Exception:
        logger.warning(
            'demo config override unavailable; using defaults',
            extra={"demo_key": demo_key, "environment": environment},
            exc_info=True,
        )
        return None
    finally:
        session.close()


def get_demo_client_config(*, surface: str, demo_key: str | None, environment: str) -> dict[str, Any]:
    resolved_key = demo_key or SURFACE_DEFAULT_KEYS.get(surface, "landing-public")
    base = deepcopy(DEFAULT_DEMO_CONFIGS.get(resolved_key) or DEFAULT_DEMO_CONFIGS[SURFACE_DEFAULT_KEYS[surface]])
    tenant_overrides = _load_tenant_config(demo_key=resolved_key, environment=environment)
    if tenant_overrides:
        base = _deep_merge(base, tenant_overrides)
    base["demo_key"] = resolved_key
    base["surface"] = surface
    base["environment"] = environment
    return base
