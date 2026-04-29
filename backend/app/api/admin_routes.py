from __future__ import annotations

import logging
import math
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import HTTPException, Query, Request
from pydantic import BaseModel, ConfigDict
from sqlalchemy import func, or_
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from ..core.abuse_monitor import ABUSE_MONITOR
from ..core.generation_metrics import get_generation_metrics_snapshot
from ..core.neoxra_core_diagnostics import get_neoxra_core_diagnostics
from ..core.rate_limits import get_rate_limit_backend_name
from ..db import (
    AuthSession,
    DemoRun,
    Organization,
    OrganizationMembership,
    Plan,
    Subscription,
    UsageCounter,
    UsageEvent,
    User,
    check_database_connection,
    create_session,
    is_database_enabled,
)
from ..services.subscriptions import get_plan_by_slug, period_bounds_utc
from .access_groups import build_admin_router

router = build_admin_router()
logger = logging.getLogger(__name__)

_COMPLETED_EVENT_NAMES = ("pipeline_completed", "demo_completed")
_ALLOWED_SORT_FIELDS = {"created_at", "email", "last_login_at"}


def _require_db() -> None:
    if not is_database_enabled():
        raise HTTPException(status_code=503, detail="Database is not configured.")


def _pagination(total: int, page: int, per_page: int) -> dict:
    return {
        "page": page,
        "per_page": per_page,
        "total": total,
        "total_pages": math.ceil(total / per_page) if per_page > 0 else 0,
    }


# ---------------------------------------------------------------------------
# 1. GET /api/admin/users
# ---------------------------------------------------------------------------

@router.get("/api/admin/users")
async def admin_list_users(
    request: Request,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: str = Query(""),
    sort: str = Query("created_at"),
    order: str = Query("desc"),
) -> dict:
    _require_db()

    if sort not in _ALLOWED_SORT_FIELDS:
        sort = "created_at"
    if order not in ("asc", "desc"):
        order = "desc"

    period_start, _ = period_bounds_utc()

    session = create_session()
    try:
        q = session.query(User)

        if search.strip():
            pattern = f"%{search.strip()}%"
            q = q.filter(or_(User.email.ilike(pattern), User.full_name.ilike(pattern)))

        total = q.count()

        sort_col = getattr(User, sort)
        q = q.order_by(sort_col.desc() if order == "desc" else sort_col.asc())
        users = q.offset((page - 1) * per_page).limit(per_page).all()

        result = []
        for user in users:
            # Organization via membership
            membership = (
                session.query(OrganizationMembership)
                .filter(OrganizationMembership.user_id == user.id)
                .first()
            )
            org_info = None
            plan_info = None
            generations_this_month = 0

            if membership:
                org = session.get(Organization, membership.organization_id)
                if org:
                    org_info = {"tenant_key": org.tenant_key, "name": org.name}

                    # Subscription + plan
                    sub = (
                        session.query(Subscription)
                        .filter(
                            Subscription.organization_id == org.id,
                            Subscription.status.in_(("active", "trialing")),
                        )
                        .one_or_none()
                    )
                    if sub:
                        plan = session.get(Plan, sub.plan_id)
                        if plan:
                            plan_info = {"slug": plan.slug, "name": plan.name}

                    # Usage counter
                    counter = (
                        session.query(UsageCounter)
                        .filter(
                            UsageCounter.organization_id == org.id,
                            UsageCounter.period_start == period_start,
                        )
                        .one_or_none()
                    )
                    if counter:
                        generations_this_month = counter.generation_count

            result.append({
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "is_active": user.is_active,
                "is_admin": user.is_admin,
                "last_login_at": user.last_login_at.isoformat() if user.last_login_at else None,
                "created_at": user.created_at.isoformat() if user.created_at else None,
                "organization": org_info,
                "plan": plan_info,
                "generations_this_month": generations_this_month,
            })

        return {"users": result, "pagination": _pagination(total, page, per_page)}
    except HTTPException:
        raise
    except SQLAlchemyError:
        logger.exception("failed to list admin users")
        raise HTTPException(status_code=500, detail="Failed to query users.")
    finally:
        session.close()


# ---------------------------------------------------------------------------
# 2. GET /api/admin/users/{user_id}
# ---------------------------------------------------------------------------

@router.get("/api/admin/users/{user_id}")
async def admin_get_user(user_id: str, request: Request) -> dict:
    _require_db()

    period_start, period_end = period_bounds_utc()

    session = create_session()
    try:
        user = session.get(User, user_id)
        if user is None:
            raise HTTPException(status_code=404, detail="User not found.")

        user_info = {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "is_active": user.is_active,
            "is_admin": user.is_admin,
            "last_login_at": user.last_login_at.isoformat() if user.last_login_at else None,
            "created_at": user.created_at.isoformat() if user.created_at else None,
        }

        # Organization
        membership = (
            session.query(OrganizationMembership)
            .filter(OrganizationMembership.user_id == user_id)
            .first()
        )
        org_info = None
        sub_info = None
        usage_info = {"generations_this_month": 0, "generations_limit": 10, "generations_remaining": 10}

        if membership:
            org = session.get(Organization, membership.organization_id)
            if org:
                org_info = {
                    "id": org.id,
                    "tenant_key": org.tenant_key,
                    "name": org.name,
                    "org_type": org.org_type,
                }

                sub = (
                    session.query(Subscription)
                    .filter(
                        Subscription.organization_id == org.id,
                        Subscription.status.in_(("active", "trialing")),
                    )
                    .one_or_none()
                )
                generations_limit = 10
                if sub:
                    plan = session.get(Plan, sub.plan_id)
                    sub_info = {
                        "plan_slug": plan.slug if plan else "unknown",
                        "plan_name": plan.name if plan else "Unknown",
                        "status": sub.status,
                        "period_start": sub.current_period_start.isoformat(),
                        "period_end": sub.current_period_end.isoformat(),
                    }
                    if plan:
                        generations_limit = plan.generations_per_month

                counter = (
                    session.query(UsageCounter)
                    .filter(
                        UsageCounter.organization_id == org.id,
                        UsageCounter.period_start == period_start,
                    )
                    .one_or_none()
                )
                generations_this_month = counter.generation_count if counter else 0
                usage_info = {
                    "generations_this_month": generations_this_month,
                    "generations_limit": generations_limit,
                    "generations_remaining": max(0, generations_limit - generations_this_month),
                }

        # Active sessions
        active_sessions = (
            session.query(AuthSession)
            .filter(
                AuthSession.user_id == user_id,
                AuthSession.status == "active",
            )
            .order_by(AuthSession.last_seen_at.desc().nullslast())
            .all()
        )
        sessions_list = [
            {
                "id": s.id,
                "auth_method": s.auth_method,
                "status": s.status,
                "last_seen_at": s.last_seen_at.isoformat() if s.last_seen_at else None,
                "created_at": s.created_at.isoformat() if s.created_at else None,
            }
            for s in active_sessions
        ]

        # Recent demo runs
        runs_query = session.query(DemoRun).filter(DemoRun.user_id == user_id)
        recent_runs = (
            runs_query
            .order_by(DemoRun.created_at.desc())
            .limit(20)
            .all()
        )
        runs_list = [
            {
                "id": run.id,
                "route": run.route,
                "pipeline": run.pipeline,
                "status": run.status,
                "duration_ms": run.duration_ms,
                "created_at": run.created_at.isoformat() if run.created_at else None,
            }
            for run in recent_runs
        ]

        return {
            "user": user_info,
            "organization": org_info,
            "subscription": sub_info,
            "usage": usage_info,
            "sessions": sessions_list,
            "recent_runs": runs_list,
        }
    except HTTPException:
        raise
    except SQLAlchemyError:
        logger.exception("failed to get admin user detail user_id=%s", user_id)
        raise HTTPException(status_code=500, detail="Failed to query user.")
    finally:
        session.close()


# ---------------------------------------------------------------------------
# 3. PATCH /api/admin/users/{user_id}
# ---------------------------------------------------------------------------

class UpdateUserRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    is_active: Optional[bool] = None
    is_admin: Optional[bool] = None


@router.patch("/api/admin/users/{user_id}")
async def admin_update_user(user_id: str, payload: UpdateUserRequest, request: Request) -> dict:
    _require_db()

    # Get the current admin user from the auth context
    auth = request.state.auth_context
    if auth.user_id == user_id and payload.is_admin is False:
        raise HTTPException(
            status_code=400,
            detail="Cannot remove your own admin privileges.",
        )

    session = create_session()
    try:
        user = session.get(User, user_id)
        if user is None:
            raise HTTPException(status_code=404, detail="User not found.")

        if payload.is_active is not None:
            user.is_active = payload.is_active
        if payload.is_admin is not None:
            user.is_admin = payload.is_admin

        session.commit()
        session.refresh(user)

        return {
            "user": {
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "is_active": user.is_active,
                "is_admin": user.is_admin,
                "last_login_at": user.last_login_at.isoformat() if user.last_login_at else None,
                "created_at": user.created_at.isoformat() if user.created_at else None,
            }
        }
    except HTTPException:
        raise
    except SQLAlchemyError:
        session.rollback()
        logger.exception("failed to update user user_id=%s", user_id)
        raise HTTPException(status_code=500, detail="Failed to update user.")
    finally:
        session.close()


# ---------------------------------------------------------------------------
# 4. GET /api/admin/organizations
# ---------------------------------------------------------------------------

@router.get("/api/admin/organizations")
async def admin_list_organizations(
    request: Request,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
) -> dict:
    _require_db()

    period_start, _ = period_bounds_utc()

    session = create_session()
    try:
        total = session.query(func.count(Organization.id)).scalar() or 0

        orgs = (
            session.query(Organization)
            .order_by(Organization.created_at.desc())
            .offset((page - 1) * per_page)
            .limit(per_page)
            .all()
        )

        result = []
        for org in orgs:
            member_count = (
                session.query(func.count(OrganizationMembership.id))
                .filter(OrganizationMembership.organization_id == org.id)
                .scalar()
            ) or 0

            # Plan
            plan_info = None
            sub = (
                session.query(Subscription)
                .filter(
                    Subscription.organization_id == org.id,
                    Subscription.status.in_(("active", "trialing")),
                )
                .one_or_none()
            )
            if sub:
                plan = session.get(Plan, sub.plan_id)
                if plan:
                    plan_info = {"slug": plan.slug, "name": plan.name}

            # Usage
            counter = (
                session.query(UsageCounter)
                .filter(
                    UsageCounter.organization_id == org.id,
                    UsageCounter.period_start == period_start,
                )
                .one_or_none()
            )
            generations_this_month = counter.generation_count if counter else 0

            result.append({
                "id": org.id,
                "tenant_key": org.tenant_key,
                "name": org.name,
                "org_type": org.org_type,
                "is_active": org.is_active,
                "member_count": member_count,
                "plan": plan_info,
                "generations_this_month": generations_this_month,
                "created_at": org.created_at.isoformat() if org.created_at else None,
            })

        return {"organizations": result, "pagination": _pagination(total, page, per_page)}
    except SQLAlchemyError:
        logger.exception("failed to list admin organizations")
        raise HTTPException(status_code=500, detail="Failed to query organizations.")
    finally:
        session.close()


# ---------------------------------------------------------------------------
# 5. GET /api/admin/dashboard/stats
# ---------------------------------------------------------------------------

@router.get("/api/admin/dashboard/stats")
async def admin_dashboard_stats(request: Request) -> dict:
    _require_db()

    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_ago = now - timedelta(days=7)
    period_start, _ = period_bounds_utc()

    session = create_session()
    try:
        # --- Users ---
        total_users = session.query(func.count(User.id)).scalar() or 0

        # Active today: users with at least one generation today
        active_today = (
            session.query(func.count(func.distinct(UsageEvent.user_id)))
            .filter(
                UsageEvent.event_name.in_(_COMPLETED_EVENT_NAMES),
                UsageEvent.created_at >= today_start,
                UsageEvent.user_id.isnot(None),
            )
            .scalar()
        ) or 0

        # New this week
        new_this_week = (
            session.query(func.count(User.id))
            .filter(User.created_at >= week_ago)
            .scalar()
        ) or 0

        # --- Organizations ---
        total_orgs = session.query(func.count(Organization.id)).scalar() or 0
        active_orgs = (
            session.query(func.count(Organization.id))
            .filter(Organization.is_active == True)
            .scalar()
        ) or 0

        # --- Plans ---
        plan_rows = (
            session.query(Plan.slug, func.count(Subscription.id))
            .join(Plan, Subscription.plan_id == Plan.id)
            .filter(Subscription.status.in_(("active", "trialing")))
            .group_by(Plan.slug)
            .all()
        )
        plans_breakdown = {row[0]: row[1] for row in plan_rows}

        # --- Generations ---
        generations_today = (
            session.query(func.count(UsageEvent.id))
            .filter(
                UsageEvent.event_name.in_(_COMPLETED_EVENT_NAMES),
                UsageEvent.created_at >= today_start,
            )
            .scalar()
        ) or 0

        generations_this_week = (
            session.query(func.count(UsageEvent.id))
            .filter(
                UsageEvent.event_name.in_(_COMPLETED_EVENT_NAMES),
                UsageEvent.created_at >= week_ago,
            )
            .scalar()
        ) or 0

        generations_this_month = (
            session.query(func.count(UsageEvent.id))
            .filter(
                UsageEvent.event_name.in_(_COMPLETED_EVENT_NAMES),
                UsageEvent.created_at >= period_start,
            )
            .scalar()
        ) or 0

        # By platform (route)
        platform_rows = (
            session.query(DemoRun.route, func.count(DemoRun.id))
            .filter(
                DemoRun.status == "completed",
                DemoRun.created_at >= period_start,
            )
            .group_by(DemoRun.route)
            .all()
        )
        by_platform = {row[0]: row[1] for row in platform_rows}

        return {
            "users": {
                "total": total_users,
                "active_today": active_today,
                "new_this_week": new_this_week,
            },
            "organizations": {
                "total": total_orgs,
                "active": active_orgs,
            },
            "plans": plans_breakdown,
            "generations": {
                "today": generations_today,
                "this_week": generations_this_week,
                "this_month": generations_this_month,
                "by_platform": by_platform,
            },
        }
    except SQLAlchemyError:
        logger.exception("failed to build admin dashboard stats")
        raise HTTPException(status_code=500, detail="Failed to query dashboard stats.")
    finally:
        session.close()


# ---------------------------------------------------------------------------
# 6. GET /api/admin/plans
# ---------------------------------------------------------------------------

@router.get("/api/admin/plans")
async def admin_list_plans(request: Request) -> dict:
    _require_db()

    session = create_session()
    try:
        plans = session.query(Plan).order_by(Plan.price_cents.asc()).all()

        result = []
        for plan in plans:
            subscriber_count = (
                session.query(func.count(Subscription.id))
                .filter(
                    Subscription.plan_id == plan.id,
                    Subscription.status.in_(("active", "trialing")),
                )
                .scalar()
            ) or 0

            result.append({
                "id": plan.id,
                "slug": plan.slug,
                "name": plan.name,
                "generations_per_month": plan.generations_per_month,
                "price_cents": plan.price_cents,
                "is_active": plan.is_active,
                "subscriber_count": subscriber_count,
            })

        return {"plans": result}
    except SQLAlchemyError:
        logger.exception("failed to list plans")
        raise HTTPException(status_code=500, detail="Failed to query plans.")
    finally:
        session.close()


# ---------------------------------------------------------------------------
# 7. POST /api/admin/subscriptions/assign
# ---------------------------------------------------------------------------

class AssignSubscriptionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    organization_id: str
    plan_slug: str


@router.post("/api/admin/subscriptions/assign")
async def admin_assign_subscription(payload: AssignSubscriptionRequest, request: Request) -> dict:
    _require_db()

    plan = get_plan_by_slug(payload.plan_slug)
    if plan is None:
        raise HTTPException(status_code=404, detail=f"Plan '{payload.plan_slug}' not found.")

    period_start, period_end = period_bounds_utc()

    session = create_session()
    try:
        org = session.get(Organization, payload.organization_id)
        if org is None:
            raise HTTPException(status_code=404, detail="Organization not found.")

        existing = (
            session.query(Subscription)
            .filter(Subscription.organization_id == payload.organization_id)
            .one_or_none()
        )

        if existing is not None:
            existing.plan_id = plan.id
            existing.status = "active"
            existing.current_period_start = period_start
            existing.current_period_end = period_end
            existing.canceled_at = None
            session.commit()
            session.refresh(existing)
            sub = existing
        else:
            sub = Subscription(
                organization_id=payload.organization_id,
                plan_id=plan.id,
                status="active",
                current_period_start=period_start,
                current_period_end=period_end,
            )
            session.add(sub)
            try:
                session.commit()
                session.refresh(sub)
            except IntegrityError:
                session.rollback()
                sub = (
                    session.query(Subscription)
                    .filter(Subscription.organization_id == payload.organization_id)
                    .one()
                )
                sub.plan_id = plan.id
                sub.status = "active"
                sub.current_period_start = period_start
                sub.current_period_end = period_end
                sub.canceled_at = None
                session.commit()
                session.refresh(sub)

        return {
            "status": "ok",
            "subscription": {
                "id": sub.id,
                "organization_id": sub.organization_id,
                "plan_slug": plan.slug,
                "plan_name": plan.name,
                "status": sub.status,
                "current_period_start": sub.current_period_start.isoformat(),
                "current_period_end": sub.current_period_end.isoformat(),
                "generations_per_month": plan.generations_per_month,
            },
        }
    except HTTPException:
        raise
    except SQLAlchemyError:
        session.rollback()
        logger.exception("failed to assign subscription for org=%s", payload.organization_id)
        raise HTTPException(status_code=500, detail="Failed to assign subscription.")
    finally:
        session.close()


# ---------------------------------------------------------------------------
# 8. GET /api/admin/subscriptions
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# GET /api/admin/system/health
# ---------------------------------------------------------------------------

@router.get("/api/admin/system/health")
async def admin_system_health(request: Request) -> dict:
    """Combined system health for the admin dashboard."""

    # Database
    db_status: dict = {"status": "disabled", "database_enabled": False}
    if is_database_enabled():
        try:
            check_database_connection()
            db_status = {"status": "ok", "database_enabled": True}
        except Exception:
            logger.exception("admin health: database check failed")
            db_status = {"status": "degraded", "database_enabled": True}

    # Core library
    diagnostics = get_neoxra_core_diagnostics()
    import_ok = bool(diagnostics.get("import_ok"))
    core_status = {
        "status": "ok" if import_ok else "degraded",
        "import_ok": import_ok,
        "distribution_installed": diagnostics.get("distribution_installed", False),
        "distribution_version": diagnostics.get("distribution_version", "unknown"),
    }

    # Generation metrics
    generation_metrics = get_generation_metrics_snapshot()

    # Guardrails
    guardrails = {
        "rate_limit_backend": get_rate_limit_backend_name(),
        "abuse_monitor": await ABUSE_MONITOR.snapshot(),
    }

    return {
        "database": db_status,
        "core_library": core_status,
        "generation_metrics": generation_metrics,
        "guardrails": guardrails,
    }


@router.get("/api/admin/subscriptions")
async def admin_list_subscriptions(
    request: Request,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    plan: Optional[str] = Query(None),
) -> dict:
    _require_db()

    period_start, _ = period_bounds_utc()

    session = create_session()
    try:
        q = session.query(Subscription)

        if status:
            q = q.filter(Subscription.status == status)
        if plan:
            plan_obj = session.query(Plan).filter(Plan.slug == plan).one_or_none()
            if plan_obj:
                q = q.filter(Subscription.plan_id == plan_obj.id)
            else:
                # No matching plan — return empty
                return {"subscriptions": [], "pagination": _pagination(0, page, per_page)}

        total = q.count()
        subs = (
            q.order_by(Subscription.created_at.desc())
            .offset((page - 1) * per_page)
            .limit(per_page)
            .all()
        )

        result = []
        for sub in subs:
            org = session.get(Organization, sub.organization_id)
            org_info = None
            if org:
                org_info = {"tenant_key": org.tenant_key, "name": org.name}

            plan_row = session.get(Plan, sub.plan_id)
            plan_info = None
            generations_limit = 10
            if plan_row:
                plan_info = {"slug": plan_row.slug, "name": plan_row.name}
                generations_limit = plan_row.generations_per_month

            generations_used = 0
            if org:
                counter = (
                    session.query(UsageCounter)
                    .filter(
                        UsageCounter.organization_id == org.id,
                        UsageCounter.period_start == period_start,
                    )
                    .one_or_none()
                )
                if counter:
                    generations_used = counter.generation_count

            result.append({
                "id": sub.id,
                "organization": org_info,
                "plan": plan_info,
                "status": sub.status,
                "generations_used": generations_used,
                "generations_limit": generations_limit,
                "period_end": sub.current_period_end.isoformat(),
                "created_at": sub.created_at.isoformat() if sub.created_at else None,
            })

        return {"subscriptions": result, "pagination": _pagination(total, page, per_page)}
    except SQLAlchemyError:
        logger.exception("failed to list admin subscriptions")
        raise HTTPException(status_code=500, detail="Failed to query subscriptions.")
    finally:
        session.close()


# ---------------------------------------------------------------------------
# GET /api/admin/activity
# ---------------------------------------------------------------------------

@router.get("/api/admin/activity")
async def admin_activity_log(
    request: Request,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    route: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
) -> dict:
    _require_db()

    session = create_session()
    try:
        q = session.query(DemoRun)

        if route:
            q = q.filter(DemoRun.route == route)
        if status:
            q = q.filter(DemoRun.status == status)

        total = q.count()

        runs = (
            q.order_by(DemoRun.created_at.desc())
            .offset((page - 1) * per_page)
            .limit(per_page)
            .all()
        )

        result = []
        for run in runs:
            user_email: str | None = None
            if run.user_id:
                user = session.get(User, run.user_id)
                if user:
                    user_email = user.email

            org_name: str | None = None
            if run.organization_id:
                org = session.get(Organization, run.organization_id)
                if org:
                    org_name = org.name

            result.append({
                "id": run.id,
                "route": run.route,
                "pipeline": run.pipeline,
                "status": run.status,
                "duration_ms": run.duration_ms,
                "user_id": run.user_id,
                "user_email": user_email,
                "org_name": org_name,
                "created_at": run.created_at.isoformat() if run.created_at else None,
            })

        return {"activities": result, "pagination": _pagination(total, page, per_page)}
    except SQLAlchemyError:
        logger.exception("failed to list admin activity")
        raise HTTPException(status_code=500, detail="Failed to query activity log.")
    finally:
        session.close()
