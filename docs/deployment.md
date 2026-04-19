# Deployment Guide

This guide documents the current practical deployment path for Neoxra.

## Production Services

- frontend: `https://neoxra.com`
- backend: `https://api.neoxra.com`

Current production host:

- frontend hosted separately from this guide
- backend deployed on Render from `neoxra/backend`

## Backend Deployment Options

There are currently two realistic deployment paths for the backend:

1. Render using `render-build.sh`
2. Docker build using `backend/Dockerfile`

Render is the current production path. The Dockerfile exists to make local and future container-based deploys reproducible.

## Render Deployment

### Required Render Settings

- Root Directory: `backend`
- Build Command: `bash render-build.sh`
- Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### Required Environment Variables

- `ANTHROPIC_API_KEY`
- `ANTHROPIC_MODEL`
- `GITHUB_TOKEN`

### Recommended Environment Variables

- `ENVIRONMENT=production`
- `LOG_LEVEL=info`
- `CORS_ALLOWED_ORIGINS=https://neoxra.com,https://www.neoxra.com,http://localhost:3000`
- `NEOXRA_CORE_GIT_URL=https://github.com/Meridian-Global/neoxra-core.git`
- `NEOXRA_CORE_GIT_REF=main`

### What The Build Does

`backend/render-build.sh`:

- installs Python dependencies from `requirements.txt`
- installs `neoxra-core` from Git
- verifies `neoxra_core` import
- verifies deeper imports
- runs the local diagnostics script before startup

## Docker Build

The backend also includes a Dockerfile for reproducible builds.

### Build Example

From the repo root:

```bash
docker build \
  -f backend/Dockerfile \
  -t neoxra-backend \
  --build-arg NEOXRA_CORE_GIT_URL=https://github.com/Meridian-Global/neoxra-core.git \
  --build-arg NEOXRA_CORE_GIT_REF=main \
  --build-arg GITHUB_TOKEN=$GITHUB_TOKEN \
  backend
```

### Run Example

```bash
docker run --rm -p 8000:8000 \
  -e ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY \
  -e ANTHROPIC_MODEL=claude-haiku-4-5 \
  -e ENVIRONMENT=production \
  -e LOG_LEVEL=info \
  neoxra-backend
```

## Demo Readiness Checks

Before a live demo, verify:

```bash
cd backend
python scripts/check_demo_readiness.py --base-url https://api.neoxra.com
```

Useful health endpoints:

- `GET /healthz`
- `GET /health/core`
- `GET /health/generation-metrics`

## Manual Local Full-Stack Flow

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

## When `neoxra-core` Changes

If prompt quality or generation behavior changes in `neoxra-core` without changing the output contract:

- `neoxra` usually does not need code changes
- backend should be rebuilt or redeployed so the new `neoxra-core` version is installed

If `neoxra-core` changes output schema or import paths:

- update backend contract handling in `neoxra`
- rerun backend tests before deploy
