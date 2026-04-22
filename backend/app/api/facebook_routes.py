import json
import logging
import os

from fastapi import HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, ConfigDict, field_validator

from ..core.demo_access import require_demo_access
from ..core.error_handling import generation_error_payload, public_generation_error
from ..core.localization import DEFAULT_LOCALE, append_locale_instruction, validate_locale
from ..core.logging_utils import format_log_fields, get_request_id
from ..core_client import (
    CoreClientNotImplementedError,
    CoreClientUnavailableError,
    get_core_client,
)
from .access_groups import build_gated_demo_router

router = build_gated_demo_router()
logger = logging.getLogger(__name__)

DEFAULT_INSTAGRAM_TEMPLATE = (
    "Hook first. Short practical paragraphs. Clear carousel structure. "
    "Make the idea specific enough to adapt into Facebook discussion content."
)


class FacebookGenerateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    topic: str
    instagram_content: dict[str, object] | None = None
    locale: str = DEFAULT_LOCALE

    @field_validator("topic")
    @classmethod
    def topic_must_not_be_blank(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("topic must not be empty or whitespace-only")
        return value.strip()

    @field_validator("locale")
    @classmethod
    def must_be_supported_locale(cls, value: str) -> str:
        return validate_locale(value)


def _sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


def _get_core_client():
    return get_core_client()


def _require_anthropic_api_key() -> None:
    if os.getenv("ANTHROPIC_API_KEY"):
        return
    raise HTTPException(
        status_code=503,
        detail="ANTHROPIC_API_KEY is not configured for this service.",
    )


def _require_facebook_dependencies(core_client=None, *, needs_instagram: bool = False) -> None:
    if core_client is None:
        core_client = _get_core_client()
    try:
        core_client.ensure_facebook_available()
        if needs_instagram:
            core_client.ensure_instagram_available()
        return
    except (CoreClientUnavailableError, CoreClientNotImplementedError) as exc:
        if core_client.mode == "local":
            raise HTTPException(
                status_code=503,
                detail="Facebook generation is temporarily unavailable because the core AI package is not ready.",
            ) from exc
        raise HTTPException(
            status_code=503,
            detail="Facebook generation is temporarily unavailable because the selected core adapter is not ready.",
        ) from exc


def _extract_instagram_caption(instagram_content: dict[str, object]) -> str:
    caption = instagram_content.get("caption")
    if not isinstance(caption, str) or not caption.strip():
        raise ValueError("instagram_content.caption is required")
    return caption.strip()


def _build_carousel_summary(instagram_content: dict[str, object]) -> str:
    slides = instagram_content.get("carousel_outline")
    if not isinstance(slides, list) or not slides:
        return "No carousel outline was provided."

    summary_lines = []
    for index, slide in enumerate(slides[:7], start=1):
        if not isinstance(slide, dict):
            continue
        title = str(slide.get("title", "")).strip()
        body = str(slide.get("body", "")).strip()
        if title or body:
            summary_lines.append(f"{index}. {title}: {body}".strip())

    return "\n".join(summary_lines) or "No usable carousel slide text was provided."


def _generate_instagram_first(core_client, *, topic: str, locale: str) -> dict[str, object]:
    generation_request = core_client.build_instagram_generation_request(
        topic=topic,
        template_text=DEFAULT_INSTAGRAM_TEMPLATE,
        goal="engagement",
        style_examples=[],
    )
    style_analysis = core_client.analyze_instagram_style(
        template_text=generation_request.template_text,
        style_examples=generation_request.style_examples,
    )
    return core_client.generate_instagram_content(
        generation_request=generation_request,
        localized_template_text=append_locale_instruction(
            generation_request.template_text,
            locale,
        ),
        style_analysis=style_analysis,
        locale=locale,
    )


@router.post("/api/facebook/generate")
async def facebook_generate(req: FacebookGenerateRequest, request: Request):
    core_client = _get_core_client()
    _require_facebook_dependencies(
        core_client,
        needs_instagram=req.instagram_content is None,
    )
    if core_client.requires_local_api_key:
        _require_anthropic_api_key()
    demo_surface = require_demo_access(
        request,
        default_surface="facebook",
        allowed_surfaces={"landing", "instagram", "threads", "facebook", "legal"},
    )

    logger.info(
        "facebook generation request accepted %s",
        format_log_fields(
            {
                "pipeline": "facebook",
                "request_id": get_request_id(),
                "topic_length": len(req.topic),
                "locale": req.locale,
                "demo_surface": demo_surface,
                "core_client_mode": core_client.mode,
                "has_instagram_content": req.instagram_content is not None,
                "path": request.url.path,
            }
        ),
    )

    try:
        generation_request = core_client.build_facebook_generation_request(
            topic=req.topic,
            locale=req.locale,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="Request validation failed.") from exc

    async def stream():
        try:
            yield _sse(
                "phase_started",
                {
                    "phase": "instagram_source" if req.instagram_content is None else "adaptation",
                    "topic": generation_request.topic,
                    "locale": generation_request.locale,
                },
            )
            instagram_content = req.instagram_content or _generate_instagram_first(
                core_client,
                topic=generation_request.topic,
                locale=generation_request.locale,
            )
            try:
                instagram_caption = _extract_instagram_caption(instagram_content)
                carousel_summary = _build_carousel_summary(instagram_content)
            except ValueError:
                logger.exception("Facebook pipeline received invalid source content")
                yield _sse(
                    "error",
                    generation_error_payload(
                        stage="facebook",
                        error_code="FACEBOOK_SOURCE_INVALID",
                        message="Facebook generation could not use the provided Instagram content.",
                    ),
                )
                return

            facebook_post = core_client.generate_facebook_content(
                generation_request=generation_request,
                brief_context={
                    "topic": generation_request.topic,
                    "locale": generation_request.locale,
                    "demo_surface": demo_surface,
                    "source_platform": "instagram",
                },
                instagram_caption=instagram_caption,
                carousel_summary=carousel_summary,
            )
            yield _sse("content_ready", facebook_post)
            yield _sse(
                "pipeline_completed",
                {
                    "facebook_post": facebook_post,
                    "topic": generation_request.topic,
                    "locale": generation_request.locale,
                    "source": "instagram",
                },
            )
        except Exception:
            logger.exception("Facebook pipeline failed before completion")
            error_code, safe_message = public_generation_error("facebook")
            yield _sse(
                "error",
                generation_error_payload(
                    stage="facebook",
                    error_code=error_code,
                    message=safe_message,
                ),
            )
            return

    return StreamingResponse(stream(), media_type="text/event-stream")
