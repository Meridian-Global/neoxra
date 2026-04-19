import json
import logging
import os
from dataclasses import asdict

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator

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

VALID_GOALS = ("engagement", "authority", "conversion", "save", "share")
_INSTAGRAM_IMPORT_ERROR = None
try:
    from neoxra_core.models.instagram import (
        VALID_GOALS as CORE_VALID_GOALS,
        CarouselSlide,
        GenerationRequest,
        InstagramContent,
        InstagramResult,
        Scorecard,
        StyleAnalysis,
    )
    from neoxra_core.skills.base import SkillInput
    from neoxra_core.skills.content_scoring import ContentScoringSkill
    from neoxra_core.skills.instagram_generation import InstagramGenerationSkill
    from neoxra_core.skills.style_analysis import StyleAnalysisSkill

    VALID_GOALS = CORE_VALID_GOALS
except Exception as exc:
    CarouselSlide = None
    GenerationRequest = None
    InstagramContent = None
    InstagramResult = None
    Scorecard = None
    StyleAnalysis = None
    SkillInput = None
    ContentScoringSkill = None
    InstagramGenerationSkill = None
    StyleAnalysisSkill = None
    _INSTAGRAM_IMPORT_ERROR = exc

router = APIRouter()
logger = logging.getLogger(__name__)


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


def _require_instagram_dependencies() -> None:
    if GenerationRequest is not None:
        return

    raise HTTPException(
        status_code=503,
        detail="Instagram generation is temporarily unavailable because the core AI package is not ready.",
    )


def _require_anthropic_api_key() -> None:
    if os.getenv("ANTHROPIC_API_KEY"):
        return

    raise HTTPException(
        status_code=503,
        detail="ANTHROPIC_API_KEY is not configured for this service.",
    )


@router.post("/api/instagram/generate")
async def instagram_generate(req: InstagramGenerateRequest, request: Request):
    _require_instagram_dependencies()
    _require_anthropic_api_key()
    logger.info(
        "instagram generation request accepted %s",
        format_log_fields(
            {
                "pipeline": "instagram",
                "request_id": get_request_id(),
                "topic_length": len(req.topic),
                "goal": req.goal,
                "locale": req.locale,
                "style_examples": len(req.style_examples),
                "path": request.url.path,
            }
        ),
    )

    try:
        generation_request = GenerationRequest(
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
        style_skill = StyleAnalysisSkill()
        gen_skill = InstagramGenerationSkill()
        scoring_skill = ContentScoringSkill()
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
                    path=request.url.path,
                )
                _log_instagram_event("pipeline_started", goal=generation_request.goal, locale=req.locale)
                yield _sse(
                    "pipeline_started",
                    {
                        "topic": generation_request.topic,
                        "goal": generation_request.goal,
                        "locale": req.locale,
                    },
                )

                # Step 1: Style analysis
                tracker.stage_started("style_analysis")
                _log_instagram_event("style_analysis_started", locale=req.locale)
                yield _sse("style_analysis_started", {})
                try:
                    style_output = style_skill.run(SkillInput(
                        text=generation_request.template_text,
                        context={"style_examples": generation_request.style_examples},
                    ))
                    style_data = validate_style_analysis_payload(style_output.metadata["style_analysis"])
                    style_analysis = StyleAnalysis(
                        tone_keywords=style_data["tone_keywords"],
                        structural_patterns=style_data["structural_patterns"],
                        vocabulary_notes=style_data["vocabulary_notes"],
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
                _log_instagram_event("style_analysis_completed", locale=req.locale)
                yield _sse("style_analysis_completed", style_data)

                # Step 2: Content generation
                tracker.stage_started("generation")
                _log_instagram_event("generation_started", locale=req.locale)
                yield _sse("generation_started", {})
                try:
                    gen_output = gen_skill.run(SkillInput(
                        text=generation_request.topic,
                        context={
                            "template_text": localized_template_text,
                            "goal": generation_request.goal,
                            "locale": req.locale,
                            "style_analysis": style_data,
                        },
                    ))
                    gen_meta = validate_instagram_generation_payload(gen_output.metadata)
                    content = InstagramContent(
                        caption=gen_meta["caption"],
                        hook_options=gen_meta["hook_options"],
                        hashtags=gen_meta["hashtags"],
                        carousel_outline=[
                            CarouselSlide(title=s["title"], body=s["body"])
                            for s in gen_meta["carousel_outline"]
                        ],
                        reel_script=gen_meta["reel_script"],
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
                _log_instagram_event("generation_completed", locale=req.locale)
                yield _sse("generation_completed", gen_meta)

                # Step 3: Scoring
                tracker.stage_started("scoring")
                _log_instagram_event("scoring_started", locale=req.locale)
                yield _sse("scoring_started", {})
                try:
                    score_output = scoring_skill.run(SkillInput(
                        text=content.caption,
                        context={
                            "hook_options": content.hook_options,
                            "hashtags": content.hashtags,
                            "carousel_slide_count": len(content.carousel_outline),
                            "reel_script": content.reel_script,
                            "goal": generation_request.goal,
                        },
                    ))
                    score_data = validate_scorecard_payload(score_output.metadata["scorecard"])
                    scorecard = Scorecard(**score_data)
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
                _log_instagram_event("scoring_completed", locale=req.locale)
                yield _sse("scoring_completed", score_data)

                # Final result
                result = InstagramResult(
                    content=content,
                    scorecard=scorecard,
                    critique=score_output.text,
                    style_analysis=style_analysis,
                )
                result_dict = asdict(result)
                result_dict["scorecard"]["average"] = scorecard.average
                completed = True
                tracker.complete(goal=generation_request.goal)
                _log_instagram_event("pipeline_completed", locale=req.locale)
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
