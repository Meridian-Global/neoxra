from __future__ import annotations

import os
import secrets
from enum import Enum

from fastapi import HTTPException, Request

from .auth import require_authenticated_user


class RouteAccessLevel(str, Enum):
    PUBLIC = "public"
    GATED_DEMO = "gated-demo"
    AUTHENTICATED = "authenticated"
    INTERNAL = "internal"


def mark_route_access_level(request: Request, access_level: RouteAccessLevel) -> RouteAccessLevel:
    request.state.route_access_level = access_level.value
    return access_level


def public_route_access(request: Request) -> RouteAccessLevel:
    return mark_route_access_level(request, RouteAccessLevel.PUBLIC)


def gated_demo_route_access(request: Request) -> RouteAccessLevel:
    return mark_route_access_level(request, RouteAccessLevel.GATED_DEMO)


def authenticated_route_access(request: Request) -> RouteAccessLevel:
    return mark_route_access_level(request, RouteAccessLevel.AUTHENTICATED)


def require_authenticated_route_access(request: Request) -> RouteAccessLevel:
    mark_route_access_level(request, RouteAccessLevel.AUTHENTICATED)
    require_authenticated_user(request)
    return RouteAccessLevel.AUTHENTICATED


def require_internal_route_access(request: Request) -> RouteAccessLevel:
    mark_route_access_level(request, RouteAccessLevel.INTERNAL)
    expected_admin_key = os.getenv("NEOXRA_ADMIN_KEY", "").strip()
    if not expected_admin_key:
        raise HTTPException(
            status_code=404,
            detail={
                "detail": "Internal route is not enabled.",
                "error_code": "INTERNAL_ROUTE_DISABLED",
            },
        )

    supplied_admin_key = request.headers.get("X-Neoxra-Admin-Key", "").strip()
    if not secrets.compare_digest(supplied_admin_key, expected_admin_key):
        raise HTTPException(
            status_code=401,
            detail={
                "detail": "Internal admin access required.",
                "error_code": "ADMIN_ACCESS_REQUIRED",
            },
        )
    return RouteAccessLevel.INTERNAL
