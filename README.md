# Orchestra

**Multi-agent content system for creators who publish across platforms.**

Orchestra takes a single idea and runs it through a coordinated team of AI agents — a planner, three platform writers, and a brand critic — each with a distinct role and job. The result is platform-native content for Instagram, Threads, and LinkedIn, along with a visible log of how the agents collaborated to get there.

Built by [Meridian Global](https://github.com/MeridianGlobal).

---

## What it does

You type one idea. Orchestra handles the rest:

1. **Strategic Brain (Planner)** reads your idea and your voice profile, then produces a structured brief — tone, audience, core angle, per-platform notes
2. **Platform agents** (Visual Storyteller, Narrative Builder, Professional Framer) each write natively for their medium, reading each other's output before finalizing
3. **Quality Judge (Critic)** reviews all three drafts against your brand voice, rewrites weak spots, and flags anything off-brand
4. **You** review the final outputs and copy to publish

---

## Why it's different

Most "AI content tools" call the same model three times with different format instructions. Orchestra doesn't do that.

The system is built around a **Brief object** — a structured dict that the Planner produces and every downstream agent reads from. Agents don't just see the original prompt; they see what other agents wrote and react to it. The Critic reads all three drafts simultaneously.

This makes the outputs genuinely different from each other, and the interaction log genuinely interesting to read.

---

## Demo

> GIF coming — [watch this repo](https://github.com/MeridianGlobal/orchestra)

---

## Project structure

```
.
├── orchestra/                   ← Python package
│   ├── backend/
│   │   ├── agents/              # One file per agent — easy to extend
│   │   │   ├── base.py
│   │   │   ├── planner.py
│   │   │   ├── instagram.py
│   │   │   ├── threads.py
│   │   │   ├── linkedin.py
│   │   │   └── critic.py
│   │   ├── core/
│   │   │   ├── brief.py         # The Brief dataclass — system spine
│   │   │   ├── orchestrator.py  # Pipeline runner + SSE event generator
│   │   │   └── voice_store.py   # Load brand voice YAML
│   │   ├── api/
│   │   │   └── routes.py        # POST /api/run — SSE streaming endpoint
│   │   ├── voice/
│   │   │   └── default.yaml     # Your brand voice — edit this first
│   │   └── main.py
│   └── examples/
│       └── run_cli.py           # Run the full pipeline in terminal
├── frontend/                    # Next.js 14 app router
│   ├── app/
│   │   ├── page.tsx             # Main page — input, timeline, final outputs
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   └── StreamCard.tsx       # Live agent output card with reveal animation
│   └── lib/
│       └── sse.ts               # SSE parser (fetch + ReadableStream)
├── requirements.txt
└── env.example
```

---

## Quickstart

**Requirements:** Python 3.11+, Node 18+, an Anthropic API key

```bash
# Clone
git clone https://github.com/MeridianGlobal/orchestra.git
cd orchestra

# Backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp env.example .env        # add your ANTHROPIC_API_KEY

# Edit your voice profile before your first run
nano orchestra/backend/voice/default.yaml

# CLI demo (run from repo root)
python orchestra/examples/run_cli.py "your idea here"

# Start API server (run from repo root)
uvicorn orchestra.backend.main:app --reload

# Frontend (separate terminal)
cd frontend
npm install && npm run dev
```

Open [localhost:3000](http://localhost:3000).

The API and frontend can also run independently. The frontend connects to the backend at `http://localhost:8000` by default — change this in `frontend/.env.local`.

---

## Environment variables

```bash
# Required
ANTHROPIC_API_KEY=sk-ant-...

# Optional — defaults to claude-haiku-4-5 if not set
ANTHROPIC_MODEL=claude-haiku-4-5
```

---

## Your brand voice

`orchestra/backend/voice/default.yaml` is where Orchestra learns who you are. Edit it before your first run:

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

The Planner reads this on every run. The Critic uses it to flag off-brand language. The more specific you make it, the better the output.

---

## Adding a new platform agent

1. Create `orchestra/backend/agents/your_platform.py`
2. Subclass `BaseAgent`, implement `build_prompt()` and `run()`
3. Register in `orchestrator.py`

That's it. One file, no framework to learn.

---

## Tech stack

| Layer        | Choice                              |
| ------------ | ----------------------------------- |
| LLM          | Claude (Anthropic)                  |
| Backend      | Python + FastAPI                    |
| Streaming    | Server-Sent Events                  |
| Frontend     | Next.js 14 (app router, custom CSS) |
| Voice config | YAML                                |

No LangChain. No vector databases. No Tailwind. No external queue. Runs entirely local except for the API call.

---

## Roadmap

- [x] Core pipeline (planner → agents → critic)
- [x] Two-pass refinement (agents read each other's output)
- [x] Brand voice YAML
- [x] FastAPI + SSE streaming endpoint
- [x] Next.js frontend with live streaming cards
- [ ] Inline edit before publish
- [ ] Export interaction log as image
- [ ] Optional scheduling (APScheduler)
- [ ] Platform publishing via APIs (Instagram Graph, LinkedIn API)

---

## Contributing

The best contribution is a new agent. If you add a platform that isn't here — Reddit, YouTube descriptions, newsletter, Substack — open a PR.

---

## License

MIT — use it, fork it, build on it.

---

_Orchestra is a product of [Meridian Global](https://github.com/MeridianGlobal)._
