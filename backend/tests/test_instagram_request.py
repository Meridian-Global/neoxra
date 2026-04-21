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
        assert req.locale == "en"
        assert req.reference_image_description == ""

    def test_all_fields_provided(self):
        req = InstagramGenerateRequest(
            topic="AI tools",
            template_text="Here is a template",
            goal="authority",
            style_examples=["example one"],
            locale="zh-TW",
            reference_image_description="Minimal cream carousel with large centered headlines.",
        )
        assert req.goal == "authority"
        assert req.style_examples == ["example one"]
        assert req.locale == "zh-TW"
        assert "centered headlines" in req.reference_image_description

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

    def test_invalid_locale_rejected(self):
        with pytest.raises(ValidationError) as exc_info:
            InstagramGenerateRequest(topic="x", template_text="y", locale="zh-CN")
        assert "locale" in str(exc_info.value)

    def test_reference_image_description_length_limit_rejected(self):
        with pytest.raises(ValidationError) as exc_info:
            InstagramGenerateRequest(
                topic="x",
                template_text="y",
                reference_image_description="x" * 3001,
            )
        assert "reference_image_description must be <=" in str(exc_info.value)

    def test_topic_length_limit_rejected(self):
        with pytest.raises(ValidationError) as exc_info:
            InstagramGenerateRequest(topic="x" * 241, template_text="y")
        assert "topic must be <=" in str(exc_info.value)

    def test_style_examples_count_limit_rejected(self):
        with pytest.raises(ValidationError) as exc_info:
            InstagramGenerateRequest(
                topic="x",
                template_text="y",
                style_examples=["a", "b", "c", "d", "e", "f"],
            )
        assert "style_examples must contain <=" in str(exc_info.value)

    def test_extra_fields_rejected(self):
        with pytest.raises(ValidationError) as exc_info:
            InstagramGenerateRequest(topic="x", template_text="y", voice_profile="default")
        assert "Extra inputs are not permitted" in str(exc_info.value)
