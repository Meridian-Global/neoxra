"""SSE contract tests for POST /api/instagram/generate.

Validates every event name, event ordering, and payload schema so that
any backend change that would break the frontend is caught immediately.
"""

import json

import pytest
from fastapi.testclient import TestClient

import app.api.instagram_routes as instagram_routes
from app.main import app

client = TestClient(app)

# ── SSE event schema contract ────────────────────────────────────────
# Maps each event name to {field_name: expected_type}.
# An empty dict means the payload must be exactly {}.

EVENT_SCHEMA = {
    "pipeline_started": {
        "topic": str,
        "goal": str,
        "locale": str,
    },
    "phase_started": {
        "phase": str,
    },
    "style_ready": {
        "tone_keywords": list,
        "structural_patterns": list,
        "vocabulary_notes": str,
    },
    "content_ready": {
        "caption": str,
        "hook_options": list,
        "hashtags": list,
        "carousel_outline": list,
        "reel_script": str,
    },
    "score_ready": {
        "hook_strength": int,
        "cta_clarity": int,
        "hashtag_relevance": int,
        "platform_fit": int,
        "tone_match": int,
        "originality": int,
    },
    "pipeline_completed": {
        "content": dict,
        "scorecard": dict,
        "critique": str,
        "style_analysis": dict,
    },
}

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

    def ensure_instagram_available(self):
        return None

    def build_instagram_generation_request(self, *, topic: str, template_text: str, goal: str, style_examples: list[str]):
        return type(
            "GenerationRequest",
            (),
            {
                "topic": topic,
                "template_text": template_text,
                "goal": goal,
                "style_examples": list(style_examples),
            },
        )()

    def analyze_instagram_style(self, *, template_text: str, style_examples: list[str]):
        return {
            "tone_keywords": ["bold", "conversational"],
            "structural_patterns": ["short paragraphs", "hook first"],
            "vocabulary_notes": "casual but smart",
        }

    def generate_instagram_content(
        self,
        *,
        generation_request,
        localized_template_text: str,
        style_analysis: dict[str, object],
        locale: str,
    ):
        return {
            "caption": "Test caption about AI tools",
            "hook_options": ["Hook A", "Hook B"],
            "hashtags": ["#ai", "#tools", "#productivity"],
            "carousel_outline": [{"title": f"Slide {i}", "body": f"Body {i}"} for i in range(1, 6)],
            "reel_script": "Open on a laptop screen...",
        }

    def score_instagram_content(self, *, content: dict[str, object], goal: str):
        return (
            {
                "hook_strength": 8,
                "cta_clarity": 7,
                "hashtag_relevance": 9,
                "platform_fit": 8,
                "tone_match": 7,
                "originality": 6,
            },
            "Strong hook but CTA could be sharper.",
        )


# ── Helpers ───────────────────────────────────────────────────────────

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


def _fire_pipeline() -> list[dict]:
    """Mock the core client, hit the route, return parsed SSE events."""
    instagram_routes._get_core_client = lambda: FakeInstagramCoreClient()
    resp = client.post(
        "/api/instagram/generate",
        json={"topic": "test", "template_text": "template", "locale": "en"},
    )
    assert resp.status_code == 200
    return _parse_sse_stream(resp.text)


# ── Contract tests ────────────────────────────────────────────────────

class TestSSEContract:
    """Full contract validation: count, order, names, and payload schemas."""

    @pytest.fixture(autouse=True)
    def _events(self):
        self.events = _fire_pipeline()

    def test_exact_event_count(self):
        assert len(self.events) == 8, (
            f"Expected 8 SSE events, got {len(self.events)}: "
            f"{[e['event'] for e in self.events]}"
        )

    def test_exact_event_order(self):
        actual = [e["event"] for e in self.events]
        assert actual == EXPECTED_EVENT_ORDER

    def test_every_event_name_is_recognised(self):
        for ev in self.events:
            assert ev["event"] in EVENT_SCHEMA, (
                f"Unknown SSE event '{ev['event']}'"
            )

    @pytest.mark.parametrize("index,event_name", list(enumerate(EXPECTED_EVENT_ORDER)))
    def test_payload_has_required_keys(self, index, event_name):
        schema = EVENT_SCHEMA[event_name]
        ev = self.events[index]
        data = ev["data"]
        for key in schema:
            assert key in data, (
                f"Event '{event_name}' missing required key '{key}'"
            )

    @pytest.mark.parametrize("index,event_name", list(enumerate(EXPECTED_EVENT_ORDER)))
    def test_payload_value_types(self, index, event_name):
        schema = EVENT_SCHEMA[event_name]
        ev = self.events[index]
        data = ev["data"]
        for key, expected_type in schema.items():
            assert isinstance(data[key], expected_type), (
                f"Event '{event_name}', key '{key}': "
                f"expected {expected_type.__name__}, got {type(data[key]).__name__}"
            )

    def test_public_sse_no_longer_exposes_internal_stage_names(self):
        actual = [e["event"] for e in self.events]
        assert "style_analysis_started" not in actual
        assert "generation_started" not in actual
        assert "scoring_started" not in actual
        assert "style_analysis_completed" not in actual
        assert "generation_completed" not in actual
        assert "scoring_completed" not in actual
