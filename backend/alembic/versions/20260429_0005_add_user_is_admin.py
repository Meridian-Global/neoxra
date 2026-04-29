"""add is_admin flag to users table

Revision ID: 20260429_0005
Revises: 20260428_0004
Create Date: 2026-04-29 00:05:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260429_0005"
down_revision = "20260428_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("users") as batch_op:
        batch_op.add_column(sa.Column("is_admin", sa.Boolean(), nullable=False, server_default=sa.text("false")))
        batch_op.create_index("ix_users_is_admin", ["is_admin"])


def downgrade() -> None:
    with op.batch_alter_table("users") as batch_op:
        batch_op.drop_index("ix_users_is_admin")
        batch_op.drop_column("is_admin")
