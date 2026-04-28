# Auth System — PR Plan & Claude Code Prompts

> Generated 2026-04-28. Each PR is a self-contained unit with a prompt you can paste directly into Claude Code.
> Execute in order — later PRs depend on earlier ones.

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

## What's Missing

1. **No React AuthProvider** — each component calls `lib/auth.ts` directly, no shared state
2. **No Next.js middleware.ts** — no frontend route protection, anyone can hit /generate etc.
3. **No email delivery** — magic links only work in AUTH_MAGIC_LINK_DEBUG mode
4. **No Google OAuth** — only magic link login exists
5. **No auth rate limiting** — auth endpoints have no rate limits
6. **No session cleanup** — expired sessions/tokens stay in DB forever

---

## Phase 1 — Frontend Auth Infrastructure

> Goal: Make login state accessible everywhere, protect routes, redirect unauthenticated users.

### PR 1.1: AuthProvider React Context + useAuth hook

**Repo:** `neoxra` (public) — `~/Desktop/Meridian-Global/neoxra`
**Branch:** `feat/auth-provider`

**Prompt for Claude Code:**

```
[Repo: neoxra — ~/Desktop/Meridian-Global/neoxra]

Read these files first to understand the current auth setup:
- frontend/lib/auth.ts (existing auth functions: getSessionToken, setSessionToken, fetchCurrentUser, logout)
- frontend/app/login/page.tsx (current login page that calls auth lib directly)
- frontend/components/LanguageProvider.tsx (example of existing React context pattern in this codebase)

Create a React AuthProvider context at frontend/contexts/AuthContext.tsx that:

1. Exports AuthProvider component and useAuth() hook
2. AuthProvider wraps the app and manages auth state:
   - user: AuthIdentity | null (reuse the AuthIdentity type from lib/auth.ts)
   - isLoading: boolean (true while checking session on mount)
   - isAuthenticated: boolean (derived: user !== null)
   - login: (token: string) => Promise<void> — stores token via setSessionToken, then calls fetchCurrentUser to populate user state
   - logout: () => Promise<void> — calls logout() from lib/auth.ts, clears user state
   - refresh: () => Promise<void> — re-fetches current user from /api/auth/me
3. On mount, check if a session token exists (getSessionToken). If yes, call fetchCurrentUser(). If it returns 401, clear the token. Set isLoading=false when done.
4. useAuth() returns the context value. Throw if used outside AuthProvider.

Then update frontend/app/layout.tsx to wrap the app with <AuthProvider> (inside the existing LanguageProvider).

Do NOT modify the login page yet — that's a separate PR.
Do NOT create a middleware.ts — that's a separate PR.

Keep it simple. No external auth libraries.
```

---

### PR 1.2: Next.js Middleware for Route Protection

**Repo:** `neoxra` (public) — `~/Desktop/Meridian-Global/neoxra`
**Branch:** `feat/auth-middleware`

**Depends on:** PR 1.1 merged

**Prompt for Claude Code:**

```
[Repo: neoxra — ~/Desktop/Meridian-Global/neoxra]

Read these files first:
- frontend/lib/auth.ts (uses localStorage for session token with key 'neoxra-session-token')
- frontend/contexts/AuthContext.tsx (AuthProvider from previous PR)
- frontend/app/login/page.tsx (login page path is /login)

Create frontend/middleware.ts (Next.js edge middleware) that protects authenticated routes:

1. Define PROTECTED_ROUTES: ['/generate', '/instagram', '/seo', '/threads', '/facebook']
2. Define PUBLIC_ROUTES: ['/', '/login', '/demo/legal']
3. The middleware runs on every navigation request (not API calls, not static assets)
4. Problem: localStorage is not available in edge middleware. Solution: on successful login, also set a cookie 'neoxra-auth' with value '1' (not the actual token — just a flag). The middleware checks for this cookie.
5. If the request path matches a PROTECTED_ROUTE and the cookie is missing, redirect to /login?redirect={original_path}
6. If the request path is /login and the cookie IS present, redirect to /generate (already logged in)
7. Export a config.matcher that excludes _next/static, _next/image, favicon.ico, api/*

Also update frontend/lib/auth.ts:
- In setSessionToken(): also set document.cookie = 'neoxra-auth=1; path=/; max-age=1209600; SameSite=Lax'
- In clearSessionToken(): also clear the cookie by setting max-age=0
- This keeps the cookie in sync with localStorage

IMPORTANT: The cookie is ONLY a flag for middleware routing. The actual session token stays in localStorage and is sent via X-Neoxra-Session-Token header to the backend. Do not put the real token in a cookie.
```

---

### PR 1.3: Wire Studio Pages to Show Auth State

**Repo:** `neoxra` (public) — `~/Desktop/Meridian-Global/neoxra`
**Branch:** `feat/auth-ui-integration`

**Depends on:** PR 1.2 merged

**Prompt for Claude Code:**

```
[Repo: neoxra — ~/Desktop/Meridian-Global/neoxra]

Read these files first:
- frontend/contexts/AuthContext.tsx (AuthProvider with useAuth hook)
- frontend/components/GlobalNav.tsx (the shared navigation component)
- frontend/app/login/page.tsx (current login page)
- frontend/app/instagram/page.tsx (example studio page)
- frontend/app/generate/page.tsx (example studio page)

Make these changes:

1. Update frontend/components/GlobalNav.tsx:
   - Import useAuth from contexts/AuthContext
   - Show user email and a "登出" / "Logout" button in the nav when isAuthenticated
   - Show "登入" / "Login" link when not authenticated
   - Keep it minimal — just text + small button in the top right area of the nav

2. Update frontend/app/login/page.tsx:
   - After successful magic link verification, call the AuthProvider's login() function (from useAuth) instead of manually calling setSessionToken + fetchCurrentUser
   - On the logout button, call the AuthProvider's logout() instead of the raw logout function
   - Add: after login, if there's a ?redirect= query param, redirect there instead of the default

3. Do NOT add auth checks inside individual studio pages — the middleware.ts already handles redirects. The studio pages just work as before, but now GlobalNav shows who's logged in.

Keep changes minimal. Don't restructure existing components.
```

---

## Phase 2 — Email Delivery

> Goal: Magic links actually arrive in users' inboxes instead of only showing in debug mode.

### PR 2.1: Resend Email Service Integration

**Repo:** `neoxra` (public) — `~/Desktop/Meridian-Global/neoxra`
**Branch:** `feat/email-service`

**Prompt for Claude Code:**

```
[Repo: neoxra — ~/Desktop/Meridian-Global/neoxra]

Read these files first:
- backend/app/core/auth.py (see request_magic_link function — currently it creates the token but does NOT send an email. When AUTH_MAGIC_LINK_DEBUG is true, it returns the link in the API response)
- backend/app/api/auth_routes.py (the POST /api/auth/request-link endpoint)
- backend/requirements.txt (current dependencies)

Add email delivery for magic links using Resend (https://resend.com):

1. Add 'resend>=2.0.0' to backend/requirements.txt

2. Create backend/app/core/email.py:
   - send_magic_link_email(to_email: str, magic_link_url: str, full_name: str | None = None) -> bool
   - Uses RESEND_API_KEY env var. If not set, log a warning and return False (graceful degradation)
   - Uses RESEND_FROM_EMAIL env var, default: "Neoxra <noreply@neoxra.com>"
   - HTML email body: clean, minimal design. Subject: "Your Neoxra login link"
   - Include: the magic link as a prominent button, a note that it expires in 20 minutes, a plain-text fallback URL below the button
   - Return True on success, False on failure (catch exceptions, log them, don't crash)

3. Update backend/app/core/auth.py request_magic_link function:
   - After creating the magic link token, build the full URL: {FRONTEND_APP_URL}/login?token={raw_token}
   - Call send_magic_link_email() with the URL
   - If AUTH_MAGIC_LINK_DEBUG is true, ALSO still return the link in the response (for dev)
   - If email sending fails and debug is off, still return success to the user (don't leak whether an email exists) but log the error

4. Update backend/app/api/auth_routes.py:
   - The response message should say "If this email is registered, you'll receive a login link" (don't confirm email existence)
   - Keep returning the debug link when AUTH_MAGIC_LINK_DEBUG=true

5. Add to .env.example:
   RESEND_API_KEY=re_xxxxxxxxxxxx
   RESEND_FROM_EMAIL=Neoxra <noreply@neoxra.com>

Do NOT modify the database schema. Do NOT add new API endpoints. Just wire up email sending into the existing flow.
```

---

### PR 2.2: Magic Link Email HTML Template

**Repo:** `neoxra` (public) — `~/Desktop/Meridian-Global/neoxra`
**Branch:** `feat/email-template`

**Depends on:** PR 2.1 merged

**Prompt for Claude Code:**

```
[Repo: neoxra — ~/Desktop/Meridian-Global/neoxra]

Read backend/app/core/email.py (created in previous PR).

Refactor the email HTML into a proper template:

1. Create backend/app/core/email_templates.py with a function:
   - render_magic_link_email(magic_link_url: str, full_name: str | None, locale: str = "en") -> tuple[str, str]
   - Returns (html_body, text_body)
   - Support locale "en" and "zh-TW"
   - HTML design: white background, centered card (max-width 480px), Neoxra logo text at top, greeting (use full_name if provided), blue CTA button with the link, expiry note ("This link expires in 20 minutes"), plain text URL below button for email clients that block buttons, footer with "© 2026 Neoxra"
   - Text body: plain text version with the same info
   - All CSS must be inline (email client compatibility)
   - Responsive: the card should look good on mobile

2. Update backend/app/core/email.py to use render_magic_link_email() instead of inline HTML.

3. Add a locale parameter to send_magic_link_email() and thread it through from request_magic_link in auth.py. The locale can come from the Accept-Language header or a locale field in the request body (check what the frontend sends).

Keep it simple. No Jinja2 or template engines — just f-strings. The template is small enough.
```

---

## Phase 3 — Google OAuth

> Goal: Let users log in with one click via Google, alongside the existing magic link option.

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

Keep the existing magic link flow exactly as-is. Google OAuth is an additional option, not a replacement.
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
   - POST /api/auth/request-link: max 5 requests per email per 15 minutes, max 20 requests per IP per 15 minutes
   - POST /api/auth/verify: max 10 attempts per IP per 15 minutes (brute force protection)
   - POST /api/auth/google/callback: max 10 attempts per IP per 15 minutes
   - GET /api/auth/google/url: max 20 per IP per 15 minutes

2. Apply rate limits as FastAPI dependencies in auth_routes.py using the existing rate limit pattern from this codebase. Check how other routes apply rate limits and follow the same pattern.

3. When rate limited, return HTTP 429 with:
   { "detail": "Too many requests. Please try again later.", "error_code": "RATE_LIMITED", "retry_after_seconds": <seconds until reset> }

4. Add Retry-After header to the 429 response.

Do NOT create a new rate limiting system. Use the existing RateLimitStore infrastructure. If the existing system needs minor extensions to support per-email keying (not just per-IP), add that minimally.
```

---

### PR 4.2: Session & Token Cleanup

**Repo:** `neoxra` (public) — `~/Desktop/Meridian-Global/neoxra`
**Branch:** `feat/auth-cleanup`

**Prompt for Claude Code:**

```
[Repo: neoxra — ~/Desktop/Meridian-Global/neoxra]

Read these files first:
- backend/app/db/models.py (AuthSession has expires_at and status fields; MagicLinkToken has expires_at and used_at)
- backend/app/core/auth.py (understand session and token lifecycle)
- backend/app/main.py (see existing startup/shutdown hooks if any)

Create a cleanup mechanism for expired auth data:

1. Create backend/app/core/auth_cleanup.py:
   - async def cleanup_expired_sessions() -> int — deletes AuthSessions where expires_at < now OR status = 'revoked' and created_at < 30 days ago. Returns count deleted.
   - async def cleanup_expired_tokens() -> int — deletes MagicLinkTokens where expires_at < now OR used_at is not null and created_at < 7 days ago. Returns count deleted.
   - async def run_auth_cleanup() -> dict — calls both, logs results, returns {"sessions_deleted": N, "tokens_deleted": N}

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
Week 1 (Days 1-3):
  PR 1.1  AuthProvider Context        ~2 hours
  PR 1.2  Next.js Middleware           ~1 hour
  PR 1.3  Auth UI Integration          ~1 hour

Week 1 (Days 4-5):
  PR 2.1  Resend Email Service         ~2 hours
  PR 2.2  Email Template               ~1 hour

Week 2 (Days 1-3):
  PR 3.1  Google OAuth Backend         ~3 hours
  PR 3.2  Google OAuth Frontend        ~2 hours

Week 2 (Days 4-5):
  PR 4.1  Auth Rate Limiting           ~2 hours
  PR 4.2  Session Cleanup              ~1 hour
```

Total: ~15 hours of Claude Code execution across ~10 PRs.

## Pre-requisites Before Starting

1. **Resend account**: Sign up at resend.com, verify your domain (neoxra.com), get API key
2. **Google Cloud Console**: Create OAuth 2.0 credentials at console.cloud.google.com, set authorized redirect URIs
3. **Environment variables ready**:
   ```
   RESEND_API_KEY=re_xxxxxxxxxxxx
   RESEND_FROM_EMAIL=Neoxra <noreply@neoxra.com>
   GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=xxxxx
   GOOGLE_REDIRECT_URI=http://localhost:3000/login/google/callback
   ```

## Repo Map

| Repo | Visibility | Path | Used in PRs |
|------|-----------|------|-------------|
| `neoxra` | Public | `~/Desktop/Meridian-Global/neoxra` | ALL 8 PRs |
| `neoxra-core` | Private | `~/Desktop/Meridian-Global/neoxra-core` | None (auth is product-layer, not AI-core) |
| `neoxra-renderer` | Private | `~/Desktop/Meridian-Global/neoxra-renderer` | None (rendering, not auth) |

> All auth PRs are in the `neoxra` repo. Auth is a product-layer concern — it lives in the public shell, not in the private AI core or renderer.

## How to Use These Prompts

1. `cd ~/Desktop/Meridian-Global/neoxra` — all PRs are in this repo
2. Create branch: `git checkout -b feat/auth-provider`
3. Open Claude Code: `claude` (make sure you're in the neoxra directory)
4. Paste the prompt — each prompt starts with `[Repo: neoxra — ...]` so Claude Code knows the context
5. Review changes, test locally
6. Commit, push, create PR
7. After merge, move to the next PR

Each prompt is self-contained — Claude Code will read the referenced files and understand the context.
