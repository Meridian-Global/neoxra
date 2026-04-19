"""Tests for POST /api/instagram/generate SSE streaming route."""

import json
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from neoxra_core.skills.base import SkillOutput

from app.core.generation_metrics import reset_generation_metrics
from app.core.request_guards import (
    GENERATION_GUARDS,
    INSTAGRAM_ROUTE_KEY,
    reset_generation_guards,
)
from app.main import app
from app.api.instagram_routes import (
    ContentScoringSkill,
    InstagramGenerationSkill,
    StyleAnalysisSkill,
)

client = TestClient(app)

# ── Canned LLM responses (one per skill call, in order) ─────────────

STYLE_ANALYSIS_JSON = json.dumps({
    "tone_keywords": ["bold", "conversational"],
    "structural_patterns": ["short paragraphs", "hook first"],
    "vocabulary_notes": "casual but smart",
})

GENERATION_JSON = json.dumps({
    "caption": "Test caption about AI tools",
    "hook_options": ["Hook A", "Hook B"],
    "hashtags": ["#ai", "#tools", "#productivity"],
    "carousel_outline": [
        {"title": f"Slide {i}", "body": f"Body {i}"} for i in range(1, 6)
    ],
    "reel_script": "Open on a laptop screen...",
})

SCORING_JSON = json.dumps({
    "hook_strength": 8,
    "cta_clarity": 7,
    "hashtag_relevance": 9,
    "platform_fit": 8,
    "tone_match": 7,
    "originality": 6,
    "critique": "Strong hook but CTA could be sharper.",
})


def _mock_generate_side_effects():
    """Return a list of canned responses for the three sequential LLM calls."""
    return [STYLE_ANALYSIS_JSON, GENERATION_JSON, SCORING_JSON]


def _parse_sse_stream(raw: str) -> list[dict]:
    """Parse an SSE text stream into a list of {event, data} dicts."""
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
    "style_analysis_started",
    "style_analysis_completed",
    "generation_started",
    "generation_completed",
    "scoring_started",
    "scoring_completed",
    "pipeline_completed",
]


@pytest.fixture()
def mock_llm():
    mock = MagicMock(side_effect=_mock_generate_side_effects())
    with (
        patch("neoxra_core.skills.style_analysis.generate", mock),
        patch("neoxra_core.skills.instagram_generation.generate", mock),
        patch("neoxra_core.skills.content_scoring.generate", mock),
    ):
        yield mock


class TestInstagramSSERoute:
    def test_content_type_is_event_stream(self, mock_llm):
        reset_generation_metrics()
        reset_generation_guards()
        resp = client.post(
            "/api/instagram/generate",
            json={"topic": "test", "template_text": "template"},
        )
        assert resp.status_code == 200
        assert "text/event-stream" in resp.headers["content-type"]

    def test_stream_contains_exactly_7_events_in_order(self, mock_llm):
        reset_generation_metrics()
        reset_generation_guards()
        resp = client.post(
            "/api/instagram/generate",
            json={"topic": "test", "template_text": "template"},
        )
        events = _parse_sse_stream(resp.text)
        event_names = [e["event"] for e in events]
        assert event_names == EXPECTED_EVENT_ORDER

    def test_pipeline_completed_has_required_keys(self, mock_llm):
        reset_generation_metrics()
        reset_generation_guards()
        resp = client.post(
            "/api/instagram/generate",
            json={"topic": "test", "template_text": "template"},
        )
        events = _parse_sse_stream(resp.text)
        final = next(e for e in events if e["event"] == "pipeline_completed")
        data = final["data"]
        assert set(data.keys()) >= {"content", "scorecard", "critique", "style_analysis"}

    def test_scorecard_has_six_dimensions_plus_average(self, mock_llm):
        reset_generation_metrics()
        reset_generation_guards()
        resp = client.post(
            "/api/instagram/generate",
            json={"topic": "test", "template_text": "template"},
        )
        events = _parse_sse_stream(resp.text)
        final = next(e for e in events if e["event"] == "pipeline_completed")
        scorecard = final["data"]["scorecard"]
        for dim in (
            "hook_strength", "cta_clarity", "hashtag_relevance",
            "platform_fit", "tone_match", "originality",
        ):
            assert dim in scorecard, f"missing scorecard dimension: {dim}"
        assert "average" in scorecard

    def test_content_has_required_fields(self, mock_llm):
        reset_generation_metrics()
        reset_generation_guards()
        resp = client.post(
            "/api/instagram/generate",
            json={"topic": "test", "template_text": "template"},
        )
        events = _parse_sse_stream(resp.text)
        final = next(e for e in events if e["event"] == "pipeline_completed")
        content = final["data"]["content"]
        for field in ("caption", "hook_options", "hashtags", "carousel_outline", "reel_script"):
            assert field in content, f"missing content field: {field}"

    def test_locale_is_included_in_pipeline_started_event(self, mock_llm):
        reset_generation_metrics()
        reset_generation_guards()
        resp = client.post(
            "/api/instagram/generate",
            json={"topic": "test", "template_text": "template", "locale": "zh-TW"},
        )
        events = _parse_sse_stream(resp.text)
        started = next(e for e in events if e["event"] == "pipeline_started")
        assert started["data"]["locale"] == "zh-TW"

    def test_generation_receives_traditional_chinese_instruction(self):
        reset_generation_metrics()
        reset_generation_guards()
        style_output = SkillOutput(
            text="style ok",
            metadata={
                "style_analysis": {
                    "tone_keywords": ["bold"],
                    "structural_patterns": ["hook first"],
                    "vocabulary_notes": "direct voice",
                }
            },
        )
        generation_output = SkillOutput(
            text="generation ok",
            metadata={
                "caption": "Caption",
                "hook_options": ["Hook A"],
                "hashtags": ["tag1"],
                "carousel_outline": [{"title": "Slide 1", "body": "Body 1"}],
                "reel_script": "Reel script",
            },
        )
        scoring_output = SkillOutput(
            text="score ok",
            metadata={
                "scorecard": {
                    "hook_strength": 8,
                    "cta_clarity": 7,
                    "hashtag_relevance": 9,
                    "platform_fit": 8,
                    "tone_match": 7,
                    "originality": 6,
                }
            },
        )
        generation_mock = MagicMock(return_value=generation_output)

        with (
            patch.object(StyleAnalysisSkill, "run", return_value=style_output),
            patch.object(InstagramGenerationSkill, "run", generation_mock),
            patch.object(ContentScoringSkill, "run", return_value=scoring_output),
        ):
            resp = client.post(
                "/api/instagram/generate",
                json={"topic": "test", "template_text": "template", "locale": "zh-TW"},
            )

        assert resp.status_code == 200
        assert generation_mock.call_count == 1
        skill_input = generation_mock.call_args.args[0]
        assert skill_input.context["locale"] == "zh-TW"
        assert "Traditional Chinese for Taiwan" in skill_input.context["template_text"]

    def test_invalid_generation_payload_emits_error_event(self):
        reset_generation_metrics()
        reset_generation_guards()
        style_output = SkillOutput(
            text="style ok",
            metadata={
                "style_analysis": {
                    "tone_keywords": ["bold"],
                    "structural_patterns": ["hook first"],
                    "vocabulary_notes": "direct voice",
                }
            },
        )
        invalid_generation_output = SkillOutput(
            text="generation ok",
            metadata={
                "caption": "",
                "hook_options": ["Hook A"],
                "hashtags": ["tag1"],
                "carousel_outline": [{"title": "Slide 1", "body": "Body 1"}],
                "reel_script": "Reel script",
            },
        )
        with (
            patch.object(StyleAnalysisSkill, "run", return_value=style_output),
            patch.object(InstagramGenerationSkill, "run", return_value=invalid_generation_output),
        ):
            resp = client.post(
                "/api/instagram/generate",
                json={"topic": "test", "template_text": "template"},
            )
        events = _parse_sse_stream(resp.text)
        assert [event["event"] for event in events] == [
            "pipeline_started",
            "style_analysis_started",
            "style_analysis_completed",
            "generation_started",
            "error",
        ]
        assert events[-1]["data"]["stage"] == "generation"

    def test_style_analysis_failure_emits_error_event(self):
        reset_generation_metrics()
        reset_generation_guards()
        with patch.object(
            StyleAnalysisSkill,
            "run",
            side_effect=ValueError("style boom"),
        ):
            resp = client.post(
                "/api/instagram/generate",
                json={"topic": "test", "template_text": "template"},
            )
        events = _parse_sse_stream(resp.text)
        assert [event["event"] for event in events] == [
            "pipeline_started",
            "style_analysis_started",
            "error",
        ]
        assert events[-1]["data"] == {
            "stage": "style_analysis",
            "message": "style boom",
        }

    def test_generation_failure_emits_error_event(self):
        reset_generation_metrics()
        reset_generation_guards()
        style_output = SkillOutput(
            text="style ok",
            metadata={
                "style_analysis": {
                    "tone_keywords": ["bold"],
                    "structural_patterns": ["hook first"],
                    "vocabulary_notes": "direct voice",
                }
            },
        )
        with (
            patch.object(StyleAnalysisSkill, "run", return_value=style_output),
            patch.object(
                InstagramGenerationSkill,
                "run",
                side_effect=ValueError("generation boom"),
            ),
        ):
            resp = client.post(
                "/api/instagram/generate",
                json={"topic": "test", "template_text": "template"},
            )
        events = _parse_sse_stream(resp.text)
        assert [event["event"] for event in events] == [
            "pipeline_started",
            "style_analysis_started",
            "style_analysis_completed",
            "generation_started",
            "error",
        ]
        assert events[-1]["data"] == {
            "stage": "generation",
            "message": "generation boom",
        }

    def test_scoring_failure_emits_error_event(self):
        reset_generation_metrics()
        reset_generation_guards()
        style_output = SkillOutput(
            text="style ok",
            metadata={
                "style_analysis": {
                    "tone_keywords": ["bold"],
                    "structural_patterns": ["hook first"],
                    "vocabulary_notes": "direct voice",
                }
            },
        )
        generation_output = SkillOutput(
            text="generation ok",
            metadata={
                "caption": "Caption",
                "hook_options": ["Hook A"],
                "hashtags": ["tag1"],
                "carousel_outline": [{"title": "Slide 1", "body": "Body 1"}],
                "reel_script": "Reel script",
            },
        )
        with (
            patch.object(StyleAnalysisSkill, "run", return_value=style_output),
            patch.object(
                InstagramGenerationSkill,
                "run",
                return_value=generation_output,
            ),
            patch.object(
                ContentScoringSkill,
                "run",
                side_effect=ValueError("scoring boom"),
            ),
        ):
            resp = client.post(
                "/api/instagram/generate",
                json={"topic": "test", "template_text": "template"},
            )
        events = _parse_sse_stream(resp.text)
        assert [event["event"] for event in events] == [
            "pipeline_started",
            "style_analysis_started",
            "style_analysis_completed",
            "generation_started",
            "generation_completed",
            "scoring_started",
            "error",
        ]
        assert events[-1]["data"] == {
            "stage": "scoring",
            "message": "scoring boom",
        }

    def test_generation_metrics_endpoint_tracks_instagram_success_and_failure(self, mock_llm):
        reset_generation_metrics()
        reset_generation_guards()
        success_response = client.post(
            "/api/instagram/generate",
            json={"topic": "test", "template_text": "template"},
        )
        assert success_response.status_code == 200

        with patch.object(
            StyleAnalysisSkill,
            "run",
            side_effect=ValueError("style boom"),
        ):
            failure_response = client.post(
                "/api/instagram/generate",
                json={"topic": "test", "template_text": "template"},
            )
        assert failure_response.status_code == 200

        metrics_response = client.get("/health/generation-metrics")
        assert metrics_response.status_code == 200
        metrics = metrics_response.json()
        assert metrics["by_pipeline"]["instagram"]["total_runs"] == 2
        assert metrics["by_pipeline"]["instagram"]["successful_runs"] == 1
        assert metrics["by_pipeline"]["instagram"]["failed_runs"] == 1
        assert metrics["by_pipeline"]["instagram"]["failures_by_reason"]["stage_exception"] == 1

    def test_instagram_route_rate_limits_by_ip(self, mock_llm, monkeypatch):
        reset_generation_metrics()
        reset_generation_guards()
        monkeypatch.setenv("INSTAGRAM_GENERATE_RATE_LIMIT_PER_MINUTE", "1")

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

    def test_instagram_route_rejects_concurrent_runs_from_same_ip(self, monkeypatch):
        reset_generation_metrics()
        reset_generation_guards()
        monkeypatch.setenv("INSTAGRAM_GENERATE_MAX_CONCURRENT_PER_IP", "1")

        # Simulate an existing concurrent request from this IP by directly setting
        # the active request count (avoids needing an async context for acquire()).
        GENERATION_GUARDS._active_requests[(INSTAGRAM_ROUTE_KEY, "203.0.113.21")] = 1
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
        finally:
            GENERATION_GUARDS._active_requests.pop((INSTAGRAM_ROUTE_KEY, "203.0.113.21"), None)

    def test_instagram_route_rejects_oversized_request_body(self, monkeypatch):
        reset_generation_metrics()
        reset_generation_guards()
        monkeypatch.setenv("INSTAGRAM_GENERATE_MAX_BODY_BYTES", "100")

        response = client.post(
            "/api/instagram/generate",
            json={"topic": "x" * 120, "template_text": "template"},
        )

        assert response.status_code == 413
        assert response.json()["detail"] == "Request body too large for generation endpoint."
