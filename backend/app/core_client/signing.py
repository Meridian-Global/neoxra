from __future__ import annotations

import base64
import hashlib
import hmac
import os
import time
import uuid


SIGNATURE_VERSION = "v1"
HEADER_KEY_ID = "X-Neoxra-Key-Id"
HEADER_TIMESTAMP = "X-Neoxra-Timestamp"
HEADER_NONCE = "X-Neoxra-Nonce"
HEADER_BODY_SHA256 = "X-Neoxra-Content-SHA256"
HEADER_SIGNATURE = "X-Neoxra-Signature"
HEADER_SIGNATURE_VERSION = "X-Neoxra-Signature-Version"


def _b64url(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")


def sha256_hexdigest(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def build_signature_payload(
    *,
    method: str,
    path: str,
    timestamp: str,
    nonce: str,
    body_sha256: str,
    key_id: str,
    signature_version: str = SIGNATURE_VERSION,
) -> bytes:
    canonical = "\n".join(
        [
            signature_version,
            key_id,
            timestamp,
            nonce,
            method.upper(),
            path,
            body_sha256,
        ]
    )
    return canonical.encode("utf-8")


def sign_internal_request(
    *,
    method: str,
    path: str,
    body: bytes,
    secret: str,
    key_id: str,
    timestamp: int | None = None,
    nonce: str | None = None,
) -> dict[str, str]:
    issued_at = str(timestamp if timestamp is not None else int(time.time()))
    request_nonce = nonce or uuid.uuid4().hex
    body_sha256 = sha256_hexdigest(body)
    payload = build_signature_payload(
        method=method,
        path=path,
        timestamp=issued_at,
        nonce=request_nonce,
        body_sha256=body_sha256,
        key_id=key_id,
    )
    signature = _b64url(
        hmac.new(secret.encode("utf-8"), payload, hashlib.sha256).digest()
    )
    return {
        HEADER_SIGNATURE_VERSION: SIGNATURE_VERSION,
        HEADER_KEY_ID: key_id,
        HEADER_TIMESTAMP: issued_at,
        HEADER_NONCE: request_nonce,
        HEADER_BODY_SHA256: body_sha256,
        HEADER_SIGNATURE: signature,
    }


def sign_internal_request_from_env(
    *,
    method: str,
    path: str,
    body: bytes,
) -> dict[str, str]:
    secret = os.getenv("NEOXRA_CORE_SHARED_SECRET", "").strip()
    key_id = os.getenv("NEOXRA_CORE_KEY_ID", "neoxra-backend").strip()
    if not secret:
        raise RuntimeError(
            "NEOXRA_CORE_SHARED_SECRET must be set before signing internal core requests."
        )
    return sign_internal_request(
        method=method,
        path=path,
        body=body,
        secret=secret,
        key_id=key_id,
    )
