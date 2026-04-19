from __future__ import annotations

import base64
import hashlib
import hmac
import os
import time
from dataclasses import dataclass

from fastapi import HTTPException, Request


SUPPORTED_ENV_MODES = {"local", "public-demo", "internal-demo", "production"}
SUPPORTED_DEMO_SURFACES = {"landing", "instagram", "legal"}
SUPPORTED_ACCESS_MODES = {"public", "gated"}


def _env(name: str, default: str) -> str:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip() or default


_DEV_MODE_ALIASES = {"development", "dev"}


def _normalize_env_mode(value: str) -> str:
    if value in SUPPORTED_ENV_MODES:
        return value
    if value in _DEV_MODE_ALIASES:
        return "local"
    return "production"


def get_runtime_mode() -> str:
    return _normalize_env_mode(_env("NEOXRA_ENV_MODE", _env("ENVIRONMENT", "local")))


def _default_access_mode(surface: str, runtime_mode: str) -> str:
    defaults = {
        "local": {"landing": "public", "instagram": "public", "legal": "public"},
        "public-demo": {"landing": "public", "instagram": "public", "legal": "gated"},
        "internal-demo": {"landing": "public", "instagram": "public", "legal": "public"},
        "production": {"landing": "public", "instagram": "public", "legal": "gated"},
    }
    return defaults.get(runtime_mode, defaults["production"]).get(surface, "public")


def get_surface_access_mode(surface: str, runtime_mode: str | None = None) -> str:
    mode = runtime_mode or get_runtime_mode()
    override = os.getenv(f"NEOXRA_{surface.upper()}_DEMO_ACCESS_MODE", "").strip()
    if override in SUPPORTED_ACCESS_MODES:
        return override
    return _default_access_mode(surface, mode)


def get_demo_surface_summary(runtime_mode: str | None = None) -> dict[str, str]:
    mode = runtime_mode or get_runtime_mode()
    return {
        surface: get_surface_access_mode(surface, mode)
        for surface in sorted(SUPPORTED_DEMO_SURFACES)
    }


def _get_surface_access_code(surface: str) -> str | None:
    value = os.getenv(f"NEOXRA_{surface.upper()}_DEMO_ACCESS_CODE", "").strip()
    return value or None


def _requires_explicit_signing_secret(runtime_mode: str | None = None) -> bool:
    mode = runtime_mode or get_runtime_mode()
    return any(
        get_surface_access_mode(surface, mode) == "gated"
        for surface in SUPPORTED_DEMO_SURFACES
    )


def _get_signing_secret() -> str:
    signing_secret = os.getenv("NEOXRA_DEMO_SIGNING_SECRET", "").strip()
    if signing_secret:
        return signing_secret

    if _requires_explicit_signing_secret():
        raise RuntimeError(
            "NEOXRA_DEMO_SIGNING_SECRET must be set when any demo surface uses gated access."
        )

    return _env("ANTHROPIC_API_KEY", "neoxra-demo-secret")


def _token_ttl_seconds() -> int:
    raw = _env("NEOXRA_DEMO_TOKEN_TTL_SECONDS", "28800")
    try:
        parsed = int(raw)
    except ValueError:
        return 28800
    return max(300, parsed)


def _b64url_encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("utf-8")


def _b64url_decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(value + padding)


def _sign(payload: str) -> str:
    signature = hmac.new(
        _get_signing_secret().encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256,
    ).digest()
    return _b64url_encode(signature)


@dataclass(frozen=True)
class DemoToken:
    surface: str
    runtime_mode: str
    exp: int


def issue_demo_token(surface: str, runtime_mode: str | None = None) -> str:
    mode = runtime_mode or get_runtime_mode()
    exp = int(time.time()) + _token_ttl_seconds()
    payload = f"{surface}:{mode}:{exp}"
    signature = _sign(payload)
    return f"{_b64url_encode(payload.encode('utf-8'))}.{signature}"


def verify_demo_token(surface: str, token: str, runtime_mode: str | None = None) -> DemoToken | None:
    if not token or "." not in token:
        return None
    encoded_payload, provided_signature = token.split(".", 1)
    try:
        payload = _b64url_decode(encoded_payload).decode("utf-8")
    except Exception:
        return None

    expected_signature = _sign(payload)
    if not hmac.compare_digest(expected_signature, provided_signature):
        return None

    parts = payload.split(":")
    if len(parts) != 3:
        return None

    token_surface, token_mode, token_exp = parts
    try:
        exp = int(token_exp)
    except ValueError:
        return None

    if token_surface != surface:
        return None
    if exp < int(time.time()):
        return None
    expected_mode = runtime_mode or get_runtime_mode()
    if token_mode != expected_mode:
        return None

    return DemoToken(surface=token_surface, runtime_mode=token_mode, exp=exp)


def create_demo_access_response(surface: str) -> dict[str, object]:
    mode = get_runtime_mode()
    token = issue_demo_token(surface, mode)
    try:
        encoded_payload = token.split(".")[0]
        payload = _b64url_decode(encoded_payload).decode("utf-8")
        expires_at = int(payload.split(":")[2])
    except Exception:
        expires_at = int(time.time()) + _token_ttl_seconds()
    return {
        "surface": surface,
        "access_mode": get_surface_access_mode(surface, mode),
        "runtime_mode": mode,
        "demo_token": token,
        "expires_at": expires_at,
    }


def require_demo_access(request: Request, *, default_surface: str, allowed_surfaces: set[str]) -> str:
    runtime_mode = get_runtime_mode()
    requested_surface = request.headers.get("X-Neoxra-Demo-Surface", default_surface).strip() or default_surface
    if requested_surface not in allowed_surfaces:
        raise HTTPException(
            status_code=400,
            detail={
                "detail": "Unsupported demo surface for this route.",
                "error_code": "INVALID_DEMO_SURFACE",
            },
        )

    request.state.demo_surface = requested_surface
    request.state.runtime_mode = runtime_mode
    access_mode = get_surface_access_mode(requested_surface, runtime_mode)
    request.state.demo_access_mode = access_mode
    if access_mode == "public":
        return requested_surface

    token = request.headers.get("X-Neoxra-Demo-Token", "").strip()
    if not token:
        raise HTTPException(
            status_code=401,
            detail={
                "detail": "Client demo access required.",
                "error_code": "DEMO_ACCESS_REQUIRED",
            },
        )

    verified = verify_demo_token(requested_surface, token, runtime_mode)
    if verified is None:
        raise HTTPException(
            status_code=401,
            detail={
                "detail": "Client demo access is invalid or expired.",
                "error_code": "INVALID_DEMO_ACCESS",
            },
        )

    return requested_surface


def validate_demo_access_code(surface: str, access_code: str) -> bool:
    expected = _get_surface_access_code(surface)
    if not expected:
        return False
    return hmac.compare_digest(expected, access_code.strip())
