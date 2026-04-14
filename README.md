# Orchestra

**A multi-agent content engine. One idea in, platform-native content out — via a structured agent pipeline you can build on.**

Orchestra is a backend orchestration layer, not a finished product. It coordinates a team of specialized AI agents that produce content for Instagram, Threads, and LinkedIn from a single input, streaming each step as Server-Sent Events.

The frontend demo and current integrations (Gmail, LinkedIn publisher) are app-layer code that demonstrate one way to consume the engine. Future applications — a LinkedIn Chrome Extension, CLI tools, automation workflows — are separate surfaces that call the same core.

The AI model layer is currently being extracted into a separate private repository, `orchestra-core`. This repo now depends on that package for shared models and voice-loading helpers while continuing to own the FastAPI app, route wiring, app-layer integrations, and demo surfaces.

Built by [Meridian Global](https://github.com/MeridianGlobal).

---

## How it works

Every run goes through the same pipeline:

1. **Planner** reads the idea and a voice profile YAML, produces a structured `Brief` — tone, audience, core angle, per-platform notes
2. **Platform agents** (Instagram, Threads, LinkedIn) each write for their medium using the Brief, reading each other's first-pass drafts before finalizing
3. **Critic** reviews all three drafts against the voice profile, rewrites weak spots, and returns improved versions

The orchestrator streams each agent step as an SSE event. The caller receives outputs in real time with no polling.

---

## Why it is different

Most AI content tools run the same model with different prompts. Orchestra is structured differently at two levels.

**The Brief is the backbone.** The Planner produces a structured dataclass — not free-form text — and every downstream agent reads from it. Agents are not responding to the original prompt; they are working from a shared strategic interpretation of it.

**Agents react to each other.** Platform agents complete a first pass, then read each other's output before their second pass. The Critic reads all three simultaneously. This is a two-pass coordination loop, not three independent calls.

---

## Architecture

```
              [your app]
                  |
          POST /api/run
          { idea, voice_profile }
                  |
           ┌──────▼──────┐
           │   Orchestra │
           │   (engine)  │
           └──────┬──────┘
Planner → Platform Agents → Critic
(all streamed as SSE to caller)
```

**Repo boundary:**

| Layer                      | Location                                     | Stable               |
| -------------------------- | -------------------------------------------- | -------------------- |
| Core agents + orchestrator | `orchestra/backend/agents/`, `backend/core/` | Transitional         |
| Shared AI model layer      | `orchestra-core` (private repo)              | Yes                  |
| Core API contract          | `POST /api/run`                              | Yes                  |
| Voice profiles             | `orchestra/voice_profiles/`                  | Yes                  |
| App-layer routes           | `backend/api/integrations_routes.py`         | No — app concern     |
| App-layer integrations     | `backend/app_layer/integrations/`            | No — app concern     |
| Frontend demo              | `frontend/`                                  | No — standalone demo |

Future apps call `POST /api/run` and own their own source and publish logic. The core engine does not need to change.

---

## Core API

The engine's stable contract is a single endpoint.

**Request:**

```json
POST /api/run
Content-Type: application/json

{
  "idea": "Your idea here",
  "voice_profile": "default"
}
```

**Response:** `Content-Type: text/event-stream`

Each SSE message has the shape:

```
event: <event_name>
data: <json_payload>
```

The pipeline emits 17 events in order, from `planner_started` through `pipeline_completed`. The final `pipeline_completed` event contains all platform outputs and critic notes in a single payload.

Full event sequence, payload shapes, and data model schemas: see [`CORE_API.md`](./CORE_API.md).

The integration routes (`POST /api/publish/linkedin`, `GET /api/ideas/scan`) live separately in `integrations_routes.py` and are not part of the stable core contract.

---

## Quickstart

**Requirements:** Python 3.10+ (3.11+ recommended), an Anthropic API key

```bash
git clone https://github.com/MeridianGlobal/orchestra.git
cd orchestra

python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Required during the current extraction phase:
# install the private orchestra-core package into this env
pip install -e ../orchestra-core

cp env.example .env
# add your ANTHROPIC_API_KEY to .env

# Edit your voice profile before the first run
nano orchestra/voice_profiles/default.yaml

# CLI — runs the full pipeline in the terminal
python orchestra/examples/run_cli.py "your idea here"

# API server
uvicorn orchestra.backend.main:app --reload
```

Test the engine directly:

```bash
curl -N -X POST http://localhost:8000/api/run \
  -H "Content-Type: application/json" \
  -d '{"idea": "why small teams should document decisions", "voice_profile": "default"}'
```

**Optional — app-layer integration dependencies** (Gmail scanner, LinkedIn publisher):

```bash
pip install -r requirements-integrations.txt
```

If you keep `orchestra-core` in a different location, install it however your environment expects. The important part is that `import orchestra_core` succeeds before you run the API or tests.

**Frontend demo** — see [`frontend/STANDALONE.md`](./frontend/STANDALONE.md) for full details:

```bash
cd frontend && npm install && npm run dev
# Configure NEXT_PUBLIC_API_BASE in frontend/.env.local
```

---

## Project structure

```
.
├── orchestra/                         # Python package
│   ├── backend/
│   │   ├── agents/                    # One file per agent — easy to extend
│   │   │   ├── base.py
│   │   │   ├── planner.py
│   │   │   ├── instagram.py
│   │   │   ├── threads.py
│   │   │   ├── linkedin.py
│   │   │   └── critic.py
│   │   ├── core/                      # Engine internals
│   │   │   ├── brief.py               # Thin re-export / compatibility layer
│   │   │   ├── context.py             # Thin re-export / compatibility layer
│   │   │   ├── orchestrator.py        # Pipeline runner + SSE event emitter
│   │   │   └── voice_store.py         # Wrapper around orchestra-core voice loader
│   │   ├── api/
│   │   │   ├── routes.py              # Core: POST /api/run
│   │   │   └── integrations_routes.py # App-layer: publish + scan routes
│   │   ├── app_layer/
│   │   │   └── integrations/          # App-layer only — not part of core
│   │   │       ├── gmail_scanner.py
│   │   │       └── linkedin_publisher.py
│   │   └── main.py
│   ├── voice_profiles/
│   │   └── default.yaml               # Edit before first run
│   └── examples/
│       ├── run_cli.py                  # Full pipeline, terminal output
│       └── gmail_auth.py              # OAuth setup for Gmail scanner
├── frontend/                           # Standalone Next.js demo
├── tests/
│   ├── conftest.py
│   ├── test_app_smoke.py              # Route wiring + monkeypatched integration tests
│   ├── test_route_boundaries.py       # Core / app-layer boundary enforcement
│   └── test_import_paths.py           # Import path correctness
├── scripts/
│   └── smoke_test_routes.sh           # Manual route check against live server
├── CORE_API.md                         # Full API contract
├── requirements.txt                    # Core dependencies
└── requirements-integrations.txt      # App-layer dependencies (Gmail, LinkedIn)
```

Related repo:

- `orchestra-core` (private) — shared models, prompts, and AI-layer logic under extraction

---

## Testing

Install the dependencies needed for the surface you want to test, then run the suite.

```bash
pip install -r requirements.txt
pip install -r requirements-integrations.txt
pip install -e ../orchestra-core
pytest tests/test_app_smoke.py tests/test_route_boundaries.py tests/test_import_paths.py -q
```

The suite covers:

- **Route wiring** — all routes reachable, correct status codes, correct content types
- **Boundary enforcement** — core `routes.py` does not expose integration symbols; old `backend.integrations` path is gone
- **Import correctness** — `app_layer.integrations` is the canonical integration location
- **Monkeypatched integration tests** — LinkedIn publish and Gmail scan routes tested without real API calls

Manual route smoke check against a running server:

```bash
uvicorn orchestra.backend.main:app --reload
sh scripts/smoke_test_routes.sh
```

If `pytest` fails with `ModuleNotFoundError: orchestra_core`, it means the current virtualenv does not yet have the private `orchestra-core` package installed.

---

## Voice profile

`orchestra/voice_profiles/default.yaml` is how the engine learns to write like you. The Planner reads it on every run; the Critic uses it to flag off-brand output.

```yaml
creator:
  name: "Your name"
  archetype: "How you'd describe yourself in one line"

voice:
  adjectives: ["direct", "grounded", "specific"]
  not: ["corporate", "hustle-bro", "preachy"]

signature_moves:
  - "Lead with a specific observation, not a general claim"
  - "End with a question or next step, not a lesson"

content_rules:
  max_emojis: 2
  hashtag_style: "3-5 specific, never generic"
  cta_style: "implicit"
  avoid_phrases:
    - "game changer"
    - "here's the thing"
```

To use a custom profile, pass `"voice_profile": "your_profile_name"` in the request. The engine loads `voice_profiles/your_profile_name.yaml`.

---

## Adding a platform agent

1. Create `orchestra/backend/agents/your_platform.py`
2. Subclass `BaseAgent`, implement `build_prompt()` and `run()`
3. Register in `orchestrator.py`

One file. No framework. `Brief` and `AgentContext` are already there.

---

## Environment variables

```bash
# Required
ANTHROPIC_API_KEY=sk-ant-...

# Optional — model override
ANTHROPIC_MODEL=claude-haiku-4-5

# App-layer: LinkedIn publisher
LINKEDIN_ACCESS_TOKEN=your_token
LINKEDIN_PERSON_URN=urn:li:person:your_id

# App-layer: Gmail scanner
GOOGLE_CREDENTIALS_PATH=credentials.json
GOOGLE_TOKEN_PATH=token.json
```

---

## Tech stack

| Layer                  | Choice                      |
| ---------------------- | --------------------------- |
| LLM                    | Claude (Anthropic)                    |
| Shared AI layer        | `orchestra-core` (private package)    |
| Backend                | Python + FastAPI                      |
| Streaming              | Server-Sent Events                    |
| Voice config           | YAML                                  |
| Frontend demo          | Next.js 15                            |
| App-layer integrations | Gmail API, LinkedIn UGC API           |

No LangChain. No vector databases. No external queue. The core engine runs entirely local except for the Claude API call.

---

## Roadmap

**Core engine**

- [x] Planner → platform agents → critic pipeline
- [x] Two-pass refinement (agents read each other's output)
- [x] Brand voice YAML loaded per-run
- [x] FastAPI + SSE streaming (`POST /api/run`)
- [x] Core / app-layer separation (routes, integrations, requirements)
- [ ] Agent memory — retain voice and editorial context across runs
- [ ] Human-in-the-loop — pause the pipeline for review between passes
- [ ] Configurable pipeline — selectively enable agents per run

**App surfaces** _(separate repos, built on the engine)_

- [ ] LinkedIn Chrome Extension — capture idea in browser, receive content, publish inline
- [ ] CLI tool — lightweight personal wrapper around `POST /api/run`
- [ ] Webhook receiver — trigger pipeline from Notion, email, or other input sources

**System evolution**

- [ ] Per-run feedback — Critic scores inform future Planner behavior
- [ ] Multi-voice support — swap profiles per surface or per platform
- [ ] Output format extensions — newsletter, YouTube description, Reddit

---

## License

MIT — use it, fork it, build on top of it.

---

_Orchestra is a product of [Meridian Global](https://github.com/MeridianGlobal)._
