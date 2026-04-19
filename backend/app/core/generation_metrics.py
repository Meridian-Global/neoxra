from __future__ import annotations

from collections import Counter
from copy import deepcopy
from dataclasses import dataclass, field
from threading import Lock
from typing import Any


@dataclass
class _PipelineMetrics:
    total_runs: int = 0
    successful_runs: int = 0
    failed_runs: int = 0
    failures_by_reason: Counter[str] = field(default_factory=Counter)

    def as_dict(self) -> dict[str, Any]:
        success_rate = 0.0
        if self.total_runs:
            success_rate = round((self.successful_runs / self.total_runs) * 100, 1)
        return {
            "total_runs": self.total_runs,
            "successful_runs": self.successful_runs,
            "failed_runs": self.failed_runs,
            "success_rate_percent": success_rate,
            "failures_by_reason": dict(self.failures_by_reason),
        }


class GenerationMetricsStore:
    def __init__(self) -> None:
        self._lock = Lock()
        self._pipelines: dict[str, _PipelineMetrics] = {
            "core": _PipelineMetrics(),
            "instagram": _PipelineMetrics(),
        }

    def record_outcome(self, pipeline: str, *, success: bool, failure_reason: str | None = None) -> None:
        with self._lock:
            metrics = self._pipelines.setdefault(pipeline, _PipelineMetrics())
            metrics.total_runs += 1
            if success:
                metrics.successful_runs += 1
            else:
                metrics.failed_runs += 1
                metrics.failures_by_reason[failure_reason or "unknown"] += 1

    def snapshot(self) -> dict[str, Any]:
        with self._lock:
            by_pipeline = {
                pipeline: metrics.as_dict()
                for pipeline, metrics in deepcopy(self._pipelines).items()
            }

        overall_total = sum(item["total_runs"] for item in by_pipeline.values())
        overall_success = sum(item["successful_runs"] for item in by_pipeline.values())
        overall_failed = sum(item["failed_runs"] for item in by_pipeline.values())
        overall_rate = 0.0
        if overall_total:
            overall_rate = round((overall_success / overall_total) * 100, 1)

        return {
            "overall": {
                "total_runs": overall_total,
                "successful_runs": overall_success,
                "failed_runs": overall_failed,
                "success_rate_percent": overall_rate,
            },
            "by_pipeline": by_pipeline,
        }

    def reset(self) -> None:
        with self._lock:
            for pipeline in list(self._pipelines):
                self._pipelines[pipeline] = _PipelineMetrics()


GENERATION_METRICS = GenerationMetricsStore()


def record_generation_outcome(
    pipeline: str,
    *,
    success: bool,
    failure_reason: str | None = None,
) -> None:
    GENERATION_METRICS.record_outcome(
        pipeline,
        success=success,
        failure_reason=failure_reason,
    )


def get_generation_metrics_snapshot() -> dict[str, Any]:
    return GENERATION_METRICS.snapshot()


def reset_generation_metrics() -> None:
    GENERATION_METRICS.reset()
