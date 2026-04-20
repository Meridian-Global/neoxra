from __future__ import annotations

from fastapi import Request
from pydantic import BaseModel, ConfigDict, Field, field_validator

from ..core.growth_context import get_session_id, get_visitor_id
from ..core.request_guards import ANALYTICS_ROUTE_KEY, enforce_generation_limits
from ..services import record_usage_event
from .access_groups import build_public_router

router = build_public_router()

SUPPORTED_ANALYTICS_EVENTS = {
    "page_view",
    "demo_viewed",
    "demo_abandoned",
    "demo_access_unlocked",
    "demo_started",
    "demo_completed",
    "demo_failed",
}

_SURFACE_MAX_LENGTH = 64
_SOURCE_MAX_LENGTH = 64
_LOCALE_MAX_LENGTH = 16


def _trim_to(value: str | None, max_length: int) -> str | None:
    """Strip and cap a nullable string field to match DB column constraints."""
    if value is None:
        return None
    cleaned = value.strip()
    if not cleaned:
        return None
    if len(cleaned) > max_length:
        raise ValueError(f"value must not exceed {max_length} characters")
    return cleaned


class AnalyticsEventRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    event_name: str
    route: str
    surface: str | None = None
    source: str | None = None
    locale: str | None = None
    metadata: dict = Field(default_factory=dict)

    @field_validator("event_name")
    @classmethod
    def event_name_must_be_supported(cls, value: str) -> str:
        if value not in SUPPORTED_ANALYTICS_EVENTS:
            raise ValueError("event_name must be a supported analytics event")
        return value

    @field_validator("route")
    @classmethod
    def route_must_not_be_blank(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("route must not be blank")
        return cleaned[:128]

    @field_validator("surface")
    @classmethod
    def surface_max_length(cls, value: str | None) -> str | None:
        return _trim_to(value, _SURFACE_MAX_LENGTH)

    @field_validator("source")
    @classmethod
    def source_max_length(cls, value: str | None) -> str | None:
        return _trim_to(value, _SOURCE_MAX_LENGTH)

    @field_validator("locale")
    @classmethod
    def locale_max_length(cls, value: str | None) -> str | None:
        return _trim_to(value, _LOCALE_MAX_LENGTH)


@router.post("/api/analytics/events")
async def capture_analytics_event(request: Request, payload: AnalyticsEventRequest) -> dict[str, str]:
    lease = await enforce_generation_limits(request, ANALYTICS_ROUTE_KEY)
    try:
        metadata = dict(payload.metadata or {})
        visitor_id = get_visitor_id(request) or metadata.pop("visitor_id", None)
        session_id = get_session_id(request) or metadata.pop("session_id", None)
        auth = getattr(request.state, "auth", None)
        record_usage_event(
            route=payload.route,
            pipeline="frontend",
            event_name=payload.event_name,
            organization_id=getattr(auth, "organization_id", None),
            user_id=getattr(auth, "user_id", None),
            status="tracked",
            locale=payload.locale,
            surface=payload.surface,
            source=payload.source,
            visitor_id=visitor_id,
            session_id=session_id,
            metadata=metadata,
        )
    finally:
        await lease.release()
    return {"status": "ok"}
