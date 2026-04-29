import os

from fastapi.testclient import TestClient

from app.db import Base, create_session, get_engine
from app.db.models import AuthSession, Organization, OrganizationMembership, User
from app.db.session import reset_database_state
from app.main import app


def _setup_sqlite_db(monkeypatch, tmp_path):
    db_path = tmp_path / "neoxra-auth-test.db"
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{db_path}")
    reset_database_state()
    Base.metadata.create_all(get_engine())


def _teardown_sqlite_db():
    Base.metadata.drop_all(get_engine())
    reset_database_state()


# ---------------------------------------------------------------------------
# GET /api/auth/google/url
# ---------------------------------------------------------------------------


def test_google_url_returns_501_when_not_configured(monkeypatch):
    monkeypatch.delenv("GOOGLE_CLIENT_ID", raising=False)

    client = TestClient(app, raise_server_exceptions=False)
    response = client.get("/api/auth/google/url")

    assert response.status_code == 501
    assert "not configured" in response.json().get("detail", "").lower()


def test_google_url_returns_url_when_configured(monkeypatch):
    monkeypatch.setenv("GOOGLE_CLIENT_ID", "test-client-id.apps.googleusercontent.com")
    monkeypatch.setenv("GOOGLE_REDIRECT_URI", "http://localhost:3000/login/google/callback")

    client = TestClient(app)
    response = client.get("/api/auth/google/url")

    assert response.status_code == 200
    data = response.json()
    assert "url" in data
    assert isinstance(data["url"], str)
    assert data["url"].startswith("https://accounts.google.com/")
    assert "client_id=test-client-id.apps.googleusercontent.com" in data["url"]


# ---------------------------------------------------------------------------
# POST /api/auth/google/callback
# ---------------------------------------------------------------------------


def test_google_callback_rejects_invalid_state():
    client = TestClient(app, raise_server_exceptions=False)
    response = client.post(
        "/api/auth/google/callback",
        json={"code": "some-code", "state": "not-a-registered-state"},
    )

    assert response.status_code == 400
    assert "state" in response.json().get("detail", "").lower()


def test_google_callback_rejects_expired_state(monkeypatch):
    import time

    import app.api.auth_routes as auth_routes

    # Manually insert a state that expired long ago (past the module's own TTL)
    stale_state = "stale-state-value-xyz"
    expired_at = time.time() - (auth_routes._GOOGLE_STATE_TTL_SECONDS + 60)
    monkeypatch.setitem(auth_routes._google_oauth_states, stale_state, expired_at)

    client = TestClient(app, raise_server_exceptions=False)
    response = client.post(
        "/api/auth/google/callback",
        json={"code": "some-code", "state": stale_state},
    )

    assert response.status_code == 400


# ---------------------------------------------------------------------------
# GET /api/auth/me
# ---------------------------------------------------------------------------


def test_auth_me_returns_401_when_unauthenticated():
    client = TestClient(app, raise_server_exceptions=False)
    response = client.get("/api/auth/me")

    assert response.status_code == 401


def test_auth_me_returns_user_with_valid_session(monkeypatch, tmp_path):
    _setup_sqlite_db(monkeypatch, tmp_path)
    try:
        from app.core.auth import create_authenticated_session

        result = create_authenticated_session(
            email="test@example.com",
            full_name="Test User",
            auth_method="google",
        )
        token = result["session_token"]

        client = TestClient(app)
        response = client.get("/api/auth/me", headers={"X-Neoxra-Session-Token": token})

        assert response.status_code == 200
        data = response.json()
        assert data["authenticated"] is True
        assert data["user"]["email"] == "test@example.com"
    finally:
        _teardown_sqlite_db()


# ---------------------------------------------------------------------------
# POST /api/auth/logout
# ---------------------------------------------------------------------------


def test_logout_returns_ok_without_token():
    client = TestClient(app)
    response = client.post("/api/auth/logout")

    assert response.status_code == 200
    assert response.json().get("status") == "ok"


def test_logout_revokes_active_session(monkeypatch, tmp_path):
    _setup_sqlite_db(monkeypatch, tmp_path)
    try:
        from app.core.auth import create_authenticated_session

        result = create_authenticated_session(
            email="logout@example.com",
            full_name="Logout User",
            auth_method="google",
        )
        token = result["session_token"]

        client = TestClient(app)

        # Session is valid before logout
        me_before = client.get("/api/auth/me", headers={"X-Neoxra-Session-Token": token})
        assert me_before.status_code == 200

        # Perform logout
        logout_response = client.post("/api/auth/logout", headers={"X-Neoxra-Session-Token": token})
        assert logout_response.status_code == 200
        assert logout_response.json().get("status") == "ok"

        # Session is no longer valid after logout
        me_after = client.get("/api/auth/me", headers={"X-Neoxra-Session-Token": token})
        assert me_after.status_code == 401
    finally:
        _teardown_sqlite_db()

