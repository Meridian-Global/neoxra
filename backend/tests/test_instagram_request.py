import pytest
from pydantic import ValidationError

from app.api.instagram_routes import InstagramGenerateRequest


class TestInstagramGenerateRequestValid:
    def test_minimal_valid_request(self):
        req = InstagramGenerateRequest(topic="x", template_text="y")
        assert req.topic == "x"
        assert req.template_text == "y"

    def test_defaults(self):
        req = InstagramGenerateRequest(topic="x", template_text="y")
        assert req.goal == "engagement"
        assert req.style_examples == []
        assert req.voice_profile == "default"

    def test_all_fields_provided(self):
        req = InstagramGenerateRequest(
            topic="AI tools",
            template_text="Here is a template",
            goal="authority",
            style_examples=["example one"],
            voice_profile="custom",
        )
        assert req.goal == "authority"
        assert req.style_examples == ["example one"]
        assert req.voice_profile == "custom"

    def test_each_valid_goal_accepted(self):
        for goal in ("engagement", "authority", "conversion", "save", "share"):
            req = InstagramGenerateRequest(topic="x", template_text="y", goal=goal)
            assert req.goal == goal


class TestInstagramGenerateRequestInvalid:
    def test_empty_topic_rejected(self):
        with pytest.raises(ValidationError) as exc_info:
            InstagramGenerateRequest(topic="", template_text="y")
        assert "topic" in str(exc_info.value)

    def test_whitespace_only_topic_rejected(self):
        with pytest.raises(ValidationError) as exc_info:
            InstagramGenerateRequest(topic="   ", template_text="y")
        assert "topic" in str(exc_info.value)

    def test_empty_template_text_rejected(self):
        with pytest.raises(ValidationError) as exc_info:
            InstagramGenerateRequest(topic="x", template_text="")
        assert "template_text" in str(exc_info.value)

    def test_whitespace_only_template_text_rejected(self):
        with pytest.raises(ValidationError) as exc_info:
            InstagramGenerateRequest(topic="x", template_text="  \t\n  ")
        assert "template_text" in str(exc_info.value)

    def test_invalid_goal_rejected(self):
        with pytest.raises(ValidationError) as exc_info:
            InstagramGenerateRequest(topic="x", template_text="y", goal="invalid")
        assert "goal" in str(exc_info.value)
