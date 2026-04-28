"""Strict output validation rules for platform payloads."""

import pytest

from app.core.output_validation import (
    validate_facebook_post_payload,
    validate_instagram_generation_payload,
    validate_seo_article_payload,
    validate_threads_content_payload,
)


def _valid_instagram():
    return {
        "caption": "A useful caption.",
        "hook_options": ["Hook one"],
        "hashtags": ["#demo"],
        "carousel_outline": [
            {"title": f"Slide {index}", "body": "Useful body"}
            for index in range(1, 6)
        ],
        "reel_script": "Short reel script.",
    }


def _valid_seo():
    return {
        "metadata": {
            "title": "A" * 55,
            "meta_description": "B" * 155,
            "url_slug": "valid-seo-article",
            "primary_keyword": "SEO",
            "secondary_keywords": ["content", "strategy"],
            "target_search_intent": "informational",
        },
        "h1": "Useful SEO article",
        "introduction": "Clear introduction",
        "sections": [
            {"heading": "One", "heading_level": 2, "content": "First section"},
            {"heading": "Two", "heading_level": 2, "content": "Second section"},
            {"heading": "Three", "heading_level": 2, "content": "Third section"},
        ],
        "conclusion": "Clear conclusion",
        "summary_points": ["One thing", "Another thing"],
        "cta": "Contact us",
        "estimated_word_count": 3000,
    }


def _valid_threads():
    return {
        "format": "thread",
        "reply_bait": "Which point would you add?",
        "posts": [
            {"content": "First post", "post_number": 1, "purpose": "hook"},
            {"content": "Second post", "post_number": 2, "purpose": "cta"},
        ],
    }


def _valid_facebook():
    return {
        "hook": "A strong opening.",
        "body": "A useful Facebook-native body.",
        "discussion_prompt": "Which part would you discuss first?",
        "share_hook": "Share this with your team.",
        "image_recommendation": "Use a checklist image.",
    }


def test_instagram_validation_accepts_valid_payload():
    assert validate_instagram_generation_payload(_valid_instagram())["caption"]


def test_instagram_validation_rejects_wrong_slide_count():
    payload = _valid_instagram()
    payload["carousel_outline"] = payload["carousel_outline"][:4]

    with pytest.raises(ValueError):
        validate_instagram_generation_payload(payload)


def test_seo_validation_accepts_valid_payload():
    assert validate_seo_article_payload(_valid_seo())["estimated_word_count"] == 3000


def test_seo_validation_rejects_short_title():
    payload = _valid_seo()
    payload["metadata"]["title"] = "too short"

    with pytest.raises(ValueError):
        validate_seo_article_payload(payload)


def test_threads_validation_accepts_valid_payload():
    assert len(validate_threads_content_payload(_valid_threads())["posts"]) == 2


def test_threads_validation_rejects_long_post():
    payload = _valid_threads()
    payload["posts"][0]["content"] = "x" * 501

    with pytest.raises(ValueError):
        validate_threads_content_payload(payload)


def test_facebook_validation_accepts_valid_payload():
    assert validate_facebook_post_payload(_valid_facebook())["hook"]


def test_facebook_validation_rejects_empty_required_field():
    payload = _valid_facebook()
    payload["discussion_prompt"] = ""

    with pytest.raises(ValueError):
        validate_facebook_post_payload(payload)
