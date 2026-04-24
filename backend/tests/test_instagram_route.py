"""Tests for POST /api/instagram/generate SSE streaming route."""

import json

from fastapi.testclient import TestClient

import app.api.instagram_routes as instagram_routes
from app.core.generation_metrics import reset_generation_metrics
from app.core.request_guards import (
    GENERATION_GUARDS,
    INSTAGRAM_ROUTE_KEY,
    reset_generation_guards,
)
from app.core_client import CoreInstagramGenerationRequest
from app.main import app

client = TestClient(app)

STYLE_ANALYSIS = {
    "tone_keywords": ["bold", "conversational"],
    "structural_patterns": ["short paragraphs", "hook first"],
    "vocabulary_notes": "casual but smart",
}

GENERATION_CONTENT = {
    "caption": "Test caption about AI tools",
    "hook_options": ["Hook A", "Hook B"],
    "hashtags": ["#ai", "#tools", "#productivity"],
    "carousel_outline": [{"title": f"Slide {i}", "body": f"Body {i}"} for i in range(1, 6)],
    "reel_script": "Hook: Open strong\nBody: Deliver one clear idea\nCTA: Save this",
}

SCORECARD = {
    "hook_strength": 8,
    "cta_clarity": 7,
    "hashtag_relevance": 9,
    "platform_fit": 8,
    "tone_match": 7,
    "originality": 6,
}


def _parse_sse_stream(raw: str) -> list[dict]:
    events = []
    for block in raw.split("\n\n"):
        block = block.strip()
        if not block:
            continue
        event_name = None
        data_str = None
        for line in block.split("\n"):
            if line.startswith("event: "):
                event_name = line[len("event: "):]
            elif line.startswith("data: "):
                data_str = line[len("data: "):]
        if event_name is not None:
            data = json.loads(data_str) if data_str else {}
            events.append({"event": event_name, "data": data})
    return events


EXPECTED_EVENT_ORDER = [
    "pipeline_started",
    "phase_started",
    "style_ready",
    "phase_started",
    "content_ready",
    "phase_started",
    "score_ready",
    "pipeline_completed",
]


class FakeInstagramCoreClient:
    mode = "local"
    requires_local_api_key = False

    def __init__(
        self,
        *,
        style_result: dict | Exception | None = None,
        generation_result: dict | Exception | None = None,
        score_result: tuple[dict, str] | Exception | None = None,
    ):
        self.style_result = style_result if style_result is not None else dict(STYLE_ANALYSIS)
        self.generation_result = generation_result if generation_result is not None else dict(GENERATION_CONTENT)
        self.score_result = score_result if score_result is not None else (dict(SCORECARD), "Strong hook but CTA could be sharper.")
        self.last_generation_request = None
        self.last_localized_template_text = None
        self.last_locale = None
        self.last_reference_image_description = None

    def ensure_instagram_available(self):
        return None

    def build_instagram_generation_request(
        self,
        *,
        topic: str,
        template_text: str,
        goal: str,
        style_examples: list[str],
        reference_image_description: str = "",
    ):
        return CoreInstagramGenerationRequest(
            topic=topic,
            template_text=template_text,
            goal=goal,
            style_examples=list(style_examples),
            reference_image_description=reference_image_description,
        )

    def analyze_instagram_style(
        self,
        *,
        template_text: str,
        style_examples: list[str],
        reference_image_description: str = "",
    ):
        self.last_reference_image_description = reference_image_description
        if isinstance(self.style_result, Exception):
            raise self.style_result
        return self.style_result

    def generate_instagram_content(
        self,
        *,
        generation_request,
        localized_template_text: str,
        style_analysis: dict[str, object],
        locale: str,
    ):
        self.last_generation_request = generation_request
        self.last_localized_template_text = localized_template_text
        self.last_locale = locale
        if isinstance(self.generation_result, Exception):
            raise self.generation_result
        return self.generation_result

    def score_instagram_content(self, *, content: dict[str, object], goal: str):
        if isinstance(self.score_result, Exception):
            raise self.score_result
        return self.score_result


def _use_fake_core_client(monkeypatch, fake_client: FakeInstagramCoreClient) -> FakeInstagramCoreClient:
    monkeypatch.setattr(instagram_routes, "_get_core_client", lambda: fake_client)
    return fake_client


class TestInstagramSSERoute:
    def test_legal_demo_surface_requires_access_when_gated(self, monkeypatch):
        reset_generation_metrics()
        reset_generation_guards()
        monkeypatch.setenv("NEOXRA_ENV_MODE", "public-demo")
        monkeypatch.setenv("NEOXRA_LEGAL_DEMO_ACCESS_MODE", "gated")
        monkeypatch.setenv("NEOXRA_DEMO_SIGNING_SECRET", "demo-secret")

        _use_fake_core_client(monkeypatch, FakeInstagramCoreClient())

        resp = client.post(
            "/api/instagram/generate",
            headers={"X-Neoxra-Demo-Surface": "legal"},
            json={"topic": "test", "template_text": "template"},
        )

        assert resp.status_code == 401
        assert resp.json()["error_code"] == "DEMO_ACCESS_REQUIRED"

    def test_legal_demo_surface_accepts_valid_demo_token(self, monkeypatch):
        reset_generation_metrics()
        reset_generation_guards()
        monkeypatch.setenv("NEOXRA_ENV_MODE", "public-demo")
        monkeypatch.setenv("NEOXRA_LEGAL_DEMO_ACCESS_MODE", "gated")
        monkeypatch.setenv("NEOXRA_LEGAL_DEMO_ACCESS_CODE", "law-demo")
        monkeypatch.setenv("NEOXRA_DEMO_SIGNING_SECRET", "demo-secret")

        _use_fake_core_client(monkeypatch, FakeInstagramCoreClient())

        access_response = client.post(
            "/api/demo/access",
            json={"surface": "legal", "access_code": "law-demo"},
        )
        token = access_response.json()["demo_token"]

        resp = client.post(
            "/api/instagram/generate",
            headers={
                "X-Neoxra-Demo-Surface": "legal",
                "X-Neoxra-Demo-Token": token,
            },
            json={"topic": "test", "template_text": "template"},
        )

        assert resp.status_code == 200
        assert "text/event-stream" in resp.headers["content-type"]

    def test_content_type_is_event_stream(self, monkeypatch):
        reset_generation_metrics()
        reset_generation_guards()
        _use_fake_core_client(monkeypatch, FakeInstagramCoreClient())
        resp = client.post(
            "/api/instagram/generate",
            json={"topic": "test", "template_text": "template"},
        )
        assert resp.status_code == 200
        assert "text/event-stream" in resp.headers["content-type"]

    def test_stream_contains_exactly_expected_events_in_order(self, monkeypatch):
        reset_generation_metrics()
        reset_generation_guards()
        _use_fake_core_client(monkeypatch, FakeInstagramCoreClient())
        resp = client.post(
            "/api/instagram/generate",
            json={"topic": "test", "template_text": "template"},
        )
        events = _parse_sse_stream(resp.text)
        event_names = [e["event"] for e in events]
        assert event_names == EXPECTED_EVENT_ORDER

    def test_pipeline_completed_has_required_keys(self, monkeypatch):
        reset_generation_metrics()
        reset_generation_guards()
        _use_fake_core_client(monkeypatch, FakeInstagramCoreClient())
        resp = client.post(
            "/api/instagram/generate",
            json={"topic": "test", "template_text": "template"},
        )
        events = _parse_sse_stream(resp.text)
        final = next(e for e in events if e["event"] == "pipeline_completed")
        assert set(final["data"].keys()) >= {"content", "scorecard", "critique", "style_analysis"}

    def test_scorecard_has_six_dimensions_plus_average(self, monkeypatch):
        reset_generation_metrics()
        reset_generation_guards()
        _use_fake_core_client(monkeypatch, FakeInstagramCoreClient())
        resp = client.post(
            "/api/instagram/generate",
            json={"topic": "test", "template_text": "template"},
        )
        events = _parse_sse_stream(resp.text)
        final = next(e for e in events if e["event"] == "pipeline_completed")
        scorecard = final["data"]["scorecard"]
        for dim in (
            "hook_strength",
            "cta_clarity",
            "hashtag_relevance",
            "platform_fit",
            "tone_match",
            "originality",
        ):
            assert dim in scorecard
        assert "average" in scorecard

    def test_content_has_required_fields(self, monkeypatch):
        reset_generation_metrics()
        reset_generation_guards()
        _use_fake_core_client(monkeypatch, FakeInstagramCoreClient())
        resp = client.post(
            "/api/instagram/generate",
            json={"topic": "test", "template_text": "template"},
        )
        events = _parse_sse_stream(resp.text)
        final = next(e for e in events if e["event"] == "pipeline_completed")
        content = final["data"]["content"]
        for field in ("caption", "hook_options", "hashtags", "carousel_outline", "reel_script"):
            assert field in content

    def test_reference_image_description_is_passed_to_core(self, monkeypatch):
        reset_generation_metrics()
        reset_generation_guards()
        fake = _use_fake_core_client(monkeypatch, FakeInstagramCoreClient())
        resp = client.post(
            "/api/instagram/generate",
            json={
                "topic": "test",
                "template_text": "template",
                "reference_image_description": "Cream background with centered headline.",
            },
        )

        assert resp.status_code == 200
        assert fake.last_generation_request.reference_image_description == "Cream background with centered headline."
        assert fake.last_reference_image_description == "Cream background with centered headline."

    def test_locale_is_included_in_pipeline_started_event(self, monkeypatch):
        reset_generation_metrics()
        reset_generation_guards()
        _use_fake_core_client(monkeypatch, FakeInstagramCoreClient())
        resp = client.post(
            "/api/instagram/generate",
            json={"topic": "test", "template_text": "template", "locale": "zh-TW"},
        )
        events = _parse_sse_stream(resp.text)
        started = next(e for e in events if e["event"] == "pipeline_started")
        assert started["data"]["locale"] == "zh-TW"

    def test_generation_receives_traditional_chinese_instruction(self, monkeypatch):
        reset_generation_metrics()
        reset_generation_guards()
        fake_client = _use_fake_core_client(monkeypatch, FakeInstagramCoreClient())

        resp = client.post(
            "/api/instagram/generate",
            json={"topic": "test", "template_text": "template", "locale": "zh-TW"},
        )

        assert resp.status_code == 200
        assert fake_client.last_generation_request is not None
        assert fake_client.last_locale == "zh-TW"
        assert "Traditional Chinese for Taiwan" in fake_client.last_localized_template_text

    def test_invalid_generation_payload_emits_error_event(self, monkeypatch):
        reset_generation_metrics()
        reset_generation_guards()
        invalid_content = dict(GENERATION_CONTENT)
        invalid_content["caption"] = ""
        _use_fake_core_client(
            monkeypatch,
            FakeInstagramCoreClient(generation_result=invalid_content),
        )

        resp = client.post(
            "/api/instagram/generate",
            json={"topic": "test", "template_text": "template"},
        )

        events = _parse_sse_stream(resp.text)
        assert [event["event"] for event in events] == [
            "pipeline_started",
            "phase_started",
            "style_ready",
            "phase_started",
            "error",
        ]
        assert events[-1]["data"] == {
            "stage": "generation",
            "message": "Generated output could not be validated.",
            "error_code": "GENERATION_OUTPUT_INVALID",
        }

    def test_style_analysis_failure_emits_error_event(self, monkeypatch):
        reset_generation_metrics()
        reset_generation_guards()
        _use_fake_core_client(
            monkeypatch,
            FakeInstagramCoreClient(style_result=ValueError("style boom")),
        )

        resp = client.post(
            "/api/instagram/generate",
            json={"topic": "test", "template_text": "template"},
        )

        events = _parse_sse_stream(resp.text)
        assert [event["event"] for event in events] == [
            "pipeline_started",
            "phase_started",
            "error",
        ]
        assert events[-1]["data"] == {
            "stage": "style_analysis",
            "message": "Something went wrong while analyzing the input style.",
            "error_code": "STYLE_ANALYSIS_FAILED",
        }

    def test_generation_failure_emits_error_event(self, monkeypatch):
        reset_generation_metrics()
        reset_generation_guards()
        _use_fake_core_client(
            monkeypatch,
            FakeInstagramCoreClient(generation_result=ValueError("generation boom")),
        )

        resp = client.post(
            "/api/instagram/generate",
            json={"topic": "test", "template_text": "template"},
        )

        events = _parse_sse_stream(resp.text)
        assert [event["event"] for event in events] == [
            "pipeline_started",
            "phase_started",
            "style_ready",
            "phase_started",
            "error",
        ]
        assert events[-1]["data"] == {
            "stage": "generation",
            "message": "Something went wrong while generating content.",
            "error_code": "GENERATION_FAILED",
        }

    def test_scoring_failure_emits_error_event(self, monkeypatch):
        reset_generation_metrics()
        reset_generation_guards()
        _use_fake_core_client(
            monkeypatch,
            FakeInstagramCoreClient(score_result=ValueError("scoring boom")),
        )

        resp = client.post(
            "/api/instagram/generate",
            json={"topic": "test", "template_text": "template"},
        )

        events = _parse_sse_stream(resp.text)
        assert [event["event"] for event in events] == [
            "pipeline_started",
            "phase_started",
            "style_ready",
            "phase_started",
            "content_ready",
            "phase_started",
            "error",
        ]
        assert events[-1]["data"] == {
            "stage": "scoring",
            "message": "Something went wrong while scoring the generated content.",
            "error_code": "SCORING_FAILED",
        }

    def test_generation_metrics_endpoint_tracks_instagram_success_and_failure(self, monkeypatch):
        reset_generation_metrics()
        reset_generation_guards()
        _use_fake_core_client(monkeypatch, FakeInstagramCoreClient())
        success_response = client.post(
            "/api/instagram/generate",
            json={"topic": "test", "template_text": "template"},
        )
        assert success_response.status_code == 200

        _use_fake_core_client(
            monkeypatch,
            FakeInstagramCoreClient(style_result=ValueError("style boom")),
        )
        failure_response = client.post(
            "/api/instagram/generate",
            json={"topic": "test", "template_text": "template"},
        )
        assert failure_response.status_code == 200

        monkeypatch.setenv("NEOXRA_ADMIN_KEY", "admin-secret")
        metrics_response = client.get(
            "/health/generation-metrics",
            headers={"X-Neoxra-Admin-Key": "admin-secret"},
        )
        assert metrics_response.status_code == 200
        metrics = metrics_response.json()
        assert metrics["by_pipeline"]["instagram"]["total_runs"] == 2
        assert metrics["by_pipeline"]["instagram"]["successful_runs"] == 1
        assert metrics["by_pipeline"]["instagram"]["failed_runs"] == 1
        assert metrics["by_pipeline"]["instagram"]["failures_by_reason"]["stage_exception"] == 1

    def test_instagram_route_rate_limits_by_ip(self, monkeypatch):
        reset_generation_metrics()
        reset_generation_guards()
        monkeypatch.setenv("INSTAGRAM_GENERATE_RATE_LIMIT_PER_MINUTE", "1")
        _use_fake_core_client(monkeypatch, FakeInstagramCoreClient())

        headers = {"X-Forwarded-For": "203.0.113.20"}
        first = client.post(
            "/api/instagram/generate",
            json={"topic": "test", "template_text": "template"},
            headers=headers,
        )
        second = client.post(
            "/api/instagram/generate",
            json={"topic": "test", "template_text": "template"},
            headers=headers,
        )

        assert first.status_code == 200
        assert second.status_code == 429
        assert second.json()["detail"] == "Rate limit exceeded for generation endpoint. Please retry shortly."
        assert second.json()["error_code"] == "RATE_LIMIT_EXCEEDED"

    def test_instagram_route_rejects_concurrent_runs_from_same_ip(self, monkeypatch):
        reset_generation_metrics()
        reset_generation_guards()
        monkeypatch.setenv("INSTAGRAM_GENERATE_MAX_CONCURRENT_PER_IP", "1")
        _use_fake_core_client(monkeypatch, FakeInstagramCoreClient())

        GENERATION_GUARDS._set_active_count_for_test(INSTAGRAM_ROUTE_KEY, "203.0.113.21", 1)
        try:
            response = client.post(
                "/api/instagram/generate",
                json={"topic": "test", "template_text": "template"},
                headers={"X-Forwarded-For": "203.0.113.21"},
            )
            assert response.status_code == 429
            assert response.json()["detail"] == (
                "Too many concurrent generation requests from this IP. Please wait for the current run to finish."
            )
            assert response.json()["error_code"] == "CONCURRENCY_LIMIT_EXCEEDED"
        finally:
            GENERATION_GUARDS._set_active_count_for_test(INSTAGRAM_ROUTE_KEY, "203.0.113.21", 0)

    def test_instagram_route_rejects_oversized_request_body(self, monkeypatch):
        reset_generation_metrics()
        reset_generation_guards()
        monkeypatch.setenv("INSTAGRAM_GENERATE_MAX_BODY_BYTES", "100")
        _use_fake_core_client(monkeypatch, FakeInstagramCoreClient())

        response = client.post(
            "/api/instagram/generate",
            json={"topic": "x" * 120, "template_text": "template"},
        )

        assert response.status_code == 413
        assert response.json()["detail"] == "Request body too large for generation endpoint."
        assert response.json()["error_code"] == "REQUEST_BODY_TOO_LARGE"


class TestInstagramReferenceUpload:
    def test_upload_reference_accepts_png(self, monkeypatch):
        async def fake_describe_reference_image(file):
            return "Cream layout with centered headline.", {
                "background": "#FFFBF0",
                "text_primary": "#1A1A1A",
                "text_secondary": "#6B7280",
                "accent": "#D4A574",
            }

        monkeypatch.setattr(
            instagram_routes,
            "_describe_reference_image",
            fake_describe_reference_image,
        )

        response = client.post(
            "/api/instagram/upload-reference",
            files={"file": ("reference.png", b"fake-png", "image/png")},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["description"] == "Cream layout with centered headline."
        assert data["palette"]["background"] == "#FFFBF0"

    def test_upload_reference_rejects_non_image(self):
        response = client.post(
            "/api/instagram/upload-reference",
            files={"file": ("reference.txt", b"not image", "text/plain")},
        )

        assert response.status_code == 415

    def test_upload_reference_rejects_oversized_image(self):
        response = client.post(
            "/api/instagram/upload-reference",
            files={"file": ("reference.jpg", b"x" * (5 * 1024 * 1024 + 1), "image/jpeg")},
        )

        assert response.status_code == 413
