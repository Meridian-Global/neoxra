# Neoxra MVP Execution Plan

---

## A. Execution Principles

### How I decided the slicing strategy

I inspected both repositories thoroughly. Here is the reality:

**What actually exists and works:**
- `neoxra` backend: Full multi-agent pipeline (Planner → Instagram/Threads/LinkedIn → Critic) with 2-pass refinement and SSE streaming. FastAPI with auth, rate limiting, demo access, database.
- `neoxra` frontend: Next.js 15 + React 19. Instagram Studio page with topic input, goal selector, SSE streaming, and **text-only** carousel preview. A fake "article preview" derived from Instagram caption (not real SEO). Landing page, legal demo, auth flow.
- `neoxra-core`: Instagram pipeline (style analysis → generation → scoring) with Pydantic-style validation, skill base class, voice profile loading, LLM provider wrapper. No SEO, Threads, or Facebook skills.

**What does NOT exist (the gaps):**

| Feature | Core Skill | Backend Agent | Frontend UI | Visual Output |
|---------|-----------|---------------|-------------|---------------|
| Instagram visual carousel | missing | missing | missing | missing |
| Image template upload | missing | missing | missing | missing |
| SEO article | missing | missing | fake/derived | missing |
| Threads dedicated view | missing | exists (agent only) | missing | n/a |
| Facebook | missing | missing | missing | n/a |
| Carousel export (PNG/PDF) | missing | missing | missing | missing |

### What I optimize for

1. **Every PR ends in something you can see and demo.** No invisible-only PRs.
2. **Instagram visual output is #1 priority** because the user explicitly said "must not be text-only" and "I can actually see the generated Instagram-style result."
3. **Vertical slices over horizontal layers.** Planner → Agent → Formatter → Preview in one PR, not "all schemas first."
4. **Speed to first client delivery.** The law firm needs usable content packages.

### What I intentionally postpone

- Publishing integrations (LinkedIn API, auto-posting) — post-MVP
- Multi-tenant / organization features — post-MVP
- Gmail scanner integration — post-MVP
- Advanced analytics / A/B testing — post-MVP
- Strategy module in neoxra-core — post-MVP
- Internationalization beyond zh-TW/en — post-MVP
- Database-backed content history — post-MVP
- CI/CD pipeline setup — post-MVP (manual deploy is fine)

### Repo assignment logic

| Repo | What belongs there | Why |
|------|-------------------|-----|
| `neoxra-core` | Skills, prompt builders, models, pipeline coordinators, output schemas | Private IP. Reusable across surfaces. Tested independently. |
| `neoxra` backend | API routes, agent wrappers (thin), pipeline orchestration, voice profiles, rendering endpoints | Product surface. Coordinates core skills into user-facing flows. |
| `neoxra` frontend | Pages, components, SSE handlers, visual renderers, export logic | User-facing UI. All visible output lives here. |
| Local/manual | Law firm voice profile tuning, demo recordings, YC app text | Not code. Done by hand. |

---

## B. PR Phases

### Phase 1: Instagram Visual Pipeline
**Goal:** Turn the existing text-only Instagram output into a visual, exportable, demoable result.

**Why this phase exists:** The user's #1 requirement is "Instagram must not be text-only" and "I can actually see the generated Instagram-style result." The backend Instagram generation already works. The gap is: no visual rendering, no image upload, no export. This phase closes that gap.

**Visible milestone:** User enters a topic → AI generates content → user sees a rendered 1080×1080 carousel in the browser → user can download it as images.

### Phase 2: SEO Article Pipeline
**Goal:** Build a real SEO article generation pipeline end-to-end, replacing the current fake derived article preview.

**Why this phase exists:** SEO articles are the second-highest value deliverable for the law firm client. Currently the "article" tab in the frontend is a hack that derives H2 headings from carousel slide titles. This phase builds real SEO generation.

**Visible milestone:** User enters a topic → AI generates a full SEO article with title, meta description, heading structure, and body → user sees it formatted and can copy it directly into WordPress/Medium.

### Phase 3: Threads + Facebook Output
**Goal:** Complete the four-platform coverage with dedicated, visible output for Threads and Facebook.

**Why this phase exists:** Threads agent already exists in the backend but has no dedicated UI. Facebook has nothing. Both need visible, copy-ready output to complete the multi-platform story for the YC demo and client delivery.

**Visible milestone:** User enters one idea → sees all four platform outputs in tabs → each output is copy-ready and platform-native.

### Phase 4: Demo Polish + Client Package
**Goal:** Make the end-to-end flow smooth enough for a YC demo and the law firm client.

**Why this phase exists:** Individual features work, but the demo narrative needs to be seamless. The law firm needs a tuned voice profile. The export/download flow needs to be bulletproof.

**Visible milestone:** 1-minute demo: type one idea → see all 4 platform outputs → download Instagram carousel → copy SEO article → show Threads post → YC submission ready.

---

## C. Trello Task Backlog

### Infrastructure & Foundation
```
[INFRA] Add Pydantic output schemas for all 4 platform JSON formats | backend, models | 3
[INFRA] Create shared carousel HTML template (1080x1080, inline CSS) | frontend, rendering | 5
[INFRA] Add image upload endpoint to backend (accept PNG/JPG, store temp) | backend, api | 3
[INFRA] Add file upload component with drag-drop + preview | frontend, components | 3
[INFRA] Wire up neoxra-core InstagramPipeline to backend /api/instagram/generate route | backend, integration | 3
[INFRA] Add platform output tab container component (Instagram/SEO/Threads/Facebook tabs) | frontend, components | 3
[INFRA] Create unified /api/generate endpoint that fans out to all platform agents | backend, api | 5
```

### Instagram Visual Pipeline
```
[IG] Build carousel slide renderer (React component, 1080x1080 aspect ratio, styled cards) | frontend, instagram | 5
[IG] Add color theme system for carousel (3 palettes: professional, bold, minimal) | frontend, instagram | 3
[IG] Build carousel export as images (html2canvas or dom-to-image, ZIP download) | frontend, instagram | 8
[IG] Add image template upload to Instagram form (reference image for style matching) | frontend, instagram | 5
[IG] Extend InstagramGenerationSkill to accept reference image description in prompt | core, skills | 3
[IG] Add visual layout metadata to carousel output (font size, alignment, padding hints) | core, models | 3
[IG] Build Instagram preview panel with live carousel slider (swipeable, mobile-like frame) | frontend, instagram | 5
[IG] Add "Copy caption" and "Copy hashtags" one-click buttons to Instagram preview | frontend, instagram | 2
[IG] Add reel script section to Instagram preview panel | frontend, instagram | 2
[IG] Test Instagram visual pipeline end-to-end: topic → generation → visual preview → export | qa, instagram | 3
```

### SEO Article Pipeline
```
[SEO] Create SEO output models in neoxra-core (SeoMetadata, SeoArticle, SeoSection) | core, models | 3
[SEO] Build SEO prompt builder in neoxra-core (keyword-optimized, heading structure rules) | core, prompts | 5
[SEO] Create SeoGenerationSkill in neoxra-core | core, skills | 5
[SEO] Create SeoPipeline coordinator in neoxra-core (brief → article with metadata) | core, pipeline | 3
[SEO] Add SEO agent wrapper in neoxra backend | backend, agents | 3
[SEO] Add /api/seo/generate endpoint with SSE streaming | backend, api | 3
[SEO] Build SEO article preview page (formatted H1/H2/H3, readable, copy-ready) | frontend, seo | 5
[SEO] Add "Copy as Markdown" export button for SEO article | frontend, seo | 3
[SEO] Add "Copy as HTML" export button for SEO article (WordPress paste-ready) | frontend, seo | 3
[SEO] Add SEO metadata display (title, meta description, slug, keywords) above article | frontend, seo | 2
[SEO] Test SEO pipeline end-to-end: topic → article generation → preview → copy to clipboard | qa, seo | 3
```

### Threads Pipeline
```
[THREADS] Create Threads output models in neoxra-core (ThreadsPost, ThreadsThread) | core, models | 2
[THREADS] Build Threads prompt builder in neoxra-core (500 char limit, conversational tone) | core, prompts | 3
[THREADS] Create ThreadsGenerationSkill in neoxra-core | core, skills | 3
[THREADS] Wire Threads generation into backend pipeline SSE events | backend, agents | 3
[THREADS] Build Threads preview panel (thread format, character counts, copy buttons) | frontend, threads | 5
[THREADS] Add Threads output to unified generation page tabs | frontend, threads | 2
[THREADS] Test Threads pipeline: topic → thread generation → preview → copy | qa, threads | 2
```

### Facebook Pipeline
```
[FB] Create Facebook output models in neoxra-core (FacebookPost) | core, models | 2
[FB] Build Facebook prompt builder (adapts Instagram content for Facebook audience) | core, prompts | 3
[FB] Create FacebookAdapterSkill in neoxra-core (takes Instagram output + brief → Facebook post) | core, skills | 3
[FB] Add Facebook agent wrapper in neoxra backend | backend, agents | 2
[FB] Build Facebook preview panel (post format, discussion prompt, share hook) | frontend, facebook | 3
[FB] Add Facebook output to unified generation page tabs | frontend, facebook | 2
[FB] Test Facebook pipeline: Instagram output → Facebook adaptation → preview → copy | qa, facebook | 2
```

### Unified Generation + Demo Flow
```
[DEMO] Build unified "Generate All" page with single input → 4 platform tabs | frontend, demo | 8
[DEMO] Add progress indicator showing which platform agents are running | frontend, demo | 3
[DEMO] Create law firm voice profile YAML (professional, approachable, disclaimer rules) | backend, voice | 2
[DEMO] Add voice profile selector to generation form | frontend, demo | 3
[DEMO] Build "Download All" button (ZIP: carousel images + article.md + threads.txt + facebook.txt) | frontend, export | 5
[DEMO] Add batch generation mode to CLI (ideas.txt → output folder per idea) | backend, cli | 5
[DEMO] Create 3 demo scenarios with impressive outputs (legal, tech startup, personal brand) | content, demo | 3
[DEMO] End-to-end smoke test: one idea → all 4 outputs visible and exportable | qa, demo | 3
[DEMO] Update CLAUDE.md and README with current architecture and commands | docs | 2
```

### Quality & Validation
```
[QA] Add Pydantic strict validation on all agent JSON responses | backend, validation | 3
[QA] Add character count validation for Threads posts (500 char max) | core, validation | 1
[QA] Add carousel slide count validation (5-9 slides) | core, validation | 1
[QA] Add SEO title length validation (50-60 chars) and meta description (150-160 chars) | core, validation | 1
[QA] Add fallback/retry logic when agent returns malformed JSON | backend, resilience | 3
[QA] Write unit tests for SEO skill and prompt builder | core, tests | 3
[QA] Write unit tests for Threads skill and prompt builder | core, tests | 2
[QA] Write unit tests for Facebook adapter skill | core, tests | 2
[QA] Write integration test for unified pipeline (all 4 platforms from one idea) | backend, tests | 5
```

**Total: 55 tasks**

---

## D. PR Plan

### PR 1 — Instagram Carousel Visual Renderer
**Phase:** 1 (Instagram Visual Pipeline)
**Target repo:** `neoxra` (frontend only)
**Included tasks:**
- [IG] Build carousel slide renderer (React component, 1080x1080 aspect ratio, styled cards)
- [IG] Add color theme system for carousel (3 palettes: professional, bold, minimal)
- [IG] Build Instagram preview panel with live carousel slider (swipeable, mobile-like frame)
- [IG] Add reel script section to Instagram preview panel
- [IG] Add "Copy caption" and "Copy hashtags" one-click buttons to Instagram preview

**Why these tasks belong together:** All are frontend rendering work that transforms the existing text carousel cards into visual, styled, demoable output. No backend changes needed. The existing SSE streaming and content generation already work — this PR makes the output look like real Instagram content.

**Dependencies:** None. Works with existing `/api/instagram/generate` endpoint and existing `InstagramContent` type.

**Visible result after merge:** The Instagram Studio page shows a phone-frame carousel preview with styled 1080×1080 slides, color themes, swipe navigation, reel script display, and one-click copy buttons. The content still comes from the existing backend — this PR only upgrades the visual presentation.

**Acceptance checklist:**
- [ ] Carousel renders at 1080×1080 aspect ratio in a phone frame mockup
- [ ] At least 3 color themes selectable (professional/dark, bold/vibrant, minimal/clean)
- [ ] Slides are swipeable or navigable with arrows
- [ ] Caption, hashtags, and reel script each have copy buttons
- [ ] Existing SSE streaming still works with the new renderer
- [ ] Loading skeleton still appears during generation
- [ ] Mobile responsive

---

### PR 2 — Instagram Image Export
**Phase:** 1 (Instagram Visual Pipeline)
**Target repo:** `neoxra` (frontend)
**Included tasks:**
- [IG] Build carousel export as images (html2canvas or dom-to-image, ZIP download)

**Why this is separate:** Image export is technically complex (DOM → canvas → PNG) and should not block PR 1. It's an incremental addition on top of the visual renderer.

**Dependencies:** PR 1 (needs the visual carousel renderer to exist).

**Visible result after merge:** User clicks "Download Carousel" → gets a ZIP file with 5-9 PNG images at 1080×1080px, each corresponding to one carousel slide. Ready to upload directly to Instagram.

**Acceptance checklist:**
- [ ] "Download Carousel" button appears after content generation completes
- [ ] Downloads a ZIP containing one PNG per slide
- [ ] Each PNG is 1080×1080px
- [ ] Text is crisp and readable in the exported images
- [ ] Color theme is preserved in exports
- [ ] Works in Chrome and Safari

---

### PR 3 — Instagram Image Template Upload
**Phase:** 1 (Instagram Visual Pipeline)
**Target repo:** `neoxra` (frontend + backend) and `neoxra-core`
**Included tasks:**
- [INFRA] Add image upload endpoint to backend (accept PNG/JPG, store temp)
- [INFRA] Add file upload component with drag-drop + preview
- [IG] Add image template upload to Instagram form (reference image for style matching)
- [IG] Extend InstagramGenerationSkill to accept reference image description in prompt
- [IG] Add visual layout metadata to carousel output (font size, alignment, padding hints)

**Why these tasks belong together:** Image template upload is a vertical slice: upload component (frontend) → upload endpoint (backend) → style extraction prompt enhancement (core) → layout metadata in output (core). All must ship together for the feature to be visible.

**Dependencies:** PR 1 (the visual renderer should exist so layout metadata can be applied).

**Visible result after merge:** User uploads a reference image → AI analyzes its style → generated carousel matches the visual structure/tone of the reference → carousel renders with adapted styling.

**Acceptance checklist:**
- [ ] Drag-and-drop image upload works on the Instagram form
- [ ] Image preview shows after upload
- [ ] Backend accepts PNG/JPG up to 5MB, stores temporarily
- [ ] Style analysis prompt includes image description context
- [ ] Generated carousel output includes layout hints (when reference provided)
- [ ] Visual renderer applies layout hints to slide rendering
- [ ] Works without image upload (existing flow unchanged)

---

### PR 4 — SEO Article Generation (Core + Backend)
**Phase:** 2 (SEO Article Pipeline)
**Target repo:** `neoxra-core` and `neoxra` (backend)
**Included tasks:**
- [SEO] Create SEO output models in neoxra-core (SeoMetadata, SeoArticle, SeoSection)
- [SEO] Build SEO prompt builder in neoxra-core (keyword-optimized, heading structure rules)
- [SEO] Create SeoGenerationSkill in neoxra-core
- [SEO] Create SeoPipeline coordinator in neoxra-core (brief → article with metadata)
- [SEO] Add SEO agent wrapper in neoxra backend
- [SEO] Add /api/seo/generate endpoint with SSE streaming
- [QA] Add SEO title length validation (50-60 chars) and meta description (150-160 chars)
- [QA] Write unit tests for SEO skill and prompt builder

**Why these tasks belong together:** This is the complete backend vertical slice for SEO. Models → prompt → skill → pipeline → API endpoint → tests. The frontend PR (PR 5) depends on this endpoint existing.

**Dependencies:** None. Independent of Instagram PRs.

**Visible result after merge:** `curl POST /api/seo/generate` with a topic returns a streamed SEO article with title, meta description, heading structure, and full article body as structured JSON. Verifiable via CLI or HTTP client.

**Acceptance checklist:**
- [ ] `SeoMetadata`, `SeoArticle`, `SeoSection` models exist with validation
- [ ] SEO prompt enforces: title 50-60 chars, meta 150-160 chars, H1/H2/H3 structure, keyword placement
- [ ] `SeoGenerationSkill.run()` returns valid `SeoArticle` output
- [ ] `/api/seo/generate` endpoint streams SSE events: `phase_started` → `article_ready` → `pipeline_completed`
- [ ] Article body is 1200-2000 words
- [ ] Unit tests pass for skill and prompt builder
- [ ] SEO title and meta description validation enforced

---

### PR 5 — SEO Article Frontend Preview
**Phase:** 2 (SEO Article Pipeline)
**Target repo:** `neoxra` (frontend)
**Included tasks:**
- [SEO] Build SEO article preview page (formatted H1/H2/H3, readable, copy-ready)
- [SEO] Add "Copy as Markdown" export button for SEO article
- [SEO] Add "Copy as HTML" export button for SEO article (WordPress paste-ready)
- [SEO] Add SEO metadata display (title, meta description, slug, keywords) above article
- [SEO] Test SEO pipeline end-to-end: topic → article generation → preview → copy to clipboard

**Why these tasks belong together:** All frontend rendering and export for SEO articles. Requires the backend endpoint from PR 4.

**Dependencies:** PR 4 (needs `/api/seo/generate` endpoint).

**Visible result after merge:** User navigates to SEO page → enters topic → AI generates article → user sees formatted article with heading structure → can copy as Markdown or HTML with one click.

**Acceptance checklist:**
- [ ] SEO page exists at `/seo` (or as a tab in unified page)
- [ ] Article renders with proper heading hierarchy (H1 visually distinct from H2, H2 from H3)
- [ ] SEO metadata (title, description, slug, keywords) displayed in a card above article
- [ ] "Copy as Markdown" produces clean markdown with frontmatter
- [ ] "Copy as HTML" produces clean HTML pasteable into WordPress editor
- [ ] SSE streaming shows progress during generation
- [ ] Loading skeleton appears during generation

---

### PR 6 — Threads Generation Pipeline
**Phase:** 3 (Threads + Facebook)
**Target repo:** `neoxra-core` and `neoxra` (backend + frontend)
**Included tasks:**
- [THREADS] Create Threads output models in neoxra-core (ThreadsPost, ThreadsThread)
- [THREADS] Build Threads prompt builder in neoxra-core (500 char limit, conversational tone)
- [THREADS] Create ThreadsGenerationSkill in neoxra-core
- [THREADS] Wire Threads generation into backend pipeline SSE events
- [THREADS] Build Threads preview panel (thread format, character counts, copy buttons)
- [THREADS] Add Threads output to unified generation page tabs
- [QA] Add character count validation for Threads posts (500 char max)
- [QA] Write unit tests for Threads skill and prompt builder
- [THREADS] Test Threads pipeline: topic → thread generation → preview → copy

**Why these tasks belong together:** Threads is small enough to be one vertical slice: models → prompt → skill → backend wiring → frontend preview → tests. No benefit to splitting further.

**Dependencies:** None strictly, but the unified generation page (PR 8) benefits from this existing.

**Visible result after merge:** User sees Threads tab → enters topic → AI generates a thread of 3-5 posts → each post shows character count → user can copy individual posts or entire thread.

**Acceptance checklist:**
- [ ] ThreadsPost model enforces 500 character max
- [ ] Threads prompt produces conversational, platform-native content
- [ ] Threads preview shows each post as a separate card with character count badge
- [ ] Posts exceeding 500 chars are flagged visually
- [ ] "Copy thread" button copies all posts formatted for Threads
- [ ] "Copy post" button on each individual post
- [ ] Unit tests pass

---

### PR 7 — Facebook Adapter Pipeline
**Phase:** 3 (Threads + Facebook)
**Target repo:** `neoxra-core` and `neoxra` (backend + frontend)
**Included tasks:**
- [FB] Create Facebook output models in neoxra-core (FacebookPost)
- [FB] Build Facebook prompt builder (adapts Instagram content for Facebook audience)
- [FB] Create FacebookAdapterSkill in neoxra-core (takes Instagram output + brief → Facebook post)
- [FB] Add Facebook agent wrapper in neoxra backend
- [FB] Build Facebook preview panel (post format, discussion prompt, share hook)
- [FB] Add Facebook output to unified generation page tabs
- [QA] Write unit tests for Facebook adapter skill
- [FB] Test Facebook pipeline: Instagram output → Facebook adaptation → preview → copy

**Why these tasks belong together:** Facebook is an adapter on top of Instagram content. All tasks form one vertical slice.

**Dependencies:** Needs Instagram content generation to exist (already exists). Can run in parallel with PR 6.

**Visible result after merge:** User sees Facebook tab → content is adapted from Instagram output → shows longer-form post with discussion prompt and share hook → user can copy.

**Acceptance checklist:**
- [ ] Facebook post is NOT a copy-paste of Instagram caption
- [ ] Discussion prompt is a real question (not generic "comment below")
- [ ] Share hook appeals to identity
- [ ] Post body is longer than Instagram caption (Facebook-native length)
- [ ] "Copy post" button works
- [ ] Unit tests pass

---

### PR 8 — Unified Generation Page
**Phase:** 4 (Demo Polish)
**Target repo:** `neoxra` (frontend + backend)
**Included tasks:**
- [DEMO] Build unified "Generate All" page with single input → 4 platform tabs
- [INFRA] Create unified /api/generate endpoint that fans out to all platform agents
- [INFRA] Add platform output tab container component (Instagram/SEO/Threads/Facebook tabs)
- [DEMO] Add progress indicator showing which platform agents are running
- [DEMO] Add voice profile selector to generation form

**Why these tasks belong together:** The unified page is the demo centerpiece. One input, four outputs. This is what gets shown at YC and to the law firm client.

**Dependencies:** PRs 1, 4-5, 6, 7 (all four platform pipelines must exist).

**Visible result after merge:** User enters one idea → clicks "Generate All" → progress indicator shows each agent running → 4 tabs appear with Instagram visual carousel, SEO article, Threads thread, and Facebook post → all copy/exportable.

**Acceptance checklist:**
- [ ] Single text input + goal selector + voice profile dropdown
- [ ] "Generate All" button triggers all 4 platforms
- [ ] Progress indicator shows: Planner → Instagram → SEO → Threads → Facebook
- [ ] 4 tabs with platform-specific previews
- [ ] Each tab has its own copy/export buttons
- [ ] Total generation time < 60 seconds
- [ ] Error in one platform doesn't block others

---

### PR 9 — Export + Client Delivery Package
**Phase:** 4 (Demo Polish)
**Target repo:** `neoxra` (frontend + backend)
**Included tasks:**
- [DEMO] Build "Download All" button (ZIP: carousel images + article.md + threads.txt + facebook.txt)
- [DEMO] Create law firm voice profile YAML (professional, approachable, disclaimer rules)
- [DEMO] Create 3 demo scenarios with impressive outputs (legal, tech startup, personal brand)
- [DEMO] End-to-end smoke test: one idea → all 4 outputs visible and exportable
- [DEMO] Update CLAUDE.md and README with current architecture and commands
- [QA] Add fallback/retry logic when agent returns malformed JSON

**Why these tasks belong together:** These are the final polish tasks that make the product deliverable to the law firm and demoable for YC.

**Dependencies:** PR 8 (unified generation page).

**Visible result after merge:** User clicks "Download All" → gets a ZIP with: `/instagram/` folder (carousel PNGs), `seo-article.md`, `threads.txt`, `facebook.txt`. Law firm voice profile produces professional content. Three pre-built demo scenarios available.

**Acceptance checklist:**
- [ ] "Download All" produces a clean ZIP with all platform outputs
- [ ] Law firm voice profile generates content with correct tone
- [ ] 3 demo scenarios produce consistently impressive output
- [ ] README documents: how to run, how to add voice profiles, how to demo
- [ ] Malformed JSON from agents triggers retry (max 2 retries)
- [ ] End-to-end smoke test passes

---

### PR 10 — Validation + Test Coverage
**Phase:** 4 (Demo Polish)
**Target repo:** `neoxra-core` and `neoxra` (backend)
**Included tasks:**
- [INFRA] Add Pydantic output schemas for all 4 platform JSON formats
- [QA] Add Pydantic strict validation on all agent JSON responses
- [QA] Add carousel slide count validation (5-9 slides)
- [QA] Write integration test for unified pipeline (all 4 platforms from one idea)
- [DEMO] Add batch generation mode to CLI (ideas.txt → output folder per idea)

**Why these tasks belong together:** All are hardening/validation work that makes the pipeline reliable. Can be done in parallel with PR 9.

**Dependencies:** PRs 4, 6, 7 (needs all skills to exist for validation schemas).

**Visible result after merge:** CLI can batch-process 10 ideas from a file. All agent outputs are strictly validated. Integration test proves the full pipeline works end-to-end.

**Acceptance checklist:**
- [ ] Pydantic models exist for all 4 platform output formats
- [ ] Invalid agent responses are caught and trigger retry
- [ ] `python run_cli.py --batch ideas.txt` processes all ideas and saves outputs
- [ ] Integration test runs full pipeline with mocked LLM calls
- [ ] All existing tests still pass

---

## E. Codex Prompts

### PR 1 — Instagram Carousel Visual Renderer

```
## Goal
Upgrade the Instagram Studio page in the Neoxra frontend from text-only carousel cards to a visual, styled, demoable carousel renderer.

## Context
- Repo: neoxra (frontend is in /frontend)
- The Instagram Studio page is at frontend/app/instagram/page.tsx
- It currently renders carousel slides as plain text cards (see the InstagramPreview component)
- The CarouselPreview component at frontend/components/CarouselPreview.tsx is minimal
- Content comes from the existing /api/instagram/generate SSE endpoint — DO NOT change the backend
- TypeScript types are in frontend/lib/instagram-types.ts

## What to build

1. **New component: `VisualCarouselRenderer`** (frontend/components/VisualCarouselRenderer.tsx)
   - Renders carousel slides at 1080×1080 aspect ratio (use a square container with aspect-ratio CSS)
   - Each slide has: slide number badge, headline (large, bold), subtext (smaller, below), brand color background
   - Phone frame mockup wrapper (rounded corners, status bar, subtle shadow)
   - Navigation: left/right arrows + dot indicators below the frame
   - Slides should look like real Instagram carousel slides

2. **Color theme system** (frontend/lib/carousel-themes.ts)
   - Define 3 themes: "professional" (dark navy + white text), "bold" (bright gradients + white text), "minimal" (white/cream + dark text)
   - Each theme: { name, bgColor, textColor, accentColor, subtextColor }
   - Theme selector as horizontal pill buttons above the carousel

3. **Update InstagramPreview in page.tsx**
   - Replace the current flat card list with the new VisualCarouselRenderer
   - Add theme selector
   - Keep existing copy buttons for caption and hashtags
   - Add a "Reel Script" section below the carousel showing the reel_script field
   - Keep the loading skeleton for streaming state

## Constraints
- Use only Tailwind CSS classes (no external CSS libraries)
- No external dependencies beyond what's already in package.json
- The carousel must be responsive (scales down on mobile, maintains aspect ratio)
- Must work with the existing InstagramContent type — do not modify it
- Keep the existing SSE streaming flow completely untouched
- All text in UI should be in Traditional Chinese (zh-TW) to match existing page

## Testing
- Verify the carousel renders correctly with the DEFAULT_PREVIEW data already in page.tsx
- Verify SSE streaming still works: topic input → generate → slides appear progressively
- Verify all 3 themes render correctly
- Verify mobile responsiveness

## Output
Summarize: which files were created/modified, what each component does, how to verify visually.
```

---

### PR 2 — Instagram Image Export

```
## Goal
Add the ability to export Instagram carousel slides as downloadable PNG images in a ZIP file.

## Context
- Repo: neoxra (frontend)
- PR 1 added a VisualCarouselRenderer component that renders styled 1080×1080 carousel slides
- We need to capture each slide as a PNG and bundle them into a ZIP download
- This is frontend-only — no backend changes

## What to build

1. **Install dependencies** (if not already present)
   - html2canvas (for DOM → canvas conversion)
   - jszip (for ZIP file creation)
   - file-saver (for triggering download)
   Run: add to package.json dependencies

2. **New utility: `exportCarousel`** (frontend/lib/carousel-export.ts)
   - Function: `exportCarousel(slideElements: HTMLElement[], topicSlug: string): Promise<void>`
   - For each slide element: use html2canvas to render at 1080×1080, get PNG blob
   - Bundle all PNGs into a ZIP using JSZip
   - File names: `slide-01.png`, `slide-02.png`, etc.
   - ZIP name: `{topicSlug}-carousel.zip`
   - Trigger download via file-saver

3. **Add ref tracking to VisualCarouselRenderer**
   - Each slide div needs a ref so we can pass it to html2canvas
   - Use an array of refs (useRef<HTMLDivElement[]>)
   - Expose a method or prop for triggering export

4. **Add "Download Carousel" button**
   - Place below the carousel in the Instagram preview panel
   - Show loading spinner while export is in progress
   - Disabled during content generation (streaming state)
   - Button text: "下載輪播圖片" (Download Carousel Images)

## Constraints
- Each exported PNG must be exactly 1080×1080 pixels
- Text must be crisp (use html2canvas scale option: scale: 2, then resize)
- Selected color theme must be preserved in export
- Do not modify the backend
- Handle errors gracefully (show toast or inline error if export fails)

## Testing
- Generate content with default topic → click download → verify ZIP contains correct number of PNGs
- Verify each PNG is 1080×1080 and text is readable
- Test with all 3 color themes
- Test that button is disabled during streaming

## Output
Summarize: files created/modified, how to test the export flow.
```

---

### PR 3 — Instagram Image Template Upload

```
## Goal
Allow users to upload a reference image that the AI uses to match the visual style when generating Instagram content.

## Context
- Repos: neoxra-core AND neoxra (backend + frontend)
- neoxra-core has InstagramGenerationSkill at neoxra_core/skills/instagram_generation.py
- neoxra-core has StyleAnalysisSkill at neoxra_core/skills/style_analysis.py
- neoxra-core has prompt builders at neoxra_core/prompts/
- neoxra backend has /api/instagram/generate at backend/app/api/instagram_routes.py
- neoxra frontend has the Instagram form in frontend/app/instagram/page.tsx

## What to build

### neoxra-core changes:
1. **Extend GenerationRequest model** (neoxra_core/models/instagram.py)
   - Add optional field: `reference_image_description: str = ""`
   - This is a text description of the uploaded image (we describe it server-side, not send the image to core)

2. **Update style_analysis prompt** (neoxra_core/prompts/style_analysis.py)
   - If reference_image_description is provided, include it in the prompt as additional style context
   - "The user has provided a reference image with the following visual characteristics: {description}. Match this visual style."

3. **Update instagram_generation prompt** (neoxra_core/prompts/instagram_generation.py)
   - Add optional layout hints section: if style analysis detected specific patterns from the reference image, include layout directives (e.g., "use large centered headlines", "minimal text per slide")

4. **Add layout metadata to CarouselSlide model** (neoxra_core/models/instagram.py)
   - Add optional fields: `text_alignment: str = "center"`, `emphasis: str = "normal"`
   - These are hints the renderer can use

5. **Write tests** for the new model fields and prompt variations

### neoxra backend changes:
6. **Add image upload endpoint** (backend/app/api/instagram_routes.py)
   - Add `POST /api/instagram/upload-reference` — accepts multipart form upload
   - Validates: PNG/JPG only, max 5MB
   - Stores file temporarily (in-memory or temp dir)
   - Uses Claude Vision API to describe the image's visual style (layout, colors, typography feel)
   - Returns `{ description: "..." }` JSON

7. **Update /api/instagram/generate request model**
   - Add optional `reference_image_description` field to InstagramGenerateRequest
   - Pass through to core pipeline

### neoxra frontend changes:
8. **Add FileUpload component** (frontend/components/FileUpload.tsx)
   - Drag-and-drop zone + click to browse
   - Shows image preview thumbnail after upload
   - "Remove" button to clear
   - Accepts: image/png, image/jpeg

9. **Integrate into Instagram form** (frontend/app/instagram/page.tsx)
   - Add FileUpload below the topic input
   - On upload: POST to /api/instagram/upload-reference → get description
   - Pass description to /api/instagram/generate request
   - Show "Analyzing style..." indicator during upload

## Constraints
- The reference image is NEVER sent to neoxra-core (only the text description)
- The feature must be optional — existing flow works without any image
- Image analysis uses Claude Vision (claude-sonnet-4-20250514 with image content block)
- Max 1 reference image per generation
- Temp files are cleaned up after pipeline completes

## Testing
- Test generation without image (regression — must still work)
- Test with image: upload → description returned → generation includes style hints
- Test file validation (reject non-image, reject > 5MB)
- Unit tests for new model fields

## Output
Summarize: files changed in each repo, how to verify the feature works.
```

---

### PR 4 — SEO Article Generation (Core + Backend)

```
## Goal
Build a complete SEO article generation pipeline in neoxra-core and expose it via a backend API endpoint.

## Context
- Repo: neoxra-core (primary) and neoxra (backend)
- neoxra-core has an established pattern: models → prompts → skills → pipeline (see Instagram implementation)
- neoxra backend has an established pattern: agent wrapper → API route with SSE streaming
- Currently NO SEO generation exists anywhere. The frontend has a fake article preview derived from Instagram captions.
- Look at the Instagram pipeline as the reference implementation for how to structure this.

## What to build in neoxra-core:

1. **SEO models** (neoxra_core/models/seo.py)
   ```python
   @dataclass
   class SeoMetadata:
       title: str              # 50-60 chars
       meta_description: str   # 150-160 chars
       url_slug: str
       primary_keyword: str
       secondary_keywords: list[str]
       target_search_intent: str  # informational | transactional | navigational

   @dataclass
   class SeoSection:
       heading: str            # H2 text
       heading_level: int      # 2 or 3
       content: str            # Section body text
       
   @dataclass
   class SeoArticle:
       metadata: SeoMetadata
       h1: str
       introduction: str
       sections: list[SeoSection]
       conclusion: str
       summary_points: list[str]
       cta: str
       estimated_word_count: int
   ```
   Add validation: title length, meta length, at least 3 sections, word count 1200-2000.

2. **SEO prompt builder** (neoxra_core/prompts/seo_generation.py)
   - Function: `build_seo_generation_prompt(topic: str, brief_context: dict, voice_profile: dict | None = None) -> str`
   - Prompt must enforce:
     - Title with primary keyword, 50-60 chars
     - Meta description with keyword, 150-160 chars
     - H1 (can differ from title), 4-6 H2 sections, H3 subsections where appropriate
     - 8th grade reading level, short paragraphs (2-4 sentences max)
     - At least one data point/example per section
     - Natural keyword placement (4-6 times for primary keyword)
     - JSON-only output matching the SeoArticle schema
   - Reference the Instagram prompt builder at neoxra_core/prompts/instagram_generation.py for style

3. **SEO skill** (neoxra_core/skills/seo_generation.py)
   - Class: `SeoGenerationSkill(Skill)`, name = "seo_generation"
   - run(): build prompt → call LLM (temperature=0.5, max_tokens=4096) → parse JSON → validate → return SkillOutput
   - Follow the pattern in neoxra_core/skills/instagram_generation.py

4. **SEO pipeline** (neoxra_core/pipeline/seo.py)
   - Class: `SeoPipeline`
   - Constructor takes optional skill injection (like InstagramPipeline)
   - run(topic, brief_context, voice_profile) → SeoArticle
   - Single step for MVP (no multi-step like Instagram's style→generate→score)

5. **Export models** — update neoxra_core/models/__init__.py and neoxra_core/skills/__init__.py

6. **Tests** (tests/test_seo_generation.py, tests/test_seo_models.py)
   - Model validation tests (title length, meta length, word count)
   - Prompt builder tests (contains keywords, JSON output instruction)
   - Skill tests with mocked LLM (returns valid JSON → skill parses correctly)
   - Pipeline tests with mocked skill

## What to build in neoxra backend:

7. **SEO route** (backend/app/api/seo_routes.py)
   - `POST /api/seo/generate` — SSE streaming endpoint
   - Request: `{ topic: str, goal: str, locale: str }`
   - SSE events: `phase_started` → `article_ready` → `pipeline_completed`
   - Uses the core client pattern (see backend/app/core_client/ for how Instagram does it)

8. **Register route** in backend/app/main.py

## Constraints
- Follow existing code patterns exactly (skill base class, pipeline coordinator, SSE event format)
- Article must be 1200-2000 words
- SEO title must be 50-60 characters
- Meta description must be 150-160 characters
- JSON-only output from LLM (use parse_json_response from neoxra_core/providers/parsing.py)
- Use temperature=0.5 for generation (creative but structured)
- max_tokens=4096 (articles are long)

## Testing
- Run unit tests: pytest tests/test_seo_generation.py tests/test_seo_models.py -v
- Manual test: curl the /api/seo/generate endpoint with a test topic
- Verify article length, heading structure, and metadata constraints

## Output
Summarize: all files created/modified in both repos, how to run tests, how to verify via curl.
```

---

### PR 5 — SEO Article Frontend Preview

```
## Goal
Build the frontend page for viewing and exporting AI-generated SEO articles.

## Context
- Repo: neoxra (frontend)
- PR 4 added /api/seo/generate backend endpoint that streams SeoArticle JSON via SSE
- The current "article" tab in the Instagram page (frontend/app/instagram/page.tsx) is a fake — it derives headings from carousel titles. This PR replaces it with real SEO generation.
- Follow the patterns in the existing Instagram page for SSE handling

## What to build

1. **SEO types** (frontend/lib/seo-types.ts)
   ```typescript
   interface SeoMetadata {
     title: string
     meta_description: string
     url_slug: string
     primary_keyword: string
     secondary_keywords: string[]
     target_search_intent: string
   }
   interface SeoSection {
     heading: string
     heading_level: number
     content: string
   }
   interface SeoArticle {
     metadata: SeoMetadata
     h1: string
     introduction: string
     sections: SeoSection[]
     conclusion: string
     summary_points: string[]
     cta: string
     estimated_word_count: number
   }
   ```

2. **SEO article preview component** (frontend/components/SeoArticlePreview.tsx)
   - Renders the article in a clean, readable format
   - Metadata card at top: title (large), meta description (gray), slug, keyword badges
   - Article body: H1 styled as page title, H2/H3 with proper visual hierarchy, paragraph text with comfortable line height
   - Conclusion section with summary bullet points
   - Word count badge
   - Must look like a real blog post preview

3. **SEO export utilities** (frontend/lib/seo-export.ts)
   - `toMarkdown(article: SeoArticle): string` — converts to markdown with YAML frontmatter (title, description, slug, keywords)
   - `toHTML(article: SeoArticle): string` — converts to clean HTML with semantic heading tags, paragraph tags, WordPress-compatible

4. **SEO page** (frontend/app/seo/page.tsx)
   - Topic input, goal selector, generate button (same pattern as Instagram page)
   - SSE streaming from /api/seo/generate
   - Shows SeoArticlePreview when content is ready
   - "Copy as Markdown" button → copies toMarkdown() output to clipboard
   - "Copy as HTML" button → copies toHTML() output to clipboard
   - Loading skeleton during generation

5. **Add SEO to navigation** — update GlobalNav.tsx to include SEO link

## Constraints
- All UI text in Traditional Chinese (zh-TW) to match existing pages
- Follow the same visual design system (CSS variables, card styles) as Instagram page
- Do not modify the Instagram page — the fake article tab there is fine for now (will be removed in PR 8)
- SSE handling should follow the same pattern as Instagram (see streamSSE in frontend/lib/sse.ts)

## Testing
- Navigate to /seo → enter topic → generate → verify article renders
- Click "Copy as Markdown" → paste into a text editor → verify clean markdown
- Click "Copy as HTML" → paste into WordPress HTML editor → verify it renders correctly
- Verify loading skeleton appears during generation
- Verify error handling if generation fails

## Output
Summarize: files created, how to navigate to the page, how to verify each export format.
```

---

### PR 6 — Threads Generation Pipeline

```
## Goal
Build a complete Threads content generation pipeline (core skill + backend wiring + frontend preview) in one vertical slice.

## Context
- Repos: neoxra-core, neoxra (backend + frontend)
- neoxra backend already has a ThreadsAgent at backend/app/agents/threads.py that generates Threads content via the multi-agent pipeline. BUT neoxra-core has NO Threads skill.
- For this PR, we're adding a DEDICATED Threads generation skill to neoxra-core (parallel to the Instagram skill) and a frontend preview.
- The existing ThreadsAgent in the backend can continue to work for the multi-agent pipeline. The new skill is for standalone Threads generation.

## What to build in neoxra-core:

1. **Threads models** (neoxra_core/models/threads.py)
   ```python
   @dataclass
   class ThreadsPost:
       content: str          # max 500 characters
       post_number: int
       purpose: str          # hook | argument | evidence | punchline | cta

   @dataclass 
   class ThreadsThread:
       posts: list[ThreadsPost]
       format: str           # single_post | thread
       reply_bait: str       # question designed to generate replies
   ```
   Validation: each post content <= 500 chars, at least 1 post, format is valid.

2. **Threads prompt builder** (neoxra_core/prompts/threads_generation.py)
   - Enforce: 500 char max per post, conversational tone, no hashtags, 1-2 emoji max, hook formats
   - JSON-only output

3. **ThreadsGenerationSkill** (neoxra_core/skills/threads_generation.py)
   - run() → parse → validate → return ThreadsThread in metadata

4. **Tests** for models, prompt, skill

## What to build in neoxra backend:

5. **Add /api/threads/generate endpoint** (backend/app/api/threads_routes.py)
   - Request: { topic, goal, locale }
   - SSE events: phase_started → content_ready → pipeline_completed

6. **Register route** in main.py

## What to build in neoxra frontend:

7. **Threads types** (frontend/lib/threads-types.ts)

8. **ThreadsPreview component** (frontend/components/ThreadsPreview.tsx)
   - Each post rendered as a card in a vertical thread layout (connected with a vertical line)
   - Character count badge per post (green if ≤500, red if over)
   - Purpose label (hook/argument/etc.) as a subtle badge
   - "Copy post" button per post, "Copy thread" button for all

9. **Threads page** (frontend/app/threads/page.tsx)
   - Same input pattern as other pages
   - Shows ThreadsPreview when content ready

10. **Add to GlobalNav**

## Constraints
- Follow existing patterns in both repos
- Every post must be ≤ 500 characters (validate in model AND show in UI)
- Threads content must sound human, not corporate
- UI text in zh-TW

## Testing
- Generate Threads content → verify each post is ≤ 500 chars
- Copy individual post → paste → verify clean text
- Copy full thread → paste → verify formatted thread

## Output
Summarize: files created in all three locations (core, backend, frontend), how to test.
```

---

### PR 7 — Facebook Adapter Pipeline

```
## Goal
Build Facebook content generation that adapts Instagram output for Facebook's platform and audience.

## Context
- Repos: neoxra-core, neoxra (backend + frontend)
- Facebook content should be generated AFTER Instagram content (it adapts the Instagram output)
- The system design specifies: longer form, no hashtags, discussion prompt, share hook
- This is intentionally simpler than other platforms — it's an adapter, not a full pipeline

## What to build in neoxra-core:

1. **Facebook models** (neoxra_core/models/facebook.py)
   ```python
   @dataclass
   class FacebookPost:
       hook: str
       body: str
       discussion_prompt: str
       share_hook: str
       image_recommendation: str
   ```

2. **Facebook prompt builder** (neoxra_core/prompts/facebook_generation.py)
   - Takes: brief context + Instagram caption + carousel summary
   - Instructs: rewrite for Facebook audience (older, reads more), no hashtags, add discussion question, add share hook
   - JSON-only output

3. **FacebookAdapterSkill** (neoxra_core/skills/facebook_adapter.py)
   - name = "facebook_adapter"
   - run(): receives Instagram content in context → adapts → returns FacebookPost

4. **Tests**

## What to build in neoxra backend:

5. **Add /api/facebook/generate endpoint** (backend/app/api/facebook_routes.py)
   - Request: { topic, instagram_content (optional — if not provided, generates Instagram first), locale }
   - SSE: phase_started → content_ready → pipeline_completed

6. **Register route**

## What to build in neoxra frontend:

7. **Facebook types** (frontend/lib/facebook-types.ts)

8. **FacebookPreview component** (frontend/components/FacebookPreview.tsx)
   - Renders like a Facebook post mockup (user avatar placeholder, post body, like/comment/share bar)
   - Discussion prompt highlighted in a callout
   - Share hook in italics
   - "Copy post" button

9. **Facebook page** (frontend/app/facebook/page.tsx) + add to GlobalNav

## Constraints
- Facebook content must NOT be copy-pasted Instagram content
- Discussion prompt must be a specific question
- This can be simpler/faster than other PRs
- UI text in zh-TW

## Output
Summarize: files created, how to test, what the Facebook preview looks like.
```

---

### PR 8 — Unified Generation Page

```
## Goal
Build the main "Generate All" page — one input, four platform outputs in tabs.

## Context
- Repo: neoxra (backend + frontend)
- All 4 platform pipelines now exist (PRs 1-7)
- This PR creates a single page that orchestrates all four and displays results in tabs
- This is THE demo page for YC and client presentations

## What to build in neoxra backend:

1. **Unified generate endpoint** (backend/app/api/unified_routes.py)
   - `POST /api/generate-all`
   - Request: `{ idea: str, industry: str, audience: str, voice_profile: str, locale: str }`
   - Orchestration:
     1. Call Planner → get Brief
     2. Fan out: Instagram + SEO + Threads (parallel)
     3. After Instagram completes: Facebook (adapter)
   - SSE events: planner_completed, instagram_ready, seo_ready, threads_ready, facebook_ready, all_completed
   - Each platform event includes full output JSON

2. **Register route**

## What to build in neoxra frontend:

3. **Unified generation page** (frontend/app/generate/page.tsx)
   - Input section: idea text area, industry dropdown (legal, tech, health, real estate, general), audience text input, voice profile dropdown, "Generate All" button
   - Progress section: horizontal pipeline visualization showing Planner → Instagram → SEO → Threads → Facebook, each lights up green when complete
   - Results section: 4 tabs (Instagram, SEO, Threads, Facebook)
   - Each tab embeds the corresponding preview component (VisualCarouselRenderer, SeoArticlePreview, ThreadsPreview, FacebookPreview)
   - Each tab has its own export/copy buttons

4. **Platform tab container** (frontend/components/PlatformTabs.tsx)
   - Tab bar with platform icons/names
   - Badge on each tab showing completion status (spinner while generating, checkmark when done)
   - Content area renders the selected platform's preview

5. **Pipeline progress component** (frontend/components/PipelineProgress.tsx)
   - Shows: Planner → IG → SEO → Threads → FB as a horizontal flow
   - Each step: gray (waiting), yellow pulse (running), green (complete), red (error)

6. **Update GlobalNav** — make "Generate All" the primary nav item

## Constraints
- Must work even if one platform fails (show error on that tab, others still show results)
- Total generation should complete in under 60 seconds
- Mobile responsive (tabs stack vertically on mobile)
- UI text in zh-TW

## Testing
- Enter an idea → click Generate All → verify all 4 tabs populate
- Kill the backend mid-stream → verify partial results still show
- Test with different voice profiles
- Test on mobile viewport

## Output
Summarize: all files created, the user flow, how to demo it.
```

---

### PR 9 — Export + Client Delivery Package

```
## Goal
Add "Download All" ZIP export and prepare the law firm client delivery package.

## Context
- Repo: neoxra (frontend + backend)
- The unified generation page (PR 8) shows all 4 platform outputs
- This PR adds: bulk download, law firm voice profile, and demo scenarios

## What to build

1. **Download All utility** (frontend/lib/export-all.ts)
   - Function: `downloadAllOutputs(outputs: AllPlatformOutputs, topicSlug: string): Promise<void>`
   - Creates a ZIP with:
     - `/instagram/slide-01.png`, `slide-02.png`, ... (reuse carousel export from PR 2)
     - `/instagram/caption.txt` (caption + hashtags)
     - `seo-article.md` (markdown with frontmatter)
     - `seo-article.html` (WordPress-ready HTML)
     - `threads.txt` (all posts formatted)
     - `facebook.txt` (full Facebook post)

2. **"Download All" button** — add to unified generation page, below tabs, prominent styling

3. **Law firm voice profile** (backend/voice_profiles/law_firm.yaml)
   ```yaml
   creator:
     name: "Law Firm Partner"
     archetype: "Trusted legal authority who explains complex topics simply"
   voice:
     adjectives: [professional, approachable, knowledgeable, reassuring]
     not: [casual, slangy, intimidating, jargon-heavy]
   signature_moves:
     - Lead with the practical impact, not the legal theory
     - Use everyday analogies to explain legal concepts
     - Always include a "when to seek help" call to action
     - Cite relevant law or regulation by name when helpful
   content_rules:
     max_emojis: 0
     hashtag_style: "5 professional, industry-specific"
     cta_style: "Schedule a consultation / Contact us"
     avoid_phrases:
       - "not legal advice"
       - "this is not a substitute"
       - "game changer"
       - "unlock"
     required_disclaimer: "本內容為一般法律資訊分享，非針對個案之法律意見。如有具體法律問題，建議諮詢專業律師。"
   ```

4. **Demo scenario data** (frontend/lib/demo-scenarios.ts)
   - 3 presets: { name, idea, industry, audience, voiceProfile }
   - "Legal: 車禍理賠" → law_firm voice
   - "Tech: AI content strategy" → default voice  
   - "Personal brand: building in public" → default voice
   - Add scenario selector buttons to the unified page

5. **Fallback/retry logic** (backend/app/core/pipeline.py)
   - If an agent returns malformed JSON, retry once with a "please return valid JSON only" instruction
   - Max 2 retries per agent
   - Log retry events for debugging

6. **Update README.md and CLAUDE.md** with current architecture, new commands, new voice profiles

## Constraints
- ZIP must be < 50MB
- Voice profile must produce content with the required disclaimer
- Demo scenarios must produce consistently good output

## Testing
- Generate all → Download All → unzip → verify all files present and correct
- Test with law firm voice → verify disclaimer appears in all outputs
- Run each demo scenario → verify output quality
- Test retry: mock an agent returning invalid JSON → verify retry succeeds

## Output
Summarize: all files changed, how to demo the download flow, how to verify voice profiles.
```

---

### PR 10 — Validation + Test Coverage

```
## Goal
Harden all pipeline outputs with strict Pydantic validation and add batch processing to the CLI.

## Context
- Repos: neoxra-core and neoxra (backend)
- All 4 platform skills now exist in neoxra-core
- The backend has agents and routes for all platforms
- This PR adds: strict output validation, integration tests, and batch CLI mode

## What to build in neoxra-core:

1. **Strict Pydantic models** for all outputs (if not already using Pydantic — the current codebase uses dataclasses, so add Pydantic validators alongside)
   - Add a `validate()` class method to each output model that raises ValueError on constraint violation
   - Instagram: carousel 5-9 slides, caption non-empty
   - SEO: title 50-60 chars, meta 150-160 chars, word count 1200-2000, at least 3 sections
   - Threads: each post ≤ 500 chars, at least 1 post
   - Facebook: hook non-empty, discussion_prompt non-empty, body non-empty

2. **Tests** (tests/test_output_validation.py)
   - Test each model's validate() with valid and invalid data

## What to build in neoxra backend:

3. **Batch CLI mode** (backend/scripts/run_cli.py)
   - Add `--batch` flag: `python run_cli.py --batch ideas.txt --voice default`
   - Reads one idea per line from the file
   - For each idea: runs full pipeline, saves outputs to `/output/{date}/{idea-slug}/`
   - Output files: `brief.json`, `instagram.json`, `seo.json`, `threads.json`, `facebook.json`
   - Print summary: "Generated 10 content packages in 3m 42s. Cost: ~$1.70"

4. **Integration test** (backend/tests/test_unified_pipeline.py)
   - Mock all LLM calls (return valid JSON for each platform)
   - Run the unified pipeline end-to-end
   - Verify all 4 platform outputs are produced
   - Verify output validation passes on all results

5. **Add validation to all routes**
   - Before returning output to frontend, run validate() on the parsed output
   - If validation fails, retry the agent once
   - If retry also fails, return partial output with a warning flag

## Constraints
- Do NOT change existing model fields (backward compatible)
- Validation should be a method, not a Pydantic BaseModel rewrite (keep dataclasses)
- Batch mode must handle failures gracefully (skip failed ideas, continue processing)

## Testing
- Run: pytest tests/test_output_validation.py -v
- Run: pytest backend/tests/test_unified_pipeline.py -v
- Run: python run_cli.py --batch test_ideas.txt (with 3 test ideas)

## Output
Summarize: validation rules added, batch mode usage, test results.
```

---

## F. Suggested Implementation Order

```
Week 1:
├── PR 1: Instagram Carousel Visual Renderer ──────── START DAY 1
├── PR 4: SEO Article Generation (Core + Backend) ─── START DAY 1 (parallel)
│
├── PR 2: Instagram Image Export ──────────────────── START DAY 3 (after PR 1)
├── PR 5: SEO Article Frontend Preview ────────────── START DAY 3 (after PR 4)
│
├── PR 3: Instagram Image Template Upload ─────────── START DAY 4 (after PR 1)
│
Week 2:
├── PR 6: Threads Generation Pipeline ────────────── START DAY 6 (parallel)
├── PR 7: Facebook Adapter Pipeline ──────────────── START DAY 6 (parallel with PR 6)
│
├── PR 8: Unified Generation Page ────────────────── START DAY 8 (after PRs 1-7)
│
├── PR 9: Export + Client Delivery ───────────────── START DAY 10 (after PR 8)
├── PR 10: Validation + Test Coverage ────────────── START DAY 10 (parallel with PR 9)
│
└── DEMO DAY ─────────────────────────────────────── DAY 12-14
```

### Parallelism opportunities:
- **PR 1 + PR 4**: Fully independent (frontend vs core+backend). Run simultaneously.
- **PR 2 + PR 5**: Both depend on different PRs (PR 1 and PR 4). Can run simultaneously after their deps.
- **PR 6 + PR 7**: Independent platform pipelines. Run simultaneously.
- **PR 9 + PR 10**: Both depend on PR 8, but are otherwise independent. Run simultaneously.

### Critical path (minimum path to first demo):
```
PR 1 (Day 1-2) → PR 8 (Day 8-9) → PR 9 (Day 10-11) → Demo
    + PR 4 (Day 1-3) → PR 5 (Day 3-4) ↗
    + PR 6 (Day 6-7) ↗
    + PR 7 (Day 6-7) ↗
```

**First visible demo possible after PR 1** (Day 2): Instagram with visual carousel.
**Full four-platform demo after PR 8** (Day 9): Unified page with all platforms.
**Client-ready after PR 9** (Day 11): Download packages + law firm voice.

### What to tackle if behind schedule:
1. **Cut PR 3** (image template upload) — nice to have, not required for demo
2. **Cut PR 10** (validation + batch) — hardening, not demo-critical
3. **Simplify PR 7** (Facebook) — just reformat Instagram caption with minimal changes
4. **Simplify PR 2** (image export) — offer "Copy as HTML" instead of PNG export

---

## G. What to Cut for Now

| Feature | Why cut | When to revisit |
|---------|---------|-----------------|
| Publishing integrations (LinkedIn API, auto-posting) | Not needed for demo or client delivery. Manual posting is fine. | After 10 customers ask for it |
| Gmail scanner integration | Already exists but irrelevant to content generation MVP | Post-MVP if client needs it |
| Multi-tenant / organization features | DB models exist but no product need yet | When onboarding 2nd client |
| Advanced analytics / A/B testing | Requires published content + performance data | Month 3+ |
| Strategy module in neoxra-core | Scaffolded but no clear product need | When pipeline needs optimization logic |
| CI/CD pipeline | Manual deploy is fine for 1-2 users | When shipping weekly updates |
| Database-backed content history | No need to persist yet — outputs are files | When clients want to browse past generations |
| Internationalization beyond zh-TW/en | Law firm client is Taiwan-based, demo is in Chinese or English | When expanding to non-Taiwan clients |
| Authentication for web app | Demo access tokens work fine. No need for full user accounts. | When offering self-serve to paying customers |
| Critic agent integration in new pipelines | The existing multi-agent pipeline has Critic. New standalone skills skip it for speed. | When quality feedback loop is needed |
| Reel script video generation | Text reel scripts are fine for now | When client specifically asks for video |
| Content calendar / scheduling UI | Out of scope for MVP | Month 2-3 |
| Cost tracking / usage metering | Log it but don't build a dashboard | When billing matters |
