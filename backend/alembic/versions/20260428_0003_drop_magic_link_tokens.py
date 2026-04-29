"""Drop magic_link_tokens table

Revision ID: 20260428_0003
Revises: 20260419_0002
Create Date: 2026-04-28 12:00:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260428_0003"
down_revision = "20260419_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_index(op.f("ix_magic_link_tokens_email"), table_name="magic_link_tokens")
    op.drop_index(op.f("ix_magic_link_tokens_expires_at"), table_name="magic_link_tokens")
    op.drop_index(op.f("ix_magic_link_tokens_organization_id"), table_name="magic_link_tokens")
    op.drop_index(op.f("ix_magic_link_tokens_token_hash"), table_name="magic_link_tokens")
    op.drop_index(op.f("ix_magic_link_tokens_user_id"), table_name="magic_link_tokens")
    op.drop_table("magic_link_tokens")


def downgrade() -> None:
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
