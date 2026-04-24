"""Server-side carousel rendering endpoint."""

import asyncio
import base64
import io
import logging
import os
import zipfile

from fastapi import HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field

from ..core.instagram_pipeline import generate_instagram_content
from ..core.localization import DEFAULT_LOCALE
from ..core.template_registry import get_template
from .access_groups import build_gated_demo_router

router = build_gated_demo_router()
router.tags = ["render"]
logger = logging.getLogger(__name__)

_MAX_SLIDES = 10


def _int_env(name: str, default: int) -> int:
    raw = os.getenv(name)
    if not raw:
        return default
    try:
        value = int(raw)
        return value if value > 0 else default
    except ValueError:
        return default


_RENDER_TIMEOUT_SECONDS = _int_env("NEOXRA_RENDER_TIMEOUT_SECONDS", 90)


class SlideInput(BaseModel):
    title: str
    body: str
    text_alignment: str = "center"
    emphasis: str = "normal"


class RenderCarouselRequest(BaseModel):
    template_id: str
    slides: list[SlideInput]
    template_spec: dict | None = None
    output_size: int = Field(default=1080, ge=256, le=2160)


def _resolve_template_spec(request: RenderCarouselRequest) -> dict:
    """Resolve the template spec from either a built-in ID or a custom spec."""
    if request.template_id == "custom":
        if not request.template_spec:
            raise HTTPException(
                status_code=400,
                detail="template_spec is required when template_id is 'custom'.",
            )
        return request.template_spec

    template = get_template(request.template_id)
    if template is None:
        raise HTTPException(
            status_code=400,
            detail=f"Template '{request.template_id}' not found.",
        )
    return template["spec"]


def _build_color_palette(colors: dict):
    """Build a ColorPalette from a spec colors dict."""
    from neoxra_renderer import ColorPalette

    return ColorPalette(
        background=colors.get("background", "#1a1a2e"),
        text_primary=colors.get("text_primary", "#e8e8f0"),
        text_secondary=colors.get("text_secondary", "#b0b0c8"),
        accent=colors.get("accent", "#f5a623"),
        badge_bg=colors.get("badge_bg", "#4a90e2"),
        badge_text=colors.get("badge_text", "#ffffff"),
        accent_bar=colors.get("accent_bar", "#4a90e2"),
    )


def _build_full_render_request(
    spec_dict: dict,
    slides: list[SlideInput],
    output_size: int,
):
    """Build a FullRenderRequest from the resolved spec and slide inputs."""
    from neoxra_renderer import FullRenderRequest, SlideContent, TemplateSpec

    colors = _build_color_palette(spec_dict.get("colors", {}))
    layout = spec_dict.get("layout", {})
    typography = spec_dict.get("typography", {})

    template = TemplateSpec(
        id=spec_dict.get("id", "custom"),
        name=spec_dict.get("id", "Custom"),
    )
    template.colors = colors

    # Background / frame fields from custom uploaded templates.
    # Accept both snake_case (backend-originated) and camelCase (frontend-originated) keys.
    def _get(snake: str, camel: str):
        return spec_dict.get(snake, spec_dict.get(camel))

    bg_img = _get("background_image", "backgroundImage")
    if bg_img:
        template.background_image = bg_img
    bg_type = _get("background_type", "backgroundType")
    if bg_type:
        template.background_type = bg_type
    bg_overlay = _get("background_overlay_color", "backgroundOverlayColor")
    if bg_overlay:
        template.background_overlay_color = bg_overlay
    has_frame = _get("has_frame", "hasFrame")
    if has_frame is not None:
        template.has_frame = has_frame
    _FRAME_KEYS = [
        ("frame_inset", "frameInset"),
        ("frame_color", "frameColor"),
        ("frame_border_width", "frameBorderWidth"),
        ("frame_border_radius", "frameBorderRadius"),
        ("content_area_color", "contentAreaColor"),
        ("content_area_inset", "contentAreaInset"),
        ("content_area_border_radius", "contentAreaBorderRadius"),
    ]
    for snake, camel in _FRAME_KEYS:
        val = _get(snake, camel)
        if val is not None:
            setattr(template, snake, val)

    if layout.get("text_alignment"):
        template.title_slot.text_align = layout["text_alignment"]
        template.body_slot.text_align = layout["text_alignment"]

    if typography.get("title_weight") == "semibold":
        template.title_slot.font_weight = 600
    elif typography.get("title_weight") == "normal":
        template.title_slot.font_weight = 400

    if typography.get("title_size") == "small":
        template.title_slot.font_size = 48
    elif typography.get("title_size") == "medium":
        template.title_slot.font_size = 56

    if typography.get("body_size") == "small":
        template.body_slot.font_size = 22
    elif typography.get("body_size") == "large":
        template.body_slot.font_size = 34

    slide_contents = [
        SlideContent(
            index=i,
            total=len(slides),
            title=s.title,
            body=s.body,
            emphasis=s.emphasis,
            text_alignment=s.text_alignment,
        )
        for i, s in enumerate(slides)
    ]

    return FullRenderRequest(
        template=template,
        slides=slide_contents,
        output_size=output_size,
    )


def _package_zip(images: list[bytes]) -> io.BytesIO:
    """Package PNG images into a ZIP file in memory."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for i, png_bytes in enumerate(images):
            zf.writestr(f"slide-{str(i + 1).zfill(2)}.png", png_bytes)
    buf.seek(0)
    return buf


@router.post("/api/render/carousel")
async def render_carousel_endpoint(request: RenderCarouselRequest):
    if not request.slides:
        raise HTTPException(status_code=400, detail="At least one slide is required.")

    if len(request.slides) > _MAX_SLIDES:
        raise HTTPException(
            status_code=400,
            detail=f"Maximum {_MAX_SLIDES} slides per request.",
        )

    spec_dict = _resolve_template_spec(request)

    try:
        from neoxra_renderer import render_carousel
    except ImportError:
        raise HTTPException(
            status_code=503,
            detail="Server-side rendering is not available. neoxra-renderer is not installed.",
        )

    full_request = _build_full_render_request(spec_dict, request.slides, request.output_size)

    try:
        response = await asyncio.wait_for(
            render_carousel(full_request),
            timeout=_RENDER_TIMEOUT_SECONDS,
        )
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=504,
            detail="Rendering timed out. Please try with fewer slides.",
        )
    except Exception as exc:
        logger.exception("Carousel rendering failed")
        raise HTTPException(
            status_code=500,
            detail=f"Carousel rendering failed: {exc}",
        ) from exc

    zip_buf = _package_zip(response.images)

    return StreamingResponse(
        zip_buf,
        media_type="application/zip",
        headers={"Content-Disposition": 'attachment; filename="carousel.zip"'},
    )


# ---------------------------------------------------------------------------
# Combined generate-and-render endpoint
# ---------------------------------------------------------------------------

_GENERATE_AND_RENDER_TIMEOUT_SECONDS = _int_env("NEOXRA_GENERATE_AND_RENDER_TIMEOUT_SECONDS", 120)


class GenerateAndRenderRequest(BaseModel):
    topic: str
    template_id: str = "editorial-green"
    template_spec: dict | None = None
    goal: str = "engagement"
    locale: str = DEFAULT_LOCALE
    reference_image_description: str = ""


def _resolve_template_spec_for_generate(
    template_id: str,
    template_spec: dict | None,
) -> dict:
    """Resolve template spec, same logic as _resolve_template_spec but from raw args."""
    if template_id == "custom":
        if not template_spec:
            raise HTTPException(
                status_code=400,
                detail="template_spec is required when template_id is 'custom'.",
            )
        return template_spec

    template = get_template(template_id)
    if template is None:
        raise HTTPException(
            status_code=400,
            detail=f"Template '{template_id}' not found.",
        )
    return template["spec"]


async def _render_images(
    slides: list[dict],
    spec_dict: dict,
    output_size: int = 1080,
) -> list[bytes]:
    """Render carousel slides to PNG images using neoxra-renderer."""
    try:
        from neoxra_renderer import render_carousel
    except ImportError:
        raise HTTPException(
            status_code=503,
            detail="Server-side rendering is not available. neoxra-renderer is not installed.",
        )

    slide_inputs = [
        SlideInput(
            title=s.get("title", ""),
            body=s.get("body", ""),
            text_alignment=s.get("text_alignment", "center"),
            emphasis=s.get("emphasis", "normal"),
        )
        for s in slides
    ]

    full_request = _build_full_render_request(spec_dict, slide_inputs, output_size)

    try:
        response = await asyncio.wait_for(
            render_carousel(full_request),
            timeout=_RENDER_TIMEOUT_SECONDS,
        )
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=504,
            detail="Rendering timed out.",
        )
    except Exception as exc:
        logger.exception("Carousel rendering failed during generate-and-render")
        raise HTTPException(
            status_code=500,
            detail="Carousel rendering failed.",
        ) from exc

    return response.images


@router.post("/api/instagram/generate-and-render")
async def generate_and_render(request: GenerateAndRenderRequest):
    if not request.topic or not request.topic.strip():
        raise HTTPException(status_code=400, detail="topic must not be empty.")

    spec_dict = _resolve_template_spec_for_generate(
        request.template_id,
        request.template_spec,
    )

    # Step 1: Generate content
    try:
        result = await asyncio.wait_for(
            generate_instagram_content(
                topic=request.topic.strip(),
                goal=request.goal,
                locale=request.locale,
                reference_image_description=request.reference_image_description,
            ),
            timeout=_GENERATE_AND_RENDER_TIMEOUT_SECONDS,
        )
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=504,
            detail="Content generation timed out.",
        )

    content = result.content
    carousel_outline = content.get("carousel_outline", [])

    # Step 2: Render images (best-effort — return content even if rendering fails)
    rendered_images: list[str] = []
    render_error: str | None = None

    if carousel_outline:
        try:
            images = await _render_images(carousel_outline, spec_dict)
            rendered_images = [
                f"data:image/png;base64,{base64.b64encode(img).decode()}"
                for img in images
            ]
        except HTTPException as exc:
            logger.warning(
                "Rendering failed during generate-and-render, returning content only: %s",
                exc.detail,
            )
            render_error = exc.detail
        except Exception as exc:
            logger.exception("Unexpected rendering error in generate-and-render")
            render_error = str(exc)

    response_data: dict = {
        "content": content,
        "rendered_images": rendered_images,
        "slide_count": len(rendered_images) if rendered_images else len(carousel_outline),
    }
    if render_error:
        response_data["render_error"] = render_error

    return JSONResponse(response_data)


# ---------------------------------------------------------------------------
# Overlay rendering models
# ---------------------------------------------------------------------------


class TextLineInput(BaseModel):
    text: str
    emphasis: bool = False
    partial_emphasis: str = ""


class OverlayTextZoneInput(BaseModel):
    y_start: int
    y_end: int
    x_left: int = 72
    x_right: int = 72
    font_size: int = 28
    font_weight: int = 700
    line_height: float = 1.65
    text_align: str = "center"
    color: str = "#FFFFFF"
    emphasis_color: str = "#FFD700"


class OverlaySlideInput(BaseModel):
    title: str = ""
    lines: list[TextLineInput]


class RenderOverlayRequest(BaseModel):
    template_image: str
    slides: list[OverlaySlideInput]
    title_zone: OverlayTextZoneInput
    content_zone: OverlayTextZoneInput
    watermark: str = ""
    watermark_color: str = "rgba(255,255,255,0.6)"
    watermark_x: int = 900
    watermark_y: int = 1040
    watermark_font_size: int = 24
    output_size: int = Field(default=1080, ge=256, le=2160)


# ---------------------------------------------------------------------------
# Overlay rendering endpoint
# ---------------------------------------------------------------------------


@router.post("/api/render/overlay")
async def render_overlay_endpoint(request: RenderOverlayRequest):
    """Render slides using overlay mode — template image + text overlay."""
    if not request.slides:
        raise HTTPException(status_code=400, detail="At least one slide is required.")
    if len(request.slides) > _MAX_SLIDES:
        raise HTTPException(
            status_code=400,
            detail=f"Maximum {_MAX_SLIDES} slides per request.",
        )
    if not request.template_image:
        raise HTTPException(status_code=400, detail="template_image is required.")
    if not request.template_image.startswith("data:image/"):
        raise HTTPException(
            status_code=400,
            detail="template_image must be a base64 data URL (data:image/png;base64,...).",
        )

    try:
        from neoxra_renderer import render_overlay as do_render_overlay
        from neoxra_renderer import (
            OverlayRenderRequest as RendererOverlayRequest,
            OverlaySlide,
            OverlayTextZone,
            TextLine,
        )
    except ImportError:
        raise HTTPException(
            status_code=503,
            detail="Server-side rendering is not available. neoxra-renderer is not installed.",
        )

    renderer_slides = [
        OverlaySlide(
            title=s.title,
            lines=[
                TextLine(
                    text=line.text,
                    emphasis=line.emphasis,
                    partial_emphasis=line.partial_emphasis,
                )
                for line in s.lines
            ],
        )
        for s in request.slides
    ]

    renderer_request = RendererOverlayRequest(
        template_image=request.template_image,
        slides=renderer_slides,
        title_zone=OverlayTextZone(
            y_start=request.title_zone.y_start,
            y_end=request.title_zone.y_end,
            x_left=request.title_zone.x_left,
            x_right=request.title_zone.x_right,
            font_size=request.title_zone.font_size,
            font_weight=request.title_zone.font_weight,
            line_height=request.title_zone.line_height,
            text_align=request.title_zone.text_align,
            color=request.title_zone.color,
            emphasis_color=request.title_zone.emphasis_color,
        ),
        content_zone=OverlayTextZone(
            y_start=request.content_zone.y_start,
            y_end=request.content_zone.y_end,
            x_left=request.content_zone.x_left,
            x_right=request.content_zone.x_right,
            font_size=request.content_zone.font_size,
            font_weight=request.content_zone.font_weight,
            line_height=request.content_zone.line_height,
            text_align=request.content_zone.text_align,
            color=request.content_zone.color,
            emphasis_color=request.content_zone.emphasis_color,
        ),
        watermark=request.watermark,
        watermark_color=request.watermark_color,
        watermark_x=request.watermark_x,
        watermark_y=request.watermark_y,
        watermark_font_size=request.watermark_font_size,
        output_size=request.output_size,
    )

    try:
        response = await asyncio.wait_for(
            do_render_overlay(renderer_request),
            timeout=_RENDER_TIMEOUT_SECONDS,
        )
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="Rendering timed out.")
    except Exception as exc:
        logger.exception("Overlay rendering failed")
        raise HTTPException(
            status_code=500,
            detail=f"Overlay rendering failed: {exc}",
        ) from exc

    zip_buf = _package_zip(response.images)
    return StreamingResponse(
        zip_buf,
        media_type="application/zip",
        headers={"Content-Disposition": 'attachment; filename="overlay-carousel.zip"'},
    )
