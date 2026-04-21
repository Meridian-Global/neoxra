from __future__ import annotations

from dataclasses import dataclass, field


DEFAULT_CORE_API_SCHEMA_VERSION = "2026-04-19"
DEFAULT_MIN_CORE_PACKAGE_VERSION = "0.1.0"
DEFAULT_REQUIRED_CAPABILITIES = frozenset(
    {
        "core.pipeline.stream",
        "instagram.style.analyze",
        "instagram.content.generate",
        "instagram.content.score",
        "seo.article.generate",
    }
)


@dataclass(frozen=True)
class CoreCompatibilityExpectation:
    api_schema_version: str = DEFAULT_CORE_API_SCHEMA_VERSION
    min_package_version: str = DEFAULT_MIN_CORE_PACKAGE_VERSION
    required_capabilities: frozenset[str] = field(
        default_factory=lambda: DEFAULT_REQUIRED_CAPABILITIES
    )


@dataclass(frozen=True)
class CoreCompatibilityResult:
    compatible: bool
    reasons: tuple[str, ...]


def _parse_semver(value: str | None) -> tuple[int, int, int] | None:
    if not value:
        return None

    parts = value.strip().split(".")
    if len(parts) != 3:
        return None

    try:
        return tuple(int(part) for part in parts)  # type: ignore[return-value]
    except ValueError:
        return None


def evaluate_core_compatibility(
    metadata: dict[str, object],
    expectation: CoreCompatibilityExpectation | None = None,
) -> CoreCompatibilityResult:
    expectation = expectation or CoreCompatibilityExpectation()
    reasons: list[str] = []

    actual_schema = str(metadata.get("api_schema_version", "")).strip()
    if actual_schema != expectation.api_schema_version:
        reasons.append(
            "api_schema_version mismatch: "
            f"expected {expectation.api_schema_version}, got {actual_schema or 'missing'}"
        )

    actual_version = _parse_semver(str(metadata.get("package_version", "")).strip())
    minimum_version = _parse_semver(expectation.min_package_version)
    if actual_version is None:
        reasons.append("package_version missing or not semver")
    elif minimum_version is not None and actual_version < minimum_version:
        reasons.append(
            "package_version too old: "
            f"expected >= {expectation.min_package_version}, got {metadata.get('package_version')}"
        )

    raw_capabilities = metadata.get("capabilities", [])
    if not isinstance(raw_capabilities, list):
        reasons.append("capabilities missing or invalid")
        raw_capabilities = []
    actual_capabilities = {
        str(capability)
        for capability in raw_capabilities
        if str(capability).strip()
    }
    missing_capabilities = sorted(
        expectation.required_capabilities.difference(actual_capabilities)
    )
    if missing_capabilities:
        reasons.append(
            "missing capabilities: " + ", ".join(missing_capabilities)
        )

    return CoreCompatibilityResult(
        compatible=not reasons,
        reasons=tuple(reasons),
    )
