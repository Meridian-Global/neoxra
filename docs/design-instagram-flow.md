# Instagram Generation Flow — Design Document

**Status:** Draft  
**Date:** 2026-04-14  
**Scope:** Design only. No implementation.

---

## 1. User Flow

The user interacts through the frontend. The flow has two entry points that converge on the same generation pipeline.

### Entry A — From Idea Input (new)

1. User types a content idea into the textarea.
2. User clicks "Run Neoxra" (existing flow runs the full multi-platform pipeline).
3. Frontend receives SSE events. When `instagram_pass2_completed` arrives, the Instagram card renders with the refined caption, hook options, hashtags, carousel outline, and reel script.
4. User can copy, edit inline, or click "Regenerate Instagram" to re-run only the Instagram leg.

### Entry B — Standalone Instagram Generation (new)

1. User navigates to an `/instagram` view.
2. User fills in: topic, template text (paste or select from saved templates), goal (engagement / authority / conversion / save / share), and optional style examples.
3. User clicks "Generate".
4. Frontend streams progress (style analysis → generation → scoring).
5. Final view shows: caption, hook options, hashtags, carousel outline, reel script, and a scorecard radar chart.
6. User can copy any section, tweak inputs, and regenerate.

Both paths end with the same `InstagramResult` shape rendered in the same output component.

---

## 2. API Contract

### 2.1 Standalone Instagram endpoint

```
POST /api/instagram/generate
Content-Type: application/json

Request body (InstagramGenerateRequest):
{
  "topic": "string, required",
  "template_text": "string, required",
  "goal": "engagement | authority | conversion | save | share",
  "style_examples": ["string"],       // optional, default []
  "voice_profile": "string"           // optional, default "default"
}

Response: text/event-stream (SSE)

Events (in order):
  event: style_analysis_started
  data: {}

  event: style_analysis_completed
  data: {
    "tone_keywords": ["direct", "grounded"],
    "structural_patterns": ["lead with observation"],
    "vocabulary_notes": "..."
  }

  event: generation_started
  data: {}

  event: generation_completed
  data: {
    "caption": "...",
    "hook_options": ["...", "..."],
    "hashtags": ["...", "..."],
    "carousel_outline": [{"title": "...", "body": "..."}],
    "reel_script": "..."
  }

  event: scoring_started
  data: {}

  event: scoring_completed
  data: {
    "hook_strength": 8,
    "cta_clarity": 7,
    "hashtag_relevance": 9,
    "platform_fit": 8,
    "tone_match": 7,
    "originality": 6,
    "average": 7.5
  }

  event: pipeline_completed
  data: {
    "content": { ... },      // InstagramContent
    "scorecard": { ... },    // Scorecard
    "critique": "...",        // summary string
    "style_analysis": { ... } // StyleAnalysis
  }

  event: error
  data: { "stage": "generation", "message": "..." }
```

### 2.2 Validation errors

Return `422 Unprocessable Entity` with a JSON body:

```json
{
  "detail": [
    { "field": "topic", "message": "Topic cannot be empty" }
  ]
}
```

### 2.3 Existing pipeline endpoint (unchanged)

`POST /api/run` continues to work as-is. The Instagram agent inside that pipeline uses `neoxra-core`'s models internally but the SSE event shape stays the same (`instagram_pass1_completed`, `instagram_pass2_completed`) to avoid breaking the frontend.

---

## 3. Frontend Structure

### New files

```
frontend/
├── app/
│   ├── instagram/
│   │   └── page.tsx          # standalone Instagram view
│   └── page.tsx              # existing (no changes needed yet)
├── components/
│   ├── StreamCard.tsx         # existing — add scorecard + carousel rendering
│   ├── InstagramForm.tsx      # input form for standalone flow
│   ├── InstagramResult.tsx    # shared output display (used by both flows)
│   ├── ScorecardRadar.tsx     # radar/bar chart for 6 scoring dimensions
│   └── CarouselPreview.tsx    # visual preview of slide titles + bodies
└── lib/
    └── sse.ts                 # existing — no changes needed
```

### Component responsibilities

| Component | Owns | Receives |
|---|---|---|
| `InstagramForm` | Input state, validation, submit | `onSubmit(request)` callback |
| `InstagramResult` | Renders caption, hooks, hashtags, carousel, reel script | `InstagramContent` + `Scorecard` + `StyleAnalysis` |
| `ScorecardRadar` | SVG radar or horizontal bar chart | `Scorecard` object |
| `CarouselPreview` | Numbered slide cards | `CarouselSlide[]` |
| `StreamCard` (existing) | Agent output card in pipeline view | Extended to show `InstagramResult` when available |

### State management

The `/instagram` page holds local state only — no global store needed at MVP:

- `formData: InstagramGenerateRequest`
- `status: 'idle' | 'streaming' | 'done' | 'error'`
- `partialResult: Partial<InstagramResult>` (populated progressively from SSE events)
- `error: string | null`

### Routing

Next.js file-based routing. `/instagram` maps to `app/instagram/page.tsx`. No layout changes needed; the existing root layout applies.

---

## 4. Backend Responsibilities

Neoxra's backend (the product layer) is responsible for:

1. **Request handling** — Validate the incoming HTTP request, build an `neoxra_core.models.instagram.GenerationRequest`, and return SSE.
2. **Voice loading** — Call `neoxra_core.voice.load_voice_profile()` with the voice_dir pointing at `backend/voice_profiles/`.
3. **Pipeline invocation** — Instantiate `neoxra_core.pipeline.instagram.InstagramPipeline` and call `pipeline.run(request)`.
4. **SSE translation** — The pipeline today runs synchronously and returns an `InstagramResult`. Neoxra's route wraps this in a streaming generator that emits events after each stage completes (see section 6 for how to make this work without changing core).
5. **Error mapping** — Catch exceptions from core, translate them into SSE `error` events or HTTP error responses.

Neoxra's backend must **not**:

- Contain prompt text or LLM calls.
- Instantiate the Anthropic client directly.
- Define AI model dataclasses (those live in core).
- Perform content validation logic (hashtag count, slide limits — that's core's job).

---

## 5. Integration with neoxra-core

### What neoxra imports from core

```python
from neoxra_core.models.instagram import GenerationRequest, InstagramResult
from neoxra_core.pipeline.instagram import InstagramPipeline
from neoxra_core.voice import load_voice_profile
```

### Pipeline wiring

```python
# In backend/app/api/instagram_routes.py

pipeline = InstagramPipeline()          # uses default skills
result: InstagramResult = pipeline.run(request)
```

Skills are not overridden at the neoxra layer — core's defaults are used. If neoxra later needs to swap a skill (e.g., a cached scoring skill), it can inject via constructor args.

### Streaming adaptation

`InstagramPipeline.run()` currently executes three steps synchronously and returns the final `InstagramResult`. To emit per-stage SSE events without changing core's interface:

**Option chosen: wrap in neoxra's route.**

The route calls each skill individually in sequence, emitting SSE events between calls. This keeps core's pipeline as the canonical "run all three" path, while neoxra's route handles the streaming concern:

```
# Pseudocode — neoxra route
style_skill = StyleAnalysisSkill()
gen_skill   = InstagramGenerationSkill()
score_skill = ContentScoringSkill()

yield sse("style_analysis_started")
style = style_skill.run(SkillInput(text=..., context=...))
yield sse("style_analysis_completed", style)

yield sse("generation_started")
content = gen_skill.run(SkillInput(text=..., context=...))
yield sse("generation_completed", content)

yield sse("scoring_started")
score = score_skill.run(SkillInput(text=..., context=...))
yield sse("scoring_completed", score)

yield sse("pipeline_completed", full_result)
```

This is acceptable because neoxra is calling core's public skill classes — it's using the library, not duplicating logic. The AI prompts, LLM calls, and validation all remain inside core.

### Future: streaming in core

When core adds a `run_stream()` generator to `InstagramPipeline`, neoxra's route can simplify to forwarding those events directly — same pattern as the existing `run_pipeline_stream()` in the multi-platform pipeline coordinator.

---

## 6. Error Handling

### Layer 1 — Request validation (neoxra)

| Condition | Response |
|---|---|
| Empty `topic` | 422, field error |
| Empty `template_text` | 422, field error |
| Invalid `goal` value | 422, field error |
| Body parse failure | 422, Pydantic default |

Validation happens in the Pydantic request model before any core code runs.

### Layer 2 — Core pipeline errors

| Error source | How neoxra handles it |
|---|---|
| `GenerationRequest.__post_init__` raises `ValueError` | Catch, return 422 with message |
| LLM provider raises `anthropic.APIError` | Catch, emit SSE `error` event with `stage` and `message`, close stream |
| `ANTHROPIC_API_KEY` missing | Catch on startup or first call, return 503 with "LLM provider not configured" |
| JSON parse failure inside a skill | Catch, emit SSE `error` event, include raw LLM output in server logs (not in SSE) |
| Skill returns malformed output | Catch `KeyError`/`TypeError` during model construction, emit SSE `error` |

### Layer 3 — Frontend

- On SSE `error` event: show inline error banner with stage name and message, offer "Retry" button.
- On network failure (fetch rejects): show connection error, offer retry.
- On stream ending without `pipeline_completed`: show "Generation incomplete" warning.
- AbortController allows the user to cancel in-flight generation.

### Logging

Neoxra logs every pipeline run with: timestamp, request fingerprint (topic hash), stages completed, total duration, and any error. No PII or full content in logs.

---

## 7. Testing

### Frontend tests

| What | How |
|---|---|
| `InstagramForm` renders and validates | React Testing Library, check required fields, goal options |
| `InstagramResult` renders all sections | Pass mock `InstagramResult`, assert caption/hooks/hashtags/carousel/reel present |
| `ScorecardRadar` renders dimensions | Pass mock `Scorecard`, check SVG or DOM elements |
| SSE streaming integration | Mock `fetch` to return an SSE stream, verify progressive state updates |
| Error states | Simulate SSE `error` event, verify banner renders |

### Backend tests (neoxra layer)

| What | How |
|---|---|
| Request validation | Send malformed requests to `/api/instagram/generate`, assert 422 responses |
| SSE event sequence | Mock the three skills, call the route, collect events, verify order and shape |
| Error propagation | Mock a skill to raise, verify SSE `error` event emitted |
| Voice profile loading | Verify the route passes correct `voice_dir` to core |

### Integration tests

| What | How |
|---|---|
| Full pipeline with mocked LLM | Use core's test pattern: mock `providers.llm.generate`, run the route end-to-end, verify final `InstagramResult` shape |
| Frontend ↔ Backend SSE contract | Spin up test server, connect from a test SSE client, verify event names and JSON shapes match the contract in section 2 |

All tests mock the LLM. No live API calls in CI.

---

## 8. Out of Scope

The following are explicitly **not** part of this design:

- **Image generation or media assets.** The flow produces text content only (captions, scripts, outlines). Visual asset creation is a separate feature.
- **Publishing to Instagram.** Unlike the existing LinkedIn publisher, Instagram publishing requires Meta's Graph API with app review. Deferred.
- **Template library / persistence.** Users paste template text manually. Saved templates and a template picker are future work.
- **Multi-platform generation from this view.** The standalone `/instagram` page generates Instagram content only. The existing `/` pipeline view handles multi-platform.
- **User accounts and auth.** MVP runs locally, single-user.
- **Content history / versioning.** No database storage of past generations. Each run is ephemeral.
- **A/B testing or variant generation.** One result per run. Generating multiple variants for comparison is future work.
- **Critic integration in standalone flow.** The standalone Instagram pipeline uses core's three-step flow (style → generate → score). The Critic agent is part of the multi-platform pipeline only. Adding critic review to standalone is future work.
- **Carousel image layout or design.** The carousel outline is text only (titles + bodies). Turning that into actual slide images is out of scope.
