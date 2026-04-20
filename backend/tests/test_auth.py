from urllib.parse import parse_qs, urlparse

from fastapi.testclient import TestClient

from app.db import Base, create_session, get_engine
from app.db.models import AuthSession, MagicLinkToken, Organization, OrganizationMembership, User
from app.db.session import reset_database_state
from app.main import app


def test_magic_link_auth_flow(monkeypatch, tmp_path):
    db_path = tmp_path / "auth.db"
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{db_path}")
    monkeypatch.setenv("AUTH_MAGIC_LINK_DEBUG", "true")
    monkeypatch.setenv("FRONTEND_APP_URL", "http://localhost:3000")
    reset_database_state()
    Base.metadata.create_all(get_engine())

    client = TestClient(app)

    request_response = client.post(
        "/api/auth/request-link",
        json={
            "email": "founder@example.com",
            "organization_key": "acme-legal",
            "redirect_path": "/demo/legal",
            "full_name": "Founder",
        },
    )

    assert request_response.status_code == 200
    payload = request_response.json()
    assert payload["status"] == "ok"
    assert payload["organization"]["tenant_key"] == "acme-legal"
    assert "magic_link" in payload

    magic_link = payload["magic_link"]
    parsed = urlparse(magic_link)
    token = parse_qs(parsed.query)["token"][0]

    verify_response = client.post("/api/auth/verify", json={"token": token})
    assert verify_response.status_code == 200
    verified = verify_response.json()
    session_token = verified["session_token"]
    assert verified["redirect_path"] == "/demo/legal"

    me_response = client.get(
        "/api/auth/me",
        headers={"X-Neoxra-Session-Token": session_token},
    )
    assert me_response.status_code == 200
    me = me_response.json()
    assert me["authenticated"] is True
    assert me["user"]["email"] == "founder@example.com"
    assert me["organization"]["tenant_key"] == "acme-legal"

    logout_response = client.post(
        "/api/auth/logout",
        headers={"X-Neoxra-Session-Token": session_token},
    )
    assert logout_response.status_code == 200

    me_after_logout = client.get(
        "/api/auth/me",
        headers={"X-Neoxra-Session-Token": session_token},
    )
    assert me_after_logout.status_code == 401

    session = create_session()
    try:
        assert session.query(User).count() == 1
        assert session.query(Organization).count() == 1
        assert session.query(OrganizationMembership).count() == 1
        assert session.query(MagicLinkToken).count() == 1
        auth_session = session.query(AuthSession).one()
        assert auth_session.status == "revoked"
    finally:
        session.close()
        Base.metadata.drop_all(get_engine())
        reset_database_state()
