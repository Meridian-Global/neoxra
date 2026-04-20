from app.core_client.compatibility import (
    CoreCompatibilityExpectation,
    evaluate_core_compatibility,
)


def test_core_compatibility_accepts_matching_metadata():
    result = evaluate_core_compatibility(
        {
            "api_schema_version": "2026-04-19",
            "package_version": "0.1.0",
            "capabilities": [
                "core.pipeline.stream",
                "instagram.style.analyze",
                "instagram.content.generate",
                "instagram.content.score",
            ],
        }
    )

    assert result.compatible is True
    assert result.reasons == ()


def test_core_compatibility_rejects_missing_capabilities_and_schema_mismatch():
    result = evaluate_core_compatibility(
        {
            "api_schema_version": "2026-04-01",
            "package_version": "0.0.9",
            "capabilities": ["core.pipeline.stream"],
        },
        expectation=CoreCompatibilityExpectation(),
    )

    assert result.compatible is False
    assert any("api_schema_version mismatch" in reason for reason in result.reasons)
    assert any("package_version too old" in reason for reason in result.reasons)
    assert any("missing capabilities" in reason for reason in result.reasons)


def test_core_compatibility_handles_null_capabilities():
    result = evaluate_core_compatibility(
        {
            "api_schema_version": "2026-04-19",
            "package_version": "0.1.0",
            "capabilities": None,
        }
    )

    assert result.compatible is False
    assert any("capabilities missing or invalid" in reason for reason in result.reasons)


def test_core_compatibility_handles_non_list_capabilities():
    result = evaluate_core_compatibility(
        {
            "api_schema_version": "2026-04-19",
            "package_version": "0.1.0",
            "capabilities": "core.pipeline.stream",
        }
    )

    assert result.compatible is False
    assert any("capabilities missing or invalid" in reason for reason in result.reasons)


def test_core_compatibility_handles_missing_capabilities_key():
    result = evaluate_core_compatibility(
        {
            "api_schema_version": "2026-04-19",
            "package_version": "0.1.0",
        }
    )

    assert result.compatible is False
    assert any("missing capabilities" in reason for reason in result.reasons)
