"""Prompt and mapping helpers for template image parsing via Vision API."""

from __future__ import annotations

TEMPLATE_PARSE_PROMPT = """
Analyze this Instagram carousel slide template image and extract its design properties.

Return a JSON object with exactly these fields:
{
  "colors": {
    "background": "hex color or CSS gradient string",
    "text_primary": "hex color for main title text",
    "text_secondary": "hex color for body/subtitle text",
    "accent": "hex color for accent elements",
    "badge_bg": "hex color for the slide number badge background",
    "badge_text": "hex color for the slide number badge text",
    "accent_bar": "hex color for any accent line/bar"
  },
  "layout": {
    "text_alignment": "left" | "center" | "right",
    "title_position": "top" | "center" | "bottom",
    "badge_position": "top-left" | "top-right" | "bottom-left" | "bottom-right",
    "has_accent_bar": true/false,
    "has_border_frame": true/false,
    "has_watermark": true/false
  },
  "typography": {
    "title_size": "large" | "medium" | "small",
    "title_weight": "bold" | "semibold" | "normal",
    "body_size": "large" | "medium" | "small"
  },
  "style": {
    "overall_mood": "professional" | "bold" | "minimal" | "editorial" | "playful"
  }
}

Respond ONLY with the JSON object. No markdown. No additional text.
"""

_DEFAULT_COLORS = {
    "background": "#101828",
    "text_primary": "#F8FAFC",
    "text_secondary": "#CBD5E1",
    "accent": "#D6B981",
    "badge_bg": "#D6B981",
    "badge_text": "#111827",
    "accent_bar": "#D6B981",
}

_DEFAULT_LAYOUT = {
    "text_alignment": "left",
    "title_position": "center",
    "badge_position": "top-left",
    "has_accent_bar": True,
    "has_border_frame": False,
    "has_watermark": False,
}

_DEFAULT_TYPOGRAPHY = {
    "title_size": "large",
    "title_weight": "bold",
    "body_size": "medium",
}

_DEFAULT_STYLE = {
    "overall_mood": "professional",
}


def map_parsed_to_template_spec(parsed: dict, template_id: str = "custom") -> dict:
    """Map a Vision API parsed result to a full TemplateSpec-compatible dict.

    Fills in defaults for any missing fields so the output is always complete.
    """
    colors = {**_DEFAULT_COLORS, **(parsed.get("colors") or {})}
    layout = {**_DEFAULT_LAYOUT, **(parsed.get("layout") or {})}
    typography = {**_DEFAULT_TYPOGRAPHY, **(parsed.get("typography") or {})}
    style = {**_DEFAULT_STYLE, **(parsed.get("style") or {})}

    return {
        "id": template_id,
        "colors": colors,
        "layout": layout,
        "typography": typography,
        "style": style,
    }
