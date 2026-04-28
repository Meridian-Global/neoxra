from __future__ import annotations

import logging
import os
import re
import secrets
from urllib.parse import urlencode

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, ConfigDict, field_validator

from ..core.auth import create_authenticated_session, magic_link_debug_enabled, require_authenticated_user, request_magic_link, revoke_session_token, verify_magic_link
from ..core.google_oauth import exchange_code_for_tokens, google_redirect_uri, verify_google_id_token
from .access_groups import build_authenticated_marker_router, build_public_router

logger = logging.getLogger(__name__)

router = APIRouter()
public_router = build_public_router()
authenticated_router = build_authenticated_marker_router()

_EMAIL_RE = re.compile(r"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$")


def _is_safe_redirect_path(value: str) -> bool:
    """Return True only for safe relative paths (no scheme or protocol-relative URL)."""
    return value.startswith("/") and not value.startswith("//") and "://" not in value


class MagicLinkRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: str
    organization_key: str | None = None
    redirect_path: str | None = None
    full_name: str | None = None

    @field_validator("email")
    @classmethod
    def email_must_be_valid(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("email must not be blank")
        if not _EMAIL_RE.match(cleaned):
            raise ValueError("email must be a valid email address")
        return cleaned

    @field_validator("redirect_path")
    @classmethod
    def redirect_path_must_be_safe(cls, value: str | None) -> str | None:
        if value is None:
            return value
        stripped = value.strip()
        if stripped and not _is_safe_redirect_path(stripped):
            raise ValueError("redirect_path must be a safe relative path starting with /")
        return stripped or None


class MagicLinkVerifyRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    token: str

    @field_validator("token")
    @classmethod
    def token_must_not_be_blank(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("token must not be blank")
        return cleaned


@public_router.post("/api/auth/request-link")
async def auth_request_magic_link(payload: MagicLinkRequest) -> dict[str, object]:
    response = request_magic_link(
        email=payload.email,
        organization_key=payload.organization_key,
        redirect_path=payload.redirect_path,
        full_name=payload.full_name,
    )
    if not magic_link_debug_enabled():
        response.pop("magic_link", None)
    return response


@public_router.post("/api/auth/verify")
async def auth_verify_magic_link(payload: MagicLinkVerifyRequest) -> dict[str, object]:
    return verify_magic_link(payload.token)


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


@public_router.get("/api/auth/google/url")
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


@public_router.post("/api/auth/google/callback")
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


router.include_router(public_router)
router.include_router(authenticated_router)
