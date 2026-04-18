import json
import os
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from ..core.neoxra_core_diagnostics import (
    format_neoxra_core_diagnostics,
    get_neoxra_core_diagnostics,
)

router = APIRouter()
run_pipeline_stream = None


class RunRequest(BaseModel):
    idea: str
    voice_profile: str = "default"


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
async def run_pipeline(req: RunRequest):
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

    async def stream():
        # Note: pipeline calls are blocking (Claude API). Fine for single-user demo.
        for event in pipeline_runner(req.idea, req.voice_profile):
            yield sse(event)

    return StreamingResponse(stream(), media_type="text/event-stream")
