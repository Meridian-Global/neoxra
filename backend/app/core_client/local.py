from __future__ import annotations

from .base import CoreClientUnavailableError
from .types import CoreInstagramGenerationRequest

_LOCAL_IMPORT_ERROR = None
try:
    from neoxra_core.models.instagram import GenerationRequest
    from neoxra_core.skills.base import SkillInput
    from neoxra_core.skills.content_scoring import ContentScoringSkill
    from neoxra_core.skills.instagram_generation import InstagramGenerationSkill
    from neoxra_core.skills.style_analysis import StyleAnalysisSkill
except Exception as exc:  # pragma: no cover - exercised via adapter availability checks
    GenerationRequest = None
    SkillInput = None
    ContentScoringSkill = None
    InstagramGenerationSkill = None
    StyleAnalysisSkill = None
    _LOCAL_IMPORT_ERROR = exc


class LocalCoreClient:
    mode = "local"
    requires_local_api_key = True

    def ensure_pipeline_available(self) -> None:
        try:
            from ..core.pipeline import run_pipeline_stream as _
        except Exception as exc:
            raise CoreClientUnavailableError(
                "Local core pipeline is unavailable."
            ) from exc

    def stream_core_pipeline(
        self,
        idea: str,
        voice_profile_name: str = "default",
        locale: str = "en",
    ):
        self.ensure_pipeline_available()
        from ..core.pipeline import run_pipeline_stream

        return run_pipeline_stream(idea, voice_profile_name, locale)

    def ensure_instagram_available(self) -> None:
        if GenerationRequest is None:
            raise CoreClientUnavailableError(
                "Local Instagram generation dependencies are unavailable."
            ) from _LOCAL_IMPORT_ERROR

    def build_instagram_generation_request(
        self,
        *,
        topic: str,
        template_text: str,
        goal: str,
        style_examples: list[str],
    ) -> CoreInstagramGenerationRequest:
        self.ensure_instagram_available()
        request = GenerationRequest(
            topic=topic,
            template_text=template_text,
            style_examples=style_examples,
            goal=goal,
        )
        return CoreInstagramGenerationRequest(
            topic=request.topic,
            template_text=request.template_text,
            goal=request.goal,
            style_examples=list(request.style_examples),
        )

    def analyze_instagram_style(
        self,
        *,
        template_text: str,
        style_examples: list[str],
    ) -> dict[str, object]:
        self.ensure_instagram_available()
        style_skill = StyleAnalysisSkill()
        style_output = style_skill.run(
            SkillInput(
                text=template_text,
                context={"style_examples": style_examples},
            )
        )
        return style_output.metadata["style_analysis"]

    def generate_instagram_content(
        self,
        *,
        generation_request: CoreInstagramGenerationRequest,
        localized_template_text: str,
        style_analysis: dict[str, object],
        locale: str,
    ) -> dict[str, object]:
        self.ensure_instagram_available()
        generation_skill = InstagramGenerationSkill()
        generation_output = generation_skill.run(
            SkillInput(
                text=generation_request.topic,
                context={
                    "template_text": localized_template_text,
                    "goal": generation_request.goal,
                    "locale": locale,
                    "style_analysis": style_analysis,
                },
            )
        )
        return generation_output.metadata

    def score_instagram_content(
        self,
        *,
        content: dict[str, object],
        goal: str,
    ) -> tuple[dict[str, object], str]:
        self.ensure_instagram_available()
        scoring_skill = ContentScoringSkill()
        scoring_output = scoring_skill.run(
            SkillInput(
                text=str(content["caption"]),
                context={
                    "hook_options": content["hook_options"],
                    "hashtags": content["hashtags"],
                    "carousel_slide_count": len(content["carousel_outline"]),
                    "reel_script": content["reel_script"],
                    "goal": goal,
                },
            )
        )
        return scoring_output.metadata["scorecard"], scoring_output.text

