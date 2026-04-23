# Neoxra Full Redesign Spec — All Pages, i18n, Light/Dark, Gradient System

> Single source of truth for the complete visual overhaul.
> Covers: gradient design system, light/dark mode, language toggle, all 7 pages, component library.
> Target: the dark-mode mockup (image 3) as the reference design.

---

## Table of Contents

1. [Design System — Gradient Language](#1-design-system--gradient-language)
2. [Light / Dark Mode System](#2-light--dark-mode-system)
3. [i18n Toggle System](#3-i18n-toggle-system)
4. [Shared Component Library](#4-shared-component-library)
5. [Page 1: Landing Page `/`](#5-page-1-landing-page-)
6. [Page 2: Instagram Studio `/instagram`](#6-page-2-instagram-studio-instagram)
7. [Page 3: SEO Studio `/seo`](#7-page-3-seo-studio-seo)
8. [Page 4: Threads Studio `/threads`](#8-page-4-threads-studio-threads)
9. [Page 5: Facebook Studio `/facebook`](#9-page-5-facebook-studio-facebook)
10. [Page 6: Generate All `/generate`](#10-page-6-generate-all-generate)
11. [Page 7: Legal Demo `/demo/legal`](#11-page-7-legal-demo-demolegal)
12. [PR Phases & Execution Order](#12-pr-phases--execution-order)
13. [Codex Prompts (per PR)](#13-codex-prompts-per-pr)

---

## 1. Design System — Gradient Language

### 1.1 The Instagram-Inspired Gradient Palette

The key visual differentiator observed in Image 3 (target dark mode) is **multi-color gradients** inspired by Instagram's brand spectrum: pink → purple → orange → yellow → red. These gradients appear on:

- **CTA buttons** (primary "Get Started" and "免費開始使用")
- **Icon backgrounds** (circular icon containers in How It Works, Features, Stats)
- **Platform card left borders** (each card has a unique gradient accent)
- **Text highlights** ("流量" in the hero)
- **Section accent glows** (ambient background orbs)
- **Badge pills** (section labels)
- **The Neoxra logo icon** (circular gradient background)

### 1.2 Gradient Token Definitions

Add to `globals.css` and reference via Tailwind:

```css
:root {
  /* ─── Core Gradient Palette ─── */
  --gradient-instagram: linear-gradient(135deg, #f9ce34 0%, #ee2a7b 50%, #6228d7 100%);
  --gradient-warm: linear-gradient(135deg, #f97316 0%, #ec4899 50%, #a855f7 100%);
  --gradient-cta: linear-gradient(135deg, #f97316 0%, #f59e0b 100%);
  --gradient-cta-hover: linear-gradient(135deg, #fb923c 0%, #fbbf24 100%);
  --gradient-hero-text: linear-gradient(90deg, #f97316, #f59e0b, #fbbf24);
  --gradient-card-border: linear-gradient(180deg, rgba(249,115,22,0.4) 0%, rgba(168,85,247,0.4) 100%);
  --gradient-badge: linear-gradient(135deg, #f97316 0%, #ec4899 100%);

  /* ─── Per-Platform Gradients ─── */
  --gradient-ig: linear-gradient(135deg, #f9ce34, #ee2a7b, #6228d7);
  --gradient-seo: linear-gradient(135deg, #34d399, #10b981, #059669);
  --gradient-threads: linear-gradient(135deg, #c084fc, #8b5cf6, #6d28d9);
  --gradient-fb: linear-gradient(135deg, #60a5fa, #3b82f6, #2563eb);

  /* ─── Icon Container Gradients (for feature/how-it-works sections) ─── */
  --gradient-icon-1: linear-gradient(135deg, #fbbf24 0%, #f97316 100%);
  --gradient-icon-2: linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%);
  --gradient-icon-3: linear-gradient(135deg, #f472b6 0%, #ec4899 100%);
  --gradient-icon-4: linear-gradient(135deg, #fb923c 0%, #ef4444 100%);
}
```

### 1.3 Tailwind Config Gradient Extensions

```ts
// tailwind.config.ts — add to theme.extend
backgroundImage: {
  'gradient-instagram': 'linear-gradient(135deg, #f9ce34 0%, #ee2a7b 50%, #6228d7 100%)',
  'gradient-warm': 'linear-gradient(135deg, #f97316 0%, #ec4899 50%, #a855f7 100%)',
  'gradient-cta': 'linear-gradient(135deg, #f97316 0%, #f59e0b 100%)',
  'gradient-cta-hover': 'linear-gradient(135deg, #fb923c 0%, #fbbf24 100%)',
  'gradient-hero-text': 'linear-gradient(90deg, #f97316, #f59e0b, #fbbf24)',
  'gradient-ig': 'linear-gradient(135deg, #f9ce34, #ee2a7b, #6228d7)',
  'gradient-seo': 'linear-gradient(135deg, #34d399, #10b981, #059669)',
  'gradient-threads': 'linear-gradient(135deg, #c084fc, #8b5cf6, #6d28d9)',
  'gradient-fb': 'linear-gradient(135deg, #60a5fa, #3b82f6, #2563eb)',
},
```

### 1.4 Platform Logo Color Strategy

From Image 3, each platform logo uses its **official multi-color** treatment, not monochrome:

| Platform | Logo Component | Color Treatment |
|----------|---------------|-----------------|
| Instagram | `FaInstagram` from `react-icons/fa` | Wrap icon in a `<div>` with `bg-gradient-instagram` and white icon, OR use the gradient as icon color via SVG `fill: url(#gradient)` |
| Google | `SiGoogle` from `react-icons/si` | Use official Google 4-color: blue (#4285f4), red (#ea4335), yellow (#fbbc04), green (#34a853). Since react-icons renders single-color, use a custom SVG with 4-color paths |
| Threads | `SiThreads` from `react-icons/si` | Black icon on gradient-threads background circle, or purple gradient fill |
| Facebook | `FaFacebookF` from `react-icons/fa` | White icon on blue (#1877f2) background circle |

**Implementation for colored icon containers (observed in Image 3):**

Each platform icon sits inside a rounded square/circle with a gradient background:

```tsx
// Instagram: gradient background (pink-purple-yellow)
<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-instagram">
  <FaInstagram className="h-6 w-6 text-white" />
</div>

// Google: custom 4-color SVG
<GoogleColorLogo className="h-12 w-12" />

// Threads: purple gradient background
<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-threads">
  <SiThreads className="h-6 w-6 text-white" />
</div>

// Facebook: blue background
<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1877f2]">
  <FaFacebookF className="h-6 w-6 text-white" />
</div>
```

### 1.5 Google Color Logo Component

Create `components/GoogleColorLogo.tsx` — a custom inline SVG of the Google "G" with official 4-color segments:

```tsx
export default function GoogleColorLogo({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}
```

### 1.6 Neoxra Logo Enhancement

From Image 3, the Neoxra logo icon has a **gradient circular background** (orange-to-amber). Update `NeoxraLogo.tsx`:

```tsx
// The logo circle should have a warm gradient fill, not flat orange
<circle cx="17" cy="17" r="17" fill="url(#logoGradient)" />
<defs>
  <linearGradient id="logoGradient" x1="0" y1="0" x2="34" y2="34">
    <stop offset="0%" stopColor="#f97316" />
    <stop offset="100%" stopColor="#f59e0b" />
  </linearGradient>
</defs>
```

### 1.7 Gradient Application Rules

| Element | Gradient | Notes |
|---------|----------|-------|
| Primary CTA button | `bg-gradient-cta` → `hover:bg-gradient-cta-hover` | Orange → amber, NOT flat orange |
| Secondary CTA button | Ghost/outline as-is | No change |
| Hero "流量" / "Traffic" text | `bg-gradient-hero-text bg-clip-text text-transparent` | Orange → amber → gold |
| Icon containers (How It Works) | Each step gets a unique gradient: `--gradient-icon-1` through `--gradient-icon-3` | Observed: amber, purple, pink |
| Icon containers (Features) | Similar unique gradients per card | 4 different gradient backgrounds |
| Platform card left border | Use `border-image` or pseudo-element with `--gradient-ig`, `--gradient-seo`, `--gradient-threads`, `--gradient-fb` | Vertical gradient border on left |
| Stats bar icon backgrounds | Gradient circles behind each stat icon | Matches How It Works style |
| CTA Footer background | Subtle warm gradient panel | `--gradient-card` at low opacity overlay |
| Badge pills (e.g. "AI 內容交響樂團") | `border-image: var(--gradient-badge)` or gradient border | Gradient border, transparent fill |
| Navbar "開始使用" button | `bg-gradient-cta` | Matches primary CTA |

---

## 2. Light / Dark Mode System

### 2.1 Current State
- `ThemeToggle.tsx` exists in `components/landing/ThemeToggle.tsx`
- `GlobalNav.tsx` imports and renders `<ThemeToggle />`
- `layout.tsx` has a script that reads `localStorage('neoxra-theme')` and sets `data-theme`
- `globals.css` has `html[data-theme='light']` override block
- **Problem**: Landing page `Navbar.tsx` does NOT include `<ThemeToggle />` or `<LanguageToggle />`

### 2.2 Fix Plan

1. **Landing page Navbar**: Add both `<ThemeToggle />` and `<LanguageToggle />` to the right side of the landing page Navbar, matching how `GlobalNav` does it.

2. **All landing/ components must use CSS variables** (not hardcoded `nxr-bg`, `text-nxr-text`, etc.). Current landing components use hardcoded Tailwind classes like `bg-nxr-bg`, `text-nxr-text` which don't respond to theme changes.

3. **Refactor landing components**: Replace all hardcoded dark-only classes with CSS variable classes:

| Current (dark-only) | Replace with (theme-aware) |
|---------------------|---------------------------|
| `bg-nxr-bg` | `bg-[var(--bg)]` or `bg-[var(--bg-page)]` |
| `bg-nxr-card` | `bg-[var(--bg-elevated)]` |
| `bg-nxr-card-hover` | `bg-[var(--bg-elevated-2)]` |
| `text-nxr-text` | `text-[var(--text-primary)]` |
| `text-nxr-text-secondary` | `text-[var(--text-secondary)]` |
| `text-nxr-text-muted` | `text-[var(--text-tertiary)]` |
| `border-white/10` | `border-[var(--border)]` |
| `border-white/6` | `border-[var(--border)]` |
| `shadow-glow-orange` | `shadow-[var(--shadow-glow)]` |

4. **Light mode gradient adjustments**: In `html[data-theme='light']`, gradient tokens should use slightly warmer/darker versions so they still pop on light backgrounds:

```css
html[data-theme='light'] {
  --gradient-cta: linear-gradient(135deg, #ea580c 0%, #d97706 100%);
  --gradient-cta-hover: linear-gradient(135deg, #f97316 0%, #f59e0b 100%);
  --gradient-hero-text: linear-gradient(90deg, #ea580c, #d97706, #b45309);
  /* Platform gradients stay the same — they're brand colors */
}
```

### 2.3 ThemeToggle Placement

Both `GlobalNav` (studio pages) and landing `Navbar` must render:
```tsx
<div className="flex items-center gap-2">
  <LanguageToggle />
  <ThemeToggle />
</div>
```

---

## 3. i18n Toggle System

### 3.1 Current State
- `LanguageToggle.tsx` component exists and works
- `GlobalNav.tsx` renders `<LanguageToggle />` (studio pages have it)
- Landing page `Navbar.tsx` does NOT render `<LanguageToggle />`
- All pages use `COPY: Record<'en' | 'zh-TW', TypedCopy>` pattern — this is correct and stays

### 3.2 Fix Plan

1. **Landing Navbar**: Import and render `<LanguageToggle />` alongside `<ThemeToggle />`

2. **Ensure all COPY objects are complete**: Every string visible to the user must exist in both `en` and `zh-TW`. Audit each page.

3. **Landing page Navbar copy**: The Navbar currently receives copy via props from page.tsx. The nav link labels, login, and get-started text must be bilingual.

---

## 4. Shared Component Library

### 4.1 Components That ALL Pages Share

These components appear on every studio page via `GlobalNav`:

| Component | File | Contains |
|-----------|------|----------|
| `GlobalNav` | `components/GlobalNav.tsx` | Brand, nav links, dropdowns, LanguageToggle, ThemeToggle |
| `LanguageToggle` | `components/LanguageToggle.tsx` | EN / 繁中 toggle |
| `ThemeToggle` | `components/landing/ThemeToggle.tsx` | Dark / Light toggle |
| `LanguageProvider` | `components/LanguageProvider.tsx` | Context provider |

### 4.2 New Shared Components to Create

| Component | File | Purpose |
|-----------|------|---------|
| `GoogleColorLogo` | `components/GoogleColorLogo.tsx` | 4-color Google SVG icon |
| `GradientButton` | `components/ui/GradientButton.tsx` | Reusable CTA button with gradient |
| `GradientIconBox` | `components/ui/GradientIconBox.tsx` | Icon in gradient-background container |
| `PlatformIcon` | `components/ui/PlatformIcon.tsx` | Renders correct colored icon for a platform |
| `SectionHeader` | `components/ui/SectionHeader.tsx` | Consistent section title + subtitle |
| `PageShell` | `components/ui/PageShell.tsx` | Shared page wrapper with consistent padding, max-width, GlobalNav |

### 4.3 PageShell Component

Every studio page currently repeats the same layout structure. Extract to `PageShell`:

```tsx
type PageShellProps = {
  children: React.ReactNode
  eyebrow?: string
  title: string
  subtitle?: string
}

export function PageShell({ children, eyebrow, title, subtitle }: PageShellProps) {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text-primary)]">
      <GlobalNav />
      <main className="mx-auto max-w-5xl px-6 pt-10 pb-20">
        {eyebrow && (
          <p className="text-sm font-semibold text-[var(--accent)]">{eyebrow}</p>
        )}
        <h1 className="mt-2 text-3xl font-bold tracking-tight">{title}</h1>
        {subtitle && (
          <p className="mt-3 text-lg text-[var(--text-secondary)]">{subtitle}</p>
        )}
        <div className="mt-10">{children}</div>
      </main>
    </div>
  )
}
```

### 4.4 GradientButton Component

```tsx
type GradientButtonProps = {
  children: React.ReactNode
  href?: string
  onClick?: () => void
  variant?: 'primary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  className?: string
}

// Primary: bg-gradient-cta with hover:bg-gradient-cta-hover
// Ghost: border-[var(--border)] bg-transparent
```

### 4.5 PlatformIcon Component

```tsx
type Platform = 'instagram' | 'seo' | 'threads' | 'facebook'

export function PlatformIcon({ platform, size = 'md' }: { platform: Platform; size?: 'sm' | 'md' | 'lg' }) {
  // Returns the correct colored icon in a gradient-background container
  // Instagram: gradient-instagram bg + white FaInstagram
  // SEO/Google: GoogleColorLogo
  // Threads: gradient-threads bg + white SiThreads
  // Facebook: blue bg + white FaFacebookF
}
```

---

## 5. Page 1: Landing Page `/`

### 5.1 Changes from Current State

| Section | Current Issue | Fix |
|---------|--------------|-----|
| Navbar | Missing LanguageToggle, ThemeToggle | Add both toggles to right side |
| Navbar | Hardcoded dark classes | Use CSS variables |
| Hero CTA | Flat orange button | Gradient CTA button (`bg-gradient-cta`) |
| Hero text | Orange gradient is flat | Use warm multi-stop gradient |
| Stats bar | Flat icon colors | Gradient icon containers |
| How It Works icons | Flat orange/purple | Each step gets unique gradient icon bg |
| Features icons | `from-nxr-orange/15 to-nxr-purple/15` (subtle) | Vibrant gradient backgrounds per card |
| Platform Output icons | Monochrome `text-nxr-ig`, `text-nxr-seo` etc. | Full-color gradient icon containers |
| Platform card borders | Flat left border color | Gradient left borders |
| CTA Footer button | Flat orange | Gradient CTA |
| All sections | Hardcoded `bg-nxr-bg` | CSS variable backgrounds |
| Mockup cards | Monochrome platform badges | Gradient-colored badges |

### 5.2 Landing Navbar Update

```tsx
// In Navbar.tsx — add to the right side controls:
import { LanguageToggle } from '../LanguageToggle'
import { ThemeToggle } from './ThemeToggle'

// Desktop controls:
<div className="hidden items-center gap-3 lg:flex">
  <LanguageToggle />
  <ThemeToggle />
  <Link href="/login" className="...ghost...">{copy.login}</Link>
  <Link href="/generate" className="...gradient-cta...">{copy.getStarted} <ArrowRight /></Link>
</div>
```

### 5.3 Mockup Cards Enhancement

From Image 3, the hero mockup cards have:
- Instagram card: gradient-instagram colored label badge
- SEO card: green accent
- Threads card: Neoxra avatar with gradient-threads background
- Facebook card: Neoxra avatar with blue background
- The Threads Neoxra icon in the middle is a large gradient circle (the "conductor" icon)

---

## 6. Page 2: Instagram Studio `/instagram`

### 6.1 Current State
- Uses `GlobalNav` (already has LanguageToggle + ThemeToggle)
- Has `DemoAccessGate`, `FileUpload`, carousel, scorecard
- Uses CSS variables via `GlobalNav` but page body uses some hardcoded colors

### 6.2 Design Alignment Changes

| Element | Change |
|---------|--------|
| Page background | Ensure `bg-[var(--bg)]` not hardcoded |
| Section cards | Use `bg-[var(--bg-elevated)]` with `border-[var(--border)]` |
| Generate button | Replace flat accent with `bg-gradient-cta` |
| Goal selector pills | Active state should use gradient background |
| Carousel theme selector | Use `border-[var(--border)]` |
| Status badges | Use gradient backgrounds for "complete" state |
| Preview tab bar | Active tab uses gradient underline or gradient background pill |
| Scorecard | Gradient progress bars instead of flat colors |
| Copy buttons | Use `text-[var(--accent)]` hover state |
| Section headers | Use `SectionHeader` shared component |
| Platform badge | Instagram gradient icon container |

### 6.3 Template

```tsx
// Replace hardcoded styling patterns:
// BEFORE:
<button className="bg-amber-500 text-black">Generate</button>
// AFTER:
<button className="bg-[image:var(--gradient-cta)] text-black hover:bg-[image:var(--gradient-cta-hover)]">Generate</button>
```

---

## 7. Page 3: SEO Studio `/seo`

### 7.1 Design Alignment Changes

| Element | Change |
|---------|--------|
| Page background | `bg-[var(--bg)]` |
| Generate button | Gradient CTA |
| Keyword badges | Gradient borders or gradient background pills |
| Article preview card | `bg-[var(--bg-elevated)]` |
| Metadata section | Subtle gradient top border |
| Export buttons (Copy MD / Copy HTML) | Ghost buttons with gradient text on hover |
| Section headings in article | Use consistent heading styles |

---

## 8. Page 4: Threads Studio `/threads`

### 8.1 Design Alignment Changes

| Element | Change |
|---------|--------|
| Page background | `bg-[var(--bg)]` |
| Generate button | Gradient CTA |
| Preset buttons | Gradient border on hover |
| Thread preview | Connector lines use gradient color |
| Purpose badges (hook, argument, evidence, cta) | Each gets a gradient pill: hook=orange, argument=purple, evidence=green, cta=pink |
| Character count | Red warning stays, but normal state uses `text-[var(--text-tertiary)]` |
| Thread connector line | Gradient vertical line (orange → purple) |

---

## 9. Page 5: Facebook Studio `/facebook`

### 9.1 Design Alignment Changes

| Element | Change |
|---------|--------|
| Page background | `bg-[var(--bg)]` |
| Generate button | Gradient CTA |
| Preset buttons | Gradient border on hover |
| Facebook preview card | `bg-[var(--bg-elevated)]` with subtle blue gradient top border |
| Profile avatar | Blue gradient background |
| Discussion prompt highlight | Gradient left border |
| Share hook section | Gradient accent |

---

## 10. Page 6: Generate All `/generate`

### 10.1 Current State
- Most complex page: pipeline progress, 4-platform tabs, ZIP export
- Uses `GlobalNav`
- Has industry/goal/voice dropdowns, demo scenarios

### 10.2 Design Alignment Changes

| Element | Change |
|---------|--------|
| Page background | `bg-[var(--bg)]` |
| Generate button | Gradient CTA (largest one, prominent) |
| Pipeline progress steps | Active/running step gets gradient glow border; completed gets gradient checkmark |
| Platform tabs | Active tab gets gradient underline; each tab icon uses PlatformIcon with color |
| Status badges (waiting/running/complete/error) | "complete" uses gradient-success, "running" uses gradient-warm pulse animation |
| Brief display card | Gradient top border |
| Download All button | Gradient CTA |
| Scenario cards | Gradient border on selected |
| Dropdown selects | `bg-[var(--bg-elevated)]` border `border-[var(--border)]` |
| Industry/goal pills | Active state uses gradient fill |
| Error states | Red gradient accent |

---

## 11. Page 7: Legal Demo `/demo/legal`

### 11.1 Current State
- 3 sample cases (accident, lease, labor)
- Tab system for instagram/article content
- Carousel preview + article preview
- Uses `GlobalNav`

### 11.2 Design Alignment Changes

| Element | Change |
|---------|--------|
| Page background | `bg-[var(--bg)]` |
| Case selector tabs | Active tab gets gradient underline |
| Instagram content card | Gradient-instagram left border |
| Article content card | Gradient-seo left border |
| Carousel slides | Maintain existing theme but ensure CSS variable backgrounds |
| Sample case buttons | Gradient border on active/hover |
| "Try with your own topic" CTA | Gradient CTA button |
| Article outline items | Gradient bullet points or numbered with gradient |

---

## 12. PR Phases & Execution Order

### Phase 1: Foundation — Design System + Shared Components
**PR 1.1: Gradient design tokens + Tailwind config**
- Files: `globals.css`, `tailwind.config.ts`
- Add all gradient CSS variables (1.2)
- Add Tailwind `backgroundImage` extensions (1.3)
- Add light-mode gradient overrides (2.4)
- Zero visual changes yet — just tokens

**PR 1.2: Shared UI components**
- Files: `components/GoogleColorLogo.tsx`, `components/ui/GradientButton.tsx`, `components/ui/GradientIconBox.tsx`, `components/ui/PlatformIcon.tsx`, `components/ui/SectionHeader.tsx`, `components/ui/PageShell.tsx`
- Create all shared components
- Export from `components/ui/index.ts`

### Phase 2: Landing Page — Gradients + Toggles
**PR 2.1: Landing Navbar — restore toggles**
- Files: `components/landing/Navbar.tsx`
- Import and render `<LanguageToggle />` and `<ThemeToggle />`
- Add toggles to both desktop and mobile menu
- Fixes issues #1 and #4

**PR 2.2: Landing page — gradient overhaul + theme-aware refactor**
- Files: ALL `components/landing/*.tsx` + `app/page.tsx`
- Replace all hardcoded `nxr-*` classes with CSS variable classes
- Apply gradient CTA buttons
- Apply gradient icon containers (How It Works, Features, Stats)
- Apply gradient platform borders (Platform Output)
- Apply colored platform icons (PlatformIcon component)
- Update MockupCards with gradient badges
- Ensure full light/dark theme support

### Phase 3: Studio Pages — Visual Alignment
**PR 3.1: Instagram Studio redesign alignment**
- Files: `app/instagram/page.tsx`, `components/InstagramForm.tsx`, `components/InstagramResult.tsx`, `components/VisualCarouselRenderer.tsx`, `components/ScorecardRadar.tsx`
- Replace hardcoded colors with CSS variables
- Gradient CTA button
- Gradient goal selector pills
- Gradient scorecard bars
- Theme-aware cards and backgrounds

**PR 3.2: SEO Studio redesign alignment**
- Files: `app/seo/page.tsx`, `components/SeoArticlePreview.tsx`
- CSS variable backgrounds
- Gradient CTA
- Gradient keyword badges
- Theme-aware article preview

**PR 3.3: Threads Studio redesign alignment**
- Files: `app/threads/page.tsx`, `components/ThreadsPreview.tsx`
- CSS variable backgrounds
- Gradient CTA
- Gradient purpose badges
- Gradient thread connector

**PR 3.4: Facebook Studio redesign alignment**
- Files: `app/facebook/page.tsx`, `components/FacebookPreview.tsx`
- CSS variable backgrounds
- Gradient CTA
- Gradient discussion prompt accent
- Theme-aware preview card

### Phase 4: Complex Pages
**PR 4.1: Generate All redesign alignment**
- Files: `app/generate/page.tsx`, `components/PipelineProgress.tsx`, `components/PlatformTabs.tsx`
- Gradient pipeline progress (active step glow, completed gradient check)
- Gradient platform tab indicators
- Gradient CTA buttons (generate + download)
- Theme-aware throughout
- Colored platform icons in tabs

**PR 4.2: Legal Demo redesign alignment**
- Files: `app/demo/legal/page.tsx`
- Gradient case selector tabs
- Platform-specific gradient accents on content cards
- Theme-aware backgrounds
- Gradient CTA

### Phase 5: Polish & Verification
**PR 5.1: Cross-page visual QA + responsive fixes**
- Verify all 7 pages render correctly in both dark and light mode
- Verify language toggle works on all pages
- Verify responsive down to 375px
- Fix any inconsistencies
- Ensure `npm run build` passes with zero errors

---

## 13. Codex Prompts (per PR)

### PR 1.1 — Gradient Design Tokens

```
Update the Neoxra frontend design system to add gradient tokens.

## File 1: frontend/app/globals.css

Add the following CSS variables inside the existing `:root` block (add them AFTER the existing variables, before the closing brace):

--gradient-instagram: linear-gradient(135deg, #f9ce34 0%, #ee2a7b 50%, #6228d7 100%);
--gradient-warm: linear-gradient(135deg, #f97316 0%, #ec4899 50%, #a855f7 100%);
--gradient-cta: linear-gradient(135deg, #f97316 0%, #f59e0b 100%);
--gradient-cta-hover: linear-gradient(135deg, #fb923c 0%, #fbbf24 100%);
--gradient-hero-text: linear-gradient(90deg, #f97316, #f59e0b, #fbbf24);
--gradient-card-border: linear-gradient(180deg, rgba(249,115,22,0.4) 0%, rgba(168,85,247,0.4) 100%);
--gradient-badge: linear-gradient(135deg, #f97316 0%, #ec4899 100%);
--gradient-ig: linear-gradient(135deg, #f9ce34, #ee2a7b, #6228d7);
--gradient-seo: linear-gradient(135deg, #34d399, #10b981, #059669);
--gradient-threads: linear-gradient(135deg, #c084fc, #8b5cf6, #6d28d9);
--gradient-fb: linear-gradient(135deg, #60a5fa, #3b82f6, #2563eb);
--gradient-icon-1: linear-gradient(135deg, #fbbf24 0%, #f97316 100%);
--gradient-icon-2: linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%);
--gradient-icon-3: linear-gradient(135deg, #f472b6 0%, #ec4899 100%);
--gradient-icon-4: linear-gradient(135deg, #fb923c 0%, #ef4444 100%);

Also add these same variables inside the `html[data-theme='light']` block, but adjust the CTA gradients for light mode:
--gradient-cta: linear-gradient(135deg, #ea580c 0%, #d97706 100%);
--gradient-cta-hover: linear-gradient(135deg, #f97316 0%, #f59e0b 100%);
--gradient-hero-text: linear-gradient(90deg, #ea580c, #d97706, #b45309);
(All other gradient variables stay the same in light mode — platform colors are brand colors.)

## File 2: frontend/tailwind.config.ts

Add to the `theme.extend` object:

backgroundImage: {
  'gradient-instagram': 'linear-gradient(135deg, #f9ce34 0%, #ee2a7b 50%, #6228d7 100%)',
  'gradient-warm': 'linear-gradient(135deg, #f97316 0%, #ec4899 50%, #a855f7 100%)',
  'gradient-cta': 'linear-gradient(135deg, #f97316 0%, #f59e0b 100%)',
  'gradient-cta-hover': 'linear-gradient(135deg, #fb923c 0%, #fbbf24 100%)',
  'gradient-hero-text': 'linear-gradient(90deg, #f97316, #f59e0b, #fbbf24)',
  'gradient-ig': 'linear-gradient(135deg, #f9ce34, #ee2a7b, #6228d7)',
  'gradient-seo': 'linear-gradient(135deg, #34d399, #10b981, #059669)',
  'gradient-threads': 'linear-gradient(135deg, #c084fc, #8b5cf6, #6d28d9)',
  'gradient-fb': 'linear-gradient(135deg, #60a5fa, #3b82f6, #2563eb)',
},

## Constraints
- Do NOT remove any existing CSS variables or Tailwind config
- Do NOT change any component files
- npm run build must pass
```

---

### PR 1.2 — Shared UI Components

```
Create shared UI components for the Neoxra frontend redesign.

All files go in frontend/components/. Use TypeScript. Use CSS variables for theming (never hardcode colors). All components must work in both dark and light mode.

## File 1: components/GoogleColorLogo.tsx

Create an SVG component for the Google "G" logo with official 4-color segments (blue #4285F4, red #EA4335, yellow #FBBC05, green #34A853). Accept className prop with default 'h-6 w-6'. Export as default.

Use this exact SVG path data:
- Blue path: "M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"
- Green path: "M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"
- Yellow path: "M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"
- Red path: "M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"

## File 2: components/ui/GradientButton.tsx

A reusable button/link component:

Props:
- children: React.ReactNode
- href?: string (if provided, render as Next.js Link; otherwise button)
- onClick?: () => void
- variant: 'primary' | 'ghost' (default 'primary')
- size: 'sm' | 'md' | 'lg' (default 'md')
- disabled?: boolean
- className?: string
- type?: 'button' | 'submit'

Primary variant styling:
- background: var(--gradient-cta) via bg-[image:var(--gradient-cta)]
- text: black font-semibold
- hover: bg-[image:var(--gradient-cta-hover)] -translate-y-0.5 shadow-[var(--shadow-glow)]
- Rounded-xl

Ghost variant styling:
- border: border-[var(--border)]
- text: text-[var(--text-primary)]
- hover: border-[var(--border-bold)] bg-[var(--bg-elevated)]
- Rounded-xl

Size classes:
- sm: px-4 py-2 text-sm
- md: px-6 py-3 text-base
- lg: px-8 py-3.5 text-base

Export as named export: GradientButton

## File 3: components/ui/PlatformIcon.tsx

Props:
- platform: 'instagram' | 'seo' | 'threads' | 'facebook'
- size: 'sm' | 'md' | 'lg' (default 'md')

Size mapping: sm=h-8 w-8 icon h-4 w-4, md=h-10 w-10 icon h-5 w-5, lg=h-12 w-12 icon h-6 w-6

Rendering per platform:
- instagram: Container with bg-gradient-instagram rounded-xl, white FaInstagram icon
- seo: Container with bg-[var(--platform-seo)] rounded-xl, render GoogleColorLogo as the icon (not a container — the GoogleColorLogo IS the multi-color icon)
  Actually for SEO: render GoogleColorLogo inside a container with bg-gradient-seo rounded-xl
  Wait — from the target design, Google has a standalone colored G without gradient container. Let me reconsider.
  Use: rounded-xl bg-white/10 dark:bg-white/10 container, with GoogleColorLogo inside (the logo itself is colored)
- threads: Container with bg-gradient-threads rounded-xl, white SiThreads icon
- facebook: Container with bg-[#1877f2] rounded-xl, white FaFacebookF icon

Import react-icons: FaInstagram, FaFacebookF from 'react-icons/fa', SiThreads from 'react-icons/si'
Import GoogleColorLogo from '../GoogleColorLogo'

Export as named export: PlatformIcon

## File 4: components/ui/SectionHeader.tsx

Props:
- title: string
- subtitle?: string
- centered?: boolean (default false)

Renders:
- h2 with text-[28px] md:text-4xl font-bold tracking-[-0.02em] text-[var(--text-primary)]
- Optional p with mt-3 text-lg text-[var(--text-secondary)]
- If centered, add text-center class

Export as named export: SectionHeader

## File 5: components/ui/PageShell.tsx

Props:
- children: React.ReactNode
- eyebrow?: string
- title: string
- subtitle?: string

Renders:
- Outer div: min-h-screen bg-[var(--bg)] text-[var(--text-primary)]
- <GlobalNav /> at the top
- <main> with mx-auto max-w-5xl px-6 pt-10 pb-20
- If eyebrow: <p> with text-sm font-semibold text-[var(--accent)]
- <h1> with mt-2 text-3xl font-bold tracking-tight
- If subtitle: <p> with mt-3 text-lg text-[var(--text-secondary)]
- Children in mt-10 div

Import GlobalNav from '../GlobalNav'

Export as named export: PageShell

## File 6: components/ui/GradientIconBox.tsx

Props:
- gradient: string (CSS gradient value like 'var(--gradient-icon-1)' or a Tailwind class)
- icon: React.ReactNode
- size: 'sm' | 'md' | 'lg' (default 'md')

Renders a rounded-xl container with the gradient background and the icon centered inside in white.

Size mapping: sm=h-10 w-10, md=h-12 w-12, lg=h-14 w-14

Export as named export: GradientIconBox

## File 7: components/ui/index.ts

Re-export all UI components:
export { GradientButton } from './GradientButton'
export { PlatformIcon } from './PlatformIcon'
export { SectionHeader } from './SectionHeader'
export { PageShell } from './PageShell'
export { GradientIconBox } from './GradientIconBox'

## Constraints
- TypeScript strict mode
- All components use CSS variables for colors (theme-aware)
- No hardcoded dark-only colors
- npm run build must pass
```

---

### PR 2.1 — Landing Navbar Toggles

```
Restore the language toggle and theme toggle to the Neoxra landing page navbar.

## File: frontend/components/landing/Navbar.tsx

Current state: The Navbar only has nav links + Login + Get Started buttons. It's missing the language toggle (EN/繁中) and theme toggle (Dark/Light) that exist on all other pages via GlobalNav.

Changes needed:

1. Add imports at the top:
   import { LanguageToggle } from '../LanguageToggle'
   import { ThemeToggle } from './ThemeToggle'

2. In the DESKTOP controls section (the div with className "hidden items-center gap-3 lg:flex"), add LanguageToggle and ThemeToggle BEFORE the Login button:

   <div className="hidden items-center gap-3 lg:flex">
     <LanguageToggle />
     <ThemeToggle />
     <Link href="/login" ...>{copy.login}</Link>
     <Link href="/generate" ...>{copy.getStarted} <ArrowRight /></Link>
   </div>

3. In the MOBILE menu section (inside the sliding drawer div), add LanguageToggle and ThemeToggle at the top of the menu:

   <div className="flex items-center gap-2 mb-3">
     <LanguageToggle />
     <ThemeToggle />
   </div>

4. Replace the "Get Started" button gradient on BOTH desktop and mobile:
   Change: bg-nxr-orange ... hover:bg-orange-400
   To: bg-[image:var(--gradient-cta)] ... hover:bg-[image:var(--gradient-cta-hover)] hover:-translate-y-0.5

5. Replace hardcoded dark-only classes throughout:
   - bg-nxr-bg/80 → bg-[var(--bg)]/80
   - text-nxr-text → text-[var(--text-primary)]
   - text-nxr-text-secondary → text-[var(--text-secondary)]
   - border-white/6 → border-[var(--border)]
   - border-white/10 → border-[var(--border)]
   - bg-nxr-bg/95 → bg-[var(--bg)]/95
   - bg-white/5 → bg-[var(--bg-elevated)]
   - shadow-glow-orange → shadow-[var(--shadow-glow)]

## Constraints
- Do NOT change the NavCopy type or nav structure
- Do NOT modify any other files
- The LanguageToggle and ThemeToggle must be visible on both desktop and mobile
- npm run build must pass
```

---

### PR 2.2 — Landing Page Gradient Overhaul

```
Apply the gradient design system and theme-aware styling to all Neoxra landing page components.

This is a large PR. Update every file in frontend/components/landing/ plus frontend/app/page.tsx.

## Global Rule: Replace ALL hardcoded dark-only Tailwind classes

In EVERY landing component file, find and replace:
- bg-nxr-bg → bg-[var(--bg)]
- bg-nxr-card → bg-[var(--bg-elevated)]
- bg-nxr-card-hover → bg-[var(--bg-elevated-2)]
- text-nxr-text (when used for primary text) → text-[var(--text-primary)]
- text-nxr-text-secondary → text-[var(--text-secondary)]
- text-nxr-text-muted → text-[var(--text-tertiary)]
- border-white/10 → border-[var(--border)]
- border-white/8 → border-[var(--border)]
- border-white/6 → border-[var(--border)]
- border-white/16 → border-[var(--border-bold)]
- border-white/20 → border-[var(--border-bold)]
- bg-white/5 → bg-[var(--accent-subtle)]
- bg-white/10 → bg-[var(--bg-elevated-2)]
- bg-white/15 → bg-[var(--bg-elevated-2)]
- bg-white/[0.03] → bg-[var(--accent-subtle)]
- shadow-glow-orange → shadow-[var(--shadow-glow)]
- shadow-2xl shadow-black/30 → shadow-[var(--shadow-lg)]

These files need the replacement: Navbar.tsx (if not already done in PR 2.1), HeroSection.tsx, MockupCards.tsx, StatsBar.tsx, HowItWorks.tsx, Features.tsx, PlatformOutput.tsx, CTAFooter.tsx, Footer.tsx, GlowOrb.tsx, NeoxraLogo.tsx.

## File-specific gradient changes:

### HeroSection.tsx
1. Change the hero CTA button from flat orange to gradient:
   Old: bg-nxr-orange ... hover:bg-orange-400
   New: bg-[image:var(--gradient-cta)] ... hover:bg-[image:var(--gradient-cta-hover)]

2. Change the "流量"/"Traffic" gradient text:
   Old: bg-gradient-to-r from-nxr-orange to-amber-400
   New: bg-[image:var(--gradient-hero-text)]
   (Keep bg-clip-text text-transparent)

### StatsBar.tsx
Each stat icon should be inside a gradient background container instead of flat color:
- Stat 1 (Zap icon): background var(--gradient-icon-1) — amber to orange
- Stat 2 (Clock icon): background var(--gradient-icon-2) — purple
- Stat 3 (TrendingUp icon): background var(--gradient-icon-3) — pink
- Stat 4 (Users icon): background var(--gradient-icon-4) — orange to red

Icon container: rounded-xl, icon color white. Use inline style={{ background: 'var(--gradient-icon-N)' }} or a class.

### HowItWorks.tsx
Each step's icon container gets a unique gradient:
- Step 1: background var(--gradient-icon-1) — amber/orange
- Step 2: background var(--gradient-icon-2) — purple
- Step 3: background var(--gradient-icon-3) — pink

The number badges (1, 2, 3) should use a small gradient circle.

### Features.tsx
Each feature card's icon container currently uses `bg-gradient-to-br from-nxr-orange/15 to-nxr-purple/15` which is too subtle.
Change to vibrant gradient backgrounds:
- Card 1 (Target): background var(--gradient-icon-1)
- Card 2 (BarChart3): background var(--gradient-icon-2)
- Card 3 (CheckCircle): background var(--gradient-icon-3)
- Card 4 (Rocket): background var(--gradient-icon-4)
Icon color: white (not nxr-orange)

### PlatformOutput.tsx
1. Replace monochrome icon containers with colored platform icons:
   - Instagram: Container with bg-gradient-instagram, white FaInstagram icon
   - Google/SEO: Container with white/transparent bg, render GoogleColorLogo (import from ../GoogleColorLogo)
   - Threads: Container with bg-gradient-threads, white SiThreads icon
   - Facebook: Container with bg-[#1877f2], white FaFacebookF icon

2. Replace flat left border colors with gradient borders. Since CSS border-image doesn't work with border-radius, use a pseudo-element approach or a thin gradient div on the left:

   For each card, instead of `border-l-[3px] ${style.border}`, use:
   A 3px-wide absolute-positioned div on the left with the platform gradient background:
   ```
   <div className="relative overflow-hidden rounded-xl ...">
     <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: 'var(--gradient-ig)' }} />
     {/* card content with pl-5 to account for the border */}
   </div>
   ```

3. Change "了解更多 →" link color from flat platform color to platform gradient text (using bg-clip-text).

### CTAFooter.tsx
1. CTA button: bg-[image:var(--gradient-cta)] instead of flat orange
2. Background panel: add a subtle gradient overlay

### MockupCards.tsx
1. Instagram label badge: Use bg-gradient-instagram text-white instead of bg-nxr-ig/10 text-nxr-ig
2. Platform avatar circles: Use gradient backgrounds (Threads: gradient-threads, Facebook: #1877f2)
3. Carousel dot indicator: Active dot uses gradient-instagram instead of flat bg-nxr-ig

### NeoxraLogo.tsx
Update the SVG to use a gradient fill for the circle background:
Add a <linearGradient> definition:
  <linearGradient id="logoGrad" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stopColor="#f97316" />
    <stop offset="100%" stopColor="#f59e0b" />
  </linearGradient>
Use fill="url(#logoGrad)" on the main circle.

### GlowOrb.tsx
Ensure the glow orb uses CSS variable colors so it adapts:
- Orange orb: Use var(--accent) based color with appropriate opacity
- Purple orb: Use var(--secondary) based color with appropriate opacity
- In light mode, reduce opacity further (0.08 instead of 0.15)

## Constraints
- All changes must work in BOTH dark and light mode
- Test by toggling theme — no element should be invisible or illegible
- Do NOT change any copy/text content
- Do NOT change component props interfaces
- Do NOT modify files outside components/landing/ and app/page.tsx
- Import GoogleColorLogo from '../GoogleColorLogo' in PlatformOutput.tsx
- npm run build must pass
```

---

### PR 3.1 — Instagram Studio

```
Align the Instagram Studio page (/instagram) with the new Neoxra gradient design system.

## File: frontend/app/instagram/page.tsx

Search for and replace ALL hardcoded color classes with CSS variable equivalents:
- Any bg-amber-*, bg-orange-*, bg-yellow-* on buttons → bg-[image:var(--gradient-cta)] for primary buttons
- Any text-amber-*, text-orange-* for accent text → text-[var(--accent)]
- Any bg-zinc-*, bg-slate-*, bg-neutral-*, bg-gray-* for backgrounds → bg-[var(--bg-elevated)] or bg-[var(--bg)]
- Any border-zinc-*, border-slate-* → border-[var(--border)]
- Any text-zinc-*, text-slate-*, text-gray-* → text-[var(--text-primary)] or text-[var(--text-secondary)]
- Any bg-black or bg-[#...] dark backgrounds → bg-[var(--bg)]

Specific changes:
1. The "Generate" / "產生" submit button: Change to bg-[image:var(--gradient-cta)] text-black font-semibold hover:bg-[image:var(--gradient-cta-hover)]
2. Goal selector active pill: Use bg-[image:var(--gradient-cta)] text-black instead of flat accent
3. Preview tab active state: Add a gradient bottom border or gradient background pill
4. Any card/panel containers: bg-[var(--bg-elevated)] border-[var(--border)] rounded-xl

## File: frontend/components/InstagramForm.tsx
- Replace any hardcoded color classes with CSS variables
- Active goal button: bg-[image:var(--gradient-cta)] text-black
- Inactive goal button: bg-[var(--bg-elevated)] text-[var(--text-secondary)]
- Input fields: bg-[var(--bg-elevated)] border-[var(--border)] text-[var(--text-primary)]

## File: frontend/components/InstagramResult.tsx
- Card backgrounds: bg-[var(--bg-elevated)]
- Section borders: border-[var(--border)]
- Copy button hover: text-[var(--accent)]

## File: frontend/components/ScorecardRadar.tsx
- Progress bar fills: Use gradient backgrounds instead of flat colors
  Example: style={{ background: 'var(--gradient-warm)' }} with appropriate width
- Labels: text-[var(--text-secondary)]
- Score numbers: text-[var(--text-primary)]

## Constraints
- Do NOT change any logic, API calls, or data structures
- Only change styling/className values
- Must work in both dark and light mode
- npm run build must pass
```

---

### PR 3.2 — SEO Studio

```
Align the SEO Studio page (/seo) with the new Neoxra gradient design system.

## File: frontend/app/seo/page.tsx

1. Replace all hardcoded color classes with CSS variable equivalents (same pattern as Instagram PR)
2. Generate button: bg-[image:var(--gradient-cta)] text-black hover:bg-[image:var(--gradient-cta-hover)]
3. Goal selector active state: gradient background
4. Card/panel containers: bg-[var(--bg-elevated)] border-[var(--border)]
5. Page background: bg-[var(--bg)]

## File: frontend/components/SeoArticlePreview.tsx

1. Keyword badges: Instead of flat colored pills, use gradient-bordered pills:
   border with gradient (use a wrapper div approach: outer div with gradient bg, inner div with bg-[var(--bg-elevated)] and padding to create border effect)
   OR simpler: bg-[var(--accent-subtle)] border border-[var(--accent)]/20 text-[var(--accent)]
2. Metadata section: Add a subtle gradient top border to the metadata card
3. Article sections: Use text-[var(--text-primary)] for headings, text-[var(--text-secondary)] for body
4. Word count badge: text-[var(--text-tertiary)]
5. Export buttons: Ghost style with text-[var(--accent)] on hover

## Constraints
- Do NOT change any logic or data structures
- Must work in both dark and light mode
- npm run build must pass
```

---

### PR 3.3 — Threads Studio

```
Align the Threads Studio page (/threads) with the new Neoxra gradient design system.

## File: frontend/app/threads/page.tsx

1. Replace hardcoded colors with CSS variables
2. Generate button: bg-[image:var(--gradient-cta)] text-black
3. Preset buttons: border-[var(--border)] hover:border-[var(--accent)] transition
4. Page background: bg-[var(--bg)]

## File: frontend/components/ThreadsPreview.tsx

1. Thread connector line: Change from flat gray to a gradient line:
   Use a div with background: var(--gradient-warm) width: 2px
2. Purpose badges: Each purpose gets a distinct gradient pill:
   - hook: bg-[var(--gradient-icon-1)] text-white (amber-orange)
   - argument: bg-[var(--gradient-icon-2)] text-white (purple)
   - evidence: bg-[var(--gradient-seo)] text-white (green)
   - punchline: bg-[var(--gradient-icon-3)] text-white (pink)
   - cta: bg-[var(--gradient-icon-4)] text-white (red-orange)
   Apply these as inline styles: style={{ background: 'var(--gradient-icon-N)' }}
3. Post cards: bg-[var(--bg-elevated)] border-[var(--border)]
4. Character count: text-[var(--text-tertiary)], red stays for over-limit

## Constraints
- Do NOT change any logic or data structures
- Must work in both dark and light mode
- npm run build must pass
```

---

### PR 3.4 — Facebook Studio

```
Align the Facebook Studio page (/facebook) with the new Neoxra gradient design system.

## File: frontend/app/facebook/page.tsx

1. Replace hardcoded colors with CSS variables
2. Generate button: bg-[image:var(--gradient-cta)] text-black
3. Preset buttons: border-[var(--border)] hover:border-[var(--accent)]
4. Page background: bg-[var(--bg)]

## File: frontend/components/FacebookPreview.tsx

1. Profile avatar: bg-[#1877f2] (Facebook blue, this is a brand color so it stays)
2. Preview card: bg-[var(--bg-elevated)] border-[var(--border)]
3. Discussion prompt: Add a gradient left border:
   Use absolute-positioned 3px div with background: var(--gradient-fb) on left side
4. Share hook section: Subtle accent background bg-[var(--accent-subtle)]
5. Image recommendation section: border-[var(--border)] bg-[var(--bg-elevated-2)]
6. Copy button: text-[var(--accent)] on hover

## Constraints
- Do NOT change any logic or data structures
- Must work in both dark and light mode
- npm run build must pass
```

---

### PR 4.1 — Generate All

```
Align the Generate All page (/generate) with the new Neoxra gradient design system. This is the most complex page.

## File: frontend/app/generate/page.tsx

1. Page background: bg-[var(--bg)]
2. Generate button (the main CTA): bg-[image:var(--gradient-cta)] text-black font-semibold text-lg px-8 py-4
   This is the most prominent CTA on the site — make it large and gradient
3. Download All button: bg-[image:var(--gradient-cta)] text-black
4. All dropdown selects (industry, goal, voice): bg-[var(--bg-elevated)] border-[var(--border)] text-[var(--text-primary)]
5. Scenario cards: bg-[var(--bg-elevated)] border-[var(--border)], selected state: border-[var(--accent)] shadow-[var(--shadow-glow)]
6. Input fields: bg-[var(--bg-elevated)] border-[var(--border)] text-[var(--text-primary)]
7. Brief display card: bg-[var(--bg-elevated)] with a gradient top border (3px div with bg-[image:var(--gradient-warm)])
8. Error messages: text-red-500 (keep as-is)
9. Section titles: text-[var(--text-primary)]
10. Replace all other hardcoded color classes

## File: frontend/components/PipelineProgress.tsx

1. Step containers: bg-[var(--bg-elevated)] border-[var(--border)]
2. Active/running step: border-[var(--accent)] with pulse animation, gradient glow shadow
3. Completed step: Green checkmark with bg-[var(--success)] or gradient-seo
4. Step dot indicators:
   - waiting: bg-[var(--text-tertiary)]
   - running: bg-[var(--accent)] with animate-pulse
   - complete: bg-[var(--success)]
   - error: bg-red-500
5. Step labels: text-[var(--text-primary)] for active, text-[var(--text-secondary)] for waiting

## File: frontend/components/PlatformTabs.tsx

1. Tab bar: border-b border-[var(--border)]
2. Active tab: Gradient bottom border (use a pseudo-element or absolute div with bg-[image:var(--gradient-warm)] h-[2px] at the bottom)
3. Tab icons: Use PlatformIcon component (import from ./ui/PlatformIcon) for colored platform icons next to each tab label
   OR if PlatformIcon is too complex here, at minimum use the colored icon classes:
   - Instagram tab icon: text-[var(--platform-instagram)]
   - SEO tab icon: text-[var(--platform-seo)]
   - Threads tab icon: text-[var(--platform-threads)]
   - Facebook tab icon: text-[var(--platform-facebook)]
4. Status badges:
   - complete: bg-[var(--success)]/10 text-[var(--success)]
   - running: bg-[var(--accent-subtle)] text-[var(--accent)] with animate-pulse
   - error: bg-red-500/10 text-red-500
   - waiting: bg-[var(--bg-elevated-2)] text-[var(--text-tertiary)]
5. Empty state text: text-[var(--text-tertiary)]
6. Copy buttons: text-[var(--accent)] on hover

## Constraints
- Do NOT change any API logic, SSE streaming, or data structures
- Only change styling/className values
- Must work in both dark and light mode
- npm run build must pass
```

---

### PR 4.2 — Legal Demo

```
Align the Legal Demo page (/demo/legal) with the new Neoxra gradient design system.

## File: frontend/app/demo/legal/page.tsx

1. Replace the hardcoded CSS variable references at the top (PRIMARY, PRIMARY_HOVER, etc.) — these already use CSS variables which is good, but verify they reference the correct tokens:
   - PRIMARY should be var(--accent) ✓
   - PRIMARY_HOVER should be var(--accent-hover) ✓

2. Case selector tabs/buttons:
   - Active tab: Use gradient background bg-[image:var(--gradient-cta)] text-black
   - Inactive tab: bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-[var(--border)]

3. Content tab bar (instagram/article toggle):
   - Active: gradient bottom border (same approach as PlatformTabs)
   - Inactive: text-[var(--text-tertiary)]

4. Instagram content card: Add gradient-instagram left border (3px absolute div)
5. Article content card: Add gradient-seo left border (3px absolute div)

6. Carousel slides: Ensure bg-[var(--bg-elevated)] and border-[var(--border)]
7. Article outline items: Use text-[var(--text-primary)] for headings
8. "Try with your own topic" CTA: bg-[image:var(--gradient-cta)] text-black

9. Replace any remaining hardcoded dark-only colors

## Constraints
- Do NOT change sample case content or logic
- Must work in both dark and light mode
- npm run build must pass
```

---

### PR 5.1 — Cross-Page QA & Polish

```
Final QA pass across all Neoxra frontend pages. This PR catches any remaining visual inconsistencies.

## Checklist — verify each item and fix if broken:

### All Pages
- [ ] Page background uses bg-[var(--bg)] — no white or black hardcoded
- [ ] All text uses CSS variable colors (--text-primary, --text-secondary, --text-tertiary)
- [ ] All borders use var(--border) or var(--border-bold)
- [ ] All cards/panels use bg-[var(--bg-elevated)]
- [ ] Primary CTA buttons use gradient-cta background
- [ ] ThemeToggle and LanguageToggle visible and functional on every page
- [ ] Switching theme doesn't break any layout
- [ ] Switching language doesn't break any layout
- [ ] No console errors in browser

### Landing Page (/)
- [ ] LanguageToggle visible in Navbar
- [ ] ThemeToggle visible in Navbar
- [ ] Hero "流量" text uses gradient
- [ ] CTA buttons use gradient
- [ ] Platform icons are colored (not monochrome)
- [ ] Platform card left borders are gradient
- [ ] Feature/HowItWorks icons use gradient backgrounds
- [ ] Light mode: all sections readable, no invisible text

### Studio Pages (/instagram, /seo, /threads, /facebook)
- [ ] Generate buttons are gradient CTA
- [ ] Input fields have proper borders and backgrounds
- [ ] Preview components are theme-aware
- [ ] Light mode: all previews readable

### Generate All (/generate)
- [ ] Pipeline progress is theme-aware
- [ ] Platform tabs have colored icons
- [ ] Generate and Download buttons are gradient CTA

### Legal Demo (/demo/legal)
- [ ] Case tabs are theme-aware
- [ ] Content cards have platform accent borders

### Responsive (ALL pages)
- [ ] 375px mobile: all pages functional, no horizontal overflow
- [ ] 768px tablet: all pages look correct
- [ ] 1024px+ desktop: full layout matches design

### Build
- [ ] npm run build passes with ZERO errors
- [ ] No TypeScript errors
- [ ] No unused imports

Fix any issues found. This is the final polish PR before the redesign ships.
```

---

## Summary

| PR | Scope | Files Changed | Priority |
|----|-------|---------------|----------|
| 1.1 | Gradient tokens | 2 | Foundation |
| 1.2 | Shared components | 7 new | Foundation |
| 2.1 | Navbar toggles | 1 | Critical fix |
| 2.2 | Landing gradients | 11 | Core visual |
| 3.1 | Instagram studio | 4 | Studio align |
| 3.2 | SEO studio | 2 | Studio align |
| 3.3 | Threads studio | 2 | Studio align |
| 3.4 | Facebook studio | 2 | Studio align |
| 4.1 | Generate All | 3 | Complex page |
| 4.2 | Legal Demo | 1 | Demo page |
| 5.1 | QA + Polish | All | Final pass |

**Total: 11 PRs across 5 phases.**

Execution order: 1.1 → 1.2 → 2.1 → 2.2 → (3.1, 3.2, 3.3, 3.4 in parallel) → 4.1 → 4.2 → 5.1
