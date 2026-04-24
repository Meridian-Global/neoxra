"""Template management API endpoints."""

import base64
import json
import logging
import os

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from ..core.template_parsing_prompt import TEMPLATE_PARSE_PROMPT, map_parsed_to_template_spec
from ..core.template_registry import get_template, list_templates

router = APIRouter(tags=["templates"])
logger = logging.getLogger(__name__)

_ALLOWED_IMAGE_TYPES = {"image/png", "image/jpeg"}
_MAX_IMAGE_BYTES = 5 * 1024 * 1024


def _require_anthropic_api_key() -> None:
    if os.getenv("ANTHROPIC_API_KEY"):
        return
    raise HTTPException(
        status_code=503,
        detail="ANTHROPIC_API_KEY is not configured for this service.",
    )


@router.get("/api/templates")
async def get_templates():
    return JSONResponse({"templates": list_templates()})


@router.get("/api/templates/{template_id}")
async def get_template_detail(template_id: str):
    template = get_template(template_id)
    if template is None:
        raise HTTPException(status_code=404, detail=f"Template '{template_id}' not found.")
    return JSONResponse(template)


@router.post("/api/templates/parse-image")
async def parse_template_image(file: UploadFile = File(...)):
    if file.content_type not in _ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=415, detail="Only PNG and JPG images are supported.")

    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=422, detail="Uploaded image cannot be empty.")
    if len(image_bytes) > _MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Image must be 5MB or smaller.")

    _require_anthropic_api_key()

    try:
        from anthropic import Anthropic

        client = Anthropic()
        response = client.messages.create(
            model=os.getenv("ANTHROPIC_VISION_MODEL", "claude-sonnet-4-20250514"),
            max_tokens=1024,
            temperature=0,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": file.content_type,
                                "data": base64.b64encode(image_bytes).decode("ascii"),
                            },
                        },
                        {
                            "type": "text",
                            "text": TEMPLATE_PARSE_PROMPT,
                        },
                    ],
                }
            ],
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Template image parsing failed")
        raise HTTPException(
            status_code=503,
            detail="Template image parsing is temporarily unavailable.",
        ) from exc

    raw_text = ""
    for block in getattr(response, "content", []) or []:
        text = getattr(block, "text", None)
        if text:
            raw_text += text

    if not raw_text.strip():
        raise HTTPException(
            status_code=503,
            detail="Template image parsing returned no usable result.",
        )

    try:
        parsed = json.loads(raw_text.strip())
    except json.JSONDecodeError:
        logger.warning("Vision API returned non-JSON for template parsing: %s", raw_text[:200])
        raise HTTPException(
            status_code=502,
            detail="Template image parsing returned an invalid response.",
        )

    template_spec = map_parsed_to_template_spec(parsed)
    confidence = _estimate_confidence(parsed)
    description = _build_description(parsed)

    return JSONResponse({
        "template_spec": template_spec,
        "parsing_confidence": confidence,
        "description": description,
    })


def _estimate_confidence(parsed: dict) -> float:
    """Estimate parsing confidence based on how many expected fields are present."""
    expected_sections = ["colors", "layout", "typography", "style"]
    present = sum(1 for s in expected_sections if s in parsed and parsed[s])
    base = present / len(expected_sections)

    color_keys = {"background", "text_primary", "text_secondary", "accent"}
    colors = parsed.get("colors") or {}
    color_coverage = sum(1 for k in color_keys if k in colors) / len(color_keys)

    return round(base * 0.6 + color_coverage * 0.4, 2)


def _build_description(parsed: dict) -> str:
    """Build a human-readable description from parsed template data."""
    mood = (parsed.get("style") or {}).get("overall_mood", "custom")
    bg = (parsed.get("colors") or {}).get("background", "unknown")
    accent = (parsed.get("colors") or {}).get("accent", "unknown")
    alignment = (parsed.get("layout") or {}).get("text_alignment", "left")

    return (
        f"{mood.capitalize()} template with {alignment}-aligned text, "
        f"background {bg}, accent {accent}."
    )
