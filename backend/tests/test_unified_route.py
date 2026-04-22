"""Tests for POST /api/generate-all unified SSE orchestration."""

import json
from json import JSONDecodeError

from fastapi.testclient import TestClient

import app.api.unified_routes as unified_routes
from app.core_client import (
    CoreFacebookGenerationRequest,
    CoreInstagramGenerationRequest,
    CoreSeoGenerationRequest,
    CoreThreadsGenerationRequest,
)
from app.main import app

client = TestClient(app)
LAW_FIRM_DISCLAIMER = "本內容為一般法律資訊分享，非針對個案之法律意見。如有具體法律問題，建議諮詢專業律師。"

INSTAGRAM_CONTENT = {
    "caption": "車禍後先報警、拍照、就醫，再談理賠。",
    "hook_options": ["車禍後別急著和解"],
    "hashtags": ["#法律常識", "#車禍理賠"],
    "carousel_outline": [
        {"title": "先報警", "body": "留下事故紀錄"},
        {"title": "先就醫", "body": "保存診斷證明"},
        {"title": "先整理", "body": "收據與請假紀錄"},
        {"title": "看時效", "body": "不要拖到權利睡著"},
        {"title": "再和解", "body": "確認金額再簽字"},
    ],
    "reel_script": "車禍後先做三件事：報警、拍照、就醫。",
}

SEO_ARTICLE = {
    "metadata": {
        "title": "A" * 55,
        "meta_description": "B" * 155,
        "url_slug": "car-accident-claim",
        "primary_keyword": "車禍理賠",
        "secondary_keywords": ["交通事故", "損害賠償"],
        "target_search_intent": "了解理賠流程",
    },
    "h1": "車禍理賠流程完整指南",
    "introduction": "車禍後先整理證據，後續理賠才不會被動。",
    "sections": [
        {"heading": "第一步", "heading_level": 2, "content": "先報警與就醫。"},
        {"heading": "第二步", "heading_level": 2, "content": "整理醫療費與工作損失。"},
        {"heading": "第三步", "heading_level": 2, "content": "確認責任比例再和解。"},
    ],
    "conclusion": "越早整理資料越好。",
    "summary_points": ["報警", "拍照", "就醫"],
    "cta": "需要協助可先整理資料再諮詢。",
    "estimated_word_count": 1500,
}

THREAD_CONTENT = {
    "format": "thread",
    "reply_bait": "你最想先釐清哪一步？",
    "posts": [
        {"content": "車禍後第一件事不是談金額。", "post_number": 1, "purpose": "hook"},
        {"content": "先把證據和醫療紀錄留完整。", "post_number": 2, "purpose": "argument"},
    ],
}

FACEBOOK_POST = {
    "hook": "車禍後很多人急著和解，反而讓自己更被動。",
    "body": "先整理事故紀錄、醫療文件與損害項目，後面談理賠才有基礎。",
    "discussion_prompt": "你遇過最難談的是責任比例還是理賠金額？",
    "share_hook": "分享給正在處理車禍理賠的人。",
    "image_recommendation": "一張五步驟 checklist。",
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


class FakeUnifiedCoreClient:
    mode = "local"
    requires_local_api_key = False

    def __init__(self, *, fail_threads: bool = False, fail_threads_build: bool = False):
        self.fail_threads = fail_threads
        self.fail_threads_build = fail_threads_build
        self.facebook_caption = None

    def ensure_pipeline_available(self):
        return None

    def ensure_instagram_available(self):
        return None

    def ensure_seo_available(self):
        return None

    def ensure_threads_available(self):
        return None

    def ensure_facebook_available(self):
        return None

    def stream_core_pipeline(self, idea: str, voice_profile_name: str = "default", locale: str = "en"):
        yield {"event": "planner_started", "data": {}}
        yield {
            "event": "planner_completed",
            "data": {"brief": {"idea": idea, "audience": "台灣讀者", "locale": locale}},
        }

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
        return {"tone_keywords": ["清楚"], "structural_patterns": [], "vocabulary_notes": "繁中"}

    def generate_instagram_content(self, **kwargs):
        return dict(INSTAGRAM_CONTENT)

    def build_seo_generation_request(self, *, topic: str, goal: str, locale: str):
        return CoreSeoGenerationRequest(topic=topic, goal=goal, locale=locale)

    def generate_seo_article(self, **kwargs):
        return dict(SEO_ARTICLE)

    def build_threads_generation_request(self, *, topic: str, goal: str, locale: str):
        if self.fail_threads_build:
            raise JSONDecodeError("invalid json", "{", 0)
        return CoreThreadsGenerationRequest(topic=topic, goal=goal, locale=locale)

    def generate_threads_content(self, **kwargs):
        if self.fail_threads:
            raise RuntimeError("threads provider failed")
        return dict(THREAD_CONTENT)

    def build_facebook_generation_request(self, *, topic: str, locale: str):
        return CoreFacebookGenerationRequest(topic=topic, locale=locale)

    def generate_facebook_content(self, *, instagram_caption: str, **kwargs):
        self.facebook_caption = instagram_caption
        return dict(FACEBOOK_POST)


def _use_fake_core_client(monkeypatch, fake_client: FakeUnifiedCoreClient) -> FakeUnifiedCoreClient:
    monkeypatch.setattr(unified_routes, "_get_core_client", lambda: fake_client)
    return fake_client


def test_generate_all_streams_all_platform_results(monkeypatch):
    fake = _use_fake_core_client(monkeypatch, FakeUnifiedCoreClient())

    response = client.post(
        "/api/generate-all",
        headers={"X-Neoxra-Demo-Surface": "landing"},
        json={
            "idea": "車禍理賠流程",
            "industry": "legal",
            "audience": "事故當事人",
            "goal": "traffic",
            "voice_profile": "law_firm",
            "locale": "zh-TW",
        },
    )

    assert response.status_code == 200
    events = _parse_sse_stream(response.text)
    event_names = [event["event"] for event in events]
    assert event_names[0] == "brief_ready"
    assert "instagram_ready" in event_names
    assert "seo_ready" in event_names
    assert "threads_ready" in event_names
    assert "facebook_ready" in event_names
    assert event_names[-1] == "all_completed"
    assert INSTAGRAM_CONTENT["caption"] in fake.facebook_caption
    assert events[-1]["data"]["errors"] == {}
    outputs = events[-1]["data"]["outputs"]
    assert LAW_FIRM_DISCLAIMER in outputs["instagram"]["caption"]
    assert LAW_FIRM_DISCLAIMER in outputs["seo"]["cta"]
    assert LAW_FIRM_DISCLAIMER in outputs["threads"]["posts"][-1]["content"]
    assert LAW_FIRM_DISCLAIMER in outputs["facebook"]["body"]


def test_generate_all_keeps_partial_results_when_one_platform_fails(monkeypatch):
    _use_fake_core_client(monkeypatch, FakeUnifiedCoreClient(fail_threads=True))

    response = client.post(
        "/api/generate-all",
        headers={"X-Neoxra-Demo-Surface": "landing"},
        json={"idea": "車禍理賠流程", "industry": "legal", "goal": "authority"},
    )

    assert response.status_code == 200
    events = _parse_sse_stream(response.text)
    event_names = [event["event"] for event in events]
    assert "threads_ready" in event_names
    assert "instagram_ready" in event_names
    assert "seo_ready" in event_names
    assert "facebook_ready" in event_names
    assert event_names[-1] == "all_completed"
    outputs = events[-1]["data"]["outputs"]
    assert outputs["threads"]["error"] is True
    assert outputs["threads"]["stage"] == "threads"
    assert "warning" in outputs["threads"]


def test_generate_all_platform_error_includes_reason(monkeypatch):
    _use_fake_core_client(monkeypatch, FakeUnifiedCoreClient(fail_threads_build=True))

    response = client.post(
        "/api/generate-all",
        headers={"X-Neoxra-Demo-Surface": "landing"},
        json={"idea": "車禍理賠流程", "industry": "legal", "goal": "authority"},
    )

    assert response.status_code == 200
    events = _parse_sse_stream(response.text)
    platform_errors = [event for event in events if event["event"] == "platform_error"]
    assert platform_errors
    threads_error = next(event for event in platform_errors if event["data"]["platform"] == "threads")
    assert threads_error["data"]["reason"] == "malformed_response"
