"""Tests for POST /api/instagram/generate-and-render endpoint."""

import base64
from types import ModuleType
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

_TINY_PNG = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01"
    b"\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00"
    b"\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00"
    b"\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82"
)

MOCK_CONTENT = {
    "caption": "Test caption about AI",
    "hook_options": ["Hook A"],
    "hashtags": ["#ai", "#tools"],
    "carousel_outline": [
        {"title": "Slide 1", "body": "Body 1"},
        {"title": "Slide 2", "body": "Body 2"},
        {"title": "Slide 3", "body": "Body 3"},
    ],
    "reel_script": "Test reel script.",
}

MOCK_STYLE = {
    "tone_keywords": ["professional"],
    "structural_patterns": ["short paragraphs"],
    "vocabulary_notes": "clear and direct",
}


def _mock_generation_result():
    """Build a mock InstagramGenerationResult."""
    from app.core.instagram_pipeline import InstagramGenerationResult

    return InstagramGenerationResult(
        content=MOCK_CONTENT,
        style_analysis=MOCK_STYLE,
    )


def _build_mock_renderer(slide_count: int):
    """Build a mock neoxra_renderer module."""
    mock_resp = MagicMock()
    mock_resp.images = [_TINY_PNG] * slide_count
    mock_resp.metadata = {"slide_count": slide_count}

    mod = ModuleType("neoxra_renderer")
    mod.render_carousel = AsyncMock(return_value=mock_resp)
    mod.FullRenderRequest = MagicMock()
    mod.SlideContent = MagicMock(side_effect=lambda **kw: MagicMock(**kw))
    mod.TemplateSpec = MagicMock(side_effect=lambda **kw: MagicMock(**kw))
    mod.ColorPalette = MagicMock(side_effect=lambda **kw: MagicMock(**kw))
    return mod


class TestGenerateAndRenderValidation:
    def test_empty_topic_returns_400(self):
        response = client.post(
            "/api/instagram/generate-and-render",
            json={"topic": ""},
        )
        assert response.status_code == 400
        assert "topic" in response.json()["detail"].lower()

    def test_invalid_template_returns_400(self):
        response = client.post(
            "/api/instagram/generate-and-render",
            json={"topic": "Test topic", "template_id": "nonexistent"},
        )
        assert response.status_code == 400
        assert "not found" in response.json()["detail"].lower()

    def test_custom_without_spec_returns_400(self):
        response = client.post(
            "/api/instagram/generate-and-render",
            json={"topic": "Test topic", "template_id": "custom"},
        )
        assert response.status_code == 400
        assert "template_spec" in response.json()["detail"].lower()


class TestGenerateAndRenderMocked:
    """Tests that mock both generation and rendering."""

    def test_returns_content_and_images(self):
        mock_result = _mock_generation_result()
        mock_renderer = _build_mock_renderer(3)

        with (
            patch(
                "app.api.render_routes.generate_instagram_content",
                new=AsyncMock(return_value=mock_result),
            ),
            patch.dict("sys.modules", {"neoxra_renderer": mock_renderer}),
        ):
            response = client.post(
                "/api/instagram/generate-and-render",
                json={"topic": "AI tools for lawyers", "template_id": "professional-dark"},
            )

        assert response.status_code == 200
        data = response.json()
        assert "content" in data
        assert "rendered_images" in data
        assert "slide_count" in data
        assert data["content"]["caption"] == MOCK_CONTENT["caption"]
        assert len(data["rendered_images"]) == 3
        assert data["slide_count"] == 3

    def test_images_are_data_uri_prefixed(self):
        mock_result = _mock_generation_result()
        mock_renderer = _build_mock_renderer(2)

        with (
            patch(
                "app.api.render_routes.generate_instagram_content",
                new=AsyncMock(return_value=mock_result),
            ),
            patch.dict("sys.modules", {"neoxra_renderer": mock_renderer}),
        ):
            response = client.post(
                "/api/instagram/generate-and-render",
                json={"topic": "test", "template_id": "bold-gradient"},
            )

        data = response.json()
        for img in data["rendered_images"]:
            assert img.startswith("data:image/png;base64,")
            b64_part = img.split(",", 1)[1]
            decoded = base64.b64decode(b64_part)
            assert decoded[:4] == b"\x89PNG"

    def test_custom_template_with_spec(self):
        mock_result = _mock_generation_result()
        mock_renderer = _build_mock_renderer(3)
        custom_spec = {
            "id": "custom",
            "colors": {"background": "#000", "text_primary": "#FFF"},
        }

        with (
            patch(
                "app.api.render_routes.generate_instagram_content",
                new=AsyncMock(return_value=mock_result),
            ),
            patch.dict("sys.modules", {"neoxra_renderer": mock_renderer}),
        ):
            response = client.post(
                "/api/instagram/generate-and-render",
                json={
                    "topic": "test topic",
                    "template_id": "custom",
                    "template_spec": custom_spec,
                },
            )

        assert response.status_code == 200
        assert len(response.json()["rendered_images"]) == 3

    def test_returns_content_when_rendering_fails(self):
        mock_result = _mock_generation_result()

        with patch(
            "app.api.render_routes.generate_instagram_content",
            new=AsyncMock(return_value=mock_result),
        ):
            # No neoxra_renderer mock → import will fail → render_error returned
            response = client.post(
                "/api/instagram/generate-and-render",
                json={"topic": "test topic", "template_id": "professional-dark"},
            )

        assert response.status_code == 200
        data = response.json()
        assert data["content"]["caption"] == MOCK_CONTENT["caption"]
        assert data["rendered_images"] == []
        assert "render_error" in data
        assert data["slide_count"] == 3  # falls back to carousel_outline count

    def test_default_template_used(self):
        mock_result = _mock_generation_result()
        mock_renderer = _build_mock_renderer(3)

        with (
            patch(
                "app.api.render_routes.generate_instagram_content",
                new=AsyncMock(return_value=mock_result),
            ),
            patch.dict("sys.modules", {"neoxra_renderer": mock_renderer}),
        ):
            response = client.post(
                "/api/instagram/generate-and-render",
                json={"topic": "法律諮詢"},
            )

        assert response.status_code == 200
        assert response.json()["slide_count"] == 3
