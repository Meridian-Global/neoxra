from __future__ import annotations

from fastapi import Request


def _clean_header(value: str | None, *, max_length: int = 64) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    if not cleaned:
        return None
    return cleaned[:max_length]


def get_demo_source(request: Request, default_surface: str | None = None) -> str | None:
    explicit = _clean_header(request.headers.get("X-Neoxra-Demo-Source"))
    if explicit:
        return explicit
    state_surface = _clean_header(getattr(request.state, "demo_surface", None))
    if state_surface:
        return state_surface
    return _clean_header(default_surface)


def get_visitor_id(request: Request) -> str | None:
    return _clean_header(request.headers.get("X-Neoxra-Visitor-ID"))


def get_session_id(request: Request) -> str | None:
    return _clean_header(request.headers.get("X-Neoxra-Session-ID"))
