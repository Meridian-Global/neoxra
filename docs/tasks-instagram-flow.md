# Instagram Generation Flow — Atomic Task List

**Reference:** `docs/design-instagram-flow.md`  
**Ordering:** End-to-end thin slice first (Tasks 1-5), then polished UI (Tasks 6-11), then hardening (Tasks 12-16).  
**Rule:** orchestra owns HTTP + UI. All AI logic stays in orchestra-core.

---

## Task 1 — Backend: Pydantic request model

**Objective:** Define the HTTP request schema for `POST /api/instagram/generate` as a Pydantic model with validation, separate from the route handler.

**Files:**
- `orchestra/backend/api/instagram_routes.py` (new)

**Work:**
- Create `InstagramGenerateRequest(BaseModel)` with fields: `topic: str`, `template_text: str`, `goal: str = "engagement"`, `style_examples: list[str] = []`, `voice_profile: str = "default"`.
- Add a `field_validator` on `goal` that rejects values not in `("engagement", "authority", "conversion", "save", "share")`.
- Add `field_validator`s on `topic` and `template_text` that reject empty or whitespace-only strings.
- Import `VALID_GOALS` from `orchestra_core.models.instagram` rather than duplicating the tuple.

**Acceptance criteria:**
- Constructing `InstagramGenerateRequest(topic="x", template_text="y")` succeeds.
- `InstagramGenerateRequest(topic="", template_text="y")` raises `ValidationError`.
- `InstagramGenerateRequest(topic="x", template_text="y", goal="invalid")` raises `ValidationError`.
- Optional fields default correctly.

**Test approach:** Unit test the Pydantic model directly — instantiate with valid/invalid inputs, assert success or `ValidationError` with correct field name. File: `tests/test_instagram_request.py`.

---

## Task 2 — Backend: SSE streaming route (happy path)

**Objective:** Create the `POST /api/instagram/generate` route that calls orchestra-core's three skills in sequence and streams SSE events.

**Files:**
- `orchestra/backend/api/instagram_routes.py` (extend from Task 1)
- `orchestra/backend/main.py` (register router)

**Work:**
- Create an `APIRouter` and a `POST /api/instagram/generate` endpoint.
- Inside the route, translate `InstagramGenerateRequest` → core's `GenerationRequest` (the boundary conversion).
- Write an `async def stream()` generator that:
  1. Instantiates `StyleAnalysisSkill`, `InstagramGenerationSkill`, `ContentScoringSkill`.
  2. Calls each skill's `.run(SkillInput(...))` in sequence, matching the exact input wiring from `InstagramPipeline.run()` in `orchestra_core/orchestration/instagram.py` (lines 49-94).
  3. Yields SSE events between calls using the same `sse()` helper pattern from `routes.py`.
- Events emitted in order: `style_analysis_started`, `style_analysis_completed`, `generation_started`, `generation_completed`, `scoring_started`, `scoring_completed`, `pipeline_completed`.
- The `pipeline_completed` data payload must contain `content`, `scorecard`, `critique`, `style_analysis` — matching `InstagramResult`'s four fields, serialized as dicts.
- Return `StreamingResponse(stream(), media_type="text/event-stream")`.
- In `main.py`, import and register the new router via `app.include_router(instagram_router)`.

**Acceptance criteria:**
- `POST /api/instagram/generate` with `{"topic": "test", "template_text": "template"}` returns `Content-Type: text/event-stream`.
- The stream contains exactly 7 events in the specified order.
- `pipeline_completed` data has keys: `content`, `scorecard`, `critique`, `style_analysis`.
- `scorecard` contains all six dimension keys plus computable `average`.
- `content` contains `caption`, `hook_options`, `hashtags`, `carousel_outline`, `reel_script`.

**Test approach:** Mock `orchestra_core.providers.llm.generate` to return canned JSON. Use FastAPI `TestClient(app)` with the POST, read the streamed response, split by `\n\n`, parse each SSE message, assert event order and payload shapes. File: `tests/test_instagram_route.py`.

---

## Task 3 — Backend: SSE error handling

**Objective:** Ensure that a failure at any pipeline stage emits a structured SSE `error` event and closes the stream, rather than crashing.

**Files:**
- `orchestra/backend/api/instagram_routes.py` (modify stream generator)

**Work:**
- Wrap each skill `.run()` call in `try/except Exception`.
- On exception, yield `event: error` with payload `{"stage": "<stage_name>", "message": str(e)}`, then `return` to close the generator.
- Before entering the stream, catch `ValueError` from `GenerationRequest.__post_init__()` and raise `HTTPException(status_code=422, detail=str(e))` — this is a request-level error, not a streaming error.
- Add `import logging` and log the full traceback at `ERROR` level. Never include raw LLM output in the SSE error payload.

**Acceptance criteria:**
- When `StyleAnalysisSkill.run()` raises, the stream contains `style_analysis_started` then `error` (with `"stage": "style_analysis"`), then ends.
- When `InstagramGenerationSkill.run()` raises, the stream contains style events + `generation_started` + `error` (with `"stage": "generation"`), then ends.
- When `ContentScoringSkill.run()` raises, the stream contains style + generation events + `scoring_started` + `error` (with `"stage": "scoring"`), then ends.
- Core's `GenerationRequest` validation failure returns HTTP 422, not a stream.

**Test approach:** Three tests, each mocking one skill to raise `ValueError`. Verify the SSE stream contains the right events before the error, the error event itself, and no events after. One additional test for core validation 422. File: `tests/test_instagram_route.py` (extend).

---

## Task 4 — Frontend: InstagramForm component

**Objective:** Build the input form for standalone Instagram generation: topic, template text, goal selector, and Generate button.

**Files:**
- `frontend/components/InstagramForm.tsx` (new)

**Work:**
- Controlled component with local state for `topic` (textarea), `templateText` (textarea), and `goal` (select dropdown with five options: engagement, authority, conversion, save, share).
- Props: `onSubmit: (data: { topic: string; template_text: string; goal: string }) => void`, `disabled: boolean`.
- Generate button is disabled when `topic` or `templateText` is empty, or when `disabled` prop is true.
- On submit, call `onSubmit` with the form data. Reset is handled by the parent.
- No styling beyond functional layout — CSS comes in a later task.

**Acceptance criteria:**
- Renders two textareas, one select, one button.
- Button is disabled when either textarea is empty.
- Button is disabled when `disabled` prop is true.
- Clicking Generate calls `onSubmit` with correct field names (`topic`, `template_text`, `goal`).
- Pressing Cmd/Ctrl+Enter in either textarea also submits.

**Test approach:** React Testing Library. Render component, verify disabled states, simulate typing + submit, assert `onSubmit` called with expected args. File: `frontend/__tests__/InstagramForm.test.tsx`.

---

## Task 5 — Frontend: Minimal Instagram page (thin slice)

**Objective:** Create the `/instagram` route that wires the form to the backend SSE endpoint and displays raw JSON results. This is the end-to-end thin slice — a user can generate Instagram content.

**Files:**
- `frontend/app/instagram/page.tsx` (new)

**Work:**
- Import `InstagramForm` and `streamSSE` from existing `lib/sse.ts`.
- Local state: `status: 'idle' | 'streaming' | 'done' | 'error'`, `result: Record<string, any>` (accumulates SSE data), `error: string | null`, `currentStage: string`.
- On form submit: set status to `streaming`, create `AbortController`, call `streamSSE()` pointed at `${API_BASE}/api/instagram/generate`.
- Map SSE events to state:
  - `*_started` events → update `currentStage` label.
  - `*_completed` events → merge data into `result`.
  - `pipeline_completed` → set status to `done`.
  - `error` → set `error` to the message, set status to `error`.
- Display: while streaming show current stage label. After done, show `<pre>{JSON.stringify(result, null, 2)}</pre>`.
- Error state shows inline banner with message and a Retry button (resets to idle).
- Cancel button (visible while streaming) aborts the controller.

**Acceptance criteria:**
- Navigating to `http://localhost:3000/instagram` shows the form.
- Submitting with topic + template starts streaming and shows stage labels.
- On completion, raw JSON of the full `InstagramResult` is visible.
- SSE `error` events display an error banner.
- Cancel button stops the stream.

**Test approach:** Manual smoke test against running backend. This is the thin-slice milestone — automated page tests come in Task 15.

---

## Task 6 — Frontend: TypeScript types for Instagram models

**Objective:** Define TypeScript interfaces matching orchestra-core's Instagram dataclasses so all subsequent components are type-safe.

**Files:**
- `frontend/lib/instagram-types.ts` (new)

**Work:**
- Define interfaces: `StyleAnalysis`, `CarouselSlide`, `Scorecard` (with `average` as a computed or included field), `InstagramContent`, `InstagramResult`.
- Match field names exactly to the JSON keys the backend emits (which match core's `dataclasses.asdict()` output).
- Export all types.

**Acceptance criteria:**
- Each interface has the correct fields and types matching the design doc's API contract section 2.1.
- `InstagramResult` has fields: `content: InstagramContent`, `scorecard: Scorecard`, `critique: string`, `style_analysis: StyleAnalysis`.

**Test approach:** TypeScript compiler — the types are validated at build time. No runtime test needed.

---

## Task 7 — Frontend: InstagramResult component

**Objective:** Render the generated Instagram content in structured sections: caption, hook options, hashtags, carousel outline, reel script, and critique.

**Files:**
- `frontend/components/InstagramResult.tsx` (new)

**Work:**
- Props: `content: InstagramContent`, `critique: string`.
- Sections:
  - **Caption** — full text with a Copy button.
  - **Hook Options** — numbered list of 2-3 alternatives.
  - **Hashtags** — inline chips (styled spans).
  - **Carousel Outline** — numbered slides with title (bold) and body.
  - **Reel Script** — full text with a Copy button.
  - **Critique** — subtle note at the bottom.
- Copy buttons call `navigator.clipboard.writeText()` and show "copied" for 1.5s (same pattern as existing `StreamCard.tsx`).

**Acceptance criteria:**
- Given mock `InstagramContent` + critique string, all six sections render with correct data.
- Caption Copy button copies the caption text.
- Reel Script Copy button copies the reel script text.
- Hashtags render as individual chips without `#` prefix (matching core's normalization).

**Test approach:** React Testing Library. Render with fixture data, query for section headings and content, assert text matches. Mock `navigator.clipboard.writeText`, click Copy, assert called with correct string. File: `frontend/__tests__/InstagramResult.test.tsx`.

---

## Task 8 — Frontend: ScorecardRadar component

**Objective:** Visualize the six quality scores as a CSS-only horizontal bar chart.

**Files:**
- `frontend/components/ScorecardRadar.tsx` (new)

**Work:**
- Props: `scorecard: Scorecard`.
- Render six horizontal bars, each with: dimension label (human-readable: "Hook Strength", "CTA Clarity", etc.), bar filled to `value / 10 * 100%`, numeric value at the end.
- Below the bars, show "Average: X.X" (one decimal place).
- Bar color: Instagram pink `#e1306c` at opacity scaled by score (e.g., `opacity: 0.4 + score * 0.06`).
- Pure CSS — no charting library.

**Acceptance criteria:**
- All six dimension labels and values render.
- Average is calculated correctly (sum / 6, rounded to one decimal).
- Bar widths are proportional to scores (a score of 5 is 50% width).

**Test approach:** React Testing Library. Render with a known scorecard, assert all six labels present, assert average text matches expected value. File: `frontend/__tests__/ScorecardRadar.test.tsx`.

---

## Task 9 — Frontend: CarouselPreview component

**Objective:** Display the carousel outline as a horizontally scrollable row of slide cards.

**Files:**
- `frontend/components/CarouselPreview.tsx` (new)

**Work:**
- Props: `slides: CarouselSlide[]`.
- Render each slide as a card: slide number (1-based), title (bold), body text.
- Container uses `overflow-x: auto` for horizontal scroll.
- Cards have a fixed min-width (~200px) and subtle border.

**Acceptance criteria:**
- Given 5 slides, 5 cards render with correct numbering (1-5), titles, and bodies.
- Container scrolls horizontally when cards overflow.

**Test approach:** React Testing Library. Render with fixture array, assert card count and content. File: `frontend/__tests__/CarouselPreview.test.tsx`.

---

## Task 10 — Frontend: Wire polished components into page

**Objective:** Replace the raw JSON `<pre>` display in `app/instagram/page.tsx` with the typed components, rendering progressively as SSE events arrive.

**Files:**
- `frontend/app/instagram/page.tsx` (modify)

**Work:**
- Import types from `instagram-types.ts` and the three components.
- Replace `result: Record<string, any>` with typed state: `styleAnalysis: StyleAnalysis | null`, `content: InstagramContent | null`, `scorecard: Scorecard | null`, `critique: string | null`.
- Map SSE events to typed state:
  - `style_analysis_completed` → parse and set `styleAnalysis`. Show tone keywords as inline chips.
  - `generation_completed` → parse and set `content`. Render `InstagramResult`.
  - `scoring_completed` → parse and set `scorecard`. Render `ScorecardRadar`.
  - `pipeline_completed` → set all fields, render `CarouselPreview` alongside the others.
- While streaming, show a stage indicator: italic label with pulsing dot (matching existing `page.tsx` pattern).

**Acceptance criteria:**
- After `generation_completed`, the caption/hooks/hashtags/reel sections are visible (but no scorecard yet).
- After `scoring_completed`, the scorecard bar chart appears.
- After `pipeline_completed`, all sections including carousel preview and critique are visible.
- No layout jump when later sections appear (reserve space or use smooth transitions).

**Test approach:** Mock `fetch` to return a canned SSE stream with realistic payloads. Render the page, simulate form submit, use `waitFor` to assert components appear at the right moments. File: `frontend/__tests__/instagram-page.test.tsx`.

---

## Task 11 — Frontend: CSS for Instagram page

**Objective:** Style the Instagram form, result display, scorecard, and carousel to match the existing dark theme.

**Files:**
- `frontend/app/globals.css` (extend)

**Work:**
- Add classes: `.ig-form`, `.ig-form textarea`, `.ig-form select`, `.ig-result`, `.ig-section`, `.ig-section-title`, `.ig-caption`, `.ig-hooks`, `.ig-hashtag-chip`, `.ig-scorecard`, `.ig-bar`, `.ig-bar-fill`, `.ig-bar-label`, `.ig-bar-value`, `.ig-average`, `.ig-carousel`, `.ig-slide-card`, `.ig-critique`.
- Reuse existing conventions: `#0d0d0d` background, `#e2e2e2` text, card border pattern, `.copy-btn` style.
- Form: stacked fields, full-width textareas, select styled consistently with the dark theme.
- Result: single column, sections separated by `border-bottom: 1px solid #1a1a1a`.
- Hashtag chips: inline, small rounded background.
- Scorecard bars: full-width container, bars grow left-to-right.

**Acceptance criteria:**
- Instagram page is visually consistent with the existing pipeline page.
- All components are readable at 1280px viewport width.
- No unstyled or broken elements.

**Test approach:** Visual review in browser.

---

## Task 12 — Backend: Request logging with stage timing

**Objective:** Log every Instagram generation run with per-stage durations for observability.

**Files:**
- `orchestra/backend/api/instagram_routes.py` (modify stream generator)

**Work:**
- At stream start, capture `t0 = time.monotonic()` and a request fingerprint: `hashlib.sha256(topic[:50].encode()).hexdigest()[:8]`.
- Before each skill call, capture `stage_start`. After each call, log: `logger.info("instagram.%s completed in %dms", stage, elapsed_ms)`.
- At stream end (both success and error), log: `logger.info("instagram.pipeline req=%s total=%dms stages=%d/3", fingerprint, total_ms, count)`.
- Use `logging.getLogger("orchestra.instagram")`.

**Acceptance criteria:**
- A successful run produces 4 log lines (3 stages + 1 summary).
- A run that fails at generation produces 2 log lines (1 stage + 1 summary with `stages=1/3`).
- No full content or PII in log output.

**Test approach:** In `tests/test_instagram_route.py`, use `caplog` fixture to capture log output. Assert log messages match expected patterns.

---

## Task 13 — Backend: Voice profile passthrough

**Objective:** Load the requested voice profile and pass it into the generation skill's context so content tone reflects the creator's brand.

**Files:**
- `orchestra/backend/api/instagram_routes.py` (modify)

**Work:**
- Import `load_voice_profile` from `orchestra_core.voice`.
- Define `VOICE_DIR` pointing to `Path(__file__).resolve().parents[2] / "voice_profiles"` (resolves to `orchestra/voice_profiles/`).
- Before entering the stream generator, call `load_voice_profile(req.voice_profile, voice_dir=VOICE_DIR)`. If the file doesn't exist, `load_voice_profile` raises `FileNotFoundError` — catch it and raise `HTTPException(422, detail=f"Voice profile '{req.voice_profile}' not found")`.
- Pass the loaded profile dict into the generation skill's `SkillInput.context` under a `"voice_profile"` key.

**Acceptance criteria:**
- Default request with `voice_profile="default"` loads `default.yaml` and passes profile data to the generation skill context.
- Request with `voice_profile="nonexistent"` returns HTTP 422 with a clear message.
- The generation skill's `SkillInput.context` dict contains a `"voice_profile"` key with the loaded YAML data.

**Test approach:** Two tests: (1) mock the generation skill, submit a request, inspect the `SkillInput.context` it received, assert `"voice_profile"` key is present with expected structure. (2) Submit with `"nonexistent"` profile, assert 422 response. File: `tests/test_instagram_route.py` (extend).

---

## Task 14 — Backend: SSE contract test

**Objective:** Create a standalone test that validates every SSE event name and payload schema, so any backend change that would break the frontend is caught.

**Files:**
- `tests/test_instagram_contract.py` (new)

**Work:**
- Define a schema dict mapping each event name to its expected payload structure (required keys, value types):
  - `style_analysis_started`: `{}` (empty).
  - `style_analysis_completed`: `{tone_keywords: list, structural_patterns: list, vocabulary_notes: str}`.
  - `generation_started`: `{}`.
  - `generation_completed`: `{caption: str, hook_options: list, hashtags: list, carousel_outline: list, reel_script: str}`.
  - `scoring_started`: `{}`.
  - `scoring_completed`: `{hook_strength: int, cta_clarity: int, hashtag_relevance: int, platform_fit: int, tone_match: int, originality: int}`.
  - `pipeline_completed`: `{content: dict, scorecard: dict, critique: str, style_analysis: dict}`.
- Mock `orchestra_core.providers.llm.generate`, fire the route, parse the SSE stream, and validate each event against its schema.
- Assert exact event count (7) and exact event order.

**Acceptance criteria:**
- Test passes on the current implementation.
- Renaming an event, adding a required field, or changing a type causes the test to fail.

**Test approach:** This task is the test. Run with `pytest tests/test_instagram_contract.py -q`.

---

## Task 15 — Frontend: InstagramForm unit tests

**Objective:** Automated tests for the form component's rendering, validation, and submission.

**Files:**
- `frontend/__tests__/InstagramForm.test.tsx` (new)

**Work:**
- Test: renders two textareas (topic, template), one select (goal), one button.
- Test: button disabled when topic is empty.
- Test: button disabled when template is empty.
- Test: button disabled when `disabled` prop is true.
- Test: filling both fields and clicking Generate calls `onSubmit` with `{ topic, template_text, goal }`.
- Test: goal defaults to "engagement".
- Test: Cmd+Enter in topic textarea triggers submit.

**Acceptance criteria:**
- All tests pass.

**Test approach:** React Testing Library with Jest/Vitest. `render(<InstagramForm onSubmit={mockFn} disabled={false} />)`, use `screen.getByRole` and `userEvent` for interactions.

---

## Task 16 — Frontend: SSE streaming integration test

**Objective:** Verify the full Instagram page streams events correctly and renders components progressively.

**Files:**
- `frontend/__tests__/instagram-page.test.tsx` (new)

**Work:**
- Mock `fetch` to return a `ReadableStream` that emits canned SSE events with realistic payloads (caption, hashtags, scorecard values, carousel slides).
- Render the `/instagram` page component.
- Fill the form via `userEvent`, click Generate.
- Use `waitFor` to assert:
  - After `style_analysis_completed`: tone keyword chips appear.
  - After `generation_completed`: caption text is visible.
  - After `scoring_completed`: scorecard labels (e.g., "Hook Strength") appear.
  - After `pipeline_completed`: carousel slide titles are visible.
- Test error case: mock fetch to emit an `error` event, assert error banner renders.
- Test cancel: trigger abort, assert streaming stops.

**Acceptance criteria:**
- All assertions pass.
- Components appear at the correct moments, not all at once at the end.

**Test approach:** React Testing Library + `waitFor`. Mock `fetch` globally for the test file.

---

## Deferred Items

Not part of this task list. Each requires its own design pass.

| Item | Why deferred |
|---|---|
| Auth / user accounts | MVP is single-user, local |
| Billing / usage metering | Requires auth first |
| Content persistence / history | Requires DB schema + migration tooling |
| Template library / saved templates | Requires persistence layer + CRUD UI |
| Instagram publishing (Meta Graph API) | Requires Meta developer app review + OAuth |
| Critic agent in standalone flow | Requires core to add optional critic step to `InstagramPipeline` |
| Image / media generation | Text-only MVP; requires image provider + asset storage |
| A/B variant generation | Requires variant comparison UI |
| Carousel image design | Requires canvas/image generation service |
| Scorecard history / analytics | Requires persistence + time-series charting |
| Responsive / mobile layout | Desktop-first MVP |
| Rate limiting | Requires auth + request counting middleware |
| LLM response caching | Requires cache key strategy + storage backend |

---

## Dependency Map

```
BACKEND                          FRONTEND
────────                         ────────
Task 1  (request model)          Task 4  (form component)
  │                                │
  ▼                                ▼
Task 2  (SSE route)              Task 5  (minimal page) ← thin slice done
  │                                │
  ▼                                ▼
Task 3  (error handling)         Task 6  (TS types)
  │                                │
  ▼                                ├──→ Task 7  (InstagramResult)
Task 12 (logging)                ├──→ Task 8  (ScorecardRadar)
Task 13 (voice passthrough)      ├──→ Task 9  (CarouselPreview)
Task 14 (contract test)          │
                                 ▼
                                Task 10 (wire components)
                                  │
                                  ▼
                                Task 11 (CSS)
                                Task 15 (form tests)
                                Task 16 (page integration test)
```

**Critical path to working demo:** Task 1 → Task 2 → Task 4 → Task 5 (four tasks).  
**Backend and frontend tracks are independent** after Task 2 is done — they can proceed in parallel.
