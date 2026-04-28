from __future__ import annotations

import hashlib
import os
import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from urllib.parse import quote as urlquote

from fastapi import HTTPException, Request
from sqlalchemy import update as sa_update
from sqlalchemy.exc import IntegrityError

from ..db import AuthSession, MagicLinkToken, Organization, OrganizationMembership, User, create_session


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _ensure_utc(dt: datetime) -> datetime:
    """Return a timezone-aware datetime in UTC. Handles SQLite-returned naive datetimes."""
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


# Only write last_seen_at if it is older than this threshold to reduce write amplification.
_LAST_SEEN_UPDATE_INTERVAL = timedelta(minutes=15)


def _normalize_email(email: str) -> str:
    cleaned = email.strip().lower()
    if not cleaned or "@" not in cleaned:
        raise ValueError("email must be valid")
    return cleaned


def _normalize_tenant_key(value: str) -> str:
    cleaned = value.strip().lower().replace(" ", "-")
    cleaned = "".join(ch for ch in cleaned if ch.isalnum() or ch in {"-", "_"})
    if not cleaned:
        raise ValueError("organization_key must not be blank")
    return cleaned[:128]


def _hash_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def _validate_redirect_path(value: str | None) -> str | None:
    """Return a safe relative path or None. Rejects absolute URLs and protocol-relative paths."""
    if not value:
        return None
    stripped = value.strip()
    if not stripped.startswith("/") or stripped.startswith("//") or "://" in stripped:
        return None
    return stripped


def _magic_link_ttl_minutes() -> int:
    raw = os.getenv("AUTH_MAGIC_LINK_TTL_MINUTES", "20").strip()
    try:
        return max(5, int(raw))
    except ValueError:
        return 20


def _session_ttl_days() -> int:
    raw = os.getenv("AUTH_SESSION_TTL_DAYS", "14").strip()
    try:
        return max(1, int(raw))
    except ValueError:
        return 14


def _frontend_app_url() -> str:
    return os.getenv("FRONTEND_APP_URL", "http://localhost:3000").rstrip("/")


def magic_link_debug_enabled() -> bool:
    return os.getenv("AUTH_MAGIC_LINK_DEBUG", "").strip().lower() in {"1", "true", "yes"}


@dataclass
class AuthContext:
    is_authenticated: bool
    user_id: str | None = None
    email: str | None = None
    organization_id: str | None = None
    tenant_key: str | None = None
    role: str | None = None
    session_id: str | None = None


def resolve_auth_context(request: Request) -> AuthContext:
    raw = (
        request.headers.get("X-Neoxra-Session-Token")
        or request.headers.get("Authorization", "").removeprefix("Bearer ").strip()
        or request.cookies.get("neoxra_session")
        or ""
    ).strip()
    if not raw:
        return AuthContext(is_authenticated=False)

    token_hash = _hash_token(raw)
    session = create_session()
    try:
        auth_session = (
            session.query(AuthSession, User, Organization)
            .join(User, AuthSession.user_id == User.id)
            .outerjoin(Organization, AuthSession.organization_id == Organization.id)
            .filter(
                AuthSession.session_token_hash == token_hash,
                AuthSession.status == "active",
                AuthSession.expires_at > _utcnow(),
                User.is_active.is_(True),
                (AuthSession.organization_id.is_(None) | Organization.is_active.is_(True)),
            )
            .one_or_none()
        )
        if auth_session is None:
            return AuthContext(is_authenticated=False)

        auth_session_row, user, organization = auth_session
        now = _utcnow()
        last_seen = auth_session_row.last_seen_at
        if last_seen is None or (now - _ensure_utc(last_seen)) > _LAST_SEEN_UPDATE_INTERVAL:
            auth_session_row.last_seen_at = now
            session.commit()
        return AuthContext(
            is_authenticated=True,
            user_id=user.id,
            email=user.email,
            organization_id=organization.id if organization else None,
            tenant_key=organization.tenant_key if organization else None,
            session_id=auth_session_row.id,
        )
    finally:
        session.close()


def attach_auth_context(request: Request) -> AuthContext:
    context = resolve_auth_context(request)
    request.state.auth = context
    return context


def require_authenticated_user(request: Request) -> AuthContext:
    context = getattr(request.state, "auth", None) or attach_auth_context(request)
    if not context.is_authenticated:
        raise HTTPException(
            status_code=401,
            detail={
                "detail": "Authentication required.",
                "error_code": "AUTH_REQUIRED",
            },
        )
    return context


def _find_or_create_user(email: str, full_name: str | None = None) -> User:
    session = create_session()
    try:
        user = session.query(User).filter(User.email == email).one_or_none()
        if user is None:
            user = User(email=email, full_name=full_name)
            session.add(user)
            try:
                session.commit()
                session.refresh(user)
            except IntegrityError:
                session.rollback()
                user = session.query(User).filter(User.email == email).one()
        return user
    finally:
        session.close()


def _find_or_create_organization(tenant_key: str, display_name: str | None = None) -> Organization:
    session = create_session()
    try:
        organization = session.query(Organization).filter(Organization.tenant_key == tenant_key).one_or_none()
        if organization is None:
            organization = Organization(
                tenant_key=tenant_key,
                name=display_name or tenant_key.replace("-", " ").title(),
                org_type="client" if tenant_key != "personal" else "personal",
            )
            session.add(organization)
            try:
                session.commit()
                session.refresh(organization)
            except IntegrityError:
                session.rollback()
                organization = session.query(Organization).filter(Organization.tenant_key == tenant_key).one()
        return organization
    finally:
        session.close()


def _ensure_membership(organization_id: str, user_id: str) -> None:
    session = create_session()
    try:
        membership = (
            session.query(OrganizationMembership)
            .filter(
                OrganizationMembership.organization_id == organization_id,
                OrganizationMembership.user_id == user_id,
            )
            .one_or_none()
        )
        if membership is None:
            session.add(
                OrganizationMembership(
                    organization_id=organization_id,
                    user_id=user_id,
                    role="owner",
                )
            )
            try:
                session.commit()
            except IntegrityError:
                session.rollback()
    finally:
        session.close()


def create_authenticated_session(
    *,
    email: str,
    full_name: str | None = None,
    auth_method: str = "magic_link",
    organization_key: str | None = None,
) -> dict[str, object]:
    """Find-or-create user/org/membership and issue a new AuthSession.

    Shared by magic-link verify and Google OAuth callback.
    """
    normalized_email = _normalize_email(email)
    tenant_key = "personal"
    if organization_key:
        tenant_key = _normalize_tenant_key(organization_key)

    user = _find_or_create_user(normalized_email, full_name)
    organization = _find_or_create_organization(tenant_key)
    _ensure_membership(organization.id, user.id)

    now = _utcnow()
    session_token = secrets.token_urlsafe(32)
    session = create_session()
    try:
        user_row = session.merge(user)
        user_row.last_login_at = now

        auth_session = AuthSession(
            user_id=user.id,
            organization_id=organization.id,
            session_token_hash=_hash_token(session_token),
            auth_method=auth_method,
            expires_at=now + timedelta(days=_session_ttl_days()),
            last_seen_at=now,
        )
        session.add(auth_session)
        session.commit()
        session.refresh(auth_session)
    finally:
        session.close()

    return {
        "status": "ok",
        "session_token": session_token,
        "expires_at": auth_session.expires_at.isoformat(),
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
        },
        "organization": {
            "id": organization.id,
            "tenant_key": organization.tenant_key,
            "name": organization.name,
        },
    }


def request_magic_link(
    *,
    email: str,
    organization_key: str | None = None,
    redirect_path: str | None = None,
    full_name: str | None = None,
) -> dict[str, object]:
    try:
        normalized_email = _normalize_email(email)
    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail={"detail": str(exc), "error_code": "invalid_email"},
        ) from exc

    if organization_key:
        try:
            tenant_key = _normalize_tenant_key(organization_key)
        except ValueError as exc:
            raise HTTPException(
                status_code=422,
                detail={"detail": str(exc), "error_code": "invalid_organization_key"},
            ) from exc
    else:
        tenant_key = "personal"

    safe_redirect = _validate_redirect_path(redirect_path)

    user = _find_or_create_user(normalized_email, full_name)
    organization = _find_or_create_organization(tenant_key)
    _ensure_membership(organization.id, user.id)

    raw_token = secrets.token_urlsafe(32)
    token_hash = _hash_token(raw_token)
    expires_at = _utcnow() + timedelta(minutes=_magic_link_ttl_minutes())

    session = create_session()
    try:
        token = MagicLinkToken(
            user_id=user.id,
            organization_id=organization.id,
            email=normalized_email,
            token_hash=token_hash,
            redirect_path=safe_redirect,
            expires_at=expires_at,
        )
        session.add(token)
        session.commit()
    finally:
        session.close()

    base_link = f"{_frontend_app_url()}/login?token={raw_token}"
    magic_link = f"{base_link}&redirect={urlquote(safe_redirect, safe='/')}" if safe_redirect else base_link
    response: dict[str, object] = {
        "status": "ok",
        "delivery": "magic_link",
        "email": normalized_email,
        "organization": {
            "tenant_key": organization.tenant_key,
            "name": organization.name,
        },
        "expires_at": expires_at.isoformat(),
    }
    if magic_link_debug_enabled():
        response["magic_link"] = magic_link
    return response


def verify_magic_link(token: str) -> dict[str, object]:
    raw_token = token.strip()
    if not raw_token:
        raise HTTPException(
            status_code=400,
            detail={"detail": "Token is required.", "error_code": "TOKEN_REQUIRED"},
        )

    token_hash = _hash_token(raw_token)
    now = _utcnow()
    session = create_session()
    try:
        # Atomically mark the token as used. Only the first concurrent request will
        # match (used_at IS NULL), preventing double-redemption races.
        result = session.execute(
            sa_update(MagicLinkToken)
            .where(
                MagicLinkToken.token_hash == token_hash,
                MagicLinkToken.used_at.is_(None),
                MagicLinkToken.expires_at > now,
            )
            .values(used_at=now)
        )
        session.flush()
        if result.rowcount != 1:
            raise HTTPException(
                status_code=401,
                detail={"detail": "Magic link is invalid or expired.", "error_code": "INVALID_MAGIC_LINK"},
            )

        match = (
            session.query(MagicLinkToken, User, Organization)
            .join(User, MagicLinkToken.user_id == User.id)
            .outerjoin(Organization, MagicLinkToken.organization_id == Organization.id)
            .filter(MagicLinkToken.token_hash == token_hash)
            .one()
        )

        magic_token, user, organization = match
        redirect_path = magic_token.redirect_path
        session.commit()

        org_key = organization.tenant_key if organization else None
        result = create_authenticated_session(
            email=user.email,
            full_name=user.full_name,
            auth_method="magic_link",
            organization_key=org_key,
        )
        result["redirect_path"] = redirect_path
        return result
    finally:
        session.close()


def revoke_session_token(raw_token: str) -> None:
    cleaned = raw_token.strip()
    if not cleaned:
        return
    session = create_session()
    try:
        auth_session = (
            session.query(AuthSession)
            .filter(AuthSession.session_token_hash == _hash_token(cleaned), AuthSession.status == "active")
            .one_or_none()
        )
        if auth_session is not None:
            auth_session.status = "revoked"
            session.commit()
    finally:
        session.close()
