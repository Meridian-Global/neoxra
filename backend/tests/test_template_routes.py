"""Tests for template management API endpoints."""

from fastapi.testclient import TestClient

from app.core.template_parsing_prompt import map_parsed_to_template_spec
from app.core.template_registry import get_template, list_templates
from app.main import app

client = TestClient(app)


class TestListTemplates:
    def test_returns_all_templates(self):
        response = client.get("/api/templates")
        assert response.status_code == 200
        data = response.json()
        assert "templates" in data
        assert len(data["templates"]) == 5

    def test_template_has_required_fields(self):
        response = client.get("/api/templates")
        data = response.json()
        for template in data["templates"]:
            assert "id" in template
            assert "name" in template
            assert "name_zh" in template
            assert "preview_colors" in template
            assert "style" in template
            assert "background" in template["preview_colors"]
            assert "text_primary" in template["preview_colors"]
            assert "accent" in template["preview_colors"]

    def test_template_ids(self):
        response = client.get("/api/templates")
        data = response.json()
        ids = {t["id"] for t in data["templates"]}
        assert ids == {
            "professional-dark",
            "bold-gradient",
            "minimal-light",
            "emerald-editorial",
            "neon-purple",
        }


class TestGetTemplateDetail:
    def test_returns_valid_template(self):
        response = client.get("/api/templates/professional-dark")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == "professional-dark"
        assert data["name"] == "Professional Dark"
        assert "spec" in data

    def test_spec_has_all_sections(self):
        response = client.get("/api/templates/professional-dark")
        data = response.json()
        spec = data["spec"]
        assert "colors" in spec
        assert "layout" in spec
        assert "typography" in spec
        assert "style" in spec

    def test_returns_404_for_nonexistent(self):
        response = client.get("/api/templates/nonexistent")
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()


class TestTemplateRegistry:
    def test_get_template_existing(self):
        template = get_template("bold-gradient")
        assert template is not None
        assert template["id"] == "bold-gradient"
        assert template["style"] == "bold"

    def test_get_template_nonexistent(self):
        assert get_template("does-not-exist") is None

    def test_list_templates_count(self):
        templates = list_templates()
        assert len(templates) == 5

    def test_list_templates_excludes_spec(self):
        templates = list_templates()
        for t in templates:
            assert "spec" not in t


class TestTemplateParsing:
    def test_map_parsed_full(self):
        parsed = {
            "colors": {
                "background": "#1A1A2E",
                "text_primary": "#EAEAEA",
                "text_secondary": "#B0B0B0",
                "accent": "#E94560",
                "badge_bg": "#E94560",
                "badge_text": "#FFFFFF",
                "accent_bar": "#E94560",
            },
            "layout": {
                "text_alignment": "center",
                "title_position": "top",
                "badge_position": "top-right",
                "has_accent_bar": False,
                "has_border_frame": True,
                "has_watermark": False,
            },
            "typography": {
                "title_size": "medium",
                "title_weight": "semibold",
                "body_size": "small",
            },
            "style": {
                "overall_mood": "editorial",
            },
        }

        result = map_parsed_to_template_spec(parsed, "test-template")
        assert result["id"] == "test-template"
        assert result["colors"]["background"] == "#1A1A2E"
        assert result["layout"]["text_alignment"] == "center"
        assert result["typography"]["title_weight"] == "semibold"
        assert result["style"]["overall_mood"] == "editorial"

    def test_map_parsed_with_defaults(self):
        parsed = {
            "colors": {"background": "#000000"},
        }

        result = map_parsed_to_template_spec(parsed)
        assert result["id"] == "custom"
        assert result["colors"]["background"] == "#000000"
        assert result["colors"]["text_primary"] == "#F8FAFC"  # default
        assert result["layout"]["text_alignment"] == "left"  # default
        assert result["typography"]["title_size"] == "large"  # default

    def test_map_parsed_empty(self):
        result = map_parsed_to_template_spec({})
        assert result["id"] == "custom"
        assert "colors" in result
        assert "layout" in result
        assert "typography" in result
        assert "style" in result
