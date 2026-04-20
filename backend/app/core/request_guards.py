from __future__ import annotations

import asyncio
import ipaddress
import math
import os
import time
from collections import defaultdict, deque
from dataclasses import dataclass
from typing import Deque

from fastapi import HTTPException, Request


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
    if path == "/api/instagram/generate":
        return _env_int("INSTAGRAM_GENERATE_MAX_BODY_BYTES", 16_384)
    if path == "/api/analytics/events":
        return _env_int("ANALYTICS_EVENT_MAX_BODY_BYTES", 4_096)
    return None


_MAX_TRACKED_CLIENTS = _env_int("GUARD_MAX_TRACKED_CLIENTS", 50_000)


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
    # Only honor X-Forwarded-For when the direct connection is from a trusted
    # proxy, or when no trusted proxies are configured (open/dev deployment).
    # Always validate that the extracted value is a syntactically valid IP.
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
        return (
            _env_int("CORE_RUN_RATE_LIMIT_PER_MINUTE", 12),
            60,
        )
    if route_key == INSTAGRAM_ROUTE_KEY:
        return (
            _env_int("INSTAGRAM_GENERATE_RATE_LIMIT_PER_MINUTE", 20),
            60,
        )
    if route_key == ANALYTICS_ROUTE_KEY:
        return (
            _env_int("ANALYTICS_EVENT_RATE_LIMIT_PER_MINUTE", 60),
            60,
        )
    return (10, 60)


def get_concurrency_limit(route_key: str) -> int:
    if route_key == CORE_ROUTE_KEY:
        return _env_int("CORE_RUN_MAX_CONCURRENT_PER_IP", 1)
    if route_key == INSTAGRAM_ROUTE_KEY:
        return _env_int("INSTAGRAM_GENERATE_MAX_CONCURRENT_PER_IP", 2)
    if route_key == ANALYTICS_ROUTE_KEY:
        return _env_int("ANALYTICS_EVENT_MAX_CONCURRENT_PER_IP", 20)
    return 1


@dataclass
class ConcurrencyLease:
    store: "GenerationGuardStore"
    route_key: str
    client_id: str
    released: bool = False

    async def release(self) -> None:
        if self.released:
            return
        self.released = True
        await self.store.release(self.route_key, self.client_id)


class GenerationGuardStore:
    def __init__(self) -> None:
        self._lock = asyncio.Lock()
        self._request_timestamps: dict[tuple[str, str], Deque[float]] = defaultdict(deque)
        self._active_requests: dict[tuple[str, str], int] = defaultdict(int)

    def reset(self) -> None:
        """Synchronous reset for test teardown only.

        Must only be called when no async requests are in-flight.
        The lock is deliberately recreated so the next TestClient session gets a
        fresh, unbound lock; the old lock is safe to discard here because tests
        guarantee quiescence before calling this method.
        """
        self._request_timestamps.clear()
        self._active_requests.clear()
        self._lock = asyncio.Lock()

    def _set_active_count_for_test(self, route_key: str, client_id: str, count: int) -> None:
        """Test-only helper: set the active request count for a (route, client) key.

        Bypasses the async lock intentionally — tests call this from synchronous
        setup code before any requests are in-flight, so no locking is needed.
        """
        key = (route_key, client_id)
        if count <= 0:
            self._active_requests.pop(key, None)
        else:
            self._active_requests[key] = count

    async def check_rate_limit(self, route_key: str, client_id: str) -> tuple[bool, int]:
        limit, window_seconds = get_rate_limit_config(route_key)
        now = time.monotonic()
        threshold = now - window_seconds
        key = (route_key, client_id)
        async with self._lock:
            # Reject new clients once the tracking table is full to bound memory usage.
            if key not in self._request_timestamps and len(self._request_timestamps) >= _MAX_TRACKED_CLIENTS:
                return (False, 60)
            bucket = self._request_timestamps[key]
            while bucket and bucket[0] <= threshold:
                bucket.popleft()
            if len(bucket) >= limit:
                retry_after = max(1, math.ceil(bucket[0] + window_seconds - now))
                return (False, retry_after)
            bucket.append(now)
            return (True, 0)

    async def acquire(self, route_key: str, client_id: str) -> ConcurrencyLease | None:
        limit = get_concurrency_limit(route_key)
        key = (route_key, client_id)
        async with self._lock:
            if self._active_requests[key] >= limit:
                return None
            self._active_requests[key] += 1
        return ConcurrencyLease(store=self, route_key=route_key, client_id=client_id)

    async def release(self, route_key: str, client_id: str) -> None:
        key = (route_key, client_id)
        async with self._lock:
            current = self._active_requests.get(key, 0)
            if current <= 1:
                self._active_requests.pop(key, None)
                # Prune empty timestamp bucket to prevent unbounded key growth.
                bucket = self._request_timestamps.get(key)
                if bucket is not None and not bucket:
                    del self._request_timestamps[key]
            else:
                self._active_requests[key] = current - 1


GENERATION_GUARDS = GenerationGuardStore()


def reset_generation_guards() -> None:
    GENERATION_GUARDS.reset()


async def enforce_generation_limits(request: Request, route_key: str) -> ConcurrencyLease:
    client_id = getattr(request.state, "client_ip", None) or get_client_ip(request)
    allowed, retry_after = await GENERATION_GUARDS.check_rate_limit(route_key, client_id)
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded for generation endpoint. Please retry shortly.",
            headers={"Retry-After": str(retry_after)},
        )

    lease = await GENERATION_GUARDS.acquire(route_key, client_id)
    if lease is None:
        raise HTTPException(
            status_code=429,
            detail="Too many concurrent generation requests from this IP. Please wait for the current run to finish.",
        )

    return lease
