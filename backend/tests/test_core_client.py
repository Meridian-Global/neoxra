from app.core_client import get_core_client, reset_core_client_cache
from app.core_client.factory import get_core_client_mode


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
