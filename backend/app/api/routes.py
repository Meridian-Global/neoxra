import json
import os
import logging
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, ConfigDict, ValidationError, field_validator

from ..core.error_handling import generation_error_payload, public_generation_error, validation_error_for_stage
from ..core.localization import DEFAULT_LOCALE, validate_locale
from ..core.logging_utils import format_log_fields, get_request_id
from ..core.neoxra_core_diagnostics import get_neoxra_core_diagnostics
from ..core.output_validation import validate_core_pipeline_event
from ..core.pipeline_observability import PipelineLifecycleTracker
from ..core.request_guards import (
    CORE_ROUTE_KEY,
    enforce_generation_limits,
    get_max_idea_length,
    get_max_voice_profile_length,
)

router = APIRouter()
run_pipeline_stream = None
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


def _get_pipeline_runner():
    if run_pipeline_stream is not None:
        return run_pipeline_stream

    try:
        from ..core.pipeline import run_pipeline_stream as runner
    except Exception as exc:
        diagnostics = get_neoxra_core_diagnostics()
        if not diagnostics.get("import_ok"):
            raise HTTPException(
                status_code=503,
                detail="Core AI package 'neoxra_core' is unavailable. Generation is temporarily unavailable.",
            ) from exc
        raise

    return runner


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

    Events emitted in order:
      planner_started / planner_completed
      instagram_pass1_started / instagram_pass1_completed
      threads_pass1_started / threads_pass1_completed
      linkedin_pass1_started / linkedin_pass1_completed
      instagram_pass2_started / instagram_pass2_completed
      threads_pass2_started / threads_pass2_completed
      linkedin_pass2_started / linkedin_pass2_completed
      critic_started / critic_completed
      pipeline_completed
    """
    _require_anthropic_api_key()
    pipeline_runner = _get_pipeline_runner()
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
                "path": request.url.path,
            }
        ),
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
                    path=request.url.path,
                )
                _log_pipeline_event("pipeline_started", voice_profile=req.voice_profile, locale=req.locale)
                yield sse({"event": "pipeline_started", "data": {"idea": req.idea, "voice_profile": req.voice_profile, "locale": req.locale}})

                # Note: pipeline calls are blocking (Claude API). Fine for single-user demo.
                for event in pipeline_runner(req.idea, req.voice_profile, req.locale):
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
                            tracker.fail(
                                stage=stage_name or event_name,
                                failure_reason="output_validation_failed",
                                error_type=type(exc).__name__,
                                message=safe_message,
                            )
                            yield sse(
                                {
                                    "event": "error",
                                    "data": generation_error_payload(
                                        stage=event_name,
                                        error_code=error_code,
                                        message=safe_message,
                                    ),
                                }
                            )
                            return
                    if event_name.endswith("_completed") and stage_name is not None:
                        tracker.stage_completed(stage_name)
                    _log_pipeline_event(event_name, locale=req.locale)
                    if event_name == "pipeline_completed":
                        completed = True
                        tracker.complete(voice_profile=req.voice_profile)
                        yield sse(event)
                        break
                    if event_name == "error":
                        failed = True
                        error_data = event.get("data", {})
                        stage = error_data.get("stage", "pipeline")
                        error_code, safe_message = public_generation_error(stage)
                        tracker.fail(
                            stage=stage,
                            failure_reason="pipeline_error_event",
                            message=safe_message,
                            error_type=error_code,
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
                    yield sse(event)
            except Exception as exc:
                logger.exception("Core pipeline failed before completion")
                error_code, safe_message = public_generation_error("pipeline")
                tracker.fail(
                    stage="pipeline",
                    failure_reason="pipeline_exception",
                    error_type=type(exc).__name__,
                    message=safe_message,
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
                tracker.fail(
                    stage="pipeline",
                    failure_reason="stream_incomplete",
                    message="Generation could not be completed. Please try again.",
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
