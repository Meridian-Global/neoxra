from __future__ import annotations

import hashlib
import os
import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, Request
from sqlalchemy.exc import IntegrityError

from ..db import AuthSession, Organization, OrganizationMembership, User, create_session


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


def _session_ttl_days() -> int:
    raw = os.getenv("AUTH_SESSION_TTL_DAYS", "14").strip()
    try:
        return max(1, int(raw))
    except ValueError:
        return 14


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
    auth_method: str = "google",
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
