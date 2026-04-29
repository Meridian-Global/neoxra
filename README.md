# Neoxra

Neoxra helps small teams turn one strong idea into polished, platform-native content they can ship immediately.

Today the product focuses on demo-ready content generation:
- Generate All: one idea becomes Instagram, SEO, Threads, and Facebook output
- Instagram Studio: visual carousel generation, style references, and PNG export
- SEO Studio, Threads Studio, and Facebook Adapter product surfaces
- Google OAuth login for early customer access and organization-aware onboarding

## Live product

- Frontend: https://neoxra.com/
- Backend: https://api.neoxra.com/
- Generate All: https://neoxra.com/generate
- Instagram Studio: https://neoxra.com/instagram
- SEO Studio: https://neoxra.com/seo
- Threads Studio: https://neoxra.com/threads
- Facebook Adapter: https://neoxra.com/facebook

## What the product does

Neoxra is built for founders, operators, and small teams who have ideas worth distributing but do not want to manually rewrite the same message for every platform.

The current product flow is:

1. Start with a topic or content angle
2. Generate live streamed output
3. Review platform-ready drafts and structure
4. Walk away with content that is easier to publish, refine, or demo

## For engineers

This repo is the product surface for Neoxra:

- `frontend/` — Next.js app
- `backend/` — FastAPI app
- `docs/` — current deployment and architecture notes

The AI engine lives in the private sibling repo `neoxra-core`.

Useful docs:

- [docs/architecture.md](./docs/architecture.md)
- [docs/public-private-boundary.md](./docs/public-private-boundary.md)
- [docs/deployment.md](./docs/deployment.md)
- [docs/yc-metrics.sql](./docs/yc-metrics.sql)
- [backend/.env.example](./backend/.env.example)

## Current product surfaces

### Landing page

`/` is the main Neoxra landing page and product demo entrypoint.

It introduces the multi-platform workflow and links into the Instagram Studio.

### Generate All

`/generate` is the main multi-platform generation surface.

It supports:
- one idea input
- industry, goal, audience, and voice profile controls
- Planner → Instagram → SEO → Threads → Facebook progress
- four platform result tabs
- `Download All` ZIP export containing Instagram PNG slides, caption, SEO Markdown/HTML, Threads, and Facebook copy

### Instagram Studio

`/instagram` is the most polished product subpage today.

It supports:
- preset demo inputs
- live streaming generation states
- clear completion/error handling
- dark/light mode shared with the landing page
- a presentation-friendly results layout

## Quickstart

### Requirements

- Python 3.10+
- Node 20+
- Anthropic API key
- access to the private `neoxra-core` repo

### 1. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pip install ../neoxra-core
cp .env.example .env
uvicorn app.main:app --reload
```

Set at least:

```bash
ANTHROPIC_API_KEY=...
ANTHROPIC_MODEL=claude-haiku-4-5
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/neoxra
```

If you want the new durable data layer locally, run migrations before starting the API:

```bash
cd backend
alembic upgrade head
```

If you do not already have Postgres running locally, one quick option is:

```bash
docker run --name neoxra-postgres \
  -e POSTGRES_DB=neoxra \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  -d postgres:16
```

### 2. Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=
NEXT_PUBLIC_PLAUSIBLE_API_HOST=https://plausible.io
```

Then run:

```bash
npm run dev
```

Open:
- `http://localhost:3000/`
- `http://localhost:3000/generate`
- `http://localhost:3000/instagram`
- `http://localhost:3000/seo`
- `http://localhost:3000/threads`
- `http://localhost:3000/facebook`
- `http://localhost:3000/login`

## Demo walkthrough

For a quick local demo:

1. start the backend on `localhost:8000`
2. start the frontend on `localhost:3000`
3. open one of:
   - `/`
   - `/generate`
   - `/instagram`

For the strongest product walkthrough:

1. open `/generate`
2. select one of the preset scenarios
3. click `Generate All`
4. review all four tabs
5. click `下載全部 ZIP`
6. unzip the delivery package and confirm it includes:
   - `instagram/slide-01.png` through the final slide
   - `instagram/caption.txt`
   - `seo-article.md`
   - `seo-article.html`
   - `threads.txt`
   - `facebook.txt`

For backend demo readiness checks:

```bash
cd backend
python scripts/check_demo_readiness.py --base-url http://127.0.0.1:8000
```

## Environment

Backend envs are documented in [backend/.env.example](./backend/.env.example).

Most important variables:
- `ANTHROPIC_API_KEY`
- `ANTHROPIC_MODEL`
- `ENVIRONMENT`
- `LOG_LEVEL`
- `CORS_ALLOWED_ORIGINS`
- `DATABASE_URL`
- `FRONTEND_APP_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`

Frontend:
- `NEXT_PUBLIC_API_BASE_URL`

## Voice profiles

Voice profiles live in `backend/voice_profiles/`.

Current profiles:
- `default.yaml` — grounded founder/operator voice

To add a profile:

1. create `backend/voice_profiles/<profile_name>.yaml`
2. include `creator`, `voice`, `signature_moves`, and `content_rules`
3. add the profile key to any frontend selector or backend allowlist that should expose it
4. test with `/generate`

## Deployment

Current production backend deployment uses Render from `backend/` with:

- Root Directory: `backend`
- Build Command: `bash render-build.sh`
- Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

For the full deployment guide, Docker build option, and environment details:

- [docs/deployment.md](./docs/deployment.md)

## Architecture summary

Neoxra is intentionally split into two repos:

- `neoxra`
  product UI, API, deployment scripts, and app-facing integrations
- `neoxra-core`
  prompts, skills, structured models, and generation logic

At runtime:

- the frontend calls the FastAPI backend
- the backend imports and executes `neoxra-core`
- the backend validates and streams results back to the frontend

For the fuller architecture note:

- [docs/architecture.md](./docs/architecture.md)

## Production notes

The backend depends on the private `neoxra-core` package. A healthy production deploy must be able to import `neoxra_core`.

Useful checks:
- `GET /healthz`
- `GET /health/db`
- `GET /health/core`
- `GET /health/generation-metrics`

The backend now also returns `X-Request-ID` headers and logs request IDs plus pipeline stage transitions to make production debugging easier.
Growth instrumentation now records demo lifecycle and page analytics into `usage_events`, and Plausible can be enabled from frontend envs for page and conversion tracking.

## Notes

- `/` remains the main landing page
- `/instagram` is a product subpage, not the default route
- `neoxra-core` is required for meaningful backend runs

## License

[LICENSE](./LICENSE)
