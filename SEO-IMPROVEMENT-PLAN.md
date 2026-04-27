# SEO Article Generation — Product Improvement Plan

---

## PART 1 — Product Diagnosis

### Root causes why SEO articles are too short

**1. max_tokens = 6144 is far too low (CRITICAL)**
Location: `neoxra-core/neoxra_core/skills/seo_generation.py:87,94`

The prompt asks for 1200-2000 words of article body PLUS full JSON structure (metadata, sections array, summary_points, etc.). At ~4 characters per token, 6144 tokens ≈ ~24K characters of output. But a 2000-word English article alone is ~12K characters, and the JSON wrapping (keys, braces, escaped quotes) adds 30-50% overhead. Result: Claude hits the token ceiling and truncates mid-JSON. The JSON parser then fails. The retry also fails. You get either an error or a partial result with a "warning" field.

For a 5000-word article target, you need ~30K characters of body + ~8K of JSON overhead = ~38K characters ≈ 10,000+ tokens minimum.

**2. Model: claude-haiku-4-5 is too small (HIGH)**
Location: `neoxra-core/neoxra_core/providers/llm.py:9`, `.env` defaults

Haiku is optimized for speed and cost. It follows instructions less precisely than Sonnet for long-form generation. It tends to produce shorter, more formulaic output and struggles to maintain quality across 5000+ words.

**3. Prompt asks for only 1200-2000 words (HIGH)**
Location: `neoxra-core/neoxra_core/prompts/seo_generation.py:18`

The prompt itself says "Total article body must be 1200-2000 words." Even if max_tokens were infinite, Claude would produce ~1500 words and stop because the prompt told it to.

**4. One-shot JSON generation is fragile for long content (MEDIUM)**
The system asks Claude to output the ENTIRE article as a single JSON object. For short articles this works. For 5000-word articles, a single JSON blob becomes unreliable — one stray character corrupts everything. The current `parse_json_response` approach is brittle at scale.

**5. Client timeout: 60 seconds may be too short (MEDIUM)**
Location: `frontend/app/seo/page.tsx:231`, `frontend/lib/sse.ts:38`

The SSE stream has a per-chunk timeout. If Claude takes >60 seconds between any two chunks (which can happen during long generation), the frontend kills the stream. For a 5000-word article on Sonnet, generation can take 45-90 seconds total.

**6. No intermediate streaming (UX)**
Location: `backend/app/api/seo_routes.py:134-186`

The backend generates the entire article, validates it, THEN sends it. The user sees "loading" for 30-90 seconds with zero feedback. This feels broken even when it works.

### Why the user sometimes sees articles under 100 words

This happens when:
1. Claude hits max_tokens=6144 and truncates mid-JSON
2. `parse_json_response` fails to parse the truncated JSON
3. The retry also fails (same token limit)
4. `_validate_with_retry` returns a partial dict with `warning` field
5. The frontend displays whatever partial data it received

---

## PART 2 — Desired SEO Article Spec

### Target: 5,000-word production-ready SEO article

```
H1 Title
├── SEO Meta Title (50-60 chars)
├── Meta Description (150-160 chars)  
├── URL Slug
├── Primary Keyword + 4-8 Secondary Keywords
│
├── Introduction (~400 words)
│   Strong hook, problem statement, what reader will learn, 
│   primary keyword naturally placed
│
├── Section 1: H2 (~600 words)
│   ├── H3 subsection if needed
│   └── Concrete examples, data points, scenarios
│
├── Section 2: H2 (~600 words)
│   ├── H3 subsection if needed
│   └── Practical advice, step-by-step where relevant
│
├── Section 3: H2 (~600 words)
│   └── Deep analysis, comparison, expert insight
│
├── Section 4: H2 (~600 words)
│   └── Case studies, real examples, implementation details
│
├── Section 5: H2 (~600 words)
│   └── Common mistakes, advanced tips, edge cases
│
├── Section 6: H2 — FAQ (~500 words)
│   └── 4-6 question/answer pairs, each 60-100 words
│
├── Conclusion (~400 words)
│   Recap key points, reinforce main argument, forward-looking
│
├── Key Takeaways (4-6 bullet points)
│
└── CTA
    Clear call to action relevant to the topic
```

### Word allocation summary
- Introduction: ~400 words
- 5 main sections × ~600 words: ~3,000 words  
- FAQ section: ~500 words
- Conclusion + takeaways + CTA: ~500 words
- Headings + transitions: ~100 words
- **Total: ~4,500-5,500 words**

### Content quality requirements
- No filler paragraphs ("In today's world..." / "It's important to note...")
- Every section must contain at least one: concrete example, data point, step-by-step instruction, or real scenario
- Primary keyword appears 8-12 times naturally across the full article
- Each H2 section is substantive (min 400 words)
- FAQ answers are genuine answers, not single-sentence brushoffs
- CTA is specific to the topic and audience

### Copy-ready formatting
- Clean HTML export with proper heading hierarchy
- Clean Markdown export
- No JSON artifacts in the displayed text
- Paragraphs use natural breaks, not walls of text
- Works when pasted into WordPress block editor or Medium

### Traditional Chinese support
- For zh-TW: target 8,000-10,000 characters (equivalent to ~5,000 English words in reading time)
- Use Traditional Chinese characters, not Simplified
- Taiwan-appropriate phrasing and examples
- Maintain the same structural requirements

---

## PART 3 — Architecture Plan

### Option comparison

| Approach | Reliability | Speed | Complexity | Quality |
|----------|-----------|-------|-----------|---------|
| A. One-shot (current, just increase limits) | Low for 5K words | 60-90s | Low | Medium |
| B. Outline first → section-by-section | High | 90-120s | Medium | High |
| C. Multi-agent with critic | High | 2-4 min | High | Highest |
| D. Async background job | High | N/A (async) | High | Varies |

### Recommendation: Option B — Outline + Section-by-Section

**Why:**
1. **Reliability**: Each section is a manageable generation (~800 tokens output). No single call risks token truncation.
2. **Quality**: Claude gets focused context per section. It writes better when working on one section at a time.
3. **Streaming**: You can stream each section as it completes — the user sees real progress.
4. **Error recovery**: If one section fails, you can retry just that section, not the whole article.
5. **Token efficiency**: 6-8 calls of ~2K tokens each is more reliable than 1 call of ~16K tokens.
6. **Complexity**: Moderate — mainly prompt engineering + a loop in the skill.

**Implementation summary:**
```
Step 1: Generate outline + metadata (1 API call, ~2K tokens)
         → Returns: h1, meta, introduction, section headings, conclusion outline
         → Stream: "phase_started" event

Step 2: For each section (5-7 API calls, ~2K tokens each):
         → Generate one H2 section with full content
         → Stream: "section_ready" event after each section
         → Frontend appends section in real-time

Step 3: Assemble final article
         → Combine all sections + validate word count
         → Stream: "article_ready" + "pipeline_completed"
```

**Why NOT option A (one-shot):**
Asking Claude to output 5,000 words in a single JSON blob with max_tokens=16384 is technically possible but fragile. Long JSON outputs have higher failure rates. You lose streaming UX. One bad character corrupts everything.

**Why NOT options C/D:**
Over-engineered for current stage. Multi-agent adds latency and complexity. Background jobs need job queues and webhook infrastructure. Ship B now, upgrade to C later if needed.

---

## PART 4 — Implementation Plan

### Smallest viable change: 1 PR across 2 repos

**neoxra-core** changes:
1. New prompt: `prompts/seo_long_article.py` — outline prompt + section prompt
2. Updated skill: `skills/seo_generation.py` — section-by-section generation with streaming callback
3. Updated model: `models/seo.py` — raise MIN_ARTICLE_WORDS, add section word count validation
4. Updated provider: `providers/llm.py` — add `generate_stream()` or increase default model for SEO

**neoxra backend** changes:
1. Updated route: `api/seo_routes.py` — stream sections as they complete
2. Updated core_client: bridge new streaming generation

**neoxra frontend** changes:
1. Updated page: `app/seo/page.tsx` — handle `section_ready` events, increase timeout
2. Updated preview: `components/SeoArticlePreview.tsx` — incremental section display
3. Updated SSE: timeout increase

Since both repos need changes and they're tightly coupled, this should be **1 PR per repo = 2 PRs**, with neoxra-core first.

---

## PART 5 — PR Plan

### PR 1: neoxra-core — Section-by-section SEO article generation

- **Title**: `feat: section-by-section SEO article generation for 5000-word articles`
- **Repo**: `neoxra-core`
- **Branch**: `feat/seo-long-article`
- **Scope**: Prompt redesign, skill rewrite, model update, provider tweak
- **Files affected**:
  - `neoxra_core/prompts/seo_generation.py` (rewrite)
  - `neoxra_core/skills/seo_generation.py` (rewrite)
  - `neoxra_core/models/seo.py` (update word count limits)
  - `neoxra_core/providers/llm.py` (add model override for SEO)
  - `tests/test_seo_generation.py` (update tests)
- **Risk**: Medium — changes core generation logic
- **Acceptance criteria**:
  - `pytest -q` passes
  - Generates articles with 4000+ words
  - Each section is individually validated
  - Works in both en and zh-TW
  - Skill returns a list of sections that can be streamed
- **NOT included**: No frontend changes, no streaming protocol changes

### PR 2: neoxra — Backend streaming + frontend display for long SEO articles

- **Title**: `feat: stream SEO sections + display long articles properly`
- **Repo**: `neoxra`
- **Branch**: `feat/seo-long-article`
- **Scope**: Backend SSE streaming per section, frontend incremental display, timeout fix
- **Files affected**:
  - `backend/app/api/seo_routes.py` (stream section events)
  - `backend/app/core_client.py` or equivalent bridge (call new skill API)
  - `frontend/app/seo/page.tsx` (handle section_ready events, increase timeout)
  - `frontend/components/SeoArticlePreview.tsx` (incremental rendering)
  - `frontend/lib/sse.ts` (increase default timeout)
- **Risk**: Medium — changes streaming protocol
- **Acceptance criteria**:
  - `npm run build` passes
  - User sees sections appear one by one during generation
  - Final article displays with all sections, proper formatting
  - Copy to Markdown / Copy to HTML works with full article
  - Works in both en and zh-TW
  - Total generation time < 120 seconds
- **NOT included**: No Instagram rendering changes, no Threads/Facebook changes

---

## PART 6 — Claude Code Prompts

### Prompt 1: neoxra-core

```
You are working in the neoxra-core repo — a private Python package that handles AI content 
generation for the Neoxra product.

## CRITICAL PROBLEM
The SEO article generation currently produces articles that are FAR too short — sometimes 
under 100 words. The user needs 5,000-word production-ready SEO articles.

## ROOT CAUSES (already diagnosed)
1. max_tokens=6144 is too low for long articles in JSON format
2. The prompt asks for only 1200-2000 words
3. Haiku model produces shorter output
4. One-shot JSON generation truncates on long content
5. No streaming — the entire article must fit in one API call

## SOLUTION: Section-by-section generation

Rewrite the SEO generation to work in two phases:
- Phase 1: Generate an outline + metadata + introduction (one API call)
- Phase 2: Generate each section individually (one API call per section)
- Assemble the final article from all parts

This is more reliable than one giant JSON output because each call is small (~2K tokens).

## BEFORE YOU CHANGE ANYTHING

Read these files first and understand the current system:
- `neoxra_core/skills/seo_generation.py` — current skill (one-shot generation)
- `neoxra_core/prompts/seo_generation.py` — current prompt
- `neoxra_core/models/seo.py` — SeoArticle, SeoSection, SeoMetadata dataclasses + validation
- `neoxra_core/providers/llm.py` — LLM provider (generate function)
- `neoxra_core/providers/parsing.py` — JSON response parser
- `tests/` — existing tests

## CHANGES TO MAKE

### 1. `neoxra_core/prompts/seo_generation.py` — Rewrite with two prompt builders

Keep the file, but replace/refactor the content:

**A. `build_seo_outline_prompt(topic, brief_context, voice_profile, locale)`**

This prompt asks Claude to generate:
```json
{
  "metadata": { "title": "...", "meta_description": "...", "url_slug": "...", 
                 "primary_keyword": "...", "secondary_keywords": [...],
                 "target_search_intent": "informational" },
  "h1": "Article H1",
  "introduction": "Full introduction, 300-500 words, strong hook...",
  "section_plan": [
    { "heading": "H2 heading text", "heading_level": 2, 
      "brief": "2-sentence summary of what this section covers",
      "target_words": 600 },
    ...
  ],
  "conclusion_brief": "2-sentence summary of the conclusion angle",
  "estimated_total_words": 5000
}
```

Key requirements for the outline prompt:
- Plan 6-8 sections (5 main H2 + FAQ + optional subsections)
- Target total ~5000 words (en) or ~8000 characters (zh-TW)
- Introduction should be FULLY written (300-500 words), not just a brief
- Section briefs should be specific enough to guide individual section generation
- Include all SEO metadata in this first call
- The last section should always be an FAQ section with heading "常見問題" (zh-TW) or 
  "Frequently Asked Questions" (en)

**B. `build_seo_section_prompt(topic, section_plan_item, article_context, voice_profile, locale)`**

This prompt asks Claude to write ONE section:
```json
{
  "heading": "Same heading from the plan",
  "heading_level": 2,
  "content": "Full section content, 400-800 words..."
}
```

Key requirements:
- Receives the section's heading, brief, and target_words from the plan
- Receives article_context: the h1, introduction snippet, and previous section headings 
  (for continuity, but NOT full previous section content — keep context small)
- Must produce substantive content: examples, data points, practical advice
- For FAQ sections: generate 4-6 Q&A pairs within the content field
- For zh-TW: target 800-1500 characters per section

**C. `build_seo_conclusion_prompt(topic, article_context, conclusion_brief, voice_profile, locale)`**

This prompt generates:
```json
{
  "conclusion": "Full conclusion text, 300-400 words...",
  "summary_points": ["point 1", "point 2", "point 3", "point 4", "point 5"],
  "cta": "Clear call to action"
}
```

### 2. `neoxra_core/skills/seo_generation.py` — Rewrite the skill

The new `SeoGenerationSkill.run()` should:

```python
def run(self, input: SkillInput) -> SkillOutput:
    locale = input.context.get("locale", "en")
    callback = input.context.get("on_section_ready")  # optional streaming callback
    
    # Phase 1: Generate outline
    outline_prompt = build_seo_outline_prompt(...)
    raw = generate(outline_prompt, max_tokens=4096, temperature=0.6, 
                   model="claude-sonnet-4-20250514")  # Use Sonnet for quality
    outline = parse_json_response(raw)
    
    # Build initial article with introduction
    sections = []
    
    if callback:
        callback("outline_ready", outline)
    
    # Phase 2: Generate each section
    section_plan = outline.get("section_plan", [])
    article_context = {
        "h1": outline.get("h1", ""),
        "introduction_snippet": outline.get("introduction", "")[:200],
        "previous_headings": [],
    }
    
    for plan_item in section_plan:
        section_prompt = build_seo_section_prompt(
            topic=input.text, 
            section_plan_item=plan_item,
            article_context=article_context,
            voice_profile=input.context.get("voice_profile"),
            locale=locale,
        )
        raw = generate(section_prompt, max_tokens=3072, temperature=0.6,
                       model="claude-sonnet-4-20250514")
        section_data = parse_json_response(raw)
        section = SeoSection(
            heading=section_data.get("heading", plan_item["heading"]),
            heading_level=section_data.get("heading_level", plan_item.get("heading_level", 2)),
            content=section_data.get("content", ""),
        )
        sections.append(section)
        article_context["previous_headings"].append(section.heading)
        
        if callback:
            callback("section_ready", section)
    
    # Phase 3: Generate conclusion
    conclusion_prompt = build_seo_conclusion_prompt(...)
    raw = generate(conclusion_prompt, max_tokens=2048, temperature=0.6,
                   model="claude-sonnet-4-20250514")
    conclusion_data = parse_json_response(raw)
    
    # Assemble final article
    article = SeoArticle(
        metadata=SeoMetadata(**outline["metadata"]),
        h1=outline["h1"],
        introduction=outline["introduction"],
        sections=sections,
        conclusion=conclusion_data["conclusion"],
        summary_points=conclusion_data["summary_points"],
        cta=conclusion_data["cta"],
        estimated_word_count=outline.get("estimated_total_words", 5000),
    )
    
    if callback:
        callback("article_ready", article)
    
    return SkillOutput(text=raw, metadata={"article": article.to_dict()})
```

IMPORTANT implementation notes:
- Use `model="claude-sonnet-4-20250514"` explicitly for SEO. Do NOT use the default 
  Haiku model — it produces inferior long-form content.
- The `generate()` function in `providers/llm.py` already accepts a `model` parameter.
- Each API call uses moderate max_tokens (2048-4096), which is reliable.
- The callback mechanism is optional — if no callback, the skill still works synchronously.
- Keep the old `build_seo_generation_prompt` function (rename to `build_seo_generation_prompt_legacy`) 
  for backward compatibility, but the skill should use the new multi-step approach.

### 3. `neoxra_core/models/seo.py` — Update validation

- Change `MIN_ARTICLE_WORDS = 800` → `MIN_ARTICLE_WORDS = 2000` 
  (we're now targeting 5000 words, minimum acceptable is 2000)
- Keep `MAX_ARTICLE_WORDS = 5000` → change to `MAX_ARTICLE_WORDS = 8000`
  (allow some overshoot)
- In `SeoArticle.__post_init__`, make the actual_word_count validation a WARNING 
  (log it) instead of raising ValueError. Sometimes sections come in slightly short 
  but the article is still usable. Don't reject a 4500-word article because it's 
  under 5000.
- Add `estimated_character_count` default handling for zh-TW (set from actual count 
  if not provided)

### 4. Tests — `tests/test_seo_generation.py`

Update existing tests for the new flow. Add:
- Test that the outline prompt builder produces valid prompt strings
- Test that the section prompt builder includes article context
- Test that SeoArticle accepts articles with 2000-8000 words
- Test that the old MIN_ARTICLE_WORDS=800 no longer applies (now 2000)

DO NOT mock the entire LLM — just test prompt building, model validation, and assembly logic.

## CONSTRAINTS
- Do NOT change any Instagram, Threads, or Facebook code
- Do NOT add new dependencies
- Do NOT change the SkillInput/SkillOutput interfaces
- Keep the callback mechanism simple (a plain callable, not an event system)
- All tests must pass: `pytest -q`
- Python 3.10+
```

### Prompt 2: neoxra (backend + frontend)

```
You are working in the neoxra repo — FastAPI backend + Next.js frontend for an AI content engine.

## CONTEXT
neoxra-core has been updated (PR 1) to generate SEO articles section-by-section instead of 
one-shot. The skill now:
1. Generates an outline + introduction (phase 1)
2. Generates each section individually (phase 2), calling an optional callback after each
3. Generates conclusion (phase 3)
4. Assembles the final article

The callback signature is: `callback(event_name: str, data: dict_or_dataclass)`
Event names: "outline_ready", "section_ready", "article_ready"

## PROBLEM
The frontend currently waits 30-90 seconds seeing only "loading..." with zero feedback. 
The backend generates the entire article, validates it, THEN sends everything at once.

We need to stream sections as they complete so the user sees the article building in real-time.

## BEFORE YOU CHANGE ANYTHING

Read these files first:
- `backend/app/api/seo_routes.py` — current SSE streaming route
- `backend/app/core_client.py` — core client bridge (how backend calls neoxra-core)
- `frontend/app/seo/page.tsx` — SEO studio page
- `frontend/components/SeoArticlePreview.tsx` — article display component
- `frontend/lib/sse.ts` — SSE streaming utility
- `frontend/lib/seo-types.ts` — TypeScript types for SeoArticle
- `frontend/lib/seo-export.ts` — Markdown/HTML export functions

## CHANGES TO MAKE

### 1. `backend/app/api/seo_routes.py` — Stream sections via SSE

Rewrite the `stream()` generator to:

```python
async def stream():
    sections_so_far = []
    outline_data = None
    
    def on_section_ready(event_name, data):
        nonlocal outline_data
        if event_name == "outline_ready":
            outline_data = data
        # Store for later use — actual SSE yielding happens in the main loop
    
    # Use a queue or threading approach to bridge sync callback → async generator
    # Simplest approach: run the synchronous skill in a thread, collect events
    
    import asyncio
    import queue
    
    event_queue = queue.Queue()
    
    def callback(event_name, data):
        if hasattr(data, 'to_dict'):
            data = data.to_dict()
        elif hasattr(data, '__dataclass_fields__'):
            from dataclasses import asdict
            data = asdict(data)
        event_queue.put((event_name, data))
    
    def run_generation():
        try:
            # Call the core client with the callback
            result = core_client.generate_seo_article(
                generation_request=generation_request,
                brief_context={...},
                on_section_ready=callback,
            )
            event_queue.put(("done", result))
        except Exception as exc:
            event_queue.put(("error", str(exc)))
    
    # Run generation in background thread
    loop = asyncio.get_event_loop()
    future = loop.run_in_executor(None, run_generation)
    
    yield _sse("phase_started", {"phase": "outline", "topic": ...})
    
    while True:
        try:
            event_name, data = await asyncio.wait_for(
                loop.run_in_executor(None, lambda: event_queue.get(timeout=2)),
                timeout=120,
            )
        except (asyncio.TimeoutError, Exception):
            # Check if generation thread is done
            if future.done():
                break
            continue
        
        if event_name == "outline_ready":
            yield _sse("outline_ready", data if isinstance(data, dict) else {})
        elif event_name == "section_ready":
            section_dict = data if isinstance(data, dict) else {}
            sections_so_far.append(section_dict)
            yield _sse("section_ready", section_dict)
        elif event_name == "article_ready":
            article_dict = data if isinstance(data, dict) else {}
            yield _sse("article_ready", article_dict)
        elif event_name == "done":
            # Final assembled article
            article = data
            validated, had_retry = validate_result(article)
            yield _sse("pipeline_completed", {"article": validated, ...})
            break
        elif event_name == "error":
            yield _sse("error", {"message": str(data)})
            break
```

The key insight: the neoxra-core skill runs synchronously (it calls `generate()` which is 
synchronous). So we run it in a thread executor and use a queue to bridge sync callbacks 
to the async SSE generator.

If this threading approach feels too complex, a simpler alternative:
- Just call the core client synchronously in a thread
- Wait for the full result
- But yield the initial "phase_started" event immediately
- Then yield the assembled article

Even this simpler approach is better than current because we can increase the timeout 
and the skill now uses Sonnet model with proper word counts.

### 2. `backend/app/core_client.py` — Pass callback through

Update the `generate_seo_article()` method to accept and pass through an `on_section_ready` 
callback parameter to the underlying skill. If the core client is in "local" mode (using 
neoxra-core directly), pass the callback. If remote/API mode, ignore it.

### 3. `frontend/lib/sse.ts` — Increase timeout

Change the default timeout from 45_000 to 120_000:
```typescript
timeoutMs: signalOrOptions?.timeoutMs ?? 120_000,
```

### 4. `frontend/app/seo/page.tsx` — Handle section streaming

Update the SSE event handling:

```typescript
// Increase timeout
timeoutMs: 180_000,  // 3 minutes for long article generation

// Add section streaming state
const [streamedSections, setStreamedSections] = useState<SeoSection[]>([])

// In the SSE loop:
if (chunk.event === 'outline_ready') {
  setStatus('streaming')
  // Optionally set article metadata early
  const outline = chunk.data
  if (outline?.h1) {
    setArticle(prev => ({ ...prev, h1: outline.h1, introduction: outline.introduction || '' }))
  }
  continue
}
if (chunk.event === 'section_ready') {
  const section = chunk.data as SeoSection
  setStreamedSections(prev => [...prev, section])
  // Update the article preview incrementally
  setArticle(prev => ({
    ...prev,
    sections: [...(prev.sections || []), section],
  }))
  continue
}
if (chunk.event === 'article_ready') {
  setArticle(chunk.data as SeoArticle)
  setStreamedSections([])
  setStatus('streaming')
  continue
}
```

### 5. `frontend/components/SeoArticlePreview.tsx` — Show streaming state

Add a "generating..." indicator at the bottom of the sections list when streaming is active. 
The component already renders sections in order — it just needs to show a loading indicator 
for the next section being generated.

Add an optional `isStreaming` prop:
```typescript
interface Props {
  article: SeoArticle
  isStreaming?: boolean
}

// At the bottom of the sections list:
{isStreaming && (
  <div className="flex items-center gap-3 py-6 text-sm text-[var(--text-tertiary)]">
    <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--border-bold)] border-t-[var(--text-primary)]" />
    {language === 'zh-TW' ? '正在生成下一段...' : 'Generating next section...'}
  </div>
)}
```

### 6. `frontend/app/seo/page.tsx` — Pass streaming prop

```tsx
<SeoArticlePreview article={article} isStreaming={status === 'streaming'} />
```

## CONSTRAINTS
- Do NOT change any Instagram, Threads, or Facebook code
- Do NOT change the landing page
- Do NOT change any rendering/carousel/overlay code
- The SSE protocol must remain backward-compatible (old events still work)
- `npm run build` must pass
- All backend tests must still pass
- If the threading approach for streaming sections is too complex, fall back to the 
  simpler approach: just run the full generation in a thread, increase the timeout to 
  180 seconds, and send the complete article at the end. The key improvement is still 
  the neoxra-core changes (Sonnet model, section-by-section, 5000 words).
```

---

## PART 7 — Public Beta Readiness

### After the SEO fix, what "good enough for public beta" means:

**Must work:**
- SEO article generation produces 3000-5000 word articles reliably
- Articles are copy-ready for WordPress/Medium (Markdown + HTML export)
- Generation feels reliable (streaming progress, no random failures)
- Works in both en and zh-TW
- The /seo page is usable by a non-technical person
- The landing page communicates "traffic infrastructure" not "content tool"

**Can remain imperfect:**
- Instagram rendering can be slow or require manual template upload
- Threads and Facebook output can be basic (short-form is easier to edit manually)
- No user accounts or saved history (demo mode is fine)
- No scheduling or auto-publishing
- No analytics dashboard
- Design can be functional, not polished

**Must work before YC / Antler / Techstars:**
- One demo flow that is genuinely impressive: Idea → 5000-word SEO article in 2 minutes
- The article is good enough that a founder would consider publishing it
- A clear expansion story: "This is one surface. We're adding YouTube, Red Note, LinkedIn..."
- Working law firm demo (/demo/legal) showing vertical customization via voice profiles
- The product feels like infrastructure, not a toy

### Recommended demo flow for investors:
1. Enter a topic ("車禍理賠流程" or "How to negotiate a lease renewal")
2. Watch sections stream in real-time (impressive + shows system thinking)
3. Final article: 5000 words, perfect SEO structure, copy-ready
4. One click → Markdown copy → paste into WordPress
5. "This is one distribution surface. Every new platform, language, and region we add is a new market."

---

## Execution order

```
PR 1 → neoxra-core (section-by-section generation, Sonnet model, 5000-word target)
PR 2 → neoxra backend + frontend (streaming, timeout fixes, incremental display)
```

PR 1 is independent. PR 2 depends on PR 1.
Total estimated time: PR 1 = 30-45 min Claude Code, PR 2 = 30-45 min Claude Code.
