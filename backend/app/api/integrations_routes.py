import logging
import os
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel

logger = logging.getLogger(__name__)

_GMAIL_IMPORT_ERROR = None
_LINKEDIN_IMPORT_ERROR = None

try:
    from ..app_layer.integrations.gmail_scanner import scan_inbox
except ModuleNotFoundError as exc:
    scan_inbox = None
    _GMAIL_IMPORT_ERROR = exc

try:
    from ..app_layer.integrations.linkedin_publisher import publish_to_linkedin
except ModuleNotFoundError as exc:
    publish_to_linkedin = None
    _LINKEDIN_IMPORT_ERROR = exc

router = APIRouter()


class PublishLinkedInRequest(BaseModel):
    content: str
    access_token: str | None = None
    person_urn: str | None = None


@router.post("/api/publish/linkedin")
async def publish_linkedin(req: PublishLinkedInRequest):
    if publish_to_linkedin is None:
        raise HTTPException(
            status_code=503,
            detail="LinkedIn integration is temporarily unavailable.",
        )

    access_token = req.access_token or os.getenv("LINKEDIN_ACCESS_TOKEN")
    person_urn = req.person_urn or os.getenv("LINKEDIN_PERSON_URN")

    if not access_token or not person_urn:
        raise HTTPException(status_code=401, detail="LinkedIn credentials not configured")

    result = publish_to_linkedin(
        content=req.content,
        access_token=access_token,
        person_urn=person_urn,
    )

    if result["success"]:
        return {"post_id": result["post_id"], "error": None}

    return JSONResponse(
        status_code=502,
        content={
            "post_id": None,
            "detail": "LinkedIn publishing failed.",
            "error_code": "LINKEDIN_PUBLISH_FAILED",
        },
    )


@router.get("/api/ideas/scan")
async def scan_gmail_ideas(max_results: int = Query(default=20, ge=1, le=50)):
    if scan_inbox is None:
        raise HTTPException(
            status_code=503,
            detail="Gmail integration is temporarily unavailable.",
        )

    try:
        return scan_inbox(max_results=max_results)
    except RuntimeError as e:
        logger.exception("Gmail scan failed: credentials error")
        raise HTTPException(status_code=401, detail="Gmail credentials are not configured.") from e
    except Exception as e:
        logger.exception("Gmail scan failed: unexpected error")
        raise HTTPException(status_code=500, detail="Gmail idea scan failed.") from e
