"""Integration-style test for unified pipeline orchestration with mocked LLM/core calls."""

from app.api.unified_routes import (
    UnifiedGenerateRequest,
    _build_brief,
    _generate_facebook,
    _generate_instagram,
    _generate_validated_platform,
    _generate_seo,
    _generate_threads,
)
from app.core.output_validation import (
    validate_facebook_post_payload,
    validate_instagram_generation_payload,
    validate_seo_article_payload,
    validate_threads_content_payload,
)
from app.core_client import (
    CoreFacebookGenerationRequest,
    CoreInstagramGenerationRequest,
    CoreSeoGenerationRequest,
    CoreThreadsGenerationRequest,
)


class MockUnifiedCoreClient:
    mode = "local"
    requires_local_api_key = False

    def stream_core_pipeline(self, idea: str, voice_profile_name: str = "default", locale: str = "en"):
        yield {"event": "planner_started", "data": {}}
        yield {
            "event": "planner_completed",
            "data": {
                "brief": {
                    "original_idea": idea,
                    "core_angle": "Make the topic practical and easy to act on.",
                    "target_audience": "Early customers",
                    "tone": "clear",
                    "instagram_notes": "Use five visual steps.",
                    "threads_notes": "Use concise posts.",
                    "linkedin_notes": "Use professional framing.",
                }
            },
        }

    def build_instagram_generation_request(self, *, topic, template_text, goal, style_examples, reference_image_description=""):
        return CoreInstagramGenerationRequest(
            topic=topic,
            template_text=template_text,
            goal=goal,
            style_examples=style_examples,
            reference_image_description=reference_image_description,
        )

    def analyze_instagram_style(self, **kwargs):
        return {"tone_keywords": ["clear"], "structural_patterns": ["steps"], "vocabulary_notes": "simple"}

    def generate_instagram_content(self, **kwargs):
        return {
            "caption": "Practical caption for the topic.",
            "hook_options": ["Start here"],
            "hashtags": ["#content"],
            "carousel_outline": [
                {"title": f"Step {index}", "body": "Actionable point"}
                for index in range(1, 6)
            ],
            "reel_script": "Short reel script.",
        }

    def build_seo_generation_request(self, *, topic, goal, locale):
        return CoreSeoGenerationRequest(topic=topic, goal=goal, locale=locale)

    def generate_seo_article(self, **kwargs):
        return {
            "metadata": {
                "title": "A" * 55,
                "meta_description": "B" * 155,
                "url_slug": "valid-output",
                "primary_keyword": "content",
                "secondary_keywords": ["strategy"],
                "target_search_intent": "informational",
            },
            "h1": "Valid article",
            "introduction": "Intro",
            "sections": [
                {"heading": "One", "heading_level": 2, "content": "First"},
                {"heading": "Two", "heading_level": 2, "content": "Second"},
                {"heading": "Three", "heading_level": 2, "content": "Third"},
            ],
            "conclusion": "Conclusion",
            "summary_points": ["One", "Two"],
            "cta": "Contact us",
            "estimated_word_count": 3000,
        }

    def build_threads_generation_request(self, *, topic, goal, locale):
        return CoreThreadsGenerationRequest(topic=topic, goal=goal, locale=locale)

    def generate_threads_content(self, **kwargs):
        return {
            "format": "thread",
            "reply_bait": "What would you add?",
            "posts": [
                {"content": "First post", "post_number": 1, "purpose": "hook"},
                {"content": "Second post", "post_number": 2, "purpose": "cta"},
            ],
        }

    def build_facebook_generation_request(self, *, topic, locale):
        return CoreFacebookGenerationRequest(topic=topic, locale=locale)

    def generate_facebook_content(self, **kwargs):
        return {
            "hook": "A strong Facebook hook.",
            "body": "A longer Facebook-native explanation.",
            "discussion_prompt": "Which part would you discuss first?",
            "share_hook": "Share this with the team.",
            "image_recommendation": "Use a simple checklist.",
        }


def test_unified_pipeline_produces_all_valid_platform_outputs():
    core_client = MockUnifiedCoreClient()
    req = UnifiedGenerateRequest(idea="AI content strategy", voice_profile="default", locale="zh-TW")

    brief = _build_brief(core_client, req)
    instagram = _generate_instagram(core_client, req, brief)
    seo = _generate_seo(core_client, req, brief)
    threads = _generate_threads(core_client, req, brief)
    facebook = _generate_facebook(core_client, req, brief, instagram)

    assert brief["core_angle"]
    assert validate_instagram_generation_payload(instagram)
    assert validate_seo_article_payload(seo)
    assert validate_threads_content_payload(threads)
    assert validate_facebook_post_payload(facebook)


def test_generate_validated_platform_retries_generation_value_error():
    calls = {"count": 0}

    def generate_content():
        calls["count"] += 1
        if calls["count"] == 1:
            raise ValueError("temporary malformed response")
        return MockUnifiedCoreClient().generate_threads_content()

    result = _generate_validated_platform("threads", generate_content)

    assert calls["count"] == 2
    assert validate_threads_content_payload(result)


def test_generate_validated_platform_retries_generation_runtime_error():
    calls = {"count": 0}

    def generate_content():
        calls["count"] += 1
        if calls["count"] == 1:
            raise RuntimeError("provider crashed")
        return MockUnifiedCoreClient().generate_facebook_content()

    result = _generate_validated_platform("facebook", generate_content)

    assert calls["count"] == 2
    assert validate_facebook_post_payload(result)


def test_generate_validated_platform_returns_warning_after_two_failures():
    calls = {"count": 0}

    def generate_content():
        calls["count"] += 1
        return {"metadata": {"title": "too short"}}

    result = _generate_validated_platform("seo", generate_content)

    assert calls["count"] == 2
    assert result["error"] is True
    assert result["stage"] == "seo"
    assert "warning" in result
    assert result["partial"] == {"metadata": {"title": "too short"}}
