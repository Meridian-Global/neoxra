"""SSE contract tests for POST /api/instagram/generate.

Validates every event name, event ordering, and payload schema so that
any backend change that would break the frontend is caught immediately.
"""

import json
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from orchestra.backend.main import app

client = TestClient(app)

# ── Canned LLM responses ─────────────────────────────────────────────

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

# ── SSE event schema contract ────────────────────────────────────────
# Maps each event name to {field_name: expected_type}.
# An empty dict means the payload must be exactly {}.

EVENT_SCHEMA = {
    "style_analysis_started": {},
    "style_analysis_completed": {
        "tone_keywords": list,
        "structural_patterns": list,
        "vocabulary_notes": str,
    },
    "generation_started": {},
    "generation_completed": {
        "caption": str,
        "hook_options": list,
        "hashtags": list,
        "carousel_outline": list,
        "reel_script": str,
    },
    "scoring_started": {},
    "scoring_completed": {
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

EXPECTED_EVENT_ORDER = list(EVENT_SCHEMA.keys())


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
    """Mock the LLM, hit the route, return parsed SSE events."""
    mock = MagicMock(
        side_effect=[STYLE_ANALYSIS_JSON, GENERATION_JSON, SCORING_JSON],
    )
    with (
        patch("orchestra_core.skills.style_analysis.generate", mock),
        patch("orchestra_core.skills.instagram_generation.generate", mock),
        patch("orchestra_core.skills.content_scoring.generate", mock),
    ):
        resp = client.post(
            "/api/instagram/generate",
            json={"topic": "test", "template_text": "template"},
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
        assert len(self.events) == 7, (
            f"Expected 7 SSE events, got {len(self.events)}: "
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

    @pytest.mark.parametrize("event_name", EXPECTED_EVENT_ORDER)
    def test_payload_has_required_keys(self, event_name):
        schema = EVENT_SCHEMA[event_name]
        ev = next(e for e in self.events if e["event"] == event_name)
        data = ev["data"]
        for key in schema:
            assert key in data, (
                f"Event '{event_name}' missing required key '{key}'"
            )

    @pytest.mark.parametrize("event_name", EXPECTED_EVENT_ORDER)
    def test_payload_value_types(self, event_name):
        schema = EVENT_SCHEMA[event_name]
        ev = next(e for e in self.events if e["event"] == event_name)
        data = ev["data"]
        for key, expected_type in schema.items():
            assert isinstance(data[key], expected_type), (
                f"Event '{event_name}', key '{key}': "
                f"expected {expected_type.__name__}, got {type(data[key]).__name__}"
            )

    @pytest.mark.parametrize(
        "event_name",
        [name for name, schema in EVENT_SCHEMA.items() if not schema],
    )
    def test_empty_payloads_are_empty(self, event_name):
        ev = next(e for e in self.events if e["event"] == event_name)
        assert ev["data"] == {}, (
            f"Event '{event_name}' should have empty payload, got {ev['data']}"
        )
