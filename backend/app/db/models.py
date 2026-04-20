from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, JSON, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


def _uuid_str() -> str:
    return str(uuid.uuid4())


class DemoRun(Base):
    __tablename__ = "demo_runs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid_str)
    request_id: Mapped[str] = mapped_column(String(64), index=True)
    route: Mapped[str] = mapped_column(String(128), index=True)
    pipeline: Mapped[str] = mapped_column(String(64), index=True)
    surface: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    source: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    visitor_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    session_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    locale: Mapped[str] = mapped_column(String(16), default="en")
    status: Mapped[str] = mapped_column(String(32), default="started", index=True)
    failure_reason: Mapped[str | None] = mapped_column(String(128), nullable=True)
    error_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    core_client_mode: Mapped[str | None] = mapped_column(String(32), nullable=True)
    duration_ms: Mapped[float | None] = mapped_column(Float, nullable=True)
    input_summary: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    usage_events: Mapped[list["UsageEvent"]] = relationship(back_populates="demo_run")


class UsageEvent(Base):
    __tablename__ = "usage_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    request_id: Mapped[str] = mapped_column(String(64), index=True)
    demo_run_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("demo_runs.id", ondelete="SET NULL"), nullable=True, index=True
    )
    route: Mapped[str] = mapped_column(String(128), index=True)
    pipeline: Mapped[str] = mapped_column(String(64), index=True)
    event_name: Mapped[str] = mapped_column(String(128), index=True)
    status: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    locale: Mapped[str | None] = mapped_column(String(16), nullable=True)
    surface: Mapped[str | None] = mapped_column(String(64), nullable=True)
    source: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    visitor_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    session_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    error_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    error_stage: Mapped[str | None] = mapped_column(String(64), nullable=True)
    metadata_json: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    demo_run: Mapped[DemoRun | None] = relationship(back_populates="usage_events")


class TenantConfig(Base):
    __tablename__ = "tenant_configs"
    __table_args__ = (
        UniqueConstraint("tenant_key", "environment", name="uq_tenant_configs_tenant_env"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid_str)
    tenant_key: Mapped[str] = mapped_column(String(128), index=True)
    display_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    environment: Mapped[str] = mapped_column(String(32), default="local", index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    config_json: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
