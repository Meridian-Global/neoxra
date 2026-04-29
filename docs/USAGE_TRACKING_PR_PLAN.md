# Usage Tracking & Limits — PR Plan & Claude Code Prompts

> Generated 2026-04-28. Usage-based billing ($29/$99) 的完整實作路線。
> 每個 PR 都是獨立單元，可直接貼進 Claude Code 執行。

---

## Current State (already done)

你的基礎比想像中完整很多：

| Component | Status | Key Files |
|-----------|--------|-----------|
| UsageEvent model | DONE | `backend/app/db/models.py` (event_name, route, pipeline, user_id, org_id, metadata_json) |
| DemoRun model | DONE | `backend/app/db/models.py` (request lifecycle tracking, duration_ms, status) |
| Event recording service | DONE | `backend/app/services/usage_events.py` (create_demo_run, record_usage_event, mark_demo_run_completed) |
| 3-tier quota enforcement | DONE | `backend/app/core/request_guards.py` (public=12/day, demo=40/day, auth=200/day) |
| Rate limiting infra | DONE | `backend/app/core/rate_limits.py` (InMemoryRateLimitStore, sliding window) |
| Abuse monitoring | DONE | `backend/app/core/abuse_monitor.py` (burst, failures, volume alerts) |
| Quota response headers | DONE | `backend/app/main.py` (X-Neoxra-Quota-Limit, X-Neoxra-Quota-Remaining) |
| Analytics endpoint | DONE | `backend/app/api/analytics_routes.py` (POST /api/analytics/events) |

## What's Missing (for usage-based billing)

1. **No plan/tier in DB** — quotas are hardcoded in env vars, not tied to user's plan
2. **No usage query API** — events are recorded but can't be queried (no GET endpoints)
3. **No frontend usage dashboard** — users can't see how many generations they've used
4. **No Stripe integration** — can't charge users or manage subscriptions
5. **No plan enforcement from DB** — quota limits come from env vars, not from user's plan record
6. **No usage reset logic** — rolling 24h window in memory, no monthly billing cycle tracking

---

## Execution Order

```
Phase 1  →  Phase 2  →  Phase 3  →  Phase 4  →  Phase 5
Plan DB     Usage       Frontend    Stripe      Quota from
Schema      Query API   Dashboard   Billing     Plan (tie
                                                it all)
```

---

## Repo Map

| Repo | Visibility | Path | Used in PRs |
|------|-----------|------|-------------|
| `neoxra` | Public | `~/Desktop/Meridian-Global/neoxra` | ALL PRs |
| `neoxra-core` | Private | `~/Desktop/Meridian-Global/neoxra-core` | None |
| `neoxra-renderer` | Private | `~/Desktop/Meridian-Global/neoxra-renderer` | None |

---

## Phase 1 — Plan & Subscription DB Schema

> Goal: 讓每個 organization 有一個 plan，plan 定義了用量上限。

### PR 1.1: Plan and Subscription Models + Migration

**Repo:** `neoxra` (public) — `~/Desktop/Meridian-Global/neoxra`
**Branch:** `feat/plan-subscription-models`

**Prompt for Claude Code:**

```
[Repo: neoxra — ~/Desktop/Meridian-Global/neoxra]

Read these files first to understand the existing database schema:
- backend/app/db/models.py (all existing models: User, Organization, OrganizationMembership, AuthSession, DemoRun, UsageEvent, TenantConfig)
- backend/app/db/base.py (DeclarativeBase)
- backend/app/db/__init__.py (exports)
- backend/alembic/versions/20260419_0002_auth_foundation.py (latest migration, understand the pattern)
- backend/app/core/request_guards.py (current quota system — see _quota_limit_for_request, lines 116-129, which uses env vars for limits: public=12, demo=40, auth=200 per day)

Add plan and subscription models to support usage-based billing ($29 Starter / $99 Growth):

1. Add to backend/app/db/models.py:

   class Plan(Base):
       __tablename__ = "plans"
       id: String UUID PK
       slug: String(64), unique, indexed — "free", "starter", "growth", "custom"
       name: String(128) — "Free", "Starter", "Growth"
       generations_per_month: Integer — monthly generation quota (free=10, starter=100, growth=500)
       price_cents: Integer — monthly price in cents (0, 2900, 9900)
       features_json: JSON — feature flags dict, e.g. {"seo": true, "threads": true, "facebook": true, "priority_support": false}
       is_active: Boolean, default True
       created_at, updated_at: DateTime with timezone

   class Subscription(Base):
       __tablename__ = "subscriptions"
       id: String UUID PK
       organization_id: String FK -> organizations.id, indexed
       plan_id: String FK -> plans.id, indexed
       status: String(32), indexed — "active", "canceled", "past_due", "trialing"
       current_period_start: DateTime with timezone
       current_period_end: DateTime with timezone
       stripe_subscription_id: String(128), nullable, unique — for future Stripe integration
       stripe_customer_id: String(128), nullable, indexed
       canceled_at: DateTime, nullable
       created_at, updated_at: DateTime with timezone
       Unique constraint on (organization_id) — one active subscription per org

   class UsageCounter(Base):
       __tablename__ = "usage_counters"
       id: String UUID PK
       organization_id: String FK -> organizations.id, indexed
       period_start: DateTime with timezone — first day of billing month
       period_end: DateTime with timezone — last day of billing month
       generation_count: Integer, default 0 — number of generations used this period
       created_at, updated_at: DateTime with timezone
       Unique constraint on (organization_id, period_start)

2. Update backend/app/db/__init__.py to export Plan, Subscription, UsageCounter.

3. Create Alembic migration backend/alembic/versions/20260428_0004_plans_and_subscriptions.py:
   - Create plans, subscriptions, usage_counters tables
   - Seed 3 default plans in upgrade():
     * slug="free", name="Free", generations_per_month=10, price_cents=0
     * slug="starter", name="Starter", generations_per_month=100, price_cents=2900
     * slug="growth", name="Growth", generations_per_month=500, price_cents=9900
   - Add all indexes and foreign keys
   - downgrade() drops all 3 tables

Follow the exact same migration pattern as the existing files (same imports, naming convention, style).
```

---

### PR 1.2: Subscription Service Layer

**Repo:** `neoxra` (public) — `~/Desktop/Meridian-Global/neoxra`
**Branch:** `feat/subscription-service`

**Depends on:** PR 1.1 merged

**Prompt for Claude Code:**

```
[Repo: neoxra — ~/Desktop/Meridian-Global/neoxra]

Read these files first:
- backend/app/db/models.py (the Plan, Subscription, UsageCounter models from PR 1.1)
- backend/app/services/usage_events.py (existing service pattern — create_session, try/except/finally, graceful degradation)
- backend/app/core/auth.py (see _find_or_create_user and _find_or_create_organization for the pattern of find-or-create with IntegrityError handling)

Create backend/app/services/subscriptions.py with these functions:

1. get_plan_by_slug(slug: str) -> Plan | None
   - Simple DB lookup

2. get_active_subscription(organization_id: str) -> Subscription | None
   - Returns the subscription where status in ("active", "trialing") for this org
   - Returns None if no active subscription (means they're on free plan)

3. get_or_create_subscription(organization_id: str, plan_slug: str = "free") -> Subscription
   - If org already has an active subscription, return it
   - If not, create one with the given plan (default "free")
   - Set current_period_start to start of current month (UTC), current_period_end to start of next month
   - Handle IntegrityError for concurrent creation (find-or-create pattern)

4. get_usage_counter(organization_id: str) -> UsageCounter
   - Get or create a UsageCounter for the current billing period
   - "Current billing period" = current calendar month (1st to 1st)
   - If no counter exists for this month, create one with generation_count=0
   - Return the counter

5. increment_usage(organization_id: str) -> UsageCounter
   - Atomically increment generation_count by 1 for the current period
   - Use SQL UPDATE with returning, not read-modify-write (avoid race conditions)
   - If no counter exists, create one first, then increment
   - Return updated counter

6. get_quota_for_organization(organization_id: str) -> dict
   - Returns {"plan_slug": str, "generations_limit": int, "generations_used": int, "generations_remaining": int, "period_start": str, "period_end": str}
   - Combines subscription lookup + usage counter lookup
   - If no subscription, assume free plan (10 generations/month)
   - generations_remaining = max(0, generations_limit - generations_used)

All functions should follow the same pattern as usage_events.py: check _db_disabled(), use try/except/finally with session.close(), log errors but don't crash.
```

---

### PR 1.3: Wire Usage Counting into Generation Pipeline

**Repo:** `neoxra` (public) — `~/Desktop/Meridian-Global/neoxra`
**Branch:** `feat/wire-usage-counting`

**Depends on:** PR 1.2 merged

**Prompt for Claude Code:**

```
[Repo: neoxra — ~/Desktop/Meridian-Global/neoxra]

Read these files first:
- backend/app/services/subscriptions.py (the service from PR 1.2: increment_usage, get_quota_for_organization)
- backend/app/core/request_guards.py (current quota enforcement — see enforce_generation_limits function and _quota_limit_for_request)
- backend/app/services/usage_events.py (see how record_usage_event is called with user_id and organization_id)
- backend/app/api/instagram_routes.py (see how the generation pipeline starts — look for enforce_generation_limits and create_demo_run calls, around lines 300-350)
- backend/app/api/routes.py (the core generation route — same pattern)
- backend/app/core/auth.py (AuthContext dataclass — has user_id, organization_id)

Wire the new usage counting system into the generation pipeline:

1. Update backend/app/core/request_guards.py _quota_limit_for_request():
   - For authenticated users (auth.is_authenticated and auth.organization_id is not None):
     * Call get_quota_for_organization(auth.organization_id) to get their plan's monthly limit
     * Return (plan_limit, "user") instead of the hardcoded env var
     * KEEP the env var as a fallback: if get_quota_for_organization fails or returns None, fall back to the env var AUTHENTICATED_GENERATION_QUOTA_PER_DAY
   - For non-authenticated users: keep the existing env var behavior unchanged (public=12, demo=40)
   - IMPORTANT: The existing check_limit() uses a rolling 24h in-memory window. For plan-based quotas, we need the DB counter instead. Add a NEW check path for authenticated users:
     * Call get_usage_counter(org_id) to get DB-tracked count
     * Compare against plan limit
     * If exceeded, raise 429 with PLAN_QUOTA_EXCEEDED error_code
     * Skip the in-memory rolling window for authenticated users (use DB as source of truth)

2. After a successful generation completes (not starts — completes), call increment_usage(organization_id):
   - In instagram_routes.py: after the "pipeline_completed" event is recorded (around lines 881-895)
   - In routes.py: after the core pipeline completes successfully
   - Only increment for authenticated users with an organization_id
   - Do NOT increment for failed generations
   - Do NOT increment for public/demo users (they still use the in-memory rolling window)

3. Update the quota response headers for authenticated users:
   - X-Neoxra-Quota-Limit: plan's monthly limit (not the env var)
   - X-Neoxra-Quota-Remaining: plan limit - DB counter
   - X-Neoxra-Quota-Scope: "plan"
   - Add new header: X-Neoxra-Quota-Period-End: ISO date string

Keep the existing in-memory quota system running in parallel for non-authenticated users. Only authenticated users switch to the DB-based plan quota.
```

---

## Phase 2 — Usage Query API

> Goal: 讓前端和管理者能查詢用量資料。

### PR 2.1: User-Facing Usage Endpoints

**Repo:** `neoxra` (public) — `~/Desktop/Meridian-Global/neoxra`
**Branch:** `feat/usage-api`

**Depends on:** Phase 1 完成

**Prompt for Claude Code:**

```
[Repo: neoxra — ~/Desktop/Meridian-Global/neoxra]

Read these files first:
- backend/app/services/subscriptions.py (get_quota_for_organization, get_usage_counter)
- backend/app/db/models.py (UsageEvent, DemoRun, UsageCounter, Subscription, Plan)
- backend/app/api/auth_routes.py (see how authenticated endpoints work — using require_authenticated_user)
- backend/app/core/access_levels.py (build_authenticated_marker_router, require_authenticated_route_access)
- backend/app/api/analytics_routes.py (existing analytics endpoint pattern)

Create backend/app/api/usage_routes.py with these authenticated endpoints:

1. GET /api/usage/quota
   - Requires authentication (use require_authenticated_user dependency)
   - Returns the user's current quota info:
     {
       "plan": { "slug": "starter", "name": "Starter", "generations_per_month": 100 },
       "usage": { "generations_used": 42, "generations_remaining": 58 },
       "period": { "start": "2026-04-01T00:00:00Z", "end": "2026-05-01T00:00:00Z" },
       "subscription": { "status": "active", "stripe_subscription_id": null }
     }
   - If no subscription exists, return free plan defaults
   - This is the endpoint the frontend will poll to show the quota bar

2. GET /api/usage/history?days=30
   - Requires authentication
   - Returns daily generation counts for the last N days (default 30, max 90):
     {
       "daily": [
         { "date": "2026-04-28", "count": 5 },
         { "date": "2026-04-27", "count": 3 },
         ...
       ],
       "total": 42
     }
   - Query: SELECT DATE(created_at) as date, COUNT(*) as count FROM usage_events WHERE organization_id = :org_id AND event_name = 'pipeline_completed' AND created_at >= :since GROUP BY DATE(created_at) ORDER BY date DESC
   - Only count successful generations (event_name = 'pipeline_completed' or 'demo_completed')

3. GET /api/usage/breakdown?days=30
   - Requires authentication
   - Returns generation counts grouped by platform:
     {
       "by_platform": {
         "instagram": 20,
         "seo": 10,
         "threads": 8,
         "facebook": 4
       },
       "total": 42,
       "period": { "start": "...", "end": "..." }
     }
   - Query: GROUP BY route from usage_events, filter by completed events

Register the router in backend/app/main.py (follow the pattern of how analytics_router is registered).
```

---

### PR 2.2: Admin Usage Endpoints (Internal)

**Repo:** `neoxra` (public) — `~/Desktop/Meridian-Global/neoxra`
**Branch:** `feat/admin-usage-api`

**Depends on:** PR 2.1 merged

**Prompt for Claude Code:**

```
[Repo: neoxra — ~/Desktop/Meridian-Global/neoxra]

Read these files first:
- backend/app/api/usage_routes.py (user-facing usage endpoints from PR 2.1)
- backend/app/core/access_levels.py (require_internal_route_access — requires X-Neoxra-Admin-Key)
- backend/app/db/models.py (all models)
- backend/app/services/subscriptions.py (subscription service)

Add internal admin endpoints to usage_routes.py (or a new backend/app/api/admin_usage_routes.py if cleaner):

1. GET /api/internal/usage/overview
   - Requires X-Neoxra-Admin-Key (use require_internal_route_access)
   - Returns a high-level overview:
     {
       "total_users": 25,
       "total_organizations": 20,
       "active_subscriptions": { "free": 15, "starter": 3, "growth": 2 },
       "generations_today": 45,
       "generations_this_month": 380,
       "top_users": [
         { "email": "...", "org": "...", "plan": "starter", "generations_this_month": 42 },
         ...
       ]
     }
   - top_users: top 10 by generation count this month

2. GET /api/internal/usage/user/{user_id}
   - Requires X-Neoxra-Admin-Key
   - Returns detailed usage for a specific user:
     {
       "user": { "id": "...", "email": "...", "full_name": "..." },
       "organization": { "tenant_key": "...", "name": "..." },
       "subscription": { "plan_slug": "...", "status": "...", "period_end": "..." },
       "usage": { "generations_this_month": 42, "generations_limit": 100 },
       "recent_generations": [ last 20 DemoRun records with route, status, duration_ms, created_at ]
     }

3. POST /api/internal/subscriptions/assign
   - Requires X-Neoxra-Admin-Key
   - Body: { "organization_id": "...", "plan_slug": "starter" }
   - Manually assigns a plan to an organization (useful for early customers before Stripe is wired up)
   - Creates or updates the subscription record
   - Returns the updated subscription

Register in main.py.
```

---

## Phase 3 — Frontend Usage Dashboard

> Goal: 讓用戶看到自己用了多少、剩多少。

### PR 3.1: Usage Dashboard Page

**Repo:** `neoxra` (public) — `~/Desktop/Meridian-Global/neoxra`
**Branch:** `feat/usage-dashboard`

**Depends on:** Phase 2 PR 2.1 merged

**Prompt for Claude Code:**

```
[Repo: neoxra — ~/Desktop/Meridian-Global/neoxra]

Read these files first:
- frontend/lib/api.ts (see how API_BASE_URL is configured and how existing API calls are made)
- frontend/lib/auth.ts (getSessionToken — needed for authenticated requests)
- frontend/contexts/AuthContext.tsx (useAuth hook — get current user info)
- frontend/app/instagram/page.tsx (example of an existing studio page — understand the layout pattern, how GlobalNav is used)
- frontend/components/GlobalNav.tsx (shared navigation)
- frontend/middleware.ts (see PROTECTED_ROUTES — you'll need to add /usage)

Create the usage dashboard:

1. Create frontend/lib/usage-api.ts:
   - fetchQuota(): calls GET /api/usage/quota with session token in X-Neoxra-Session-Token header
   - fetchUsageHistory(days?: number): calls GET /api/usage/history?days=N
   - fetchUsageBreakdown(days?: number): calls GET /api/usage/breakdown?days=N
   - All functions include the auth header from getSessionToken()

2. Create frontend/app/usage/page.tsx:
   - Protected route (add '/usage' to PROTECTED_ROUTES in middleware.ts)
   - Bilingual (en/zh-TW) using the LanguageProvider pattern from other pages
   - Layout:
     a. Top section: Plan info card
        - Show plan name (e.g. "Starter"), status badge ("Active")
        - Usage bar: "42 / 100 generations used this month" with a visual progress bar
        - Progress bar color: green (<60%), yellow (60-85%), red (>85%)
        - "Period resets on May 1, 2026"
        - If on free plan: "Upgrade to Starter" CTA button (for now, just link to mailto:purmonth@gmail.com or a placeholder)
     b. Middle section: Usage history chart
        - Simple bar chart showing daily generation counts for last 30 days
        - Use a lightweight approach: CSS-only bars (div with dynamic height), no charting library needed
        - X-axis: dates, Y-axis: count
     c. Bottom section: Platform breakdown
        - Show generation counts by platform (Instagram, SEO, Threads, Facebook)
        - Simple horizontal bar layout or stat cards
   - Fetch all data on mount with useEffect
   - Show loading skeletons while fetching
   - Handle error states gracefully

3. Update frontend/middleware.ts:
   - Add '/usage' to PROTECTED_ROUTES

4. Update frontend/components/GlobalNav.tsx:
   - Add a "Usage" / "用量" nav link that points to /usage (only show when isAuthenticated)

Style: match the existing design system (Tailwind, same color palette as other pages). Keep it clean and minimal — this is a utility page, not a marketing page.
```

---

### PR 3.2: Inline Quota Warning in Studio Pages

**Repo:** `neoxra` (public) — `~/Desktop/Meridian-Global/neoxra`
**Branch:** `feat/quota-warning-inline`

**Depends on:** PR 3.1 merged

**Prompt for Claude Code:**

```
[Repo: neoxra — ~/Desktop/Meridian-Global/neoxra]

Read these files first:
- frontend/lib/usage-api.ts (fetchQuota function from PR 3.1)
- frontend/contexts/AuthContext.tsx (useAuth hook)
- frontend/app/instagram/page.tsx (Instagram studio page — the main generation page)
- frontend/app/generate/page.tsx (multi-platform generation page)

Add an inline quota warning that shows in studio pages when the user is close to their limit:

1. Create frontend/components/QuotaWarning.tsx:
   - A small, non-intrusive banner component
   - Fetches quota on mount (call fetchQuota once, cache result for 5 minutes)
   - Show nothing if usage < 80% of limit
   - Show a yellow warning bar at 80-99%: "You've used 85 of 100 generations this month. View usage →"
   - Show a red block bar at 100%: "You've reached your monthly limit. Upgrade your plan to continue generating."
   - The warning should be dismissible (user can close it, stays closed for the session via state)
   - Bilingual (en/zh-TW)
   - Height: small, ~40px, sits above the main content area

2. Add <QuotaWarning /> to the top of these pages (inside the main content area, below GlobalNav):
   - frontend/app/instagram/page.tsx
   - frontend/app/generate/page.tsx
   - frontend/app/seo/page.tsx
   - frontend/app/threads/page.tsx
   - frontend/app/facebook/page.tsx

3. When the user is at 100% and tries to generate:
   - The backend already returns 429 with PLAN_QUOTA_EXCEEDED
   - In the frontend's error handling for generation requests, detect this error code
   - Show a modal or prominent message: "Monthly limit reached. Upgrade to continue." with a link to /usage

Keep the component lightweight. One API call on mount, no polling.
```

---

## Phase 4 — Stripe Billing Integration

> Goal: 讓用戶自己升級方案、自動扣款。

### PR 4.1: Stripe Backend Integration

**Repo:** `neoxra` (public) — `~/Desktop/Meridian-Global/neoxra`
**Branch:** `feat/stripe-backend`

**Depends on:** Phase 1 完成

**Prompt for Claude Code:**

```
[Repo: neoxra — ~/Desktop/Meridian-Global/neoxra]

Read these files first:
- backend/app/db/models.py (Plan, Subscription models — Subscription has stripe_subscription_id and stripe_customer_id fields)
- backend/app/services/subscriptions.py (get_active_subscription, get_or_create_subscription)
- backend/app/core/auth.py (require_authenticated_user, AuthContext)
- backend/app/core/access_levels.py (build_public_router for webhook)
- backend/requirements.txt

Integrate Stripe for subscription billing:

1. Add 'stripe>=8.0.0' to backend/requirements.txt

2. Create backend/app/core/stripe_billing.py:
   - create_checkout_session(organization_id: str, plan_slug: str, user_email: str, success_url: str, cancel_url: str) -> str
     * Creates a Stripe Checkout Session for the given plan
     * Map plan_slug to Stripe Price ID via env vars: STRIPE_PRICE_STARTER, STRIPE_PRICE_GROWTH
     * Set mode="subscription"
     * Set client_reference_id=organization_id
     * Set customer_email=user_email (or find existing Stripe customer by email)
     * Return the checkout session URL
   
   - create_billing_portal_session(stripe_customer_id: str, return_url: str) -> str
     * Creates a Stripe Billing Portal session for managing subscription
     * Return the portal URL
   
   - handle_webhook_event(payload: bytes, signature: str) -> dict
     * Verify webhook signature with STRIPE_WEBHOOK_SECRET
     * Handle these events:
       - checkout.session.completed → create/update Subscription in DB (status="active", set stripe_subscription_id, stripe_customer_id, period dates)
       - customer.subscription.updated → update Subscription status and period dates
       - customer.subscription.deleted → set Subscription status="canceled", set canceled_at
       - invoice.payment_failed → set Subscription status="past_due"
     * Return {"handled": True/False, "event_type": "..."}

3. Create backend/app/api/billing_routes.py:

   POST /api/billing/checkout
   - Requires authentication
   - Body: { "plan_slug": "starter" | "growth" }
   - Calls create_checkout_session with the org's info
   - Returns { "checkout_url": "https://checkout.stripe.com/..." }
   - Validate: plan_slug must be "starter" or "growth" (not "free")

   POST /api/billing/portal
   - Requires authentication
   - Calls create_billing_portal_session with the org's stripe_customer_id
   - Returns { "portal_url": "https://billing.stripe.com/..." }
   - If org has no stripe_customer_id, return 400 with "No active subscription"

   POST /api/billing/webhook
   - Public endpoint (no auth) — called by Stripe
   - Reads raw body and Stripe-Signature header
   - Calls handle_webhook_event
   - Returns 200 OK (Stripe requires this)

4. Register billing_routes in main.py

5. Add to .env.example:
   STRIPE_SECRET_KEY=sk_test_xxxx
   STRIPE_WEBHOOK_SECRET=whsec_xxxx
   STRIPE_PRICE_STARTER=price_xxxx
   STRIPE_PRICE_GROWTH=price_xxxx
   STRIPE_SUCCESS_URL=https://neoxra.com/usage?upgraded=true
   STRIPE_CANCEL_URL=https://neoxra.com/usage

IMPORTANT: The webhook endpoint must accept raw body (not JSON-parsed) for signature verification. Use Request.body() not a Pydantic model.
```

---

### PR 4.2: Frontend Billing UI

**Repo:** `neoxra` (public) — `~/Desktop/Meridian-Global/neoxra`
**Branch:** `feat/stripe-frontend`

**Depends on:** PR 4.1 merged

**Prompt for Claude Code:**

```
[Repo: neoxra — ~/Desktop/Meridian-Global/neoxra]

Read these files first:
- frontend/app/usage/page.tsx (the usage dashboard from Phase 3)
- frontend/lib/usage-api.ts (existing usage API functions)
- frontend/contexts/AuthContext.tsx (useAuth hook)

Add billing UI to the usage dashboard:

1. Update frontend/lib/usage-api.ts — add:
   - createCheckout(planSlug: string): calls POST /api/billing/checkout, returns { checkout_url }
   - openBillingPortal(): calls POST /api/billing/portal, returns { portal_url }

2. Update frontend/app/usage/page.tsx:
   - Add a "Plans" section below the usage bar:
     * Show 3 plan cards side by side (Free, Starter $29/mo, Growth $99/mo)
     * Current plan has a "Current Plan" badge
     * Other plans have an "Upgrade" button
     * Clicking "Upgrade" calls createCheckout(slug), then redirects to checkout_url (window.location.href)
   - Add a "Manage Billing" link (only shown if user has a Stripe subscription):
     * Calls openBillingPortal(), redirects to portal_url
     * This lets users update payment method, cancel, view invoices
   - Handle ?upgraded=true query param:
     * Show a success toast/banner: "Plan upgraded successfully!"
     * Clear the param from URL after showing

3. Bilingual copy for the plan cards and upgrade flow (en/zh-TW)

Keep it simple. No custom payment form — Stripe Checkout and Billing Portal handle all the payment UI. You're just creating buttons that redirect to Stripe.
```

---

## Phase 5 — Tie It All Together

> Goal: 確保 quota enforcement 真的從 plan 讀取，端到端可運作。

### PR 5.1: End-to-End Integration Test + Auto-Provision Free Plan

**Repo:** `neoxra` (public) — `~/Desktop/Meridian-Global/neoxra`
**Branch:** `feat/usage-integration`

**Depends on:** Phase 1-4 全部完成

**Prompt for Claude Code:**

```
[Repo: neoxra — ~/Desktop/Meridian-Global/neoxra]

Read these files first:
- backend/app/services/subscriptions.py (get_or_create_subscription, increment_usage, get_quota_for_organization)
- backend/app/core/request_guards.py (enforce_generation_limits — see how quota is checked)
- backend/app/core/auth.py (the Google OAuth flow — where users are first created)
- backend/app/core/google_oauth.py (or wherever the create_authenticated_session logic is)
- backend/app/api/usage_routes.py (GET /api/usage/quota)
- backend/tests/test_auth.py (existing test pattern)

Wire up auto-provisioning and write integration tests:

1. Auto-provision free plan on first login:
   - In the Google OAuth callback flow (wherever the user + org is first created), after creating the organization and membership, call get_or_create_subscription(organization_id, "free")
   - This ensures every new user immediately has a free plan and usage counter
   - Do NOT fail the login if subscription creation fails — log a warning and continue

2. Create backend/tests/test_usage_quota.py:
   - Test: new user gets free plan with 10 generations/month
   - Test: GET /api/usage/quota returns correct plan info and usage count
   - Test: increment_usage correctly increments the counter
   - Test: when counter reaches plan limit, generation endpoint returns 429 with PLAN_QUOTA_EXCEEDED
   - Test: upgrading plan (via POST /api/internal/subscriptions/assign) increases the limit
   - Test: usage counter resets at new billing period
   - Use SQLite in-memory DB for tests (same pattern as test_auth.py)

3. Create backend/tests/test_usage_api.py:
   - Test: GET /api/usage/history returns daily counts
   - Test: GET /api/usage/breakdown returns per-platform counts
   - Test: unauthenticated requests return 401

4. Verify the quota enforcement flow end-to-end:
   - Authenticated user with free plan → can generate up to 10 times
   - 11th generation → 429 PLAN_QUOTA_EXCEEDED
   - Admin assigns starter plan → user can now generate up to 100 times
   - Quota headers reflect plan limits, not env var defaults

Make sure all tests pass with: python -m pytest backend/tests/test_usage_quota.py backend/tests/test_usage_api.py -v
```

---

## Execution Order & Timeline

```
Phase 1 — Plan DB Schema (foundation):
  PR 1.1  Plan & Subscription Models     ~2 hours
  PR 1.2  Subscription Service Layer      ~2 hours
  PR 1.3  Wire Usage Counting             ~3 hours

Phase 2 — Usage Query API:
  PR 2.1  User-Facing Usage Endpoints     ~2 hours
  PR 2.2  Admin Usage Endpoints           ~2 hours

Phase 3 — Frontend Dashboard:
  PR 3.1  Usage Dashboard Page            ~3 hours
  PR 3.2  Inline Quota Warning            ~2 hours

Phase 4 — Stripe Billing:
  PR 4.1  Stripe Backend Integration      ~4 hours
  PR 4.2  Frontend Billing UI             ~2 hours

Phase 5 — Integration:
  PR 5.1  E2E Tests + Auto-Provision      ~3 hours
```

Total: ~25 hours of Claude Code execution across 10 PRs.

## Pre-requisites Before Starting

1. **Phase 1-3**: No external services needed — pure DB + API + UI work
2. **Phase 4 (Stripe)**:
   - Stripe account: dashboard.stripe.com
   - Create 2 products with monthly prices ($29 Starter, $99 Growth)
   - Get API keys (test mode first)
   - Set up webhook endpoint in Stripe dashboard
   - Environment variables:
     ```
     STRIPE_SECRET_KEY=sk_test_xxxx
     STRIPE_WEBHOOK_SECRET=whsec_xxxx
     STRIPE_PRICE_STARTER=price_xxxx
     STRIPE_PRICE_GROWTH=price_xxxx
     ```

## Suggested Priority

If you want users ASAP, do Phase 1 + 2 + 3 first (plan schema + API + dashboard). That gives you:
- Hardcoded quotas per plan (free=10, starter=100, growth=500)
- Users can see their usage
- Admin can manually assign plans via POST /api/internal/subscriptions/assign

Then add Stripe (Phase 4) when you're ready to actually charge. You can manually assign paid plans to early customers without Stripe while the billing integration is being built.

## How to Use These Prompts

1. `cd ~/Desktop/Meridian-Global/neoxra` — all PRs are in this repo
2. Create branch: `git checkout -b feat/plan-subscription-models`
3. Open Claude Code: `claude`
4. Paste the prompt — each starts with `[Repo: neoxra — ...]`
5. Review changes, test locally
6. Commit, push, create PR
7. After merge, move to the next PR
