from __future__ import annotations

from fastapi import APIRouter, Request
from pydantic import BaseModel, ConfigDict, field_validator

from ..core.auth import magic_link_debug_enabled, require_authenticated_user, request_magic_link, revoke_session_token, verify_magic_link

router = APIRouter()


class MagicLinkRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: str
    organization_key: str | None = None
    redirect_path: str | None = None
    full_name: str | None = None

    @field_validator("email")
    @classmethod
    def email_must_not_be_blank(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("email must not be blank")
        return cleaned


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


@router.post("/api/auth/request-link")
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


@router.post("/api/auth/verify")
async def auth_verify_magic_link(payload: MagicLinkVerifyRequest) -> dict[str, object]:
    return verify_magic_link(payload.token)


@router.get("/api/auth/me")
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


@router.post("/api/auth/logout")
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
