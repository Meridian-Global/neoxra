from __future__ import annotations

import logging
import os
import secrets
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, ConfigDict

from ..core.auth import create_authenticated_session, require_authenticated_user, revoke_session_token
from ..core.google_oauth import exchange_code_for_tokens, google_redirect_uri, verify_google_id_token
from ..core.rate_limits import get_rate_limit_store
from ..core.request_guards import get_client_ip
from ..core.auth_cleanup import run_auth_cleanup
from ..db import is_database_enabled
from .access_groups import build_authenticated_marker_router, build_internal_router, build_public_router

logger = logging.getLogger(__name__)

router = APIRouter()
public_router = build_public_router()
authenticated_router = build_authenticated_marker_router()
internal_router = build_internal_router()

# ---------------------------------------------------------------------------
# Auth rate limiting
# ---------------------------------------------------------------------------

_AUTH_GOOGLE_URL_LIMIT = 20
_AUTH_GOOGLE_URL_WINDOW = 900  # 15 minutes
_AUTH_GOOGLE_CALLBACK_LIMIT = 10
_AUTH_GOOGLE_CALLBACK_WINDOW = 900


async def _enforce_google_url_rate_limit(request: Request) -> None:
    client_ip = getattr(request.state, "client_ip", None) or get_client_ip(request)
    allowed, retry_after, _ = await get_rate_limit_store().check_limit(
        "rate:auth:google:url", client_ip, limit=_AUTH_GOOGLE_URL_LIMIT, window_seconds=_AUTH_GOOGLE_URL_WINDOW,
    )
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail={"detail": "Too many requests. Please try again later.", "error_code": "RATE_LIMITED"},
            headers={"Retry-After": str(retry_after)},
        )


async def _enforce_google_callback_rate_limit(request: Request) -> None:
    client_ip = getattr(request.state, "client_ip", None) or get_client_ip(request)
    allowed, retry_after, _ = await get_rate_limit_store().check_limit(
        "rate:auth:google:callback", client_ip, limit=_AUTH_GOOGLE_CALLBACK_LIMIT, window_seconds=_AUTH_GOOGLE_CALLBACK_WINDOW,
    )
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail={"detail": "Too many requests. Please try again later.", "error_code": "RATE_LIMITED"},
            headers={"Retry-After": str(retry_after)},
        )

@authenticated_router.get("/api/auth/me")
async def auth_me(request: Request) -> dict[str, object]:
    auth = require_authenticated_user(request)
    return {
        "authenticated": True,
        "user": {
            "id": auth.user_id,
            "email": auth.email,
        },
        "organization": {
            "id": auth.organization_id,
            "tenant_key": auth.tenant_key,
        },
    }


@authenticated_router.post("/api/auth/logout")
async def auth_logout(request: Request) -> dict[str, str]:
    raw = (
        request.headers.get("X-Neoxra-Session-Token")
        or request.headers.get("Authorization", "").removeprefix("Bearer ").strip()
        or request.cookies.get("neoxra_session")
        or ""
    ).strip()
    if raw:
        revoke_session_token(raw)
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Google OAuth
# ---------------------------------------------------------------------------

# Simple in-memory CSRF state store. Values expire after 10 minutes.
# Sufficient for a single-process demo; swap for Redis in production.
_google_oauth_states: dict[str, float] = {}
_GOOGLE_STATE_TTL_SECONDS = 600


def _prune_expired_states() -> None:
    import time

    now = time.time()
    expired = [k for k, v in _google_oauth_states.items() if now - v > _GOOGLE_STATE_TTL_SECONDS]
    for k in expired:
        _google_oauth_states.pop(k, None)


@public_router.get("/api/auth/google/url", dependencies=[Depends(_enforce_google_url_rate_limit)])
async def auth_google_url() -> dict[str, str]:
    import time

    client_id = os.getenv("GOOGLE_CLIENT_ID", "").strip()
    if not client_id:
        raise HTTPException(status_code=501, detail="Google OAuth is not configured.")

    state = secrets.token_urlsafe(32)
    _prune_expired_states()
    _google_oauth_states[state] = time.time()

    params = urlencode(
        {
            "client_id": client_id,
            "redirect_uri": google_redirect_uri(),
            "response_type": "code",
            "scope": "openid email profile",
            "state": state,
            "access_type": "online",
            "prompt": "select_account",
        }
    )
    return {"url": f"https://accounts.google.com/o/oauth2/v2/auth?{params}"}


class GoogleCallbackRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    code: str
    state: str


@public_router.post("/api/auth/google/callback", dependencies=[Depends(_enforce_google_callback_rate_limit)])
async def auth_google_callback(payload: GoogleCallbackRequest) -> dict[str, object]:
    import time

    # Validate CSRF state
    created_at = _google_oauth_states.pop(payload.state, None)
    if created_at is None or (time.time() - created_at) > _GOOGLE_STATE_TTL_SECONDS:
        raise HTTPException(status_code=400, detail="Invalid or expired OAuth state.")

    # Exchange code for tokens
    try:
        tokens = exchange_code_for_tokens(payload.code, google_redirect_uri())
    except Exception:
        logger.exception("Google token exchange failed")
        raise HTTPException(status_code=400, detail="Failed to exchange authorization code.")

    raw_id_token = tokens.get("id_token")
    if not raw_id_token:
        raise HTTPException(status_code=400, detail="No ID token in Google response.")

    # Verify the ID token
    try:
        claims = verify_google_id_token(raw_id_token)
    except Exception:
        logger.exception("Google ID token verification failed")
        raise HTTPException(status_code=401, detail="Invalid Google ID token.")

    email = claims.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Google account has no email.")

    return create_authenticated_session(
        email=email,
        full_name=claims.get("name"),
        auth_method="google",
    )


# ---------------------------------------------------------------------------
# Internal — auth cleanup
# ---------------------------------------------------------------------------


@internal_router.post("/api/internal/auth/cleanup")
async def auth_cleanup() -> dict[str, int]:
    if not is_database_enabled():
        raise HTTPException(
            status_code=503,
            detail="Auth cleanup is unavailable because the database is not configured.",
        )
    return run_auth_cleanup()


router.include_router(public_router)
router.include_router(authenticated_router)
router.include_router(internal_router)
