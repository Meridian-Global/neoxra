from __future__ import annotations

from fastapi import Query

from ..core.demo_access import get_runtime_mode
from ..core.demo_configs import get_demo_client_config
from .access_groups import build_public_router


router = build_public_router()


@router.get("/api/demo/config")
async def get_demo_config(
    surface: str = Query(..., pattern="^(landing|instagram|legal)$"),
    demo_key: str | None = Query(default=None),
) -> dict[str, object]:
    runtime_mode = get_runtime_mode()
    return get_demo_client_config(surface=surface, demo_key=demo_key, environment=runtime_mode)
