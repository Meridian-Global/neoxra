# Neoxra Full Design System Spec

> Comprehensive spec covering ALL pages, dark/light mode, bilingual support, gradient system, colored platform logos, and unified visual language.
> This is the single source of truth for the entire frontend redesign.

---

## Table of Contents

1. Problems to Fix (What's Broken)
2. Design System Foundation
3. Gradient System (The Signature Look)
4. Platform Logo Colors
5. Navbar Unification
6. Landing Page (`/`) Refinements
7. Studio Pages Redesign (`/instagram`, `/seo`, `/threads`, `/facebook`)
8. Generate All Page (`/generate`) Redesign
9. Legal Demo Page (`/demo/legal`) Redesign
10. Login Page (`/login`) Refinements
11. PR Phases & Codex Prompts

---

## 1. Problems to Fix

### 1A. Dark/Light Mode Toggle Missing on Landing Page
**Root Cause:** Landing page uses its own `components/landing/Navbar.tsx` which does NOT include `<ThemeToggle />` or `<LanguageToggle />`. The `GlobalNav.tsx` (used by studio pages) has both.

**Fix:** Add `<ThemeToggle />` and `<LanguageToggle />` to the landing Navbar. Both components already exist and work.

### 1B. Language Toggle Missing on Landing Page
**Same root cause as above.** Landing `Navbar.tsx` has no language toggle. The `COPY` pattern is already in place — just the UI toggle is missing.

### 1C. Flat Colors — No Gradients
**Current state:** Buttons are flat `bg-nxr-orange`. Cards have flat backgrounds. Text highlight is a simple two-color gradient (`from-nxr-orange to-amber-400`).

**Target:** Instagram-style multi-color gradients (pink → purple → orange → yellow → red) across buttons, card borders, accent elements, badges, and decorative backgrounds. Gradients = premium feel.

### 1D. Platform Logos Are Monochrome
**Current state:** `FaInstagram` is `text-nxr-ig` (single pink), `SiGoogle` is `text-nxr-seo` (single green), etc. They're single-color flat icons.

**Target:** Instagram logo should use its actual brand gradient (pink-purple-orange-yellow). Google should use its 4-color mark. Threads and Facebook can stay single-color (that's their actual brand). But Instagram and Google MUST be multi-color.

### 1E. Studio Pages Don't Match Landing Page Design
**Current state:** Studio pages (`/instagram`, `/seo`, `/threads`, `/facebook`) use `GlobalNav` with CSS variable-based styling, but the page bodies are styled differently from the landing page. Layout, spacing, card styles, and overall visual density don't match.

**Target:** All pages should share the same design system — same card styles, typography scale, glow effects, and glass-morphism patterns.

### 1F. `/demo/legal` Is Chinese-Only
**Current state:** Hardcoded zh-TW content with no English version.

**Fix:** Add full English COPY.

---

## 2. Design System Foundation

### 2A. CSS Variables (Already Established)

The current `globals.css` already has a solid dark/light variable system. **Keep it.** The key variables:

```
Dark Mode (:root):
  --bg:          #0a0a0f      (page background)
  --bg-elevated: #14151f      (card surface)
  --bg-sunken:   #1e1f33      (recessed areas)
  --accent:      #f59e0b      (primary CTA)
  --secondary:   #8b5cf6      (secondary accent)
  --text-primary:   #f5f5f7
  --text-secondary: #94a3b8
  --text-tertiary:  #64748b

Light Mode (html[data-theme='light']):
  --bg:          #f8f8f7
  --bg-elevated: #ffffff
  --bg-sunken:   #f0efed
  --accent:      #ea580c
  --secondary:   #7c3aed
  --text-primary:   #111111
  --text-secondary: #52525b
  --text-tertiary:  #a1a1aa
```

### 2B. NEW CSS Variables to Add

```css
:root {
  /* Instagram-style gradient */
  --gradient-brand: linear-gradient(135deg, #f59e0b 0%, #ef4444 30%, #ec4899 50%, #a855f7 70%, #6366f1 100%);
  --gradient-brand-subtle: linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(236,72,153,0.12) 50%, rgba(168,85,247,0.15) 100%);
  --gradient-brand-border: linear-gradient(135deg, #f59e0b, #ef4444, #ec4899, #a855f7);

  /* Gradient CTA button */
  --gradient-cta: linear-gradient(135deg, #f97316 0%, #ef4444 50%, #ec4899 100%);
  --gradient-cta-hover: linear-gradient(135deg, #fb923c 0%, #f87171 50%, #f472b6 100%);

  /* Card hover glow */
  --gradient-glow-ig: radial-gradient(circle, rgba(225,48,108,0.25) 0%, transparent 70%);
  --gradient-glow-seo: radial-gradient(circle, rgba(16,185,129,0.2) 0%, transparent 70%);
  --gradient-glow-threads: radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 70%);
  --gradient-glow-fb: radial-gradient(circle, rgba(59,130,246,0.2) 0%, transparent 70%);

  /* Feature card gradient borders */
  --gradient-card-border: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(249,115,22,0.3) 50%, rgba(168,85,247,0.2) 100%);
}

html[data-theme='light'] {
  --gradient-brand: linear-gradient(135deg, #ea580c 0%, #dc2626 30%, #db2777 50%, #7c3aed 70%, #4f46e5 100%);
  --gradient-brand-subtle: linear-gradient(135deg, rgba(234,88,12,0.1) 0%, rgba(219,39,119,0.08) 50%, rgba(124,58,237,0.1) 100%);
  --gradient-brand-border: linear-gradient(135deg, #ea580c, #dc2626, #db2777, #7c3aed);
  --gradient-cta: linear-gradient(135deg, #ea580c 0%, #dc2626 50%, #db2777 100%);
  --gradient-cta-hover: linear-gradient(135deg, #f97316 0%, #ef4444 50%, #ec4899 100%);
  --gradient-card-border: linear-gradient(135deg, rgba(0,0,0,0.06) 0%, rgba(234,88,12,0.2) 50%, rgba(124,58,237,0.15) 100%);
}
```

### 2C. Tailwind Config Extensions

Add to `tailwind.config.ts → theme.extend`:

```ts
backgroundImage: {
  'gradient-brand': 'var(--gradient-brand)',
  'gradient-brand-subtle': 'var(--gradient-brand-subtle)',
  'gradient-cta': 'var(--gradient-cta)',
  'gradient-cta-hover': 'var(--gradient-cta-hover)',
},
```

### 2D. Shared Component Library (CSS Classes)

Define reusable class patterns that ALL pages should use:

```
Card:         bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl
Card hover:   hover:border-[var(--border-bold)] hover:shadow-[var(--shadow-md)] transition
Glass card:   bg-[var(--bg-elevated)]/60 backdrop-blur-xl border border-[var(--border)]
Gradient border card: relative before:absolute before:inset-0 before:rounded-xl before:p-[1px] before:bg-gradient-brand-border before:mask-border
Section:      py-20 md:py-28
Container:    mx-auto max-w-[var(--container-max)] px-6
H2:           text-[28px] md:text-4xl font-bold tracking-tight text-[var(--text-primary)]
Body:         text-[15px] leading-7 text-[var(--text-secondary)]
```

---

## 3. Gradient System (The Signature Look)

### 3A. Where Gradients Apply

| Element | Current | Target |
|---------|---------|--------|
| Hero "流量/Traffic" text | `from-nxr-orange to-amber-400` | Full brand gradient: orange → red → pink → purple |
| Primary CTA buttons | Flat `bg-nxr-orange` | `bg-gradient-cta` with hover shift |
| Badge pills | `border-nxr-orange/30 bg-nxr-orange/10` | Gradient border + subtle gradient bg |
| Stats bar icon backgrounds | Flat color | Subtle gradient bg per stat |
| Platform output card left borders | Solid platform color | Gradient border matching platform |
| How It Works step number badges | Flat bg | Gradient ring/border |
| Feature card icons | Single color | Gradient icon backgrounds |
| CTA Footer background | Subtle gradient panel | Stronger gradient panel with glow |
| Glow orbs | Single color radials | Multi-color gradient orbs |
| Navbar "Get Started" button | Flat `bg-nxr-orange` | `bg-gradient-cta` |

### 3B. Instagram Logo Gradient (Critical)

The Instagram icon MUST use the actual Instagram brand gradient, not a flat pink:

```tsx
// Instagram gradient icon component
function InstagramGradientIcon({ size = 24 }: { size?: number }) {
  const id = 'ig-gradient'
  return (
    <svg viewBox="0 0 24 24" width={size} height={size}>
      <defs>
        <linearGradient id={id} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ffd600" />
          <stop offset="25%" stopColor="#ff7a00" />
          <stop offset="50%" stopColor="#ff0069" />
          <stop offset="75%" stopColor="#d300c5" />
          <stop offset="100%" stopColor="#7638fa" />
        </linearGradient>
      </defs>
      <path fill={`url(#${id})`} d="M12 2.163c3.204 0 3.584.012 4.85.07 ... (standard IG path)" />
    </svg>
  )
}
```

Create this as `components/icons/InstagramIcon.tsx`.

### 3C. Google Multi-Color Logo

Google's logo uses 4 colors: Blue (#4285F4), Red (#EA4335), Yellow (#FBBC05), Green (#34A853).

```tsx
// Use the actual Google "G" as a multi-color SVG
function GoogleIcon({ size = 24 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size}>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.97 10.97 0 001 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}
```

Create this as `components/icons/GoogleIcon.tsx`.

### 3D. Threads and Facebook Logos

**Threads**: Keep the single purple (`#8b5cf6`) — that's their actual brand color.

**Facebook**: Keep the single blue (`#3b82f6`) — that's their actual brand color. But use the full "f" mark, not just a flat icon. The `FaFacebookF` from react-icons is fine.

---

## 4. Navbar Unification

### Problem
Two navbars exist:
1. `components/landing/Navbar.tsx` — landing page only, NO toggles
2. `components/GlobalNav.tsx` — studio pages, HAS toggles

### Solution: Merge into One Unified Navbar

Create a new `components/UnifiedNav.tsx` that:
- Works on ALL pages (landing + studio + demo)
- Adapts based on context (landing = anchor links, studio = route links)
- Always shows: Logo, nav links, Language Toggle, Theme Toggle, Login, Get Started CTA
- Supports both dark and light mode via CSS variables (NOT hardcoded Tailwind colors like `bg-nxr-bg`)

```
Layout:
┌─────────────────────────────────────────────────────────────────┐
│ [Logo]  功能  使用案例  資源  定價    [EN|繁中] [🌙] [登入] [開始使用→] │
└─────────────────────────────────────────────────────────────────┘
```

### Key Changes from Current Navbar.tsx:
1. Replace `bg-nxr-bg/80` → `bg-[var(--bg)]/80` (theme-aware)
2. Replace all `text-nxr-*` → `text-[var(--text-*)]` (theme-aware)
3. Add `<LanguageToggle />` and `<ThemeToggle />` to right side
4. "開始使用" button: `bg-gradient-cta` instead of flat `bg-nxr-orange`
5. Mobile drawer also includes toggles

### Props:
```ts
type UnifiedNavProps = {
  variant: 'landing' | 'studio'  // Controls nav link behavior
  copy: NavCopy
}
```

- `landing` variant: nav links are `#features`, `#how-it-works`, etc.
- `studio` variant: nav links are `/generate`, `/instagram`, etc. (current GlobalNav dropdown behavior)

---

## 5. Landing Page (`/`) Refinements

### 5A. Navbar
- Switch from `components/landing/Navbar.tsx` → `components/UnifiedNav.tsx`
- Language + Theme toggles now visible

### 5B. Hero Section
- "流量" text gradient: Change from `from-nxr-orange to-amber-400` → full brand gradient `bg-gradient-brand`
- Primary CTA: Change from `bg-nxr-orange` → `bg-gradient-cta` with `hover:bg-gradient-cta-hover`
- Badge pill: Add gradient border effect
- **All hardcoded dark-only colors must become CSS variable-based** for light mode support

### 5C. MockupCards
- Card backgrounds: `bg-[var(--bg-elevated)]` instead of `bg-nxr-card`
- Card borders: Add subtle gradient borders
- Instagram card badge: Use gradient-colored IG icon instead of flat pink
- All text colors: CSS variables instead of `text-nxr-*`

### 5D. StatsBar
- Icon backgrounds: Use gradient instead of flat color
- Card style: Glass-morphism with `backdrop-blur-xl`

### 5E. HowItWorks
- Step number badges: Gradient ring border
- Connecting lines: Gradient dotted line

### 5F. Features
- Card icon containers: Gradient background
- Card hover: Subtle gradient glow

### 5G. PlatformOutput
- Platform icons: Instagram = gradient SVG, Google = multi-color SVG, Threads = purple, Facebook = blue
- Left border: Keep platform-specific solid color (this is correct as-is)
- Card hover: Platform-colored glow

### 5H. CTAFooter
- Background panel: Stronger gradient with glow
- Button: `bg-gradient-cta`

### 5I. Footer
- No changes needed

### 5J. Light Mode Compatibility
ALL landing components must replace hardcoded dark colors:

| Replace | With |
|---------|------|
| `bg-nxr-bg` | `bg-[var(--bg)]` |
| `bg-nxr-card` | `bg-[var(--bg-elevated)]` |
| `text-nxr-text` | `text-[var(--text-primary)]` |
| `text-nxr-text-secondary` | `text-[var(--text-secondary)]` |
| `text-nxr-text-muted` | `text-[var(--text-tertiary)]` |
| `border-white/10` | `border-[var(--border)]` |
| `bg-white/5` | `bg-[var(--accent-subtle)]` |
| `shadow-glow-orange` | `shadow-[var(--shadow-glow)]` |
| `hover:bg-white/[0.03]` | `hover:bg-[var(--bg-sunken)]` |

This is the single biggest change — systematically replacing all `nxr-*` Tailwind classes with CSS variable equivalents across all landing components.

---

## 6. Studio Pages Redesign

### Design Philosophy
Studio pages (`/instagram`, `/seo`, `/threads`, `/facebook`) should feel like they belong to the same product as the landing page. Currently they use `GlobalNav` (good) and CSS variables (good), but the page body styling differs.

### 6A. Shared Studio Layout Pattern

Every studio page should follow this structure:

```
┌──────────────────────────────────────┐
│  UnifiedNav (variant="studio")       │
├──────────────────────────────────────┤
│  Page Header                         │
│  ┌─ Title + Subtitle ──────────────┐ │
│  │  Platform badge with gradient   │ │
│  │  H1 title                       │ │
│  │  Subtitle text                  │ │
│  └─────────────────────────────────┘ │
│                                      │
│  Main Content                        │
│  ┌─ Input Panel ─┐ ┌─ Preview ────┐ │
│  │  Form fields   │ │  Live output │ │
│  │  Generate btn  │ │  Copy btns   │ │
│  │  (gradient)    │ │              │ │
│  └────────────────┘ └──────────────┘ │
│                                      │
│  Footer                             │
└──────────────────────────────────────┘
```

### 6B. Common Changes Across All Studio Pages

1. **Replace `<GlobalNav />` with `<UnifiedNav variant="studio" />`**
2. **Page header area**: Add background glow orb (platform-colored), glass-morphism panel
3. **Generate button**: `bg-gradient-cta` instead of flat accent color
4. **Cards/panels**: `bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl`
5. **Platform-specific accent**: Each page has a dominant platform color in glow orbs and badges
6. **Input sections**: Glass card with subtle gradient border
7. **Preview sections**: Glass card with platform-colored top border

### 6C. `/instagram` Page Specific

- Hero area: Instagram gradient glow orb (pink-purple-orange)
- Badge: "Instagram Studio" with IG gradient icon
- Carousel preview: Keep current `VisualCarouselRenderer` but add gradient border
- Generate button: IG-colored gradient variant

### 6D. `/seo` Page Specific

- Hero area: Green/emerald glow orb
- Badge: "SEO Article" with Google multi-color icon
- Article preview: Keep current `SeoArticlePreview` but with glass-card wrapper
- Export buttons: Gradient accent

### 6E. `/threads` Page Specific

- Hero area: Purple glow orb
- Badge: "Threads" with Threads icon in purple
- Thread preview: Keep current `ThreadsPreview` with glass-card wrapper

### 6F. `/facebook` Page Specific

- Hero area: Blue glow orb
- Badge: "Facebook" with Facebook icon in blue
- Post preview: Keep current `FacebookPreview` with glass-card wrapper

---

## 7. Generate All Page (`/generate`) Redesign

This is the hero page — it needs the most polish.

### 7A. Layout Changes

```
┌───────────────────────────────────────────┐
│  UnifiedNav                               │
├───────────────────────────────────────────┤
│  Hero Header (with brand gradient glow)   │
│  ┌ GENERATE ALL ─────────────────────────┐│
│  │ 一個想法，產出四個平台                   ││
│  │ Subtitle                              ││
│  └───────────────────────────────────────┘│
│                                           │
│  Input Form (glass card)                  │
│  ┌──────────────────────────────────────┐ │
│  │ Topic / Audience / Industry / Voice  │ │
│  │ [────── Generate All (gradient) ───] │ │
│  └──────────────────────────────────────┘ │
│                                           │
│  Pipeline Progress (gradient step dots)   │
│                                           │
│  Platform Tabs (with gradient underline)  │
│  ┌──┬──┬──┬──┐                           │
│  │IG│SEO│TH│FB│ ← gradient active border │
│  └──┴──┴──┴──┘                           │
│  Content preview area                     │
│                                           │
│  Download All (gradient button)           │
│  Footer                                  │
└───────────────────────────────────────────┘
```

### 7B. Specific Changes
- "GENERATE ALL" eyebrow: Gradient text
- Generate button: Full-width `bg-gradient-cta` with glow animation during generation
- Pipeline progress steps: Gradient line connecting them, gradient-filled dots for completed
- Platform tabs: Active tab has gradient bottom border
- Download button: `bg-gradient-cta`

---

## 8. Legal Demo Page (`/demo/legal`) Redesign

### 8A. Add English COPY
The page is currently zh-TW only. Add full English version following the same `COPY: Record<Language, ...>` pattern.

### 8B. Visual Updates
- Replace `<GlobalNav />` → `<UnifiedNav variant="studio" />`
- Add gradient accent elements
- Showcase cards: Glass-morphism with gradient borders
- CTA buttons: `bg-gradient-cta`
- All hardcoded colors → CSS variables

---

## 9. Login Page (`/login`) Refinements

### 9A. Visual Updates
- Glass-morphism card for the login form
- Gradient accent on the submit button
- Background: Brand gradient glow orb
- All colors via CSS variables for light/dark support

---

## 10. Files Changed Summary

### New Files
```
components/
├── UnifiedNav.tsx                    ← NEW (replaces both Navbar.tsx and GlobalNav.tsx)
├── icons/
│   ├── InstagramIcon.tsx             ← NEW (gradient SVG)
│   └── GoogleIcon.tsx                ← NEW (multi-color SVG)
```

### Modified Files
```
app/
├── globals.css                       ← ADD gradient CSS variables
├── page.tsx                          ← Switch to UnifiedNav, use CSS vars
├── generate/page.tsx                 ← Switch to UnifiedNav, gradient buttons
├── instagram/page.tsx                ← Switch to UnifiedNav, gradient accents
├── seo/page.tsx                      ← Switch to UnifiedNav, gradient accents
├── threads/page.tsx                  ← Switch to UnifiedNav, gradient accents
├── facebook/page.tsx                 ← Switch to UnifiedNav, gradient accents
├── demo/legal/page.tsx               ← Switch to UnifiedNav, add EN COPY
├── login/page.tsx                    ← Gradient accents

components/
├── landing/
│   ├── HeroSection.tsx               ← CSS vars + gradient text
│   ├── MockupCards.tsx               ← CSS vars + gradient borders
│   ├── StatsBar.tsx                  ← CSS vars + gradient icons
│   ├── HowItWorks.tsx                ← CSS vars + gradient badges
│   ├── Features.tsx                  ← CSS vars + gradient icons
│   ├── PlatformOutput.tsx            ← Gradient IG/Google icons
│   ├── CTAFooter.tsx                 ← CSS vars + gradient CTA
│   ├── Footer.tsx                    ← CSS vars
│   ├── GlowOrb.tsx                   ← Multi-color support
│   ├── NeoxraLogo.tsx                ← CSS var stroke colors
│   └── Navbar.tsx                    ← DEPRECATED (replaced by UnifiedNav)

tailwind.config.ts                    ← ADD gradient bg-image classes
```

### Deprecated Files (No Longer Imported)
```
components/landing/Navbar.tsx         ← Replaced by UnifiedNav
components/GlobalNav.tsx              ← Replaced by UnifiedNav
```

Keep them for one PR cycle, delete in a follow-up cleanup PR.

---

## 11. PR Phases & Codex Prompts

### Phase Overview

| Phase | PR | Scope | Risk |
|-------|-----|-------|------|
| 1 | PR-1: Design tokens + gradient system | globals.css, tailwind.config, icon components | Low |
| 2 | PR-2: UnifiedNav | New nav component replacing both navbars | Medium |
| 3 | PR-3: Landing page — CSS var migration + gradients | All landing/ components | Medium |
| 4 | PR-4: Studio pages — nav swap + gradient polish | 4 studio pages + generate + login | Medium |
| 5 | PR-5: Legal demo — i18n + design refresh | demo/legal page | Low |
| 6 | PR-6: Cleanup — remove deprecated components | Delete old nav files, dead code | Low |

---

### PR-1: Design Tokens + Gradient System + Icon Components

**Branch:** `feat/design-tokens-gradients`

**Files:**
- `globals.css` — add gradient variables
- `tailwind.config.ts` — add gradient backgroundImage classes
- `components/icons/InstagramIcon.tsx` — NEW
- `components/icons/GoogleIcon.tsx` — NEW

**Codex Prompt:**
```
Project: Neoxra frontend (Next.js 15, React 19, Tailwind CSS, TypeScript).
Working directory: frontend/

## Task: Add gradient design tokens and icon components

### Step 1: Update globals.css

Open app/globals.css. Add these new CSS variables inside the existing `:root` block (after the existing --ambient-glow line, before the legacy aliases):

--gradient-brand: linear-gradient(135deg, #f59e0b 0%, #ef4444 30%, #ec4899 50%, #a855f7 70%, #6366f1 100%);
--gradient-brand-subtle: linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(236,72,153,0.12) 50%, rgba(168,85,247,0.15) 100%);
--gradient-brand-border: linear-gradient(135deg, #f59e0b, #ef4444, #ec4899, #a855f7);
--gradient-cta: linear-gradient(135deg, #f97316 0%, #ef4444 50%, #ec4899 100%);
--gradient-cta-hover: linear-gradient(135deg, #fb923c 0%, #f87171 50%, #f472b6 100%);
--gradient-glow-ig: radial-gradient(circle, rgba(225,48,108,0.25) 0%, transparent 70%);
--gradient-glow-seo: radial-gradient(circle, rgba(16,185,129,0.2) 0%, transparent 70%);
--gradient-glow-threads: radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 70%);
--gradient-glow-fb: radial-gradient(circle, rgba(59,130,246,0.2) 0%, transparent 70%);
--gradient-card-border: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(249,115,22,0.3) 50%, rgba(168,85,247,0.2) 100%);

Then add the SAME set of variables inside the html[data-theme='light'] block, but with light-mode-appropriate values:

--gradient-brand: linear-gradient(135deg, #ea580c 0%, #dc2626 30%, #db2777 50%, #7c3aed 70%, #4f46e5 100%);
--gradient-brand-subtle: linear-gradient(135deg, rgba(234,88,12,0.1) 0%, rgba(219,39,119,0.08) 50%, rgba(124,58,237,0.1) 100%);
--gradient-brand-border: linear-gradient(135deg, #ea580c, #dc2626, #db2777, #7c3aed);
--gradient-cta: linear-gradient(135deg, #ea580c 0%, #dc2626 50%, #db2777 100%);
--gradient-cta-hover: linear-gradient(135deg, #f97316 0%, #ef4444 50%, #ec4899 100%);
--gradient-card-border: linear-gradient(135deg, rgba(0,0,0,0.06) 0%, rgba(234,88,12,0.2) 50%, rgba(124,58,237,0.15) 100%);

(glow variables for light mode stay the same as dark, just with lower opacity — 0.15 instead of 0.25 for ig, etc.)

### Step 2: Update tailwind.config.ts

In theme.extend, add:

backgroundImage: {
  'gradient-brand': 'var(--gradient-brand)',
  'gradient-brand-subtle': 'var(--gradient-brand-subtle)',
  'gradient-cta': 'var(--gradient-cta)',
  'gradient-cta-hover': 'var(--gradient-cta-hover)',
},

Keep all existing config.

### Step 3: Create components/icons/InstagramIcon.tsx

Create a new file at components/icons/InstagramIcon.tsx. This is an inline SVG of the Instagram logo with the actual Instagram brand gradient (yellow → orange → pink → purple).

```tsx
type InstagramIconProps = { size?: number; className?: string }

export default function InstagramIcon({ size = 24, className }: InstagramIconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true">
      <defs>
        <radialGradient id="ig-grad" cx="30%" cy="107%" r="150%">
          <stop offset="0%" stopColor="#fdf497" />
          <stop offset="5%" stopColor="#fdf497" />
          <stop offset="45%" stopColor="#fd5949" />
          <stop offset="60%" stopColor="#d6249f" />
          <stop offset="90%" stopColor="#285AEB" />
        </radialGradient>
      </defs>
      <path fill="url(#ig-grad)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
    </svg>
  )
}
```

### Step 4: Create components/icons/GoogleIcon.tsx

Create a new file at components/icons/GoogleIcon.tsx. Multi-color Google "G" logo:

```tsx
type GoogleIconProps = { size?: number; className?: string }

export default function GoogleIcon({ size = 24, className }: GoogleIconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.97 10.97 0 001 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}
```

### Step 5: Verify build
Run: npm run build
Ensure zero errors and zero warnings.

## Constraints
- TypeScript strict mode, no `any`
- Do NOT modify any page files or existing components in this PR
- Only add new files and edit globals.css + tailwind.config.ts
- Both dark and light mode variables must be set
```

---

### PR-2: Unified Navigation Component

**Branch:** `feat/unified-nav`
**Depends on:** PR-1

**Files:**
- `components/UnifiedNav.tsx` — NEW
- (does NOT yet swap pages — that happens in PR-3 and PR-4)

**Codex Prompt:**
```
Project: Neoxra frontend (Next.js 15, React 19, Tailwind CSS, TypeScript).
Working directory: frontend/

## Task: Create UnifiedNav component

Create components/UnifiedNav.tsx — a single navigation component that replaces both components/landing/Navbar.tsx (landing page) and components/GlobalNav.tsx (studio pages).

### Requirements

1. Props:
```ts
type UnifiedNavProps = {
  variant: 'landing' | 'studio'
}
```

2. The component must:
   - Be 'use client'
   - Import and use `useLanguage()` from '../components/LanguageProvider'
   - Import and render `<LanguageToggle />` from './LanguageToggle'
   - Import and render `<ThemeToggle />` from './landing/ThemeToggle'
   - Import `NeoxraLogo` from './landing/NeoxraLogo'
   - Import `{ ArrowRight, Menu, X }` from 'lucide-react'
   - Define its own bilingual COPY object (en + zh-TW) for all labels

3. Layout (desktop):
```
[NeoxraLogo + "Neoxra"]  [nav links]  [EN|繁中] [Dark/Light] [登入] [開始使用 →]
```

4. Nav links behavior:
   - When variant='landing': links are #features, #how-it-works, #platform-output, #cta-footer (anchor scroll)
   - When variant='studio': links include dropdown menus for Products (Instagram Studio → /instagram, SEO Articles → /seo, Threads → /threads, Facebook → /facebook) and Use Cases (Law Firms → /demo/legal), plus a "Generate All" direct link to /generate

5. Styling:
   - Sticky top-0 z-50
   - Background: `bg-[var(--bg)]/80 backdrop-blur-xl`
   - Border bottom: `border-b border-[var(--border)]`
   - All text colors use CSS variables: `text-[var(--text-primary)]`, `text-[var(--text-secondary)]`, `text-[var(--text-tertiary)]`
   - "Get Started" button: `background: var(--gradient-cta)` with `hover:shadow-[var(--shadow-glow)]` and `hover:-translate-y-0.5`
   - "Login" button: ghost style with `border border-[var(--border)]`
   - Height: h-16
   - Max width: max-w-[1200px] mx-auto px-6

6. Mobile (lg:hidden):
   - Hamburger menu button
   - Slide-down drawer with all nav links, toggles, login, and CTA
   - Drawer background: `bg-[var(--bg)]/95 backdrop-blur-xl`

7. Bilingual COPY:
```ts
const COPY = {
  'zh-TW': {
    features: '功能',
    useCases: '使用案例',
    resources: '資源',
    pricing: '定價',
    login: '登入',
    getStarted: '開始使用',
    products: '產品',
    instagram: 'Instagram Studio',
    seo: 'SEO 文章',
    threads: 'Threads',
    facebook: 'Facebook',
    lawFirms: '法律事務所',
    generateAll: '一次產出多平台',
    moreVerticals: '更多產業即將推出',
    soon: '即將推出',
  },
  en: {
    features: 'Features',
    useCases: 'Use Cases',
    resources: 'Resources',
    pricing: 'Pricing',
    login: 'Login',
    getStarted: 'Get Started',
    products: 'Products',
    instagram: 'Instagram Studio',
    seo: 'SEO Articles',
    threads: 'Threads',
    facebook: 'Facebook',
    lawFirms: 'Law Firms',
    generateAll: 'Generate All',
    moreVerticals: 'More verticals coming soon',
    soon: 'Coming soon',
  },
}
```

8. For the studio variant dropdown menus, use a `<details>` based dropdown similar to the current GlobalNav pattern. Apply the same CSS variable styling.

9. Export as default.

### Constraints
- TypeScript strict mode, no `any`
- NO hardcoded dark-only colors (no `bg-nxr-bg`, no `text-white`, no `border-white/10`)
- ALL colors must use CSS variables so both dark and light themes work
- Do NOT modify existing components — only create the new file
- npm run build must pass
```

---

### PR-3: Landing Page — CSS Variable Migration + Gradients

**Branch:** `feat/landing-design-refresh`
**Depends on:** PR-1, PR-2

**Files:**
- `app/page.tsx`
- All `components/landing/*.tsx`

**Codex Prompt:**
```
Project: Neoxra frontend (Next.js 15, React 19, Tailwind CSS, TypeScript).
Working directory: frontend/

## Task: Migrate landing page to CSS variables + add gradients

This PR makes the landing page work in both dark and light mode, adds gradient effects, and uses the new UnifiedNav with language/theme toggles.

### Step 1: Update app/page.tsx

1. Replace the import of `Navbar` from '../components/landing/Navbar':
   - Remove: import Navbar from '../components/landing/Navbar'
   - Add: import UnifiedNav from '../components/UnifiedNav'

2. In the JSX, replace `<Navbar copy={t.nav} />` with `<UnifiedNav variant="landing" />`

3. Remove the `nav` property from both zh-TW and en COPY objects (no longer needed — UnifiedNav has its own copy).

4. Change the <main> className from `min-h-screen bg-nxr-bg font-sans` to `min-h-screen bg-[var(--bg)] font-sans`

### Step 2: Update components/landing/HeroSection.tsx

Replace all hardcoded dark-only Tailwind classes with CSS variable equivalents:
- `text-nxr-text` → `text-[var(--text-primary)]`
- `text-nxr-text-secondary` → `text-[var(--text-secondary)]`
- `text-nxr-text-muted` → `text-[var(--text-tertiary)]`
- `bg-nxr-orange` → CSS: `style={{ background: 'var(--gradient-cta)' }}`
- `text-nxr-orange` → `text-[var(--accent)]`
- `border-nxr-orange/30` → `border-[var(--accent)]/30`
- `bg-nxr-orange/10` → `bg-[var(--accent-subtle)]`
- `text-white/90` → `text-[var(--text-primary)]`
- `border-white/10` → `border-[var(--border)]`
- `hover:border-white/20` → `hover:border-[var(--border-bold)]`
- `hover:bg-white/[0.03]` → `hover:bg-[var(--bg-sunken)]`
- `shadow-glow-orange` → `shadow-[var(--shadow-glow)]`

Change the hero headline gradient from:
  `bg-gradient-to-r from-nxr-orange to-amber-400`
to:
  `bg-gradient-brand` (uses the full brand gradient variable)

Change the primary CTA button from flat orange to gradient:
  Remove: `bg-nxr-orange ... hover:bg-orange-400`
  Add: `style={{ background: 'var(--gradient-cta)' }}` with hover: `style={{ background: 'var(--gradient-cta-hover)' }}` — use onMouseEnter/onMouseLeave state for hover, or use a CSS class.

Better approach: add a utility class in globals.css:
```css
.btn-gradient-cta {
  background: var(--gradient-cta);
  transition: all 0.2s;
}
.btn-gradient-cta:hover {
  background: var(--gradient-cta-hover);
  box-shadow: var(--shadow-glow);
  transform: translateY(-2px);
}
```
Then use className="btn-gradient-cta" on the button.

### Step 3: Update components/landing/MockupCards.tsx

Same CSS variable migration:
- `bg-nxr-card` → `bg-[var(--bg-elevated)]`
- `border-white/10` → `border-[var(--border)]`
- `bg-[#161625]` → `bg-[var(--bg-sunken)]`
- `text-nxr-text` → `text-[var(--text-primary)]`
- `text-nxr-text-secondary` → `text-[var(--text-secondary)]`
- `text-nxr-text-muted` → `text-[var(--text-tertiary)]`
- `bg-nxr-ig` → `bg-[var(--platform-instagram)]`
- `text-nxr-ig` → `text-[var(--platform-instagram)]`
- `text-nxr-seo` → `text-[var(--platform-seo)]`
- `text-nxr-threads` → `text-[var(--platform-threads)]`
- `bg-nxr-threads/15` → `bg-[var(--platform-threads)]/15`
- `bg-white/15` → `bg-[var(--text-tertiary)]/30`
- `shadow-black/30` → `shadow-[var(--shadow-lg)]`

### Step 4: Update components/landing/StatsBar.tsx

Same CSS variable migration pattern. Additionally, add gradient background to the icon containers.

### Step 5: Update components/landing/HowItWorks.tsx

Same pattern. Add gradient ring to step number badges.

### Step 6: Update components/landing/Features.tsx

Same pattern. Add subtle gradient background to icon containers.

### Step 7: Update components/landing/PlatformOutput.tsx

Same CSS variable migration. Additionally:
- Replace `FaInstagram` import and usage with `InstagramIcon` from '../icons/InstagramIcon'
- Replace `SiGoogle` import and usage with `GoogleIcon` from '../icons/GoogleIcon'
- Keep `SiThreads` and `FaFacebookF` (they stay single-color, which is correct for those brands)
- Change `text-nxr-ig` → `text-[var(--platform-instagram)]` etc.
- Change `border-l-nxr-ig` → `border-l-[var(--platform-instagram)]` etc.

### Step 8: Update components/landing/CTAFooter.tsx

Same CSS variable migration. Change CTA button to use `btn-gradient-cta` class.

### Step 9: Update components/landing/Footer.tsx

Same CSS variable migration.

### Step 10: Update components/landing/GlowOrb.tsx

Ensure colors use CSS variables. Add support for 'brand' color option that uses the multi-color gradient.

### Step 11: Update components/landing/NeoxraLogo.tsx

Replace hardcoded color values with CSS variable usage:
- `fill="#12121f"` → use `var(--bg-elevated)` via `fill="var(--bg-elevated,#12121f)"`
- `stroke="#f97316"` → `stroke="var(--accent,#f97316)"`

### Step 12: Add utility classes to globals.css

Add after the existing @keyframes glow:

```css
.btn-gradient-cta {
  background: var(--gradient-cta);
  color: var(--text-on-accent);
  font-weight: 600;
  transition: all 0.2s ease;
}
.btn-gradient-cta:hover {
  background: var(--gradient-cta-hover);
  box-shadow: var(--shadow-glow);
  transform: translateY(-2px);
}

.text-gradient-brand {
  background: var(--gradient-brand);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

### Step 13: Verify

Run: npm run build
Ensure zero errors.

Test mentally: when data-theme="light", all colors should flip to light variants because everything uses CSS variables now.

## Critical constraints
- TypeScript strict, no `any`
- EVERY hardcoded dark-only color must be replaced with a CSS variable
- The bilingual COPY pattern must be preserved exactly
- Do NOT delete Navbar.tsx or GlobalNav.tsx yet (deprecated but kept for safety)
- Do NOT modify any non-landing page files
```

---

### PR-4: Studio Pages — Nav Swap + Gradient Polish

**Branch:** `feat/studio-design-refresh`
**Depends on:** PR-1, PR-2

**Files:**
- `app/instagram/page.tsx`
- `app/seo/page.tsx`
- `app/threads/page.tsx`
- `app/facebook/page.tsx`
- `app/generate/page.tsx`
- `app/login/page.tsx`

**Codex Prompt:**
```
Project: Neoxra frontend (Next.js 15, React 19, Tailwind CSS, TypeScript).
Working directory: frontend/

## Task: Update all studio pages to use UnifiedNav + gradient accents

For each of these 6 page files, make the following changes:

### Common change for ALL pages:

1. Replace GlobalNav import:
   - Remove: import { GlobalNav } from '../../components/GlobalNav' (or '../../../components/GlobalNav' for demo/legal)
   - Add: import UnifiedNav from '../../components/UnifiedNav' (adjust path for demo/legal)

2. Replace JSX:
   - Remove: <GlobalNav />
   - Add: <UnifiedNav variant="studio" />

3. Change all "Generate" / primary action buttons from flat accent color to gradient:
   - Find the main generate/submit button in each page
   - Change its background from `bg-[var(--accent)]` or `bg-[var(--bg-accent)]` to className including `btn-gradient-cta`
   - Keep the existing text and onClick handlers

### Page-specific changes:

#### app/instagram/page.tsx
- Main generate button: add `btn-gradient-cta` class
- The button currently uses inline styles or Tailwind `bg-[var(--accent)]` — change to `btn-gradient-cta`

#### app/seo/page.tsx
- Main generate button: add `btn-gradient-cta` class

#### app/threads/page.tsx
- Main generate button: add `btn-gradient-cta` class

#### app/facebook/page.tsx
- Main generate button: add `btn-gradient-cta` class

#### app/generate/page.tsx
- "Generate All" button: add `btn-gradient-cta` class
- "Download All" button: add `btn-gradient-cta` class
- "GENERATE ALL" eyebrow text: add `text-gradient-brand` class

#### app/login/page.tsx
- Submit button: add `btn-gradient-cta` class

## Constraints
- TypeScript strict, no `any`
- Do NOT change any functionality, copy text, or state logic
- Only change: (1) nav import/usage, (2) button gradient classes
- Preserve all existing bilingual COPY patterns
- npm run build must pass
```

---

### PR-5: Legal Demo — i18n + Design Refresh

**Branch:** `feat/legal-i18n`
**Depends on:** PR-2

**Files:**
- `app/demo/legal/page.tsx`

**Codex Prompt:**
```
Project: Neoxra frontend (Next.js 15, React 19, Tailwind CSS, TypeScript).
Working directory: frontend/

## Task: Add English translation to /demo/legal page

The demo/legal page currently has all content hardcoded in zh-TW only. Add full bilingual support.

### Step 1: Analyze current structure

Read app/demo/legal/page.tsx fully. It has:
- SAMPLE_CASES array with 3 legal case studies (hardcoded zh-TW)
- Various UI labels hardcoded in zh-TW
- Uses GlobalNav (already swapped to UnifiedNav if PR-4 is merged — if not, swap it here too)
- Uses useLanguage() but only for GlobalNav

### Step 2: Restructure with COPY pattern

1. Define a LegalDemoCopy type covering all text in the page
2. Create COPY: Record<'en' | 'zh-TW', LegalDemoCopy>
3. Move ALL zh-TW hardcoded strings into COPY['zh-TW']
4. Create full English translations in COPY['en']
5. In the component: const { language } = useLanguage(); const t = COPY[language]
6. Replace all hardcoded strings with t.xxx references

### Step 3: English translations for sample cases

Translate the 3 sample cases:
- 車禍理賠流程 → "Car Accident Claims Process"
- 租約糾紛常見問題 → "Common Lease Dispute Issues"
- (3rd case — read the file to find it) → English equivalent

Translate all slide titles, bodies, captions, article titles, outlines, and summaries.

### Step 4: Swap nav if not already done

If still using GlobalNav, change to:
- import UnifiedNav from '../../../components/UnifiedNav'
- <UnifiedNav variant="studio" />

### Step 5: Add gradient accents

- CTA buttons: btn-gradient-cta class
- Any remaining hardcoded colors → CSS variables

## Constraints
- TypeScript strict, no `any`
- Preserve all existing functionality (live demo generation, SSE streaming, etc.)
- Quality English translations — professional legal content, not literal Google Translate
- npm run build must pass
```

---

### PR-6: Cleanup — Remove Deprecated Components

**Branch:** `chore/nav-cleanup`
**Depends on:** PR-3, PR-4, PR-5 all merged

**Files:**
- DELETE `components/landing/Navbar.tsx`
- DELETE `components/GlobalNav.tsx`
- Verify no imports reference them

**Codex Prompt:**
```
Project: Neoxra frontend (Next.js 15, React 19, Tailwind CSS, TypeScript).
Working directory: frontend/

## Task: Remove deprecated navigation components

1. Search the entire frontend/ directory for any imports of:
   - 'components/landing/Navbar' or './Navbar' from landing/
   - 'components/GlobalNav' or '../components/GlobalNav' or '../../components/GlobalNav'

2. If ANY file still imports these, update it to import UnifiedNav instead.

3. Once no imports remain:
   - Delete components/landing/Navbar.tsx
   - Delete components/GlobalNav.tsx

4. Also remove unused nxr-* Tailwind classes from tailwind.config.ts IF no file references them anymore. Search for 'nxr-' across all files to verify.

5. Run: npm run build — must pass with zero errors.

## Constraints
- Do NOT modify any functionality
- Only remove dead code
```

---

## Appendix: Quick Reference — Color Migration Cheat Sheet

| Hardcoded (Dark Only) | CSS Variable Replacement |
|------------------------|--------------------------|
| `bg-nxr-bg` | `bg-[var(--bg)]` |
| `bg-nxr-card` | `bg-[var(--bg-elevated)]` |
| `bg-nxr-card-hover` | `bg-[var(--bg-sunken)]` |
| `text-nxr-text` | `text-[var(--text-primary)]` |
| `text-nxr-text-secondary` | `text-[var(--text-secondary)]` |
| `text-nxr-text-muted` | `text-[var(--text-tertiary)]` |
| `border-nxr-border` | `border-[var(--border)]` |
| `bg-nxr-orange` | `bg-[var(--accent)]` or `btn-gradient-cta` |
| `text-nxr-orange` | `text-[var(--accent)]` |
| `shadow-glow-orange` | `shadow-[var(--shadow-glow)]` |
| `bg-nxr-ig` | `bg-[var(--platform-instagram)]` |
| `text-nxr-ig` | `text-[var(--platform-instagram)]` |
| `border-l-nxr-ig` | `border-l-[var(--platform-instagram)]` |
| `bg-nxr-seo` | `bg-[var(--platform-seo)]` |
| `text-nxr-seo` | `text-[var(--platform-seo)]` |
| `bg-nxr-threads` | `bg-[var(--platform-threads)]` |
| `text-nxr-threads` | `text-[var(--platform-threads)]` |
| `bg-nxr-fb` | `bg-[var(--platform-facebook)]` |
| `text-nxr-fb` | `text-[var(--platform-facebook)]` |
| `border-white/10` | `border-[var(--border)]` |
| `border-white/6` | `border-[var(--border)]` |
| `bg-white/5` | `bg-[var(--accent-subtle)]` |
| `text-white/90` | `text-[var(--text-primary)]` |
| `hover:bg-white/[0.03]` | `hover:bg-[var(--bg-sunken)]` |
| `bg-[#161625]` | `bg-[var(--bg-sunken)]` |
| `shadow-black/30` | Use `shadow-[var(--shadow-lg)]` |
