# Auth System — PR Plan & Claude Code Prompts

> Generated 2026-04-28. Each PR is a self-contained unit with a prompt you can paste directly into Claude Code.

---

## Execution Order

> **IMPORTANT: The phase numbers do NOT match the execution order.**
> Google OAuth (Phase 3) must be built BEFORE magic link is removed (Phase 2).

```
Phase 1  →  Phase 3  →  Phase 2  →  Phase 4
(done)      Google      Remove      Hardening
            OAuth       Magic Link
```

Reason: If you remove magic link first, there's no login method until Google OAuth is done. So build the replacement first, then tear down the old.

---

## Repo Map

| Repo | Visibility | Path | Used in PRs |
|------|-----------|------|-------------|
| `neoxra` | Public | `~/Desktop/Meridian-Global/neoxra` | ALL PRs |
| `neoxra-core` | Private | `~/Desktop/Meridian-Global/neoxra-core` | None |
| `neoxra-renderer` | Private | `~/Desktop/Meridian-Global/neoxra-renderer` | None |

> All auth PRs are in the `neoxra` repo. Auth is a product-layer concern.

---

## Current State (already done)

| Component | Status | Key Files |
|-----------|--------|-----------|
| Magic link backend | DONE | `backend/app/core/auth.py` (386 lines) |
| Auth API routes | DONE | `backend/app/api/auth_routes.py` (POST /request-link, /verify, GET /me, POST /logout) |
| DB models | DONE | `backend/app/db/models.py` (User, Organization, AuthSession, MagicLinkToken, OrganizationMembership) |
| DB migration | DONE | `alembic/versions/20260419_0002_auth_foundation.py` |
| Access levels | DONE | `backend/app/core/access_levels.py` (PUBLIC, GATED_DEMO, AUTHENTICATED, INTERNAL) |
| Frontend auth lib | DONE | `frontend/lib/auth.ts` (getSessionToken, setSessionToken, requestMagicLink, verifyMagicLink, fetchCurrentUser, logout) |
| Login page | DONE | `frontend/app/login/page.tsx` (bilingual en/zh-TW, magic link flow) |
| Middleware auth context | DONE | `backend/app/main.py` line 173 (attach_auth_context on every request) |
| **AuthProvider Context** | **DONE** | `frontend/contexts/AuthContext.tsx` (Phase 1 PR 1.1) |
| **Next.js Middleware** | **DONE** | `frontend/middleware.ts` (Phase 1 PR 1.2) |
| **Auth UI Integration** | **DONE** | GlobalNav user display, login page wiring (Phase 1 PR 1.3) |

---

## Phase 1 — Frontend Auth Infrastructure ✅ COMPLETED

> PR 1.1, PR 1.2, PR 1.3 — all merged.

---

## Phase 2 — Remove Magic Link (Dead Code Cleanup)

> Goal: Delete all magic link code. Google OAuth (Phase 3) is the only login method.
>
> **EXECUTE PHASE 3 FIRST.** This phase removes the old login method after the new one is live.

### PR 2.1: Remove Magic Link from Frontend

**Repo:** `neoxra` (public) — `~/Desktop/Meridian-Global/neoxra`
**Branch:** `chore/remove-magic-link-frontend`

**Depends on:** Phase 3 (PR 3.1 + PR 3.2) merged — Google OAuth must be working first

**Prompt for Claude Code:**

```
[Repo: neoxra — ~/Desktop/Meridian-Global/neoxra]

We are removing the magic link login feature entirely. Google OAuth is now the only login method.

Read these files first:
- frontend/lib/auth.ts (contains requestMagicLink and verifyMagicLink functions to remove)
- frontend/app/login/page.tsx (contains the magic link form UI, email input, token verification flow)

Make these changes:

1. frontend/lib/auth.ts:
   - DELETE the requestMagicLink() function (the one that calls POST /api/auth/request-link)
   - DELETE the verifyMagicLink() function (the one that calls POST /api/auth/verify)
   - KEEP: getSessionToken, setSessionToken, clearSessionToken, fetchCurrentUser, logout
   - KEEP: any Google OAuth functions (getGoogleAuthUrl, handleGoogleCallback) added in Phase 3
   - KEEP: the AuthIdentity interface

2. frontend/app/login/page.tsx:
   - REMOVE the entire magic link form (email input, full name input, org key input, "Send magic link" button)
   - REMOVE the magic link token verification useEffect (the one that checks for ?token= in URL params)
   - REMOVE all magic link related state: magicLink, email, fullName, organizationKey, isRequesting
   - REMOVE all i18n copy related to magic link (requestLink, linkHint, requestError, panelBody about magic link, etc.)
   - KEEP the Google OAuth login button and flow as the primary (and only) login method
   - KEEP the session status display, logout button, and navigation links
   - KEEP the bilingual support structure (en/zh-TW) but update copy to reflect Google-only login
   - Update the page title/description: instead of "Sign in with a magic link" make it "Sign in to Neoxra" with a subtitle like "Use your Google account to get started"

3. Remove any imports of requestMagicLink or verifyMagicLink across the entire frontend/ directory. Search for these references and clean them all up.

Do NOT touch backend files — that's a separate PR.
```

---

### PR 2.2: Remove Magic Link from Backend

**Repo:** `neoxra` (public) — `~/Desktop/Meridian-Global/neoxra`
**Branch:** `chore/remove-magic-link-backend`

**Depends on:** PR 2.1 merged

**Prompt for Claude Code:**

```
[Repo: neoxra — ~/Desktop/Meridian-Global/neoxra]

We are removing all magic link backend code. Google OAuth is now the only login method.

Read these files first:
- backend/app/core/auth.py (contains request_magic_link, verify_magic_link, magic_link_debug_enabled, _magic_link_ttl_minutes)
- backend/app/api/auth_routes.py (contains POST /api/auth/request-link and POST /api/auth/verify endpoints, MagicLinkRequest and MagicLinkVerifyRequest Pydantic models)
- backend/app/db/models.py (contains the MagicLinkToken model class, around line 190)
- backend/app/db/__init__.py (exports MagicLinkToken)
- backend/tests/test_auth.py (the entire test is a magic link flow test)
- backend/.env.example (contains AUTH_MAGIC_LINK_TTL_MINUTES and AUTH_MAGIC_LINK_DEBUG)

Make these changes:

1. backend/app/core/auth.py:
   - DELETE: request_magic_link() function (the one that creates a MagicLinkToken and returns a magic link URL)
   - DELETE: verify_magic_link() function (the one that verifies a token and creates an AuthSession)
   - DELETE: magic_link_debug_enabled() function
   - DELETE: _magic_link_ttl_minutes() function
   - DELETE: the MagicLinkToken import from the top of the file
   - KEEP everything else:
     * AuthContext dataclass, resolve_auth_context, attach_auth_context, require_authenticated_user
     * _find_or_create_user, _find_or_create_organization, _ensure_membership (these are shared with Google OAuth)
     * revoke_session_token
     * All utility functions: _hash_token, _normalize_email, _normalize_tenant_key, _validate_redirect_path, _frontend_app_url, _session_ttl_days, _utcnow, _ensure_utc

2. backend/app/api/auth_routes.py:
   - DELETE: the POST /api/auth/request-link endpoint and its auth_request_magic_link handler
   - DELETE: the POST /api/auth/verify endpoint and its auth_verify_magic_link handler
   - DELETE: MagicLinkRequest and MagicLinkVerifyRequest Pydantic models
   - DELETE: imports of request_magic_link, verify_magic_link, magic_link_debug_enabled from core.auth
   - KEEP: GET /api/auth/me endpoint
   - KEEP: POST /api/auth/logout endpoint
   - KEEP: Google OAuth endpoints (GET /api/auth/google/url, POST /api/auth/google/callback)
   - KEEP: router, public_router, authenticated_router setup

3. backend/app/db/models.py:
   - DELETE: the entire MagicLinkToken class (the one with __tablename__ = "magic_link_tokens")
   - KEEP: all other models (User, Organization, OrganizationMembership, AuthSession, DemoRun, UsageEvent, TenantConfig)

4. backend/app/db/__init__.py:
   - REMOVE MagicLinkToken from imports and from the __all__ list

5. backend/tests/test_auth.py:
   - DELETE the entire test_magic_link_auth_flow test function
   - REMOVE MagicLinkToken from imports
   - Add a placeholder comment: # TODO: Add Google OAuth flow tests

6. backend/.env.example:
   - REMOVE the line: AUTH_MAGIC_LINK_TTL_MINUTES=20
   - REMOVE the line: AUTH_MAGIC_LINK_DEBUG=false

7. Search the entire backend/ directory for any remaining references to "magic_link", "MagicLinkToken", "magic_link_debug", "request_magic_link", "verify_magic_link" and remove them. Also check README.md at the repo root for any magic link references.

Do NOT drop the magic_link_tokens database table yet — that's a separate migration PR.
```

---

### PR 2.3: Database Migration — Drop magic_link_tokens Table

**Repo:** `neoxra` (public) — `~/Desktop/Meridian-Global/neoxra`
**Branch:** `chore/drop-magic-link-table`

**Depends on:** PR 2.2 merged

**Prompt for Claude Code:**

```
[Repo: neoxra — ~/Desktop/Meridian-Global/neoxra]

The MagicLinkToken model has been removed from the codebase. Now create an Alembic migration to drop the table from the database.

Read these files first:
- backend/alembic/versions/20260419_0002_auth_foundation.py (see how the magic_link_tokens table was originally created — it has columns: id, user_id, organization_id, email, token_hash, redirect_path, expires_at, used_at, created_at, plus 5 indexes and 2 foreign keys)
- backend/alembic/env.py (understand the Alembic setup and naming conventions)

Create a new Alembic migration:

1. Create backend/alembic/versions/20260428_0003_drop_magic_link_tokens.py:
   - revision message: "Drop magic_link_tokens table"
   - depends_on: the previous migration revision ID (check 20260419_0002 for its revision hash)
   - upgrade(): drop all 5 indexes on magic_link_tokens first (ix_magic_link_tokens_email, ix_magic_link_tokens_expires_at, ix_magic_link_tokens_organization_id, ix_magic_link_tokens_token_hash, ix_magic_link_tokens_user_id), then drop the table
   - downgrade(): recreate the magic_link_tokens table with all original columns, indexes, and foreign keys (copy the exact schema from 20260419_0002 so the migration is fully reversible)

2. Follow the exact same migration file pattern used in the existing migrations (same imports, same style, same naming convention).

This is a clean, standalone migration. Nothing else changes.
```

---

## Phase 3 — Google OAuth

> Goal: Let users log in with one click via Google, alongside the existing magic link option.
> **Execute this BEFORE Phase 2.** This becomes the only login method after magic link is removed.

### PR 3.1: Backend Google OAuth Endpoints

**Repo:** `neoxra` (public) — `~/Desktop/Meridian-Global/neoxra`
**Branch:** `feat/google-oauth-backend`

**Prompt for Claude Code:**

```
[Repo: neoxra — ~/Desktop/Meridian-Global/neoxra]

Read these files first:
- backend/app/core/auth.py (understand the existing auth flow — how users, orgs, sessions are created)
- backend/app/api/auth_routes.py (existing auth endpoints)
- backend/app/db/models.py (User, AuthSession, Organization models)
- backend/app/core/access_levels.py (router builders)
- backend/requirements.txt

Add Google OAuth support to the backend:

1. Add 'google-auth>=2.29.0' and 'requests>=2.31.0' to requirements.txt (for verifying Google ID tokens)

2. Add two new endpoints in backend/app/api/auth_routes.py:

   GET /api/auth/google/url
   - Returns { "url": "https://accounts.google.com/o/oauth2/v2/auth?..." }
   - Query params: client_id (from GOOGLE_CLIENT_ID env), redirect_uri (GOOGLE_REDIRECT_URI env, default: {FRONTEND_APP_URL}/login/google/callback), response_type=code, scope=openid email profile, state={random CSRF token stored in a short-lived way}
   - This is a public endpoint

   POST /api/auth/google/callback
   - Accepts: { "code": "...", "state": "..." }
   - Exchanges the authorization code for tokens via Google's token endpoint
   - Verifies the ID token using google.oauth2.id_token.verify_oauth2_token()
   - Extracts email, full_name (from 'name' claim), and google_sub (from 'sub' claim)
   - Reuse the SAME user creation logic from auth.py: find or create User by email, find or create personal Organization, create OrganizationMembership
   - Create an AuthSession with auth_method="google" (the existing auth_method field supports this)
   - Return the same response format as POST /api/auth/verify: { session_token, user, organization }

3. Create backend/app/core/google_oauth.py:
   - exchange_code_for_tokens(code: str, redirect_uri: str) -> dict (calls Google token endpoint)
   - verify_google_id_token(id_token: str) -> dict (returns claims: email, name, sub)
   - Helper functions, clean separation from auth.py

4. Add to .env.example:
   GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=xxxxx
   GOOGLE_REDIRECT_URI=http://localhost:3000/login/google/callback

5. In auth.py, extract the "find or create user + org + membership + session" logic into a reusable function like create_authenticated_session(email, full_name, auth_method, org_key=None) so both magic link verify and Google OAuth callback can use it without duplicating code.

IMPORTANT: Do not use any external OAuth libraries like authlib or python-social-auth. Keep it minimal — just google-auth for token verification and requests for the token exchange HTTP call.
```

---

### PR 3.2: Frontend Google Login Button

**Repo:** `neoxra` (public) — `~/Desktop/Meridian-Global/neoxra`
**Branch:** `feat/google-oauth-frontend`

**Depends on:** PR 3.1 merged

**Prompt for Claude Code:**

```
[Repo: neoxra — ~/Desktop/Meridian-Global/neoxra]

Read these files first:
- frontend/app/login/page.tsx (current login page with magic link flow)
- frontend/lib/auth.ts (auth functions)
- frontend/contexts/AuthContext.tsx (AuthProvider with login function)

Add Google OAuth login to the frontend:

1. Update frontend/lib/auth.ts — add two new functions:
   - getGoogleAuthUrl(): Promise<string> — calls GET /api/auth/google/url, returns the URL
   - handleGoogleCallback(code: string, state: string): Promise<{ session_token: string }> — calls POST /api/auth/google/callback

2. Create frontend/app/login/google/callback/page.tsx:
   - This page handles the redirect from Google
   - On mount, extract 'code' and 'state' from URL search params
   - Call handleGoogleCallback(code, state)
   - On success: call AuthProvider's login() with the session_token, then redirect to the ?redirect param or /generate
   - On failure: redirect to /login with an error message
   - Show a simple "Signing you in..." loading state while processing

3. Update frontend/app/login/page.tsx:
   - Add a "Continue with Google" button above the magic link form
   - Use a horizontal divider with "or" text between Google button and magic link form
   - Google button style: white background, Google "G" icon (inline SVG), black text, border — standard Google sign-in button look
   - On click: call getGoogleAuthUrl(), then window.location.href = url (full page redirect to Google)
   - The button should be bilingual (en: "Continue with Google", zh-TW: "使用 Google 登入")

4. Update frontend/middleware.ts:
   - Add '/login/google/callback' to PUBLIC_ROUTES so the callback page is accessible without auth

Keep the existing magic link flow exactly as-is for now. Google OAuth is an additional option. (Magic link will be removed in Phase 2, after Google OAuth is verified working.)
```

---

## Phase 4 — Auth Hardening

> Goal: Protect auth endpoints from abuse, keep the database clean.

### PR 4.1: Rate Limiting on Auth Endpoints

**Repo:** `neoxra` (public) — `~/Desktop/Meridian-Global/neoxra`
**Branch:** `feat/auth-rate-limits`

**Prompt for Claude Code:**

```
[Repo: neoxra — ~/Desktop/Meridian-Global/neoxra]

Read these files first:
- backend/app/core/rate_limits.py (existing rate limit infrastructure with RateLimitStore protocol and in-memory implementation)
- backend/app/core/abuse_monitor.py (existing abuse monitoring)
- backend/app/api/auth_routes.py (auth endpoints to protect)
- backend/app/main.py (see how rate limiting is applied to other routes)

Add rate limiting to auth endpoints:

1. In the existing rate limiting system, add auth-specific limits:
   - POST /api/auth/google/callback: max 10 attempts per IP per 15 minutes
   - GET /api/auth/google/url: max 20 per IP per 15 minutes

2. Apply rate limits as FastAPI dependencies in auth_routes.py using the existing rate limit pattern from this codebase. Check how other routes apply rate limits and follow the same pattern.

3. When rate limited, return HTTP 429 with:
   { "detail": "Too many requests. Please try again later.", "error_code": "RATE_LIMITED", "retry_after_seconds": <seconds until reset> }

4. Add Retry-After header to the 429 response.

Do NOT create a new rate limiting system. Use the existing RateLimitStore infrastructure. If the existing system needs minor extensions to support the auth use case, add that minimally.
```

---

### PR 4.2: Session & Token Cleanup

**Repo:** `neoxra` (public) — `~/Desktop/Meridian-Global/neoxra`
**Branch:** `feat/auth-cleanup`

**Prompt for Claude Code:**

```
[Repo: neoxra — ~/Desktop/Meridian-Global/neoxra]

Read these files first:
- backend/app/db/models.py (AuthSession has expires_at and status fields)
- backend/app/core/auth.py (understand session lifecycle)
- backend/app/main.py (see existing startup/shutdown hooks if any)

Create a cleanup mechanism for expired auth data:

1. Create backend/app/core/auth_cleanup.py:
   - async def cleanup_expired_sessions() -> int — deletes AuthSessions where expires_at < now OR status = 'revoked' and created_at < 30 days ago. Returns count deleted.
   - async def run_auth_cleanup() -> dict — calls cleanup, logs results, returns {"sessions_deleted": N}

2. Create a management endpoint (internal only):
   - POST /api/internal/auth/cleanup — calls run_auth_cleanup(), requires X-Neoxra-Admin-Key header (use the existing require_internal_route_access dependency from access_levels.py)
   - Returns the cleanup results

3. Add an optional startup cleanup: in main.py's lifespan or startup event, if env var AUTH_CLEANUP_ON_STARTUP=true, run the cleanup once. Default to false.

4. Add a simple script backend/scripts/cleanup_auth.py that can be run via cron:
   - Calls POST /api/internal/auth/cleanup with the admin key
   - Usage: NEOXRA_ADMIN_KEY=xxx NEOXRA_API_URL=https://api.neoxra.com python scripts/cleanup_auth.py
   - Prints results and exits

Keep it simple. No background task schedulers, no celery, no cron libraries. Just an endpoint + a script.
```

---

## Execution Order & Timeline

```
ALREADY DONE:
  Phase 1 — Frontend Auth Infrastructure ✅

NEXT (build the new login first):
  PR 3.1  Google OAuth Backend         ~3 hours    ← Do this FIRST
  PR 3.2  Google OAuth Frontend        ~2 hours

THEN (remove the old login):
  PR 2.1  Remove Magic Link Frontend   ~1 hour
  PR 2.2  Remove Magic Link Backend    ~1 hour
  PR 2.3  Drop magic_link_tokens Table ~30 min

FINALLY (harden):
  PR 4.1  Auth Rate Limiting           ~2 hours
  PR 4.2  Session Cleanup              ~1 hour
```

Total remaining: ~10.5 hours of Claude Code execution across 7 PRs.

## Pre-requisites Before Starting

1. **Google Cloud Console**: Create OAuth 2.0 credentials at console.cloud.google.com, set authorized redirect URIs
2. **Environment variables ready**:
   ```
   GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=xxxxx
   GOOGLE_REDIRECT_URI=http://localhost:3000/login/google/callback
   ```

## How to Use These Prompts

1. `cd ~/Desktop/Meridian-Global/neoxra` — all PRs are in this repo
2. Create branch: `git checkout -b feat/google-oauth-backend`
3. Open Claude Code: `claude` (make sure you're in the neoxra directory)
4. Paste the prompt — each prompt starts with `[Repo: neoxra — ...]` so Claude Code knows the context
5. Review changes, test locally
6. Commit, push, create PR
7. After merge, move to the next PR

Each prompt is self-contained — Claude Code will read the referenced files and understand the context.
