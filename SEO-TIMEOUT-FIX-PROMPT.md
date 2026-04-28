## Prompt 1 — 在 `neoxra` repo 下執行

```
Fix SEO timeout on the /api/generate-all endpoint and update validation limits.

PROBLEM: When generating all platforms in parallel, SEO times out because it's the only platform that does multi-step generation (outline → 6-8 sections → conclusion = 8-10 sequential LLM calls). The standalone /seo endpoint works fine because it passes an `on_section_ready` callback that emits SSE progress events to keep the connection alive. The generate-all endpoint in `backend/app/api/unified_routes.py` does NOT pass this callback.

TASK 1 — Fix `backend/app/api/unified_routes.py`:

1a) Add `import queue` to the top imports.

1b) Modify `_generate_seo()` to accept an optional `progress_callback` parameter and pass it as `on_section_ready` to `core_client.generate_seo_article()`. Reference how the standalone endpoint at `backend/app/api/seo_routes.py` line 184 passes `on_section_ready=on_section_ready` — do the same thing here.

Current _generate_seo signature:
  def _generate_seo(core_client, req: UnifiedGenerateRequest, brief: dict[str, object]) -> dict[str, object]:

Change to:
  def _generate_seo(core_client, req: UnifiedGenerateRequest, brief: dict[str, object], progress_callback=None) -> dict[str, object]:

And inside the lambda that calls core_client.generate_seo_article(), add `on_section_ready=progress_callback`.

1c) Inside the `stream()` async generator in `generate_all()`:
- Create a `queue.Queue()` called `seo_progress_queue`
- Create a `seo_progress_callback` function that puts (event_name, data) tuples into the queue (handle dataclass → dict conversion with `from dataclasses import asdict` if `hasattr(data, '__dataclass_fields__')`)
- When creating the seo_task, pass `seo_progress_callback` as the extra arg:
  `seo_task = asyncio.create_task(_run_platform("seo", _generate_seo, core_client, req, brief, seo_progress_callback))`

1d) In the `while task_to_platform:` loop, add `timeout=2.0` to the `asyncio.wait()` call so it periodically returns even when no tasks finish. After the await, drain the seo_progress_queue and yield SSE events with `_sse(f"seo_{event_name}", ...)`. If `done` is empty (timeout with no completions), yield `_sse("keepalive", {})` and `continue`.

1e) Before the final `yield _sse("all_completed", ...)`, drain any remaining events from seo_progress_queue.

TASK 2 — Fix `backend/app/core/output_validation.py`:

In the `SeoArticlePayload` class, change the `_word_count_range` validator from `2000 <= value <= 8000` to `2000 <= value <= 6000`. Update the error message string to match.

After all changes, run: python -m pytest backend/tests/ -q
Do NOT create git commits or PR titles.
```

---

## Prompt 2 — 在 `neoxra-core` repo 下執行

```
Reduce SEO article length targets from ~8000 Chinese chars to ~5000, and from 6-8 sections to 4-5 sections. This fixes timeout issues because fewer sections = fewer sequential LLM calls.

TASK 1 — Edit `neoxra_core/prompts/seo_generation.py`:

1a) In `build_seo_outline_prompt()`, the zh-TW branch (line ~123):
- Change "approximately 8000 Chinese characters" → "approximately 5000 Chinese characters"
- Change "500-800 characters" introduction → "300-500 characters"
- Change "Plan 6-8 sections" → "Plan 4-5 sections"

1b) In `build_seo_outline_prompt()`, the English branch (line ~131):
- Change "Plan 6-8 sections (5 main H2 sections + FAQ + optional subsections)" → "Plan 4-5 sections (3-4 main H2 sections + FAQ)"
- Keep English total at "approximately 5000 words" (unchanged)

1c) In `build_seo_outline_prompt()`, the per-section target (line ~167):
- Change "400-800 words per section" → "300-500 words per section"

1d) In `build_seo_outline_prompt()`, the estimated_total_words JSON (line ~192):
- Change `{8000 if locale == "zh-TW" else 5000}` → just `5000` (hardcoded for both locales)

1e) In `build_seo_section_prompt()`, both zh-TW and en FAQ instructions:
- Change "generate 4-6 Q&A pairs" → "generate 3-4 Q&A pairs"
- Change "detailed answer paragraph" → "concise answer paragraph"

1f) In `build_seo_conclusion_prompt()`, the zh-TW branch:
- Change "Write 400-600 Chinese characters" → "Write 300-400 Chinese characters"

TASK 2 — Edit `neoxra_core/skills/seo_generation.py`:

2a) In the outline generation call (line ~44):
- Change `max_tokens=4096` → `max_tokens=3072`

2b) In the section generation call (line ~91):
- Change `max_tokens=3072` → `max_tokens=2048`

TASK 3 — Edit `neoxra_core/models/seo.py`:

3a) Change `MAX_ARTICLE_WORDS = 8000` → `MAX_ARTICLE_WORDS = 6000` (line ~16)

After all changes, run: pytest -q
Do NOT create git commits or PR titles.
```
