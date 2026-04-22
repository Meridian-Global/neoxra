from __future__ import annotations

import hashlib
import ipaddress
import os
from dataclasses import dataclass

from fastapi import HTTPException, Request

from .abuse_monitor import ABUSE_MONITOR
from .growth_context import get_session_id, get_visitor_id
from .rate_limits import get_rate_limit_store, reset_rate_limit_store


CORE_ROUTE_KEY = "core"
INSTAGRAM_ROUTE_KEY = "instagram"
ANALYTICS_ROUTE_KEY = "analytics"


def _env_int(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None:
        return default
    try:
        value = int(raw)
    except ValueError:
        return default
    if value <= 0:
        return default
    return value


def get_generation_body_limit_bytes(path: str) -> int | None:
    if path == "/api/run":
        return _env_int("CORE_RUN_MAX_BODY_BYTES", 8_192)
    if path == "/api/generate-all":
        return _env_int("GENERATE_ALL_MAX_BODY_BYTES", 8_192)
    if path == "/api/instagram/generate":
        return _env_int("INSTAGRAM_GENERATE_MAX_BODY_BYTES", 16_384)
    if path == "/api/analytics/events":
        return _env_int("ANALYTICS_EVENT_MAX_BODY_BYTES", 4_096)
    return None


def _is_valid_ip(value: str) -> bool:
    try:
        ipaddress.ip_address(value)
        return True
    except ValueError:
        return False


def _get_trusted_proxies() -> set[str]:
    raw = os.getenv("TRUSTED_PROXY_IPS", "")
    return {ip.strip() for ip in raw.split(",") if ip.strip()}


def get_client_ip(request: Request) -> str:
    direct_host = request.client.host if request.client and request.client.host else None
    trusted_proxies = _get_trusted_proxies()
    if direct_host is None or not trusted_proxies or direct_host in trusted_proxies:
        forwarded_for = request.headers.get("x-forwarded-for", "")
        if forwarded_for:
            first_ip = forwarded_for.split(",")[0].strip()
            if first_ip and _is_valid_ip(first_ip):
                return first_ip
    if direct_host:
        return direct_host
    return "unknown"


def get_max_idea_length() -> int:
    return _env_int("CORE_RUN_MAX_IDEA_LENGTH", 400)


def get_max_voice_profile_length() -> int:
    return _env_int("CORE_RUN_MAX_VOICE_PROFILE_LENGTH", 64)


def get_max_topic_length() -> int:
    return _env_int("INSTAGRAM_MAX_TOPIC_LENGTH", 240)


def get_max_template_text_length() -> int:
    return _env_int("INSTAGRAM_MAX_TEMPLATE_TEXT_LENGTH", 2_000)


def get_max_style_examples() -> int:
    return _env_int("INSTAGRAM_MAX_STYLE_EXAMPLES", 5)


def get_max_style_example_length() -> int:
    return _env_int("INSTAGRAM_MAX_STYLE_EXAMPLE_LENGTH", 280)


def get_rate_limit_config(route_key: str) -> tuple[int, int]:
    if route_key == CORE_ROUTE_KEY:
        return (_env_int("CORE_RUN_RATE_LIMIT_PER_MINUTE", 12), 60)
    if route_key == INSTAGRAM_ROUTE_KEY:
        return (_env_int("INSTAGRAM_GENERATE_RATE_LIMIT_PER_MINUTE", 20), 60)
    if route_key == ANALYTICS_ROUTE_KEY:
        return (_env_int("ANALYTICS_EVENT_RATE_LIMIT_PER_MINUTE", 60), 60)
    return (10, 60)


def get_concurrency_limit(route_key: str) -> int:
    if route_key == CORE_ROUTE_KEY:
        return _env_int("CORE_RUN_MAX_CONCURRENT_PER_IP", 1)
    if route_key == INSTAGRAM_ROUTE_KEY:
        return _env_int("INSTAGRAM_GENERATE_MAX_CONCURRENT_PER_IP", 2)
    if route_key == ANALYTICS_ROUTE_KEY:
        return _env_int("ANALYTICS_EVENT_MAX_CONCURRENT_PER_IP", 20)
    return 1


def _quota_limit_for_request(request: Request, route_key: str) -> tuple[int | None, str | None]:
    if route_key not in {CORE_ROUTE_KEY, INSTAGRAM_ROUTE_KEY}:
        return (None, None)

    auth = getattr(request.state, "auth", None)
    if getattr(auth, "is_authenticated", False) and getattr(auth, "user_id", None):
        return (_env_int("AUTHENTICATED_GENERATION_QUOTA_PER_DAY", 200), "user")

    demo_token = request.headers.get("X-Neoxra-Demo-Token", "").strip()
    if demo_token or getattr(request.state, "demo_access_mode", None) == "gated":
        return (_env_int("GATED_DEMO_GENERATION_QUOTA_PER_DAY", 40), "demo")

    public_scope, _ = _quota_subject(request)
    return (_env_int("PUBLIC_GENERATION_QUOTA_PER_DAY", 12), public_scope)


def _quota_subject(request: Request) -> tuple[str, str]:
    auth = getattr(request.state, "auth", None)
    if getattr(auth, "is_authenticated", False) and getattr(auth, "user_id", None):
        return ("user", f"user:{auth.user_id}")

    demo_token = request.headers.get("X-Neoxra-Demo-Token", "").strip()
    if demo_token:
        token_hash = hashlib.sha256(demo_token.encode("utf-8")).hexdigest()[:16]
        return ("demo", f"demo:{token_hash}")

    session_id = get_session_id(request)
    if session_id:
        return ("session", f"session:{session_id}")

    visitor_id = get_visitor_id(request)
    if visitor_id:
        return ("visitor", f"visitor:{visitor_id}")

    client_id = getattr(request.state, "client_ip", None) or get_client_ip(request)
    return ("ip", f"ip:{client_id}")


def _quota_window_seconds() -> int:
    # 24-hour rolling window (not a calendar day)
    return 24 * 60 * 60


@dataclass
class ConcurrencyLease:
    route_key: str
    client_id: str
    released: bool = False

    async def release(self) -> None:
        if self.released:
            return
        self.released = True
        await get_rate_limit_store().release_concurrency(
            f"concurrency:{self.route_key}",
            self.client_id,
        )


GENERATION_GUARDS = get_rate_limit_store()


def reset_generation_guards() -> None:
    reset_rate_limit_store()


async def enforce_generation_limits(request: Request, route_key: str) -> ConcurrencyLease:
    client_id = getattr(request.state, "client_ip", None) or get_client_ip(request)

    # Record every incoming request so burst monitoring reflects all outcomes.
    await ABUSE_MONITOR.record_request(
        route_key=route_key,
        client_id=client_id,
        access_level=str(getattr(request.state, "route_access_level", "unknown")),
    )

    limit, window_seconds = get_rate_limit_config(route_key)
    allowed, retry_after, current_count = await GENERATION_GUARDS.check_limit(
        f"rate:{route_key}",
        client_id,
        limit=limit,
        window_seconds=window_seconds,
    )
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail={
                "detail": "Rate limit exceeded for generation endpoint. Please retry shortly.",
                "error_code": "RATE_LIMIT_EXCEEDED",
            },
            headers={"Retry-After": str(retry_after)},
        )

    quota_limit, quota_scope = _quota_limit_for_request(request, route_key)
    if quota_limit is not None and quota_scope is not None:
        _, quota_subject = _quota_subject(request)
        quota_allowed, quota_retry_after, quota_count = await GENERATION_GUARDS.check_limit(
            f"quota:{route_key}:{quota_scope}",
            quota_subject,
            limit=quota_limit,
            window_seconds=_quota_window_seconds(),
        )
        if not quota_allowed:
            _quota_scope_labels: dict[str, str] = {
                "user": "for this user",
                "demo": "for this demo token",
                "session": "for this session",
                "visitor": "for this visitor",
                "ip": "for this IP",
            }
            _scope_label = _quota_scope_labels.get(quota_scope)
            quota_detail = (
                f"Generation quota reached {_scope_label}. Please try again later."
                if _scope_label is not None
                else "Generation quota reached. Please try again later."
            )
            raise HTTPException(
                status_code=429,
                detail={
                    "detail": quota_detail,
                    "error_code": "SOFT_QUOTA_EXCEEDED",
                },
                headers={"Retry-After": str(quota_retry_after)},
            )
        request.state.quota_headers = {
            "X-Neoxra-Quota-Limit": str(quota_limit),
            "X-Neoxra-Quota-Remaining": str(max(0, quota_limit - quota_count)),
            "X-Neoxra-Quota-Scope": quota_scope,
        }

    acquired = await GENERATION_GUARDS.acquire_concurrency(
        f"concurrency:{route_key}",
        client_id,
        limit=get_concurrency_limit(route_key),
    )
    if not acquired:
        raise HTTPException(
            status_code=429,
            detail={
                "detail": "Too many concurrent generation requests from this IP. Please wait for the current run to finish.",
                "error_code": "CONCURRENCY_LIMIT_EXCEEDED",
            },
        )

    request.state.rate_limit_headers = {
        "X-Neoxra-RateLimit-Limit": str(limit),
        "X-Neoxra-RateLimit-Observed": str(current_count),
    }
    return ConcurrencyLease(route_key=route_key, client_id=client_id)
