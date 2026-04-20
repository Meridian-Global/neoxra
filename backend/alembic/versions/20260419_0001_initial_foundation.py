"""initial postgres foundation

Revision ID: 20260419_0001
Revises:
Create Date: 2026-04-19 21:00:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260419_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "demo_runs",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("request_id", sa.String(length=64), nullable=False),
        sa.Column("route", sa.String(length=128), nullable=False),
        sa.Column("pipeline", sa.String(length=64), nullable=False),
        sa.Column("surface", sa.String(length=64), nullable=True),
        sa.Column("locale", sa.String(length=16), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("failure_reason", sa.String(length=128), nullable=True),
        sa.Column("error_code", sa.String(length=64), nullable=True),
        sa.Column("core_client_mode", sa.String(length=32), nullable=True),
        sa.Column("duration_ms", sa.Float(), nullable=True),
        sa.Column("input_summary", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_demo_runs_pipeline"), "demo_runs", ["pipeline"], unique=False)
    op.create_index(op.f("ix_demo_runs_request_id"), "demo_runs", ["request_id"], unique=False)
    op.create_index(op.f("ix_demo_runs_route"), "demo_runs", ["route"], unique=False)
    op.create_index(op.f("ix_demo_runs_status"), "demo_runs", ["status"], unique=False)
    op.create_index(op.f("ix_demo_runs_surface"), "demo_runs", ["surface"], unique=False)

    op.create_table(
        "tenant_configs",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("tenant_key", sa.String(length=128), nullable=False),
        sa.Column("display_name", sa.String(length=255), nullable=True),
        sa.Column("environment", sa.String(length=32), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("config_json", sa.JSON(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("tenant_key", "environment", name="uq_tenant_configs_tenant_env"),
    )
    op.create_index(op.f("ix_tenant_configs_environment"), "tenant_configs", ["environment"], unique=False)
    op.create_index(op.f("ix_tenant_configs_tenant_key"), "tenant_configs", ["tenant_key"], unique=False)

    op.create_table(
        "usage_events",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("request_id", sa.String(length=64), nullable=False),
        sa.Column("demo_run_id", sa.String(length=36), nullable=True),
        sa.Column("route", sa.String(length=128), nullable=False),
        sa.Column("pipeline", sa.String(length=64), nullable=False),
        sa.Column("event_name", sa.String(length=128), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=True),
        sa.Column("locale", sa.String(length=16), nullable=True),
        sa.Column("surface", sa.String(length=64), nullable=True),
        sa.Column("error_code", sa.String(length=64), nullable=True),
        sa.Column("error_stage", sa.String(length=64), nullable=True),
        sa.Column("metadata_json", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["demo_run_id"], ["demo_runs.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_usage_events_demo_run_id"), "usage_events", ["demo_run_id"], unique=False)
    op.create_index(op.f("ix_usage_events_event_name"), "usage_events", ["event_name"], unique=False)
    op.create_index(op.f("ix_usage_events_pipeline"), "usage_events", ["pipeline"], unique=False)
    op.create_index(op.f("ix_usage_events_request_id"), "usage_events", ["request_id"], unique=False)
    op.create_index(op.f("ix_usage_events_route"), "usage_events", ["route"], unique=False)
    op.create_index(op.f("ix_usage_events_status"), "usage_events", ["status"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_usage_events_status"), table_name="usage_events")
    op.drop_index(op.f("ix_usage_events_route"), table_name="usage_events")
    op.drop_index(op.f("ix_usage_events_request_id"), table_name="usage_events")
    op.drop_index(op.f("ix_usage_events_pipeline"), table_name="usage_events")
    op.drop_index(op.f("ix_usage_events_event_name"), table_name="usage_events")
    op.drop_index(op.f("ix_usage_events_demo_run_id"), table_name="usage_events")
    op.drop_table("usage_events")
    op.drop_index(op.f("ix_tenant_configs_tenant_key"), table_name="tenant_configs")
    op.drop_index(op.f("ix_tenant_configs_environment"), table_name="tenant_configs")
    op.drop_table("tenant_configs")
    op.drop_index(op.f("ix_demo_runs_surface"), table_name="demo_runs")
    op.drop_index(op.f("ix_demo_runs_status"), table_name="demo_runs")
    op.drop_index(op.f("ix_demo_runs_route"), table_name="demo_runs")
    op.drop_index(op.f("ix_demo_runs_request_id"), table_name="demo_runs")
    op.drop_index(op.f("ix_demo_runs_pipeline"), table_name="demo_runs")
    op.drop_table("demo_runs")
