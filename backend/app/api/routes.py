import json
import os
import logging
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, ConfigDict, ValidationError, field_validator

from ..core.error_handling import generation_error_payload, public_generation_error, validation_error_for_stage
from ..core.demo_access import require_demo_access
from ..core.growth_context import get_demo_source, get_session_id, get_visitor_id
from ..core.localization import DEFAULT_LOCALE, validate_locale
from ..core.logging_utils import format_log_fields, get_request_id
from ..core_client import (
    CoreClientNotImplementedError,
    CoreClientUnavailableError,
    get_core_client,
)
from ..core.output_validation import validate_core_pipeline_event
from ..core.pipeline_observability import PipelineLifecycleTracker
from ..core.request_guards import (
    CORE_ROUTE_KEY,
    enforce_generation_limits,
    get_max_idea_length,
    get_max_voice_profile_length,
)
from ..services import create_demo_run, mark_demo_run_completed, record_usage_event

router = APIRouter()
logger = logging.getLogger(__name__)

# Events that carry no validatable payload – skip output validation for these.
_PIPELINE_NON_PAYLOAD_EVENTS = frozenset({
    "planner_started",
    "instagram_pass1_started",
    "threads_pass1_started",
    "linkedin_pass1_started",
    "instagram_pass2_started",
    "threads_pass2_started",
    "linkedin_pass2_started",
    "critic_started",
    "error",
})

_PUBLIC_PHASE_BY_INTERNAL_EVENT = {
    "planner_started": {"phase": "briefing"},
    "instagram_pass1_started": {"phase": "drafting", "platform": "instagram"},
    "threads_pass1_started": {"phase": "drafting", "platform": "threads"},
    "linkedin_pass1_started": {"phase": "drafting", "platform": "linkedin"},
    "instagram_pass2_started": {"phase": "refining", "platform": "instagram"},
    "threads_pass2_started": {"phase": "refining", "platform": "threads"},
    "linkedin_pass2_started": {"phase": "refining", "platform": "linkedin"},
    "critic_started": {"phase": "review"},
}


class RunRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    idea: str
    voice_profile: str = "default"
    locale: str = DEFAULT_LOCALE

    @field_validator("idea")
    @classmethod
    def must_not_be_blank(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("idea must not be empty or whitespace-only")
        if len(value.strip()) > get_max_idea_length():
            raise ValueError(f"idea must be <= {get_max_idea_length()} characters")
        return value

    @field_validator("voice_profile")
    @classmethod
    def voice_profile_must_be_reasonable_length(cls, value: str) -> str:
        if len(value) > get_max_voice_profile_length():
            raise ValueError(
                f"voice_profile must be <= {get_max_voice_profile_length()} characters"
            )
        return value

    @field_validator("locale")
    @classmethod
    def must_be_supported_locale(cls, value: str) -> str:
        return validate_locale(value)


def sse(event: dict) -> str:
    """
    Format a dict as a properly structured Server-Sent Event message.

    SSE spec requires each field on its own line, terminated by a blank line:
      event: <event_name>
      data: <json_payload>
      <blank line>
    """
    name = event["event"]
    payload = json.dumps(event["data"])
    return f"event: {name}\ndata: {payload}\n\n"


def _log_pipeline_event(event_name: str, **fields) -> None:
    base_fields = {
        "pipeline": "core",
        "request_id": get_request_id(),
        "event": event_name,
    }
    base_fields.update(fields)
    logger.info("core pipeline event %s", format_log_fields(base_fields))


def _stage_name_from_event(event_name: str) -> str | None:
    if event_name in {"pipeline_started", "pipeline_completed"}:
        return None
    if event_name.endswith("_started"):
        return event_name.removesuffix("_started")
    if event_name.endswith("_completed"):
        return event_name.removesuffix("_completed")
    return None


def _get_core_client():
    return get_core_client()


def _translate_public_event(event_name: str, data: dict) -> dict | None:
    phase = _PUBLIC_PHASE_BY_INTERNAL_EVENT.get(event_name)
    if phase is not None:
        return {
            "event": "phase_started",
            "data": phase,
        }

    if event_name == "planner_completed":
        return {"event": "brief_ready", "data": data}

    if event_name in {
        "instagram_pass1_completed",
        "threads_pass1_completed",
        "linkedin_pass1_completed",
        "instagram_pass2_completed",
        "threads_pass2_completed",
        "linkedin_pass2_completed",
    }:
        platform = event_name.split("_", 1)[0]
        status = "drafted" if "pass1" in event_name else "refined"
        return {
            "event": "platform_output",
            "data": {
                "platform": platform,
                "status": status,
                "content": data.get("output", ""),
            },
        }

    if event_name == "critic_completed":
        return {
            "event": "review_ready",
            "data": {
                "notes": data.get("notes", ""),
            },
        }

    if event_name == "pipeline_completed":
        return {"event": "pipeline_completed", "data": data}

    if event_name == "error":
        return {"event": "error", "data": data}

    return None


def _require_anthropic_api_key() -> None:
    if os.getenv("ANTHROPIC_API_KEY"):
        return

    raise HTTPException(
        status_code=503,
        detail="ANTHROPIC_API_KEY is not configured for this service.",
    )


@router.post("/api/run")
async def run_pipeline(req: RunRequest, request: Request):
    """
    Stream pipeline execution as Server-Sent Events.

    Each event has shape: {"event": "<name>", "data": {...}}

    Public events emitted in order:
      pipeline_started
      phase_started
      brief_ready
      platform_output
      review_ready
      pipeline_completed
    """
    demo_surface = require_demo_access(
        request,
        default_surface="landing",
        allowed_surfaces={"landing"},
    )
    demo_source = get_demo_source(request, demo_surface)
    visitor_id = get_visitor_id(request)
    session_id = get_session_id(request)
    core_client = _get_core_client()
    if core_client.requires_local_api_key:
        _require_anthropic_api_key()
    try:
        core_client.ensure_pipeline_available()
    except (CoreClientUnavailableError, CoreClientNotImplementedError) as exc:
        if core_client.mode == "local":
            raise HTTPException(
                status_code=503,
                detail="Core AI package 'neoxra_core' is unavailable. Generation is temporarily unavailable.",
            ) from exc
        raise HTTPException(
            status_code=503,
            detail="Core generation service is temporarily unavailable.",
        ) from exc
    concurrency_lease = await enforce_generation_limits(request, CORE_ROUTE_KEY)
    logger.info(
        "core pipeline request accepted %s",
        format_log_fields(
            {
                "pipeline": "core",
                "request_id": get_request_id(),
                "idea_length": len(req.idea),
                "voice_profile": req.voice_profile,
                "locale": req.locale,
                "core_client_mode": core_client.mode,
                "demo_surface": demo_surface,
                "demo_source": demo_source,
                "runtime_mode": getattr(request.state, "runtime_mode", "unknown"),
                "path": request.url.path,
            }
        ),
    )
    demo_run_handle = create_demo_run(
        route=request.url.path,
        pipeline="core",
        surface=demo_surface,
        source=demo_source,
        visitor_id=visitor_id,
        session_id=session_id,
        locale=req.locale,
        core_client_mode=core_client.mode,
        input_summary={
            "idea_length": len(req.idea),
            "voice_profile": req.voice_profile,
        },
    )
    record_usage_event(
        route=request.url.path,
        pipeline="core",
        event_name="request_accepted",
        status="accepted",
        locale=req.locale,
        surface=demo_surface,
        source=demo_source,
        visitor_id=visitor_id,
        session_id=session_id,
        metadata={
            "idea_length": len(req.idea),
            "voice_profile": req.voice_profile,
            "core_client_mode": core_client.mode,
        },
        demo_run_handle=demo_run_handle,
    )

    async def stream():
        completed = False
        failed = False
        tracker = PipelineLifecycleTracker(logger=logger, pipeline_name="core", locale=req.locale)
        try:
            try:
                tracker.log_start(
                    voice_profile=req.voice_profile,
                    idea_length=len(req.idea),
                    demo_surface=demo_surface,
                    path=request.url.path,
                )
                _log_pipeline_event(
                    "pipeline_started",
                    voice_profile=req.voice_profile,
                    locale=req.locale,
                    demo_surface=demo_surface,
                )
                yield sse(
                    {
                        "event": "pipeline_started",
                        "data": {
                            "idea": req.idea,
                            "voice_profile": req.voice_profile,
                            "locale": req.locale,
                            "demo_surface": demo_surface,
                        },
                    }
                )
                record_usage_event(
                    route=request.url.path,
                    pipeline="core",
                    event_name="pipeline_started",
                    status="started",
                    locale=req.locale,
                    surface=demo_surface,
                    source=demo_source,
                    visitor_id=visitor_id,
                    session_id=session_id,
                    metadata={"voice_profile": req.voice_profile},
                    demo_run_handle=demo_run_handle,
                )
                record_usage_event(
                    route=request.url.path,
                    pipeline="core",
                    event_name="demo_started",
                    status="started",
                    locale=req.locale,
                    surface=demo_surface,
                    source=demo_source,
                    visitor_id=visitor_id,
                    session_id=session_id,
                    metadata={"voice_profile": req.voice_profile},
                    demo_run_handle=demo_run_handle,
                )

                # Note: pipeline calls are blocking (Claude API). Fine for single-user demo.
                for event in core_client.stream_core_pipeline(req.idea, req.voice_profile, req.locale):
                    event_name = event.get("event", "unknown")
                    stage_name = _stage_name_from_event(event_name)
                    if event_name.endswith("_started") and stage_name is not None:
                        tracker.stage_started(stage_name)
                    if event_name not in _PIPELINE_NON_PAYLOAD_EVENTS:
                        try:
                            event["data"] = validate_core_pipeline_event(event_name, event.get("data", {}))
                        except (ValidationError, ValueError) as exc:
                            logger.exception("Core pipeline output validation failed event=%s", event_name)
                            error_code, safe_message = validation_error_for_stage(stage_name or "pipeline")
                            duration_ms = tracker.fail(
                                stage=stage_name or event_name,
                                failure_reason="output_validation_failed",
                                error_type=type(exc).__name__,
                                message=safe_message,
                            )
                            mark_demo_run_completed(
                                demo_run_handle,
                                status="failed",
                                duration_ms=duration_ms,
                                failure_reason="output_validation_failed",
                                error_code=error_code,
                            )
                            record_usage_event(
                                route=request.url.path,
                                pipeline="core",
                                event_name="validation_failed",
                                status="failed",
                                locale=req.locale,
                                surface=demo_surface,
                                source=demo_source,
                                visitor_id=visitor_id,
                                session_id=session_id,
                                error_code=error_code,
                                error_stage=stage_name or "pipeline",
                                metadata={"internal_event": event_name},
                                demo_run_handle=demo_run_handle,
                            )
                            record_usage_event(
                                route=request.url.path,
                                pipeline="core",
                                event_name="demo_failed",
                                status="failed",
                                locale=req.locale,
                                surface=demo_surface,
                                source=demo_source,
                                visitor_id=visitor_id,
                                session_id=session_id,
                                error_code=error_code,
                                error_stage=stage_name or "pipeline",
                                metadata={"failure_reason": "output_validation_failed"},
                                demo_run_handle=demo_run_handle,
                            )
                            yield sse(
                                {
                                    "event": "error",
                                    "data": generation_error_payload(
                                        stage=stage_name or "pipeline",
                                        error_code=error_code,
                                        message=safe_message,
                                    ),
                                }
                            )
                            return
                    if event_name.endswith("_completed") and stage_name is not None:
                        tracker.stage_completed(stage_name)
                    _log_pipeline_event(event_name, locale=req.locale, demo_surface=demo_surface)
                    if event_name == "pipeline_completed":
                        completed = True
                        duration_ms = tracker.complete(voice_profile=req.voice_profile)
                        mark_demo_run_completed(
                            demo_run_handle,
                            status="completed",
                            duration_ms=duration_ms,
                        )
                        record_usage_event(
                            route=request.url.path,
                            pipeline="core",
                            event_name="pipeline_completed",
                            status="success",
                            locale=req.locale,
                            surface=demo_surface,
                            source=demo_source,
                            visitor_id=visitor_id,
                            session_id=session_id,
                            metadata={"voice_profile": req.voice_profile},
                            demo_run_handle=demo_run_handle,
                        )
                        record_usage_event(
                            route=request.url.path,
                            pipeline="core",
                            event_name="demo_completed",
                            status="success",
                            locale=req.locale,
                            surface=demo_surface,
                            source=demo_source,
                            visitor_id=visitor_id,
                            session_id=session_id,
                            metadata={"voice_profile": req.voice_profile},
                            demo_run_handle=demo_run_handle,
                        )
                        public_event = _translate_public_event(event_name, event.get("data", {}))
                        if public_event is not None:
                            yield sse(public_event)
                        break
                    if event_name == "error":
                        failed = True
                        error_data = event.get("data", {})
                        stage = error_data.get("stage", "pipeline")
                        error_code, safe_message = public_generation_error(stage)
                        duration_ms = tracker.fail(
                            stage=stage,
                            failure_reason="pipeline_error_event",
                            message=safe_message,
                            error_type=error_code,
                        )
                        mark_demo_run_completed(
                            demo_run_handle,
                            status="failed",
                            duration_ms=duration_ms,
                            failure_reason="pipeline_error_event",
                            error_code=error_code,
                        )
                        record_usage_event(
                            route=request.url.path,
                            pipeline="core",
                            event_name="pipeline_error",
                            status="failed",
                            locale=req.locale,
                            surface=demo_surface,
                            source=demo_source,
                            visitor_id=visitor_id,
                            session_id=session_id,
                            error_code=error_code,
                            error_stage=stage,
                            metadata={"internal_event": event_name},
                            demo_run_handle=demo_run_handle,
                        )
                        record_usage_event(
                            route=request.url.path,
                            pipeline="core",
                            event_name="demo_failed",
                            status="failed",
                            locale=req.locale,
                            surface=demo_surface,
                            source=demo_source,
                            visitor_id=visitor_id,
                            session_id=session_id,
                            error_code=error_code,
                            error_stage=stage,
                            metadata={"failure_reason": "pipeline_error_event"},
                            demo_run_handle=demo_run_handle,
                        )
                        yield sse(
                            {
                                "event": "error",
                                "data": generation_error_payload(
                                    stage=stage,
                                    error_code=error_code,
                                    message=safe_message,
                                ),
                            }
                        )
                        break
                    public_event = _translate_public_event(event_name, event.get("data", {}))
                    if public_event is not None:
                        yield sse(public_event)
            except Exception as exc:
                logger.exception("Core pipeline failed before completion")
                error_code, safe_message = public_generation_error("pipeline")
                duration_ms = tracker.fail(
                    stage="pipeline",
                    failure_reason="pipeline_exception",
                    error_type=type(exc).__name__,
                    message=safe_message,
                )
                mark_demo_run_completed(
                    demo_run_handle,
                    status="failed",
                    duration_ms=duration_ms,
                    failure_reason="pipeline_exception",
                    error_code=error_code,
                )
                record_usage_event(
                    route=request.url.path,
                    pipeline="core",
                    event_name="pipeline_exception",
                    status="failed",
                    locale=req.locale,
                    surface=demo_surface,
                    source=demo_source,
                    visitor_id=visitor_id,
                    session_id=session_id,
                    error_code=error_code,
                    error_stage="pipeline",
                    metadata={"exception_type": type(exc).__name__},
                    demo_run_handle=demo_run_handle,
                )
                record_usage_event(
                    route=request.url.path,
                    pipeline="core",
                    event_name="demo_failed",
                    status="failed",
                    locale=req.locale,
                    surface=demo_surface,
                    source=demo_source,
                    visitor_id=visitor_id,
                    session_id=session_id,
                    error_code=error_code,
                    error_stage="pipeline",
                    metadata={"failure_reason": "pipeline_exception"},
                    demo_run_handle=demo_run_handle,
                )
                yield sse(
                    {
                        "event": "error",
                        "data": generation_error_payload(
                            stage="pipeline",
                            error_code=error_code,
                            message=safe_message,
                        ),
                    }
                )
                return

            if not completed and not failed:
                logger.error("Core pipeline stream ended without pipeline_completed")
                duration_ms = tracker.fail(
                    stage="pipeline",
                    failure_reason="stream_incomplete",
                    message="Generation could not be completed. Please try again.",
                )
                mark_demo_run_completed(
                    demo_run_handle,
                    status="failed",
                    duration_ms=duration_ms,
                    failure_reason="stream_incomplete",
                    error_code="PIPELINE_INCOMPLETE",
                )
                record_usage_event(
                    route=request.url.path,
                    pipeline="core",
                    event_name="pipeline_incomplete",
                    status="failed",
                    locale=req.locale,
                    surface=demo_surface,
                    source=demo_source,
                    visitor_id=visitor_id,
                    session_id=session_id,
                    error_code="PIPELINE_INCOMPLETE",
                    error_stage="pipeline",
                    demo_run_handle=demo_run_handle,
                )
                record_usage_event(
                    route=request.url.path,
                    pipeline="core",
                    event_name="demo_failed",
                    status="failed",
                    locale=req.locale,
                    surface=demo_surface,
                    source=demo_source,
                    visitor_id=visitor_id,
                    session_id=session_id,
                    error_code="PIPELINE_INCOMPLETE",
                    error_stage="pipeline",
                    metadata={"failure_reason": "stream_incomplete"},
                    demo_run_handle=demo_run_handle,
                )
                yield sse(
                    {
                        "event": "error",
                        "data": generation_error_payload(
                            stage="pipeline",
                            error_code="PIPELINE_INCOMPLETE",
                            message="Generation could not be completed. Please try again.",
                        ),
                    }
                )
            elif failed:
                logger.warning("Core pipeline terminated after emitting error event")
            else:
                logger.info("Core pipeline completed successfully")
        finally:
            await concurrency_lease.release()

    return StreamingResponse(stream(), media_type="text/event-stream")
