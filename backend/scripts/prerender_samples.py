#!/usr/bin/env python3
"""Pre-render sample Instagram carousel images for all built-in templates.

Usage:
    cd backend
    python scripts/prerender_samples.py --output ../frontend/public/samples/instagram

Requires:
    - neoxra-renderer (pip install -e ../neoxra-renderer)
    - playwright chromium (playwright install chromium)
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

# Ensure the backend package is importable
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.template_registry import BUILT_IN_TEMPLATES

ZH_SAMPLES = {
    "topic": "車禍理賠流程",
    "slides": [
        {"title": "車禍後別急和解", "body": "先確認安全、報警備案，再談後續責任與金額。"},
        {"title": "先把證據留完整", "body": "現場照片、車損、行車紀錄器、診斷證明都很關鍵。"},
        {"title": "理賠與求償分開看", "body": "保險理賠不等於完整賠償，醫療與工作損失也要算。"},
        {"title": "時效不要拖過", "body": "無論是告訴期間或民事求償，時間一過就會更被動。"},
        {"title": "需要協助就早一點問", "body": "涉及受傷、失能或責任爭議時，先讓律師幫你看方向。"},
    ],
}

EN_SAMPLES = {
    "topic": "Car accident compensation process",
    "slides": [
        {"title": "Do Not Settle Too Fast", "body": "Check safety, report the accident, and preserve the record first."},
        {"title": "Keep Evidence Complete", "body": "Photos, repairs, dashcam clips, and medical records matter."},
        {"title": "Claims Are Not Full Recovery", "body": "Insurance coverage may not include every loss you can claim."},
        {"title": "Watch The Timeline", "body": "Deadlines can affect your options if you wait too long."},
        {"title": "Ask Early When It Matters", "body": "Injury, disability, or disputed fault deserves early review."},
    ],
}

LOCALES = {"zh-TW": ZH_SAMPLES, "en": EN_SAMPLES}


def build_full_render_request(spec_dict: dict, slides: list[dict], output_size: int = 1080):
    """Build a FullRenderRequest from a template spec and slide dicts."""
    from neoxra_renderer import ColorPalette, FullRenderRequest, SlideContent, TemplateSpec

    colors_raw = spec_dict.get("colors", {})
    colors = ColorPalette(
        background=colors_raw.get("background", "#1a1a2e"),
        text_primary=colors_raw.get("text_primary", "#e8e8f0"),
        text_secondary=colors_raw.get("text_secondary", "#b0b0c8"),
        accent=colors_raw.get("accent", "#f5a623"),
        badge_bg=colors_raw.get("badge_bg", "#4a90e2"),
        badge_text=colors_raw.get("badge_text", "#ffffff"),
        accent_bar=colors_raw.get("accent_bar", "#4a90e2"),
    )

    layout = spec_dict.get("layout", {})
    typography = spec_dict.get("typography", {})

    template = TemplateSpec(
        id=spec_dict.get("id", "custom"),
        name=spec_dict.get("id", "Custom"),
    )
    template.colors = colors

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
            title=s["title"],
            body=s["body"],
            emphasis="normal",
            text_alignment="center",
        )
        for i, s in enumerate(slides)
    ]

    return FullRenderRequest(
        template=template,
        slides=slide_contents,
        output_size=output_size,
    )


async def render_template_locale(
    template_id: str,
    spec: dict,
    locale: str,
    slides: list[dict],
    output_dir: Path,
) -> list[str]:
    """Render slides for one template+locale combination, return relative paths."""
    from neoxra_renderer import render_carousel

    locale_dir = output_dir / template_id / locale
    locale_dir.mkdir(parents=True, exist_ok=True)

    request = build_full_render_request(spec, slides)
    response = await render_carousel(request)

    paths: list[str] = []
    for i, png_bytes in enumerate(response.images):
        filename = f"slide-{str(i + 1).zfill(2)}.png"
        file_path = locale_dir / filename
        file_path.write_bytes(png_bytes)
        rel_path = f"/samples/instagram/{template_id}/{locale}/{filename}"
        paths.append(rel_path)
        print(f"  wrote {file_path} ({len(png_bytes):,} bytes)")

    return paths


async def main(output_dir: str, template_ids: list[str] | None = None) -> None:
    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)

    targets = template_ids or list(BUILT_IN_TEMPLATES.keys())
    manifest: dict = {"templates": {}, "default_template": targets[0], "generated_at": ""}

    for tid in targets:
        template = BUILT_IN_TEMPLATES.get(tid)
        if not template:
            print(f"[skip] template '{tid}' not found in registry")
            continue

        spec = template["spec"]
        manifest["templates"][tid] = {}

        for locale, sample_data in LOCALES.items():
            print(f"[render] {tid} / {locale} ({len(sample_data['slides'])} slides)")
            paths = await render_template_locale(
                tid, spec, locale, sample_data["slides"], out
            )
            manifest["templates"][tid][locale] = {
                "topic": sample_data["topic"],
                "slides": paths,
            }

    manifest["generated_at"] = datetime.now(timezone.utc).isoformat()
    manifest_path = out / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False))
    print(f"\n[done] manifest written to {manifest_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Pre-render sample carousel images")
    parser.add_argument(
        "--output",
        default="../frontend/public/samples/instagram",
        help="Output directory for rendered PNGs and manifest",
    )
    parser.add_argument(
        "--templates",
        nargs="*",
        help="Specific template IDs to render (default: all)",
    )
    args = parser.parse_args()
    asyncio.run(main(args.output, args.templates))
