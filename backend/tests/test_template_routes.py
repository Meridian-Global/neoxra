"""Tests for template management API endpoints."""

import io
import json
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

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
        assert len(data["templates"]) >= 5

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
        ids = {t["id"] for t in templates}
        assert {
            "professional-dark",
            "bold-gradient",
            "minimal-light",
            "emerald-editorial",
            "neon-purple",
        }.issubset(ids)

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


# ---------------------------------------------------------------------------
# A minimal 1×1 PNG for upload tests
# ---------------------------------------------------------------------------
_TINY_PNG = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01"
    b"\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00"
    b"\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00"
    b"\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82"
)

_VALID_PARSED = {
    "colors": {
        "background": "#1A1A2E",
        "text_primary": "#EAEAEA",
        "text_secondary": "#B0B0B0",
        "accent": "#E94560",
    },
    "layout": {"text_alignment": "center"},
    "typography": {"title_size": "medium", "title_weight": "semibold", "body_size": "small"},
    "style": {"overall_mood": "editorial"},
}


def _make_mock_anthropic_response(payload: dict) -> MagicMock:
    from types import SimpleNamespace

    block = SimpleNamespace(text=json.dumps(payload))
    resp = MagicMock()
    resp.content = [block]
    return resp


def _make_async_return(value):
    """Return a coroutine function that yields *value* regardless of arguments."""
    import asyncio  # noqa: F401 - imported here to keep helper self-contained

    async def _async_fn(*_args, **_kwargs):
        return value

    return _async_fn


class TestParseTemplateImage:
    def test_unsupported_content_type_returns_415(self):
        response = client.post(
            "/api/templates/parse-image",
            files={"file": ("test.gif", io.BytesIO(b"GIF89a"), "image/gif")},
        )
        assert response.status_code == 415

    def test_empty_file_returns_422(self):
        response = client.post(
            "/api/templates/parse-image",
            files={"file": ("empty.png", io.BytesIO(b""), "image/png")},
        )
        assert response.status_code == 422

    def test_oversized_file_returns_413(self):
        big = io.BytesIO(b"x" * (5 * 1024 * 1024 + 1))
        response = client.post(
            "/api/templates/parse-image",
            files={"file": ("big.png", big, "image/png")},
        )
        assert response.status_code == 413

    def test_non_json_model_output_returns_502(self):
        from types import SimpleNamespace

        bad_block = SimpleNamespace(text="not valid json {{{{")
        bad_resp = MagicMock()
        bad_resp.content = [bad_block]

        with (
            patch.dict("os.environ", {"ANTHROPIC_API_KEY": "test-key"}),
            patch(
                "app.api.template_routes.asyncio.to_thread",
                new=_make_async_return(bad_resp),
            ),
        ):
            response = client.post(
                "/api/templates/parse-image",
                files={"file": ("test.png", io.BytesIO(_TINY_PNG), "image/png")},
            )

        assert response.status_code == 502
        assert "invalid" in response.json()["detail"].lower()

    def test_happy_path_returns_template_spec(self):
        mock_resp = _make_mock_anthropic_response(_VALID_PARSED)

        with (
            patch.dict("os.environ", {"ANTHROPIC_API_KEY": "test-key"}),
            patch(
                "app.api.template_routes.asyncio.to_thread",
                new=_make_async_return(mock_resp),
            ),
        ):
            response = client.post(
                "/api/templates/parse-image",
                files={"file": ("test.png", io.BytesIO(_TINY_PNG), "image/png")},
            )

        assert response.status_code == 200
        data = response.json()
        assert "template_spec" in data
        assert "parsing_confidence" in data
        assert "description" in data
        assert data["template_spec"]["colors"]["background"] == "#1A1A2E"
        assert isinstance(data["parsing_confidence"], float)

    def test_missing_api_key_returns_503(self):
        with patch.dict("os.environ", {}, clear=True):
            response = client.post(
                "/api/templates/parse-image",
                files={"file": ("test.png", io.BytesIO(_TINY_PNG), "image/png")},
            )
        assert response.status_code == 503

