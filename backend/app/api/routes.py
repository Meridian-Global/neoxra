import json
import os
import logging
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, ConfigDict, field_validator

from ..core.localization import DEFAULT_LOCALE, validate_locale
from ..core.logging_utils import get_request_id
from ..core.neoxra_core_diagnostics import (
    format_neoxra_core_diagnostics,
    get_neoxra_core_diagnostics,
)
from ..core.output_validation import validate_core_pipeline_event

router = APIRouter()
run_pipeline_stream = None
logger = logging.getLogger(__name__)


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
        "request_id": get_request_id(),
        "event": event_name,
    }
    base_fields.update(fields)
    logger.info(
        "core pipeline event=%s %s",
        event_name,
        " ".join(f"{key}={value}" for key, value in base_fields.items() if key != "event"),
    )


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
                detail=(
                    "Core AI package 'neoxra_core' is unavailable. "
                    f"{format_neoxra_core_diagnostics(diagnostics)}"
                ),
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
    logger.info(
        "core pipeline request accepted idea_length=%s voice_profile=%s locale=%s path=%s",
        len(req.idea),
        req.voice_profile,
        req.locale,
        request.url.path,
    )

    async def stream():
        completed = False
        failed = False
        _log_pipeline_event("pipeline_started", voice_profile=req.voice_profile, locale=req.locale)
        yield sse({"event": "pipeline_started", "data": {"idea": req.idea, "voice_profile": req.voice_profile, "locale": req.locale}})

        try:
            # Note: pipeline calls are blocking (Claude API). Fine for single-user demo.
            for event in pipeline_runner(req.idea, req.voice_profile, req.locale):
                event_name = event.get("event", "unknown")
                if event_name not in {"planner_started", "instagram_pass1_started", "threads_pass1_started", "linkedin_pass1_started", "instagram_pass2_started", "threads_pass2_started", "linkedin_pass2_started", "critic_started", "error"}:
                    event["data"] = validate_core_pipeline_event(event_name, event.get("data", {}))
                _log_pipeline_event(event_name, locale=req.locale)
                if event_name == "pipeline_completed":
                    completed = True
                    yield sse(event)
                    break
                if event_name == "error":
                    failed = True
                    yield sse(event)
                    break
                yield sse(event)
        except Exception as exc:
            logger.exception("Core pipeline failed before completion")
            yield sse({
                "event": "error",
                "data": {
                    "stage": "pipeline",
                    "message": str(exc) or "Pipeline failed before completion.",
                },
            })
            return

        if not completed and not failed:
            logger.error("Core pipeline stream ended without pipeline_completed")
            yield sse({
                "event": "error",
                "data": {
                    "stage": "pipeline",
                    "message": "Pipeline ended before pipeline_completed was emitted.",
                },
            })
        elif failed:
            logger.warning("Core pipeline terminated after emitting error event")
        else:
            logger.info("Core pipeline completed successfully")

    return StreamingResponse(stream(), media_type="text/event-stream")
