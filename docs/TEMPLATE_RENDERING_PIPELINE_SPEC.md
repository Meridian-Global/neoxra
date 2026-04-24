# Template Rendering Pipeline — Full System Spec

> Neoxra 目前缺少的核心系統：讓使用者上傳模板或選擇內建模板，產出可直接下載的高品質 Instagram 輪播圖文。

---

## Part 1: Problem Diagnosis

### 1.1 Why Downloads Are All Black

**Root cause chain:**

1. Export slides are rendered to hidden DOM nodes positioned at `left: -12000px` (line 241, `VisualCarouselRenderer.tsx`)
2. `html2canvas` captures these off-screen nodes, but the library has known issues:
   - CSS `linear-gradient()` in `background` (used by "bold" theme) doesn't render correctly
   - CSS custom properties (`var(--xxx)`) inside child elements aren't resolved when the element is off-screen
   - `backgroundColor: null` is passed explicitly — so if inline styles fail, the canvas is transparent → saved as black PNG
3. The `renderSlide()` function passes `theme.bgColor` as inline `style.background`, which works for solid colors (`#101828`) but fails for gradients (`linear-gradient(135deg, ...)`) in html2canvas
4. No fallback: if html2canvas returns a blank/transparent canvas, it still zips and downloads the empty file

### 1.2 Why Uploaded Templates Don't Work

**Current "template upload" is not a template system — it's a style description pass-through:**

1. User uploads image → `POST /api/instagram/upload-reference`
2. Backend sends image to Claude Vision API → gets a text description of the visual style
3. Description stored as `referenceImageDescription` string in frontend state
4. When generating, the description is sent as `reference_image_description` parameter
5. AI uses description as generation context to influence writing tone/style
6. **The uploaded image is never stored, never parsed for layout, never used for rendering**

The system treats the uploaded image as "inspiration for the AI writer" — not as a visual template to be applied.

### 1.3 What's Missing

| Capability | Current State | Needed |
|------------|--------------|--------|
| Template storage | None | Template objects with layout, colors, fonts, decorations |
| Template parsing from image | Vision API → text description only | Extract: color palette, layout grid, font sizes, element positions |
| Server-side rendering | None (client-only html2canvas) | Playwright or Puppeteer for reliable high-quality PNG rendering |
| Layout engine | 3 hardcoded React themes | Dynamic template-driven layout with variable slot positions |
| Decoration/asset layer | None | Background images, stickers, brand logos, decorative elements |
| Built-in template library | 3 basic themes | 10+ professionally designed templates |
| Custom template builder | None | UI for users to create/customize templates |
| User template persistence | None | Save user-created templates to database |

---

## Part 2: Architecture — Three Repos

### 2.1 System Overview

```
User uploads template image
        │
        ▼
┌─────────────────────┐
│  neoxra (frontend)   │  ← Template upload UI, preview, download
│  Next.js + React     │
└────────┬────────────┘
         │ API calls
         ▼
┌─────────────────────┐
│  neoxra (backend)    │  ← Template CRUD, AI content generation
│  FastAPI             │
└────────┬────────────┘
         │ calls
         ▼
┌─────────────────────┐         ┌──────────────────────┐
│  neoxra-core         │  ←──── │  neoxra-renderer      │
│  (AI generation)     │        │  (NEW: image output)  │
│  Content schemas     │        │  Playwright + layout  │
└──────────────────────┘        │  Template engine      │
                                └──────────────────────┘
```

### 2.2 Repo Responsibilities

#### neoxra (public product shell)

**Frontend changes:**
- Template upload UI (enhanced FileUpload with template mode)
- Template gallery/picker (built-in + user templates)
- Real-time template preview (React component)
- Download flow → calls backend render API instead of client-side html2canvas
- Template customization panel (colors, fonts, layout adjustments)

**Backend changes:**
- `POST /api/templates/upload` — accept template image, parse via Vision API, create template object
- `GET /api/templates` — list built-in + user templates
- `POST /api/render/carousel` — accept content + template → return rendered images
- Template CRUD endpoints
- Render job queue (for heavy renders)

#### neoxra-core (private AI package)

**Changes:**
- `TemplateSpec` dataclass — structured representation of a template
- `TemplateMatcher` skill — AI analyzes uploaded image, extracts structured template spec
- Enhanced carousel content generation — output includes layout hints, emphasis levels
- `ContentSlot` schema — defines where text goes (title position, body position, badge position)

#### neoxra-renderer (NEW private package)

**Purpose:** Stateless image rendering service

**Components:**
- **Template engine** — takes TemplateSpec + content → HTML string
- **Layout engine** — calculates text positions, sizes, line breaks for CJK + Latin
- **Playwright renderer** — renders HTML → 1080×1080 PNG
- **Built-in template library** — 10+ templates as HTML/CSS + metadata
- **Asset manager** — handles background images, SVG decorations, brand logos

**Why a separate package:**
- Playwright/Puppeteer dependencies are heavy — isolate from core
- Can be deployed as a microservice later (render-as-a-service)
- Clean boundary: core generates content, renderer makes images

### 2.3 Data Flow

```
Flow A: User provides template + idea
─────────────────────────────────────
1. User uploads template image
2. Backend → neoxra-core TemplateMatcher → extracts TemplateSpec
3. User enters idea/topic
4. Backend → neoxra-core → generates carousel content (slides with title, body, emphasis)
5. Backend → neoxra-renderer → render(TemplateSpec + CarouselSlides) → PNG[]
6. Frontend receives PNGs, shows preview, enables download

Flow B: User selects built-in template + idea
──────────────────────────────────────────────
1. User picks from template gallery
2. Built-in TemplateSpec loaded from neoxra-renderer library
3. Same steps 3-6 as above

Flow C: User provides only idea (no template)
──────────────────────────────────────────────
1. User enters idea/topic only
2. Backend → neoxra-core → generates content
3. Backend → neoxra-renderer → render(default template + content) → PNG[]
4. Frontend receives PNGs
```

---

## Part 3: Data Models

### 3.1 TemplateSpec (neoxra-core)

```python
@dataclass
class ColorPalette:
    background: str           # "#101828" or "linear-gradient(...)"
    text_primary: str         # "#F8FAFC"
    text_secondary: str       # "#CBD5E1"
    accent: str               # "#D6B981"
    badge_bg: str             # "#D6B981"
    badge_text: str           # "#111827"
    accent_bar: str           # "#D6B981"

@dataclass
class LayoutSlot:
    """Defines where a content element appears on the 1080×1080 canvas"""
    x: int                    # px from left
    y: int                    # px from top
    width: int                # px
    max_lines: int            # text wrapping limit
    font_size: int            # px
    font_weight: int          # 400, 500, 600, 700
    line_height: float        # 1.2, 1.4, etc.
    text_align: str           # "left", "center", "right"

@dataclass
class TemplateSpec:
    id: str
    name: str
    name_zh: str
    colors: ColorPalette
    title_slot: LayoutSlot
    body_slot: LayoutSlot
    badge_slot: LayoutSlot         # "1/5" indicator
    accent_bar_slot: LayoutSlot | None  # bottom accent line
    background_image: str | None   # base64 or URL to bg image
    decorations: list[str]         # SVG decoration layer references
    watermark: str | None          # "@hogan.tech" style watermark
    watermark_position: str        # "bottom-right", "bottom-center"
    font_family: str               # "Noto Sans TC", etc.
    border_radius: int             # px, for rounded corners
    padding: int                   # px, overall padding
```

### 3.2 RenderRequest / RenderResponse

```python
@dataclass
class SlideContent:
    index: int                # 0-based
    total: int                # total slides
    title: str
    body: str
    emphasis: str             # "normal", "strong", "quiet"
    text_alignment: str       # "left", "center", "right"

@dataclass
class RenderRequest:
    template: TemplateSpec
    slides: list[SlideContent]
    output_format: str        # "png", "jpg"
    output_size: int          # 1080

@dataclass
class RenderResponse:
    images: list[bytes]       # list of PNG blobs
    metadata: dict            # render stats
```

### 3.3 Enhanced CarouselSlide (neoxra-core)

Extend the existing `CarouselSlide` to include layout hints:

```python
# Add to existing CarouselSlide dataclass
@dataclass
class CarouselSlide:
    title: str
    body: str
    text_alignment: str = "center"    # existing
    emphasis: str = "normal"          # existing
    # NEW fields for template rendering:
    title_font_size_hint: int | None = None
    body_font_size_hint: int | None = None
    visual_weight: str = "balanced"    # "title-heavy", "body-heavy", "balanced"
```

---

## Part 4: Built-in Template Library

### 4.1 Template Definitions (10 templates)

Based on the uploaded images, here are the template styles:

| # | Name | Style | Background | Text | Accent |
|---|------|-------|------------|------|--------|
| 1 | Professional Dark | 深色金線 | #101828 solid | #F8FAFC | Gold #D6B981 |
| 2 | Bold Gradient | 醒目漸層 | Orange-gold gradient | #FFFFFF | Yellow #FDE68A |
| 3 | Minimal Light | 極簡淺色 | #F7F1E8 solid | #1F2937 | Brown #8A6A3D |
| 4 | Emerald Editorial | 綠色社論 | Forest green with photo bg | #FFFFFF | White border frame |
| 5 | Neon Purple | 霓虹紫 | #1a1a2e solid | #F5F5F5 | Purple gradient |
| 6 | Coral Warm | 珊瑚暖調 | Coral-pink gradient | #FFFFFF | White |
| 7 | Ocean Blue | 海洋藍 | Navy to teal gradient | #FFFFFF | Cyan accent |
| 8 | Sunset Brand | 日落品牌 | Orange-pink gradient | #FFFFFF | Yellow highlight |
| 9 | Clean White | 乾淨白底 | #FFFFFF | #111111 | Black accent line |
| 10 | Film Magazine | 底片雜誌 | Green photo bg + border frame | #FFFFFF | Frame + watermark |

Templates 1-3 = current themes (migrated to new system).
Template 4 & 10 = based on uploaded green template images (photo background with border frame).
Templates 5-9 = new gradient/color options.

### 4.2 Template HTML Structure

Each template is an HTML file + CSS + metadata JSON:

```
neoxra-renderer/
  templates/
    professional-dark/
      template.html      ← Jinja2/Mustache template
      styles.css
      metadata.json       ← TemplateSpec as JSON
    emerald-editorial/
      template.html
      styles.css
      metadata.json
      assets/
        bg-texture.png    ← background image
        frame.svg         ← border frame decoration
    ...
```

### 4.3 Template HTML Example (Professional Dark)

```html
<div class="slide" style="width:1080px; height:1080px; background:{{colors.background}}; padding:{{padding}}px; font-family:'{{font_family}}', sans-serif;">
  <div class="badge" style="background:{{colors.badge_bg}}; color:{{colors.badge_text}}; padding:12px 32px; border-radius:999px; font-size:32px; font-weight:700;">
    {{slide_number}}/{{total_slides}}
  </div>
  <div class="content" style="display:flex; flex-direction:column; justify-content:center; align-items:{{text_align_flex}}; text-align:{{text_alignment}}; height:calc(100% - 92px);">
    <h1 style="color:{{colors.text_primary}}; font-size:{{title_font_size}}px; font-weight:700; line-height:1.05; max-width:92%;">
      {{title}}
    </h1>
    <p style="color:{{colors.text_secondary}}; font-size:{{body_font_size}}px; font-weight:500; line-height:1.42; margin-top:40px; max-width:92%;">
      {{body}}
    </p>
  </div>
  <div class="accent-bar" style="position:absolute; bottom:{{padding}}px; left:{{padding}}px; width:176px; height:12px; border-radius:999px; background:{{colors.accent_bar}};"></div>
</div>
```

---

## Part 5: neoxra-renderer Package Design

### 5.1 Package Structure

```
neoxra-renderer/
├── pyproject.toml
├── neoxra_renderer/
│   ├── __init__.py
│   ├── engine.py              ← Main render() function
│   ├── layout.py              ← Text measurement, CJK line-breaking
│   ├── template_loader.py     ← Load template from file or TemplateSpec
│   ├── browser.py             ← Playwright browser pool manager
│   ├── font_metrics.py        ← Font measurement for CJK + Latin
│   ├── models.py              ← RenderRequest, RenderResponse, etc.
│   └── templates/             ← Built-in template library
│       ├── professional-dark/
│       ├── bold-gradient/
│       ├── minimal-light/
│       ├── emerald-editorial/
│       ├── neon-purple/
│       ├── coral-warm/
│       ├── ocean-blue/
│       ├── sunset-brand/
│       ├── clean-white/
│       └── film-magazine/
├── tests/
│   ├── test_engine.py
│   ├── test_layout.py
│   └── test_templates.py
└── scripts/
    └── render_sample.py       ← CLI tool for testing
```

### 5.2 Core Engine

```python
# neoxra_renderer/engine.py

from playwright.async_api import async_playwright
from neoxra_renderer.models import RenderRequest, RenderResponse
from neoxra_renderer.template_loader import load_template_html
from neoxra_renderer.layout import calculate_font_sizes
from neoxra_renderer.browser import get_browser_page

async def render_carousel(request: RenderRequest) -> RenderResponse:
    """Render carousel slides to PNG images."""
    images = []
    
    async with get_browser_page() as page:
        for slide in request.slides:
            # 1. Calculate optimal font sizes for content length
            font_sizes = calculate_font_sizes(
                title=slide.title,
                body=slide.body,
                template=request.template,
                emphasis=slide.emphasis,
            )
            
            # 2. Render template HTML with content
            html = load_template_html(
                template=request.template,
                slide=slide,
                font_sizes=font_sizes,
            )
            
            # 3. Set page content and screenshot
            await page.set_content(html, wait_until='networkidle')
            await page.set_viewport_size({
                'width': request.output_size,
                'height': request.output_size,
            })
            
            # 4. Screenshot to PNG bytes
            png_bytes = await page.screenshot(
                type='png',
                clip={'x': 0, 'y': 0, 'width': request.output_size, 'height': request.output_size},
            )
            images.append(png_bytes)
    
    return RenderResponse(images=images, metadata={'slide_count': len(images)})
```

### 5.3 Layout Engine (CJK-Aware)

```python
# neoxra_renderer/layout.py

import unicodedata

def count_visual_width(text: str) -> float:
    """CJK characters are ~2x width of Latin characters."""
    width = 0.0
    for ch in text:
        if unicodedata.east_asian_width(ch) in ('W', 'F'):
            width += 2.0
        else:
            width += 1.0
    return width

def calculate_font_sizes(
    title: str,
    body: str,
    template: 'TemplateSpec',
    emphasis: str = 'normal',
) -> dict:
    """Auto-scale font sizes based on content length and template slot dimensions."""
    title_width = count_visual_width(title)
    body_width = count_visual_width(body)
    
    # Base sizes from template spec
    base_title = template.title_slot.font_size
    base_body = template.body_slot.font_size
    
    # Scale down for long content
    max_title_chars_per_line = template.title_slot.width / (base_title * 0.6)
    title_lines = title_width / max_title_chars_per_line
    
    if title_lines > template.title_slot.max_lines:
        scale = template.title_slot.max_lines / title_lines
        base_title = int(base_title * scale)
    
    # Emphasis adjustments
    if emphasis == 'strong':
        base_title = int(base_title * 1.15)
    elif emphasis == 'quiet':
        base_title = int(base_title * 0.85)
    
    return {
        'title_font_size': max(base_title, 40),  # minimum 40px
        'body_font_size': max(base_body, 28),     # minimum 28px
    }
```

### 5.4 Dependencies

```toml
[project]
name = "neoxra-renderer"
requires-python = ">=3.10"
dependencies = [
    "playwright>=1.40.0",
    "jinja2>=3.1.0",
    "pillow>=10.0.0",       # for image post-processing if needed
]

[project.optional-dependencies]
dev = ["pytest>=8.0", "pytest-asyncio>=0.23"]
```

### 5.5 Browser Pool

```python
# neoxra_renderer/browser.py

from contextlib import asynccontextmanager
from playwright.async_api import async_playwright, Browser, Page

_browser: Browser | None = None

async def _get_browser() -> Browser:
    global _browser
    if _browser is None or not _browser.is_connected():
        pw = await async_playwright().start()
        _browser = await pw.chromium.launch(headless=True)
    return _browser

@asynccontextmanager
async def get_browser_page():
    browser = await _get_browser()
    page = await browser.new_page()
    try:
        yield page
    finally:
        await page.close()
```

---

## Part 6: Backend API Changes (neoxra)

### 6.1 New Endpoints

```python
# backend/app/api/template_routes.py

@router.get("/api/templates")
async def list_templates():
    """List all available templates (built-in + user)."""
    # Returns: list of TemplateSpec metadata (without full layout details)

@router.get("/api/templates/{template_id}")
async def get_template(template_id: str):
    """Get full TemplateSpec for a template."""

@router.post("/api/templates/parse-image")
async def parse_template_from_image(file: UploadFile):
    """Upload an image → AI extracts TemplateSpec."""
    # 1. Send to Claude Vision API with structured extraction prompt
    # 2. Returns: TemplateSpec JSON

@router.post("/api/render/carousel")
async def render_carousel(request: RenderCarouselRequest):
    """Render carousel slides using template → returns PNG images."""
    # 1. Load template (built-in or parsed)
    # 2. Call neoxra-renderer to render
    # 3. Return: ZIP of PNGs or individual PNG URLs

@router.post("/api/instagram/generate-and-render")
async def generate_and_render(request: GenerateAndRenderRequest):
    """Full pipeline: idea → content → rendered images."""
    # 1. Generate content via neoxra-core
    # 2. Render via neoxra-renderer
    # 3. Return: content JSON + rendered images
```

### 6.2 Template Parsing Prompt (for Claude Vision API)

```python
TEMPLATE_PARSE_PROMPT = """
Analyze this Instagram carousel slide template image and extract its design properties.

Return a JSON object with exactly these fields:

{
  "colors": {
    "background": "hex color or CSS gradient string",
    "text_primary": "hex color for main title text",
    "text_secondary": "hex color for body/subtitle text",
    "accent": "hex color for accent elements",
    "badge_bg": "hex color for the slide number badge background",
    "badge_text": "hex color for the slide number badge text",
    "accent_bar": "hex color for any accent line/bar"
  },
  "layout": {
    "has_background_image": true/false,
    "background_image_description": "description of bg image if present",
    "has_border_frame": true/false,
    "frame_description": "description of border/frame if present",
    "text_alignment": "left" | "center" | "right",
    "title_position": "top" | "center" | "bottom",
    "badge_position": "top-left" | "top-right" | "bottom-left" | "bottom-right",
    "has_accent_bar": true/false,
    "accent_bar_position": "bottom-left" | "bottom-center" | "bottom-right",
    "has_watermark": true/false,
    "watermark_text": "text if visible",
    "watermark_position": "position if visible"
  },
  "typography": {
    "title_size": "large" | "medium" | "small",
    "title_weight": "bold" | "semibold" | "normal",
    "body_size": "large" | "medium" | "small",
    "estimated_font": "font family name if identifiable"
  },
  "style": {
    "overall_mood": "professional" | "bold" | "minimal" | "editorial" | "playful",
    "has_decorations": true/false,
    "decoration_description": "description of any stickers, illustrations, icons"
  }
}

Respond ONLY with the JSON object. No markdown. No additional text.
"""
```

---

## Part 7: Frontend Changes (neoxra)

### 7.1 New Components

```
frontend/components/
├── TemplateGallery.tsx         ← Grid of available templates with preview
├── TemplateUploader.tsx        ← Upload image → parse → preview extracted template
├── TemplatePreview.tsx         ← Single template card with sample content
├── TemplateCustomizer.tsx      ← Color/font/layout adjustment panel
├── ServerRenderedCarousel.tsx  ← Shows server-rendered PNGs instead of React
└── DownloadPanel.tsx           ← Download controls (format, quality, individual/zip)
```

### 7.2 Instagram Page Flow Update

**Current flow:**
1. Upload reference image → text description → passed to AI as context
2. Enter topic → AI generates content
3. React renders slides client-side (VisualCarouselRenderer)
4. Download → html2canvas → often broken PNGs

**New flow:**
1. **Choose template**: Pick from gallery OR upload custom template image
2. **Upload template** → backend parses via Vision API → returns TemplateSpec → show template preview
3. Enter topic → AI generates carousel content
4. **Server renders**: Backend sends content + template to neoxra-renderer → returns PNG blobs
5. Frontend shows rendered PNGs in preview
6. Download → already-rendered PNGs → reliable ZIP download

### 7.3 TemplateGallery Component

```tsx
type TemplateGalleryProps = {
  onSelect: (templateId: string) => void
  selected: string | null
  copy: {
    title: string
    subtitle: string
    uploadCustom: string
    builtIn: string
  }
}

// Renders grid of template thumbnails
// Each shows a sample slide with the template applied
// "Upload Custom" button at the top
// Selected template has gradient border highlight
```

### 7.4 Download Flow Fix

Replace client-side html2canvas with server-side rendering:

```tsx
// OLD (broken):
async function handleExport() {
  await exportCarousel(exportSlideRefs.current, topicSlug)  // html2canvas
}

// NEW (reliable):
async function handleExport() {
  const response = await fetch(`${API_BASE_URL}/api/render/carousel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      template_id: selectedTemplate,
      slides: carouselSlides,
    }),
  })
  const blob = await response.blob()
  saveAs(blob, `${topicSlug}-carousel.zip`)
}
```

---

## Part 8: PR Phases & Execution Order

### Phase 1: Fix Current Bugs (Quick Wins)
> Get the existing system working first, before building the new pipeline.

**PR 1.1: Fix html2canvas black export bug** `neoxra`
- Repo: neoxra (frontend only)
- Files: `lib/carousel-export.ts`, `components/VisualCarouselRenderer.tsx`
- Fix: Add explicit `backgroundColor` to html2canvas options; ensure all inline styles use literal colors not CSS variables; for gradient backgrounds, render to a visible (but transparent overlay) element instead of off-screen
- Trello: 3 tasks
- Priority: CRITICAL — unblocks current users

**PR 1.2: Fix template upload to actually affect visual output** `neoxra`
- Repo: neoxra (frontend + backend)
- Files: `app/instagram/page.tsx`, `lib/carousel-themes.ts`
- Fix: When reference image is analyzed, extract color palette from the description and create a dynamic CarouselTheme from it, so the carousel preview visually matches the uploaded reference
- Trello: 4 tasks

### Phase 2: Foundation — neoxra-renderer Package
> Build the rendering engine as a standalone package.

**PR 2.1: Bootstrap neoxra-renderer package** `neoxra-renderer`
- Repo: NEW — neoxra-renderer
- Files: Package scaffold, pyproject.toml, models.py, engine.py, browser.py
- Creates: Basic package with Playwright-based render function
- Trello: 5 tasks

**PR 2.2: Layout engine + CJK text measurement** `neoxra-renderer`
- Repo: neoxra-renderer
- Files: layout.py, font_metrics.py, tests/test_layout.py
- Creates: Auto-scaling font sizes, CJK-aware line breaking, visual width calculation
- Trello: 4 tasks

**PR 2.3: Built-in template library (first 5 templates)** `neoxra-renderer`
- Repo: neoxra-renderer
- Files: templates/ directory with 5 template folders (professional-dark, bold-gradient, minimal-light, emerald-editorial, neon-purple)
- Each template: HTML template + CSS + metadata.json
- Trello: 6 tasks

### Phase 3: neoxra-core Schema Extensions

**PR 3.1: TemplateSpec + TemplateMatcher models** `neoxra-core`
- Repo: neoxra-core
- Files: models/template.py, skills/template_matcher.py, prompts/template_parsing.py
- Creates: TemplateSpec dataclass, TemplateMatcher skill (Vision API → TemplateSpec), parsing prompt
- Trello: 5 tasks

**PR 3.2: Enhanced CarouselSlide with layout hints** `neoxra-core`
- Repo: neoxra-core
- Files: models/carousel.py (or update existing Instagram models)
- Adds: title_font_size_hint, body_font_size_hint, visual_weight fields
- Backward compatible — new fields are optional
- Trello: 2 tasks

### Phase 4: Backend Integration

**PR 4.1: Template API endpoints** `neoxra`
- Repo: neoxra (backend)
- Files: backend/app/api/template_routes.py, backend/app/core_client/local.py
- Creates: GET /api/templates, GET /api/templates/:id, POST /api/templates/parse-image
- Trello: 5 tasks

**PR 4.2: Server-side render endpoint** `neoxra`
- Repo: neoxra (backend)
- Files: backend/app/api/render_routes.py
- Creates: POST /api/render/carousel (calls neoxra-renderer)
- Accepts: template_id + slides → returns ZIP of PNGs
- Trello: 4 tasks

**PR 4.3: Generate-and-render combined endpoint** `neoxra`
- Repo: neoxra (backend)
- Files: backend/app/api/render_routes.py (extend)
- Creates: POST /api/instagram/generate-and-render
- Full pipeline: idea → content → render → PNGs
- Trello: 3 tasks

### Phase 5: Frontend — Template UI + Server Rendering

**PR 5.1: Template gallery + selection UI** `neoxra`
- Repo: neoxra (frontend)
- Files: components/TemplateGallery.tsx, components/TemplatePreview.tsx
- Creates: Template grid picker, preview cards, built-in template thumbnails
- Trello: 4 tasks

**PR 5.2: Template upload + parsing UI** `neoxra`
- Repo: neoxra (frontend)
- Files: components/TemplateUploader.tsx, components/TemplateCustomizer.tsx
- Creates: Upload image → call parse endpoint → preview extracted template → optional color/font customization
- Trello: 5 tasks

**PR 5.3: Replace html2canvas with server rendering** `neoxra`
- Repo: neoxra (frontend)
- Files: components/ServerRenderedCarousel.tsx, components/DownloadPanel.tsx, app/instagram/page.tsx
- Replaces: Client-side html2canvas export with server-rendered PNGs
- Download button calls /api/render/carousel
- Preview shows server-rendered thumbnails
- Trello: 5 tasks

**PR 5.4: Instagram page integration** `neoxra`
- Repo: neoxra (frontend)
- Files: app/instagram/page.tsx
- Integrates: TemplateGallery + TemplateUploader + ServerRenderedCarousel into the Instagram studio page
- Full flow: choose/upload template → enter idea → generate → preview server-rendered → download
- Trello: 4 tasks

### Phase 6: Expansion + Polish

**PR 6.1: Add 5 more built-in templates** `neoxra-renderer`
- Repo: neoxra-renderer
- Files: templates/ (coral-warm, ocean-blue, sunset-brand, clean-white, film-magazine)
- Trello: 5 tasks

**PR 6.2: Generate All integration** `neoxra`
- Repo: neoxra (frontend)
- Files: app/generate/page.tsx, components/PlatformTabs.tsx
- Adds: Template selection to Generate All flow, Instagram tab shows rendered PNGs
- Trello: 3 tasks

**PR 6.3: Legal demo integration** `neoxra`
- Repo: neoxra (frontend)
- Files: app/demo/legal/page.tsx
- Adds: Server-rendered sample carousel images for demo cases
- Trello: 2 tasks

---

## Part 9: Trello Task List

### Phase 1 Tasks (7 tasks)

```
[BUG] Fix html2canvas black export — add explicit backgroundColor | frontend | easy
[BUG] Fix gradient background rendering in export mode | frontend | medium
[BUG] Ensure all export slide styles use literal values not CSS vars | frontend | medium
[FEAT] Extract color palette from reference image description | backend | medium
[FEAT] Create dynamic CarouselTheme from extracted colors | frontend | medium
[FEAT] Apply dynamic theme when reference image is uploaded | frontend | medium
[TEST] Verify carousel export produces visible images | frontend | easy
```

### Phase 2 Tasks (15 tasks)

```
[INFRA] Bootstrap neoxra-renderer repo with pyproject.toml | renderer | easy
[FEAT] Create RenderRequest/RenderResponse models | renderer | easy
[FEAT] Implement Playwright browser pool manager | renderer | medium
[FEAT] Implement basic render() engine function | renderer | hard
[TEST] Test engine renders a simple HTML slide to PNG | renderer | medium
[FEAT] Implement CJK visual width calculation | renderer | medium
[FEAT] Implement auto-scaling font size calculator | renderer | hard
[FEAT] Implement CJK-aware line breaking | renderer | medium
[TEST] Test layout engine with Chinese + English text | renderer | medium
[TMPL] Create professional-dark template (migrate from existing) | renderer | medium
[TMPL] Create bold-gradient template (migrate from existing) | renderer | medium
[TMPL] Create minimal-light template (migrate from existing) | renderer | medium
[TMPL] Create emerald-editorial template (new, photo bg + frame) | renderer | hard
[TMPL] Create neon-purple template (new, gradient) | renderer | medium
[TEST] Test all 5 templates render correctly | renderer | medium
```

### Phase 3 Tasks (7 tasks)

```
[MODEL] Create TemplateSpec dataclass in neoxra-core | core | medium
[MODEL] Create ColorPalette, LayoutSlot dataclasses | core | easy
[SKILL] Create TemplateMatcher skill (Vision API → TemplateSpec) | core | hard
[PROMPT] Write template parsing prompt for Vision API | core | medium
[TEST] Test TemplateMatcher with sample template images | core | medium
[MODEL] Add layout hint fields to CarouselSlide | core | easy
[TEST] Test backward compatibility of extended CarouselSlide | core | easy
```

### Phase 4 Tasks (12 tasks)

```
[API] Create GET /api/templates endpoint | backend | medium
[API] Create GET /api/templates/:id endpoint | backend | easy
[API] Create POST /api/templates/parse-image endpoint | backend | hard
[CORE] Wire TemplateMatcher skill into core_client | backend | medium
[TEST] Test template listing and parsing endpoints | backend | medium
[API] Create POST /api/render/carousel endpoint | backend | hard
[CORE] Wire neoxra-renderer into backend dependencies | backend | medium
[API] Handle render timeout and error cases | backend | medium
[TEST] Test render endpoint with sample content | backend | medium
[API] Create POST /api/instagram/generate-and-render endpoint | backend | hard
[CORE] Wire full pipeline: generate → render | backend | medium
[TEST] Test combined generate-and-render flow | backend | medium
```

### Phase 5 Tasks (18 tasks)

```
[UI] Create TemplateGallery component | frontend | medium
[UI] Create TemplatePreview card component | frontend | easy
[UI] Add template gallery to Instagram page | frontend | medium
[UI] Style template selection with gradient borders | frontend | easy
[UI] Create TemplateUploader component | frontend | medium
[UI] Create TemplateCustomizer (color/font adjustments) | frontend | hard
[UI] Wire template upload to parse-image API | frontend | medium
[UI] Show parsed template preview after upload | frontend | medium
[UI] Handle parse errors and loading states | frontend | easy
[UI] Create ServerRenderedCarousel component | frontend | medium
[UI] Create DownloadPanel component | frontend | easy
[UI] Replace html2canvas export with server render API call | frontend | medium
[UI] Show server-rendered PNG thumbnails in preview | frontend | medium
[UI] Handle render loading and error states | frontend | easy
[FLOW] Integrate template selection into Instagram page flow | frontend | hard
[FLOW] Add template picker step before generation | frontend | medium
[FLOW] Wire "generate → render → preview → download" end-to-end | frontend | hard
[i18n] Add bilingual copy for all new template UI | frontend | medium
```

### Phase 6 Tasks (10 tasks)

```
[TMPL] Create coral-warm template | renderer | medium
[TMPL] Create ocean-blue template | renderer | medium
[TMPL] Create sunset-brand template | renderer | medium
[TMPL] Create clean-white template | renderer | medium
[TMPL] Create film-magazine template (photo bg style) | renderer | hard
[UI] Add template gallery to Generate All page | frontend | medium
[FLOW] Wire template selection in Generate All flow | frontend | medium
[UI] Add server-rendered carousel to Legal Demo | frontend | medium
[QA] Cross-page template rendering QA | all | medium
[QA] Verify all 10 templates × 2 languages × dark/light | all | medium
```

**Total: 69 tasks across 17 PRs in 6 phases.**

---

## Part 10: Claude Code CLI Prompts

### PR 1.1 — Fix Black Export Bug

```
Fix the carousel image export bug in the Neoxra frontend. When users download carousel images, they get all-black PNGs.

Root cause: html2canvas fails to render off-screen elements with CSS variables and gradients.

## File: frontend/lib/carousel-export.ts

Change the html2canvas options in renderCarouselSlideToPng():

1. Remove `backgroundColor: null` — this causes transparent canvas which saves as black
2. Add `backgroundColor: '#101828'` as a fallback
3. But better: accept the theme background color as a parameter:

Change the function signature:
  export async function renderCarouselSlideToPng(slideElement: HTMLElement, bgFallback?: string): Promise<Blob>

In the html2canvas call, set:
  backgroundColor: bgFallback || '#101828',

4. Also add logging: if the resulting canvas has only one color (all black/white), log a warning.

## File: frontend/components/VisualCarouselRenderer.tsx

1. In the handleExport function, pass the theme's background color to exportCarousel:
   Pass theme.bgColor as a second argument

2. In the export slides section (line 241-253), change the hidden container approach:
   Instead of `left: [-12000px]`, use:
   - `position: fixed; top: 0; left: 0; opacity: 0; pointer-events: none;`
   This keeps the element in the render tree where html2canvas can properly compute styles.

3. In the renderSlide function (line 121-153), for export mode only:
   Replace ALL CSS variable references with literal values:
   - Do NOT use any var(--xxx) in export mode
   - Use the theme object's literal color values for everything
   - For the gradient background in "bold" theme, add a solid color fallback:
     style={{ background: theme.bgColor.startsWith('linear') ? '#111827' : theme.bgColor }}
     Actually better: keep the gradient but ensure it's passed as inline style, not a CSS class.

4. Ensure every element in the export render path has explicit inline color styles.

## File: frontend/lib/carousel-export.ts

Update exportCarousel to accept and pass bgFallback:
  export async function exportCarousel(slideElements: HTMLElement[], topicSlug: string, bgFallback?: string): Promise<void>

Pass bgFallback to each renderCarouselSlideToPng call.

## Constraints
- Do NOT change the visual preview (non-export) rendering
- Do NOT change carousel-themes.ts
- npm run build must pass
- Test by switching to each theme and exporting — all 3 themes must produce visible images
```

---

### PR 2.1 — Bootstrap neoxra-renderer

```
Create the neoxra-renderer Python package — a new repo for server-side carousel image rendering.

Working directory: /Users/hoganlin/Desktop/Meridian-Global/neoxra-renderer/
(Create this directory if it doesn't exist)

## Step 1: Create package structure

neoxra-renderer/
├── pyproject.toml
├── README.md
├── neoxra_renderer/
│   ├── __init__.py           ← version = "0.1.0"
│   ├── models.py             ← Data models
│   ├── engine.py             ← Main render function
│   ├── browser.py            ← Playwright browser pool
│   ├── layout.py             ← Text measurement + CJK support
│   ├── template_loader.py    ← Load template HTML + apply content
│   └── templates/            ← Empty for now (templates added in PR 2.3)
│       └── __init__.py
├── tests/
│   ├── __init__.py
│   ├── test_engine.py
│   └── test_layout.py
└── scripts/
    └── render_sample.py

## Step 2: pyproject.toml

[project]
name = "neoxra-renderer"
version = "0.1.0"
description = "Server-side carousel image renderer for Neoxra"
requires-python = ">=3.10"
dependencies = [
    "playwright>=1.40.0",
    "jinja2>=3.1.0",
]

[project.optional-dependencies]
dev = ["pytest>=8.0", "pytest-asyncio>=0.23"]

[build-system]
requires = ["setuptools>=68.0"]
build-backend = "setuptools.backends._legacy:_Backend"

## Step 3: models.py

Create these dataclasses:

@dataclass ColorPalette:
  background: str, text_primary: str, text_secondary: str, accent: str,
  badge_bg: str, badge_text: str, accent_bar: str

@dataclass LayoutSlot:
  x: int, y: int, width: int, max_lines: int, font_size: int,
  font_weight: int, line_height: float, text_align: str

@dataclass TemplateSpec:
  id: str, name: str, colors: ColorPalette, title_slot: LayoutSlot,
  body_slot: LayoutSlot, badge_slot: LayoutSlot,
  accent_bar_slot: LayoutSlot | None, background_image: str | None,
  decorations: list[str], watermark: str | None, watermark_position: str,
  font_family: str, border_radius: int, padding: int

@dataclass SlideContent:
  index: int, total: int, title: str, body: str,
  emphasis: str = "normal", text_alignment: str = "center"

@dataclass RenderRequest:
  template: TemplateSpec, slides: list[SlideContent],
  output_format: str = "png", output_size: int = 1080

@dataclass RenderResponse:
  images: list[bytes], metadata: dict

## Step 4: browser.py

Implement a Playwright browser pool:
- Module-level _browser variable
- async _get_browser() → launches chromium headless if not running
- async context manager get_browser_page() → creates new page, yields, closes
- async shutdown() → closes browser

## Step 5: engine.py

Implement:
  async def render_carousel(request: RenderRequest) -> RenderResponse

Flow:
1. For each slide in request.slides:
2. Call template_loader.render_slide_html(request.template, slide)
3. Use get_browser_page() to set_content and screenshot
4. Collect PNG bytes
5. Return RenderResponse

## Step 6: template_loader.py

Implement:
  def render_slide_html(template: TemplateSpec, slide: SlideContent, font_sizes: dict | None = None) -> str

Generate a complete HTML page string:
- Full HTML document with <style> and <body>
- 1080x1080px container
- Apply template colors, fonts, padding
- Insert slide content (title, body, badge "index/total")
- Add accent bar if template has one
- Add watermark if template has one
- All styles inline (no external CSS files)
- Include Google Fonts link for Noto Sans TC

## Step 7: layout.py

Implement:
  def count_visual_width(text: str) -> float
    CJK chars = 2.0 width, Latin = 1.0

  def calculate_font_sizes(title: str, body: str, template: TemplateSpec, emphasis: str = "normal") -> dict
    Returns {"title_font_size": int, "body_font_size": int}
    Auto-scales based on content length vs template slot dimensions

## Step 8: Tests

test_layout.py:
- Test count_visual_width with Chinese text
- Test count_visual_width with English text
- Test count_visual_width with mixed text
- Test calculate_font_sizes scales down for long titles

test_engine.py:
- Test render_carousel with a simple TemplateSpec produces non-empty PNG bytes
  (This test requires playwright installed — mark with @pytest.mark.asyncio)

## Step 9: scripts/render_sample.py

A CLI script that:
1. Creates a sample TemplateSpec (professional dark)
2. Creates 3 sample slides with Chinese content
3. Calls render_carousel()
4. Saves PNGs to output/ directory
5. Prints "Rendered N slides to output/"

## Constraints
- Python 3.10+ with type hints
- All async functions use async/await
- No neoxra or neoxra-core imports — this package is standalone
- pytest must pass (layout tests at minimum)
```

---

### PR 5.3 — Replace html2canvas with Server Rendering

```
Replace the client-side html2canvas carousel export with server-side rendering in the Neoxra frontend.

## File: frontend/components/ServerRenderedCarousel.tsx (NEW)

Create a new component that displays server-rendered PNG images:

Props:
- images: string[] (base64 data URLs or blob URLs of rendered PNGs)
- loading: boolean
- error: string | null
- topicSlug: string
- onDownload: () => void

Renders:
- Phone mockup frame (reuse the frame from VisualCarouselRenderer)
- Slide navigation (previous/next buttons, dot indicators)
- But instead of rendering React content, shows <img> tags with the server-rendered PNGs
- Download button that triggers onDownload

## File: frontend/components/DownloadPanel.tsx (NEW)

Props:
- images: Blob[]
- topicSlug: string
- disabled: boolean

Renders:
- "Download All (ZIP)" button — zips all images and downloads
- "Download Current" button — downloads the currently viewed slide
- Format badge: "1080 × 1080 PNG"

Logic:
- Uses JSZip + file-saver (already installed)
- No html2canvas dependency

## File: frontend/app/instagram/page.tsx

Add new state:
  const [renderedImages, setRenderedImages] = useState<string[]>([])
  const [isRendering, setIsRendering] = useState(false)
  const [renderError, setRenderError] = useState<string | null>(null)

After content generation completes (when carousel slides are ready):
1. Call POST /api/render/carousel with { template_id: selectedTemplate, slides: carouselSlides }
2. Response is a ZIP blob → extract PNGs → set as renderedImages
3. Show ServerRenderedCarousel instead of VisualCarouselRenderer when renderedImages are available

Keep VisualCarouselRenderer as fallback for when the render API is unavailable.

Add to COPY objects (both en and zh-TW):
- rendering: "正在渲染高畫質圖片…" / "Rendering high-quality images…"
- renderError: "圖片渲染失敗，使用預覽版本" / "Image rendering failed, using preview"
- downloadZip: "下載全部 (ZIP)" / "Download All (ZIP)"
- downloadCurrent: "下載當前" / "Download Current"

## Constraints
- Keep VisualCarouselRenderer as a preview fallback
- Do NOT remove html2canvas from package.json yet (other pages might use it)
- All new copy must be bilingual (en + zh-TW)
- npm run build must pass
```

---

## Part 11: Execution Summary

```
Phase 1 (Quick Wins):    2 PRs,  7 tasks  — Fix current bugs
Phase 2 (Renderer):      3 PRs, 15 tasks  — Build neoxra-renderer
Phase 3 (Core Models):   2 PRs,  7 tasks  — Schema extensions
Phase 4 (Backend APIs):  3 PRs, 12 tasks  — API endpoints
Phase 5 (Frontend UI):   4 PRs, 18 tasks  — Template UI + integration
Phase 6 (Expansion):     3 PRs, 10 tasks  — More templates + other pages

Total: 17 PRs, 69 tasks, 3 repos
```

### Recommended Execution Order

```
Week 1:  PR 1.1 (fix black export) → immediate user relief
Week 1:  PR 2.1 (bootstrap renderer) → foundation
Week 2:  PR 1.2 (template → visual) + PR 2.2 (layout engine) + PR 2.3 (templates)
Week 2:  PR 3.1 (TemplateSpec) + PR 3.2 (CarouselSlide)
Week 3:  PR 4.1 (template API) + PR 4.2 (render API) + PR 4.3 (combined)
Week 3:  PR 5.1 (gallery) + PR 5.2 (uploader)
Week 4:  PR 5.3 (server render) + PR 5.4 (integration)
Week 4:  PR 6.1 (more templates) + PR 6.2 + PR 6.3 (other pages)
```
