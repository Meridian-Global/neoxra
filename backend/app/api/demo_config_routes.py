from __future__ import annotations

from fastapi import Query
from pydantic import BaseModel

from ..core.demo_access import get_runtime_mode
from ..core.demo_configs import get_demo_client_config
from .access_groups import build_public_router


router = build_public_router()


class DeterministicFallbackConfigResponse(BaseModel):
    enabled: bool
    mode: str
    fallback_key: str | None = None
    label: str


class DemoClientConfigResponse(BaseModel):
    demo_key: str
    surface: str
    display_name: str
    profile: str
    preset_profile: str
    deterministic_fallback: DeterministicFallbackConfigResponse
    environment: str


@router.get("/api/demo/config")
async def get_demo_config(
    surface: str = Query(..., pattern="^(landing|instagram|legal)$"),
    demo_key: str | None = Query(default=None),
) -> DemoClientConfigResponse:
    runtime_mode = get_runtime_mode()
    raw = get_demo_client_config(surface=surface, demo_key=demo_key, environment=runtime_mode)
    return DemoClientConfigResponse(**raw)
