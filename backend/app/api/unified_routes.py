import asyncio
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
from ..core.output_validation import (
    validate_facebook_post_payload,
    validate_instagram_generation_payload,
    validate_seo_article_payload,
    validate_threads_content_payload,
)
from ..core.request_guards import CORE_ROUTE_KEY, enforce_generation_limits, get_max_idea_length
from ..core_client import (
    CoreClientNotImplementedError,
    CoreClientUnavailableError,
    get_core_client,
)
from .access_groups import build_gated_demo_router

router = build_gated_demo_router()
logger = logging.getLogger(__name__)

VALID_INDUSTRIES = {"legal", "tech", "health", "real_estate", "general"}
VALID_VOICE_PROFILES = {"default", "law_firm"}
VALID_GOALS = {"traffic", "authority", "conversion", "education"}
LAW_FIRM_DISCLAIMER = "本內容為一般法律資訊分享，非針對個案之法律意見。如有具體法律問題，建議諮詢專業律師。"


class UnifiedGenerateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    idea: str
    industry: str = "general"
    audience: str = ""
    goal: str = "traffic"
    voice_profile: str = "default"
    locale: str = DEFAULT_LOCALE

    @field_validator("idea")
    @classmethod
    def idea_must_be_valid(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("idea must not be empty or whitespace-only")
        if len(value.strip()) > get_max_idea_length():
            raise ValueError(f"idea must be <= {get_max_idea_length()} characters")
        return value.strip()

    @field_validator("industry")
    @classmethod
    def industry_must_be_supported(cls, value: str) -> str:
        normalized = value.strip() or "general"
        if normalized not in VALID_INDUSTRIES:
            raise ValueError(f"industry must be one of {sorted(VALID_INDUSTRIES)}")
        return normalized

    @field_validator("audience")
    @classmethod
    def audience_must_be_bounded(cls, value: str) -> str:
        stripped = value.strip()
        if len(stripped) > 160:
            raise ValueError("audience must be <= 160 characters")
        return stripped

    @field_validator("goal")
    @classmethod
    def goal_must_be_supported(cls, value: str) -> str:
        normalized = value.strip() or "traffic"
        if normalized not in VALID_GOALS:
            raise ValueError(f"goal must be one of {sorted(VALID_GOALS)}")
        return normalized

    @field_validator("voice_profile")
    @classmethod
    def voice_profile_must_be_supported(cls, value: str) -> str:
        normalized = value.strip() or "default"
        if normalized not in VALID_VOICE_PROFILES:
            raise ValueError(f"voice_profile must be one of {sorted(VALID_VOICE_PROFILES)}")
        return normalized

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


def _require_unified_dependencies(core_client) -> None:
    try:
        core_client.ensure_pipeline_available()
        core_client.ensure_instagram_available()
        core_client.ensure_seo_available()
        core_client.ensure_threads_available()
        core_client.ensure_facebook_available()
    except (CoreClientUnavailableError, CoreClientNotImplementedError) as exc:
        raise HTTPException(
            status_code=503,
            detail="Unified generation is temporarily unavailable because one or more core capabilities are not ready.",
        ) from exc


def _voice_context(req: UnifiedGenerateRequest) -> dict[str, object]:
    context: dict[str, object] = {
        "name": req.voice_profile,
        "industry": req.industry,
        "audience": req.audience,
        "goal": req.goal,
        "locale": req.locale,
    }
    if req.voice_profile == "law_firm":
        context["required_disclaimer"] = LAW_FIRM_DISCLAIMER
        context["tone"] = "professional, approachable, knowledgeable, reassuring"
    return context


def _planner_idea(req: UnifiedGenerateRequest) -> str:
    audience = req.audience or "一般受眾"
    return (
        f"核心想法：{req.idea}\n"
        f"產業：{req.industry}\n"
        f"目標受眾：{audience}\n"
        f"內容目標：{req.goal}\n"
        f"語氣設定：{req.voice_profile}\n"
        f"{'必要聲明：' + LAW_FIRM_DISCLAIMER if req.voice_profile == 'law_firm' else ''}\n"
        "請規劃成可延展到 Instagram、SEO 文章、Threads 與 Facebook 的內容 brief。"
    )


def _build_brief(core_client, req: UnifiedGenerateRequest) -> dict[str, object]:
    # The public backend asks the existing planner for a brief, then keeps the
    # rest of the orchestration at product-level platform boundaries.
    planner_events = core_client.stream_core_pipeline(
        _planner_idea(req),
        req.voice_profile,
        req.locale,
    )
    try:
        for event in planner_events:
            if event.get("event") == "planner_completed":
                data = event.get("data") if isinstance(event.get("data"), dict) else {}
                brief = data.get("brief")
                if isinstance(brief, dict):
                    return brief
                return data
    finally:
        close = getattr(planner_events, "close", None)
        if callable(close):
            close()

    raise RuntimeError("Planner did not return a brief.")


def _instagram_template(req: UnifiedGenerateRequest, brief: dict[str, object]) -> str:
    audience = req.audience or "一般受眾"
    return (
        f"請根據內容 brief 產出 Instagram 內容。\n"
        f"主題：{req.idea}\n"
        f"產業：{req.industry}\n"
        f"受眾：{audience}\n"
        f"內容目標：{req.goal}\n"
        f"語氣：{req.voice_profile}\n"
        f"{'每份法律內容都必須自然包含這段聲明：' + LAW_FIRM_DISCLAIMER if req.voice_profile == 'law_firm' else ''}\n"
        f"Brief：{json.dumps(brief, ensure_ascii=False)}\n"
        "輸出需包含 caption、5 張 carousel、hashtags 與 reel script。"
    )


def _append_disclaimer(text: object) -> str:
    value = text.strip() if isinstance(text, str) else ""
    if LAW_FIRM_DISCLAIMER in value:
        return value
    return f"{value}\n\n{LAW_FIRM_DISCLAIMER}".strip()


def _apply_law_firm_disclaimer(
    req: UnifiedGenerateRequest,
    platform: str,
    content: dict[str, object],
) -> dict[str, object]:
    if req.voice_profile != "law_firm":
        return content

    next_content = dict(content)
    if platform == "instagram":
        next_content["caption"] = _append_disclaimer(next_content.get("caption"))
    elif platform == "seo":
        next_content["cta"] = _append_disclaimer(next_content.get("cta"))
    elif platform == "threads":
        posts = next_content.get("posts")
        if isinstance(posts, list) and posts:
            next_posts = [dict(post) if isinstance(post, dict) else post for post in posts]
            last_post = next_posts[-1]
            if isinstance(last_post, dict):
                last_post["content"] = _append_disclaimer(last_post.get("content"))
                next_content["posts"] = next_posts
    elif platform == "facebook":
        next_content["body"] = _append_disclaimer(next_content.get("body"))
    return next_content


def _validate_platform_output(platform: str, content: dict[str, object]) -> dict[str, object]:
    if platform == "instagram":
        return validate_instagram_generation_payload(content)
    if platform == "seo":
        return validate_seo_article_payload(content)
    if platform == "threads":
        return validate_threads_content_payload(content)
    if platform == "facebook":
        return validate_facebook_post_payload(content)
    return content


def _generate_validated_platform(platform: str, generate_content) -> dict[str, object]:
    last_content = None
    for attempt in range(2):
        content = generate_content()
        last_content = content
        try:
            return _validate_platform_output(platform, content)
        except ValueError:
            if attempt == 0:
                logger.warning("unified %s output validation failed; retrying once", platform)
                continue
            logger.exception("unified %s output validation failed after retry", platform)
            partial = dict(last_content or {})
            partial["warning"] = "Output did not pass strict validation after retry."
            return partial


def _generate_instagram(core_client, req: UnifiedGenerateRequest, brief: dict[str, object]) -> dict[str, object]:
    generation_request = core_client.build_instagram_generation_request(
        topic=req.idea,
        template_text=_instagram_template(req, brief),
        goal="conversion" if req.goal == "conversion" else "engagement",
        style_examples=[],
    )
    style_analysis = core_client.analyze_instagram_style(
        template_text=generation_request.template_text,
        style_examples=generation_request.style_examples,
    )
    content = _generate_validated_platform(
        "instagram",
        lambda: core_client.generate_instagram_content(
            generation_request=generation_request,
            localized_template_text=append_locale_instruction(
                generation_request.template_text,
                req.locale,
            ),
            style_analysis=style_analysis,
            locale=req.locale,
        ),
    )
    return _apply_law_firm_disclaimer(req, "instagram", content)


def _generate_seo(core_client, req: UnifiedGenerateRequest, brief: dict[str, object]) -> dict[str, object]:
    generation_request = core_client.build_seo_generation_request(
        topic=req.idea,
        goal="conversion" if req.goal == "conversion" else "authority",
        locale=req.locale,
    )
    content = _generate_validated_platform(
        "seo",
        lambda: core_client.generate_seo_article(
            generation_request=generation_request,
            brief_context={
                "brief": brief,
                "industry": req.industry,
                "audience": req.audience,
                "goal": req.goal,
                "locale": req.locale,
                "surface": "generate-all",
            },
            voice_profile=_voice_context(req),
        ),
    )
    return _apply_law_firm_disclaimer(req, "seo", content)


def _generate_threads(core_client, req: UnifiedGenerateRequest, brief: dict[str, object]) -> dict[str, object]:
    generation_request = core_client.build_threads_generation_request(
        topic=req.idea,
        goal="share" if req.goal == "traffic" else "engagement",
        locale=req.locale,
    )
    content = _generate_validated_platform(
        "threads",
        lambda: core_client.generate_threads_content(
            generation_request=generation_request,
            brief_context={
                "brief": brief,
                "industry": req.industry,
                "audience": req.audience,
                "goal": req.goal,
                "locale": req.locale,
                "surface": "generate-all",
            },
            voice_profile=_voice_context(req),
        ),
    )
    return _apply_law_firm_disclaimer(req, "threads", content)


def _extract_instagram_caption(instagram_content: dict[str, object]) -> str:
    caption = instagram_content.get("caption")
    if not isinstance(caption, str) or not caption.strip():
        raise ValueError("instagram caption is required for Facebook adaptation")
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


def _generate_facebook(
    core_client,
    req: UnifiedGenerateRequest,
    brief: dict[str, object],
    instagram_content: dict[str, object],
) -> dict[str, object]:
    generation_request = core_client.build_facebook_generation_request(
        topic=req.idea,
        locale=req.locale,
    )
    content = _generate_validated_platform(
        "facebook",
        lambda: core_client.generate_facebook_content(
            generation_request=generation_request,
            brief_context={
                "brief": brief,
                "industry": req.industry,
                "audience": req.audience,
                "goal": req.goal,
                "locale": req.locale,
                "surface": "generate-all",
                "source_platform": "instagram",
            },
            instagram_caption=_extract_instagram_caption(instagram_content),
            carousel_summary=_build_carousel_summary(instagram_content),
            voice_profile=_voice_context(req),
        ),
    )
    return _apply_law_firm_disclaimer(req, "facebook", content)


async def _run_platform(name: str, func, *args):
    try:
        return name, await asyncio.to_thread(func, *args), None
    except Exception as exc:
        logger.exception("unified platform generation failed platform=%s", name)
        return name, None, exc


@router.post("/api/generate-all")
async def generate_all(req: UnifiedGenerateRequest, request: Request):
    core_client = _get_core_client()
    _require_unified_dependencies(core_client)
    if core_client.requires_local_api_key:
        _require_anthropic_api_key()
    demo_surface = require_demo_access(
        request,
        default_surface="landing",
        allowed_surfaces={"landing", "instagram", "threads", "facebook", "legal"},
    )
    concurrency_lease = await enforce_generation_limits(request, CORE_ROUTE_KEY)

    logger.info(
        "unified generation request accepted %s",
        format_log_fields(
            {
                "pipeline": "generate-all",
                "request_id": get_request_id(),
                "idea_length": len(req.idea),
                "industry": req.industry,
                "goal": req.goal,
                "voice_profile": req.voice_profile,
                "locale": req.locale,
                "demo_surface": demo_surface,
                "core_client_mode": core_client.mode,
                "path": request.url.path,
            }
        ),
    )

    async def stream():
        outputs: dict[str, object] = {}
        errors: dict[str, object] = {}
        all_tasks: list[asyncio.Task] = []
        try:
            brief = await asyncio.to_thread(_build_brief, core_client, req)
            outputs["brief"] = brief
            yield _sse("brief_ready", {"brief": brief})

            ig_task = asyncio.create_task(_run_platform("instagram", _generate_instagram, core_client, req, brief))
            all_tasks.append(ig_task)
            seo_task = asyncio.create_task(_run_platform("seo", _generate_seo, core_client, req, brief))
            all_tasks.append(seo_task)
            threads_task = asyncio.create_task(_run_platform("threads", _generate_threads, core_client, req, brief))
            all_tasks.append(threads_task)
            task_to_platform: dict[asyncio.Task, str] = {
                ig_task: "instagram",
                seo_task: "seo",
                threads_task: "threads",
            }
            facebook_started = False

            while task_to_platform:
                done, _ = await asyncio.wait(
                    task_to_platform.keys(),
                    return_when=asyncio.FIRST_COMPLETED,
                )
                for task in done:
                    platform = task_to_platform.pop(task)
                    _, result, exc = task.result()

                    if exc is not None:
                        error_code, safe_message = public_generation_error(platform)
                        errors[platform] = {
                            "stage": platform,
                            "error_code": error_code,
                            "message": safe_message,
                        }
                        yield _sse(
                            "platform_error",
                            {
                                "platform": platform,
                                **errors[platform],
                            },
                        )
                        if platform == "instagram" and not facebook_started:
                            errors["facebook"] = {
                                "stage": "facebook",
                                "error_code": "FACEBOOK_SOURCE_UNAVAILABLE",
                                "message": "Facebook generation needs Instagram output first.",
                            }
                            yield _sse(
                                "platform_error",
                                {
                                    "platform": "facebook",
                                    **errors["facebook"],
                                },
                            )
                        continue

                    outputs[platform] = result
                    yield _sse(f"{platform}_ready", result)

                    if platform == "instagram" and not facebook_started:
                        facebook_started = True
                        facebook_task = asyncio.create_task(
                            _run_platform("facebook", _generate_facebook, core_client, req, brief, result)
                        )
                        all_tasks.append(facebook_task)
                        task_to_platform[facebook_task] = "facebook"

            yield _sse("all_completed", {"brief": outputs.get("brief"), "outputs": outputs, "errors": errors})
        except Exception as exc:
            logger.exception("unified generation failed before completion")
            error_code, safe_message = public_generation_error("generate-all")
            yield _sse(
                "error",
                generation_error_payload(
                    stage="generate-all",
                    error_code=error_code,
                    message=safe_message,
                ),
            )
        finally:
            for task in all_tasks:
                if not task.done():
                    task.cancel()
            if all_tasks:
                await asyncio.gather(*all_tasks, return_exceptions=True)
            await concurrency_lease.release()

    return StreamingResponse(stream(), media_type="text/event-stream")
