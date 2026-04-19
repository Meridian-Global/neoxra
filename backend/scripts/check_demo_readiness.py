#!/usr/bin/env python3
"""Lightweight demo-readiness preflight for local or deployed Neoxra backends."""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass
from typing import Any
from urllib import error, request


DEFAULT_GENERATION_PAYLOAD = {
    "topic": "How AI tools help small teams ship faster without adding headcount",
    "template_text": (
        "Hook first, short paragraphs, practical tone, clear CTA. "
        "Show one bottleneck, one workflow change, and one outcome."
    ),
    "goal": "engagement",
}


@dataclass
class CheckResult:
    name: str
    ok: bool
    detail: str


def _join_url(base_url: str, path: str) -> str:
    return f"{base_url.rstrip('/')}{path}"


def _request_json(url: str, method: str = "GET", payload: dict[str, Any] | None = None, timeout: float = 60.0) -> tuple[int, dict[str, Any], dict[str, str]]:
    data = None
    headers = {"Accept": "application/json"}
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"

    req = request.Request(url, method=method, data=data, headers=headers)
    with request.urlopen(req, timeout=timeout) as response:
        body = response.read().decode("utf-8")
        parsed = json.loads(body) if body else {}
        return response.status, parsed, dict(response.headers.items())


def check_healthz(base_url: str, timeout: float) -> CheckResult:
    url = _join_url(base_url, "/healthz")
    try:
        status, payload, headers = _request_json(url, timeout=timeout)
    except Exception as exc:  # pragma: no cover - exercised manually
        return CheckResult("healthz", False, f"request failed: {exc}")

    if status != 200:
        return CheckResult("healthz", False, f"unexpected status={status}")
    if payload.get("status") != "ok":
        return CheckResult("healthz", False, f"unexpected payload={payload}")
    return CheckResult("healthz", True, f"ok request_id={headers.get('X-Request-ID', '-')}")


def check_core_health(base_url: str, timeout: float) -> CheckResult:
    url = _join_url(base_url, "/health/core")
    try:
        status, payload, headers = _request_json(url, timeout=timeout)
    except Exception as exc:  # pragma: no cover - exercised manually
        return CheckResult("health/core", False, f"request failed: {exc}")

    if status != 200:
        return CheckResult("health/core", False, f"unexpected status={status}")
    if payload.get("status") != "ok":
        return CheckResult("health/core", False, payload.get("summary", f"unexpected payload={payload}"))
    core = payload.get("core", {})
    verified_imports = core.get("verified_imports", [])
    return CheckResult(
        "health/core",
        True,
        f"ok request_id={headers.get('X-Request-ID', '-')} imports={len(verified_imports)}",
    )


def check_generation_path(base_url: str, timeout: float) -> CheckResult:
    url = _join_url(base_url, "/api/instagram/generate")
    req = request.Request(
        url,
        method="POST",
        data=json.dumps(DEFAULT_GENERATION_PAYLOAD).encode("utf-8"),
        headers={
            "Accept": "text/event-stream",
            "Content-Type": "application/json",
        },
    )

    events: list[str] = []
    request_id = "-"
    current_event: str | None = None
    current_data: list[str] = []

    try:
        with request.urlopen(req, timeout=timeout) as response:
            request_id = response.headers.get("X-Request-ID", "-")

            for raw_line in response:
                line = raw_line.decode("utf-8").rstrip("\n")

                if line == "":
                    if current_event:
                        payload = {}
                        if current_data:
                            payload = json.loads("\n".join(current_data))
                        events.append(current_event)

                        if current_event == "error":
                            return CheckResult(
                                "generation",
                                False,
                                f"error event request_id={request_id} payload={payload}",
                            )
                        if current_event == "pipeline_completed":
                            return CheckResult(
                                "generation",
                                True,
                                f"ok request_id={request_id} events={','.join(events)}",
                            )

                    current_event = None
                    current_data = []
                    continue

                if line.startswith("event: "):
                    current_event = line[len("event: ") :].strip()
                    continue
                if line.startswith("data: "):
                    current_data.append(line[len("data: ") :].strip())

    except error.HTTPError as exc:  # pragma: no cover - exercised manually
        detail = exc.read().decode("utf-8")
        return CheckResult("generation", False, f"http_error status={exc.code} body={detail}")
    except Exception as exc:  # pragma: no cover - exercised manually
        return CheckResult("generation", False, f"stream failed: {exc}")

    if "pipeline_completed" not in events:
        return CheckResult(
            "generation",
            False,
            f"stream ended before pipeline_completed request_id={request_id} events={','.join(events)}",
        )

    return CheckResult("generation", True, f"ok request_id={request_id} events={','.join(events)}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Check whether a Neoxra backend is demo-ready.")
    parser.add_argument("--base-url", default="http://127.0.0.1:8000", help="Backend base URL, e.g. https://api.neoxra.com")
    parser.add_argument("--timeout", type=float, default=60.0, help="Per-request timeout in seconds")
    args = parser.parse_args()

    results = [
        check_healthz(args.base_url, args.timeout),
        check_core_health(args.base_url, args.timeout),
        check_generation_path(args.base_url, args.timeout),
    ]

    print(f"== Neoxra demo readiness check: {args.base_url} ==")
    for result in results:
        prefix = "PASS" if result.ok else "FAIL"
        print(f"[{prefix}] {result.name}: {result.detail}")

    return 0 if all(result.ok for result in results) else 1


if __name__ == "__main__":
    raise SystemExit(main())
