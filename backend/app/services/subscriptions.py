from __future__ import annotations

import logging
from datetime import datetime, timezone

from sqlalchemy import update
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from ..db import Plan, Subscription, UsageCounter, create_session, is_database_enabled

logger = logging.getLogger(__name__)

_FREE_PLAN_SLUG = "free"
_FREE_GENERATIONS_LIMIT = 10


def _db_disabled() -> bool:
    return not is_database_enabled()


def _period_bounds_utc() -> tuple[datetime, datetime]:
    """Return (start, end) for the current calendar-month billing period in UTC."""
    now = datetime.now(timezone.utc)
    start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if now.month == 12:
        end = start.replace(year=now.year + 1, month=1)
    else:
        end = start.replace(month=now.month + 1)
    return start, end


# ---------------------------------------------------------------------------
# 1. get_plan_by_slug
# ---------------------------------------------------------------------------

def get_plan_by_slug(slug: str) -> Plan | None:
    if _db_disabled():
        return None

    session = create_session()
    try:
        return session.query(Plan).filter(Plan.slug == slug).one_or_none()
    except SQLAlchemyError:
        logger.exception("failed to look up plan by slug=%s", slug)
        return None
    finally:
        session.close()


# ---------------------------------------------------------------------------
# 2. get_active_subscription
# ---------------------------------------------------------------------------

def get_active_subscription(organization_id: str) -> Subscription | None:
    if _db_disabled():
        return None

    session = create_session()
    try:
        return (
            session.query(Subscription)
            .filter(
                Subscription.organization_id == organization_id,
                Subscription.status.in_(("active", "trialing")),
            )
            .one_or_none()
        )
    except SQLAlchemyError:
        logger.exception("failed to look up active subscription for org=%s", organization_id)
        return None
    finally:
        session.close()


# ---------------------------------------------------------------------------
# 3. get_or_create_subscription
# ---------------------------------------------------------------------------

def get_or_create_subscription(
    organization_id: str, plan_slug: str = "free"
) -> Subscription | None:
    if _db_disabled():
        return None

    existing = get_active_subscription(organization_id)
    if existing is not None:
        return existing

    plan = get_plan_by_slug(plan_slug)
    if plan is None:
        logger.error("plan slug=%s not found, cannot create subscription", plan_slug)
        return None

    period_start, period_end = _period_bounds_utc()

    session = create_session()
    try:
        subscription = Subscription(
            organization_id=organization_id,
            plan_id=plan.id,
            status="active",
            current_period_start=period_start,
            current_period_end=period_end,
        )
        session.add(subscription)
        try:
            session.commit()
            session.refresh(subscription)
        except IntegrityError:
            session.rollback()
            subscription = (
                session.query(Subscription)
                .filter(
                    Subscription.organization_id == organization_id,
                    Subscription.status.in_(("active", "trialing")),
                )
                .one_or_none()
            )
        return subscription
    except SQLAlchemyError:
        session.rollback()
        logger.exception("failed to create subscription for org=%s", organization_id)
        return None
    finally:
        session.close()


# ---------------------------------------------------------------------------
# 4. get_usage_counter
# ---------------------------------------------------------------------------

def get_usage_counter(organization_id: str) -> UsageCounter | None:
    if _db_disabled():
        return None

    period_start, period_end = _period_bounds_utc()

    session = create_session()
    try:
        counter = (
            session.query(UsageCounter)
            .filter(
                UsageCounter.organization_id == organization_id,
                UsageCounter.period_start == period_start,
            )
            .one_or_none()
        )
        if counter is not None:
            return counter

        counter = UsageCounter(
            organization_id=organization_id,
            period_start=period_start,
            period_end=period_end,
            generation_count=0,
        )
        session.add(counter)
        try:
            session.commit()
            session.refresh(counter)
        except IntegrityError:
            session.rollback()
            counter = (
                session.query(UsageCounter)
                .filter(
                    UsageCounter.organization_id == organization_id,
                    UsageCounter.period_start == period_start,
                )
                .one()
            )
        return counter
    except SQLAlchemyError:
        session.rollback()
        logger.exception("failed to get/create usage counter for org=%s", organization_id)
        return None
    finally:
        session.close()


# ---------------------------------------------------------------------------
# 5. increment_usage
# ---------------------------------------------------------------------------

def increment_usage(organization_id: str) -> UsageCounter | None:
    if _db_disabled():
        return None

    # Ensure a counter row exists for the current period.
    counter = get_usage_counter(organization_id)
    if counter is None:
        return None

    period_start, _ = _period_bounds_utc()

    session = create_session()
    try:
        session.execute(
            update(UsageCounter)
            .where(
                UsageCounter.organization_id == organization_id,
                UsageCounter.period_start == period_start,
            )
            .values(generation_count=UsageCounter.generation_count + 1)
        )
        session.commit()

        updated = (
            session.query(UsageCounter)
            .filter(
                UsageCounter.organization_id == organization_id,
                UsageCounter.period_start == period_start,
            )
            .one()
        )
        return updated
    except SQLAlchemyError:
        session.rollback()
        logger.exception("failed to increment usage for org=%s", organization_id)
        return None
    finally:
        session.close()


# ---------------------------------------------------------------------------
# 6. get_quota_for_organization
# ---------------------------------------------------------------------------

def get_quota_for_organization(organization_id: str) -> dict:
    period_start, period_end = _period_bounds_utc()

    # Defaults for when DB is down or no subscription exists.
    plan_slug = _FREE_PLAN_SLUG
    generations_limit = _FREE_GENERATIONS_LIMIT
    generations_used = 0

    if not _db_disabled():
        sub = get_active_subscription(organization_id)
        if sub is not None:
            plan = _get_plan_by_id(sub.plan_id)
            if plan is not None:
                plan_slug = plan.slug
                generations_limit = plan.generations_per_month

        counter = get_usage_counter(organization_id)
        if counter is not None:
            generations_used = counter.generation_count

    generations_remaining = max(0, generations_limit - generations_used)

    return {
        "plan_slug": plan_slug,
        "generations_limit": generations_limit,
        "generations_used": generations_used,
        "generations_remaining": generations_remaining,
        "period_start": period_start.isoformat(),
        "period_end": period_end.isoformat(),
    }


# ---------------------------------------------------------------------------
# internal helper
# ---------------------------------------------------------------------------

def _get_plan_by_id(plan_id: str) -> Plan | None:
    """Look up a plan by primary key."""
    if _db_disabled():
        return None

    session = create_session()
    try:
        return session.get(Plan, plan_id)
    except SQLAlchemyError:
        logger.exception("failed to look up plan id=%s", plan_id)
        return None
    finally:
        session.close()
