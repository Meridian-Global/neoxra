# Issue-Driven Execution Plan

---

## A. Issue Diagnosis

### Issue 1: [BUG] Generate All fails on SEO and Facebook outputs

**Likely root causes (3 distinct failure modes):**

1. **SEO: Word count validation kills Chinese articles.** The `_word_count()` function in `neoxra_core/models/seo.py` line 77 uses the regex `\b[\w'-]+\b` to count words. This regex counts *English* words (space-delimited tokens). Chinese text has no spaces between characters, so a 2000-character Chinese article might register as ~50 "words" (only catching any romanized terms or numbers). The validation on lines 158-163 then raises `ValueError("article body must be 1200-2000 words, got 50")` and the entire SEO generation fails. This is the **primary root cause** for SEO failure under zh-TW.

2. **SEO: Strict title/meta length validation.** The model requires title to be exactly 50-60 characters and meta description to be exactly 150-160 characters (lines 90-100). The LLM frequently misses these narrow windows, especially in Chinese where character counting behavior differs from English. A 61-character title or 149-character meta description throws `ValueError` in `SeoMetadata.__post_init__()`.

3. **Facebook: Overly strict post-generation validation.** The `_validate_adapter_output()` function in `facebook_adapter.py` lines 26-59 requires: (a) Facebook body must be longer than Instagram caption, (b) `share_hook` must contain one of a hardcoded list of identity markers, (c) `discussion_prompt` must end with `?` or `？` and must not be generic. The LLM often generates content that fails one of these rules, but there is **no retry at the skill level** — the ValueError propagates directly to `_run_platform()` in unified_routes.py and the platform is marked as failed.

4. **Both: Retry logic doesn't catch skill-internal validation errors.** The `_generate_validated_platform()` function in `unified_routes.py` lines 236-250 retries when `_validate_platform_output()` fails (the outer Pydantic validation). But when the error is thrown *inside* the skill's `run()` method (model `__post_init__` or `_validate_adapter_output`), it surfaces as an exception from `generate_content()` itself — which the retry logic doesn't wrap. The exception bubbles to `_run_platform()` and the platform fails without retry.

**Affected repos:** `neoxra-core` (models, skills), `neoxra` (backend unified_routes)

**Affected files:**
- `neoxra-core/neoxra_core/models/seo.py` — `_word_count()`, `SeoArticle.__post_init__()`, `SeoMetadata.__post_init__()`
- `neoxra-core/neoxra_core/skills/seo_generation.py` — no error handling around `_build_article()`
- `neoxra-core/neoxra_core/skills/facebook_adapter.py` — `_validate_adapter_output()` with no retry
- `neoxra-core/neoxra_core/models/facebook.py` — `FacebookPost.__post_init__()` strict rules
- `neoxra/backend/app/api/unified_routes.py` — `_generate_validated_platform()` doesn't wrap generation errors
- `neoxra/backend/app/core/output_validation.py` — double validation layer

**User-facing impact:** Critical. The core product promise — "one input, four outputs" — breaks. Users see 2 out of 4 platforms fail.

**Technical risk:** Low. The fixes are targeted: fix word counting for Chinese, widen validation tolerances, add retry wrapping.

**Recommended priority:** P0 — fix immediately.

---

### Issue 2: [I18N] Enforce Traditional Chinese output for all generated content under zh-TW locale

**Likely root cause:**

Locale flows through the backend agent layer correctly (planner, instagram, threads, linkedin agents all call `locale_instruction()` and append it to prompts). But when the backend calls **neoxra-core skills** via the core client, locale is **not propagated to the prompt builders**:

- `build_instagram_generation_prompt()` — no locale parameter
- `build_seo_generation_prompt()` — no locale parameter
- `build_threads_generation_prompt()` — no locale parameter
- `build_facebook_generation_prompt()` — no locale parameter

The skills receive English-only prompt instructions like "Generate complete, high-quality Instagram content..." and the LLM decides on its own whether to output Chinese or English based on the brief context (which is Chinese because the planner generated it in Chinese). This causes **code-switching** — output that mixes English structural elements with Chinese content, or occasionally produces entirely English output for some platforms.

Additionally, `local.py` lines 240-251: `generate_threads_content()` does not pass locale into the skill context at all. Same for `generate_seo_article()` (lines 192-206) and `generate_facebook_content()` (lines 270-292).

**Affected repos:** `neoxra-core` (all prompt builders, all skills), `neoxra` (core_client/local.py)

**Affected files:**
- `neoxra-core/neoxra_core/prompts/instagram_generation.py`
- `neoxra-core/neoxra_core/prompts/seo_generation.py`
- `neoxra-core/neoxra_core/prompts/threads_generation.py`
- `neoxra-core/neoxra_core/prompts/facebook_generation.py`
- `neoxra-core/neoxra_core/skills/instagram_generation.py`
- `neoxra-core/neoxra_core/skills/seo_generation.py`
- `neoxra-core/neoxra_core/skills/threads_generation.py`
- `neoxra-core/neoxra_core/skills/facebook_adapter.py`
- `neoxra-core/neoxra_core/pipeline/seo.py`
- `neoxra/backend/app/core_client/local.py`

**User-facing impact:** High. Under zh-TW, users see inconsistent language — some sections in Chinese, some in English, some mixed. This is unacceptable for the law firm client and any Taiwan-market demo.

**Technical risk:** Low. Adding a locale parameter and appending a language instruction to each prompt is straightforward.

**Recommended priority:** P0 — fix alongside Issue 1 (same files touched).

---

### Issue 3: [I18N] Fix incomplete Traditional Chinese translations in UI

**Likely root cause:**

The frontend pages have inconsistent i18n implementation:

1. **Landing page (`page.tsx`):** Properly uses `useLanguage()` hook and has full bilingual `COPY` object. This page works correctly.

2. **Generate page (`generate/page.tsx`):** Hardcodes `locale: 'zh-TW'` in the API request (line 249). All UI labels are hardcoded in Chinese (lines 21-39). Does not use `useLanguage()`. No English translation available.

3. **Instagram page (`instagram/page.tsx`):** All UI strings are hardcoded in Chinese. PRESET_TOPICS, GOAL_OPTIONS, ACCESS_COPY, button labels — all zh-TW only. Does not use `useLanguage()`.

4. **PageComingSoonBadge** on landing page hardcodes "即將推出" without checking language.

5. **Nav/GlobalNav:** Mix of English and Chinese strings depending on context.

6. The `LanguageProvider` exists and works, but most pages don't consume it.

**Affected repo:** `neoxra` (frontend only)

**Affected files:**
- `frontend/app/generate/page.tsx`
- `frontend/app/instagram/page.tsx`
- `frontend/app/threads/page.tsx`
- `frontend/app/seo/page.tsx`
- `frontend/app/facebook/page.tsx`
- `frontend/components/GlobalNav.tsx`

**User-facing impact:** Medium. Users who toggle to English see a mix of English and Chinese. The law firm client (zh-TW) isn't affected, but YC demos in English will look unprofessional.

**Technical risk:** Low. String extraction and translation.

**Recommended priority:** P1 — fix after reliability issues.

---

### Issue 4: [SEO] Increase article length to 2000+ Chinese characters minimum

**Likely root cause (3 factors):**

1. **`_word_count()` is English-only.** Same root cause as Issue 1. The regex `\b[\w'-]+\b` does not count Chinese characters. A Chinese article that should pass the length check fails because the counter returns a near-zero value. The fix for Issue 1 (making word count CJK-aware) will also fix this — but the target needs to change from "1200-2000 words" to "2000+ Chinese characters" for zh-TW.

2. **max_tokens=4096 may be too low for long Chinese articles.** Chinese text uses more tokens per character than English in most tokenizers. A 2000-character Chinese article might require 3000-4000 tokens just for the article body, plus the JSON structure overhead. The current 4096 limit (in `seo_generation.py` line 67) might truncate output.

3. **The prompt says "1200-2000 words" with no Chinese-specific guidance.** The SEO prompt builder (`prompts/seo_generation.py` line 55) says "Total article body must be 1200-2000 words." When the LLM generates Chinese text, it interprets "1200 words" ambiguously — sometimes as 1200 characters, sometimes as much less. The prompt needs explicit Chinese character count targets when locale is zh-TW.

**Affected repos:** `neoxra-core` (models, prompts, skills)

**Affected files:**
- `neoxra-core/neoxra_core/models/seo.py` — `_word_count()`, MIN/MAX constants, validation
- `neoxra-core/neoxra_core/prompts/seo_generation.py` — length instructions
- `neoxra-core/neoxra_core/skills/seo_generation.py` — max_tokens setting

**User-facing impact:** High. Short articles are not publishable. The law firm client needs substantial content.

**Technical risk:** Low-medium. Need to handle the word/character count distinction carefully for CJK vs Latin text.

**Recommended priority:** P0 — tightly coupled with Issue 1 fix.

---

### Issue 5: [LANDING] Clarify brand narrative around "Turn Ideas Into Traffic"

**Likely root cause:**

The current landing page is functional and bilingual, but has positioning gaps:

1. **No explanation of the name "Neoxra."** The brand etymology (Neo = new, xra from orchestra, user = conductor, agents = musicians) is absent. This is a missed opportunity for memorability.

2. **The subtitle is too generic.** "Not generic text generation, but structured, strategic, platform-native content" — this could describe 50 tools. It doesn't land the *one thing* Neoxra does sharply enough.

3. **"Coming soon" labels weaken credibility.** Articles and LinkedIn are marked "coming soon" but Articles/SEO is now live. The platform grid needs updating.

4. **No "how is this different from ChatGPT" moment.** The page doesn't explicitly address the comparison every visitor will make.

5. **The orchestra metaphor is absent.** The system design has a compelling metaphor (conductor → musicians → performance) that isn't reflected in the product story.

**Affected repo:** `neoxra` (frontend only)

**Affected files:**
- `frontend/app/page.tsx` — COPY object, hero section, page structure

**User-facing impact:** Medium. Affects first impressions, YC reviewers, and investor/client conversations.

**Technical risk:** Zero. Copy changes only.

**Recommended priority:** P2 — do after reliability and i18n are fixed.

---

## B. Task Backlog

### Issue 1: Generate All Reliability
```
[BUG] Fix _word_count() to support CJK character counting | core, models | 5
[BUG] Widen SeoMetadata title validation from 50-60 to 40-70 characters | core, models | 1
[BUG] Widen SeoMetadata meta_description validation from 150-160 to 120-180 characters | core, models | 1
[BUG] Add try/except with retry inside SeoGenerationSkill.run() for model validation errors | core, skills | 3
[BUG] Add try/except with retry inside FacebookAdapterSkill.run() for validation errors | core, skills | 3
[BUG] Soften Facebook share_hook identity marker validation to warning instead of hard failure | core, skills | 2
[BUG] Soften Facebook body-length-vs-caption comparison for CJK content | core, skills | 2
[BUG] Wrap _generate_validated_platform() to catch generation-level exceptions and retry | backend, api | 3
[BUG] Add structured error context to platform_error SSE events (include failure reason category) | backend, api | 3
[BUG] Write unit tests for CJK-aware word count function | core, tests | 2
[BUG] Write unit tests for widened SEO validation ranges | core, tests | 2
[BUG] Write integration test for Generate All with zh-TW locale (mock LLM, verify no crash) | backend, tests | 3
```

### Issue 2: Content Language Enforcement
```
[I18N] Add locale parameter to build_seo_generation_prompt() | core, prompts | 2
[I18N] Add locale parameter to build_instagram_generation_prompt() | core, prompts | 2
[I18N] Add locale parameter to build_threads_generation_prompt() | core, prompts | 2
[I18N] Add locale parameter to build_facebook_generation_prompt() | core, prompts | 2
[I18N] Add locale-aware language instruction block to all 4 prompt builders | core, prompts | 3
[I18N] Pass locale from skill context to prompt builder in InstagramGenerationSkill | core, skills | 2
[I18N] Pass locale from skill context to prompt builder in SeoGenerationSkill | core, skills | 2
[I18N] Pass locale from skill context to prompt builder in ThreadsGenerationSkill | core, skills | 2
[I18N] Pass locale from skill context to prompt builder in FacebookAdapterSkill | core, skills | 2
[I18N] Pass locale to SeoPipeline.run() and forward to skill | core, pipeline | 2
[I18N] Pass locale to all skill contexts in LocalCoreClient (threads, seo, facebook) | backend, core_client | 3
[I18N] Write unit test verifying each prompt builder includes zh-TW instruction when locale is zh-TW | core, tests | 3
```

### Issue 3: UI Translation Cleanup
```
[I18N] Extract hardcoded Chinese strings in generate/page.tsx to bilingual COPY object | frontend, i18n | 5
[I18N] Extract hardcoded Chinese strings in instagram/page.tsx to bilingual COPY object | frontend, i18n | 5
[I18N] Extract hardcoded Chinese strings in threads/page.tsx to bilingual COPY object (if needed) | frontend, i18n | 3
[I18N] Extract hardcoded Chinese strings in seo/page.tsx to bilingual COPY object (if needed) | frontend, i18n | 3
[I18N] Extract hardcoded Chinese strings in facebook/page.tsx to bilingual COPY object (if needed) | frontend, i18n | 3
[I18N] Wire useLanguage() hook into generate/page.tsx | frontend, i18n | 2
[I18N] Wire useLanguage() hook into instagram/page.tsx | frontend, i18n | 2
[I18N] Pass dynamic locale from LanguageProvider to API requests instead of hardcoded 'zh-TW' | frontend, i18n | 3
[I18N] Audit and fix GlobalNav for bilingual consistency | frontend, i18n | 2
[I18N] Fix PageComingSoonBadge to use language-aware text | frontend, i18n | 1
```

### Issue 4: SEO Article Length
```
[SEO] Update SEO prompt to specify 2000+ Chinese characters when locale is zh-TW | core, prompts | 3
[SEO] Increase max_tokens from 4096 to 6144 for SEO generation | core, skills | 1
[SEO] Make MIN_ARTICLE_WORDS / MAX_ARTICLE_WORDS locale-aware (characters for CJK, words for Latin) | core, models | 3
[SEO] Update SEO validation to accept 2000-4000 characters for zh-TW articles | core, models | 2
[SEO] Add estimated_character_count field to SeoArticle for CJK locales | core, models | 2
[SEO] Test SEO generation produces 2000+ character articles in zh-TW | core, tests | 3
```

### Issue 5: Landing Page Narrative
```
[LANDING] Rewrite hero subtitle to be sharper and more differentiated | frontend, copy | 3
[LANDING] Add orchestra metaphor section (conductor/musicians/performance) | frontend, copy | 3
[LANDING] Add "Why not just use ChatGPT?" section or callout | frontend, copy | 3
[LANDING] Update platform grid: mark SEO/Articles as live, add Facebook, remove LinkedIn for now | frontend, copy | 2
[LANDING] Update use cases section to reflect current verticals | frontend, copy | 2
[LANDING] Add brand etymology tooltip or subtle explanation for "Neoxra" | frontend, copy | 2
[LANDING] Add "Generate All" CTA alongside Instagram Studio CTA | frontend, copy | 1
[LANDING] Review and finalize English copy for YC-friendliness | frontend, copy | 3
```

**Total: 55 tasks**

---

## C. PR Plan

### PR 1 — Fix Generate All Reliability: SEO + Facebook
**Related issues:** Issue 1, Issue 4
**PR title:** `fix: make SEO and Facebook generation reliable under zh-TW`
**Target repo:** `neoxra-core`

**Included tasks:**
- [BUG] Fix _word_count() to support CJK character counting
- [BUG] Widen SeoMetadata title validation from 50-60 to 40-70 characters
- [BUG] Widen SeoMetadata meta_description validation from 150-160 to 120-180 characters
- [BUG] Add try/except with retry inside SeoGenerationSkill.run() for model validation errors
- [BUG] Add try/except with retry inside FacebookAdapterSkill.run() for validation errors
- [BUG] Soften Facebook share_hook identity marker validation to warning instead of hard failure
- [BUG] Soften Facebook body-length-vs-caption comparison for CJK content
- [SEO] Increase max_tokens from 4096 to 6144 for SEO generation
- [SEO] Make MIN_ARTICLE_WORDS / MAX_ARTICLE_WORDS locale-aware (characters for CJK, words for Latin)
- [SEO] Update SEO validation to accept 2000-4000 characters for zh-TW articles
- [BUG] Write unit tests for CJK-aware word count function
- [BUG] Write unit tests for widened SEO validation ranges

**Why these belong together:** All are neoxra-core model and skill fixes that directly cause the Generate All failure. The SEO word count fix and the SEO length increase (Issue 4) share the same `_word_count()` function and `SeoArticle` model — they must ship together.

**Dependencies:** None.

**Visible result after merge:** SEO and Facebook skills no longer crash on zh-TW input. `pytest` passes with new CJK-aware tests.

**Acceptance checklist:**
- [ ] `_word_count("這是一篇測試文章")` returns 8 (not 0)
- [ ] `SeoArticle` with 2500 Chinese characters passes validation
- [ ] `SeoMetadata` with 45-character title no longer crashes
- [ ] `FacebookAdapterSkill.run()` retries once on validation failure before raising
- [ ] `SeoGenerationSkill.run()` retries once on model validation failure before raising
- [ ] Facebook share_hook without identity markers returns content with warning, not crash
- [ ] All existing tests pass
- [ ] New CJK word count tests pass

---

### PR 2 — Fix Generate All Retry Logic in Backend
**Related issues:** Issue 1
**PR title:** `fix: wrap generation errors in retry logic for unified pipeline`
**Target repo:** `neoxra`

**Included tasks:**
- [BUG] Wrap _generate_validated_platform() to catch generation-level exceptions and retry
- [BUG] Add structured error context to platform_error SSE events (include failure reason category)
- [BUG] Write integration test for Generate All with zh-TW locale (mock LLM, verify no crash)

**Why these belong together:** Backend-side fixes to the unified_routes error handling. Requires PR 1 to be merged first (otherwise the retry would just fail twice with the same broken validation).

**Dependencies:** PR 1.

**Visible result after merge:** Generate All no longer shows "GENERATION_FAILED" for SEO and Facebook. Error events include reason categories (e.g., `"reason": "validation_failed"` vs `"reason": "llm_error"`).

**Acceptance checklist:**
- [ ] `_generate_validated_platform()` catches exceptions from inside `generate_content()` lambda and retries once
- [ ] SSE `platform_error` events include `reason` field
- [ ] Integration test: mock all LLM calls with valid zh-TW JSON → all 4 platforms succeed
- [ ] Integration test: mock SEO LLM returning invalid JSON → retry triggers → still fails gracefully (not crash)
- [ ] All existing backend tests pass

---

### PR 3 — Enforce zh-TW in All Core Prompt Builders
**Related issues:** Issue 2
**PR title:** `feat: propagate locale to all prompt builders and enforce output language`
**Target repo:** `neoxra-core`

**Included tasks:**
- [I18N] Add locale parameter to build_seo_generation_prompt()
- [I18N] Add locale parameter to build_instagram_generation_prompt()
- [I18N] Add locale parameter to build_threads_generation_prompt()
- [I18N] Add locale parameter to build_facebook_generation_prompt()
- [I18N] Add locale-aware language instruction block to all 4 prompt builders
- [I18N] Pass locale from skill context to prompt builder in InstagramGenerationSkill
- [I18N] Pass locale from skill context to prompt builder in SeoGenerationSkill
- [I18N] Pass locale from skill context to prompt builder in ThreadsGenerationSkill
- [I18N] Pass locale from skill context to prompt builder in FacebookAdapterSkill
- [I18N] Pass locale to SeoPipeline.run() and forward to skill
- [I18N] Write unit test verifying each prompt builder includes zh-TW instruction when locale is zh-TW

**Why these belong together:** This is one cohesive change: adding locale awareness to the entire neoxra-core generation layer. Every prompt builder and every skill needs the same pattern applied.

**Dependencies:** None (can run in parallel with PR 1 if files don't conflict, but recommend after PR 1 since SEO skill is touched in both).

**Visible result after merge:** When locale is zh-TW, every prompt sent to the LLM includes an explicit instruction block like: "You MUST write ALL content in Traditional Chinese (繁體中文). Do not mix languages. Do not use English unless the term has no standard Chinese equivalent."

**Acceptance checklist:**
- [ ] `build_seo_generation_prompt(topic="...", brief_context={}, locale="zh-TW")` includes Chinese language instruction
- [ ] `build_instagram_generation_prompt(topic="...", ..., locale="zh-TW")` includes Chinese language instruction
- [ ] `build_threads_generation_prompt(topic="...", ..., locale="zh-TW")` includes Chinese language instruction
- [ ] `build_facebook_generation_prompt(..., locale="zh-TW")` includes Chinese language instruction
- [ ] `build_seo_generation_prompt(topic="...", brief_context={}, locale="en")` does NOT include Chinese instruction
- [ ] Each skill extracts locale from `input.context.get("locale", "en")` and passes to prompt builder
- [ ] `SeoPipeline.run()` accepts locale kwarg and passes to skill context
- [ ] All unit tests pass

---

### PR 4 — Wire Locale Through Backend Core Client
**Related issues:** Issue 2
**PR title:** `fix: pass locale to all platform skill contexts in LocalCoreClient`
**Target repo:** `neoxra`

**Included tasks:**
- [I18N] Pass locale to all skill contexts in LocalCoreClient (threads, seo, facebook)

**Why this is separate:** This is a backend change that depends on PR 3 (the core skills must accept locale before the backend can pass it). Small, focused, low-risk.

**Dependencies:** PR 3.

**Visible result after merge:** All platforms in Generate All produce consistent Traditional Chinese output when locale is zh-TW.

**Acceptance checklist:**
- [ ] `generate_threads_content()` passes `locale` in skill context
- [ ] `generate_seo_article()` passes `locale` to `SeoPipeline.run()` (or to brief_context)
- [ ] `generate_facebook_content()` passes `locale` in skill context
- [ ] Manual test: run Generate All with zh-TW → all 4 outputs are in Traditional Chinese

---

### PR 5 — SEO Article Length for Chinese
**Related issues:** Issue 4
**PR title:** `feat: enforce 2000+ Chinese character minimum for zh-TW SEO articles`
**Target repo:** `neoxra-core`

**Included tasks:**
- [SEO] Update SEO prompt to specify 2000+ Chinese characters when locale is zh-TW
- [SEO] Add estimated_character_count field to SeoArticle for CJK locales
- [SEO] Test SEO generation produces 2000+ character articles in zh-TW

**Why these belong together:** Prompt tuning + model update + test for the Chinese article length requirement. Depends on PR 1 (CJK word count fix) and PR 3 (locale in prompt builder).

**Dependencies:** PR 1 + PR 3.

**Visible result after merge:** SEO articles generated with zh-TW locale contain 2000+ Chinese characters, verified by test.

**Acceptance checklist:**
- [ ] SEO prompt includes "文章正文至少 2000 個中文字" when locale is zh-TW
- [ ] `SeoArticle` model has optional `estimated_character_count` field
- [ ] Validation for zh-TW: character count ≥ 2000 (not word count)
- [ ] Test with mocked LLM returning 2500-char Chinese article → passes validation
- [ ] Test with mocked LLM returning 800-char Chinese article → fails validation

---

### PR 6 — Frontend i18n Cleanup
**Related issues:** Issue 3
**PR title:** `fix: complete bilingual UI strings across all pages`
**Target repo:** `neoxra`

**Included tasks:**
- [I18N] Extract hardcoded Chinese strings in generate/page.tsx to bilingual COPY object
- [I18N] Extract hardcoded Chinese strings in instagram/page.tsx to bilingual COPY object
- [I18N] Extract hardcoded Chinese strings in threads/page.tsx to bilingual COPY object (if needed)
- [I18N] Extract hardcoded Chinese strings in seo/page.tsx to bilingual COPY object (if needed)
- [I18N] Extract hardcoded Chinese strings in facebook/page.tsx to bilingual COPY object (if needed)
- [I18N] Wire useLanguage() hook into generate/page.tsx
- [I18N] Wire useLanguage() hook into instagram/page.tsx
- [I18N] Pass dynamic locale from LanguageProvider to API requests instead of hardcoded 'zh-TW'
- [I18N] Audit and fix GlobalNav for bilingual consistency
- [I18N] Fix PageComingSoonBadge to use language-aware text

**Why these belong together:** All are frontend string extraction and i18n wiring. No backend changes. One reviewer can check all translations.

**Dependencies:** None strictly, but PR 4 should be done first so locale from the frontend actually affects generation output.

**Visible result after merge:** Toggle language to English → every page shows English UI. Toggle to zh-TW → every page shows Chinese UI. API requests use the selected locale dynamically.

**Acceptance checklist:**
- [ ] generate/page.tsx uses `useLanguage()` and renders all labels in selected language
- [ ] instagram/page.tsx uses `useLanguage()` and renders all labels in selected language
- [ ] Preset topics, goal options, button labels, error messages all have English translations
- [ ] API request payloads use `language` from LanguageProvider (not hardcoded 'zh-TW')
- [ ] GlobalNav is consistent in both languages
- [ ] "Coming soon" badges show correct language
- [ ] No visible Chinese strings when language is set to English

---

### PR 7 — Landing Page Brand Narrative
**Related issues:** Issue 5
**PR title:** `feat: sharpen homepage positioning around Turn Ideas Into Traffic`
**Target repo:** `neoxra`

**Included tasks:**
- [LANDING] Rewrite hero subtitle to be sharper and more differentiated
- [LANDING] Add orchestra metaphor section (conductor/musicians/performance)
- [LANDING] Add "Why not just use ChatGPT?" section or callout
- [LANDING] Update platform grid: mark SEO/Articles as live, add Facebook, remove LinkedIn for now
- [LANDING] Update use cases section to reflect current verticals
- [LANDING] Add brand etymology tooltip or subtle explanation for "Neoxra"
- [LANDING] Add "Generate All" CTA alongside Instagram Studio CTA
- [LANDING] Review and finalize English copy for YC-friendliness

**Why these belong together:** All copy and positioning changes to the landing page. No logic changes. One review pass.

**Dependencies:** None. Can run in parallel with everything.

**Visible result after merge:** Homepage has a sharper pitch, updated platform grid (no more "coming soon" on live features), orchestra metaphor woven into the product story, and a "not ChatGPT" differentiation callout.

**Acceptance checklist:**
- [ ] Hero subtitle is ≤ 2 sentences and immediately clear
- [ ] Orchestra metaphor appears as a brief section or visual (conductor → agents → traffic)
- [ ] "Why not ChatGPT?" is addressed in 3-4 lines (not an essay)
- [ ] Platform grid shows: Instagram (live), SEO (live), Threads (live), Facebook (live)
- [ ] "Generate All" CTA button is visible in hero section
- [ ] Brand etymology is present but subtle (tooltip, footnote, or one-liner)
- [ ] English copy reads naturally for a US/YC audience
- [ ] zh-TW copy updated in parallel

---

## D. Codex Prompts

### PR 1 — Fix Generate All Reliability: SEO + Facebook

```
## Goal
Fix the SEO and Facebook generation failures in neoxra-core that cause Generate All to break under zh-TW locale.

## Context
- Repo: neoxra-core
- The Generate All feature fails on SEO and Facebook outputs. Root causes are in validation logic.
- The _word_count() function at neoxra_core/models/seo.py line 77 uses regex `\b[\w'-]+\b` which only counts English words. Chinese text returns near-zero, causing SeoArticle.__post_init__() to crash.
- SeoMetadata validates title at exactly 50-60 chars and meta at 150-160 chars — too strict for LLM output.
- FacebookAdapterSkill at neoxra_core/skills/facebook_adapter.py has validation that crashes without retry.

## What to fix

### 1. Fix _word_count() in neoxra_core/models/seo.py (line 77)
Replace the current function with a CJK-aware version:
```python
def _word_count(text: str) -> int:
    """Count words for Latin text, characters for CJK text."""
    import unicodedata
    cjk_chars = sum(1 for ch in text if unicodedata.category(ch).startswith(('Lo',)))
    latin_words = len(re.findall(r"\b[a-zA-Z'-]+\b", text))
    # For mixed text: CJK characters count as individual units, Latin words count as words
    return cjk_chars + latin_words
```

### 2. Widen validation in SeoMetadata.__post_init__() (lines 89-100)
- Change title validation from `50 <= len <= 60` to `20 <= len <= 80`
- Change meta_description from `150 <= len <= 160` to `80 <= len <= 200`
- Do the same in the _SeoMetadataPayload Pydantic validators (lines 26-37)
- The prompt still asks for 50-60 / 150-160, but validation tolerates LLM variance

### 3. Widen validation in SeoArticle.__post_init__() (lines 139-163)
- Change MIN_ARTICLE_WORDS to 800 and MAX_ARTICLE_WORDS to 5000
- This is intentionally wide to stop crashes. Quality enforcement stays in the prompt.
- The actual_word_count check (line 158-163) should use the new _word_count() which now handles CJK

### 4. Add retry in SeoGenerationSkill.run() (neoxra_core/skills/seo_generation.py)
- Wrap the `_build_article()` and `SeoArticle(...)` construction in a try/except ValueError
- On first failure: log warning, call generate() again with a repair prompt: "Your previous response failed validation: {error}. Please fix and return valid JSON only."
- On second failure: raise the error

### 5. Add retry in FacebookAdapterSkill.run() (neoxra_core/skills/facebook_adapter.py)
- Wrap `_validate_adapter_output()` call (line 85) in try/except ValueError
- On first failure: log warning, call generate() again with same prompt
- On second failure: return the post WITHOUT the validation that failed, adding a "warning" key to metadata
- Specifically: if share_hook identity check fails, don't crash — include the content with metadata["warnings"] = ["share_hook_identity_not_detected"]
- If body-length check fails for CJK (where character counting differs), skip that check

### 6. Increase max_tokens in SeoGenerationSkill (line 67)
- Change from `max_tokens=4096` to `max_tokens=6144`

### 7. Write tests in tests/test_seo_models.py
- Test _word_count() with pure Chinese text: "這是測試" → should return 4
- Test _word_count() with mixed text: "這是test文章" → should return 4 (CJK) + 1 (Latin) = 5
- Test _word_count() with pure English: "this is a test" → should return 4
- Test SeoMetadata with 45-char title → should NOT raise
- Test SeoMetadata with 15-char title → should raise
- Test SeoArticle with 2500-char Chinese content → should pass validation

### 8. Write tests in tests/test_facebook_models.py
- Test FacebookPost with share_hook missing identity markers → should NOT crash (after fix)

## Constraints
- Do NOT change the prompt content (that's PR 3 and PR 5)
- Do NOT change the core client or backend (that's PR 2 and PR 4)
- Keep all existing tests passing
- Keep all model field names the same (backward compatible)

## Output
Summarize: which files changed, what each change does, how to run tests to verify.
```

---

### PR 2 — Fix Generate All Retry Logic in Backend

```
## Goal
Fix the backend retry logic so that generation-level errors (not just validation errors) are caught and retried in the unified pipeline.

## Context
- Repo: neoxra
- File: backend/app/api/unified_routes.py
- The `_generate_validated_platform()` function (lines 236-250) wraps `generate_content()` and retries on `ValueError` from `_validate_platform_output()`.
- BUT: if `generate_content()` itself throws (because the neoxra-core skill crashes internally), the error is NOT retried — it propagates directly to `_run_platform()` and the platform fails.
- After PR 1, the core skills have their own retry logic, but the backend should ALSO be resilient.

## What to fix

### 1. Update _generate_validated_platform() (lines 236-250)
- Move the try/except to wrap BOTH `generate_content()` AND `_validate_platform_output()`
- On any Exception (not just ValueError) from `generate_content()`:
  - Log the error with platform name and error message
  - Retry once
  - On second failure: return `{"error": True, "stage": platform, "message": str(exc), "partial": last_content}`

```python
def _generate_validated_platform(platform: str, generate_content) -> dict[str, object]:
    last_content = None
    last_error = None
    for attempt in range(2):
        try:
            content = generate_content()
            last_content = content
            return _validate_platform_output(platform, content)
        except Exception as exc:
            last_error = exc
            if attempt == 0:
                logger.warning(
                    "unified %s generation/validation failed (attempt 1); retrying: %s",
                    platform, str(exc)[:200]
                )
                continue
            logger.exception("unified %s failed after retry", platform)
    
    partial = dict(last_content or {})
    partial["warning"] = f"Output did not pass validation after retry: {str(last_error)[:200]}"
    return partial
```

### 2. Enrich platform_error SSE events (lines 451-464)
- Add `"reason"` field to error payload:
  - If exc is ValueError: reason = "validation_failed"
  - If exc is json.JSONDecodeError: reason = "malformed_response"
  - If exc is ConnectionError/TimeoutError: reason = "llm_unavailable"
  - Otherwise: reason = "generation_failed"

### 3. Write integration test (backend/tests/test_unified_pipeline.py)
- Test that when generate_content() raises ValueError, retry is triggered
- Test that when generate_content() raises RuntimeError, retry is triggered
- Test that after 2 failures, partial content with warning is returned (not crash)
- Test that platform_error events include reason field
- Mock all LLM calls — do NOT make real API calls

## Constraints
- Do not change the core client or neoxra-core
- Keep the async pipeline structure intact
- All existing tests must pass

## Output
Summarize: what changed in unified_routes.py, what the new test covers, how to verify.
```

---

### PR 3 — Enforce zh-TW in All Core Prompt Builders

```
## Goal
Add locale awareness to all 4 prompt builders and all 4 skills in neoxra-core so that zh-TW locale produces consistent Traditional Chinese output.

## Context
- Repo: neoxra-core
- Currently, prompt builders at neoxra_core/prompts/ have NO locale parameter
- Skills at neoxra_core/skills/ do not extract locale from context
- This causes inconsistent language output when the system is used with zh-TW locale

## What to fix

### 1. Create a shared locale instruction utility (neoxra_core/prompts/_locale.py)
```python
def locale_output_instruction(locale: str) -> str:
    if locale == "zh-TW":
        return (
            "\n## Output Language\n"
            "You MUST write ALL user-facing content in Traditional Chinese (繁體中文).\n"
            "- Do not mix English and Chinese in the output.\n"
            "- Do not use English unless the term has no standard Chinese equivalent (e.g., brand names, technical acronyms).\n"
            "- All headings, body text, descriptions, hashtags, and calls to action must be in Traditional Chinese.\n"
            "- Use natural, fluent Traditional Chinese appropriate for Taiwan audiences.\n"
        )
    return ""  # English is the default prompt language; no extra instruction needed
```

### 2. Update all 4 prompt builders to accept locale parameter and append instruction:

**neoxra_core/prompts/seo_generation.py:**
- Add `locale: str = "en"` parameter to `build_seo_generation_prompt()`
- After the "Respond ONLY with the JSON object" line, append `locale_output_instruction(locale)`

**neoxra_core/prompts/instagram_generation.py:**
- Add `locale: str = "en"` parameter to `build_instagram_generation_prompt()`
- Append locale instruction at the end

**neoxra_core/prompts/threads_generation.py:**
- Add `locale: str = "en"` parameter to `build_threads_generation_prompt()`
- Append locale instruction at the end

**neoxra_core/prompts/facebook_generation.py:**
- Add `locale: str = "en"` parameter to `build_facebook_generation_prompt()`
- Append locale instruction at the end

### 3. Update all 4 skills to extract locale from context and pass to prompt builder:

Each skill's `run()` method should add:
```python
locale = input.context.get("locale", "en")
```
And pass `locale=locale` to its prompt builder call.

Files:
- neoxra_core/skills/instagram_generation.py
- neoxra_core/skills/seo_generation.py
- neoxra_core/skills/threads_generation.py
- neoxra_core/skills/facebook_adapter.py

### 4. Update SeoPipeline to accept and forward locale:
- neoxra_core/pipeline/seo.py: Add `locale: str = "en"` to `run()` signature
- Pass locale in skill context: `context={"...", "locale": locale}`

### 5. Update __init__.py exports if needed

### 6. Write tests (tests/test_locale_prompts.py)
- For each prompt builder: call with locale="zh-TW" → assert "繁體中文" appears in output
- For each prompt builder: call with locale="en" → assert "繁體中文" does NOT appear
- For each prompt builder: call with no locale → assert no Chinese instruction (defaults to "en")

## Constraints
- Do NOT change the backend (that's PR 4)
- Keep all existing tests passing
- The locale parameter must be optional with default "en" for backward compatibility
- Do NOT change prompt content beyond adding the locale instruction block

## Output
Summarize: files changed, the locale instruction text, how to run tests.
```

---

### PR 4 — Wire Locale Through Backend Core Client

```
## Goal
Pass locale from the backend to all neoxra-core skill contexts so that locale enforcement (PR 3) actually takes effect.

## Context
- Repo: neoxra
- File: backend/app/core_client/local.py
- After PR 3, neoxra-core skills read locale from input.context.get("locale", "en")
- Currently, local.py passes locale to Instagram (line 138) but NOT to:
  - generate_threads_content() (lines 232-251)
  - generate_seo_article() (lines 192-206)
  - generate_facebook_content() (lines 270-292)

## What to fix

### 1. generate_threads_content() (lines 232-251)
Add `"locale": generation_request.locale` to the SkillInput context dict (line 245 area)

### 2. generate_seo_article() (lines 192-206)
The SeoPipeline.run() now accepts locale (from PR 3). Pass it:
```python
article = pipeline.run(
    topic=generation_request.topic,
    brief_context=brief_context,
    voice_profile=voice_profile,
    locale=getattr(generation_request, "locale", "en"),
)
```

### 3. generate_facebook_content() (lines 270-292)
Add `"locale": generation_request.locale` to the SkillInput context dict (line 284 area)

## Constraints
- This PR is tiny — just 3 lines changed
- Requires PR 3 to be merged first (otherwise locale is passed but ignored)
- All existing tests must pass

## Output
Summarize: exact lines changed, how to verify with a manual test.
```

---

### PR 5 — SEO Article Length for Chinese

```
## Goal
Make the SEO prompt produce 2000+ Chinese character articles when locale is zh-TW.

## Context
- Repo: neoxra-core
- After PR 1 (CJK word count) and PR 3 (locale in prompts), the infrastructure supports locale-aware generation
- This PR tunes the SEO prompt specifically for Chinese article length

## What to fix

### 1. Update build_seo_generation_prompt() in neoxra_core/prompts/seo_generation.py
When locale is "zh-TW", replace the writing requirements section:
```
"## Writing Requirements",
"- Total article body must be at least 2000 Chinese characters (roughly 1500-2500 字).",
"- Aim for clear, accessible Traditional Chinese suitable for Taiwan readers.",
"- Use short paragraphs of 2-4 sentences maximum.",
"- Avoid generic filler and keyword stuffing.",
"- Make the article practical, specific, and credible.",
"- Set estimated_word_count to the approximate Chinese character count of the full article body.",
```
Keep the English version for locale="en".

### 2. Add estimated_character_count to SeoArticle model (neoxra_core/models/seo.py)
- Add field: `estimated_character_count: int = 0` (optional, for CJK)
- In __post_init__: if estimated_character_count > 0, validate it's >= 2000
- In _SeoArticlePayload: add optional field

### 3. Update _build_article() in neoxra_core/skills/seo_generation.py
- Extract estimated_character_count from parsed JSON if present
- Pass to SeoArticle constructor

### 4. Write test (tests/test_seo_length_zh.py)
- Test that build_seo_generation_prompt with locale="zh-TW" includes "2000" and "Chinese characters"
- Test that SeoArticle with estimated_character_count=2500 passes validation
- Test that SeoArticle with estimated_character_count=500 fails validation

## Dependencies
PR 1 (CJK word count fix) and PR 3 (locale parameter in prompt builder)

## Output
Summarize: prompt changes, model changes, test results.
```

---

### PR 6 — Frontend i18n Cleanup

```
## Goal
Complete the bilingual (en/zh-TW) UI across all frontend pages by extracting hardcoded Chinese strings and wiring the LanguageProvider.

## Context
- Repo: neoxra (frontend)
- The landing page (page.tsx) already has a proper bilingual COPY pattern with useLanguage()
- Other pages (generate, instagram, threads, seo, facebook) have hardcoded zh-TW strings
- The LanguageProvider exists at frontend/components/LanguageProvider.tsx and works
- The language toggle exists at frontend/components/LanguageToggle.tsx

## What to fix

### For EACH page (generate, instagram, threads, seo, facebook):

1. Add `import { useLanguage } from '../../components/LanguageProvider'` (adjust path)
2. Create a `COPY: Record<'en' | 'zh-TW', LocalizedCopy>` object at the top of the file
3. Move ALL hardcoded Chinese strings into the zh-TW key
4. Write English translations in the en key
5. In the component: `const { language } = useLanguage()` and `const copy = COPY[language]`
6. Replace all inline strings with `copy.xxx` references

### Specific pages to check:

**frontend/app/generate/page.tsx:**
- Lines 21-39: GOAL_OPTIONS labels, INDUSTRY_OPTIONS labels, form labels
- Line 249: hardcoded `locale: 'zh-TW'` → use `language` from context
- All button text, error messages, progress indicators

**frontend/app/instagram/page.tsx:**
- Lines 32-36: GOAL_OPTIONS labels
- Lines 38: PRESET_TOPICS
- Lines 65-76: ACCESS_COPY strings
- Line 87: template function has hardcoded Chinese
- All button text, section titles, error messages

**frontend/components/GlobalNav.tsx:**
- Ensure nav links use translated labels

### Special handling:
- PRESET_TOPICS for Instagram: keep Chinese presets for zh-TW, add English presets for en
- The createTemplate() function in instagram/page.tsx: make locale-aware
- API request locale field: use `language` from LanguageProvider instead of hardcoded 'zh-TW'

## Constraints
- Follow the EXACT same pattern as the landing page (page.tsx) COPY object
- Do not change any backend code
- Do not change component logic — only strings and locale wiring
- Keep all existing functionality working

## Output
Summarize: which pages were updated, total string count per language, how to verify by toggling language.
```

---

### PR 7 — Landing Page Brand Narrative

```
## Goal
Sharpen the homepage positioning to better communicate "Turn Ideas Into Traffic" and differentiate from ChatGPT.

## Context
- Repo: neoxra (frontend)
- File: frontend/app/page.tsx — the COPY object contains all landing page text
- The page is already bilingual (en/zh-TW)
- Current issues: subtitle is generic, "coming soon" badges on live features, no orchestra metaphor, no ChatGPT differentiation

## What to change in the COPY object:

### 1. Hero subtitle (both languages)
EN: "One idea. Four platforms. Ready to publish. Neoxra orchestrates AI agents to transform a single idea into Instagram carousels, SEO articles, Threads posts, and Facebook content — formatted, structured, and ready to drive traffic."
ZH-TW: "一個想法，四個平台，直接發布。Neoxra 用 AI 代理人把一個想法變成 Instagram 輪播、SEO 文章、Threads 貼文和 Facebook 內容——格式完整、結構清晰、直接帶來流量。"

### 2. Add new section: orchestra metaphor (after problem statement)
EN:
- Title: "Your Content Orchestra"
- Body: "You're the conductor. Neoxra's AI agents are the musicians. Each agent is a specialist — one writes Instagram carousels, another builds SEO articles, another crafts Threads. You give one direction. They perform in concert. The result: a complete content package, every platform, every time."
ZH-TW: equivalent

### 3. Add new section: "Not another ChatGPT wrapper" (after How It Works)
EN:
- Title: "Why Not Just Use ChatGPT?"
- Body: "ChatGPT gives you text. Neoxra gives you a content package. Each output is platform-native: Instagram has carousel slides with visual structure, SEO articles have heading hierarchy and meta descriptions, Threads posts respect the 500-character limit. And every output matches your brand voice — consistently, across every platform, every time."
ZH-TW: equivalent

### 4. Update platform grid
- Articles/SEO: remove "coming soon", add href to /seo, change CTA to "Start now →" / "開始使用 →"
- LinkedIn: change to Facebook, href to /facebook, CTA "Start now →"

### 5. Update use cases
- Keep Law Firms (live)
- Change Startups to "Content Agencies" with description about white-label multi-client content
- Keep Creators

### 6. Add brand etymology
- Add a small text block near the footer or as a tooltip on the brand name
- EN: "Neo (new) + Orchestra. You conduct. AI performs. Traffic follows."
- ZH-TW: "Neo（新）+ Orchestra（交響樂團）。你指揮，AI 演奏，流量隨之而來。"

### 7. Update hero CTAs
- Primary: "Generate All Platforms" / "一次產出四平台" (links to /generate)
- Secondary: "Try Instagram Studio" / "試試 Instagram Studio" (links to /instagram)

### 8. Fix PageComingSoonBadge
- Should use language context: "Coming soon" (en) / "即將推出" (zh-TW)
- But also: remove from SEO and Facebook since they're now live

## Constraints
- Only change the COPY object and page structure in frontend/app/page.tsx
- Keep it concise — no walls of text
- English copy must feel natural for a US audience / YC reviewer
- Each new section should be 3-5 sentences max
- Do NOT add new components or files unless absolutely necessary

## Output
Summarize: what sections changed, how the page flow reads now, how to verify in both languages.
```

---

## E. Suggested Implementation Order

```
CRITICAL PATH (restore reliability):

Day 1:
├── PR 1: Fix SEO + Facebook validation in neoxra-core ──── START IMMEDIATELY
├── PR 7: Landing page narrative ─────────────────────────── START IN PARALLEL (independent, copy-only)

Day 2:
├── PR 2: Fix backend retry logic ────────────────────────── AFTER PR 1
├── PR 3: Locale in all core prompt builders ─────────────── AFTER PR 1 (touches same files)

Day 3:
├── PR 4: Wire locale through backend core client ────────── AFTER PR 3
├── PR 5: SEO article length for Chinese ─────────────────── AFTER PR 1 + PR 3

Day 4-5:
├── PR 6: Frontend i18n cleanup ──────────────────────────── AFTER PR 4 (so locale changes actually flow through)

DONE
```

### Parallel opportunities:
- **PR 1 + PR 7:** Completely independent. Different repos, different files, different concerns.
- **PR 2 + PR 3:** Can potentially run in parallel (different repos), but PR 3 should ideally land before PR 2 since PR 2's retry is more useful when the core skills have locale awareness.
- **PR 5 + PR 6:** Can run in parallel (neoxra-core vs neoxra frontend).

### Minimum path to restore reliability:
```
PR 1 → PR 2 → manual test Generate All
```
These two PRs alone fix the crashes. PR 1 fixes the validation that kills SEO and Facebook. PR 2 ensures the backend retries gracefully even if validation still fails.

**After PR 1 + PR 2:** Generate All should work for all 4 platforms. Language may still be inconsistent (fixed by PRs 3-4). Articles may still be short (fixed by PR 5). UI still has hardcoded Chinese (fixed by PR 6).

---

## F. What to Postpone

| What | Why postpone | When to revisit |
|------|-------------|-----------------|
| Adding a Critic review step to the standalone skills | The multi-agent pipeline has Critic, but the core skills skip it. Not needed for MVP reliability. | When quality feedback loop matters |
| Auto-publishing / scheduling | Not relevant until content quality is reliable | After 10 clients |
| Content history / database persistence of generated outputs | Users can download/copy — persistence isn't blocking | When clients want browsable archives |
| LinkedIn agent (currently in pipeline but not in Generate All) | Facebook replaced it in the current product scope. Re-add if requested. | If market demands it |
| Advanced analytics dashboard | Usage events are logged but no dashboard exists. Not demo-critical. | When fundraising requires metrics |
| Image template upload for Instagram | Nice-to-have from previous sprint. Not blocking core pipeline. | After all 4 platforms are reliable |
| Carousel image export improvements | Works but could be better. Not blocking. | After demo polish |
| Voice profile expansion (more industries) | Only need default + law_firm for now | When onboarding non-legal clients |
| CI/CD pipeline setup | Manual deploy is fine for current scale | When shipping weekly |
| Refactoring the dual validation layer (dataclass + Pydantic) | It's messy but works. Fixing it risks breaking things for no user benefit. | During a planned cleanup sprint |
| Unit testing all frontend pages | Frontend tests exist for some components. Full coverage is a luxury right now. | After product stability |
| Migration from dataclasses to Pydantic BaseModel in neoxra-core | Would simplify validation but is a large refactor. Not needed to fix these issues. | When adding new models |
