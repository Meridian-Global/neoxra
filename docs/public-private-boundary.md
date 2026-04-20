# Public / Private Boundary

This document defines the practical boundary between the public Neoxra product shell and the private AI core.

The goal is simple:

- keep the public repo safe to expose
- keep private product logic in the private core
- make day-to-day decisions easier for engineers

## What belongs in `neoxra`

`neoxra` is the public product shell.

It should contain:

- frontend product surfaces
- backend HTTP and SSE APIs
- request validation and output validation
- demo access, environment, and deployment config
- logging, metrics, and operational safety code
- adapters that call the private core
- product-facing docs and onboarding docs
- public SSE contracts that are safe to expose externally

It should **not** contain:

- private prompts
- private skill logic
- private ranking / critique heuristics
- proprietary generation flows
- customer-specific content policy baked into code

## What belongs in `neoxra-core`

`neoxra-core` is the private AI engine.

It should contain:

- prompt templates
- prompt repair logic
- skill implementations
- structured AI output models
- orchestration logic that is core to generation quality
- private product heuristics for content generation
- internal orchestration details that should not be exposed directly to public clients

It should **not** contain:

- public web routing
- frontend UI code
- deployment-specific product shell concerns
- public demo gating logic

## What belongs in external config or data

Use external config or data for anything that changes by environment, demo surface, or customer context.

That includes:

- environment mode
- API base URLs
- demo access modes and access codes
- signing secrets
- safe per-surface demo settings
- allowed origins
- future customer-specific presets or demo content packs

Do **not** hardcode customer-specific values into public route or page logic unless they are intentionally public demo content.

## Integration rule

The public backend should call private core capabilities through a stable adapter boundary.

Today that boundary is:

- `backend/app/core_client/local.py`
- `backend/app/core_client/http.py`

Routes should depend on the `core_client` abstraction, not on private core classes directly.

## SSE rule

Public SSE is a product contract, not an internal architecture trace.

That means:

- public SSE should expose product-level progress phases
- public SSE should avoid leaking internal orchestration labels where possible
- internal stage names can still exist in logs and internal code

Examples:

- good public SSE: `phase_started`, `brief_ready`, `platform_output`, `review_ready`, `style_ready`, `content_ready`, `score_ready`
- avoid exposing directly: `planner_started`, `instagram_pass1_started`, `style_analysis_started`, `critic_started`

## Enforcement rule of thumb

Before adding code, ask:

1. Is this product-shell behavior?
2. Is this private generation logic?
3. Is this environment or customer-specific config?

If the answer is:

- product shell -> `neoxra`
- private generation logic -> `neoxra-core`
- environment / customer variation -> config or external data

## Current exceptions

Some internal models and agent helpers still exist in `neoxra` for historical reasons.

Those are tolerated short term, but new work should avoid deepening that coupling.

The preferred direction is:

- more route-level isolation through `core_client`
- more product-safe public SSE contracts
- less direct dependence on private-core internals from public code
