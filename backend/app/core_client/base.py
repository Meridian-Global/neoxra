from __future__ import annotations

from typing import Generator, Protocol

from .types import (
    CoreInstagramGenerationRequest,
    CoreSeoGenerationRequest,
    CoreThreadsGenerationRequest,
)


class CoreClientError(RuntimeError):
    """Base error for core client failures."""


class CoreClientUnavailableError(CoreClientError):
    """Raised when the selected core adapter cannot serve a request."""


class CoreClientNotImplementedError(CoreClientError):
    """Raised by skeleton adapters that are intentionally not implemented yet."""


class CoreClient(Protocol):
    mode: str
    requires_local_api_key: bool

    def ensure_pipeline_available(self) -> None: ...

    def stream_core_pipeline(
        self,
        idea: str,
        voice_profile_name: str = "default",
        locale: str = "en",
    ) -> Generator[dict, None, None]: ...

    def ensure_instagram_available(self) -> None: ...

    def build_instagram_generation_request(
        self,
        *,
        topic: str,
        template_text: str,
        goal: str,
        style_examples: list[str],
        reference_image_description: str = "",
    ) -> CoreInstagramGenerationRequest: ...

    def analyze_instagram_style(
        self,
        *,
        template_text: str,
        style_examples: list[str],
        reference_image_description: str = "",
    ) -> dict[str, object]: ...

    def generate_instagram_content(
        self,
        *,
        generation_request: CoreInstagramGenerationRequest,
        localized_template_text: str,
        style_analysis: dict[str, object],
        locale: str,
    ) -> dict[str, object]: ...

    def score_instagram_content(
        self,
        *,
        content: dict[str, object],
        goal: str,
    ) -> tuple[dict[str, object], str]: ...

    def ensure_seo_available(self) -> None: ...

    def build_seo_generation_request(
        self,
        *,
        topic: str,
        goal: str,
        locale: str,
    ) -> CoreSeoGenerationRequest: ...

    def generate_seo_article(
        self,
        *,
        generation_request: CoreSeoGenerationRequest,
        brief_context: dict[str, object],
        voice_profile: dict[str, object] | None = None,
    ) -> dict[str, object]: ...

    def ensure_threads_available(self) -> None: ...

    def build_threads_generation_request(
        self,
        *,
        topic: str,
        goal: str,
        locale: str,
    ) -> CoreThreadsGenerationRequest: ...

    def generate_threads_content(
        self,
        *,
        generation_request: CoreThreadsGenerationRequest,
        brief_context: dict[str, object],
        voice_profile: dict[str, object] | None = None,
    ) -> dict[str, object]: ...
