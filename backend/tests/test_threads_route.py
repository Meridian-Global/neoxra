"""Tests for POST /api/threads/generate SSE streaming route."""

import json

from fastapi.testclient import TestClient

import app.api.threads_routes as threads_routes
from app.core_client import CoreThreadsGenerationRequest
from app.main import app

client = TestClient(app)

THREAD_CONTENT = {
    "format": "thread",
    "reply_bait": "你現在最想回覆哪一點？",
    "posts": [
        {
            "content": "很多小團隊不是缺人，而是缺一個不會把大家拖進會議裡的內容流程。",
            "post_number": 1,
            "purpose": "hook",
        },
        {
            "content": "AI 真正有用的地方，是把重複格式、初稿和平台改寫先處理掉，讓人只審方向。",
            "post_number": 2,
            "purpose": "argument",
        },
        {
            "content": "最好的流程通常很短：一個主題、三個角度、一次審稿、直接發布。",
            "post_number": 3,
            "purpose": "cta",
        },
    ],
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


class FakeThreadsCoreClient:
    mode = "local"
    requires_local_api_key = False

    def __init__(self, *, result: dict | Exception | None = None):
        self.result = result if result is not None else dict(THREAD_CONTENT)
        self.last_generation_request = None
        self.last_brief_context = None

    def ensure_threads_available(self):
        return None

    def build_threads_generation_request(self, *, topic: str, goal: str, locale: str):
        return CoreThreadsGenerationRequest(topic=topic, goal=goal, locale=locale)

    def generate_threads_content(
        self,
        *,
        generation_request: CoreThreadsGenerationRequest,
        brief_context: dict,
        voice_profile: dict | None = None,
    ):
        self.last_generation_request = generation_request
        self.last_brief_context = brief_context
        if isinstance(self.result, Exception):
            raise self.result
        return self.result


def _use_fake_core_client(monkeypatch, fake_client: FakeThreadsCoreClient) -> FakeThreadsCoreClient:
    monkeypatch.setattr(threads_routes, "_get_core_client", lambda: fake_client)
    return fake_client


def test_threads_stream_contains_expected_events_in_order(monkeypatch):
    _use_fake_core_client(monkeypatch, FakeThreadsCoreClient())

    response = client.post(
        "/api/threads/generate",
        headers={"X-Neoxra-Demo-Surface": "threads"},
        json={"topic": "AI 工具如何幫小團隊更快出貨", "goal": "engagement", "locale": "zh-TW"},
    )

    assert response.status_code == 200
    assert "text/event-stream" in response.headers["content-type"]
    events = _parse_sse_stream(response.text)
    assert [event["event"] for event in events] == [
        "phase_started",
        "content_ready",
        "pipeline_completed",
    ]
    assert events[1]["data"]["posts"][0]["content"] == THREAD_CONTENT["posts"][0]["content"]
    assert events[-1]["data"]["thread"]["reply_bait"] == THREAD_CONTENT["reply_bait"]


def test_threads_generation_receives_locale_and_demo_surface(monkeypatch):
    fake_client = _use_fake_core_client(monkeypatch, FakeThreadsCoreClient())

    response = client.post(
        "/api/threads/generate",
        headers={"X-Neoxra-Demo-Surface": "threads"},
        json={"topic": "內容分發", "goal": "authority", "locale": "zh-TW"},
    )

    assert response.status_code == 200
    assert fake_client.last_generation_request == CoreThreadsGenerationRequest(
        topic="內容分發",
        goal="authority",
        locale="zh-TW",
    )
    assert fake_client.last_brief_context == {
        "goal": "authority",
        "locale": "zh-TW",
        "demo_surface": "threads",
    }


def test_threads_generation_error_emits_error_event(monkeypatch):
    _use_fake_core_client(monkeypatch, FakeThreadsCoreClient(result=RuntimeError("provider failed")))

    response = client.post(
        "/api/threads/generate",
        headers={"X-Neoxra-Demo-Surface": "threads"},
        json={"topic": "內容分發", "goal": "engagement"},
    )

    assert response.status_code == 200
    events = _parse_sse_stream(response.text)
    assert [event["event"] for event in events] == ["phase_started", "error"]
    assert events[-1]["data"]["stage"] == "threads"
