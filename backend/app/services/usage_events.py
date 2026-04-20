from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

from sqlalchemy.exc import SQLAlchemyError

from ..db import DemoRun, UsageEvent, create_session, is_database_enabled
from ..db.models import TenantConfig
from ..core.logging_utils import format_log_fields, get_request_id

logger = logging.getLogger(__name__)


@dataclass
class DemoRunHandle:
    demo_run_id: str | None


def _db_disabled() -> bool:
    return not is_database_enabled()


def _safe_db_log(message: str, **fields: Any) -> None:
    logger.warning("database persistence skipped %s", format_log_fields({"reason": message, **fields}))


def create_demo_run(
    *,
    route: str,
    pipeline: str,
    surface: str | None,
    source: str | None,
    visitor_id: str | None,
    session_id: str | None,
    locale: str,
    input_summary: dict[str, Any],
    core_client_mode: str | None = None,
) -> DemoRunHandle:
    if _db_disabled():
        return DemoRunHandle(demo_run_id=None)

    session = create_session()
    try:
        demo_run = DemoRun(
            request_id=get_request_id(),
            route=route,
            pipeline=pipeline,
            surface=surface,
            source=source,
            visitor_id=visitor_id,
            session_id=session_id,
            locale=locale,
            input_summary=input_summary,
            core_client_mode=core_client_mode,
        )
        session.add(demo_run)
        session.commit()
        return DemoRunHandle(demo_run_id=demo_run.id)
    except SQLAlchemyError:
        session.rollback()
        logger.exception("failed to persist demo run")
        return DemoRunHandle(demo_run_id=None)
    finally:
        session.close()


def mark_demo_run_completed(
    handle: DemoRunHandle,
    *,
    status: str,
    duration_ms: float | None = None,
    failure_reason: str | None = None,
    error_code: str | None = None,
) -> None:
    if _db_disabled() or handle.demo_run_id is None:
        return

    session = create_session()
    try:
        demo_run = session.get(DemoRun, handle.demo_run_id)
        if demo_run is None:
            _safe_db_log("missing_demo_run", demo_run_id=handle.demo_run_id)
            return
        demo_run.status = status
        demo_run.duration_ms = duration_ms
        demo_run.failure_reason = failure_reason
        demo_run.error_code = error_code
        session.commit()
    except SQLAlchemyError:
        session.rollback()
        logger.exception("failed to update demo run")
    finally:
        session.close()


def record_usage_event(
    *,
    route: str,
    pipeline: str,
    event_name: str,
    status: str | None = None,
    locale: str | None = None,
    surface: str | None = None,
    source: str | None = None,
    visitor_id: str | None = None,
    session_id: str | None = None,
    error_code: str | None = None,
    error_stage: str | None = None,
    metadata: dict[str, Any] | None = None,
    demo_run_handle: DemoRunHandle | None = None,
) -> None:
    if _db_disabled():
        return

    session = create_session()
    try:
        usage_event = UsageEvent(
            request_id=get_request_id(),
            demo_run_id=demo_run_handle.demo_run_id if demo_run_handle else None,
            route=route,
            pipeline=pipeline,
            event_name=event_name,
            status=status,
            locale=locale,
            surface=surface,
            source=source,
            visitor_id=visitor_id,
            session_id=session_id,
            error_code=error_code,
            error_stage=error_stage,
            metadata_json=metadata or {},
        )
        session.add(usage_event)
        session.commit()
    except SQLAlchemyError:
        session.rollback()
        logger.exception("failed to persist usage event")
    finally:
        session.close()


def upsert_tenant_config(
    *,
    tenant_key: str,
    environment: str,
    config_json: dict[str, Any],
    display_name: str | None = None,
    notes: str | None = None,
    is_active: bool = True,
) -> None:
    if _db_disabled():
        return

    session = create_session()
    try:
        tenant = (
            session.query(TenantConfig)
            .filter(TenantConfig.tenant_key == tenant_key, TenantConfig.environment == environment)
            .one_or_none()
        )
        if tenant is None:
            tenant = TenantConfig(
                tenant_key=tenant_key,
                environment=environment,
                config_json=config_json,
                display_name=display_name,
                notes=notes,
                is_active=is_active,
            )
            session.add(tenant)
        else:
            tenant.environment = environment
            tenant.config_json = config_json
            tenant.display_name = display_name
            tenant.notes = notes
            tenant.is_active = is_active
        session.commit()
    except SQLAlchemyError:
        session.rollback()
        logger.exception("failed to upsert tenant config")
    finally:
        session.close()
