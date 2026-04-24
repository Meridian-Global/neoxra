"""Tests for POST /api/render/carousel endpoint."""

import io
import zipfile
from types import ModuleType
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

VALID_SLIDES = [
    {"title": "Slide 1", "body": "Body text for slide 1"},
    {"title": "Slide 2", "body": "Body text for slide 2"},
    {"title": "Slide 3", "body": "Body text for slide 3"},
]

# A 1x1 red PNG for mock render results
_TINY_PNG = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01"
    b"\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00"
    b"\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00"
    b"\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82"
)


def _make_mock_response(slide_count: int):
    resp = MagicMock()
    resp.images = [_TINY_PNG] * slide_count
    resp.metadata = {"slide_count": slide_count}
    return resp


def _build_mock_module(mock_render_fn):
    """Build a mock module that looks like neoxra_renderer for import patching."""
    mod = ModuleType("neoxra_renderer")
    mod.render_carousel = mock_render_fn
    mod.FullRenderRequest = MagicMock()
    mod.SlideContent = MagicMock(side_effect=lambda **kw: MagicMock(**kw))
    mod.TemplateSpec = MagicMock(side_effect=lambda **kw: MagicMock(**kw))
    mod.ColorPalette = MagicMock(side_effect=lambda **kw: MagicMock(**kw))
    return mod


class TestRenderCarouselValidation:
    def test_empty_slides_returns_400(self):
        response = client.post(
            "/api/render/carousel",
            json={"template_id": "editorial-green", "slides": []},
        )
        assert response.status_code == 400
        assert "at least one slide" in response.json()["detail"].lower()

    def test_too_many_slides_returns_400(self):
        slides = [{"title": f"S{i}", "body": f"B{i}"} for i in range(11)]
        response = client.post(
            "/api/render/carousel",
            json={"template_id": "editorial-green", "slides": slides},
        )
        assert response.status_code == 400
        assert "maximum" in response.json()["detail"].lower()

    def test_invalid_template_id_returns_400(self):
        response = client.post(
            "/api/render/carousel",
            json={"template_id": "nonexistent", "slides": VALID_SLIDES},
        )
        assert response.status_code == 400
        assert "not found" in response.json()["detail"].lower()

    def test_custom_without_spec_returns_400(self):
        response = client.post(
            "/api/render/carousel",
            json={"template_id": "custom", "slides": VALID_SLIDES},
        )
        assert response.status_code == 400
        assert "template_spec is required" in response.json()["detail"].lower()


class TestRenderCarouselMocked:
    """Tests that mock the renderer import to verify ZIP packaging and response."""

    def test_valid_request_returns_zip_with_correct_slides(self):
        mock_resp = _make_mock_response(3)
        mock_render = AsyncMock(return_value=mock_resp)

        with patch.dict("sys.modules", {"neoxra_renderer": _build_mock_module(mock_render)}):
            response = client.post(
                "/api/render/carousel",
                json={"template_id": "editorial-green", "slides": VALID_SLIDES},
            )

        assert response.status_code == 200
        assert response.headers["content-type"] == "application/zip"
        assert "carousel.zip" in response.headers.get("content-disposition", "")

        zip_buf = io.BytesIO(response.content)
        with zipfile.ZipFile(zip_buf) as zf:
            names = sorted(zf.namelist())
            assert names == ["slide-01.png", "slide-02.png", "slide-03.png"]

    def test_single_slide_zip(self):
        mock_resp = _make_mock_response(1)
        mock_render = AsyncMock(return_value=mock_resp)

        with patch.dict("sys.modules", {"neoxra_renderer": _build_mock_module(mock_render)}):
            response = client.post(
                "/api/render/carousel",
                json={
                    "template_id": "luxury-dark",
                    "slides": [{"title": "Only Slide", "body": "Solo content"}],
                },
            )

        assert response.status_code == 200
        zip_buf = io.BytesIO(response.content)
        with zipfile.ZipFile(zip_buf) as zf:
            assert zf.namelist() == ["slide-01.png"]

    def test_custom_template_with_spec(self):
        mock_resp = _make_mock_response(2)
        mock_render = AsyncMock(return_value=mock_resp)
        custom_spec = {
            "id": "custom",
            "colors": {
                "background": "#000000",
                "text_primary": "#FFFFFF",
                "text_secondary": "#AAAAAA",
                "accent": "#FF0000",
            },
        }

        with patch.dict("sys.modules", {"neoxra_renderer": _build_mock_module(mock_render)}):
            response = client.post(
                "/api/render/carousel",
                json={
                    "template_id": "custom",
                    "slides": VALID_SLIDES[:2],
                    "template_spec": custom_spec,
                },
            )

        assert response.status_code == 200
        zip_buf = io.BytesIO(response.content)
        with zipfile.ZipFile(zip_buf) as zf:
            assert len(zf.namelist()) == 2

    def test_zip_file_naming(self):
        mock_resp = _make_mock_response(5)
        mock_render = AsyncMock(return_value=mock_resp)
        slides = [{"title": f"S{i}", "body": f"B{i}"} for i in range(5)]

        with patch.dict("sys.modules", {"neoxra_renderer": _build_mock_module(mock_render)}):
            response = client.post(
                "/api/render/carousel",
                json={"template_id": "modern-minimal", "slides": slides},
            )

        assert response.status_code == 200
        zip_buf = io.BytesIO(response.content)
        with zipfile.ZipFile(zip_buf) as zf:
            names = sorted(zf.namelist())
            assert names == [
                "slide-01.png",
                "slide-02.png",
                "slide-03.png",
                "slide-04.png",
                "slide-05.png",
            ]
