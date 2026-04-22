# CLAUDE.md

This file provides guidance to Claude Code when working in this repository.

## Project Overview

Neoxra is an AI content engine that transforms one idea into platform-native content for Instagram, SEO Articles, Threads, and Facebook.

The system is centered around a structured **Brief** object:
- A Planner agent turns a raw idea into a structured brief
- Platform agents use the brief to generate native content
- A Critic agent reviews all outputs against the creator's brand voice

The public `neoxra` repo is the product shell. Private generation logic lives behind the `core_client` abstraction and the private `neoxra-core` package.

## Current Goal

Keep the demo surfaces reliable enough for founder, YC, and early customer conversations:
1. `/generate` — one idea, four platform outputs, downloadable client package
2. `/instagram` — Instagram Studio with visual carousel renderer and export
3. `/seo`, `/threads`, `/facebook` — focused single-platform studios
4. `/demo/legal` — law-firm vertical sales page

## Development Priorities

Priority order:
1. Demo safety and reliability
2. Clear product UX over engineering dashboards
3. Open-core boundaries through `backend/app/core_client`
4. Durable usage and growth instrumentation
5. Small, incremental auth/tenant foundations

Do not overengineer early versions.

## Repository Structure

neoxra/
├── backend/
│   ├── app/
│   │   ├── agents/
│   │   ├── api/
│   │   ├── app_layer/
│   │   └── core/
│   ├── scripts/
│   ├── tests/
│   └── voice_profiles/
├── frontend/
├── docs/
├── .env
└── README.md

## Core Architecture

### Brief Object
The Brief is the central object for a generation run.

It should contain:
- original idea
- core angle
- target audience
- tone
- per-platform notes

### Product Orchestration

Planner → creates Brief  
Instagram / SEO / Threads → generate in parallel  
Facebook → adapts from Instagram output  
Critic/retry logic → keeps legacy agent JSON output stable

## Brand Voice

Defined in `backend/voice_profiles/`.

Current profiles:
- `default.yaml`
- `law_firm.yaml`

## Tech Stack

- Claude API
- Python
- FastAPI
- Next.js
- Postgres + Alembic
- YAML voice profiles

Avoid heavy frameworks.

## Coding Guidelines

- Keep code simple
- One agent per file
- Minimal dependencies
- Focus on working demo

## Commands

Backend:

```bash
cd backend
uvicorn app.main:app --reload
python -m pytest backend/tests/test_unified_route.py
```

Frontend:

```bash
cd frontend
npm run dev
npm run build
```

Demo:

```text
/generate
/instagram
/seo
/threads
/facebook
/demo/legal
```

## Notes

Keep the public shell practical and disciplined. Do not move private prompts or business logic from `neoxra-core` into this repo unless the boundary doc explicitly allows it.
