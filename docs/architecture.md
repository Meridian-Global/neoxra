# Neoxra Architecture

This document describes the current Neoxra system as it exists today. It is intentionally practical and lightweight.

## Repos

Neoxra is split across two repos:

- `neoxra`
  The product surface. This repo contains the web app, API, deployment scripts, local tests, and product-facing docs.
- `neoxra-core`
  The private AI engine. This repo contains prompts, skills, models, and generation logic used by the backend.

For the explicit public/private repo rules, see:

- [docs/public-private-boundary.md](./public-private-boundary.md)

## How The Repos Relate

`neoxra` does not reimplement generation logic. Instead, the backend installs `neoxra-core` as a Python package and calls into it at runtime.

That means:

- product UI and API changes usually happen in `neoxra`
- prompt and model behavior changes usually happen in `neoxra-core`
- backend deploys must install a compatible `neoxra-core` version

## Responsibilities By Layer

### Frontend (`frontend/`)

The frontend is a Next.js app that provides:

- the landing page at `/`
- the Instagram Studio at `/instagram`
- the legal demo flow at `/demo/legal`
- shared theme, language toggle, and presentation UI

The frontend talks to the backend through public HTTP endpoints and renders streamed SSE responses.

### Backend (`backend/`)

The backend is a FastAPI app that provides:

- `POST /api/run`
  multi-platform content generation over SSE
- `POST /api/instagram/generate`
  Instagram-specific generation over SSE
- health and diagnostics routes such as:
  - `/healthz`
  - `/health/core`
  - `/health/generation-metrics`

The backend is responsible for:

- request validation
- SSE event streaming
- output validation before returning AI output to the UI
- lightweight request, pipeline, and metrics logging
- demo-readiness scripts and deployment helpers

### Core AI Package (`neoxra-core`)

`neoxra-core` contains the AI-specific logic:

- prompt templates
- skill implementations
- generation flows
- structured output models
- prompt repair logic

The backend imports this package and adapts its outputs into the public API contract.

## Runtime Flow

### `/api/run`

1. frontend sends an idea to the backend
2. backend validates the request
3. backend calls the core pipeline
4. backend streams product-safe lifecycle events over SSE
5. frontend updates the UI progressively from product-level events and treats `pipeline_completed` as the final success signal

The public SSE contract is intentionally product-facing. The backend may use richer internal orchestration events, but the public stream should expose product-level phases rather than internal architecture details where possible.

### `/api/instagram/generate`

1. frontend sends topic, template, goal, and locale
2. backend validates the request
3. backend runs:
   - style analysis
   - Instagram generation
   - content scoring
4. backend validates the generated payload shape
5. backend streams the result back over SSE using product-level events such as `phase_started`, `style_ready`, `content_ready`, `score_ready`, and `pipeline_completed`

## Deployment Shape Today

Current production setup:

- frontend: `https://neoxra.com`
- backend: `https://api.neoxra.com`
- backend host: Render
- `neoxra-core` is installed into the backend runtime during build

## Observability

The backend currently includes lightweight observability:

- request IDs
- structured pipeline lifecycle logs
- stage timing logs
- generation success/failure counters
- health endpoints for core import status and generation metrics

This is designed for practical debugging in Render logs, not a full observability stack.

## What Is Deliberately Not Split Yet

Today there is no separate deployed `neoxra-core` service.

That is intentional. The current system keeps:

- frontend as one app
- backend as one API
- core AI as one installed package

This keeps the system simpler for demos, early iteration, and small-team operation.

## Boundary Reminder

The public repo owns:

- product shell code
- public API contracts
- safe public SSE semantics
- deployment and demo config

The private repo owns:

- prompts
- skills
- generation heuristics
- private orchestration logic
