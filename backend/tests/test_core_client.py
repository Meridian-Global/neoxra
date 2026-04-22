from app.core_client import get_core_client, reset_core_client_cache
from app.core_client.factory import get_core_client_mode
from app.core_client.local import LocalCoreClient
from app.core_client.types import (
    CoreFacebookGenerationRequest,
    CoreSeoGenerationRequest,
    CoreThreadsGenerationRequest,
)


def test_core_client_defaults_to_local(monkeypatch):
    monkeypatch.delenv("NEOXRA_CORE_CLIENT_MODE", raising=False)
    reset_core_client_cache()

    client = get_core_client()

    assert get_core_client_mode() == "local"
    assert client.mode == "local"


def test_core_client_can_select_http_adapter(monkeypatch):
    monkeypatch.setenv("NEOXRA_CORE_CLIENT_MODE", "http")
    monkeypatch.setenv("NEOXRA_CORE_API_BASE_URL", "https://core.example.com")
    reset_core_client_cache()

    client = get_core_client()

    assert get_core_client_mode() == "http"
    assert client.mode == "http"
    assert client.base_url == "https://core.example.com"


def test_local_core_client_passes_locale_to_seo_threads_and_facebook(monkeypatch):
    captured: dict[str, object] = {}

    class FakeSeoArticle:
        def to_dict(self):
            return {"h1": "測試文章"}

    class FakeSeoPipeline:
        def run(self, **kwargs):
            captured["seo_locale"] = kwargs["locale"]
            return FakeSeoArticle()

    class FakeSkillInput:
        def __init__(self, *, text, context):
            self.text = text
            self.context = context

    class FakeThreadsSkill:
        def run(self, skill_input):
            captured["threads_locale"] = skill_input.context["locale"]
            return type("Output", (), {"metadata": {"thread": {"posts": []}}})()

    class FakeFacebookSkill:
        def run(self, skill_input):
            captured["facebook_locale"] = skill_input.context["locale"]
            return type("Output", (), {"metadata": {"facebook_post": {"body": "測試"}}})()

    import app.core_client.local as local_module

    monkeypatch.setattr(local_module, "SeoPipeline", FakeSeoPipeline)
    monkeypatch.setattr(local_module, "SkillInput", FakeSkillInput)
    monkeypatch.setattr(local_module, "ThreadsGenerationSkill", FakeThreadsSkill)
    monkeypatch.setattr(local_module, "FacebookAdapterSkill", FakeFacebookSkill)

    client = LocalCoreClient()
    client.generate_seo_article(
        generation_request=CoreSeoGenerationRequest(
            topic="車禍理賠",
            goal="authority",
            locale="zh-TW",
        ),
        brief_context={},
    )
    client.generate_threads_content(
        generation_request=CoreThreadsGenerationRequest(
            topic="車禍理賠",
            goal="engagement",
            locale="zh-TW",
        ),
        brief_context={},
    )
    client.generate_facebook_content(
        generation_request=CoreFacebookGenerationRequest(
            topic="車禍理賠",
            locale="zh-TW",
        ),
        brief_context={},
        instagram_caption="車禍後先報警。",
        carousel_summary="1. 先報警",
    )

    assert captured == {
        "seo_locale": "zh-TW",
        "threads_locale": "zh-TW",
        "facebook_locale": "zh-TW",
    }
