from __future__ import annotations

from fastapi import APIRouter, Depends

from ..core.access_levels import (
    authenticated_route_access,
    gated_demo_route_access,
    public_route_access,
    require_authenticated_route_access,
    require_internal_route_access,
)


def build_public_router() -> APIRouter:
    return APIRouter(dependencies=[Depends(public_route_access)])


def build_gated_demo_router() -> APIRouter:
    return APIRouter(dependencies=[Depends(gated_demo_route_access)])


def build_authenticated_marker_router() -> APIRouter:
    return APIRouter(dependencies=[Depends(authenticated_route_access)])


def build_internal_router() -> APIRouter:
    return APIRouter(dependencies=[Depends(require_internal_route_access)])
