from typing import Any

from pydantic import BaseModel, ConfigDict, field_validator, model_validator


class BriefPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    original_idea: str
    core_angle: str
    target_audience: str
    tone: str
    instagram_notes: str
    threads_notes: str
    linkedin_notes: str

    @field_validator("*")
    @classmethod
    def _not_blank(cls, value: str) -> str:
        if not isinstance(value, str) or not value.strip():
            raise ValueError("brief fields must be non-empty strings")
        return value


class StyleAnalysisPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    tone_keywords: list[str]
    structural_patterns: list[str]
    vocabulary_notes: str

    @field_validator("tone_keywords", "structural_patterns")
    @classmethod
    def _non_empty_string_list(cls, value: list[str]) -> list[str]:
        if not value:
            raise ValueError("list must not be empty")
        if any(not isinstance(item, str) or not item.strip() for item in value):
            raise ValueError("list items must be non-empty strings")
        return value

    @field_validator("vocabulary_notes")
    @classmethod
    def _notes_not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("vocabulary_notes must not be blank")
        return value


class CarouselSlidePayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str
    body: str
    text_alignment: str = "center"
    emphasis: str = "normal"

    @field_validator("title", "body", "text_alignment", "emphasis")
    @classmethod
    def _not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("slide fields must not be blank")
        return value

    @field_validator("text_alignment")
    @classmethod
    def _valid_alignment(cls, value: str) -> str:
        if value not in {"left", "center", "right"}:
            return "center"
        return value

    @field_validator("emphasis")
    @classmethod
    def _valid_emphasis(cls, value: str) -> str:
        if value not in {"normal", "strong", "quiet"}:
            return "normal"
        return value


class InstagramGenerationPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    caption: str
    hook_options: list[str]
    hashtags: list[str]
    carousel_outline: list[CarouselSlidePayload]
    reel_script: str

    @field_validator("caption", "reel_script")
    @classmethod
    def _not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("content fields must not be blank")
        return value

    @field_validator("hook_options", "hashtags")
    @classmethod
    def _non_empty_string_list(cls, value: list[str]) -> list[str]:
        if not value:
            raise ValueError("list must not be empty")
        if any(not isinstance(item, str) or not item.strip() for item in value):
            raise ValueError("list items must be non-empty strings")
        return value

    @field_validator("carousel_outline")
    @classmethod
    def _carousel_not_empty(cls, value: list[CarouselSlidePayload]) -> list[CarouselSlidePayload]:
        if not 5 <= len(value) <= 9:
            raise ValueError("carousel_outline must contain 5-9 slides")
        return value


class SeoMetadataPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str
    meta_description: str
    url_slug: str
    primary_keyword: str
    secondary_keywords: list[str]
    target_search_intent: str

    @field_validator("title")
    @classmethod
    def _title_length(cls, value: str) -> str:
        length = len(value.strip())
        if not 50 <= length <= 60:
            raise ValueError(f"title must be 50-60 characters, got {length}")
        return value

    @field_validator("meta_description")
    @classmethod
    def _meta_length(cls, value: str) -> str:
        length = len(value.strip())
        if not 150 <= length <= 160:
            raise ValueError(f"meta_description must be 150-160 characters, got {length}")
        return value

    @field_validator("url_slug", "primary_keyword", "target_search_intent")
    @classmethod
    def _not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("metadata fields must not be blank")
        return value

    @field_validator("secondary_keywords")
    @classmethod
    def _keywords_valid(cls, value: list[str]) -> list[str]:
        if any(not isinstance(item, str) or not item.strip() for item in value):
            raise ValueError("secondary_keywords items must be non-empty strings")
        return value


class SeoSectionPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    heading: str
    heading_level: int
    content: str

    @field_validator("heading", "content")
    @classmethod
    def _not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("section fields must not be blank")
        return value

    @field_validator("heading_level")
    @classmethod
    def _valid_level(cls, value: int) -> int:
        if value not in {2, 3}:
            raise ValueError("heading_level must be 2 or 3")
        return value


class SeoArticlePayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    metadata: SeoMetadataPayload
    h1: str
    introduction: str
    sections: list[SeoSectionPayload]
    conclusion: str
    summary_points: list[str]
    cta: str
    estimated_word_count: int
    estimated_character_count: int = 0

    @field_validator("h1", "introduction", "conclusion", "cta")
    @classmethod
    def _not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("article fields must not be blank")
        return value

    @field_validator("sections")
    @classmethod
    def _enough_sections(cls, value: list[SeoSectionPayload]) -> list[SeoSectionPayload]:
        if len(value) < 3:
            raise ValueError("article must include at least 3 sections")
        return value

    @field_validator("summary_points")
    @classmethod
    def _summary_points_valid(cls, value: list[str]) -> list[str]:
        if not value:
            raise ValueError("summary_points must not be empty")
        if any(not isinstance(item, str) or not item.strip() for item in value):
            raise ValueError("summary_points items must be non-empty strings")
        return value

    @field_validator("estimated_word_count")
    @classmethod
    def _word_count_range(cls, value: int) -> int:
        if not 2000 <= value <= 8000:
            raise ValueError("estimated_word_count must be between 2000 and 8000")
        return value


class ThreadsPostPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    content: str
    post_number: int
    purpose: str

    @field_validator("content")
    @classmethod
    def _content_valid(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("post content must not be blank")
        if len(value) > 500:
            raise ValueError("post content must be <= 500 characters")
        return value

    @field_validator("post_number")
    @classmethod
    def _post_number_valid(cls, value: int) -> int:
        if value < 1:
            raise ValueError("post_number must be >= 1")
        return value

    @field_validator("purpose")
    @classmethod
    def _purpose_valid(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("purpose must not be blank")
        return value


class ThreadsThreadPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    posts: list[ThreadsPostPayload]
    format: str
    reply_bait: str

    @field_validator("posts")
    @classmethod
    def _posts_not_empty(cls, value: list[ThreadsPostPayload]) -> list[ThreadsPostPayload]:
        if not value:
            raise ValueError("posts must contain at least 1 post")
        return value

    @field_validator("format", "reply_bait")
    @classmethod
    def _not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("thread fields must not be blank")
        return value

    @model_validator(mode="after")
    def _sequential_posts(self):
        for expected_number, post in enumerate(self.posts, start=1):
            if post.post_number != expected_number:
                raise ValueError("posts must be numbered sequentially starting at 1")
        return self


class FacebookPostPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    hook: str
    body: str
    discussion_prompt: str
    share_hook: str
    image_recommendation: str

    @field_validator("hook", "body", "discussion_prompt")
    @classmethod
    def _required_fields_not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("required Facebook fields must not be blank")
        return value

    @field_validator("share_hook", "image_recommendation")
    @classmethod
    def _optional_text_not_none(cls, value: str) -> str:
        return value or ""


class ScorecardPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    hook_strength: int
    cta_clarity: int
    hashtag_relevance: int
    platform_fit: int
    tone_match: int
    originality: int


class CorePipelineCompletedPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    brief: BriefPayload
    instagram: str
    threads: str
    linkedin: str
    instagram_final: str
    threads_final: str
    linkedin_final: str
    critic_notes: str

    @field_validator(
        "instagram",
        "threads",
        "linkedin",
        "instagram_final",
        "threads_final",
        "linkedin_final",
        "critic_notes",
    )
    @classmethod
    def _not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("pipeline output fields must not be blank")
        return value


def validate_style_analysis_payload(payload: dict[str, Any]) -> dict[str, Any]:
    return StyleAnalysisPayload.model_validate(payload).model_dump()


def validate_instagram_generation_payload(payload: dict[str, Any]) -> dict[str, Any]:
    return InstagramGenerationPayload.model_validate(payload).model_dump()


def validate_seo_article_payload(payload: dict[str, Any]) -> dict[str, Any]:
    return SeoArticlePayload.model_validate(payload).model_dump()


def validate_threads_content_payload(payload: dict[str, Any]) -> dict[str, Any]:
    return ThreadsThreadPayload.model_validate(payload).model_dump()


def validate_facebook_post_payload(payload: dict[str, Any]) -> dict[str, Any]:
    return FacebookPostPayload.model_validate(payload).model_dump()


def validate_scorecard_payload(payload: dict[str, Any]) -> dict[str, Any]:
    return ScorecardPayload.model_validate(payload).model_dump()


def validate_core_pipeline_event(event_name: str, payload: dict[str, Any]) -> dict[str, Any]:
    if event_name == "planner_completed":
        if not isinstance(payload, dict):
            raise ValueError('payload must be a dictionary')
        if "brief" not in payload:
            raise ValueError('payload must contain a "brief" key')
        return {"brief": BriefPayload.model_validate(payload["brief"]).model_dump()}

    if event_name in {
        "instagram_pass1_completed",
        "instagram_pass2_completed",
        "threads_pass1_completed",
        "threads_pass2_completed",
        "linkedin_pass1_completed",
        "linkedin_pass2_completed",
    }:
        thinking = payload.get("thinking", "")
        output = payload.get("output", "")
        if not isinstance(thinking, str) or not thinking.strip():
            raise ValueError("thinking must not be blank")
        if not isinstance(output, str) or not output.strip():
            raise ValueError("output must not be blank")
        return {"thinking": thinking, "output": output}

    if event_name == "critic_completed":
        validated = {}
        for key in ("notes", "instagram_improved", "threads_improved", "linkedin_improved"):
            value = payload.get(key, "")
            if not isinstance(value, str) or not value.strip():
                raise ValueError(f"{key} must not be blank")
            validated[key] = value
        return validated

    if event_name == "pipeline_completed":
        return CorePipelineCompletedPayload.model_validate(payload).model_dump()

    return payload
