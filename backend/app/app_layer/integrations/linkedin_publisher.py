import logging

import httpx

logger = logging.getLogger(__name__)


def publish_to_linkedin(content: str, access_token: str, person_urn: str) -> dict:
    url = "https://api.linkedin.com/v2/ugcPosts"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
    }
    payload = {
        "author": person_urn,
        "lifecycleState": "PUBLISHED",
        "specificContent": {
            "com.linkedin.ugc.ShareContent": {
                "shareCommentary": {"text": content},
                "shareMediaCategory": "NONE",
            }
        },
        "visibility": {
            "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
        },
    }

    try:
        response = httpx.post(url, headers=headers, json=payload, timeout=20.0)
    except httpx.HTTPError as exc:
        logger.exception("LinkedIn publish HTTP error person_urn=%s", person_urn)
        return {"success": False, "post_id": None, "error": "upstream_http_error"}

    if response.status_code == 201:
        post_id = response.headers.get("X-RestLi-Id") or response.headers.get("x-restli-id")
        return {"success": True, "post_id": post_id, "error": None}

    logger.warning(
        "LinkedIn publish non-201 response status=%d person_urn=%s response_length=%d",
        response.status_code,
        person_urn,
        len(response.content),
    )
    return {
        "success": False,
        "post_id": None,
        "error": f"upstream_status_{response.status_code}",
    }
