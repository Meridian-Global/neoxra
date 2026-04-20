from __future__ import annotations

from fastapi import APIRouter, Request
from pydantic import BaseModel, ConfigDict, field_validator

from ..core.growth_context import get_session_id, get_visitor_id
from ..services import record_usage_event

router = APIRouter()

SUPPORTED_ANALYTICS_EVENTS = {
    "page_view",
    "demo_viewed",
    "demo_abandoned",
    "demo_access_unlocked",
}


class AnalyticsEventRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    event_name: str
    route: str
    pipeline: str = "frontend"
    surface: str | None = None
    source: str | None = None
    locale: str | None = None
    metadata: dict = {}

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


@router.post("/api/analytics/events")
async def capture_analytics_event(request: Request, payload: AnalyticsEventRequest) -> dict[str, str]:
    metadata = dict(payload.metadata or {})
    visitor_id = get_visitor_id(request) or metadata.pop("visitor_id", None)
    session_id = get_session_id(request) or metadata.pop("session_id", None)
    record_usage_event(
        route=payload.route,
        pipeline=payload.pipeline,
        event_name=payload.event_name,
        status="tracked",
        locale=payload.locale,
        surface=payload.surface,
        source=payload.source,
        visitor_id=visitor_id,
        session_id=session_id,
        metadata=metadata,
    )
    return {"status": "ok"}
