"""Cleanup expired and revoked auth sessions."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from ..db import AuthSession, create_session

logger = logging.getLogger(__name__)

# Revoked sessions older than this are eligible for deletion.
_REVOKED_RETENTION_DAYS = 30


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def cleanup_expired_sessions() -> int:
    """Delete expired and old revoked AuthSessions. Returns count deleted."""
    now = _utcnow()
    revoked_cutoff = now - timedelta(days=_REVOKED_RETENTION_DAYS)
    session = create_session()
    try:
        deleted = (
            session.query(AuthSession)
            .filter(
                (AuthSession.expires_at < now)
                | ((AuthSession.status == "revoked") & (AuthSession.created_at < revoked_cutoff))
            )
            .delete(synchronize_session="fetch")
        )
        session.commit()
        return deleted
    finally:
        session.close()


def run_auth_cleanup() -> dict[str, int]:
    """Run cleanup and log results."""
    deleted = cleanup_expired_sessions()
    logger.info("auth cleanup completed: sessions_deleted=%d", deleted)
    return {"sessions_deleted": deleted}
