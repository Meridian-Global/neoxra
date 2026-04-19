from typing import Any

from pydantic import BaseModel, ConfigDict, field_validator


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

    @field_validator("title", "body")
    @classmethod
    def _not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("slide fields must not be blank")
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
        if not value:
            raise ValueError("carousel_outline must not be empty")
        return value


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


def validate_scorecard_payload(payload: dict[str, Any]) -> dict[str, Any]:
    return ScorecardPayload.model_validate(payload).model_dump()


def validate_core_pipeline_event(event_name: str, payload: dict[str, Any]) -> dict[str, Any]:
    if event_name == "planner_completed":
        if not isinstance(payload, dict):
            raise ValueError("payload must be an object")
        if "brief" not in payload:
            raise ValueError("brief is required")
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
