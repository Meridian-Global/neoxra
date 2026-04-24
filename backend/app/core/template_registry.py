"""Built-in template registry for the carousel template gallery."""

from __future__ import annotations

BUILT_IN_TEMPLATES: dict[str, dict] = {
    "editorial-green": {
        "id": "editorial-green",
        "name": "Editorial Green",
        "name_zh": "社論綠",
        "style": "editorial",
        "preview_colors": {
            "background": "#3D7B4C",
            "text_primary": "#FFFFFF",
            "accent": "#FFFFFF",
        },
        "spec": {
            "colors": {
                "background": "#3D7B4C",
                "text_primary": "#FFFFFF",
                "text_secondary": "#E8F5E9",
                "accent": "#FFFFFF",
                "badge_bg": "#FFFFFF",
                "badge_text": "#3D7B4C",
                "accent_bar": "#FFFFFF",
            },
            "layout": {
                "text_alignment": "center",
                "title_position": "center",
                "badge_position": "top-left",
                "has_accent_bar": False,
            },
            "typography": {
                "title_size": "large",
                "title_weight": "bold",
                "body_size": "medium",
            },
            "background_type": "photo-overlay",
            "background_overlay_color": "rgba(45, 100, 60, 0.75)",
            "has_frame": True,
            "frame_inset": 56,
            "frame_color": "rgba(255,255,255,0.55)",
            "content_area_color": "#3D7B4C",
        },
    },
    "luxury-dark": {
        "id": "luxury-dark",
        "name": "Luxury Dark",
        "name_zh": "奢華深色",
        "style": "professional",
        "preview_colors": {
            "background": "#0F0F0F",
            "text_primary": "#FFFFFF",
            "accent": "#C9A96E",
        },
        "spec": {
            "colors": {
                "background": "#0F0F0F",
                "text_primary": "#FFFFFF",
                "text_secondary": "#A0A0A0",
                "accent": "#C9A96E",
                "badge_bg": "transparent",
                "badge_text": "#C9A96E",
                "accent_bar": "#C9A96E",
            },
            "layout": {
                "text_alignment": "left",
                "title_position": "center",
                "badge_position": "top-left",
                "has_accent_bar": True,
            },
            "typography": {
                "title_size": "large",
                "title_weight": "bold",
                "body_size": "medium",
                "font_hint": "serif",
            },
            "background_type": "solid",
            "has_frame": True,
            "frame_inset": 48,
            "frame_color": "rgba(201,169,110,0.5)",
            "content_area_color": "",
        },
    },
    "fresh-coral": {
        "id": "fresh-coral",
        "name": "Fresh Coral",
        "name_zh": "清新珊瑚",
        "style": "playful",
        "preview_colors": {
            "background": "#FF6B6B",
            "text_primary": "#2D2D2D",
            "accent": "#FFFFFF",
        },
        "spec": {
            "colors": {
                "background": "linear-gradient(160deg, #FF6B6B 0%, #FFB88C 100%)",
                "text_primary": "#2D2D2D",
                "text_secondary": "#555555",
                "accent": "#FF6B6B",
                "badge_bg": "#FF6B6B",
                "badge_text": "#FFFFFF",
                "accent_bar": "#FF6B6B",
            },
            "layout": {
                "text_alignment": "center",
                "title_position": "center",
                "badge_position": "top-left",
                "has_accent_bar": False,
            },
            "typography": {
                "title_size": "large",
                "title_weight": "bold",
                "body_size": "medium",
            },
            "background_type": "gradient",
            "has_frame": True,
            "frame_inset": 52,
            "frame_color": "rgba(255,255,255,0.85)",
            "content_area_color": "rgba(255,255,255,0.95)",
        },
    },
    "modern-minimal": {
        "id": "modern-minimal",
        "name": "Modern Minimal",
        "name_zh": "現代極簡",
        "style": "minimal",
        "preview_colors": {
            "background": "#FAFAFA",
            "text_primary": "#111111",
            "accent": "#111111",
        },
        "spec": {
            "colors": {
                "background": "#FAFAFA",
                "text_primary": "#111111",
                "text_secondary": "#444444",
                "accent": "#111111",
                "badge_bg": "#111111",
                "badge_text": "#FFFFFF",
                "accent_bar": "#111111",
            },
            "layout": {
                "text_alignment": "left",
                "title_position": "center",
                "badge_position": "top-left",
                "has_accent_bar": True,
            },
            "typography": {
                "title_size": "large",
                "title_weight": "bold",
                "body_size": "medium",
            },
            "background_type": "solid",
            "has_frame": False,
            "content_area_color": "",
        },
    },
    "ocean-editorial": {
        "id": "ocean-editorial",
        "name": "Ocean Editorial",
        "name_zh": "海洋社論",
        "style": "editorial",
        "preview_colors": {
            "background": "#0A1628",
            "text_primary": "#FFFFFF",
            "accent": "#8CB8D4",
        },
        "spec": {
            "colors": {
                "background": "linear-gradient(180deg, #0A1628 0%, #1A3A5C 100%)",
                "text_primary": "#FFFFFF",
                "text_secondary": "#8CB8D4",
                "accent": "#FFFFFF",
                "badge_bg": "#FFFFFF",
                "badge_text": "#0A1628",
                "accent_bar": "#8CB8D4",
            },
            "layout": {
                "text_alignment": "center",
                "title_position": "center",
                "badge_position": "top-left",
                "has_accent_bar": False,
            },
            "typography": {
                "title_size": "large",
                "title_weight": "bold",
                "body_size": "medium",
            },
            "background_type": "gradient",
            "has_frame": True,
            "frame_inset": 52,
            "frame_color": "rgba(255,255,255,0.4)",
            "content_area_color": "",
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
