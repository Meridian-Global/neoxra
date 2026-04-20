from app.core_client.signing import (
    HEADER_BODY_SHA256,
    HEADER_KEY_ID,
    HEADER_NONCE,
    HEADER_SIGNATURE,
    HEADER_SIGNATURE_VERSION,
    HEADER_TIMESTAMP,
    build_signature_payload,
    sha256_hexdigest,
    sign_internal_request,
)


def test_sign_internal_request_returns_expected_headers():
    body = b'{"topic":"hello"}'
    headers = sign_internal_request(
        method="post",
        path="/internal/generate/instagram",
        body=body,
        secret="test-secret",
        key_id="backend-prod",
        timestamp=1710000000,
        nonce="nonce-123",
    )

    expected_body_sha256 = sha256_hexdigest(body)
    expected_payload = build_signature_payload(
        method="post",
        path="/internal/generate/instagram",
        timestamp="1710000000",
        nonce="nonce-123",
        body_sha256=expected_body_sha256,
        key_id="backend-prod",
    )

    import base64
    import hashlib
    import hmac as hmac_mod

    expected_signature = (
        base64.urlsafe_b64encode(
            hmac_mod.new(b"test-secret", expected_payload, hashlib.sha256).digest()
        )
        .rstrip(b"=")
        .decode("ascii")
    )

    assert headers[HEADER_SIGNATURE_VERSION] == "v1"
    assert headers[HEADER_KEY_ID] == "backend-prod"
    assert headers[HEADER_TIMESTAMP] == "1710000000"
    assert headers[HEADER_NONCE] == "nonce-123"
    assert headers[HEADER_BODY_SHA256] == expected_body_sha256
    assert headers[HEADER_SIGNATURE] == expected_signature
    assert headers[HEADER_SIGNATURE] == "eZVYN0yc4vnmCNmmepdV1FwIRJm4sLg9q3tAjOgi23U"


def test_sign_internal_request_uses_current_time_when_timestamp_is_none():
    import time

    before = int(time.time())
    headers = sign_internal_request(
        method="get",
        path="/internal/meta",
        body=b"",
        secret="test-secret",
        key_id="k1",
        timestamp=None,
    )
    after = int(time.time())

    issued_at = int(headers[HEADER_TIMESTAMP])
    assert before <= issued_at <= after


def test_sign_internal_request_accepts_epoch_zero_timestamp():
    headers = sign_internal_request(
        method="get",
        path="/internal/meta",
        body=b"",
        secret="test-secret",
        key_id="k1",
        timestamp=0,
    )

    assert headers[HEADER_TIMESTAMP] == "0"
