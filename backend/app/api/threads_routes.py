import json
import logging
import os

from fastapi import HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, ConfigDict, field_validator

from ..core.demo_access import require_demo_access
from ..core.error_handling import generation_error_payload, public_generation_error
from ..core.localization import DEFAULT_LOCALE, validate_locale
from ..core.logging_utils import format_log_fields, get_request_id
from ..core_client import (
    CoreClientNotImplementedError,
    CoreClientUnavailableError,
    get_core_client,
)
from .access_groups import build_gated_demo_router

router = build_gated_demo_router()
logger = logging.getLogger(__name__)


class ThreadsGenerateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    topic: str
    goal: str = "engagement"
    locale: str = DEFAULT_LOCALE

    @field_validator("topic", "goal")
    @classmethod
    def must_not_be_blank(cls, value: str, info) -> str:
        if not value or not value.strip():
            raise ValueError(f"{info.field_name} must not be empty or whitespace-only")
        return value.strip()

    @field_validator("locale")
    @classmethod
    def must_be_supported_locale(cls, value: str) -> str:
        return validate_locale(value)


def _sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


def _get_core_client():
    return get_core_client()


def _require_anthropic_api_key() -> None:
    if os.getenv("ANTHROPIC_API_KEY"):
        return
    raise HTTPException(
        status_code=503,
        detail="ANTHROPIC_API_KEY is not configured for this service.",
    )


def _require_threads_dependencies(core_client=None) -> None:
    if core_client is None:
        core_client = _get_core_client()
    try:
        core_client.ensure_threads_available()
        return
    except (CoreClientUnavailableError, CoreClientNotImplementedError) as exc:
        if core_client.mode == "local":
            raise HTTPException(
                status_code=503,
                detail="Threads generation is temporarily unavailable because the core AI package is not ready.",
            ) from exc
        raise HTTPException(
            status_code=503,
            detail="Threads generation is temporarily unavailable because the selected core adapter is not ready.",
        ) from exc


@router.post("/api/threads/generate")
async def threads_generate(req: ThreadsGenerateRequest, request: Request):
    core_client = _get_core_client()
    _require_threads_dependencies(core_client)
    if core_client.requires_local_api_key:
        _require_anthropic_api_key()
    demo_surface = require_demo_access(
        request,
        default_surface="threads",
        allowed_surfaces={"landing", "instagram", "threads", "legal"},
    )

    logger.info(
        "threads generation request accepted %s",
        format_log_fields(
            {
                "pipeline": "threads",
                "request_id": get_request_id(),
                "topic_length": len(req.topic),
                "goal": req.goal,
                "locale": req.locale,
                "demo_surface": demo_surface,
                "core_client_mode": core_client.mode,
                "path": request.url.path,
            }
        ),
    )

    try:
        generation_request = core_client.build_threads_generation_request(
            topic=req.topic,
            goal=req.goal,
            locale=req.locale,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="Request validation failed.") from exc

    async def stream():
        try:
            yield _sse(
                "phase_started",
                {
                    "phase": "generation",
                    "topic": generation_request.topic,
                    "goal": generation_request.goal,
                    "locale": generation_request.locale,
                },
            )
            thread = core_client.generate_threads_content(
                generation_request=generation_request,
                brief_context={
                    "goal": generation_request.goal,
                    "locale": generation_request.locale,
                    "demo_surface": demo_surface,
                },
            )
            yield _sse("content_ready", thread)
            yield _sse(
                "pipeline_completed",
                {
                    "thread": thread,
                    "topic": generation_request.topic,
                    "goal": generation_request.goal,
                    "locale": generation_request.locale,
                },
            )
        except Exception as exc:
            logger.exception("Threads pipeline failed before completion")
            error_code, safe_message = public_generation_error("threads")
            yield _sse(
                "error",
                generation_error_payload(
                    stage="threads",
                    error_code=error_code,
                    message=safe_message,
                ),
            )
            return

    return StreamingResponse(stream(), media_type="text/event-stream")
