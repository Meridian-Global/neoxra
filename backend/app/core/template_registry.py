"""Built-in template registry for the carousel template gallery."""

from __future__ import annotations

BUILT_IN_TEMPLATES: dict[str, dict] = {
    "professional-dark": {
        "id": "professional-dark",
        "name": "Professional Dark",
        "name_zh": "專業深色",
        "preview_colors": {
            "background": "#101828",
            "text_primary": "#F8FAFC",
            "accent": "#D6B981",
        },
        "style": "professional",
        "spec": {
            "colors": {
                "background": "#101828",
                "text_primary": "#F8FAFC",
                "text_secondary": "#CBD5E1",
                "accent": "#D6B981",
                "badge_bg": "#D6B981",
                "badge_text": "#111827",
                "accent_bar": "#D6B981",
            },
            "layout": {
                "text_alignment": "left",
                "title_position": "center",
                "badge_position": "top-left",
                "has_accent_bar": True,
                "has_border_frame": False,
                "has_watermark": False,
            },
            "typography": {
                "title_size": "large",
                "title_weight": "bold",
                "body_size": "medium",
            },
            "style": {
                "overall_mood": "professional",
            },
        },
    },
    "bold-gradient": {
        "id": "bold-gradient",
        "name": "Bold Gradient",
        "name_zh": "醒目漸層",
        "preview_colors": {
            "background": "#111827",
            "text_primary": "#FFFFFF",
            "accent": "#FDE68A",
        },
        "style": "bold",
        "spec": {
            "colors": {
                "background": "linear-gradient(135deg, #111827 0%, #8A4B2A 52%, #D6B981 100%)",
                "text_primary": "#FFFFFF",
                "text_secondary": "#FFF7ED",
                "accent": "#FDE68A",
                "badge_bg": "#FDE68A",
                "badge_text": "#111827",
                "accent_bar": "#FDE68A",
            },
            "layout": {
                "text_alignment": "left",
                "title_position": "center",
                "badge_position": "top-left",
                "has_accent_bar": True,
                "has_border_frame": False,
                "has_watermark": False,
            },
            "typography": {
                "title_size": "large",
                "title_weight": "bold",
                "body_size": "medium",
            },
            "style": {
                "overall_mood": "bold",
            },
        },
    },
    "minimal-light": {
        "id": "minimal-light",
        "name": "Minimal Light",
        "name_zh": "極簡淺色",
        "preview_colors": {
            "background": "#F7F1E8",
            "text_primary": "#1F2937",
            "accent": "#8A6A3D",
        },
        "style": "minimal",
        "spec": {
            "colors": {
                "background": "#F7F1E8",
                "text_primary": "#1F2937",
                "text_secondary": "#5F5A52",
                "accent": "#8A6A3D",
                "badge_bg": "#8A6A3D",
                "badge_text": "#FFFFFF",
                "accent_bar": "#8A6A3D",
            },
            "layout": {
                "text_alignment": "center",
                "title_position": "center",
                "badge_position": "top-left",
                "has_accent_bar": True,
                "has_border_frame": False,
                "has_watermark": False,
            },
            "typography": {
                "title_size": "medium",
                "title_weight": "semibold",
                "body_size": "medium",
            },
            "style": {
                "overall_mood": "minimal",
            },
        },
    },
    "emerald-editorial": {
        "id": "emerald-editorial",
        "name": "Emerald Editorial",
        "name_zh": "翡翠編輯",
        "preview_colors": {
            "background": "#022C22",
            "text_primary": "#ECFDF5",
            "accent": "#6EE7B7",
        },
        "style": "editorial",
        "spec": {
            "colors": {
                "background": "#022C22",
                "text_primary": "#ECFDF5",
                "text_secondary": "#A7F3D0",
                "accent": "#6EE7B7",
                "badge_bg": "#6EE7B7",
                "badge_text": "#022C22",
                "accent_bar": "#6EE7B7",
            },
            "layout": {
                "text_alignment": "left",
                "title_position": "center",
                "badge_position": "top-left",
                "has_accent_bar": True,
                "has_border_frame": True,
                "has_watermark": False,
            },
            "typography": {
                "title_size": "large",
                "title_weight": "bold",
                "body_size": "medium",
            },
            "style": {
                "overall_mood": "editorial",
            },
        },
    },
    "neon-purple": {
        "id": "neon-purple",
        "name": "Neon Purple",
        "name_zh": "霓虹紫",
        "preview_colors": {
            "background": "#1A0533",
            "text_primary": "#F5F3FF",
            "accent": "#C084FC",
        },
        "style": "playful",
        "spec": {
            "colors": {
                "background": "linear-gradient(135deg, #1A0533 0%, #3B0764 50%, #6B21A8 100%)",
                "text_primary": "#F5F3FF",
                "text_secondary": "#DDD6FE",
                "accent": "#C084FC",
                "badge_bg": "#C084FC",
                "badge_text": "#1A0533",
                "accent_bar": "#C084FC",
            },
            "layout": {
                "text_alignment": "left",
                "title_position": "center",
                "badge_position": "top-left",
                "has_accent_bar": True,
                "has_border_frame": False,
                "has_watermark": False,
            },
            "typography": {
                "title_size": "large",
                "title_weight": "bold",
                "body_size": "large",
            },
            "style": {
                "overall_mood": "playful",
            },
        },
    },
}


def get_template(template_id: str) -> dict | None:
    return BUILT_IN_TEMPLATES.get(template_id)


def list_templates() -> list[dict]:
    return [
        {
            "id": t["id"],
            "name": t["name"],
            "name_zh": t["name_zh"],
            "preview_colors": t["preview_colors"],
            "style": t["style"],
        }
        for t in BUILT_IN_TEMPLATES.values()
    ]
