import app.api.integrations_routes as integrations_routes
import app.api.routes as core_routes
from fastapi.testclient import TestClient

from app.core.generation_metrics import reset_generation_metrics
from app.core.request_guards import (
    CORE_ROUTE_KEY,
    GENERATION_GUARDS,
    reset_generation_guards,
)
from app.main import app


def _make_fake_core_client(stream_fn):
    class FakeCoreClient:
        mode = "local"
        requires_local_api_key = False

        def ensure_pipeline_available(self):
            return None

        def stream_core_pipeline(self, idea: str, voice_profile_name: str = "default", locale: str = "en"):
            return stream_fn(idea, voice_profile_name, locale)

    return FakeCoreClient()


def test_app_starts():
    client = TestClient(app)

    response = client.get("/docs")

    assert response.status_code == 200


def test_core_route_exists(monkeypatch):
    reset_generation_metrics()
    reset_generation_guards()

    def fake_run_pipeline_stream(idea: str, voice_profile: str = "default", locale: str = "en"):
        assert idea == "hello"
        assert voice_profile == "default"
        assert locale == "en"
        yield {"event": "planner_started", "data": {}}
        yield {"event": "pipeline_completed", "data": {"ok": True}}

    monkeypatch.setattr(core_routes, "_get_core_client", lambda: _make_fake_core_client(fake_run_pipeline_stream))

    client = TestClient(app)
    response = client.post("/api/run", json={"idea": "hello"})

    assert response.status_code == 200
    assert "text/event-stream" in response.headers["content-type"]
    assert "X-Request-ID" in response.headers
    assert "event: planner_started" not in response.text
    assert "event: phase_started" in response.text
    assert '"phase": "briefing"' in response.text


def test_core_route_maps_internal_events_to_public_sse_contract(monkeypatch):
    reset_generation_metrics()
    reset_generation_guards()

    def fake_run_pipeline_stream(idea: str, voice_profile: str = "default", locale: str = "en"):
        yield {"event": "planner_started", "data": {}}
        yield {
            "event": "planner_completed",
            "data": {
                "brief": {
                    "original_idea": "hello",
                    "core_angle": "angle",
                    "target_audience": "audience",
                    "tone": "tone",
                    "instagram_notes": "ig",
                    "threads_notes": "th",
                    "linkedin_notes": "li",
                }
            },
        }
        yield {"event": "instagram_pass1_started", "data": {}}
        yield {"event": "instagram_pass1_completed", "data": {"thinking": "t", "output": "ig draft"}}
        yield {"event": "critic_started", "data": {}}
        yield {
            "event": "critic_completed",
            "data": {
                "notes": "notes",
                "instagram_improved": "ig",
                "threads_improved": "th",
                "linkedin_improved": "li",
            },
        }
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
                "instagram": "instagram",
                "threads": "threads",
                "linkedin": "linkedin",
                "instagram_final": "instagram_final",
                "threads_final": "threads_final",
                "linkedin_final": "linkedin_final",
                "critic_notes": "notes",
            },
        }

    monkeypatch.setattr(core_routes, "_get_core_client", lambda: _make_fake_core_client(fake_run_pipeline_stream))

    client = TestClient(app)
    response = client.post("/api/run", json={"idea": "hello"})

    assert response.status_code == 200
    assert "event: brief_ready" in response.text
    assert "event: platform_output" in response.text
    assert "event: review_ready" in response.text
    assert "event: planner_completed" not in response.text
    assert "event: instagram_pass1_completed" not in response.text
    assert "event: critic_completed" not in response.text


def test_health_route_sets_request_id_header():
    client = TestClient(app)

    response = client.get("/healthz")

    assert response.status_code == 200
    assert response.headers["X-Request-ID"]


def test_core_health_hides_internal_diagnostics():
    client = TestClient(app)

    response = client.get("/health/core")

    assert response.status_code == 200
    payload = response.json()
    assert "status" in payload
    assert "core" in payload
    assert "import_ok" in payload["core"]
    assert "distribution_installed" in payload["core"]
    assert "distribution_version" in payload["core"]
    assert "direct_url" not in payload["core"]
    assert "verified_imports" not in payload["core"]


def test_runtime_health_exposes_safe_demo_surface_summary(monkeypatch):
    monkeypatch.setenv("NEOXRA_ENV_MODE", "public-demo")
    monkeypatch.setenv("NEOXRA_LEGAL_DEMO_ACCESS_MODE", "gated")

    client = TestClient(app)
    response = client.get("/health/runtime")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["runtime_mode"] == "public-demo"
    assert payload["demo_surfaces"]["landing"] == "public"
    assert payload["demo_surfaces"]["instagram"] == "public"
    assert payload["demo_surfaces"]["legal"] == "gated"


def test_demo_access_endpoint_returns_signed_token_for_gated_surface(monkeypatch):
    monkeypatch.setenv("NEOXRA_ENV_MODE", "public-demo")
    monkeypatch.setenv("NEOXRA_LEGAL_DEMO_ACCESS_MODE", "gated")
    monkeypatch.setenv("NEOXRA_LEGAL_DEMO_ACCESS_CODE", "law-demo")
    monkeypatch.setenv("NEOXRA_DEMO_SIGNING_SECRET", "demo-secret")

    client = TestClient(app)
    response = client.post(
        "/api/demo/access",
        json={"surface": "legal", "access_code": "law-demo"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["surface"] == "legal"
    assert payload["access_mode"] == "gated"
    assert payload["runtime_mode"] == "public-demo"
    assert isinstance(payload["demo_token"], str)
    assert payload["demo_token"]


def test_core_route_emits_error_when_stream_ends_early(monkeypatch):
    reset_generation_metrics()
    reset_generation_guards()

    def fake_run_pipeline_stream(idea: str, voice_profile: str = "default", locale: str = "en"):
        assert idea == "hello"
        assert voice_profile == "default"
        assert locale == "en"
        yield {"event": "planner_started", "data": {}}

    monkeypatch.setattr(core_routes, "_get_core_client", lambda: _make_fake_core_client(fake_run_pipeline_stream))

    client = TestClient(app)
    response = client.post("/api/run", json={"idea": "hello"})

    assert response.status_code == 200
    assert "event: error" in response.text
    assert '"message": "Generation could not be completed. Please try again."' in response.text
    assert '"error_code": "PIPELINE_INCOMPLETE"' in response.text


def test_core_route_does_not_double_emit_when_pipeline_emits_error(monkeypatch):
    reset_generation_metrics()
    reset_generation_guards()

    def fake_run_pipeline_stream(idea: str, voice_profile: str = "default", locale: str = "en"):
        assert idea == "hello"
        assert voice_profile == "default"
        assert locale == "en"
        yield {"event": "planner_started", "data": {}}
        yield {"event": "error", "data": {"stage": "planner", "message": "planner failed"}}

    monkeypatch.setattr(core_routes, "_get_core_client", lambda: _make_fake_core_client(fake_run_pipeline_stream))

    client = TestClient(app)
    response = client.post("/api/run", json={"idea": "hello"})

    assert response.status_code == 200
    assert response.text.count("event: error") == 1
    assert '"message": "Generation could not be completed. Please try again."' in response.text
    assert '"error_code": "GENERATION_FAILED"' in response.text


def test_core_route_accepts_locale(monkeypatch):
    reset_generation_metrics()
    reset_generation_guards()

    def fake_run_pipeline_stream(idea: str, voice_profile: str = "default", locale: str = "en"):
        assert idea == "hello"
        assert voice_profile == "default"
        assert locale == "zh-TW"
        yield {"event": "planner_started", "data": {}}
        yield {"event": "pipeline_completed", "data": {"ok": True}}

    monkeypatch.setattr(core_routes, "_get_core_client", lambda: _make_fake_core_client(fake_run_pipeline_stream))

    client = TestClient(app)
    response = client.post("/api/run", json={"idea": "hello", "locale": "zh-TW"})

    assert response.status_code == 200
    assert '"locale": "zh-TW"' in response.text


def test_core_route_emits_error_when_completed_payload_is_invalid(monkeypatch):
    reset_generation_metrics()
    reset_generation_guards()

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

    monkeypatch.setattr(core_routes, "_get_core_client", lambda: _make_fake_core_client(fake_run_pipeline_stream))

    client = TestClient(app)
    response = client.post("/api/run", json={"idea": "hello"})

    assert response.status_code == 200
    assert "event: error" in response.text
    assert '"error_code": "PIPELINE_OUTPUT_INVALID"' in response.text


def test_generation_metrics_endpoint_tracks_core_success_and_failure(monkeypatch):
    reset_generation_metrics()
    reset_generation_guards()

    def fake_success(idea: str, voice_profile: str = "default", locale: str = "en"):
        yield {"event": "planner_started", "data": {}}
        yield {
            "event": "planner_completed",
            "data": {
                "brief": {
                    "original_idea": "hello",
                    "core_angle": "angle",
                    "target_audience": "audience",
                    "tone": "tone",
                    "instagram_notes": "ig",
                    "threads_notes": "th",
                    "linkedin_notes": "li",
                }
            },
        }
        yield {
            "event": "instagram_pass1_completed",
            "data": {"thinking": "t", "output": "o"},
        }
        yield {
            "event": "threads_pass1_completed",
            "data": {"thinking": "t", "output": "o"},
        }
        yield {
            "event": "linkedin_pass1_completed",
            "data": {"thinking": "t", "output": "o"},
        }
        yield {
            "event": "instagram_pass2_completed",
            "data": {"thinking": "t", "output": "o"},
        }
        yield {
            "event": "threads_pass2_completed",
            "data": {"thinking": "t", "output": "o"},
        }
        yield {
            "event": "linkedin_pass2_completed",
            "data": {"thinking": "t", "output": "o"},
        }
        yield {
            "event": "critic_completed",
            "data": {
                "notes": "notes",
                "instagram_improved": "ig",
                "threads_improved": "th",
                "linkedin_improved": "li",
            },
        }
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
                "instagram": "instagram",
                "threads": "threads",
                "linkedin": "linkedin",
                "instagram_final": "instagram_final",
                "threads_final": "threads_final",
                "linkedin_final": "linkedin_final",
                "critic_notes": "notes",
            },
        }

    def fake_failure(idea: str, voice_profile: str = "default", locale: str = "en"):
        yield {"event": "planner_started", "data": {}}

    client = TestClient(app)
    monkeypatch.setattr(core_routes, "_get_core_client", lambda: _make_fake_core_client(fake_success))
    success_response = client.post("/api/run", json={"idea": "hello"})
    assert success_response.status_code == 200

    monkeypatch.setattr(core_routes, "_get_core_client", lambda: _make_fake_core_client(fake_failure))
    failure_response = client.post("/api/run", json={"idea": "hello"})
    assert failure_response.status_code == 200

    metrics_response = client.get("/health/generation-metrics")
    assert metrics_response.status_code == 200
    metrics = metrics_response.json()
    assert metrics["status"] == "ok"
    assert metrics["overall"]["total_runs"] == 2
    assert metrics["overall"]["successful_runs"] == 1
    assert metrics["overall"]["failed_runs"] == 1
    assert metrics["by_pipeline"]["core"]["failures_by_reason"]["stream_incomplete"] == 1


def test_core_route_rate_limits_by_ip(monkeypatch):
    reset_generation_metrics()
    reset_generation_guards()
    monkeypatch.setenv("CORE_RUN_RATE_LIMIT_PER_MINUTE", "1")

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
                "instagram": "instagram",
                "threads": "threads",
                "linkedin": "linkedin",
                "instagram_final": "instagram_final",
                "threads_final": "threads_final",
                "linkedin_final": "linkedin_final",
                "critic_notes": "notes",
            },
        }

    monkeypatch.setattr(core_routes, "_get_core_client", lambda: _make_fake_core_client(fake_run_pipeline_stream))

    client = TestClient(app)
    headers = {"X-Forwarded-For": "203.0.113.10"}
    first = client.post("/api/run", json={"idea": "hello"}, headers=headers)
    second = client.post("/api/run", json={"idea": "hello"}, headers=headers)

    assert first.status_code == 200
    assert second.status_code == 429
    assert second.json()["detail"] == "Rate limit exceeded for generation endpoint. Please retry shortly."
    assert second.json()["error_code"] == "RATE_LIMITED"


def test_core_route_rejects_concurrent_runs_from_same_ip(monkeypatch):
    reset_generation_metrics()
    reset_generation_guards()
    monkeypatch.setenv("CORE_RUN_MAX_CONCURRENT_PER_IP", "1")
    monkeypatch.setattr(core_routes, "_get_core_client", lambda: _make_fake_core_client(lambda *a, **kw: iter([])))

    # Simulate an existing concurrent request from this IP.
    GENERATION_GUARDS._set_active_count_for_test(CORE_ROUTE_KEY, "203.0.113.11", 1)
    try:
        client = TestClient(app)
        response = client.post(
            "/api/run",
            json={"idea": "hello"},
            headers={"X-Forwarded-For": "203.0.113.11"},
        )
        assert response.status_code == 429
        assert response.json()["detail"] == (
            "Too many concurrent generation requests from this IP. Please wait for the current run to finish."
        )
        assert response.json()["error_code"] == "RATE_LIMITED"
    finally:
        GENERATION_GUARDS._set_active_count_for_test(CORE_ROUTE_KEY, "203.0.113.11", 0)


def test_core_route_rejects_oversized_request_body(monkeypatch):
    reset_generation_guards()
    monkeypatch.setenv("CORE_RUN_MAX_BODY_BYTES", "80")

    client = TestClient(app)
    response = client.post("/api/run", json={"idea": "x" * 200})

    assert response.status_code == 413
    assert response.json()["detail"] == "Request body too large for generation endpoint."
    assert response.json()["error_code"] == "REQUEST_BODY_TOO_LARGE"


def test_core_route_rejects_overlong_idea():
    reset_generation_guards()
    client = TestClient(app)
    response = client.post("/api/run", json={"idea": "x" * 401})

    assert response.status_code == 422
    assert response.json()["detail"] == "Request validation failed."
    assert response.json()["error_code"] == "VALIDATION_ERROR"


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
