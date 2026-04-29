# Admin Dashboard — PR Plan & Claude Code Prompts

> Generated 2026-04-29. 後台管理介面的完整實作路線。
> 每個 PR 都是獨立單元，可直接貼進 Claude Code 執行。

---

## Repo 決策：不需要開新 repo

Admin dashboard 放在 `neoxra` 就好，理由如下：

| 選項 | 優點 | 缺點 | 結論 |
|------|------|------|------|
| 放在 neoxra | 共用前後端、零 deploy 開銷、共用 auth | — | ✅ 選這個 |
| 開 neoxra-admin 新 repo | 獨立部署、權限隔離 | 需要額外 CORS、重複 auth、多一個 deploy | ❌ 過度工程 |

你的 backend 已經有完整的 internal route 系統（`NEOXRA_ADMIN_KEY` + `build_internal_router()`），frontend 是 Next.js，加一組 `/admin/*` 路由完全沒有技術障礙。等到你有 50+ 客戶、需要獨立的 ops team 用 admin 時，再考慮拆分。

---

## Admin 權限控管設計

目前的 internal routes 用 `NEOXRA_ADMIN_KEY`（一個共用密鑰），適合 API 層。
但 frontend admin dashboard 需要的是「特定用戶是 admin」，所以需要加一個 `is_admin` flag。

**方案：在 User model 加 `is_admin` boolean field**

為什麼不用 role-based：
- 你現在只有一個 admin（你自己），不需要 RBAC
- `is_admin` 一個 boolean 就能區分「一般用戶」和「管理員」
- 前端 middleware 只要檢查這個 flag 就能阻擋非 admin 進入 /admin/*
- 後端也用這個 flag 保護 admin API（不再只靠 NEOXRA_ADMIN_KEY）

---

## Current State (already done)

| Component | Status | Key Files |
|-----------|--------|-----------|
| Internal route framework | DONE | `backend/app/core/access_levels.py` (require_internal_route_access) |
| Internal router builder | DONE | `backend/app/api/access_groups.py` (build_internal_router) |
| Admin usage overview API | DONE | `backend/app/api/admin_usage_routes.py` (GET /api/internal/usage/overview) |
| Admin user detail API | DONE | `backend/app/api/admin_usage_routes.py` (GET /api/internal/usage/user/{id}) |
| Admin subscription assign | DONE | `backend/app/api/admin_usage_routes.py` (POST /api/internal/subscriptions/assign) |
| Health/metrics API | DONE | `backend/app/api/health_routes.py` (GET /health/generation-metrics, /internal/guardrails) |
| Auth cleanup API | DONE | `backend/app/api/auth_routes.py` (POST /api/internal/auth/cleanup) |
| AuthProvider + middleware | DONE | `frontend/contexts/AuthContext.tsx`, `frontend/middleware.ts` |

## What's Missing

1. **No `is_admin` on User** — can't distinguish admin users from regular users
2. **No admin-aware auth** — frontend AuthIdentity doesn't expose admin status, /api/auth/me doesn't return it
3. **No frontend admin pages** — zero admin UI
4. **No admin middleware protection** — /admin/* routes don't exist and aren't gated
5. **No user management API** — can't list, search, activate/deactivate users
6. **No org management API** — can't view or modify organizations

---

## Execution Order

```
Phase 1  →  Phase 2  →  Phase 3  →  Phase 4
Admin       Admin       Admin       Admin
User Flag   Backend     Frontend    Polish
+ Auth      APIs        Dashboard
```

---

## Repo Map

| Repo | Path | Used in PRs |
|------|------|-------------|
| `neoxra` (public) | `~/Desktop/Meridian-Global/neoxra` | ALL PRs |
| `neoxra-core` (private) | `~/Desktop/Meridian-Global/neoxra-core` | None |
| `neoxra-renderer` (private) | `~/Desktop/Meridian-Global/neoxra-renderer` | None |

---

## Phase 1 — Admin User Flag & Auth Integration

> Goal: 讓系統知道誰是 admin，前後端都能判斷。

### PR 1.1: Add is_admin to User Model + Migration

**Repo:** `neoxra` (public) — `~/Desktop/Meridian-Global/neoxra`
**Branch:** `feat/admin-user-flag`

**Prompt for Claude Code:**

```
[Repo: neoxra — ~/Desktop/Meridian-Global/neoxra]

Read these files first:
- backend/app/db/models.py (User model — has id, email, full_name, is_active, last_login_at. No admin flag.)
- backend/alembic/versions/ (list files to find the latest migration revision ID)
- backend/app/core/auth.py (AuthContext dataclass — has is_authenticated, user_id, email, organization_id, tenant_key, role, session_id)
- backend/app/api/auth_routes.py (GET /api/auth/me endpoint — returns authenticated user info)

Add an is_admin flag to the User model:

1. backend/app/db/models.py — User model:
   - Add: is_admin: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
   - Position it after is_active

2. Create Alembic migration:
   - File: backend/alembic/versions/20260429_0005_add_user_is_admin.py (or next sequence number — check existing files)
   - upgrade(): ALTER TABLE users ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT FALSE; CREATE INDEX ix_users_is_admin ON users (is_admin)
   - downgrade(): DROP INDEX, DROP COLUMN
   - Use batch mode for SQLite compatibility in tests (op.batch_alter_table)

3. backend/app/core/auth.py — AuthContext dataclass:
   - Add: is_admin: bool = False
   - In resolve_auth_context(), when fetching the auth session + user, also read user.is_admin and set it on the AuthContext

4. backend/app/api/auth_routes.py — GET /api/auth/me:
   - Add "is_admin": auth.is_admin to the response JSON
   - This is how the frontend will know if the user is an admin

5. frontend/lib/auth.ts — AuthIdentity interface:
   - Add is_admin to the user object: is_admin?: boolean
   - The fetchCurrentUser() function already reads from /api/auth/me, so it will automatically pick up the new field

6. frontend/contexts/AuthContext.tsx — AuthContextValue:
   - Add: isAdmin: boolean (derived from user?.user?.is_admin ?? false)
   - Expose it in the context value alongside isAuthenticated

7. To make yourself the first admin, add a note in the migration or create a simple script:
   - backend/scripts/make_admin.py that takes an email and sets is_admin=True
   - Usage: DATABASE_URL=... python scripts/make_admin.py purmonth@gmail.com

Keep changes minimal. This PR only adds the flag and exposes it — no route protection yet.
```

---

### PR 1.2: Admin Route Protection (Frontend + Backend)

**Repo:** `neoxra` (public) — `~/Desktop/Meridian-Global/neoxra`
**Branch:** `feat/admin-route-protection`

**Depends on:** PR 1.1 merged

**Prompt for Claude Code:**

```
[Repo: neoxra — ~/Desktop/Meridian-Global/neoxra]

Read these files first:
- frontend/middleware.ts (current route protection — PROTECTED_ROUTES, auth cookie check)
- frontend/contexts/AuthContext.tsx (AuthProvider with isAdmin flag from PR 1.1)
- backend/app/core/auth.py (AuthContext with is_admin flag, require_authenticated_user)
- backend/app/core/access_levels.py (existing access level framework)

Add admin route protection on both frontend and backend:

FRONTEND:

1. Update frontend/middleware.ts:
   - Add a new category: ADMIN_ROUTES = ['/admin']
   - For /admin/* routes: check both the auth cookie AND a new admin cookie
   - On login, if the user is_admin, also set a cookie 'neoxra-admin=1' (same pattern as auth cookie)
   - In middleware: if path starts with /admin and admin cookie is missing, redirect to /generate (not login — they're logged in but not admin)
   - IMPORTANT: The admin cookie is only a hint for middleware routing (same as auth cookie). Real admin checks happen in the backend and in React components.

2. Update frontend/lib/auth.ts:
   - In setSessionToken() and clearSessionToken(): also handle the admin cookie
   - Export a new function: setAdminCookie(isAdmin: boolean) — sets or clears 'neoxra-admin' cookie

3. Update frontend/contexts/AuthContext.tsx:
   - After fetchCurrentUser returns, if user.is_admin is true, call setAdminCookie(true)
   - On logout, call setAdminCookie(false)

4. Create frontend/components/AdminGuard.tsx:
   - A wrapper component that checks useAuth().isAdmin
   - If not admin: show "Access denied. This page is for administrators only." with a link back to /generate
   - If admin: render children
   - If isLoading: show loading spinner
   - Usage: wrap admin page content with <AdminGuard>...</AdminGuard>

BACKEND:

5. Create a new dependency function in backend/app/core/access_levels.py:
   - require_admin_user(request: Request) -> AuthContext:
     * First call require_authenticated_user(request) to ensure they're logged in
     * Then check auth.is_admin — if False, raise HTTPException 403 with error_code "ADMIN_REQUIRED"
     * Return the AuthContext
   - Also add build_admin_router() that uses this dependency (same pattern as build_internal_router)

6. The existing internal routes (NEOXRA_ADMIN_KEY) stay as they are — they're for server-to-server API calls. The new admin routes are for browser-based admin dashboard access (user must be logged in AND be admin). Both mechanisms coexist.

Keep the existing internal route system unchanged. This is an ADDITIONAL protection layer for the browser-based admin UI.
```

---

## Phase 2 — Admin Backend APIs

> Goal: 提供 admin dashboard 需要的所有資料 API。

### PR 2.1: User Management Endpoints

**Repo:** `neoxra` (public) — `~/Desktop/Meridian-Global/neoxra`
**Branch:** `feat/admin-user-management`

**Depends on:** Phase 1 完成

**Prompt for Claude Code:**

```
[Repo: neoxra — ~/Desktop/Meridian-Global/neoxra]

Read these files first:
- backend/app/core/access_levels.py (require_admin_user from PR 1.2, build_admin_router)
- backend/app/db/models.py (User, Organization, OrganizationMembership, Subscription, Plan, AuthSession models)
- backend/app/api/admin_usage_routes.py (existing internal admin endpoints — understand the query patterns)
- backend/app/services/subscriptions.py (get_active_subscription, get_usage_counter)

Create backend/app/api/admin_routes.py with admin-protected endpoints:

1. GET /api/admin/users?page=1&per_page=20&search=&sort=created_at&order=desc
   - Requires admin user (use build_admin_router dependency)
   - Returns paginated user list:
     {
       "users": [
         {
           "id": "...",
           "email": "user@example.com",
           "full_name": "User Name",
           "is_active": true,
           "is_admin": false,
           "last_login_at": "2026-04-28T...",
           "created_at": "2026-04-20T...",
           "organization": { "tenant_key": "acme", "name": "Acme Inc" },
           "plan": { "slug": "starter", "name": "Starter" },
           "generations_this_month": 42
         }
       ],
       "pagination": { "page": 1, "per_page": 20, "total": 85, "total_pages": 5 }
     }
   - search: filter by email or full_name (ILIKE %search%)
   - sort: allow created_at, email, last_login_at
   - Join with Organization (via OrganizationMembership), Subscription+Plan, and count generations from UsageCounter for current month

2. GET /api/admin/users/{user_id}
   - Requires admin
   - Returns detailed user info (reuse the logic from /api/internal/usage/user/{user_id} but protect with admin auth instead of admin key):
     {
       "user": { id, email, full_name, is_active, is_admin, last_login_at, created_at },
       "organization": { id, tenant_key, name, org_type },
       "subscription": { plan_slug, plan_name, status, period_start, period_end },
       "usage": { generations_this_month, generations_limit, generations_remaining },
       "sessions": [ { id, auth_method, status, last_seen_at, created_at } ],  // active sessions
       "recent_runs": [ last 20 DemoRun: { id, route, pipeline, status, duration_ms, created_at } ]
     }

3. PATCH /api/admin/users/{user_id}
   - Requires admin
   - Body: { "is_active"?: boolean, "is_admin"?: boolean }
   - Update user fields. Only allow updating is_active and is_admin.
   - Prevent admin from de-adminning themselves (check if user_id == current user)
   - Return updated user object

4. GET /api/admin/organizations?page=1&per_page=20
   - Requires admin
   - Returns paginated org list:
     {
       "organizations": [
         {
           "id": "...",
           "tenant_key": "acme",
           "name": "Acme Inc",
           "org_type": "client",
           "is_active": true,
           "member_count": 3,
           "plan": { "slug": "starter", "name": "Starter" },
           "generations_this_month": 120,
           "created_at": "..."
         }
       ],
       "pagination": { ... }
     }

5. GET /api/admin/dashboard/stats
   - Requires admin
   - Returns high-level dashboard metrics (similar to internal/usage/overview but with more detail):
     {
       "users": { "total": 85, "active_today": 12, "new_this_week": 5 },
       "organizations": { "total": 60, "active": 55 },
       "plans": { "free": 50, "starter": 8, "growth": 2 },
       "generations": {
         "today": 45,
         "this_week": 280,
         "this_month": 1200,
         "by_platform": { "instagram": 500, "seo": 300, "threads": 250, "facebook": 150 }
       }
     }
   - "active_today" = users with at least one generation today
   - "new_this_week" = users created in the last 7 days

Register admin_routes router in backend/app/main.py.
```

---

### PR 2.2: Admin Plan Management Endpoints

**Repo:** `neoxra` (public) — `~/Desktop/Meridian-Global/neoxra`
**Branch:** `feat/admin-plan-management`

**Depends on:** PR 2.1 merged

**Prompt for Claude Code:**

```
[Repo: neoxra — ~/Desktop/Meridian-Global/neoxra]

Read these files first:
- backend/app/api/admin_routes.py (admin endpoints from PR 2.1)
- backend/app/api/admin_usage_routes.py (existing POST /api/internal/subscriptions/assign)
- backend/app/services/subscriptions.py (subscription service functions)
- backend/app/db/models.py (Plan, Subscription, UsageCounter models)

Add plan management endpoints to backend/app/api/admin_routes.py:

1. GET /api/admin/plans
   - Requires admin
   - Returns all plans:
     {
       "plans": [
         { "id": "...", "slug": "free", "name": "Free", "generations_per_month": 10, "price_cents": 0, "is_active": true, "subscriber_count": 50 },
         { "id": "...", "slug": "starter", "name": "Starter", "generations_per_month": 100, "price_cents": 2900, "is_active": true, "subscriber_count": 8 }
       ]
     }
   - subscriber_count: count of active subscriptions for each plan

2. POST /api/admin/subscriptions/assign
   - Requires admin (this is the admin-auth version of the existing internal endpoint)
   - Body: { "organization_id": "...", "plan_slug": "starter" }
   - Same logic as the existing POST /api/internal/subscriptions/assign but protected by admin user auth instead of admin key
   - Returns updated subscription info
   - This endpoint is what the admin UI will call when clicking "Upgrade" on a user

3. GET /api/admin/subscriptions?status=active&plan=starter&page=1
   - Requires admin
   - Returns paginated list of all subscriptions with org and plan info:
     {
       "subscriptions": [
         {
           "id": "...",
           "organization": { "tenant_key": "acme", "name": "Acme Inc" },
           "plan": { "slug": "starter", "name": "Starter" },
           "status": "active",
           "generations_used": 42,
           "generations_limit": 100,
           "period_end": "2026-05-01T...",
           "created_at": "..."
         }
       ],
       "pagination": { ... }
     }
   - Filter by status (active, canceled, past_due) and plan slug
```

---

## Phase 3 — Frontend Admin Dashboard

> Goal: 可視化的管理介面，看到所有用戶、使用狀況、Plan 分佈。

### PR 3.1: Admin Dashboard Layout + Overview Page

**Repo:** `neoxra` (public) — `~/Desktop/Meridian-Global/neoxra`
**Branch:** `feat/admin-dashboard-overview`

**Depends on:** Phase 2 完成

**Prompt for Claude Code:**

```
[Repo: neoxra — ~/Desktop/Meridian-Global/neoxra]

Read these files first:
- frontend/middleware.ts (admin route protection from PR 1.2)
- frontend/components/AdminGuard.tsx (admin access guard component from PR 1.2)
- frontend/contexts/AuthContext.tsx (useAuth with isAdmin)
- frontend/components/GlobalNav.tsx (existing navigation)
- frontend/app/usage/page.tsx (example of a data dashboard page — understand the layout pattern)
- frontend/lib/api.ts (API_BASE_URL config)

Create the admin dashboard:

1. Create frontend/lib/admin-api.ts:
   - All functions include X-Neoxra-Session-Token header from getSessionToken()
   - fetchDashboardStats(): GET /api/admin/dashboard/stats
   - fetchUsers(params: { page?, per_page?, search?, sort?, order? }): GET /api/admin/users
   - fetchUserDetail(userId: string): GET /api/admin/users/{userId}
   - updateUser(userId: string, data: { is_active?: boolean, is_admin?: boolean }): PATCH /api/admin/users/{userId}
   - fetchOrganizations(params: { page?, per_page? }): GET /api/admin/organizations
   - fetchPlans(): GET /api/admin/plans
   - assignPlan(organizationId: string, planSlug: string): POST /api/admin/subscriptions/assign
   - fetchSubscriptions(params: { status?, plan?, page? }): GET /api/admin/subscriptions

2. Create frontend/app/admin/layout.tsx:
   - Wrap with <AdminGuard>
   - Admin sidebar navigation on the left (200px):
     * "Overview" → /admin
     * "Users" → /admin/users
     * "Organizations" → /admin/orgs
     * "Plans" → /admin/plans
   - Main content area on the right
   - Top bar: "Neoxra Admin" title, current admin user email, link back to main app (/generate)
   - Bilingual labels (en/zh-TW) using useLanguage()

3. Create frontend/app/admin/page.tsx (Overview dashboard):
   - Fetch dashboard stats on mount
   - Layout (all in one page, scrollable):
   
   a. Top row — 4 stat cards:
      * Total Users (number + "X new this week" subtitle)
      * Active Today (number)
      * Generations This Month (number)
      * Total Organizations (number)
      Style: clean cards with large number, small subtitle, subtle background
   
   b. Middle row — 2 sections side by side:
      * Left: "Plan Distribution" — simple bar or list showing count per plan (Free: 50, Starter: 8, Growth: 2)
      * Right: "Generations by Platform" — horizontal bars (Instagram: 500, SEO: 300, etc.)
   
   c. Bottom section: "Today's Stats"
      * generations_today count
      * Quick link: "View all users →" to /admin/users

   - Loading skeletons while fetching
   - Handle API errors gracefully (show error state, not crash)
   - Style: Tailwind, match existing design system. Clean white cards on subtle gray background. No charting libraries — use CSS for simple bars.

4. Update frontend/middleware.ts:
   - Ensure '/admin' is in ADMIN_ROUTES (should already be from PR 1.2)

5. Update frontend/components/GlobalNav.tsx:
   - Add an "Admin" link that only shows when isAdmin is true
   - Points to /admin
```

---

### PR 3.2: Admin Users Page (List + Detail + Actions)

**Repo:** `neoxra` (public) — `~/Desktop/Meridian-Global/neoxra`
**Branch:** `feat/admin-users-page`

**Depends on:** PR 3.1 merged

**Prompt for Claude Code:**

```
[Repo: neoxra — ~/Desktop/Meridian-Global/neoxra]

Read these files first:
- frontend/lib/admin-api.ts (fetchUsers, fetchUserDetail, updateUser, assignPlan)
- frontend/app/admin/layout.tsx (admin layout with sidebar)
- frontend/app/admin/page.tsx (overview page — understand the styling pattern)

Create the admin users management pages:

1. Create frontend/app/admin/users/page.tsx (User List):
   - Search bar at top: filters users by email/name (debounced, 300ms)
   - Table with columns: Email, Name, Plan, Generations (this month), Last Login, Status, Actions
   - Status column: green dot for active, red for inactive
   - Actions column: "View" link to /admin/users/[id]
   - Pagination at bottom: "Page 1 of 5" with prev/next buttons
   - Sort: click column headers to sort by email, last_login_at, created_at
   - Table style: clean, alternating row backgrounds, responsive
   - Default sort: last_login_at descending (most recent first)

2. Create frontend/app/admin/users/[id]/page.tsx (User Detail):
   - Fetch user detail on mount
   - Layout:
   
   a. User info card:
      * Email, name, user ID
      * Status badge (Active/Inactive)
      * Admin badge if is_admin
      * Last login time
      * Account created time
   
   b. Organization section:
      * Org name, tenant_key, org_type
   
   c. Subscription section:
      * Current plan name and slug
      * Period: "Apr 1 – May 1, 2026"
      * Usage bar: "42 / 100 generations" with progress bar
      * "Change Plan" dropdown: select from available plans → calls assignPlan()
      * Show confirmation before changing plan
   
   d. Active sessions section:
      * Table: auth_method, status, last_seen_at, created_at
      * Light gray background
   
   e. Recent generations section:
      * Table: route (platform), status, duration (ms), created_at
      * Last 20 runs
      * Color-code status: green for completed, red for failed
   
   f. Admin actions section (bottom, with clear separation):
      * Toggle Active/Inactive button — calls updateUser with is_active
      * Toggle Admin — calls updateUser with is_admin (disabled if viewing yourself)
      * Show confirmation dialog before toggling admin status
      * Both buttons show loading state while API call is in progress

   - "← Back to Users" link at top

3. Bilingual support (en/zh-TW) for all labels and messages.
4. Loading skeletons while data loads.
5. Error handling: show error message if API calls fail, with retry button.

Style: consistent with the overview page. Tables use the same visual pattern. Use Tailwind only.
```

---

### PR 3.3: Admin Organizations & Plans Pages

**Repo:** `neoxra` (public) — `~/Desktop/Meridian-Global/neoxra`
**Branch:** `feat/admin-orgs-plans`

**Depends on:** PR 3.2 merged

**Prompt for Claude Code:**

```
[Repo: neoxra — ~/Desktop/Meridian-Global/neoxra]

Read these files first:
- frontend/lib/admin-api.ts (fetchOrganizations, fetchPlans, fetchSubscriptions)
- frontend/app/admin/users/page.tsx (user list page — reuse the same table/pagination pattern)
- frontend/app/admin/layout.tsx (sidebar with "Organizations" and "Plans" links)

Create the organizations and plans pages:

1. Create frontend/app/admin/orgs/page.tsx (Organizations List):
   - Table with columns: Name, Tenant Key, Type, Members, Plan, Generations (this month), Status
   - Pagination (same pattern as users page)
   - Click row → expand inline detail (no separate detail page needed for orgs, keep it simple)
   - Expanded detail shows: member list (emails), subscription info, usage this month

2. Create frontend/app/admin/plans/page.tsx (Plans Overview):
   - Show all plans as cards (not a table):
     * Plan name, slug
     * Price: "$29/mo" or "Free"
     * Generations limit: "100 / month"
     * Active subscribers count
     * Status badge (Active/Inactive)
   - Below the cards: Subscriptions table
     * Fetch subscriptions list
     * Columns: Organization, Plan, Status, Usage (X/Y), Period End
     * Filter tabs: All | Active | Canceled | Past Due
     * Pagination

3. Bilingual (en/zh-TW), loading skeletons, error handling — same patterns as other admin pages.

Style: match the rest of the admin dashboard. Keep it simple and functional.
```

---

## Phase 4 — Polish & Observability

> Goal: 讓 admin dashboard 更實用，加上活動日誌和系統健康狀態。

### PR 4.1: System Health Panel in Admin Dashboard

**Repo:** `neoxra` (public) — `~/Desktop/Meridian-Global/neoxra`
**Branch:** `feat/admin-system-health`

**Depends on:** Phase 3 完成

**Prompt for Claude Code:**

```
[Repo: neoxra — ~/Desktop/Meridian-Global/neoxra]

Read these files first:
- backend/app/api/health_routes.py (existing health endpoints: GET /healthz, /health/db, /health/core, /health/generation-metrics, /internal/guardrails)
- frontend/lib/admin-api.ts (admin API functions)
- frontend/app/admin/layout.tsx (admin sidebar)

Add a system health page to the admin dashboard:

1. Add to frontend/lib/admin-api.ts:
   - fetchHealthDb(): GET /health/db (public endpoint, no admin key needed)
   - fetchHealthCore(): GET /health/core (public endpoint)
   - fetchGenerationMetrics(): GET /health/generation-metrics with admin auth header
   - fetchGuardrails(): GET /internal/guardrails with admin auth header
   - Note: the internal endpoints use NEOXRA_ADMIN_KEY header. For the admin dashboard, we need to either:
     * Option A: Create new admin-auth versions of these endpoints (cleaner)
     * Option B: Pass NEOXRA_ADMIN_KEY from an env var at build time (simpler but less secure)
   - Use Option A: Create two new admin-protected endpoints in the backend

2. Add to backend/app/api/admin_routes.py:
   - GET /api/admin/system/health — requires admin user auth, returns combined health info:
     {
       "database": { "status": "ok" | "error", "details": ... },
       "core_library": { "status": "ok" | "error", "version": "...", "details": ... },
       "generation_metrics": { "overall": { total_runs, successful_runs, failed_runs, success_rate_percent }, "by_pipeline": {...} },
       "guardrails": { "rate_limit_backend": "memory", "abuse_monitor": {...} }
     }
   - Internally calls the same functions that health_routes uses, just repackaged under admin auth

3. Create frontend/app/admin/system/page.tsx:
   - Add "System" to admin sidebar navigation
   - Layout:
     a. Status cards: Database (green/red), Core Library (green/red), Rate Limiter (backend type)
     b. Generation metrics: success rate %, total runs, failed runs
     c. Per-pipeline breakdown: table showing each pipeline's success/failure counts
   - Auto-refresh every 30 seconds (optional toggle)
   - Bilingual (en/zh-TW)
```

---

### PR 4.2: Admin Activity Log

**Repo:** `neoxra` (public) — `~/Desktop/Meridian-Global/neoxra`
**Branch:** `feat/admin-activity-log`

**Depends on:** PR 4.1 merged

**Prompt for Claude Code:**

```
[Repo: neoxra — ~/Desktop/Meridian-Global/neoxra]

Read these files first:
- backend/app/db/models.py (DemoRun, UsageEvent models)
- backend/app/api/admin_routes.py (existing admin endpoints)
- frontend/app/admin/layout.tsx (admin sidebar)

Add a real-time activity log to the admin dashboard:

1. Add to backend/app/api/admin_routes.py:

   GET /api/admin/activity?page=1&per_page=50&route=&status=
   - Requires admin
   - Returns recent DemoRun records with user and org info:
     {
       "activities": [
         {
           "id": "...",
           "route": "/api/instagram/generate",
           "pipeline": "instagram",
           "status": "completed",
           "duration_ms": 4500,
           "user_email": "user@example.com",
           "org_name": "Acme Inc",
           "created_at": "2026-04-29T10:30:00Z"
         }
       ],
       "pagination": { "page": 1, "per_page": 50, "total": 1200, "total_pages": 24 }
     }
   - Join DemoRun with User and Organization
   - Filter by route (platform) and status
   - Order by created_at DESC (most recent first)

2. Create frontend/app/admin/activity/page.tsx:
   - Add "Activity" to admin sidebar
   - Filter bar at top: dropdown for platform (All, Instagram, SEO, Threads, Facebook), dropdown for status (All, Completed, Failed)
   - Table: Time (relative, e.g. "2 min ago"), User, Platform, Status, Duration
   - Status column: green badge for completed, red for failed
   - Duration column: "4.5s" format
   - Pagination at bottom
   - Click a row → link to /admin/users/[user_id] for that user
   - Auto-refresh toggle (every 10 seconds when enabled)
   - Bilingual (en/zh-TW)
```

---

## Execution Order & Timeline

```
Phase 1 — Admin User Flag + Auth (foundation):
  PR 1.1  is_admin flag + migration        ~2 hours
  PR 1.2  Admin route protection            ~2 hours

Phase 2 — Admin Backend APIs:
  PR 2.1  User management endpoints         ~3 hours
  PR 2.2  Plan management endpoints         ~2 hours

Phase 3 — Frontend Dashboard:
  PR 3.1  Dashboard layout + overview       ~3 hours
  PR 3.2  Users page (list + detail)        ~4 hours
  PR 3.3  Orgs + Plans pages                ~3 hours

Phase 4 — Polish:
  PR 4.1  System health panel               ~2 hours
  PR 4.2  Activity log                      ~2 hours
```

Total: ~23 hours of Claude Code execution across 9 PRs.

## Suggested Priority (快速上線路徑)

Phase 1 + 2 + PR 3.1 + PR 3.2 就夠用了（~14 小時）。這會給你：
- Admin 權限控管（只有你能進 /admin）
- 用戶列表、搜尋、詳細資訊
- Plan 分配（手動升級客戶）
- Dashboard 概覽（有多少用戶、生成量、plan 分佈）

PR 3.3（Orgs/Plans 頁面）和 Phase 4（System Health + Activity Log）可以等到你有 20+ 客戶再做。

## How to Use These Prompts

1. `cd ~/Desktop/Meridian-Global/neoxra` — all PRs are in this repo
2. Create branch: `git checkout -b feat/admin-user-flag`
3. Open Claude Code: `claude`
4. Paste the prompt — each starts with `[Repo: neoxra — ...]`
5. Review changes, test locally
6. Commit, push, create PR
7. After merge, move to the next PR

## First Admin Setup

After PR 1.1 is merged and migration is run:
```bash
cd backend
DATABASE_URL=postgresql+psycopg://... python scripts/make_admin.py purmonth@gmail.com
```
This makes your account the first admin. Then log in and go to /admin.
