# Contributing to Neoxra

Thanks for your interest in contributing to Neoxra.

This project is still early-stage, so the goal of this guide is simple: help new contributors get oriented quickly, make useful changes safely, and keep the product moving.

## Project Setup

Neoxra is split across two repos:

- `neoxra`
  frontend, backend, deployment scripts, and product-facing docs
- `neoxra-core`
  private AI engine with prompts, skills, and models

### Local setup

#### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pip install ../neoxra-core
cp .env.example .env
uvicorn app.main:app --reload
```

#### Frontend

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

Useful local URLs:

- `http://localhost:3000/`
- `http://localhost:3000/instagram`
- `http://localhost:3000/demo/legal`

## Branches

Please work on a branch instead of committing directly to `main`.

Common branch naming patterns:

- `feat/<short-description>`
- `fix/<short-description>`
- `chore/<short-description>`
- `docs/<short-description>`

Examples:

- `feat/bilingual-demo-ui`
- `fix/api-contract-validation`
- `docs/deployment-guide`

## Workflow: Issue First vs PR First

For small fixes, docs updates, or focused improvements, opening a PR directly is fine.

For larger work, product changes, or architecture-affecting changes, please start with:

- an issue
- or a short design note / discussion in the PR description

As a rule of thumb:

- PR-first is fine for straightforward fixes
- issue-first is better for ambiguous or cross-cutting changes

## Commit and PR Expectations

Keep changes focused and easy to review.

Good practices:

- one clear purpose per PR
- descriptive branch names
- descriptive commit messages
- explain product impact, not just code changes

Helpful commit examples:

- `Fix SSE completion handling and clean API schema`
- `Add locale-aware generation support for demo APIs`
- `Improve deployment docs and onboarding`

PRs should usually include:

- what changed
- why it changed
- what was tested
- any deploy or environment impact

If a change affects demo flows, mention:

- `/`
- `/instagram`
- `/demo/legal`
- backend endpoints affected

## Code Style Expectations

Keep code simple, explicit, and easy to change.

General expectations:

- prefer small, readable changes over broad refactors
- keep frontend consistent with the existing design system and theme behavior
- keep backend behavior explicit and production-safe
- avoid introducing heavy abstractions unless there is a clear need
- remove outdated Orchestra naming when you see it

Documentation expectations:

- keep docs aligned with actual behavior
- avoid writing speculative architecture
- prefer practical setup and deployment instructions

## Testing Expectations

Testing should be proportional to the change.

### Backend

Run relevant tests when changing backend behavior:

```bash
python -m pytest backend/tests/test_app_smoke.py
python -m pytest backend/tests/test_instagram_request.py
python -m pytest backend/tests/test_instagram_route.py
```

If you change API contracts, output validation, or streaming behavior, run the relevant backend test files.

### Frontend

Run the relevant frontend tests when changing UI or demo flow behavior:

```bash
cd frontend
npm test -- --runInBand __tests__/instagram-page.test.tsx __tests__/InstagramForm.test.tsx
npm run build
```

If you cannot run a test, say so clearly in the PR.

## Product and Architecture Changes

If you want to propose a bigger change to product flow, system boundaries, or deployment:

1. explain the current pain point
2. explain the proposed change
3. describe tradeoffs
4. keep the proposal grounded in the current repo structure

Good candidates for early discussion:

- frontend/backend contract changes
- changes to streaming lifecycle
- deployment or build strategy changes
- `neoxra` / `neoxra-core` responsibility shifts

## Demo-First Mindset

Neoxra is still early and demo-driven.

When making product-facing changes, prioritize:

- reliability
- clarity
- presentation quality
- predictable demo behavior

That usually matters more than perfect abstraction.

## Questions

If something is unclear, open an issue or explain your assumption clearly in the PR.
