from app.core.demo_configs import get_demo_client_config
from app.db import Base, DemoRun, TenantConfig, UsageEvent, create_session, get_engine
from app.db.session import reset_database_state
from app.services import create_demo_run, mark_demo_run_completed, record_usage_event, upsert_tenant_config


def test_usage_events_and_demo_runs_persist_with_sqlite(monkeypatch, tmp_path):
    db_path = tmp_path / "neoxra-test.db"
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{db_path}")
    reset_database_state()
    Base.metadata.create_all(get_engine())

    handle = create_demo_run(
        route="/api/run",
        pipeline="core",
        organization_id=None,
        user_id=None,
        surface="landing",
        source="landing",
        visitor_id="visitor-1",
        session_id="session-1",
        locale="en",
        core_client_mode="local",
        input_summary={"idea_length": 12},
    )
    assert handle.demo_run_id

    record_usage_event(
        route="/api/run",
        pipeline="core",
        event_name="pipeline_started",
        status="started",
        locale="en",
        surface="landing",
        source="landing",
        visitor_id="visitor-1",
        session_id="session-1",
        demo_run_handle=handle,
    )
    mark_demo_run_completed(
        handle,
        status="completed",
        duration_ms=145.2,
    )
    upsert_tenant_config(
        tenant_key="legal-demo",
        environment="public-demo",
        config_json={"surface": "legal"},
        display_name="Legal Demo",
    )

    session = create_session()
    try:
        demo_run = session.query(DemoRun).one()
        usage_event = session.query(UsageEvent).one()
        tenant = session.query(TenantConfig).one()
    finally:
        session.close()
        Base.metadata.drop_all(get_engine())
        reset_database_state()

    assert demo_run.route == "/api/run"
    assert demo_run.status == "completed"
    assert demo_run.duration_ms == 145.2
    assert demo_run.source == "landing"
    assert demo_run.visitor_id == "visitor-1"
    assert demo_run.session_id == "session-1"
    assert usage_event.event_name == "pipeline_started"
    assert usage_event.demo_run_id == demo_run.id
    assert usage_event.source == "landing"
    assert usage_event.visitor_id == "visitor-1"
    assert usage_event.session_id == "session-1"
    assert tenant.tenant_key == "legal-demo"
    assert tenant.environment == "public-demo"


def test_demo_client_config_merges_tenant_overrides(monkeypatch, tmp_path):
    db_path = tmp_path / "neoxra-config.db"
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{db_path}")
    reset_database_state()
    Base.metadata.create_all(get_engine())

    upsert_tenant_config(
        tenant_key="internal-sales",
        environment="internal-demo",
        config_json={
            "display_name": "Internal Sales Demo Override",
            "deterministic_fallback": {
                "mode": "auto",
                "fallback_key": "sales-startup",
                "label": "Use Sales Fallback",
            },
        },
        display_name="Internal Sales Demo Override",
    )

    try:
        config = get_demo_client_config(
            surface="instagram",
            demo_key="internal-sales",
            environment="internal-demo",
        )
    finally:
        Base.metadata.drop_all(get_engine())
        reset_database_state()

    assert config["demo_key"] == "internal-sales"
    assert config["surface"] == "instagram"
    assert config["display_name"] == "Internal Sales Demo Override"
    assert config["deterministic_fallback"]["mode"] == "auto"
    assert config["deterministic_fallback"]["fallback_key"] == "sales-startup"
