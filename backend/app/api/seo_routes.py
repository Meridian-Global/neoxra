import asyncio
import json
import logging
import os
import queue
from typing import Callable

from fastapi import HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, ConfigDict, field_validator

from ..core.demo_access import require_demo_access
from ..core.error_handling import generation_error_payload, public_generation_error
from ..core.localization import DEFAULT_LOCALE, validate_locale
from ..core.logging_utils import format_log_fields, get_request_id
from ..core.output_validation import validate_seo_article_payload
from ..core_client import (
    CoreClientNotImplementedError,
    CoreClientUnavailableError,
    get_core_client,
)
from .access_groups import build_gated_demo_router

router = build_gated_demo_router()
logger = logging.getLogger(__name__)


def _validate_with_retry(
    generate_article: Callable[[], dict[str, object]],
    *,
    platform: str,
    on_retry: Callable[[], None] | None = None,
) -> tuple[dict[str, object], bool]:
    last_article = None
    for attempt in range(2):
        if attempt > 0 and on_retry is not None:
            on_retry()
        article = generate_article()
        last_article = article
        try:
            return validate_seo_article_payload(article), attempt > 0
        except ValueError:
            if attempt == 0:
                logger.warning("%s output validation failed; retrying once", platform)
                continue
            logger.exception("%s output validation failed after retry", platform)
            partial = dict(last_article or {})
            partial["warning"] = "Output did not pass strict validation after retry."
            return partial, True


class SeoGenerateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    topic: str
    goal: str = "authority"
    locale: str = DEFAULT_LOCALE

    @field_validator("topic", "goal")
    @classmethod
    def must_not_be_blank(cls, value: str, info) -> str:
        if not value or not value.strip():
            raise ValueError(f"{info.field_name} must not be empty or whitespace-only")
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


def _require_seo_dependencies(core_client=None) -> None:
    if core_client is None:
        core_client = _get_core_client()
    try:
        core_client.ensure_seo_available()
        return
    except (CoreClientUnavailableError, CoreClientNotImplementedError) as exc:
        if core_client.mode == "local":
            raise HTTPException(
                status_code=503,
                detail="SEO generation is temporarily unavailable because the core AI package is not ready.",
            ) from exc
        raise HTTPException(
            status_code=503,
            detail="SEO generation is temporarily unavailable because the selected core adapter is not ready.",
        ) from exc


@router.post("/api/seo/generate")
async def seo_generate(req: SeoGenerateRequest, request: Request):
    core_client = _get_core_client()
    _require_seo_dependencies(core_client)
    if core_client.requires_local_api_key:
        _require_anthropic_api_key()
    demo_surface = require_demo_access(
        request,
        default_surface="instagram",
        allowed_surfaces={"landing", "instagram", "legal"},
    )

    logger.info(
        "seo generation request accepted %s",
        format_log_fields(
            {
                "pipeline": "seo",
                "request_id": get_request_id(),
                "topic_length": len(req.topic),
                "goal": req.goal,
                "locale": req.locale,
                "demo_surface": demo_surface,
                "core_client_mode": core_client.mode,
                "path": request.url.path,
            }
        ),
    )

    try:
        generation_request = core_client.build_seo_generation_request(
            topic=req.topic,
            goal=req.goal,
            locale=req.locale,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="Request validation failed.") from exc

    async def stream():
        yield _sse(
            "phase_started",
            {
                "phase": "generation",
                "topic": generation_request.topic,
                "goal": generation_request.goal,
                "locale": generation_request.locale,
            },
        )

        event_queue: queue.Queue = queue.Queue()

        def on_section_ready(event_name: str, data: object) -> None:
            if hasattr(data, "to_dict"):
                data = data.to_dict()  # type: ignore[union-attr]
            elif hasattr(data, "__dataclass_fields__"):
                from dataclasses import asdict

                data = asdict(data)  # type: ignore[arg-type]
            event_queue.put((event_name, data))

        def on_retry() -> None:
            # Drain any events queued from the failed attempt and signal a reset.
            while True:
                try:
                    event_queue.get_nowait()
                except queue.Empty:
                    break
            event_queue.put(("retry_started", {}))

        def run_generation() -> tuple[dict, bool]:
            return _validate_with_retry(
                lambda: core_client.generate_seo_article(
                    generation_request=generation_request,
                    brief_context={
                        "goal": generation_request.goal,
                        "locale": generation_request.locale,
                        "demo_surface": demo_surface,
                    },
                    on_section_ready=on_section_ready,
                ),
                platform="seo",
                on_retry=on_retry,
            )

        loop = asyncio.get_running_loop()
        future = loop.run_in_executor(None, run_generation)

        # Drain section-ready events while generation runs in the background
        while not future.done():
            try:
                event_name, data = await loop.run_in_executor(
                    None, lambda: event_queue.get(timeout=1)
                )
                if event_name == "outline_ready":
                    yield _sse("outline_ready", data if isinstance(data, dict) else {})
                elif event_name == "section_ready":
                    yield _sse("section_ready", data if isinstance(data, dict) else {})
                elif event_name == "retry_started":
                    yield _sse("retry_started", {})
            except queue.Empty:
                continue

        # Drain remaining queued events
        while not event_queue.empty():
            try:
                event_name, data = event_queue.get_nowait()
                if event_name in ("outline_ready", "section_ready", "retry_started"):
                    yield _sse(event_name, data if isinstance(data, dict) else {})
            except queue.Empty:
                break

        try:
            article, had_retry = future.result()
        except Exception as exc:
            logger.exception("SEO pipeline failed before completion")
            error_code, safe_message = public_generation_error("seo")
            yield _sse(
                "error",
                generation_error_payload(
                    stage="seo",
                    error_code=error_code,
                    message=safe_message,
                ),
            )
            return

        yield _sse("article_ready", article)
        yield _sse(
            "pipeline_completed",
            {
                "article": article,
                "topic": generation_request.topic,
                "goal": generation_request.goal,
                "locale": generation_request.locale,
                "warning": article.get("warning"),
                "validation_retry": had_retry,
            },
        )

    return StreamingResponse(stream(), media_type="text/event-stream")
