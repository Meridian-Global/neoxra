from app.core_client.signing import (
    HEADER_BODY_SHA256,
    HEADER_KEY_ID,
    HEADER_NONCE,
    HEADER_SIGNATURE,
    HEADER_SIGNATURE_VERSION,
    HEADER_TIMESTAMP,
    sha256_hexdigest,
    sign_internal_request,
)


def test_sign_internal_request_returns_expected_headers():
    headers = sign_internal_request(
        method="post",
        path="/internal/generate/instagram",
        body=b'{"topic":"hello"}',
        secret="test-secret",
        key_id="backend-prod",
        timestamp=1710000000,
        nonce="nonce-123",
    )

    assert headers[HEADER_SIGNATURE_VERSION] == "v1"
    assert headers[HEADER_KEY_ID] == "backend-prod"
    assert headers[HEADER_TIMESTAMP] == "1710000000"
    assert headers[HEADER_NONCE] == "nonce-123"
    assert headers[HEADER_BODY_SHA256] == sha256_hexdigest(b'{"topic":"hello"}')
    assert headers[HEADER_SIGNATURE]
