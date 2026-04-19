import app.api.integrations_routes as integrations_routes
import app.api.routes as core_routes
from fastapi.testclient import TestClient

from app.main import app


def test_app_starts():
    client = TestClient(app)

    response = client.get("/docs")

    assert response.status_code == 200


def test_core_route_exists(monkeypatch):
    def fake_run_pipeline_stream(idea: str, voice_profile: str = "default", locale: str = "en"):
        assert idea == "hello"
        assert voice_profile == "default"
        assert locale == "en"
        yield {"event": "planner_started", "data": {}}
        yield {"event": "pipeline_completed", "data": {"ok": True}}

    monkeypatch.setattr(core_routes, "run_pipeline_stream", fake_run_pipeline_stream)

    client = TestClient(app)
    response = client.post("/api/run", json={"idea": "hello"})

    assert response.status_code == 200
    assert "text/event-stream" in response.headers["content-type"]
    assert "X-Request-ID" in response.headers


def test_health_route_sets_request_id_header():
    client = TestClient(app)

    response = client.get("/healthz")

    assert response.status_code == 200
    assert response.headers["X-Request-ID"]


def test_core_route_emits_error_when_stream_ends_early(monkeypatch):
    def fake_run_pipeline_stream(idea: str, voice_profile: str = "default", locale: str = "en"):
        assert idea == "hello"
        assert voice_profile == "default"
        assert locale == "en"
        yield {"event": "planner_started", "data": {}}

    monkeypatch.setattr(core_routes, "run_pipeline_stream", fake_run_pipeline_stream)

    client = TestClient(app)
    response = client.post("/api/run", json={"idea": "hello"})

    assert response.status_code == 200
    assert "event: error" in response.text
    assert '"message": "Pipeline ended before pipeline_completed was emitted."' in response.text


def test_core_route_does_not_double_emit_when_pipeline_emits_error(monkeypatch):
    def fake_run_pipeline_stream(idea: str, voice_profile: str = "default", locale: str = "en"):
        assert idea == "hello"
        assert voice_profile == "default"
        assert locale == "en"
        yield {"event": "planner_started", "data": {}}
        yield {"event": "error", "data": {"stage": "planner", "message": "planner failed"}}

    monkeypatch.setattr(core_routes, "run_pipeline_stream", fake_run_pipeline_stream)

    client = TestClient(app)
    response = client.post("/api/run", json={"idea": "hello"})

    assert response.status_code == 200
    assert response.text.count("event: error") == 1
    assert '"message": "planner failed"' in response.text


def test_core_route_accepts_locale(monkeypatch):
    def fake_run_pipeline_stream(idea: str, voice_profile: str = "default", locale: str = "en"):
        assert idea == "hello"
        assert voice_profile == "default"
        assert locale == "zh-TW"
        yield {"event": "planner_started", "data": {}}
        yield {"event": "pipeline_completed", "data": {"ok": True}}

    monkeypatch.setattr(core_routes, "run_pipeline_stream", fake_run_pipeline_stream)

    client = TestClient(app)
    response = client.post("/api/run", json={"idea": "hello", "locale": "zh-TW"})

    assert response.status_code == 200
    assert '"locale": "zh-TW"' in response.text


def test_core_route_emits_error_when_completed_payload_is_invalid(monkeypatch):
    def fake_run_pipeline_stream(idea: str, voice_profile: str = "default", locale: str = "en"):
        yield {"event": "planner_started", "data": {}}
        yield {
            "event": "pipeline_completed",
            "data": {
                "brief": {
                    "original_idea": "hello",
                    "core_angle": "angle",
                    "target_audience": "audience",
                    "tone": "tone",
                    "instagram_notes": "ig",
                    "threads_notes": "th",
                    "linkedin_notes": "li",
                },
                "instagram": "",
                "threads": "threads",
                "linkedin": "linkedin",
                "instagram_final": "ig final",
                "threads_final": "th final",
                "linkedin_final": "li final",
                "critic_notes": "notes",
            },
        }

    monkeypatch.setattr(core_routes, "run_pipeline_stream", fake_run_pipeline_stream)

    client = TestClient(app)
    response = client.post("/api/run", json={"idea": "hello"})

    assert response.status_code == 200
    assert "event: error" in response.text


def test_linkedin_publish_route_exists(monkeypatch):
    def fake_publish_to_linkedin(content: str, access_token: str, person_urn: str):
        assert content == "test post"
        assert access_token == "token"
        assert person_urn == "urn:li:person:test"
        return {"success": True, "post_id": "abc123", "error": None}

    monkeypatch.setattr(integrations_routes, "publish_to_linkedin", fake_publish_to_linkedin)

    client = TestClient(app)
    response = client.post(
        "/api/publish/linkedin",
        json={
            "content": "test post",
            "access_token": "token",
            "person_urn": "urn:li:person:test",
        },
    )

    assert response.status_code not in {404, 405}
    assert response.status_code == 200
    assert response.json() == {"post_id": "abc123", "error": None}


def test_gmail_scan_route_exists(monkeypatch):
    def fake_scan_inbox(max_results: int = 20):
        assert max_results == 20
        return [{"id": "1", "subject": "Hello", "snippet": "World"}]

    monkeypatch.setattr(integrations_routes, "scan_inbox", fake_scan_inbox)

    client = TestClient(app)
    response = client.get("/api/ideas/scan")

    assert response.status_code not in {404, 405}
    assert response.status_code == 200
    assert response.json() == [{"id": "1", "subject": "Hello", "snippet": "World"}]


def test_openapi_contains_expected_routes():
    client = TestClient(app)

    response = client.get("/openapi.json")

    assert response.status_code == 200
    paths = response.json()["paths"]
    assert "/api/run" in paths
    assert "/api/publish/linkedin" in paths
    assert "/api/ideas/scan" in paths
