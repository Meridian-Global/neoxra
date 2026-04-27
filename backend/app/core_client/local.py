from __future__ import annotations

from typing import Callable

from .base import CoreClientUnavailableError
from .types import (
    CoreFacebookGenerationRequest,
    CoreInstagramGenerationRequest,
    CoreSeoGenerationRequest,
    CoreThreadsGenerationRequest,
)

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

_LOCAL_SEO_IMPORT_ERROR = None
try:
    from neoxra_core.pipeline.seo import SeoPipeline
except Exception as exc:  # pragma: no cover - exercised via adapter availability checks
    SeoPipeline = None
    _LOCAL_SEO_IMPORT_ERROR = exc

_LOCAL_THREADS_IMPORT_ERROR = None
try:
    from neoxra_core.skills.threads_generation import ThreadsGenerationSkill
except Exception as exc:  # pragma: no cover - exercised via adapter availability checks
    ThreadsGenerationSkill = None
    _LOCAL_THREADS_IMPORT_ERROR = exc

_LOCAL_FACEBOOK_IMPORT_ERROR = None
try:
    from neoxra_core.skills.facebook_adapter import FacebookAdapterSkill
except Exception as exc:  # pragma: no cover - exercised via adapter availability checks
    FacebookAdapterSkill = None
    _LOCAL_FACEBOOK_IMPORT_ERROR = exc


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
        reference_image_description: str = "",
    ) -> CoreInstagramGenerationRequest:
        self.ensure_instagram_available()
        request = GenerationRequest(
            topic=topic,
            template_text=template_text,
            style_examples=style_examples,
            goal=goal,
            reference_image_description=reference_image_description,
        )
        return CoreInstagramGenerationRequest(
            topic=request.topic,
            template_text=request.template_text,
            goal=request.goal,
            style_examples=list(request.style_examples),
            reference_image_description=request.reference_image_description,
        )

    def analyze_instagram_style(
        self,
        *,
        template_text: str,
        style_examples: list[str],
        reference_image_description: str = "",
    ) -> dict[str, object]:
        self.ensure_instagram_available()
        style_skill = StyleAnalysisSkill()
        style_output = style_skill.run(
            SkillInput(
                text=template_text,
                context={
                    "style_examples": style_examples,
                    "reference_image_description": reference_image_description,
                },
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
                    "reference_image_description": generation_request.reference_image_description,
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

    def ensure_seo_available(self) -> None:
        if SeoPipeline is None:
            raise CoreClientUnavailableError(
                "Local SEO generation dependencies are unavailable."
            ) from _LOCAL_SEO_IMPORT_ERROR

    def build_seo_generation_request(
        self,
        *,
        topic: str,
        goal: str,
        locale: str,
    ) -> CoreSeoGenerationRequest:
        self.ensure_seo_available()
        if not topic.strip():
            raise ValueError("topic must not be empty")
        if not goal.strip():
            raise ValueError("goal must not be empty")
        return CoreSeoGenerationRequest(
            topic=topic.strip(),
            goal=goal.strip(),
            locale=locale,
        )

    def generate_seo_article(
        self,
        *,
        generation_request: CoreSeoGenerationRequest,
        brief_context: dict[str, object],
        voice_profile: dict[str, object] | None = None,
        on_section_ready: Callable[[str, object], None] | None = None,
    ) -> dict[str, object]:
        self.ensure_seo_available()
        pipeline = SeoPipeline()
        article = pipeline.run(
            topic=generation_request.topic,
            brief_context=brief_context,
            voice_profile=voice_profile,
            locale=getattr(generation_request, "locale", "en"),
            on_section_ready=on_section_ready,
        )
        return article.to_dict()

    def ensure_threads_available(self) -> None:
        if ThreadsGenerationSkill is None or SkillInput is None:
            raise CoreClientUnavailableError(
                "Local Threads generation dependencies are unavailable."
            ) from _LOCAL_THREADS_IMPORT_ERROR

    def build_threads_generation_request(
        self,
        *,
        topic: str,
        goal: str,
        locale: str,
    ) -> CoreThreadsGenerationRequest:
        self.ensure_threads_available()
        if not topic.strip():
            raise ValueError("topic must not be empty")
        if not goal.strip():
            raise ValueError("goal must not be empty")
        return CoreThreadsGenerationRequest(
            topic=topic.strip(),
            goal=goal.strip(),
            locale=locale,
        )

    def generate_threads_content(
        self,
        *,
        generation_request: CoreThreadsGenerationRequest,
        brief_context: dict[str, object],
        voice_profile: dict[str, object] | None = None,
    ) -> dict[str, object]:
        self.ensure_threads_available()
        skill = ThreadsGenerationSkill()
        output = skill.run(
            SkillInput(
                text=generation_request.topic,
                context={
                    "goal": generation_request.goal,
                    "locale": generation_request.locale,
                    "brief_context": brief_context,
                    "voice_profile": voice_profile,
                },
            )
        )
        return output.metadata["thread"]

    def ensure_facebook_available(self) -> None:
        if FacebookAdapterSkill is None or SkillInput is None:
            raise CoreClientUnavailableError(
                "Local Facebook adapter dependencies are unavailable."
            ) from _LOCAL_FACEBOOK_IMPORT_ERROR

    def build_facebook_generation_request(
        self,
        *,
        topic: str,
        locale: str,
    ) -> CoreFacebookGenerationRequest:
        self.ensure_facebook_available()
        if not topic.strip():
            raise ValueError("topic must not be empty")
        return CoreFacebookGenerationRequest(topic=topic.strip(), locale=locale)

    def generate_facebook_content(
        self,
        *,
        generation_request: CoreFacebookGenerationRequest,
        brief_context: dict[str, object],
        instagram_caption: str,
        carousel_summary: str,
        voice_profile: dict[str, object] | None = None,
    ) -> dict[str, object]:
        self.ensure_facebook_available()
        skill = FacebookAdapterSkill()
        output = skill.run(
            SkillInput(
                text=generation_request.topic,
                context={
                    "brief_context": brief_context,
                    "instagram_caption": instagram_caption,
                    "carousel_summary": carousel_summary,
                    "locale": generation_request.locale,
                    "voice_profile": voice_profile,
                },
            )
        )
        return output.metadata["facebook_post"]
