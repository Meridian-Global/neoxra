from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, Query, Request
from sqlalchemy import func, cast, Date
from sqlalchemy.exc import SQLAlchemyError

from ..core.auth import require_authenticated_user
from ..db import UsageEvent, create_session, is_database_enabled
from ..services.subscriptions import (
    get_active_subscription,
    get_plan_by_id,
    get_quota_for_organization,
)
from .access_groups import build_authenticated_marker_router

router = build_authenticated_marker_router()
logger = logging.getLogger(__name__)

_COMPLETED_EVENT_NAMES = ("pipeline_completed", "demo_completed")

# Route path -> platform label mapping for breakdown.
_ROUTE_TO_PLATFORM: dict[str, str] = {
    "/api/instagram/generate": "instagram",
    "/api/run": "core",
    "/api/generate-all": "core",
    "/api/seo/generate": "seo",
    "/api/threads/generate": "threads",
    "/api/facebook/generate": "facebook",
}


@router.get("/api/usage/quota")
async def usage_quota(request: Request) -> dict:
    auth = require_authenticated_user(request)
    org_id = auth.organization_id
    if not org_id:
        raise HTTPException(status_code=400, detail="No organization associated with this user.")

    quota = get_quota_for_organization(org_id)

    plan_info = {"slug": quota["plan_slug"], "name": quota["plan_slug"].title(), "generations_per_month": quota["generations_limit"]}
    sub_status = "none"
    stripe_sub_id = None

    sub = get_active_subscription(org_id)
    if sub is not None:
        sub_status = sub.status
        stripe_sub_id = sub.stripe_subscription_id
        plan = get_plan_by_id(sub.plan_id)
        if plan is not None:
            plan_info["slug"] = plan.slug
            plan_info["name"] = plan.name
            plan_info["generations_per_month"] = plan.generations_per_month

    return {
        "plan": plan_info,
        "usage": {
            "generations_used": quota["generations_used"],
            "generations_remaining": quota["generations_remaining"],
        },
        "period": {
            "start": quota["period_start"],
            "end": quota["period_end"],
        },
        "subscription": {
            "status": sub_status,
            "stripe_subscription_id": stripe_sub_id,
        },
    }


@router.get("/api/usage/history")
async def usage_history(request: Request, days: int = Query(default=30, ge=1, le=90)) -> dict:
    auth = require_authenticated_user(request)
    org_id = auth.organization_id
    if not org_id:
        raise HTTPException(status_code=400, detail="No organization associated with this user.")

    if not is_database_enabled():
        return {"daily": [], "total": 0}

    since = datetime.now(timezone.utc) - timedelta(days=days)
    session = create_session()
    try:
        rows = (
            session.query(
                cast(UsageEvent.created_at, Date).label("date"),
                func.count().label("count"),
            )
            .filter(
                UsageEvent.organization_id == org_id,
                UsageEvent.event_name.in_(_COMPLETED_EVENT_NAMES),
                UsageEvent.created_at >= since,
            )
            .group_by(cast(UsageEvent.created_at, Date))
            .order_by(cast(UsageEvent.created_at, Date).desc())
            .all()
        )
        daily = [{"date": str(row.date), "count": row.count} for row in rows]
        total = sum(row.count for row in rows)
        return {"daily": daily, "total": total}
    except SQLAlchemyError:
        logger.exception("failed to query usage history for org=%s", org_id)
        return {"daily": [], "total": 0}
    finally:
        session.close()


@router.get("/api/usage/breakdown")
async def usage_breakdown(request: Request, days: int = Query(default=30, ge=1, le=90)) -> dict:
    auth = require_authenticated_user(request)
    org_id = auth.organization_id
    if not org_id:
        raise HTTPException(status_code=400, detail="No organization associated with this user.")

    if not is_database_enabled():
        return {"by_platform": {}, "total": 0, "period": {"start": None, "end": None}}

    now = datetime.now(timezone.utc)
    since = now - timedelta(days=days)
    session = create_session()
    try:
        rows = (
            session.query(
                UsageEvent.route,
                func.count().label("count"),
            )
            .filter(
                UsageEvent.organization_id == org_id,
                UsageEvent.event_name.in_(_COMPLETED_EVENT_NAMES),
                UsageEvent.created_at >= since,
            )
            .group_by(UsageEvent.route)
            .all()
        )
        by_platform: dict[str, int] = {}
        total = 0
        for row in rows:
            platform = _ROUTE_TO_PLATFORM.get(row.route, "other")
            by_platform[platform] = by_platform.get(platform, 0) + row.count
            total += row.count
        return {
            "by_platform": by_platform,
            "total": total,
            "period": {
                "start": since.isoformat(),
                "end": now.isoformat(),
            },
        }
    except SQLAlchemyError:
        logger.exception("failed to query usage breakdown for org=%s", org_id)
        return {"by_platform": {}, "total": 0, "period": {"start": None, "end": None}}
    finally:
        session.close()
