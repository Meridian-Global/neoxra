from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from typing import Any

from .generation_metrics import record_generation_outcome
from .logging_utils import format_log_fields, get_request_id


@dataclass
class PipelineLifecycleTracker:
    logger: logging.Logger
    pipeline_name: str
    locale: str
    stage_started_at: dict[str, float] = field(default_factory=dict)
    stage_durations_ms: dict[str, float] = field(default_factory=dict)
    request_id: str = field(default_factory=get_request_id)
    started_at: float = field(default_factory=time.perf_counter)
    _finished: bool = False

    def log_start(self, **fields: Any) -> None:
        self.logger.info(
            "pipeline lifecycle %s",
            format_log_fields(
                {
                    "pipeline": self.pipeline_name,
                    "request_id": self.request_id,
                    "status": "started",
                    "locale": self.locale,
                    **fields,
                }
            ),
        )

    def stage_started(self, stage: str, **fields: Any) -> None:
        self.stage_started_at[stage] = time.perf_counter()
        self.logger.info(
            "pipeline stage %s",
            format_log_fields(
                {
                    "pipeline": self.pipeline_name,
                    "request_id": self.request_id,
                    "stage": stage,
                    "status": "started",
                    "locale": self.locale,
                    **fields,
                }
            ),
        )

    def stage_completed(self, stage: str, **fields: Any) -> float | None:
        started_at = self.stage_started_at.pop(stage, None)
        duration_ms = None
        if started_at is not None:
            duration_ms = round((time.perf_counter() - started_at) * 1000, 1)
            self.stage_durations_ms[stage] = duration_ms

        self.logger.info(
            "pipeline stage %s",
            format_log_fields(
                {
                    "pipeline": self.pipeline_name,
                    "request_id": self.request_id,
                    "stage": stage,
                    "status": "completed",
                    "locale": self.locale,
                    "stage_duration_ms": duration_ms,
                    **fields,
                }
            ),
        )
        return duration_ms

    def complete(self, **fields: Any) -> None:
        if self._finished:
            return

        self._finished = True
        total_duration_ms = round((time.perf_counter() - self.started_at) * 1000, 1)
        record_generation_outcome(self.pipeline_name, success=True)
        self.logger.info(
            "pipeline lifecycle %s",
            format_log_fields(
                {
                    "pipeline": self.pipeline_name,
                    "request_id": self.request_id,
                    "status": "success",
                    "locale": self.locale,
                    "total_duration_ms": total_duration_ms,
                    "stage_durations_ms": self.stage_durations_ms,
                    **fields,
                }
            ),
        )

    def fail(
        self,
        *,
        stage: str,
        failure_reason: str,
        error_type: str | None = None,
        message: str | None = None,
        **fields: Any,
    ) -> None:
        if self._finished:
            return

        self._finished = True
        total_duration_ms = round((time.perf_counter() - self.started_at) * 1000, 1)
        record_generation_outcome(
            self.pipeline_name,
            success=False,
            failure_reason=failure_reason,
        )
        self.logger.error(
            "pipeline lifecycle %s",
            format_log_fields(
                {
                    "pipeline": self.pipeline_name,
                    "request_id": self.request_id,
                    "status": "failure",
                    "locale": self.locale,
                    "stage": stage,
                    "failure_reason": failure_reason,
                    "error_type": error_type,
                    "message": message,
                    "total_duration_ms": total_duration_ms,
                    "stage_durations_ms": self.stage_durations_ms,
                    **fields,
                }
            ),
        )
