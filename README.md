# Neoxra

Neoxra helps small teams turn one strong idea into polished, platform-native content they can ship immediately.

Today the product focuses on two demo-ready experiences:
- a multi-platform content workflow that generates coordinated LinkedIn, Instagram, and Threads output
- a dedicated Instagram Studio that analyzes style, generates a post system, scores it, and streams the result live

## Live demo

- Frontend: https://neoxra.com/
- Backend: https://api.neoxra.com/
- Instagram Studio: https://neoxra.com/instagram

## What the product does

Neoxra is built for founders, operators, and small teams who have ideas worth distributing but do not want to manually rewrite the same message for every platform.

The current product flow is:

1. Start with a topic or content angle
2. Generate live streamed output
3. Review platform-ready drafts and structure
4. Walk away with content that is easier to publish, refine, or demo

## Current product surfaces

### Landing page

`/` is the main Neoxra landing page and product demo entrypoint.

It introduces the multi-platform workflow and links into the Instagram Studio.

### Instagram Studio

`/instagram` is the most polished product subpage today.

It supports:
- preset demo inputs
- live streaming generation states
- clear completion/error handling
- dark/light mode shared with the landing page
- a presentation-friendly results layout

## Why this repo exists

This repo contains the product surface:
- Next.js frontend
- FastAPI backend
- SSE streaming routes
- app-layer integrations
- local voice profiles

The shared AI engine lives in the private sibling package `neoxra-core`.

## Quickstart

### Requirements

- Python 3.10+
- Node 20+
- Anthropic API key
- access to the private `neoxra-core` repo

### Backend

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
```

### Frontend

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

## Environment

Backend envs are documented in [backend/.env.example](./backend/.env.example).

Most important variables:
- `ANTHROPIC_API_KEY`
- `ANTHROPIC_MODEL`
- `ENVIRONMENT`
- `LOG_LEVEL`
- `CORS_ALLOWED_ORIGINS`

Frontend:
- `NEXT_PUBLIC_API_BASE_URL`

## Production notes

The backend depends on the private `neoxra-core` package. A healthy production deploy must be able to import `neoxra_core`.

Useful checks:
- `GET /healthz`
- `GET /health/core`

The backend now also returns `X-Request-ID` headers and logs request IDs plus pipeline stage transitions to make production debugging easier.

## Repo layout

- `frontend/` — Next.js app
- `backend/` — FastAPI app, tests, scripts, voice profiles
- `docs/` — design and implementation notes

## Notes

- `/` remains the main landing page
- `/instagram` is a product subpage, not the default route
- `neoxra-core` is required for meaningful backend runs

## License

[LICENSE](./LICENSE)
