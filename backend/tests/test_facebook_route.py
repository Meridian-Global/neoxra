"""Tests for POST /api/facebook/generate SSE streaming route."""

import json

from fastapi.testclient import TestClient

import app.api.facebook_routes as facebook_routes
from app.core_client import CoreFacebookGenerationRequest, CoreInstagramGenerationRequest
from app.main import app

client = TestClient(app)

INSTAGRAM_CONTENT = {
    "caption": "小團隊不是缺內容點子，而是缺一個穩定流程。",
    "hook_options": ["小團隊不是缺人", "先整理流程"],
    "hashtags": [],
    "carousel_outline": [
        {"title": "先定義主題", "body": "不要每次都從零開始討論"},
        {"title": "再改寫平台", "body": "同一個想法需要不同語氣"},
        {"title": "最後人工審稿", "body": "保留人的判斷"},
    ],
    "reel_script": "Hook: 小團隊不是缺人\nBody: 流程更重要\nCTA: 先審稿",
}

FACEBOOK_POST = {
    "hook": "很多小團隊以為內容做不起來，是因為人手不夠。",
    "body": "但真正卡住的，通常是流程。每次都重新討論角度、語氣和格式，團隊很快就會停下來。",
    "discussion_prompt": "你們團隊目前最卡的是想主題、寫初稿，還是最後審稿？",
    "share_hook": "分享給那個正在用小團隊做大內容量的創辦人。",
    "image_recommendation": "用一張 checklist 圖整理主題、平台改寫、人工審稿三步驟。",
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


class FakeFacebookCoreClient:
    mode = "local"
    requires_local_api_key = False

    def __init__(self):
        self.generated_instagram_first = False
        self.last_instagram_caption = None
        self.last_carousel_summary = None

    def ensure_facebook_available(self):
        return None

    def ensure_instagram_available(self):
        return None

    def build_facebook_generation_request(self, *, topic: str, locale: str):
        return CoreFacebookGenerationRequest(topic=topic, locale=locale)

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
            style_examples=style_examples,
            reference_image_description=reference_image_description,
        )

    def analyze_instagram_style(self, **kwargs):
        self.generated_instagram_first = True
        return {"tone_keywords": ["practical"], "structural_patterns": [], "vocabulary_notes": "clear"}

    def generate_instagram_content(self, **kwargs):
        self.generated_instagram_first = True
        return dict(INSTAGRAM_CONTENT)

    def generate_facebook_content(
        self,
        *,
        generation_request: CoreFacebookGenerationRequest,
        brief_context: dict,
        instagram_caption: str,
        carousel_summary: str,
        voice_profile: dict | None = None,
    ):
        self.last_instagram_caption = instagram_caption
        self.last_carousel_summary = carousel_summary
        return dict(FACEBOOK_POST)


def _use_fake_core_client(monkeypatch, fake_client: FakeFacebookCoreClient) -> FakeFacebookCoreClient:
    monkeypatch.setattr(facebook_routes, "_get_core_client", lambda: fake_client)
    return fake_client


def test_facebook_stream_uses_provided_instagram_content(monkeypatch):
    fake = _use_fake_core_client(monkeypatch, FakeFacebookCoreClient())

    response = client.post(
        "/api/facebook/generate",
        headers={"X-Neoxra-Demo-Surface": "facebook"},
        json={
            "topic": "小團隊如何用 AI 更快出貨",
            "locale": "zh-TW",
            "instagram_content": INSTAGRAM_CONTENT,
        },
    )

    assert response.status_code == 200
    events = _parse_sse_stream(response.text)
    assert [event["event"] for event in events] == [
        "phase_started",
        "content_ready",
        "pipeline_completed",
    ]
    assert events[1]["data"] == FACEBOOK_POST
    assert fake.generated_instagram_first is False
    assert fake.last_instagram_caption == INSTAGRAM_CONTENT["caption"]
    assert "先定義主題" in fake.last_carousel_summary


def test_facebook_stream_generates_instagram_first_when_missing(monkeypatch):
    fake = _use_fake_core_client(monkeypatch, FakeFacebookCoreClient())

    response = client.post(
        "/api/facebook/generate",
        headers={"X-Neoxra-Demo-Surface": "facebook"},
        json={"topic": "小團隊如何用 AI 更快出貨", "locale": "zh-TW"},
    )

    assert response.status_code == 200
    events = _parse_sse_stream(response.text)
    assert [event["event"] for event in events] == [
        "phase_started",
        "content_ready",
        "pipeline_completed",
    ]
    assert fake.generated_instagram_first is True
    assert events[-1]["data"]["facebook_post"] == FACEBOOK_POST


def test_facebook_invalid_source_content_emits_error_event(monkeypatch):
    _use_fake_core_client(monkeypatch, FakeFacebookCoreClient())

    response = client.post(
        "/api/facebook/generate",
        headers={"X-Neoxra-Demo-Surface": "facebook"},
        json={
            "topic": "小團隊如何用 AI 更快出貨",
            "instagram_content": {"carousel_outline": []},
        },
    )

    assert response.status_code == 200
    events = _parse_sse_stream(response.text)
    assert [event["event"] for event in events] == ["phase_started", "error"]
    assert events[-1]["data"]["error_code"] == "FACEBOOK_SOURCE_INVALID"
