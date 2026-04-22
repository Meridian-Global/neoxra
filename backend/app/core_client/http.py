from __future__ import annotations

from .base import CoreClientNotImplementedError
from .signing import sign_internal_request_from_env
from .types import (
    CoreFacebookGenerationRequest,
    CoreInstagramGenerationRequest,
    CoreSeoGenerationRequest,
    CoreThreadsGenerationRequest,
)


class HttpCoreClient:
    mode = "http"
    requires_local_api_key = False

    def __init__(self, base_url: str | None = None):
        self.base_url = (base_url or "").strip().rstrip("/")

    def _not_ready(self) -> CoreClientNotImplementedError:
        return CoreClientNotImplementedError(
            "HTTP core adapter is not implemented yet."
        )

    def build_internal_headers(
        self,
        *,
        method: str,
        path: str,
        body: bytes,
    ) -> dict[str, str]:
        return sign_internal_request_from_env(
            method=method,
            path=path,
            body=body,
        )

    def ensure_pipeline_available(self) -> None:
        raise self._not_ready()

    def stream_core_pipeline(
        self,
        idea: str,
        voice_profile_name: str = "default",
        locale: str = "en",
    ):
        raise self._not_ready()

    def ensure_instagram_available(self) -> None:
        raise self._not_ready()

    def build_instagram_generation_request(
        self,
        *,
        topic: str,
        template_text: str,
        goal: str,
        style_examples: list[str],
        reference_image_description: str = "",
    ) -> CoreInstagramGenerationRequest:
        return CoreInstagramGenerationRequest(
            topic=topic,
            template_text=template_text,
            goal=goal,
            style_examples=list(style_examples),
            reference_image_description=reference_image_description,
        )

    def analyze_instagram_style(
        self,
        *,
        template_text: str,
        style_examples: list[str],
        reference_image_description: str = "",
    ) -> dict[str, object]:
        raise self._not_ready()

    def generate_instagram_content(
        self,
        *,
        generation_request: CoreInstagramGenerationRequest,
        localized_template_text: str,
        style_analysis: dict[str, object],
        locale: str,
    ) -> dict[str, object]:
        raise self._not_ready()

    def score_instagram_content(
        self,
        *,
        content: dict[str, object],
        goal: str,
    ) -> tuple[dict[str, object], str]:
        raise self._not_ready()

    def ensure_seo_available(self) -> None:
        raise self._not_ready()

    def build_seo_generation_request(
        self,
        *,
        topic: str,
        goal: str,
        locale: str,
    ) -> CoreSeoGenerationRequest:
        return CoreSeoGenerationRequest(topic=topic, goal=goal, locale=locale)

    def generate_seo_article(
        self,
        *,
        generation_request: CoreSeoGenerationRequest,
        brief_context: dict[str, object],
        voice_profile: dict[str, object] | None = None,
    ) -> dict[str, object]:
        raise self._not_ready()

    def ensure_threads_available(self) -> None:
        raise self._not_ready()

    def build_threads_generation_request(
        self,
        *,
        topic: str,
        goal: str,
        locale: str,
    ) -> CoreThreadsGenerationRequest:
        return CoreThreadsGenerationRequest(topic=topic, goal=goal, locale=locale)

    def generate_threads_content(
        self,
        *,
        generation_request: CoreThreadsGenerationRequest,
        brief_context: dict[str, object],
        voice_profile: dict[str, object] | None = None,
    ) -> dict[str, object]:
        raise self._not_ready()

    def ensure_facebook_available(self) -> None:
        raise self._not_ready()

    def build_facebook_generation_request(
        self,
        *,
        topic: str,
        locale: str,
    ) -> CoreFacebookGenerationRequest:
        return CoreFacebookGenerationRequest(topic=topic, locale=locale)

    def generate_facebook_content(
        self,
        *,
        generation_request: CoreFacebookGenerationRequest,
        brief_context: dict[str, object],
        instagram_caption: str,
        carousel_summary: str,
        voice_profile: dict[str, object] | None = None,
    ) -> dict[str, object]:
        raise self._not_ready()
