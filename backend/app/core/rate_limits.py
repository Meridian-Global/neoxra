from __future__ import annotations

import asyncio
import logging
import math
import os
import time
from collections import defaultdict, deque
from dataclasses import dataclass
from typing import Deque, Protocol


logger = logging.getLogger(__name__)


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


def _max_tracked_clients() -> int:
    return _env_int("GUARD_MAX_TRACKED_CLIENTS", 50_000)


class RateLimitStore(Protocol):
    def reset(self) -> None: ...

    def set_active_count_for_test(self, namespace: str, subject: str, count: int) -> None: ...

    async def check_limit(
        self,
        namespace: str,
        subject: str,
        *,
        limit: int,
        window_seconds: int,
    ) -> tuple[bool, int, int]: ...

    async def acquire_concurrency(self, namespace: str, subject: str, *, limit: int) -> bool: ...

    async def release_concurrency(self, namespace: str, subject: str) -> None: ...


@dataclass
class RedisRateLimitStore:
    redis_url: str | None = None

    def reset(self) -> None:
        return None

    def set_active_count_for_test(self, namespace: str, subject: str, count: int) -> None:
        return None

    async def check_limit(
        self,
        namespace: str,
        subject: str,
        *,
        limit: int,
        window_seconds: int,
    ) -> tuple[bool, int, int]:
        raise NotImplementedError("Redis-backed rate limits are not implemented yet.")

    async def acquire_concurrency(self, namespace: str, subject: str, *, limit: int) -> bool:
        raise NotImplementedError("Redis-backed concurrency guards are not implemented yet.")

    async def release_concurrency(self, namespace: str, subject: str) -> None:
        raise NotImplementedError("Redis-backed concurrency guards are not implemented yet.")


class InMemoryRateLimitStore:
    def __init__(self) -> None:
        self._lock = asyncio.Lock()
        self._request_timestamps: dict[tuple[str, str], Deque[float]] = defaultdict(deque)
        self._active_requests: dict[tuple[str, str], int] = defaultdict(int)

    def reset(self) -> None:
        self._request_timestamps.clear()
        self._active_requests.clear()
        self._lock = asyncio.Lock()

    def set_active_count_for_test(self, namespace: str, subject: str, count: int) -> None:
        key = (namespace, subject)
        if count <= 0:
            self._active_requests.pop(key, None)
        else:
            self._active_requests[key] = count

    def _set_active_count_for_test(self, namespace: str, subject: str, count: int) -> None:
        actual_namespace = namespace
        if not namespace.startswith("concurrency:"):
            actual_namespace = f"concurrency:{namespace}"
        self.set_active_count_for_test(actual_namespace, subject, count)

    async def check_limit(
        self,
        namespace: str,
        subject: str,
        *,
        limit: int,
        window_seconds: int,
    ) -> tuple[bool, int, int]:
        now = time.monotonic()
        threshold = now - window_seconds
        key = (namespace, subject)
        async with self._lock:
            if key not in self._request_timestamps and len(self._request_timestamps) >= _max_tracked_clients():
                return (False, 60, limit)

            bucket = self._request_timestamps[key]
            while bucket and bucket[0] <= threshold:
                bucket.popleft()
            if len(bucket) >= limit:
                retry_after = max(1, math.ceil(bucket[0] + window_seconds - now))
                return (False, retry_after, len(bucket))
            bucket.append(now)
            return (True, 0, len(bucket))

    async def acquire_concurrency(self, namespace: str, subject: str, *, limit: int) -> bool:
        key = (namespace, subject)
        async with self._lock:
            if self._active_requests[key] >= limit:
                return False
            self._active_requests[key] += 1
            return True

    async def release_concurrency(self, namespace: str, subject: str) -> None:
        key = (namespace, subject)
        async with self._lock:
            current = self._active_requests.get(key, 0)
            if current <= 1:
                self._active_requests.pop(key, None)
                bucket = self._request_timestamps.get(key)
                if bucket is not None and not bucket:
                    del self._request_timestamps[key]
            else:
                self._active_requests[key] = current - 1


_MEMORY_STORE = InMemoryRateLimitStore()


def get_rate_limit_store() -> RateLimitStore:
    backend = os.getenv("NEOXRA_RATE_LIMIT_BACKEND", "memory").strip().lower()
    if backend == "redis":
        logger.warning(
            "redis rate limit backend requested but not implemented yet; falling back to memory"
        )
    return _MEMORY_STORE


def get_rate_limit_backend_name() -> str:
    backend = os.getenv("NEOXRA_RATE_LIMIT_BACKEND", "memory").strip().lower()
    return "memory" if backend != "redis" else "memory-fallback"


def reset_rate_limit_store() -> None:
    get_rate_limit_store().reset()
