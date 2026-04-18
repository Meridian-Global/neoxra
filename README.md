# Neoxra

Neoxra is Meridian Global's app-layer content generation platform.

It combines:
- a FastAPI backend
- a standalone Next.js demo frontend
- streaming content-generation routes
- app-layer integrations like LinkedIn publishing and Gmail idea scanning

The shared AI logic itself lives in the private sibling repo `neoxra-core`. This repo is the surface you run locally: API, demo UI, integration wiring, voice profiles, and developer workflow.

## What you can do today

### Multi-platform content pipeline

`POST /api/run` turns one idea into coordinated Instagram, Threads, and LinkedIn drafts using a streamed multi-agent workflow:

planner → platform passes → critic → final output

### Standalone Instagram generator

`POST /api/instagram/generate` runs a focused Instagram flow:

style analysis → content generation → scoring → final Instagram result

The frontend currently exposes both flows:

- `/` for the original multi-platform pipeline
- `/instagram` for the standalone Instagram generator

## Why this repo exists

This repo is where the product surface lives.

It owns:
- FastAPI routes and SSE streaming responses
- the standalone frontend demo
- local voice profiles
- integration endpoints
- local testing and smoke-test workflows

It does not own the full AI engine. Shared models, skills, prompts, and LLM provider logic live in `neoxra-core`.

## Repo layout

- `frontend/` contains the Next.js demo app
- `backend/` contains the FastAPI app, Python tests, scripts, and voice profiles

## Quickstart

### Requirements

- Python 3.10+
- Node 20+ recommended
- Anthropic API key
- local access to the private `neoxra-core` repo

### 1. Backend setup

From the repo root:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pip install ../neoxra-core
cp .env.example .env
```

Set at least:

```bash
ANTHROPIC_API_KEY=...
ANTHROPIC_MODEL=claude-haiku-4-5
```

Then confirm the shared package is importable:

```bash
cd backend
python -c "import neoxra_core; print('neoxra_core import ok')"
```

If you're actively editing the sibling core repo and want live editable behavior:

```bash
cd backend
pip install -e ../neoxra-core
```

### 2. Start the API

```bash
cd backend
uvicorn app.main:app --reload
```

### 3. Start the frontend

In another terminal:

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

Then run:

```bash
npm run dev
```

Open:

- `http://localhost:3000/`
- `http://localhost:3000/instagram`

## Local smoke tests

### Multi-platform pipeline

```bash
curl -N -X POST http://localhost:8000/api/run \
  -H "Content-Type: application/json" \
  -d '{"idea": "why small teams should document decisions", "voice_profile": "default"}'
```

### Instagram flow

```bash
curl -N -X POST http://localhost:8000/api/instagram/generate \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "How AI tools help small teams ship faster",
    "template_text": "Hook first, short paragraphs, practical tone, clear CTA",
    "goal": "engagement"
  }'
```

Expected Instagram SSE sequence:

- `style_analysis_started`
- `style_analysis_completed`
- `generation_started`
- `generation_completed`
- `scoring_started`
- `scoring_completed`
- `pipeline_completed`

If a stage fails, the route emits a structured SSE error instead of just dropping the connection:

```text
event: error
data: {"stage":"generation","message":"..."}
```

## Frontend behavior

### `/`

The root page demos the original Neoxra pipeline and streams the multi-agent sequence live.

### `/instagram`

The Instagram page is a dedicated creator-facing flow that progressively renders:

- style analysis
- generated Instagram content
- scorecard
- carousel deck / critique

This is currently the most actively evolving surface in the repo.

## API overview

### Core content routes

- `POST /api/run`
- `POST /api/instagram/generate`

### App-layer integration routes

- `POST /api/publish/linkedin`
- `GET /api/ideas/scan`

### Notes

- `/api/run` is the original multi-agent pipeline surface
- `/api/instagram/generate` is the newer Instagram-first standalone flow
- integration routes are conveniences owned by this repo, not the core engine contract

Additional references:

- [CORE_API.md](./CORE_API.md)
- [docs/design-instagram-flow.md](./docs/design-instagram-flow.md)
- [docs/tasks-instagram-flow.md](./docs/tasks-instagram-flow.md)
- [frontend/STANDALONE.md](./frontend/STANDALONE.md)

## Testing

### Backend

Main backend checks:

```bash
cd backend
pytest tests/test_app_smoke.py tests/test_route_boundaries.py tests/test_import_paths.py
```

Instagram-specific backend tests:

```bash
cd backend
pytest tests/test_instagram_request.py tests/test_instagram_route.py tests/test_instagram_contract.py
```

If you're using a sibling checkout rather than an installed package:

```bash
cd backend
PYTHONPATH=../neoxra-core pytest tests/test_instagram_request.py tests/test_instagram_route.py tests/test_instagram_contract.py
```

If you want to validate the backend the same way production installs it, use a fresh venv and a non-editable install:

```bash
cd backend
python -m venv .venv.prod
source .venv.prod/bin/activate
pip install -r requirements.txt
pip install ../neoxra-core
python -c "import neoxra_core; print('ok')"
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

### Frontend

```bash
cd frontend
npm test -- --runInBand
```

Production build check:

```bash
cd frontend
npm run build
```

## Repo boundary

| Layer | Lives in | Owned here? |
| --- | --- | --- |
| FastAPI app and route wiring | `backend/app/` | Yes |
| Standalone frontend demo | `frontend/` | Yes |
| App-layer integrations | `backend/app/app_layer/integrations/` | Yes |
| Voice profiles | `backend/voice_profiles/` | Yes |
| Shared models, skills, LLM provider wrapper | `../neoxra-core` | No |

Most important runtime check:

```bash
cd backend
python -c "import neoxra_core; print('ok')"
```

If that fails, this repo will not run correctly.

## Environment

### Required

- `ANTHROPIC_API_KEY`
- `ANTHROPIC_MODEL` recommended

### Frontend

- `NEXT_PUBLIC_API_BASE_URL` in `frontend/.env.local`

### Render backend deploy

Render only checks out this repo, not the sibling `../neoxra-core` directory. That means a build that only runs `pip install -r requirements.txt` will succeed, but `POST /api/run` will later fail at runtime because the backend lazily imports `neoxra_core` on request and the package was never installed.

Use these settings for the backend service:

- Root Directory: `backend`
- Build Command: `./render-build.sh`
- Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

Required Render environment variables:

- `ANTHROPIC_API_KEY`
- `ANTHROPIC_MODEL`
- `GITHUB_TOKEN`

`GITHUB_TOKEN` must be a GitHub token with read access to the private `Meridian-Global/orchestra-core` repository because the build installs:

```text
neoxra-core @ git+https://x-access-token:${GITHUB_TOKEN}@github.com/Meridian-Global/orchestra-core.git@main
```

After setting the token and switching the build command to `./render-build.sh`, a redeploy is enough. The script also runs `python -c "import neoxra_core"` during build, so Render will fail the deploy immediately if the core package was not installed correctly.

### Optional integration credentials

- `LINKEDIN_ACCESS_TOKEN`
- `LINKEDIN_PERSON_URN`

Some integration workflows may also need:

```bash
cd backend
pip install -r requirements-integrations.txt
```

## Voice profiles

Voice profiles live in:

```text
backend/voice_profiles/
```

Default:

```text
backend/voice_profiles/default.yaml
```

The multi-platform pipeline uses these profiles directly. The Instagram standalone request model currently accepts `voice_profile` for forward compatibility, but the present route implementation does not yet actively apply it in the flow.

## Project structure

```text
.
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── agents/
│   │   ├── core/
│   │   ├── app_layer/
│   │   │   └── integrations/
│   │   └── main.py
│   ├── scripts/
│   ├── tests/
│   └── voice_profiles/
├── frontend/
│   ├── app/
│   ├── components/
│   ├── lib/
│   └── __tests__/
├── docs/
├── CORE_API.md
└── README.md
```

## Notes on project maturity

- This repo is evolving quickly
- `neoxra-core` is required for meaningful backend runs
- `/api/run` and `/api/instagram/generate` coexist because they serve different product surfaces
- some docs describe target-state behavior before implementation fully catches up

## License

[LICENSE](./LICENSE)
