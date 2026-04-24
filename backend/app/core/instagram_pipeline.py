"""Shared Instagram content generation pipeline logic.

Extracts the core generation flow (style analysis → content generation) from
the SSE route handler so it can be reused by both the streaming endpoint and
the combined generate-and-render endpoint.
"""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass, field

from fastapi import HTTPException

from ..core.localization import DEFAULT_LOCALE, append_locale_instruction, validate_locale
from ..core.output_validation import (
    validate_instagram_generation_payload,
    validate_style_analysis_payload,
)
from ..core_client import (
    CoreClientNotImplementedError,
    CoreClientUnavailableError,
    get_core_client,
)

logger = logging.getLogger(__name__)

_DEFAULT_TEMPLATE_TEXT_ZH = (
    "請以台灣專業服務品牌的 Instagram 內容風格，為主題「{topic}」生成內容。"
    "目標是：{goal_text}。請用繁體中文、先講結論，再拆成 5 張適合輪播的重點，"
    "語氣專業但好懂，最後補上 5 個適合台灣 Instagram 的 hashtag。"
)

_DEFAULT_TEMPLATE_TEXT_EN = (
    'Generate Instagram content for the topic "{topic}" in a professional services '
    "brand style. The goal is to {goal_text}. Use English, lead with the conclusion, "
    "break the idea into 5 carousel-ready points, keep the tone professional and easy "
    "to understand, and add 5 relevant Instagram hashtags."
)

_GOAL_TEXT = {
    "zh-TW": {
        "authority": "建立專業可信度",
        "conversion": "促使讀者私訊、預約或採取下一步",
        "engagement": "提高留言、收藏與分享",
    },
    "en": {
        "authority": "build professional authority",
        "conversion": "encourage readers to message, book, or take the next step",
        "engagement": "increase comments, saves, and shares",
    },
}


def _build_default_template_text(topic: str, goal: str, locale: str) -> str:
    """Build a default template_text when one isn't provided."""
    lang = "zh-TW" if locale.startswith("zh") else "en"
    goal_text = _GOAL_TEXT.get(lang, _GOAL_TEXT["en"]).get(goal, goal)
    template = _DEFAULT_TEMPLATE_TEXT_ZH if lang == "zh-TW" else _DEFAULT_TEMPLATE_TEXT_EN
    return template.format(topic=topic, goal_text=goal_text)


@dataclass
class InstagramGenerationResult:
    """Result of a successful Instagram content generation."""

    content: dict
    style_analysis: dict
    content_validated: bool = True


async def generate_instagram_content(
    *,
    topic: str,
    goal: str = "engagement",
    locale: str = DEFAULT_LOCALE,
    reference_image_description: str = "",
    template_text: str | None = None,
) -> InstagramGenerationResult:
    """Run the Instagram generation pipeline and return structured content.

    This is the shared logic extracted from the SSE streaming handler.
    It runs style analysis followed by content generation synchronously
    (no SSE streaming) and returns the result.

    Raises:
        HTTPException: on validation, dependency, or generation errors.
    """
    core_client = get_core_client()

    try:
        core_client.ensure_instagram_available()
    except (CoreClientUnavailableError, CoreClientNotImplementedError) as exc:
        raise HTTPException(
            status_code=503,
            detail="Instagram generation is temporarily unavailable.",
        ) from exc

    if core_client.requires_local_api_key and not os.getenv("ANTHROPIC_API_KEY"):
        raise HTTPException(
            status_code=503,
            detail="ANTHROPIC_API_KEY is not configured for this service.",
        )

    locale = validate_locale(locale)

    if not template_text:
        template_text = _build_default_template_text(topic, goal, locale)

    try:
        generation_request = core_client.build_instagram_generation_request(
            topic=topic,
            template_text=template_text,
            style_examples=[],
            goal=goal,
            reference_image_description=reference_image_description,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="Request validation failed.") from exc

    # Step 1: Style analysis
    try:
        style_data = validate_style_analysis_payload(
            core_client.analyze_instagram_style(
                template_text=generation_request.template_text,
                style_examples=generation_request.style_examples,
                reference_image_description=generation_request.reference_image_description,
            )
        )
    except Exception as exc:
        logger.exception("Instagram pipeline: style analysis failed")
        raise HTTPException(
            status_code=503,
            detail="Content generation failed during style analysis.",
        ) from exc

    # Step 2: Content generation
    localized_template_text = append_locale_instruction(
        generation_request.template_text,
        locale,
    )

    try:
        content = validate_instagram_generation_payload(
            core_client.generate_instagram_content(
                generation_request=generation_request,
                localized_template_text=localized_template_text,
                style_analysis=style_data,
                locale=locale,
            )
        )
    except Exception as exc:
        logger.exception("Instagram pipeline: content generation failed")
        raise HTTPException(
            status_code=503,
            detail="Content generation failed.",
        ) from exc

    return InstagramGenerationResult(
        content=content,
        style_analysis=style_data,
    )
