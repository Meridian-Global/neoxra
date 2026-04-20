from __future__ import annotations

import asyncio
import logging
import os
import time
from collections import defaultdict, deque
from dataclasses import dataclass
from typing import Deque

from .logging_utils import format_log_fields, get_request_id


logger = logging.getLogger(__name__)


def _env_int(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None:
        return default
    try:
        value = int(raw)
    except ValueError:
        return default
    return max(1, value)


def _cooldown_seconds() -> int:
    return _env_int("ABUSE_ALERT_COOLDOWN_SECONDS", 300)


def _burst_threshold_per_minute() -> int:
    return _env_int("ABUSE_BURST_THRESHOLD_PER_MINUTE", 30)


def _failure_threshold_per_window() -> int:
    return _env_int("ABUSE_FAILURE_THRESHOLD_PER_15_MIN", 5)


def _volume_threshold_per_window() -> int:
    return _env_int("ABUSE_VOLUME_THRESHOLD_PER_15_MIN", 25)


@dataclass
class AlertEvent:
    alert_type: str
    route_key: str
    client_id: str
    count: int
    created_at: float
    details: dict[str, str | int]


class AbuseMonitor:
    def __init__(self) -> None:
        self._lock = asyncio.Lock()
        self._request_counts: dict[tuple[str, str], Deque[float]] = defaultdict(deque)
        self._failure_counts: dict[tuple[str, str], Deque[float]] = defaultdict(deque)
        self._completion_counts: dict[tuple[str, str], Deque[float]] = defaultdict(deque)
        self._last_alert_at: dict[tuple[str, str, str], float] = {}
        self._alerts: Deque[AlertEvent] = deque(maxlen=200)

    def reset(self) -> None:
        self._request_counts.clear()
        self._failure_counts.clear()
        self._completion_counts.clear()
        self._last_alert_at.clear()
        self._alerts.clear()
        self._lock = asyncio.Lock()

    async def record_request(self, *, route_key: str, client_id: str, access_level: str) -> None:
        await self._record_counter(
            bucket=self._request_counts,
            route_key=route_key,
            client_id=client_id,
            window_seconds=60,
            threshold=_burst_threshold_per_minute(),
            alert_type="burst_traffic",
            details={"access_level": access_level},
        )

    async def record_failure(self, *, route_key: str, client_id: str, error_code: str | None) -> None:
        details = {"error_code": error_code or "unknown"}
        await self._record_counter(
            bucket=self._failure_counts,
            route_key=route_key,
            client_id=client_id,
            window_seconds=900,
            threshold=_failure_threshold_per_window(),
            alert_type="repeated_failures",
            details=details,
        )

    async def record_completion(self, *, route_key: str, client_id: str) -> None:
        await self._record_counter(
            bucket=self._completion_counts,
            route_key=route_key,
            client_id=client_id,
            window_seconds=900,
            threshold=_volume_threshold_per_window(),
            alert_type="unusual_generation_volume",
            details={},
        )

    def snapshot(self) -> dict[str, object]:
        return {
            "status": "ok",
            "recent_alerts": [
                {
                    "alert_type": alert.alert_type,
                    "route_key": alert.route_key,
                    "client_id": alert.client_id,
                    "count": alert.count,
                    "created_at": alert.created_at,
                    "details": alert.details,
                }
                for alert in list(self._alerts)
            ],
            "thresholds": {
                "burst_per_minute": _burst_threshold_per_minute(),
                "repeated_failures_per_15m": _failure_threshold_per_window(),
                "generation_volume_per_15m": _volume_threshold_per_window(),
                "alert_cooldown_seconds": _cooldown_seconds(),
            },
        }

    async def _record_counter(
        self,
        *,
        bucket: dict[tuple[str, str], Deque[float]],
        route_key: str,
        client_id: str,
        window_seconds: int,
        threshold: int,
        alert_type: str,
        details: dict[str, str | int],
    ) -> None:
        now = time.monotonic()
        cutoff = now - window_seconds
        key = (route_key, client_id)
        async with self._lock:
            samples = bucket[key]
            while samples and samples[0] <= cutoff:
                samples.popleft()
            samples.append(now)
            count = len(samples)
            if count < threshold:
                return

            alert_key = (alert_type, route_key, client_id)
            last_alert = self._last_alert_at.get(alert_key, 0.0)
            if now - last_alert < _cooldown_seconds():
                return

            self._last_alert_at[alert_key] = now
            alert = AlertEvent(
                alert_type=alert_type,
                route_key=route_key,
                client_id=client_id,
                count=count,
                created_at=time.time(),
                details=details,
            )
            self._alerts.appendleft(alert)

        logger.warning(
            "abuse threshold triggered %s",
            format_log_fields(
                {
                    "request_id": get_request_id(),
                    "alert_type": alert_type,
                    "route_key": route_key,
                    "client_id": client_id,
                    "count": count,
                    **details,
                }
            ),
        )


ABUSE_MONITOR = AbuseMonitor()


def reset_abuse_monitor() -> None:
    ABUSE_MONITOR.reset()
