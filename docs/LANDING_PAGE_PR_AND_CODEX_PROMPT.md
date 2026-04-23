# Neoxra Landing Page — PR Spec + Codex Prompt

> Final deliverable for implementing the landing page redesign.
> Covers asset strategy, logo solution, platform icons, and the exact prompts to give Claude Code and Codex.

---

## Part 1: Answers to Your Questions

### Q1: No Assets — Free Sources

You don't need a design asset library. The spec is intentionally zero-image. Everything is code:

| Need | Solution | Cost |
|------|----------|------|
| UI icons (arrows, check, zap, clock) | `lucide-react` — already compatible with your stack | Free, MIT |
| Platform logos (IG, FB, Threads) | `react-icons` — install once, import by name | Free, MIT |
| Google icon | `react-icons/si` → `SiGoogle` | Free |
| Decorative elements | CSS `radial-gradient` + `filter: blur()` for glow orbs | Free |
| Hero mockup cards | Styled `<div>` components (no images) | Free |
| Illustrations | Not needed — the dark card-based design has no illustrations | — |

If you ever need free SVG illustrations later: [undraw.co](https://undraw.co), [humaaans.com](https://humaaans.com), or [storyset.com](https://storyset.com). But this landing page doesn't use any.

### Q2: No Logo — Solution

Build the logo as an inline SVG React component. This is standard for early-stage SaaS — no need to pay for a logo tool.

The spec calls for `<NeoxraLogo />`: a circular icon with a conductor's baton / waveform motif in orange on dark. Claude Code will generate this as part of the PR. It renders as crisp SVG at any size, loads instantly, and you can iterate on it in code.

If you later want a polished logo: [Logo.com](https://logo.com) (free to design, ~$20 to download) or [Brandmark.io](https://brandmark.io) (~$25). But for now, a code-built SVG is the right move — it ships with the page, no external dependency.

### Q3: Platform Logos (IG, Google, Threads, FB)

All solved by one package:

```bash
cd frontend && npm install react-icons
```

Then import:
```tsx
import { FaInstagram, FaFacebookF } from 'react-icons/fa'
import { SiThreads, SiGoogle } from 'react-icons/si'
```

These are official vector icons, MIT licensed, tree-shakeable (only the icons you import get bundled). No image files needed.

### Q4: AI Tool Cost Strategy

Your current setup — Claude Pro ($20) + Codex ($20) — is already optimal for this task. Here's why:

| Tool | You Have It? | Needed for This? | Verdict |
|------|-------------|-------------------|---------|
| Claude Pro ($20/mo) | Yes | Yes — PR planning, spec refinement, code review | Keep |
| Codex ($20/mo) | Yes | Yes — bulk code generation from prompt | Keep |
| Claude Design | No | No — you already have the target design as a PNG reference | Skip |
| Figma/design tools | No | No — the spec is detailed enough for direct implementation | Skip |
| AI image generators | No | No — zero-image design | Skip |

**Claude Design is not worth subscribing to** for this project. You already have: (1) a pixel-reference PNG of the target design, (2) a detailed PR spec with exact colors, spacing, and sections. Claude Design helps when you need to *create* a design from scratch — you're past that stage.

**Total cost: $40/mo. That's the floor.** No additional tools needed.

---

## Part 2: PR Specification

### PR Title
`feat(frontend): redesign landing page to match target dark-theme design`

### PR Branch
`feat/landing-page-redesign`

### PR Description
Rebuild the Neoxra marketing landing page (`/` route) to match the target design mockup. Dark theme only, zero external images, all assets built as CSS/SVG/React components. Preserves the existing bilingual `COPY` pattern with `useLanguage()` hook.

### Dependencies to Install
```bash
cd frontend
npm install react-icons
```

(`lucide-react` is NOT currently installed — add it too)
```bash
npm install lucide-react
```

### Files to Create

```
frontend/
├── app/
│   ├── page.tsx                          ← REPLACE (new landing page shell)
│   └── globals.css                       ← UPDATE (add CSS variables + glow keyframes)
├── components/
│   └── landing/
│       ├── Navbar.tsx                    ← NEW
│       ├── HeroSection.tsx               ← NEW
│       ├── MockupCards.tsx               ← NEW (floating UI cards for hero)
│       ├── StatsBar.tsx                  ← NEW
│       ├── HowItWorks.tsx                ← NEW
│       ├── Features.tsx                  ← NEW
│       ├── PlatformOutput.tsx            ← NEW
│       ├── CTAFooter.tsx                 ← NEW
│       ├── Footer.tsx                    ← NEW
│       ├── NeoxraLogo.tsx                ← NEW (inline SVG)
│       └── GlowOrb.tsx                  ← NEW (reusable background blur)
├── tailwind.config.ts                    ← UPDATE (add custom colors + shadows)
└── package.json                          ← UPDATE (add react-icons, lucide-react)
```

### Files to Preserve / Not Touch
- `components/GlobalNav.tsx` — keep as-is (the new `Navbar.tsx` replaces it on the landing page only)
- `components/LanguageProvider.tsx` — keep as-is (still used via `useLanguage()`)
- All other routes (`/generate`, `/instagram`, `/seo`, `/threads`, `/facebook`, `/demo/legal`)

### Design Tokens

Add to `globals.css`:

```css
:root {
  --bg-primary: #0a0a14;
  --bg-card: #12121f;
  --bg-card-hover: #1a1a2e;
  --border-card: #1e1e3a;
  --accent-orange: #f97316;
  --accent-orange-glow: rgba(249, 115, 22, 0.3);
  --accent-purple: #a855f7;
  --accent-purple-glow: rgba(168, 85, 247, 0.2);
  --text-primary: #f5f5f5;
  --text-secondary: #a0a0b8;
  --text-muted: #6b6b80;
}
```

Add to `tailwind.config.ts`:

```ts
theme: {
  extend: {
    colors: {
      'nxr-bg': '#0a0a14',
      'nxr-card': '#12121f',
      'nxr-card-hover': '#1a1a2e',
      'nxr-border': '#1e1e3a',
      'nxr-orange': '#f97316',
      'nxr-purple': '#a855f7',
      'nxr-text': '#f5f5f5',
      'nxr-text-secondary': '#a0a0b8',
      'nxr-text-muted': '#6b6b80',
      'nxr-ig': '#e1306c',
      'nxr-seo': '#10b981',
      'nxr-threads': '#8b5cf6',
      'nxr-fb': '#3b82f6',
    },
    boxShadow: {
      'glow-orange': '0 0 30px rgba(249, 115, 22, 0.3)',
      'glow-purple': '0 0 30px rgba(168, 85, 247, 0.2)',
    },
    fontFamily: {
      sans: ['"Noto Sans TC"', 'system-ui', 'sans-serif'],
    },
  },
},
```

### Section Specs (8 Sections)

**1. Navbar** — Sticky, backdrop-blur, dark. Left: `<NeoxraLogo />`. Center: 功能 | 使用案例 | 資源 | 定價. Right: 登入 (ghost) + 開始使用 (orange filled). Remove light/dark toggle.

**2. Hero** — Two-column. Left: badge pill "AI 內容交響樂團", headline "把想法變成**流量**" (流量 in orange gradient), subheadline, body, two CTA buttons, trust badges. Right: `<MockupCards />` — four floating styled divs (Instagram carousel, SEO article, Threads post, Facebook post) at slight angles with shadows. Cards are NOT images.

**3. Stats Bar** — 4-column grid. Each: icon + number + label. Glass-morphism cards.

**4. How It Works** — "內容交響樂團如何運作". 3-step horizontal cards with number badges and connecting dots/lines.

**5. Features** — "不只是生成內容，而是創造流量". 4-column grid with decorative icons.

**6. Platform Output** — "一個引擎，多平台輸出". 4 platform cards with platform-specific accent colors and icons from `react-icons`.

**7. CTA Footer** — Centered gradient panel, orange CTA, trust line.

**8. Footer** — Minimal: "Neoxra © 2026 · Meridian Global LLC".

### Bilingual Pattern

**CRITICAL**: The current `page.tsx` uses this pattern and it MUST be preserved:

```tsx
const COPY: Record<'en' | 'zh-TW', LocalizedCopy> = {
  'en': { /* English content */ },
  'zh-TW': { /* Chinese content */ },
}

// Inside component:
const { language } = useLanguage()
const t = COPY[language]
```

All visible text must exist in both `en` and `zh-TW`. The `zh-TW` content is the primary/default (it matches the target design). English is secondary but must be complete.

### Responsive Breakpoints
- Desktop (>1024px): Full layout as designed
- Tablet (768–1024px): 2-column grids, hero stacks vertically
- Mobile (<768px): Single column, hero mockup cards hidden or simplified

### Acceptance Criteria
- [ ] Page matches target design at desktop width (±5% tolerance on spacing)
- [ ] All 8 sections render correctly
- [ ] Platform logos (IG, Google, Threads, FB) display via `react-icons`
- [ ] Hero mockup cards are styled divs, not images
- [ ] Background glow orbs visible (orange + purple radial gradients)
- [ ] Orange CTA buttons have hover glow animation
- [ ] Bilingual COPY pattern preserved — `useLanguage()` switches all text
- [ ] Responsive down to 375px mobile width
- [ ] No external image dependencies
- [ ] No console errors
- [ ] `npm run build` passes with no errors
- [ ] Light/dark toggle removed from navbar

---

## Part 3: Claude Code Prompt

Copy-paste this into Claude Code to have it plan and scaffold the PR:

```
Read the PR spec at docs/LANDING_PAGE_PR_AND_CODEX_PROMPT.md (Part 2: PR Specification).

Then implement the full landing page redesign:

1. Install dependencies:
   npm install react-icons lucide-react

2. Update tailwind.config.ts with the custom colors, shadows, and font family from the spec.

3. Update app/globals.css with the CSS variables and glow keyframe animations.

4. Create all component files under components/landing/:
   - NeoxraLogo.tsx (inline SVG, circular icon with waveform motif, orange accent)
   - GlowOrb.tsx (reusable positioned radial-gradient blur)
   - Navbar.tsx (sticky, backdrop-blur, dark only, no light/dark toggle)
   - MockupCards.tsx (4 floating styled divs: IG carousel, SEO article, Threads post, FB post)
   - HeroSection.tsx (two-column with MockupCards on right)
   - StatsBar.tsx (4-column glass-morphism grid)
   - HowItWorks.tsx (3-step horizontal with connecting lines)
   - Features.tsx (4-column grid)
   - PlatformOutput.tsx (4 platform cards with react-icons logos)
   - CTAFooter.tsx (gradient panel, orange CTA)
   - Footer.tsx (minimal copyright)

5. Replace app/page.tsx:
   - Import all landing components
   - Use the existing bilingual pattern: COPY Record<'en' | 'zh-TW', LocalizedCopy> + useLanguage()
   - All visible text in both languages (zh-TW is primary, matches target design)
   - Compose sections top to bottom: Navbar → Hero → Stats → HowItWorks → Features → PlatformOutput → CTAFooter → Footer

6. Use platform icons from react-icons:
   import { FaInstagram, FaFacebookF } from 'react-icons/fa'
   import { SiThreads, SiGoogle } from 'react-icons/si'

7. Use UI icons from lucide-react:
   import { Zap, Clock, TrendingUp, Users, Target, Package, CheckCircle, Rocket, BarChart3 } from 'lucide-react'

Key constraints:
- Dark mode ONLY (background: #0a0a14)
- Zero external images — everything is CSS/SVG/React components
- Hero mockup cards are styled <div> components, NOT images
- Preserve useLanguage() hook and LanguageProvider
- Do NOT modify GlobalNav.tsx or any other routes
- npm run build must pass with zero errors

Reference: the target design is a dark-theme premium SaaS page with orange (#f97316) as primary accent, purple (#a855f7) as secondary, glass-morphism cards, and background glow orbs.
```

---

## Part 4: Codex Prompt

Copy-paste this into Codex for implementation:

```
Implement the Neoxra landing page redesign in the frontend/ directory. This is a Next.js 15 + React 19 + Tailwind CSS + TypeScript project.

## What to build
A single-page dark-theme SaaS landing page at the `/` route with 8 sections: Navbar, Hero (with floating UI mockup cards), Stats Bar, How It Works, Features, Platform Output, CTA Footer, Footer.

## Step-by-step instructions

### Step 1: Install packages
Run: npm install react-icons lucide-react
(from the frontend/ directory)

### Step 2: Update tailwind.config.ts
Add to theme.extend:
- colors: nxr-bg (#0a0a14), nxr-card (#12121f), nxr-card-hover (#1a1a2e), nxr-border (#1e1e3a), nxr-orange (#f97316), nxr-purple (#a855f7), nxr-text (#f5f5f5), nxr-text-secondary (#a0a0b8), nxr-text-muted (#6b6b80), nxr-ig (#e1306c), nxr-seo (#10b981), nxr-threads (#8b5cf6), nxr-fb (#3b82f6)
- boxShadow: glow-orange (0 0 30px rgba(249,115,22,0.3)), glow-purple (0 0 30px rgba(168,85,247,0.2))
- fontFamily.sans: ["Noto Sans TC", "system-ui", "sans-serif"]

### Step 3: Update app/globals.css
Add CSS variables under :root:
--bg-primary: #0a0a14; --bg-card: #12121f; --bg-card-hover: #1a1a2e; --border-card: #1e1e3a; --accent-orange: #f97316; --accent-orange-glow: rgba(249,115,22,0.3); --accent-purple: #a855f7; --accent-purple-glow: rgba(168,85,247,0.2); --text-primary: #f5f5f5; --text-secondary: #a0a0b8; --text-muted: #6b6b80

Add a @keyframes glow animation for the CTA button hover effect.

### Step 4: Create components/landing/NeoxraLogo.tsx
An inline SVG React component. Circular icon with a stylized conductor's baton or audio waveform motif. Use #f97316 (orange) as the accent color on dark. Accept optional className and size props. Export as default.

### Step 5: Create components/landing/GlowOrb.tsx
A positioned div with radial-gradient background, filter: blur(120px), opacity: 0.15, position: absolute. Props: color ('orange' | 'purple'), position (top/left/right as CSS values), size (px). Used behind hero and mid-page for ambient glow.

### Step 6: Create components/landing/Navbar.tsx
Props: receives localized copy for nav labels.
- Sticky positioning with backdrop-blur-xl and bg-nxr-bg/80
- Left: <NeoxraLogo /> + "Neoxra" text
- Center: nav links (功能, 使用案例, 資源, 定價 in zh-TW / Features, Use Cases, Resources, Pricing in en)
- Right: 登入/Login ghost button + 開始使用/Get Started orange filled button with hover glow
- NO light/dark mode toggle
- Mobile: hamburger menu with slide-out drawer

### Step 7: Create components/landing/MockupCards.tsx
Four floating card components arranged with slight rotation and overlap:
1. Instagram Carousel Card: Shows "1/5" indicator, slide title in Chinese, carousel dots
2. SEO Article Card: Shows article title + meta description preview
3. Threads Post Card: Shows avatar circle, post text, engagement counts (likes, replies, reposts)
4. Facebook Post Card: Shows post text with reaction emoji row
Each card: bg-nxr-card, border border-nxr-border, rounded-xl, shadow-lg. Slight transform: rotate and translate for floating effect. Use Tailwind.

### Step 8: Create components/landing/HeroSection.tsx
Two-column layout (lg:grid-cols-2):
- Left column:
  - Badge pill: border border-nxr-orange/30 bg-nxr-orange/10 text with "⚡ AI 內容交響樂團"
  - Headline: "把想法變成" + <span className="text-transparent bg-clip-text bg-gradient-to-r from-nxr-orange to-amber-400">流量</span>
  - Subheadline: "一個想法，四個平台，直接發布。"
  - Body paragraph
  - Two buttons: 免費開始使用 (orange bg, glow on hover) + 預約 Demo (ghost outline)
  - Trust badges row: ✓ 無需信用卡 ✓ 3 分鐘快速開始 ✓ 支援繁中
- Right column: <MockupCards />
- Background: <GlowOrb color="orange" /> behind left, <GlowOrb color="purple" /> behind right

### Step 9: Create components/landing/StatsBar.tsx
4-column grid (sm:grid-cols-2 lg:grid-cols-4). Each card:
- bg-nxr-card/50 backdrop-blur border border-nxr-border rounded-xl p-6
- Lucide icon (Zap, Clock, TrendingUp, Users) in nxr-orange
- Large number text (text-3xl font-bold text-nxr-text)
- Label text (text-sm text-nxr-text-secondary)
Stats: ⚡ 4 平台內容/一次生成, ⏱ 節省 80% 時間/從構想到發布, 📈 提升 300% 效率/內容產出速度, 👥 10,000+ 用戶/專業團隊信賴

### Step 10: Create components/landing/HowItWorks.tsx
Section title: "內容交響樂團如何運作"
Subtitle: "你是指揮，AI 代理人是專精樂手。你給方向，他們同步執行。"
3-step horizontal layout (lg:grid-cols-3) with connecting dotted lines between steps:
1. 🎯 輸入想法 — description text
2. 🤖 AI 樂手協作 — description text
3. 📦 獲得完整內容包 — description text
Each: numbered badge (1/2/3), icon, title, description in a card.

### Step 11: Create components/landing/Features.tsx
Section title: "不只是生成內容，而是創造流量"
4-column grid (sm:grid-cols-2 lg:grid-cols-4):
1. 精準平台適配 — 每個平台都有專屬格式與內容策略，最大化觸及與互動。
2. 結構完整 — 標題、內文、標籤、CTA、視覺建議，一應俱全。
3. 直接發布 — 不需要編輯、不用調整，複製貼上即可上線。
4. 帶來真實流量 — 專業 SEO 與社群演算法優化，讓內容被更多人看到。
Each card has a decorative lucide-react icon above the title.

### Step 12: Create components/landing/PlatformOutput.tsx
Section title: "一個引擎，多平台輸出"
Subtitle: "同一個核心想法，在不同平台發揮最大影響力"
4-column grid of platform cards:
1. Instagram 輪播 — FaInstagram icon, left border accent nxr-ig (#e1306c)
2. SEO 文章 — SiGoogle icon, left border accent nxr-seo (#10b981)
3. Threads 貼文 — SiThreads icon, left border accent nxr-threads (#8b5cf6)
4. Facebook 內容 — FaFacebookF icon, left border accent nxr-fb (#3b82f6)
Each card: platform icon, name, short description, "了解更多 →" link. bg-nxr-card, hover:bg-nxr-card-hover transition.

### Step 13: Create components/landing/CTAFooter.tsx
Centered text block on a gradient background panel (subtle orange-to-purple gradient at low opacity).
Headline: "準備好把想法變成流量了嗎？"
Subtitle: "加入數千個專業團隊，讓 Neoxra 成為你的內容交響樂團。"
Orange CTA button: 免費開始使用 (with hover glow shadow-glow-orange)
Trust line: ✓ 無需信用卡 · 3 分鐘設定完成

### Step 14: Create components/landing/Footer.tsx
Simple footer: "Neoxra © 2026 · Meridian Global LLC"
Optional links row. text-nxr-text-muted, border-t border-nxr-border.

### Step 15: Replace app/page.tsx
- 'use client' directive
- Import useLanguage from '../components/LanguageProvider'
- Import all landing/ components
- Define the LocalizedCopy type to cover all sections
- Define COPY: Record<'en' | 'zh-TW', LocalizedCopy> with COMPLETE content in both languages
  - zh-TW content matches the target design exactly
  - en content is a professional English translation
- In the component: const { language } = useLanguage(); const t = COPY[language]
- Render: <main className="bg-nxr-bg min-h-screen"> with all sections in order
- Pass relevant copy sections as props to each component

## Critical constraints
- TypeScript strict mode — no `any` types
- Dark mode ONLY — background #0a0a14, no light mode toggle
- ZERO external images — all visual elements are CSS/SVG/code
- Hero mockup cards are styled <div> elements, NOT <img> tags
- Preserve the existing useLanguage() hook and LanguageProvider (do not modify)
- Do NOT modify GlobalNav.tsx, LanguageProvider.tsx, or any route other than /
- All text bilingual via COPY pattern (zh-TW primary, en secondary)
- Responsive: desktop (>1024px full layout), tablet (768-1024px 2-col), mobile (<768px single-col)
- npm run build must pass with zero errors and zero warnings
- Import platform icons from react-icons: FaInstagram, FaFacebookF from 'react-icons/fa', SiThreads, SiGoogle from 'react-icons/si'
- Import UI icons from lucide-react: Zap, Clock, TrendingUp, Users, Target, Package, CheckCircle, Rocket, BarChart3, ArrowRight
```

---

## Part 5: Execution Order

1. **You (now):** Copy the Codex Prompt (Part 4) into Codex
2. **Codex:** Implements all files, installs deps
3. **You:** Run `cd frontend && npm run build` to verify
4. **You:** Run `npm run dev` and visually compare to target design PNG
5. **Claude Code (if needed):** Paste the Claude Code Prompt (Part 3) for refinements — spacing tweaks, animation polish, visual matching
6. **You:** Open PR from `feat/landing-page-redesign` branch
