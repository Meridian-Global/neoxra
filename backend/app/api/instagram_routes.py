import json
import logging
import os

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator

from ..core.demo_access import require_demo_access
from ..core.error_handling import generation_error_payload, public_generation_error, validation_error_for_stage
from ..core.localization import (
    DEFAULT_LOCALE,
    append_locale_instruction,
    validate_locale,
)
from ..core.logging_utils import format_log_fields, get_request_id
from ..core.neoxra_core_diagnostics import get_neoxra_core_diagnostics
from ..core.output_validation import (
    validate_instagram_generation_payload,
    validate_scorecard_payload,
    validate_style_analysis_payload,
)
from ..core.pipeline_observability import PipelineLifecycleTracker
from ..core.request_guards import (
    INSTAGRAM_ROUTE_KEY,
    enforce_generation_limits,
    get_max_style_example_length,
    get_max_style_examples,
    get_max_template_text_length,
    get_max_topic_length,
)
from ..core_client import (
    CoreClientNotImplementedError,
    CoreClientUnavailableError,
    get_core_client,
)

VALID_GOALS = ("engagement", "authority", "conversion", "save", "share")

router = APIRouter()
logger = logging.getLogger(__name__)

_PUBLIC_PHASE_BY_STAGE = {
    "style_analysis_started": "analysis",
    "generation_started": "drafting",
    "scoring_started": "review",
}


class InstagramGenerateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    topic: str
    template_text: str
    goal: str = "engagement"
    style_examples: list[str] = Field(default_factory=list)
    locale: str = DEFAULT_LOCALE

    @field_validator("topic", "template_text")
    @classmethod
    def must_not_be_blank(cls, v: str, info) -> str:
        if not v or not v.strip():
            raise ValueError(f"{info.field_name} must not be empty or whitespace-only")
        if info.field_name == "topic" and len(v.strip()) > get_max_topic_length():
            raise ValueError(f"topic must be <= {get_max_topic_length()} characters")
        if info.field_name == "template_text" and len(v.strip()) > get_max_template_text_length():
            raise ValueError(
                f"template_text must be <= {get_max_template_text_length()} characters"
            )
        return v

    @field_validator("goal")
    @classmethod
    def must_be_valid_goal(cls, v: str) -> str:
        if v not in VALID_GOALS:
            raise ValueError(f"goal must be one of {VALID_GOALS}, got '{v}'")
        return v

    @field_validator("locale")
    @classmethod
    def must_be_supported_locale(cls, v: str) -> str:
        return validate_locale(v)

    @field_validator("style_examples")
    @classmethod
    def style_examples_must_be_bounded(cls, v: list[str]) -> list[str]:
        if len(v) > get_max_style_examples():
            raise ValueError(f"style_examples must contain <= {get_max_style_examples()} items")
        for example in v:
            if not isinstance(example, str) or not example.strip():
                raise ValueError("style_examples items must be non-empty strings")
            if len(example.strip()) > get_max_style_example_length():
                raise ValueError(
                    f"style_examples items must be <= {get_max_style_example_length()} characters"
                )
        return v


def _sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


def _log_instagram_event(event_name: str, **fields) -> None:
    base_fields = {
        "pipeline": "instagram",
        "request_id": get_request_id(),
        "event": event_name,
    }
    base_fields.update(fields)
    logger.info("instagram pipeline event %s", format_log_fields(base_fields))


def _require_instagram_dependencies(core_client=None) -> None:
    if core_client is None:
        core_client = _get_core_client()
    try:
        core_client.ensure_instagram_available()
        return
    except (CoreClientUnavailableError, CoreClientNotImplementedError) as exc:
        if core_client.mode == "local":
            raise HTTPException(
                status_code=503,
                detail="Instagram generation is temporarily unavailable because the core AI package is not ready.",
            ) from exc
        raise HTTPException(
            status_code=503,
            detail="Instagram generation is temporarily unavailable because the selected core adapter is not ready.",
        ) from exc


def _get_core_client():
    return get_core_client()


def _public_phase_event(stage_event: str) -> dict[str, object]:
    return {
        "event": "phase_started",
        "data": {"phase": _PUBLIC_PHASE_BY_STAGE[stage_event]},
    }


def _require_anthropic_api_key() -> None:
    if os.getenv("ANTHROPIC_API_KEY"):
        return

    raise HTTPException(
        status_code=503,
        detail="ANTHROPIC_API_KEY is not configured for this service.",
    )


@router.post("/api/instagram/generate")
async def instagram_generate(req: InstagramGenerateRequest, request: Request):
    core_client = _get_core_client()
    _require_instagram_dependencies(core_client)
    if core_client.requires_local_api_key:
        _require_anthropic_api_key()
    demo_surface = require_demo_access(
        request,
        default_surface="instagram",
        allowed_surfaces={"instagram", "legal"},
    )
    logger.info(
        "instagram generation request accepted %s",
        format_log_fields(
            {
                "pipeline": "instagram",
                "request_id": get_request_id(),
                "topic_length": len(req.topic),
                "goal": req.goal,
                "locale": req.locale,
                "core_client_mode": core_client.mode,
                "demo_surface": demo_surface,
                "runtime_mode": getattr(request.state, "runtime_mode", "unknown"),
                "style_examples": len(req.style_examples),
                "path": request.url.path,
            }
        ),
    )

    try:
        generation_request = core_client.build_instagram_generation_request(
            topic=req.topic,
            template_text=req.template_text,
            style_examples=req.style_examples,
            goal=req.goal,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail="Request validation failed.",
        ) from exc

    concurrency_lease = await enforce_generation_limits(request, INSTAGRAM_ROUTE_KEY)

    async def stream():
        completed = False
        tracker = PipelineLifecycleTracker(logger=logger, pipeline_name="instagram", locale=req.locale)

        try:
            try:
                localized_template_text = append_locale_instruction(
                    generation_request.template_text,
                    req.locale,
                )

                tracker.log_start(
                    goal=generation_request.goal,
                    topic_length=len(generation_request.topic),
                    style_examples=len(generation_request.style_examples),
                    demo_surface=demo_surface,
                    path=request.url.path,
                )
                _log_instagram_event(
                    "pipeline_started",
                    goal=generation_request.goal,
                    locale=req.locale,
                    demo_surface=demo_surface,
                )
                yield _sse(
                    "pipeline_started",
                    {
                        "topic": generation_request.topic,
                        "goal": generation_request.goal,
                        "locale": req.locale,
                        "demo_surface": demo_surface,
                    },
                )

                # Step 1: Style analysis
                tracker.stage_started("style_analysis")
                _log_instagram_event("style_analysis_started", locale=req.locale, demo_surface=demo_surface)
                yield _sse(**_public_phase_event("style_analysis_started"))
                try:
                    style_data = validate_style_analysis_payload(
                        core_client.analyze_instagram_style(
                            template_text=generation_request.template_text,
                            style_examples=generation_request.style_examples,
                        )
                    )
                except ValidationError:
                    logger.exception("Instagram flow failed during style analysis")
                    error_code, safe_message = validation_error_for_stage("style_analysis")
                    tracker.fail(
                        stage="style_analysis",
                        failure_reason="output_validation_failed",
                        error_type="ValidationError",
                        message=safe_message,
                    )
                    yield _sse(
                        "error",
                        generation_error_payload(
                            stage="style_analysis",
                            error_code=error_code,
                            message=safe_message,
                        ),
                    )
                    return
                except Exception as exc:
                    logger.exception("Instagram flow failed during style analysis")
                    error_code, safe_message = public_generation_error("style_analysis")
                    tracker.fail(
                        stage="style_analysis",
                        failure_reason="stage_exception",
                        error_type=type(exc).__name__,
                        message=safe_message,
                    )
                    yield _sse(
                        "error",
                        generation_error_payload(
                            stage="style_analysis",
                            error_code=error_code,
                            message=safe_message,
                        ),
                    )
                    return
                tracker.stage_completed("style_analysis")
                _log_instagram_event("style_analysis_completed", locale=req.locale, demo_surface=demo_surface)
                yield _sse("style_ready", style_data)

                # Step 2: Content generation
                tracker.stage_started("generation")
                _log_instagram_event("generation_started", locale=req.locale, demo_surface=demo_surface)
                yield _sse(**_public_phase_event("generation_started"))
                try:
                    gen_meta = validate_instagram_generation_payload(
                        core_client.generate_instagram_content(
                            generation_request=generation_request,
                            localized_template_text=localized_template_text,
                            style_analysis=style_data,
                            locale=req.locale,
                        )
                    )
                except ValidationError:
                    logger.exception("Instagram flow failed during generation")
                    error_code, safe_message = validation_error_for_stage("generation")
                    tracker.fail(
                        stage="generation",
                        failure_reason="output_validation_failed",
                        error_type="ValidationError",
                        message=safe_message,
                    )
                    yield _sse(
                        "error",
                        generation_error_payload(
                            stage="generation",
                            error_code=error_code,
                            message=safe_message,
                        ),
                    )
                    return
                except Exception as exc:
                    logger.exception("Instagram flow failed during generation")
                    error_code, safe_message = public_generation_error("generation")
                    tracker.fail(
                        stage="generation",
                        failure_reason="stage_exception",
                        error_type=type(exc).__name__,
                        message=safe_message,
                    )
                    yield _sse(
                        "error",
                        generation_error_payload(
                            stage="generation",
                            error_code=error_code,
                            message=safe_message,
                        ),
                    )
                    return
                tracker.stage_completed("generation")
                _log_instagram_event("generation_completed", locale=req.locale, demo_surface=demo_surface)
                yield _sse("content_ready", gen_meta)

                # Step 3: Scoring
                tracker.stage_started("scoring")
                _log_instagram_event("scoring_started", locale=req.locale, demo_surface=demo_surface)
                yield _sse(**_public_phase_event("scoring_started"))
                try:
                    score_data, critique = core_client.score_instagram_content(
                        content=gen_meta,
                        goal=generation_request.goal,
                    )
                    score_data = validate_scorecard_payload(score_data)
                except ValidationError:
                    logger.exception("Instagram flow failed during scoring")
                    error_code, safe_message = validation_error_for_stage("scoring")
                    tracker.fail(
                        stage="scoring",
                        failure_reason="output_validation_failed",
                        error_type="ValidationError",
                        message=safe_message,
                    )
                    yield _sse(
                        "error",
                        generation_error_payload(
                            stage="scoring",
                            error_code=error_code,
                            message=safe_message,
                        ),
                    )
                    return
                except Exception as exc:
                    logger.exception("Instagram flow failed during scoring")
                    error_code, safe_message = public_generation_error("scoring")
                    tracker.fail(
                        stage="scoring",
                        failure_reason="stage_exception",
                        error_type=type(exc).__name__,
                        message=safe_message,
                    )
                    yield _sse(
                        "error",
                        generation_error_payload(
                            stage="scoring",
                            error_code=error_code,
                            message=safe_message,
                        ),
                    )
                    return
                tracker.stage_completed("scoring")
                _log_instagram_event("scoring_completed", locale=req.locale, demo_surface=demo_surface)
                yield _sse("score_ready", score_data)

                # Final result
                average = round(
                    sum(
                        score_data[key]
                        for key in (
                            "hook_strength",
                            "cta_clarity",
                            "hashtag_relevance",
                            "platform_fit",
                            "tone_match",
                            "originality",
                        )
                    ) / 6,
                    2,
                )
                result_dict = {
                    "content": gen_meta,
                    "scorecard": {**score_data, "average": average},
                    "critique": critique,
                    "style_analysis": style_data,
                }
                completed = True
                tracker.complete(goal=generation_request.goal)
                _log_instagram_event("pipeline_completed", locale=req.locale, demo_surface=demo_surface)
                yield _sse("pipeline_completed", result_dict)
            except Exception as exc:
                logger.exception("Instagram flow failed before completion")
                error_code, safe_message = public_generation_error("pipeline")
                tracker.fail(
                    stage="pipeline",
                    failure_reason="pipeline_exception",
                    error_type=type(exc).__name__,
                    message=safe_message,
                )
                yield _sse(
                    "error",
                    generation_error_payload(
                        stage="pipeline",
                        error_code=error_code,
                        message=safe_message,
                    ),
                )
                return

            if not completed:
                logger.error("Instagram pipeline stream ended without pipeline_completed")
                tracker.fail(
                    stage="pipeline",
                    failure_reason="stream_incomplete",
                    message="Generation could not be completed. Please try again.",
                )
                yield _sse(
                    "error",
                    generation_error_payload(
                        stage="pipeline",
                        error_code="PIPELINE_INCOMPLETE",
                        message="Generation could not be completed. Please try again.",
                    ),
                )
            else:
                logger.info("Instagram pipeline completed successfully")
        finally:
            await concurrency_lease.release()

    return StreamingResponse(stream(), media_type="text/event-stream")
