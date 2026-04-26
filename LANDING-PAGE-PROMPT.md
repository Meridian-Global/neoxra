# Landing Page Repositioning — Claude Code Prompt

把以下整段貼進 VS Code Claude Code CLI 執行。

---

```
You are rewriting the Neoxra landing page to reposition the company from "AI content generation tool" to "AI-powered traffic infrastructure."

## Repo: neoxra (frontend/)
## Branch: feat/landing-page-v2

## CONTEXT — WHY THIS MATTERS

The current landing page makes Neoxra look like another AI content tool (Canva, Jasper, ChatGPT wrappers). 
It says "4 platforms", shows fake stats ("10,000+ users", "300% efficiency"), lists Instagram/SEO/Threads/Facebook 
as features, and uses a "Content Orchestra" metaphor. This kills fundraising conversations.

The new positioning: Neoxra = AI → Traffic. We are building traffic infrastructure, not a content generator.
Think Stripe (payments infra), Vercel (frontend infra) — category-defining, not feature-listing.

## CURRENT STATE

- `frontend/app/page.tsx` — imports 7 landing components: Navbar, HeroSection, StatsBar, HowItWorks, 
  Features, PlatformOutput, CTAFooter, Footer
- `frontend/components/landing/` — 16 component files (Navbar.tsx, HeroSection.tsx, StatsBar.tsx, etc.)
- `frontend/app/globals.css` — full design token system with CSS variables (--bg, --text-primary, 
  --accent, --gradient-cta, --border, etc.) + dark/light theme support
- `frontend/app/layout.tsx` — has metadata title "Multi-agent content system"
- `frontend/components/landing/NeoxraLogo.tsx` — default export (SVG logo)
- `frontend/components/landing/ThemeToggle.tsx` — named export { ThemeToggle }
- `frontend/components/LanguageProvider.tsx` — provides { language, setLanguage } where language is 'zh-TW' | 'en'

## ALL CHANGES TO MAKE

### 1. Rewrite `frontend/app/page.tsx` entirely

Replace the ENTIRE file with this exact content:

```tsx
'use client'

import Link from 'next/link'
import { useLanguage } from '../components/LanguageProvider'
import NeoxraLogo from '../components/landing/NeoxraLogo'
import { ThemeToggle } from '../components/landing/ThemeToggle'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Language = 'en' | 'zh-TW'

interface NavCopy { login: string; cta: string }
interface HeroCopy { headline: string[]; sub: string; cta: string; ctaSecondary: string }
interface SectionCopy { label: string; headline: string; body: string }
interface PointsCopy { label: string; headline: string; points: string[][] }
interface StepsCopy { label: string; headline: string; steps: string[][] }
interface AxesCopy { label: string; headline: string; sub: string; axes: string[][] }
interface CasesCopy { label: string; headline: string; cases: string[][] }
interface ItemsCopy { label: string; headline: string; items: string[][] }
interface VisionCopy { headline: string; body: string; sub: string }
interface FooterCopy { text: string }

interface PageCopy {
  nav: NavCopy; hero: HeroCopy; problem: SectionCopy; solution: PointsCopy
  system: StepsCopy; expansion: AxesCopy; useCases: CasesCopy
  surfaces: ItemsCopy; vision: VisionCopy; footer: FooterCopy
}

// ---------------------------------------------------------------------------
// Bilingual copy
// ---------------------------------------------------------------------------

const COPY: Record<Language, PageCopy> = {
  'zh-TW': {
    nav: {
      login: '登入',
      cta: '開始使用',
    },
    hero: {
      headline: ['AI 不只生成內容', '而是製造流量'],
      sub: '一個想法進來，一整套流量系統出去。Neoxra 是 AI 驅動的流量基礎設施。',
      cta: '開始使用',
      ctaSecondary: '預約 Demo',
    },
    problem: {
      label: '問題',
      headline: '內容已經被解決了。流量還沒有。',
      body: '每個人都能用 AI 寫文案、做圖片。但把內容變成持續的曝光、觸及、轉換——這件事沒有人做好。問題不是產出，是分發。',
    },
    solution: {
      label: '解法',
      headline: 'Neoxra 不做內容生成，做流量編排。',
      points: [
        ['協調式分發', '不是產出一篇文章，而是同步建構一整套分發系統——短影音、長文、社群討論、轉換頁面，各自為不同目標服務。'],
        ['策略先行', '每一份輸出都帶有結構：標題、CTA、SEO 信號、平台原生格式。不是「看起來不錯」，是「設計來帶流量」。'],
        ['可重複的系統', '不是一次性的靈感。是一套可以反覆執行、持續放大的流量生成機制。'],
      ],
    },
    system: {
      label: '系統',
      headline: '從想法到流量的完整路徑',
      steps: [
        ['輸入', '一個想法、一個主題、一個你想觸及的市場。'],
        ['策略層', 'AI 拆解想法，規劃每個分發表面的角度、格式與目標。'],
        ['平行代理', '多個專精 agent 同步運作，各自產出平台原生內容。'],
        ['精修輸出', '交叉校驗、品牌聲音一致性、可直接發布的成品。'],
      ],
    },
    expansion: {
      label: '擴張',
      headline: '每一個新表面，就是一個新市場。',
      sub: '這不是「支援四個平台」。這是無限擴張的基礎設施。',
      axes: [
        ['平台 = 分發表面', 'Instagram、YouTube、小紅書、LinkedIn——每接入一個，就多一條流量管線。'],
        ['語言 = 規模化槓桿', '同一套策略，從繁體中文延伸到英文、日文、西班牙文。每一種語言都是一個新市場。'],
        ['地區 = 成長倍數', '美國 → 亞洲 → 全球。相同引擎，不同地區，不同觸及。'],
      ],
    },
    useCases: {
      label: '誰在使用',
      headline: '不是給「想做內容」的人。是給想要流量的人。',
      cases: [
        ['創作者', '不再每天想破頭。一個主題自動展開成完整的分發包，每個平台都是原生格式。'],
        ['企業', '行銷團隊不用再手動搬運內容到不同平台。一次輸入，系統負責分發。'],
        ['專業服務', '律師事務所、醫療機構、顧問公司——用專業內容持續觸及潛在客戶，建立信任。'],
      ],
    },
    surfaces: {
      label: '輸出',
      headline: '不是平台，是分發表面。',
      items: [
        ['短內容', '為滑動而設計——視覺優先、引人停留、促進互動。'],
        ['長內容', '為搜尋而結構化——能被發現、能被閱讀、能轉換。'],
        ['討論', '為對話而寫——觀點鮮明、引發回應、擴大觸及。'],
        ['轉換', '為行動而設計——信任導向、CTA 清晰、推動決策。'],
      ],
    },
    vision: {
      headline: '流量基礎設施',
      body: 'Stripe 讓每家公司都能收款。Vercel 讓每個團隊都能部署。Neoxra 讓每個想法都能變成流量。',
      sub: '我們正在建造 AI 時代的流量層。',
    },
    footer: {
      text: 'Neoxra © 2026 · Meridian Global LLC',
    },
  },
  en: {
    nav: {
      login: 'Login',
      cta: 'Get Started',
    },
    hero: {
      headline: ['AI doesn\'t just generate content.', 'It generates traffic.'],
      sub: 'One idea in, an entire traffic system out. Neoxra is AI-powered traffic infrastructure.',
      cta: 'Get Started',
      ctaSecondary: 'Book a Demo',
    },
    problem: {
      label: 'Problem',
      headline: 'Content is solved. Traffic is not.',
      body: 'Everyone can generate copy and images with AI. But turning content into consistent reach, discovery, and conversion — no one has solved that. The problem isn\'t production. It\'s distribution.',
    },
    solution: {
      label: 'Solution',
      headline: 'Neoxra doesn\'t generate content. It orchestrates traffic.',
      points: [
        ['Coordinated distribution', 'Not one article — an entire distribution system running in parallel. Short-form, long-form, discussion, conversion. Each serves a different goal.'],
        ['Strategy-first output', 'Every piece of output carries structure: headlines, CTAs, SEO signals, platform-native formatting. Not "looks good" — designed to drive traffic.'],
        ['Repeatable system', 'Not a one-time spark. A mechanism you can run again and again, compounding reach over time.'],
      ],
    },
    system: {
      label: 'System',
      headline: 'The full path from idea to traffic',
      steps: [
        ['Input', 'One idea, one topic, one market you want to reach.'],
        ['Strategy layer', 'AI decomposes the idea. Plans the angle, format, and goal for each distribution surface.'],
        ['Parallel agents', 'Multiple specialized agents run simultaneously. Each produces platform-native output.'],
        ['Refined output', 'Cross-validated. Brand-voice consistent. Ready to publish.'],
      ],
    },
    expansion: {
      label: 'Expansion',
      headline: 'Every new surface is a new market.',
      sub: 'This isn\'t "supports 4 platforms." This is infrastructure for infinite expansion.',
      axes: [
        ['Platforms = distribution surfaces', 'Instagram, YouTube, Red Note, LinkedIn — each new integration is another traffic pipeline.'],
        ['Languages = scaling leverage', 'Same strategy, from English to Mandarin to Japanese to Spanish. Every language is a new market.'],
        ['Regions = growth multipliers', 'US → Asia → Global. Same engine, different regions, different reach.'],
      ],
    },
    useCases: {
      label: 'Who uses this',
      headline: 'Not for people who want content. For people who want traffic.',
      cases: [
        ['Creators', 'Stop guessing what to post. One topic becomes a full distribution package — every platform, native format.'],
        ['Businesses', 'Marketing teams stop manually adapting content across channels. One input, the system handles distribution.'],
        ['Service providers', 'Law firms, clinics, consultancies — use expert content to consistently reach potential clients and build trust.'],
      ],
    },
    surfaces: {
      label: 'Output',
      headline: 'Not platforms. Distribution surfaces.',
      items: [
        ['Short-form', 'Designed for the scroll — visual-first, attention-holding, engagement-driving.'],
        ['Long-form', 'Structured for search — discoverable, readable, conversion-ready.'],
        ['Discussion', 'Written for conversation — opinionated, reply-provoking, reach-expanding.'],
        ['Conversion', 'Built for action — trust-oriented, clear CTAs, decision-driving.'],
      ],
    },
    vision: {
      headline: 'Traffic infrastructure.',
      body: 'Stripe let every company accept payments. Vercel let every team deploy. Neoxra lets every idea become traffic.',
      sub: 'We\'re building the traffic layer for the AI era.',
    },
    footer: {
      text: 'Neoxra © 2026 · Meridian Global LLC',
    },
  },
}

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

function Nav({ copy }: { copy: NavCopy }) {
  const { language, setLanguage } = useLanguage()
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[var(--container-max)] items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <NeoxraLogo size={28} />
          <span className="text-[15px] font-bold tracking-tight text-[var(--text-primary)]">Neoxra</span>
        </Link>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setLanguage(language === 'zh-TW' ? 'en' : 'zh-TW')}
            className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-tertiary)] transition hover:border-[var(--border-bold)] hover:text-[var(--text-secondary)]"
          >
            {language === 'zh-TW' ? 'EN' : '中文'}
          </button>
          <ThemeToggle />
          <Link
            href="/login"
            className="text-sm font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
          >
            {copy.login}
          </Link>
          <Link
            href="/instagram"
            className="rounded-lg bg-[image:var(--gradient-cta)] px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5"
          >
            {copy.cta}
          </Link>
        </div>
      </div>
    </header>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-4 inline-block rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
      {children}
    </span>
  )
}

function Hero({ copy }: { copy: HeroCopy }) {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto max-w-[var(--container-max)] px-6 pb-28 pt-32 text-center sm:pt-40">
        <h1 className="mx-auto max-w-3xl text-[clamp(2.25rem,5vw,4rem)] font-bold leading-[1.1] tracking-[-0.03em]">
          <span className="block text-[var(--text-primary)]">{copy.headline[0]}</span>
          <span className="bg-[image:var(--gradient-hero-text)] bg-clip-text text-transparent">{copy.headline[1]}</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-[var(--text-secondary)]">
          {copy.sub}
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link
            href="/instagram"
            className="inline-flex h-12 items-center rounded-xl bg-[image:var(--gradient-cta)] px-7 text-[15px] font-semibold text-white shadow-[var(--shadow-glow)] transition hover:-translate-y-0.5"
            style={{ animation: 'glow 1.4s ease-in-out infinite' }}
          >
            {copy.cta}
          </Link>
          <a
            href="mailto:purmonth@gmail.com"
            className="inline-flex h-12 items-center rounded-xl border border-[var(--border)] px-7 text-[15px] font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-bold)] hover:text-[var(--text-primary)]"
          >
            {copy.ctaSecondary}
          </a>
        </div>
      </div>
    </section>
  )
}

function Problem({ copy }: { copy: SectionCopy }) {
  return (
    <section className="border-t border-[var(--border)]">
      <div className="mx-auto max-w-[var(--container-max)] px-6 py-28">
        <SectionLabel>{copy.label}</SectionLabel>
        <h2 className="max-w-2xl text-[clamp(1.75rem,3.5vw,2.75rem)] font-bold leading-[1.15] tracking-[-0.02em]">
          {copy.headline}
        </h2>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[var(--text-secondary)]">
          {copy.body}
        </p>
      </div>
    </section>
  )
}

function Solution({ copy }: { copy: PointsCopy }) {
  return (
    <section className="border-t border-[var(--border)]">
      <div className="mx-auto max-w-[var(--container-max)] px-6 py-28">
        <SectionLabel>{copy.label}</SectionLabel>
        <h2 className="max-w-3xl text-[clamp(1.75rem,3.5vw,2.75rem)] font-bold leading-[1.15] tracking-[-0.02em]">
          {copy.headline}
        </h2>
        <div className="mt-14 grid gap-8 md:grid-cols-3">
          {copy.points.map(([title, desc]) => (
            <div key={title} className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-7">
              <h3 className="text-base font-semibold text-[var(--text-primary)]">{title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function System({ copy }: { copy: StepsCopy }) {
  const gradients = [
    'var(--gradient-icon-1)',
    'var(--gradient-icon-2)',
    'var(--gradient-icon-3)',
    'var(--gradient-icon-4)',
  ]
  return (
    <section className="border-t border-[var(--border)]">
      <div className="mx-auto max-w-[var(--container-max)] px-6 py-28">
        <SectionLabel>{copy.label}</SectionLabel>
        <h2 className="max-w-2xl text-[clamp(1.75rem,3.5vw,2.75rem)] font-bold leading-[1.15] tracking-[-0.02em]">
          {copy.headline}
        </h2>
        <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--border)] md:grid-cols-4">
          {copy.steps.map(([title, desc], i) => (
            <div key={title} className="flex flex-col gap-4 bg-[var(--bg-elevated)] p-7">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold text-white"
                style={{ backgroundImage: gradients[i] }}
              >
                {i + 1}
              </div>
              <h3 className="text-base font-semibold text-[var(--text-primary)]">{title}</h3>
              <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Expansion({ copy }: { copy: AxesCopy }) {
  return (
    <section className="border-t border-[var(--border)]">
      <div className="mx-auto max-w-[var(--container-max)] px-6 py-28">
        <SectionLabel>{copy.label}</SectionLabel>
        <h2 className="max-w-3xl text-[clamp(1.75rem,3.5vw,2.75rem)] font-bold leading-[1.15] tracking-[-0.02em]">
          {copy.headline}
        </h2>
        <p className="mt-4 max-w-2xl text-lg text-[var(--text-secondary)]">
          {copy.sub}
        </p>
        <div className="mt-14 grid gap-8 md:grid-cols-3">
          {copy.axes.map(([title, desc]) => (
            <div key={title} className="relative rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-7">
              <h3 className="text-base font-semibold text-[var(--text-primary)]">{title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function UseCases({ copy }: { copy: CasesCopy }) {
  return (
    <section className="border-t border-[var(--border)]">
      <div className="mx-auto max-w-[var(--container-max)] px-6 py-28">
        <SectionLabel>{copy.label}</SectionLabel>
        <h2 className="max-w-3xl text-[clamp(1.75rem,3.5vw,2.75rem)] font-bold leading-[1.15] tracking-[-0.02em]">
          {copy.headline}
        </h2>
        <div className="mt-14 grid gap-8 md:grid-cols-3">
          {copy.cases.map(([title, desc]) => (
            <div key={title} className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-7">
              <h3 className="text-base font-semibold text-[var(--text-primary)]">{title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Surfaces({ copy }: { copy: ItemsCopy }) {
  return (
    <section className="border-t border-[var(--border)]">
      <div className="mx-auto max-w-[var(--container-max)] px-6 py-28">
        <SectionLabel>{copy.label}</SectionLabel>
        <h2 className="max-w-2xl text-[clamp(1.75rem,3.5vw,2.75rem)] font-bold leading-[1.15] tracking-[-0.02em]">
          {copy.headline}
        </h2>
        <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--border)] sm:grid-cols-2 lg:grid-cols-4">
          {copy.items.map(([title, desc]) => (
            <div key={title} className="bg-[var(--bg-elevated)] p-7">
              <h3 className="text-base font-semibold text-[var(--text-primary)]">{title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Vision({ copy }: { copy: VisionCopy }) {
  return (
    <section className="border-t border-[var(--border)]">
      <div className="mx-auto max-w-[var(--container-max)] px-6 py-32 text-center">
        <h2 className="mx-auto max-w-2xl text-[clamp(2rem,4vw,3.25rem)] font-bold leading-[1.1] tracking-[-0.03em]">
          <span className="bg-[image:var(--gradient-hero-text)] bg-clip-text text-transparent">{copy.headline}</span>
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-[var(--text-secondary)]">
          {copy.body}
        </p>
        <p className="mx-auto mt-4 max-w-xl text-base font-medium text-[var(--text-primary)]">
          {copy.sub}
        </p>
      </div>
    </section>
  )
}

function PageFooter({ copy }: { copy: FooterCopy }) {
  return (
    <footer className="border-t border-[var(--border)]">
      <div className="mx-auto max-w-[var(--container-max)] px-6 py-8 text-center text-xs text-[var(--text-tertiary)]">
        {copy.text}
      </div>
    </footer>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function HomePage() {
  const { language } = useLanguage()
  const t = COPY[language]

  return (
    <main className="min-h-screen bg-[var(--bg)] font-sans">
      <Nav copy={t.nav} />
      <Hero copy={t.hero} />
      <Problem copy={t.problem} />
      <Solution copy={t.solution} />
      <System copy={t.system} />
      <Expansion copy={t.expansion} />
      <UseCases copy={t.useCases} />
      <Surfaces copy={t.surfaces} />
      <Vision copy={t.vision} />
      <PageFooter copy={t.footer} />
    </main>
  )
}
```

### 2. Update `frontend/app/layout.tsx` metadata

Change the metadata object:

From:
```
title: 'Neoxra | Multi-agent content system',
description: 'Turn one idea into platform-native content for LinkedIn, Instagram, and Threads.',
```

To:
```
title: 'Neoxra | AI-Powered Traffic Infrastructure',
description: 'Turn ideas into traffic. Neoxra is the AI-powered infrastructure layer for scalable distribution across every surface, language, and region.',
```

### 3. Do NOT delete any files in `frontend/components/landing/`

Leave the old components alone — they are still imported by other pages (like /demo/legal). 
Only `frontend/app/page.tsx` changes. The old components are dead code for the landing page 
but may be used elsewhere.

## DESIGN NOTES

- Uses ONLY existing CSS variables from globals.css (--bg, --bg-elevated, --text-primary, 
  --text-secondary, --text-tertiary, --border, --border-bold, --gradient-cta, --gradient-hero-text, 
  --gradient-icon-1/2/3/4, --shadow-glow, --container-max)
- Supports both dark and light themes (via existing data-theme toggling)
- Fully bilingual (zh-TW / en) via existing LanguageProvider
- Clean typography-first Stripe/Vercel aesthetic — no decorative orbs, no mockup cards, no animations
- The only animation is the glow pulse on the primary CTA button (already defined in globals.css)
- NeoxraLogo is a DEFAULT export (import without braces)
- ThemeToggle is a NAMED export (import with braces)

## WHAT WAS REMOVED FROM THE OLD PAGE

- StatsBar with fake metrics ("10,000+ users", "80% time saved", "300% more output", "4 Platforms")
- PlatformOutput listing Instagram/SEO/Threads/Facebook as features
- MockupCards showing 4 platform previews
- "Content Orchestra" / "AI 內容交響樂團" metaphor
- HowItWorks with "Input → AI Musicians → Content Package" steps
- Features section listing "Platform-Native Fit", "Structured Output", etc.
- CTAFooter with "Join thousands of teams" (fake social proof)
- All individual landing component imports

## WHAT WAS ADDED

1. Hero — "AI doesn't just generate content. It generates traffic." Two-line headline with gradient
2. Problem — "Content is solved. Traffic is not." Single paragraph, no fluff
3. Solution — 3 cards: Coordinated distribution, Strategy-first, Repeatable system
4. System — 4-step pipeline: Input → Strategy → Agents → Output (gap-px grid)
5. Expansion — THE key section: Platforms=surfaces, Languages=leverage, Regions=multipliers
6. Use Cases — Creators/Businesses/Service providers (not platform names)
7. Surfaces — Short-form/Long-form/Discussion/Conversion (replaces Instagram/SEO/Threads/Facebook)
8. Vision — "Traffic infrastructure." with Stripe/Vercel analogy
9. Minimal footer

## VERIFICATION

After making changes:
1. Run `npx tsc --noEmit` — must have zero errors
2. Run `npm run build` — must succeed
3. Check that /instagram, /seo, /threads, /facebook pages still work (they don't depend on page.tsx)
```
