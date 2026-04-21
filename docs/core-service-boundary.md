# Core Service Boundary

This document defines the boundary between the public `neoxra` shell and the private `neoxra-core` runtime.

The goal is to future-proof the boundary without forcing an immediate migration away from the current local package install.

## 1. Compatibility Contract

Neoxra uses two compatibility signals:

1. **Package version**
   - semantic version from `neoxra-core`
   - used for local package installs and deploy pinning
2. **API schema version**
   - date-shaped contract version for service-to-service calls
   - used when `neoxra-core` is called over HTTP

Current baseline:

- `neoxra-core` package version: `0.1.0`
- API schema version: `2026-04-19`

### Required service metadata

The future private core service should expose a private metadata response shaped like:

```json
{
  "service": "neoxra-core",
  "package_version": "0.1.0",
  "api_schema_version": "2026-04-19",
  "capabilities": [
    "core.pipeline.stream",
    "instagram.style.analyze",
    "instagram.content.generate",
    "instagram.content.score",
    "seo.article.generate"
  ]
}
```

### Compatibility rules

`neoxra` should treat `neoxra-core` as compatible only when:

- `api_schema_version` matches exactly
- `package_version` is at least the minimum required by the backend deploy
- required capabilities are present

That means:

- **prompt quality changes** can ship without changing the schema version
- **request/response shape changes** must bump the schema version
- **new optional features** should add new capabilities instead of breaking existing ones

## 2. Signed Internal Request Pattern

For future backend-to-core HTTP calls, use a lightweight HMAC signature rather than mTLS or a full service mesh.

Required headers:

- `X-Neoxra-Signature-Version: v1`
- `X-Neoxra-Key-Id: <key id>`
- `X-Neoxra-Timestamp: <unix seconds>`
- `X-Neoxra-Nonce: <random nonce>`
- `X-Neoxra-Content-SHA256: <body sha256 hex>`
- `X-Neoxra-Signature: <base64url(hmac_sha256(...))>`

Canonical payload:

```text
v1
<key id>
<timestamp>
<nonce>
<HTTP method uppercased>
<request path only>
<body sha256 hex>
```

Signing secret:

- backend env: `NEOXRA_CORE_SHARED_SECRET`
- backend key id: `NEOXRA_CORE_KEY_ID`

Verification expectations in `neoxra-core`:

- reject missing headers
- reject timestamp skew greater than 5 minutes
- reject body hash mismatch
- verify HMAC with the configured shared secret

This is intentionally lightweight:

- good enough for a private network
- easy to implement in both repos
- easy to rotate by changing the shared secret and key id

It is **not** meant to be your forever enterprise trust layer.

## 3. Migration Plan

### Phase 0 — Today

Keep the current system working:

- `NEOXRA_CORE_CLIENT_MODE=local`
- backend installs `neoxra-core` as a package
- `LocalCoreClient` remains the production path

Do now:

- keep routes depending on `core_client`, not direct imports
- define compatibility expectations in code and docs
- define request signing shape in code and docs

### Phase 1 — Add private core service surface

In `neoxra-core`:

- add a private HTTP service wrapper
- expose:
  - `GET /internal/meta`
  - `POST /internal/pipeline/run`
  - `POST /internal/instagram/analyze-style`
  - `POST /internal/instagram/generate-content`
  - `POST /internal/instagram/score-content`
- require signed requests on all internal endpoints

In `neoxra`:

- keep `HttpCoreClient` behind the existing factory
- add metadata handshake on startup or health checks
- fail fast if schema version or capabilities are incompatible

### Phase 2 — Shadow mode

Before switching traffic:

- keep `local` as the primary mode
- run `http` adapter in shadow or staging
- compare:
  - success rate
  - latency
  - output contract validity

Do not switch production until parity is acceptable.

### Phase 3 — Switch production to HTTP

- set `NEOXRA_CORE_CLIENT_MODE=http`
- set `NEOXRA_CORE_API_BASE_URL`
- keep the local adapter available as rollback

### Phase 4 — Reduce direct core imports in `neoxra`

Once HTTP is stable:

- remove route-time dependence on direct `neoxra_core` imports
- keep only:
  - DTO compatibility shims if truly needed
  - diagnostics that do not expose private logic

At that point, the public shell owns:

- product routes
- public validation
- SSE shaping
- auth/rate limits

And the private core owns:

- prompts
- orchestration
- generation logic
- internal schema evolution behind the capability boundary
