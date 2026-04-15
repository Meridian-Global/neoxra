import json
from dataclasses import asdict

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, field_validator

from orchestra_core.models.instagram import (
    VALID_GOALS,
    CarouselSlide,
    GenerationRequest,
    InstagramContent,
    InstagramResult,
    Scorecard,
    StyleAnalysis,
)
from orchestra_core.skills.base import SkillInput
from orchestra_core.skills.content_scoring import ContentScoringSkill
from orchestra_core.skills.instagram_generation import InstagramGenerationSkill
from orchestra_core.skills.style_analysis import StyleAnalysisSkill

router = APIRouter()


class InstagramGenerateRequest(BaseModel):
    topic: str
    template_text: str
    goal: str = "engagement"
    style_examples: list[str] = []
    voice_profile: str = "default"

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


def _sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


@router.post("/api/instagram/generate")
async def instagram_generate(req: InstagramGenerateRequest):
    request = GenerationRequest(
        topic=req.topic,
        template_text=req.template_text,
        style_examples=req.style_examples,
        goal=req.goal,
    )

    async def stream():
        style_skill = StyleAnalysisSkill()
        gen_skill = InstagramGenerationSkill()
        scoring_skill = ContentScoringSkill()

        # Step 1: Style analysis
        yield _sse("style_analysis_started", {})
        style_output = style_skill.run(SkillInput(
            text=request.template_text,
            context={"style_examples": request.style_examples},
        ))
        style_data = style_output.metadata["style_analysis"]
        style_analysis = StyleAnalysis(
            tone_keywords=style_data["tone_keywords"],
            structural_patterns=style_data["structural_patterns"],
            vocabulary_notes=style_data["vocabulary_notes"],
        )
        yield _sse("style_analysis_completed", style_data)

        # Step 2: Content generation
        yield _sse("generation_started", {})
        gen_output = gen_skill.run(SkillInput(
            text=request.topic,
            context={
                "template_text": request.template_text,
                "goal": request.goal,
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
        yield _sse("generation_completed", gen_meta)

        # Step 3: Scoring
        yield _sse("scoring_started", {})
        score_output = scoring_skill.run(SkillInput(
            text=content.caption,
            context={
                "hook_options": content.hook_options,
                "hashtags": content.hashtags,
                "carousel_slide_count": len(content.carousel_outline),
                "reel_script": content.reel_script,
                "goal": request.goal,
            },
        ))
        score_data = score_output.metadata["scorecard"]
        scorecard = Scorecard(**score_data)
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
        yield _sse("pipeline_completed", result_dict)

    return StreamingResponse(stream(), media_type="text/event-stream")
