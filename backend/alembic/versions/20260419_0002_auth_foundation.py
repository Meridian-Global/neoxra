"""add auth and organization foundation

Revision ID: 20260419_0002
Revises: 20260419_0001
Create Date: 2026-04-19 23:10:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260419_0002"
down_revision = "20260419_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "organizations",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("tenant_key", sa.String(length=128), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("org_type", sa.String(length=32), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("settings_json", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_organizations_org_type"), "organizations", ["org_type"], unique=False)
    op.create_index(op.f("ix_organizations_tenant_key"), "organizations", ["tenant_key"], unique=True)

    op.create_table(
        "users",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)

    op.create_table(
        "organization_memberships",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("organization_id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("role", sa.String(length=32), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("organization_id", "user_id", name="uq_org_membership_org_user"),
    )
    op.create_index(op.f("ix_organization_memberships_organization_id"), "organization_memberships", ["organization_id"], unique=False)
    op.create_index(op.f("ix_organization_memberships_role"), "organization_memberships", ["role"], unique=False)
    op.create_index(op.f("ix_organization_memberships_user_id"), "organization_memberships", ["user_id"], unique=False)

    op.create_table(
        "auth_sessions",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("organization_id", sa.String(length=36), nullable=True),
        sa.Column("session_token_hash", sa.String(length=128), nullable=False),
        sa.Column("auth_method", sa.String(length=32), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_auth_sessions_auth_method"), "auth_sessions", ["auth_method"], unique=False)
    op.create_index(op.f("ix_auth_sessions_expires_at"), "auth_sessions", ["expires_at"], unique=False)
    op.create_index(op.f("ix_auth_sessions_organization_id"), "auth_sessions", ["organization_id"], unique=False)
    op.create_index(op.f("ix_auth_sessions_session_token_hash"), "auth_sessions", ["session_token_hash"], unique=True)
    op.create_index(op.f("ix_auth_sessions_status"), "auth_sessions", ["status"], unique=False)
    op.create_index(op.f("ix_auth_sessions_user_id"), "auth_sessions", ["user_id"], unique=False)

    op.create_table(
        "magic_link_tokens",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("organization_id", sa.String(length=36), nullable=True),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("token_hash", sa.String(length=128), nullable=False),
        sa.Column("redirect_path", sa.String(length=255), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_magic_link_tokens_email"), "magic_link_tokens", ["email"], unique=False)
    op.create_index(op.f("ix_magic_link_tokens_expires_at"), "magic_link_tokens", ["expires_at"], unique=False)
    op.create_index(op.f("ix_magic_link_tokens_organization_id"), "magic_link_tokens", ["organization_id"], unique=False)
    op.create_index(op.f("ix_magic_link_tokens_token_hash"), "magic_link_tokens", ["token_hash"], unique=True)
    op.create_index(op.f("ix_magic_link_tokens_user_id"), "magic_link_tokens", ["user_id"], unique=False)

    op.add_column("tenant_configs", sa.Column("organization_id", sa.String(length=36), nullable=True))
    op.create_foreign_key(
        "fk_tenant_configs_organization_id",
        "tenant_configs",
        "organizations",
        ["organization_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(op.f("ix_tenant_configs_organization_id"), "tenant_configs", ["organization_id"], unique=False)

    op.add_column("demo_runs", sa.Column("organization_id", sa.String(length=36), nullable=True))
    op.add_column("demo_runs", sa.Column("user_id", sa.String(length=36), nullable=True))
    op.create_foreign_key("fk_demo_runs_organization_id", "demo_runs", "organizations", ["organization_id"], ["id"], ondelete="SET NULL")
    op.create_foreign_key("fk_demo_runs_user_id", "demo_runs", "users", ["user_id"], ["id"], ondelete="SET NULL")
    op.create_index(op.f("ix_demo_runs_organization_id"), "demo_runs", ["organization_id"], unique=False)
    op.create_index(op.f("ix_demo_runs_user_id"), "demo_runs", ["user_id"], unique=False)

    op.add_column("usage_events", sa.Column("organization_id", sa.String(length=36), nullable=True))
    op.add_column("usage_events", sa.Column("user_id", sa.String(length=36), nullable=True))
    op.create_foreign_key("fk_usage_events_organization_id", "usage_events", "organizations", ["organization_id"], ["id"], ondelete="SET NULL")
    op.create_foreign_key("fk_usage_events_user_id", "usage_events", "users", ["user_id"], ["id"], ondelete="SET NULL")
    op.create_index(op.f("ix_usage_events_organization_id"), "usage_events", ["organization_id"], unique=False)
    op.create_index(op.f("ix_usage_events_user_id"), "usage_events", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_usage_events_user_id"), table_name="usage_events")
    op.drop_index(op.f("ix_usage_events_organization_id"), table_name="usage_events")
    op.drop_constraint("fk_usage_events_user_id", "usage_events", type_="foreignkey")
    op.drop_constraint("fk_usage_events_organization_id", "usage_events", type_="foreignkey")
    op.drop_column("usage_events", "user_id")
    op.drop_column("usage_events", "organization_id")

    op.drop_index(op.f("ix_demo_runs_user_id"), table_name="demo_runs")
    op.drop_index(op.f("ix_demo_runs_organization_id"), table_name="demo_runs")
    op.drop_constraint("fk_demo_runs_user_id", "demo_runs", type_="foreignkey")
    op.drop_constraint("fk_demo_runs_organization_id", "demo_runs", type_="foreignkey")
    op.drop_column("demo_runs", "user_id")
    op.drop_column("demo_runs", "organization_id")

    op.drop_index(op.f("ix_tenant_configs_organization_id"), table_name="tenant_configs")
    op.drop_constraint("fk_tenant_configs_organization_id", "tenant_configs", type_="foreignkey")
    op.drop_column("tenant_configs", "organization_id")

    op.drop_index(op.f("ix_magic_link_tokens_user_id"), table_name="magic_link_tokens")
    op.drop_index(op.f("ix_magic_link_tokens_token_hash"), table_name="magic_link_tokens")
    op.drop_index(op.f("ix_magic_link_tokens_organization_id"), table_name="magic_link_tokens")
    op.drop_index(op.f("ix_magic_link_tokens_expires_at"), table_name="magic_link_tokens")
    op.drop_index(op.f("ix_magic_link_tokens_email"), table_name="magic_link_tokens")
    op.drop_table("magic_link_tokens")

    op.drop_index(op.f("ix_auth_sessions_user_id"), table_name="auth_sessions")
    op.drop_index(op.f("ix_auth_sessions_status"), table_name="auth_sessions")
    op.drop_index(op.f("ix_auth_sessions_session_token_hash"), table_name="auth_sessions")
    op.drop_index(op.f("ix_auth_sessions_organization_id"), table_name="auth_sessions")
    op.drop_index(op.f("ix_auth_sessions_expires_at"), table_name="auth_sessions")
    op.drop_index(op.f("ix_auth_sessions_auth_method"), table_name="auth_sessions")
    op.drop_table("auth_sessions")

    op.drop_index(op.f("ix_organization_memberships_user_id"), table_name="organization_memberships")
    op.drop_index(op.f("ix_organization_memberships_role"), table_name="organization_memberships")
    op.drop_index(op.f("ix_organization_memberships_organization_id"), table_name="organization_memberships")
    op.drop_table("organization_memberships")

    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_table("users")

    op.drop_index(op.f("ix_organizations_tenant_key"), table_name="organizations")
    op.drop_index(op.f("ix_organizations_org_type"), table_name="organizations")
    op.drop_table("organizations")
