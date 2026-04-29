from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, Request
from pydantic import BaseModel, ConfigDict
from sqlalchemy import func, cast, Date
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from ..db import (
    DemoRun,
    Organization,
    OrganizationMembership,
    Plan,
    Subscription,
    UsageCounter,
    UsageEvent,
    User,
    create_session,
    is_database_enabled,
)
from ..services.subscriptions import (
    period_bounds_utc,
    get_plan_by_slug,
)
from .access_groups import build_internal_router

router = build_internal_router()
logger = logging.getLogger(__name__)

_COMPLETED_EVENT_NAMES = ("pipeline_completed", "demo_completed")


def _require_db() -> None:
    if not is_database_enabled():
        raise HTTPException(status_code=503, detail="Database is not configured.")


# ---------------------------------------------------------------------------
# 1. GET /api/internal/usage/overview
# ---------------------------------------------------------------------------

@router.get("/api/internal/usage/overview")
async def internal_usage_overview(request: Request) -> dict:
    _require_db()

    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    period_start, _ = period_bounds_utc()

    session = create_session()
    try:
        total_users = session.query(func.count(User.id)).scalar() or 0
        total_organizations = session.query(func.count(Organization.id)).scalar() or 0

        # Active subscriptions grouped by plan slug.
        active_sub_rows = (
            session.query(Plan.slug, func.count(Subscription.id))
            .join(Plan, Subscription.plan_id == Plan.id)
            .filter(Subscription.status.in_(("active", "trialing")))
            .group_by(Plan.slug)
            .all()
        )
        active_subscriptions = {row[0]: row[1] for row in active_sub_rows}

        generations_today = (
            session.query(func.count(UsageEvent.id))
            .filter(
                UsageEvent.event_name.in_(_COMPLETED_EVENT_NAMES),
                UsageEvent.created_at >= today_start,
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

        # Top 10 users by generation count this month.
        top_rows = (
            session.query(
                User.email,
                Organization.name.label("org_name"),
                Plan.slug.label("plan_slug"),
                func.count(UsageEvent.id).label("gen_count"),
            )
            .join(User, UsageEvent.user_id == User.id)
            .outerjoin(Organization, UsageEvent.organization_id == Organization.id)
            .outerjoin(
                Subscription,
                (Subscription.organization_id == UsageEvent.organization_id)
                & Subscription.status.in_(("active", "trialing")),
            )
            .outerjoin(Plan, Subscription.plan_id == Plan.id)
            .filter(
                UsageEvent.event_name.in_(_COMPLETED_EVENT_NAMES),
                UsageEvent.created_at >= period_start,
                UsageEvent.user_id.isnot(None),
            )
            .group_by(User.email, Organization.name, Plan.slug)
            .order_by(func.count(UsageEvent.id).desc())
            .limit(10)
            .all()
        )
        top_users = [
            {
                "email": row.email,
                "org": row.org_name,
                "plan": row.plan_slug or "free",
                "generations_this_month": row.gen_count,
            }
            for row in top_rows
        ]

        return {
            "total_users": total_users,
            "total_organizations": total_organizations,
            "active_subscriptions": active_subscriptions,
            "generations_today": generations_today,
            "generations_this_month": generations_this_month,
            "top_users": top_users,
        }
    except SQLAlchemyError:
        logger.exception("failed to build internal usage overview")
        raise HTTPException(status_code=500, detail="Failed to query usage overview.")
    finally:
        session.close()


# ---------------------------------------------------------------------------
# 2. GET /api/internal/usage/user/{user_id}
# ---------------------------------------------------------------------------

@router.get("/api/internal/usage/user/{user_id}")
async def internal_usage_user(user_id: str, request: Request) -> dict:
    _require_db()

    period_start, period_end = period_bounds_utc()

    session = create_session()
    try:
        user = session.get(User, user_id)
        if user is None:
            raise HTTPException(status_code=404, detail="User not found.")

        # Find the user's organization via membership.
        membership = (
            session.query(OrganizationMembership)
            .filter(OrganizationMembership.user_id == user_id)
            .first()
        )
        org = None
        org_info: dict = {}
        if membership is not None:
            org = session.get(Organization, membership.organization_id)
        if org is not None:
            org_info = {"tenant_key": org.tenant_key, "name": org.name}

        # Subscription + plan.
        sub_info: dict = {"plan_slug": "free", "status": "none", "period_end": period_end.isoformat()}
        generations_limit = 10
        if org is not None:
            sub = (
                session.query(Subscription)
                .filter(
                    Subscription.organization_id == org.id,
                    Subscription.status.in_(("active", "trialing")),
                )
                .one_or_none()
            )
            if sub is not None:
                plan = session.get(Plan, sub.plan_id)
                sub_info = {
                    "plan_slug": plan.slug if plan else "unknown",
                    "status": sub.status,
                    "period_end": sub.current_period_end.isoformat(),
                }
                if plan is not None:
                    generations_limit = plan.generations_per_month

        # Usage counter for this month.
        generations_this_month = 0
        if org is not None:
            counter = (
                session.query(UsageCounter)
                .filter(
                    UsageCounter.organization_id == org.id,
                    UsageCounter.period_start == period_start,
                )
                .one_or_none()
            )
            if counter is not None:
                generations_this_month = counter.generation_count

        # Recent demo runs.
        runs_query = session.query(DemoRun).filter(DemoRun.user_id == user_id)
        if org is not None:
            runs_query = runs_query.filter(DemoRun.organization_id == org.id)
        recent_runs = (
            runs_query
            .order_by(DemoRun.created_at.desc())
            .limit(20)
            .all()
        )
        recent_generations = [
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
            "user": {
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
            },
            "organization": org_info,
            "subscription": sub_info,
            "usage": {
                "generations_this_month": generations_this_month,
                "generations_limit": generations_limit,
            },
            "recent_generations": recent_generations,
        }
    except HTTPException:
        raise
    except SQLAlchemyError:
        logger.exception("failed to query user usage for user_id=%s", user_id)
        raise HTTPException(status_code=500, detail="Failed to query user usage.")
    finally:
        session.close()


# ---------------------------------------------------------------------------
# 3. POST /api/internal/subscriptions/assign
# ---------------------------------------------------------------------------

class AssignSubscriptionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    organization_id: str
    plan_slug: str


@router.post("/api/internal/subscriptions/assign")
async def internal_assign_subscription(payload: AssignSubscriptionRequest, request: Request) -> dict:
    _require_db()

    plan = get_plan_by_slug(payload.plan_slug)
    if plan is None:
        raise HTTPException(status_code=404, detail=f"Plan '{payload.plan_slug}' not found.")

    period_start, period_end = period_bounds_utc()

    session = create_session()
    try:
        # Verify the organization exists.
        org = session.get(Organization, payload.organization_id)
        if org is None:
            raise HTTPException(status_code=404, detail="Organization not found.")

        # Check for existing subscription (any status).
        existing = (
            session.query(Subscription)
            .filter(Subscription.organization_id == payload.organization_id)
            .one_or_none()
        )

        if existing is not None:
            # Update the existing subscription to the new plan.
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
                # Concurrent creation — fetch and update.
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
