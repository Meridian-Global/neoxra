from __future__ import annotations

from fastapi import HTTPException
from pydantic import BaseModel, ConfigDict, field_validator

from ..core.demo_access import (
    SUPPORTED_DEMO_SURFACES,
    create_demo_access_response,
    get_runtime_mode,
    get_surface_access_mode,
    validate_demo_access_code,
)
from .access_groups import build_public_router

router = build_public_router()


class DemoAccessRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    surface: str
    access_code: str

    @field_validator("surface")
    @classmethod
    def surface_must_be_supported(cls, value: str) -> str:
        if value not in SUPPORTED_DEMO_SURFACES:
            raise ValueError("surface must be a supported demo surface")
        return value

    @field_validator("access_code")
    @classmethod
    def access_code_must_not_be_blank(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("access_code must not be blank")
        return value.strip()


@router.post("/api/demo/access")
async def issue_demo_access(request: DemoAccessRequest) -> dict[str, object]:
    runtime_mode = get_runtime_mode()
    access_mode = get_surface_access_mode(request.surface, runtime_mode)
    if access_mode != "gated":
        return create_demo_access_response(request.surface)

    if not validate_demo_access_code(request.surface, request.access_code):
        raise HTTPException(
            status_code=401,
            detail={
                "detail": "Demo access code is invalid.",
                "error_code": "INVALID_DEMO_ACCESS_CODE",
            },
        )

    return create_demo_access_response(request.surface)
