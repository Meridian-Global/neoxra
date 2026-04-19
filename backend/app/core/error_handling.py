from __future__ import annotations

from fastapi.responses import JSONResponse


def json_error_response(*, status_code: int, error_code: str, detail: str, request_id: str | None = None) -> JSONResponse:
    headers = {}
    if request_id:
        headers["X-Request-ID"] = request_id
    return JSONResponse(
        status_code=status_code,
        content={
            "detail": detail,
            "error_code": error_code,
        },
        headers=headers,
    )


def generation_error_payload(*, stage: str, error_code: str, message: str) -> dict[str, str]:
    return {
        "stage": stage,
        "message": message,
        "error_code": error_code,
    }


def public_generation_error(stage: str) -> tuple[str, str]:
    if stage == "style_analysis":
        return ("STYLE_ANALYSIS_FAILED", "Something went wrong while analyzing the input style.")
    if stage == "generation":
        return ("GENERATION_FAILED", "Something went wrong while generating content.")
    if stage == "scoring":
        return ("SCORING_FAILED", "Something went wrong while scoring the generated content.")
    if stage == "pipeline":
        return ("PIPELINE_FAILED", "Generation could not be completed. Please try again.")
    return ("GENERATION_FAILED", "Generation could not be completed. Please try again.")


def validation_error_for_stage(stage: str) -> tuple[str, str]:
    if stage == "pipeline":
        return ("PIPELINE_OUTPUT_INVALID", "Generated output could not be validated.")
    return (f"{stage.upper()}_OUTPUT_INVALID", "Generated output could not be validated.")
