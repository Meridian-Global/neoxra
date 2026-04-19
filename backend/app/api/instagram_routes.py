import json
import logging
import os
from dataclasses import asdict

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, ConfigDict, field_validator

from ..core.localization import (
    DEFAULT_LOCALE,
    append_locale_instruction,
    validate_locale,
)
from ..core.logging_utils import get_request_id
from ..core.neoxra_core_diagnostics import (
    format_neoxra_core_diagnostics,
    get_neoxra_core_diagnostics,
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
    style_examples: list[str] = []
    locale: str = DEFAULT_LOCALE

    @field_validator("topic", "template_text")
    @classmethod
    def must_not_be_blank(cls, v: str, info) -> str:
        if not v or not v.strip():
            raise ValueError(f"{info.field_name} must not be empty or whitespace-only")
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


def _sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


def _log_instagram_event(event_name: str, **fields) -> None:
    base_fields = {
        "request_id": get_request_id(),
        "event": event_name,
    }
    base_fields.update(fields)
    logger.info(
        "instagram pipeline event=%s %s",
        event_name,
        " ".join(f"{key}={value}" for key, value in base_fields.items() if key != "event"),
    )


def _require_instagram_dependencies() -> None:
    if GenerationRequest is not None:
        return

    detail = (
        "Instagram generation is unavailable because the core AI package "
        f"'neoxra_core' is unavailable. {format_neoxra_core_diagnostics(get_neoxra_core_diagnostics())}"
    )
    if _INSTAGRAM_IMPORT_ERROR is not None:
        detail = f"{detail} Import error: {_INSTAGRAM_IMPORT_ERROR}"
    raise HTTPException(status_code=503, detail=detail)


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
        "instagram generation request accepted topic_length=%s goal=%s locale=%s style_examples=%s path=%s",
        len(req.topic),
        req.goal,
        req.locale,
        len(req.style_examples),
        request.url.path,
    )

    try:
        generation_request = GenerationRequest(
            topic=req.topic,
            template_text=req.template_text,
            style_examples=req.style_examples,
            goal=req.goal,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    async def stream():
        completed = False
        style_skill = StyleAnalysisSkill()
        gen_skill = InstagramGenerationSkill()
        scoring_skill = ContentScoringSkill()

        try:
            localized_template_text = append_locale_instruction(
                generation_request.template_text,
                req.locale,
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
            _log_instagram_event("style_analysis_started", locale=req.locale)
            yield _sse("style_analysis_started", {})
            try:
                style_output = style_skill.run(SkillInput(
                    text=generation_request.template_text,
                    context={"style_examples": generation_request.style_examples},
                ))
                style_data = style_output.metadata["style_analysis"]
                style_analysis = StyleAnalysis(
                    tone_keywords=style_data["tone_keywords"],
                    structural_patterns=style_data["structural_patterns"],
                    vocabulary_notes=style_data["vocabulary_notes"],
                )
            except Exception as exc:
                logger.exception("Instagram flow failed during style analysis")
                yield _sse("error", {"stage": "style_analysis", "message": str(exc)})
                return
            _log_instagram_event("style_analysis_completed", locale=req.locale)
            yield _sse("style_analysis_completed", style_data)

            # Step 2: Content generation
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
                gen_meta = gen_output.metadata
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
            except Exception as exc:
                logger.exception("Instagram flow failed during generation")
                yield _sse("error", {"stage": "generation", "message": str(exc)})
                return
            _log_instagram_event("generation_completed", locale=req.locale)
            yield _sse("generation_completed", gen_meta)

            # Step 3: Scoring
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
                score_data = score_output.metadata["scorecard"]
                scorecard = Scorecard(**score_data)
            except Exception as exc:
                logger.exception("Instagram flow failed during scoring")
                yield _sse("error", {"stage": "scoring", "message": str(exc)})
                return
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
            _log_instagram_event("pipeline_completed", locale=req.locale)
            yield _sse("pipeline_completed", result_dict)
        except Exception as exc:
            logger.exception("Instagram flow failed before completion")
            yield _sse("error", {"stage": "pipeline", "message": str(exc) or "Pipeline failed before completion."})
            return

        if not completed:
            logger.error("Instagram pipeline stream ended without pipeline_completed")
            yield _sse("error", {"stage": "pipeline", "message": "Pipeline ended before pipeline_completed was emitted."})
        else:
            logger.info("Instagram pipeline completed successfully")

    return StreamingResponse(stream(), media_type="text/event-stream")
