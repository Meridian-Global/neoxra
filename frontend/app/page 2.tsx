'use client'

import Link from 'next/link'
import { GlobalNav } from '../components/GlobalNav'
import { useLanguage } from '../components/LanguageProvider'

type LocalizedCopy = {
  nav: {
    brand: string
    products: string
    useCases: string
    instagramStudio: string
    threadsStudio: string
    lawFirms: string
  }
  hero: {
    badge: string
    titlePrefix: string
    titleHighlight: string
    tagline: string
    body: string
    primaryCta: {
      label: string
      href: string
    }
    secondaryCta: {
      label: string
      href: string
    }
    trustSignals: string[]
    mockup: {
      instagramTitle: string
      instagramBody: string
      seoTitle: string
      seoSubtitle: string
      threadsBody: string
      facebookHeadline: string
      facebookButton: string
    }
  }
  stats: Array<{
    icon: string
    number: string
    label: string
  }>
  problem: string
  showcase: {
    instagramTitle: string
    instagramLabel: string
    instagramCaption: string
    instagramSlides: Array<{
      title: string
      body: string
    }>
    articleTitle: string
    articleLabel: string
    articleSeoTitle: string
    articleOutline: string[]
    articleParagraph: string
    generatedNote: string
  }
  howItWorks: {
    title: string
    subtitle: string
    steps: Array<{
      icon: string
      title: string
      description: string
    }>
  }
  differentiation: {
    title: string
    cards: Array<{
      icon: string
      title: string
      body: string
    }>
  }
  platformGrid: {
    title: string
    subtitle: string
    cards: Array<{
      name: string
      icon: string
      brand: 'instagram' | 'seo' | 'threads' | 'facebook'
      description: string
      cta: string
      href?: string
      soon?: boolean
    }>
  }
  useCases: {
    title: string
    cards: Array<{
      title: string
      description: string
      href?: string
      soon?: boolean
    }>
  }
  chatgpt: {
    title: string
    lead: string
    body: string
  }
  finalCta: {
    title: string
    subtitle: string
    primary: string
    secondary: string
    trust: string
  }
  brandNote: string
  footer: string
}

const COPY: Record<'en' | 'zh-TW', LocalizedCopy> = {
  'zh-TW': {
    nav: {
      brand: 'Neoxra',
      products: 'Products',
      useCases: 'Use Cases',
      instagramStudio: 'Instagram Studio',
      threadsStudio: 'Threads Studio',
      lawFirms: '法律事務所',
    },
    hero: {
      badge: '✦ AI 內容交響樂團',
      titlePrefix: '把想法變成',
      titleHighlight: '流量',
      tagline: '一個想法，四個平台，直接發布。',
      body:
        'Neoxra 將一個想法轉化為 Instagram 輪播、SEO 文章、Threads 貼文與 Facebook 內容，結構完整、格式就緒、可直接上線。',
      primaryCta: { label: '免費開始使用', href: '/instagram' },
      secondaryCta: { label: '預約 Demo', href: '/demo/legal' },
      trustSignals: ['無需信用卡', '3 分鐘快速開始', '支援繁中'],
      mockup: {
        instagramTitle: '車禍後別急著和解',
        instagramBody: '先做對 3 件事，才能保障自己的權益',
        seoTitle: '車禍理賠完整指南',
        seoSubtitle: '流程、時間與常見索賠類型',
        threadsBody: '一個主題，可以同時變成輪播、文章與社群貼文。',
        facebookHeadline: '讓內容不只是發布，而是帶來下一次詢問。',
        facebookButton: '了解更多',
      },
    },
    stats: [
      { icon: '⚡', number: '4 平台內容', label: '一次生成' },
      { icon: '🕐', number: '節省 80% 時間', label: '從構想到發布' },
      { icon: '📈', number: '提升 300% 效率', label: '內容產出速度' },
      { icon: '👥', number: '專業團隊信賴', label: '真實團隊使用中' },
    ],
    problem: '每個品牌都需要在 5 個平台上做內容。但沒有團隊能跟得上。',
    showcase: {
      instagramTitle: 'Instagram Output',
      instagramLabel: '從「車禍理賠流程」這個主題，自動產出的 IG 內容',
      instagramCaption:
        '車禍後別急著簽和解書。先報警、拍照、就醫，再把醫療收據、請假紀錄與修車估價整理完整，後續理賠與求償才不會陷入被動。',
      instagramSlides: [
        {
          title: '車禍後別急和解',
          body: '先把證據留完整，比先拿到一個不清楚的金額更重要。',
        },
        {
          title: '第一步先做對',
          body: '報警、拍照、就醫，三個動作決定後面理賠與求償的基礎。',
        },
        {
          title: '時效不要拖',
          body: '涉及告訴與民事請求時，時間一過，很多主張都會變得被動。',
        },
        {
          title: '項目要算完整',
          body: '醫療費、工作損失、精神慰撫金，往往不是一句保險會處理就結束。',
        },
      ],
      articleTitle: 'Article Output',
      articleLabel: '同一個主題，同時產出的 SEO 文章',
      articleSeoTitle: '車禍理賠怎麼算？完整流程、金額計算、注意事項一次搞懂',
      articleOutline: [
        '車禍發生後第一時間該做哪些事',
        '理賠與民事求償常見的時效怎麼看',
        '醫療費、工作損失、慰撫金如何整理',
      ],
      articleParagraph:
        '真正影響車禍理賠結果的，通常不是保險有沒有理賠，而是你是否在一開始就把證據、時效與損害資料整理完整。只要處理順序正確，後續談判與求償空間就會清楚很多。',
      generatedNote: '以上內容由 Neoxra 自動產出，未經人工修改',
    },
    howItWorks: {
      title: '怎麼開始',
      subtitle: '你是指揮，AI 代理人是專精樂手。你給方向，他們同步執行。',
      steps: [
        {
          icon: '🎯',
          title: '輸入你的主題和目標平台',
          description: '從一個題目開始，定義你想發布的平台與內容目標。',
        },
        {
          icon: '🤖',
          title: 'AI 產出有結構的內容資產',
          description: '一次整理出 carousel、caption、文章大綱與 hashtags。',
        },
        {
          icon: '📦',
          title: '你審稿、微調、發布',
          description: '保留品牌判斷與專業語氣，把最後一哩路留給你掌握。',
        },
      ],
    },
    differentiation: {
      title: '不只是生成內容，而是創造流量',
      cards: [
        {
          icon: '✓',
          title: '精準平台適配',
          body: '每個平台都有專屬格式與內容策略，最大化觸及與互動。',
        },
        {
          icon: '▱',
          title: '結構完整',
          body: '標題、內文、標籤、CTA、視覺建議，一應俱全。',
        },
        {
          icon: '↗',
          title: '直接發布',
          body: '不需要編輯，不用調整。複製貼上即可上線。',
        },
        {
          icon: '↟',
          title: '帶來真實流量',
          body: '專業 SEO 與社群演算法優化，讓內容被更多人看到。',
        },
      ],
    },
    platformGrid: {
      title: '一個引擎，多個平台',
      subtitle: '同一個核心想法，在不同平台發揮最大影響力。',
      cards: [
        {
          name: 'Instagram',
          icon: '◎',
          brand: 'instagram',
          description: 'carousel + caption + hooks + hashtags',
          cta: '開始使用 →',
          href: '/instagram',
        },
        {
          name: 'SEO',
          icon: '⌕',
          brand: 'seo',
          description: 'SEO 標題 + 大綱 + 全文',
          cta: '開始使用 →',
          href: '/seo',
        },
        {
          name: 'Threads',
          icon: '@',
          brand: 'threads',
          description: '快速對話式內容',
          cta: '開始使用 →',
          href: '/threads',
        },
        {
          name: 'Facebook',
          icon: 'f',
          brand: 'facebook',
          description: '討論型長文 + 分享鉤子',
          cta: '開始使用 →',
          href: '/facebook',
        },
      ],
    },
    useCases: {
      title: '不同產業，同一個系統',
      cards: [
        {
          title: '法律事務所',
          description: '把法律知識變成能被看見、被搜尋、被詢問的內容資產。',
          href: '/demo/legal',
        },
        {
          title: '內容代理商',
          description: '用白標流程同時服務多個客戶，快速產出跨平台內容包。',
          soon: true,
        },
        {
          title: '自媒體創作者',
          description: '把一個主題延展成多平台可發布的內容包。',
          soon: true,
        },
      ],
    },
    chatgpt: {
      title: '為什麼不直接用 ChatGPT？',
      lead: 'ChatGPT 給你文字。Neoxra 給你一整套內容包。',
      body:
        '每個輸出都符合平台格式：Instagram 有輪播結構，SEO 文章有標題層級與 meta description，Threads 貼文會控制長度。更重要的是，每個平台都會保持一致的品牌語氣。',
    },
    finalCta: {
      title: '準備好把想法變成流量了嗎？',
      subtitle: '讓 Neoxra 成為你的內容交響樂團，把一個主題整理成可發布的跨平台內容包。',
      primary: '一次產出四平台',
      secondary: '或預約 Demo 了解更多',
      trust: '✓ 無需信用卡 · 3 分鐘設定完成',
    },
    brandNote: 'Neo（新）+ Orchestra（交響樂團）。你指揮，AI 演奏，流量隨之而來。',
    footer: 'Neoxra © 2026 · Meridian Global LLC',
  },
  en: {
    nav: {
      brand: 'Neoxra',
      products: 'Products',
      useCases: 'Use Cases',
      instagramStudio: 'Instagram Studio',
      threadsStudio: 'Threads Studio',
      lawFirms: 'Law Firms',
    },
    hero: {
      badge: '✦ AI Content Orchestra',
      titlePrefix: 'Turn Ideas Into',
      titleHighlight: 'Traffic',
      tagline: 'One idea. Four platforms. Ready to publish.',
      body:
        'Neoxra turns a single idea into Instagram carousels, SEO articles, Threads posts, and Facebook content, structured, formatted, and built to perform.',
      primaryCta: { label: 'Start free', href: '/instagram' },
      secondaryCta: { label: 'Book a demo', href: '/demo/legal' },
      trustSignals: ['No credit card', 'Start in 3 minutes', 'Built for zh-TW'],
      mockup: {
        instagramTitle: 'Do Not Settle Too Fast',
        instagramBody: 'Start with 3 steps to protect your options.',
        seoTitle: 'Car Accident Claims Guide',
        seoSubtitle: 'Process, timing, and common compensation types',
        threadsBody: 'One topic can become carousels, articles, and social posts.',
        facebookHeadline: 'Make content drive the next real conversation.',
        facebookButton: 'Learn More',
      },
    },
    stats: [
      { icon: '⚡', number: '4 platform outputs', label: 'Generated at once' },
      { icon: '🕐', number: 'Save 80% time', label: 'From idea to publish' },
      { icon: '📈', number: '300% faster', label: 'Content production speed' },
      { icon: '👥', number: 'Trusted by teams', label: 'Used by professional services' },
    ],
    problem: 'Every brand needs content across five platforms. Almost no team can keep up.',
    showcase: {
      instagramTitle: 'Instagram Output',
      instagramLabel: 'Generated automatically from the topic “Car Accident Compensation Process”',
      instagramCaption:
        'After a car accident, do not rush into signing a settlement. Start with the right evidence, medical records, and timeline so later compensation conversations do not start from a weak position.',
      instagramSlides: [
        {
          title: 'Do Not Rush Settlement',
          body: 'Preserve the evidence first. A quick number is not always the right number.',
        },
        {
          title: 'Start With The Basics',
          body: 'Call the police, take photos, and get medical care before negotiating.',
        },
        {
          title: 'Watch The Timeline',
          body: 'Legal deadlines can change your leverage if you wait too long.',
        },
        {
          title: 'Count Every Loss',
          body: 'Medical bills, lost work, and pain damages should be organized clearly.',
        },
      ],
      articleTitle: 'Article Output',
      articleLabel: 'The same topic, turned into an SEO article at the same time',
      articleSeoTitle:
        'How Is Car Accident Compensation Calculated? Process, Timing, and Key Things to Watch',
      articleOutline: [
        'What to do immediately after a car accident',
        'How compensation and civil claim timelines work',
        'How to organize medical bills, lost income, and damages',
      ],
      articleParagraph:
        'The outcome of a compensation claim is usually decided by evidence, timing, and documentation. When those foundations are in place, the later legal and insurance conversations become much clearer.',
      generatedNote: 'The content above was generated by Neoxra without manual editing.',
    },
    howItWorks: {
      title: 'How It Works',
      subtitle: "You're the conductor. AI agents are specialist musicians. You give direction; they execute in sync.",
      steps: [
        {
          icon: '🎯',
          title: 'Enter your topic and target platform',
          description: 'Start with a single idea and choose where the content needs to go.',
        },
        {
          icon: '🤖',
          title: 'AI builds structured content assets',
          description: 'Generate carousel slides, caption, article outline, and hashtags in one pass.',
        },
        {
          icon: '📦',
          title: 'Review, refine, and publish',
          description: 'Keep the final judgment, voice, and edits in your hands.',
        },
      ],
    },
    differentiation: {
      title: 'Not Just Content Generation. Traffic Creation.',
      cards: [
        {
          icon: '✓',
          title: 'Platform-native fit',
          body: 'Every platform gets its own format and content strategy to maximize reach and interaction.',
        },
        {
          icon: '▱',
          title: 'Complete structure',
          body: 'Headlines, body copy, tags, CTAs, and visual direction are packaged together.',
        },
        {
          icon: '↗',
          title: 'Ready to publish',
          body: 'Less rewriting, less formatting. Copy, paste, and ship.',
        },
        {
          icon: '↟',
          title: 'Built for traffic',
          body: 'SEO and social optimization help the content get discovered by more people.',
        },
      ],
    },
    platformGrid: {
      title: 'One Engine, Multiple Platforms',
      subtitle: 'Same core idea, maximum impact on every platform.',
      cards: [
        {
          name: 'Instagram',
          icon: '◎',
          brand: 'instagram',
          description: 'carousel + caption + hooks + hashtags',
          cta: 'Start now →',
          href: '/instagram',
        },
        {
          name: 'SEO',
          icon: '⌕',
          brand: 'seo',
          description: 'SEO title + outline + full article',
          cta: 'Start now →',
          href: '/seo',
        },
        {
          name: 'Threads',
          icon: '@',
          brand: 'threads',
          description: 'Fast conversational content',
          cta: 'Start now →',
          href: '/threads',
        },
        {
          name: 'Facebook',
          icon: 'f',
          brand: 'facebook',
          description: 'Discussion-led long-form posts',
          cta: 'Start now →',
          href: '/facebook',
        },
      ],
    },
    useCases: {
      title: 'Different Verticals, Same System',
      cards: [
        {
          title: 'Law Firms',
          description: 'Turn legal expertise into content people can discover, trust, and act on.',
          href: '/demo/legal',
        },
        {
          title: 'Content Agencies',
          description: 'Run white-label multi-client content packages without rebuilding the workflow each time.',
          soon: true,
        },
        {
          title: 'Creators',
          description: 'Turn one topic into a multi-platform publishing pack.',
          soon: true,
        },
      ],
    },
    chatgpt: {
      title: 'Why Not Just Use ChatGPT?',
      lead: 'ChatGPT gives you text. Neoxra gives you a content package.',
      body:
        'Each output is platform-native: Instagram has carousel slides with visual structure, SEO articles have heading hierarchy and meta descriptions, and Threads posts respect length constraints. Every output matches your brand voice consistently across platforms.',
    },
    finalCta: {
      title: 'Ready to Turn Ideas Into Traffic?',
      subtitle: 'Let Neoxra become your content orchestra and package one topic into publishable content across platforms.',
      primary: 'Generate All Platforms',
      secondary: 'Or book a demo to learn more',
      trust: '✓ No credit card · Setup in 3 minutes',
    },
    brandNote: 'Neo (new) + Orchestra. You conduct. AI performs. Traffic follows.',
    footer: 'Neoxra © 2026 · Meridian Global LLC',
  },
}

function PageComingSoonBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex rounded-full bg-[var(--bg-sunken)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-tertiary)]">
      {label}
    </span>
  )
}

function platformBorderStyle(brand: LocalizedCopy['platformGrid']['cards'][number]['brand']) {
  if (brand === 'instagram') return { borderLeftColor: 'transparent' }
  if (brand === 'seo') return { borderLeftColor: 'var(--platform-seo)' }
  if (brand === 'threads') return { borderLeftColor: 'var(--text-primary)' }
  return { borderLeftColor: 'var(--platform-facebook)' }
}

function HeroMockup({ copy }: { copy: LocalizedCopy['hero']['mockup'] }) {
  return (
    <div className="relative mx-auto min-h-[520px] w-full max-w-[560px]">
      <div
        className="absolute left-1/2 top-1/2 -z-10 h-[120%] w-[120%] -translate-x-1/2 -translate-y-1/2"
        style={{
          background: 'radial-gradient(circle at center, var(--accent-glow) 0%, transparent 70%)',
        }}
      />

      <div className="absolute left-[28%] top-[14%] z-20 w-[280px] rotate-[2deg] rounded-[16px] border border-[var(--border-glow)] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-lg)]">
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-[var(--accent-subtle)] px-3 py-1 text-xs font-semibold text-[var(--accent)]">
            1/5
          </span>
          <span className="text-xs font-semibold text-[var(--text-tertiary)]">Instagram</span>
        </div>
        <div className="mt-12">
          <h3 className="text-[28px] font-black leading-tight tracking-[-0.04em] text-[var(--text-primary)]">
            {copy.instagramTitle}
          </h3>
          <p className="mt-5 text-[15px] font-medium leading-7 text-[var(--text-secondary)]">
            {copy.instagramBody} <span aria-hidden="true">👇</span>
          </p>
        </div>
        <div className="mt-12 h-1.5 w-20 rounded-full bg-[var(--accent)]" />
      </div>

      <div className="absolute right-[4%] top-[4%] z-30 w-[245px] -rotate-[3deg] rounded-[16px] border border-[var(--border-glow)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow-md)]">
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">SEO Article</div>
        <h3 className="mt-3 text-lg font-black leading-snug text-[var(--text-primary)]">{copy.seoTitle}</h3>
        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{copy.seoSubtitle}</p>
        <div className="mt-4 space-y-2">
          <div className="h-2 rounded-full bg-[var(--bg-sunken)]" />
          <div className="h-2 w-4/5 rounded-full bg-[var(--bg-sunken)]" />
        </div>
      </div>

      <div className="absolute bottom-[12%] left-[2%] z-10 w-[235px] -rotate-[4deg] rounded-[16px] border border-[var(--border-glow)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow-md)]">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bg-accent)] text-xs font-bold text-[var(--text-on-accent)]">
            N
          </div>
          <span className="text-sm font-bold text-[var(--text-primary)]">Neoxra</span>
        </div>
        <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">{copy.threadsBody}</p>
        <div className="mt-4 flex gap-4 text-xs font-semibold text-[var(--text-tertiary)]">
          <span>♡ 34</span>
          <span>↻ 12</span>
        </div>
      </div>

      <div className="absolute bottom-[5%] right-[0%] z-30 w-[250px] rotate-[3deg] rounded-[16px] border border-[var(--border-glow)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow-lg)]">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-bold text-black">
            N
          </div>
          <span className="text-sm font-bold text-[var(--text-primary)]">Neoxra</span>
        </div>
        <h3 className="mt-4 text-base font-black leading-snug text-[var(--text-primary)]">{copy.facebookHeadline}</h3>
        <button
          type="button"
          className="mt-4 rounded-full bg-[var(--accent)] px-4 py-2 text-xs font-bold text-black"
        >
          {copy.facebookButton}
        </button>
        <div className="mt-4 flex gap-4 text-xs font-semibold text-[var(--text-tertiary)]">
          <span>💬 3</span>
          <span>👍 3</span>
        </div>
      </div>
    </div>
  )
}

function StatsBar({ stats }: { stats: LocalizedCopy['stats'] }) {
  return (
    <section className="border-y border-[var(--border)] bg-[var(--bg-section)] py-7 md:py-8">
      <div className="mx-auto grid max-w-[1100px] gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={`${stat.number}-${stat.label}`}
            className="flex items-center gap-4 rounded-[16px] border border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-sm)] transition-all duration-150 hover:-translate-y-0.5 hover:border-[var(--border-glow)] hover:shadow-[var(--shadow-glow)]"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-subtle)] text-2xl leading-none text-[var(--accent)]" aria-hidden="true">
              {stat.icon}
            </div>
            <div>
              <div className="text-[20px] font-bold leading-snug text-[var(--text-primary)]">
                {stat.number}
              </div>
              <div className="mt-1 text-[13px] font-medium text-[var(--text-tertiary)]">
                {stat.label}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default function HomePage() {
  const { language } = useLanguage()
  const copy = COPY[language]

  return (
    <main className="min-h-screen bg-transparent text-[var(--text-primary)]">
      <div className="mx-auto max-w-[1120px] px-6 pb-12 pt-6 sm:px-8 lg:px-10">
        <GlobalNav />

        <section
          className="relative -mx-6 overflow-hidden px-6 py-12 sm:-mx-8 sm:px-8 md:py-20 lg:-mx-10 lg:px-10"
          style={{
            background:
              'radial-gradient(ellipse at 30% 50%, rgba(245,158,11,0.04) 0%, transparent 50%)',
          }}
        >
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <div className="inline-flex rounded-full border border-[rgba(245,158,11,0.2)] bg-[var(--accent-subtle)] px-4 py-1.5 text-[13px] font-medium text-[var(--accent)]">
                {copy.hero.badge}
              </div>
              <h1 className="mt-6 max-w-3xl text-[44px] font-black leading-[1.1] tracking-[-0.03em] text-[var(--text-primary)] sm:text-[56px]">
                {copy.hero.titlePrefix}{' '}
                <span className="bg-[linear-gradient(135deg,#F59E0B,#F97316)] bg-clip-text text-transparent">
                  {copy.hero.titleHighlight}
                </span>
              </h1>
              <p className="mt-4 max-w-2xl text-[20px] font-medium leading-8 text-[var(--text-secondary)]">
                {copy.hero.tagline}
              </p>
              <p className="mt-4 max-w-2xl text-[16px] leading-[1.7] text-[var(--text-tertiary)]">
                {copy.hero.body}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={copy.hero.primaryCta.href}
                  className="inline-flex items-center justify-center rounded-[10px] bg-[var(--accent)] px-8 py-3.5 text-[15px] font-semibold text-black shadow-[0_0_20px_var(--accent-glow)] transition hover:-translate-y-0.5 hover:bg-[var(--accent-hover)] hover:shadow-[var(--shadow-md)]"
                >
                  {copy.hero.primaryCta.label}
                </Link>
                <Link
                  href={copy.hero.secondaryCta.href}
                  className="inline-flex items-center justify-center rounded-[10px] border border-[var(--border-glow)] bg-transparent px-8 py-3.5 text-[15px] font-semibold text-[var(--text-primary)] transition hover:-translate-y-0.5 hover:border-[var(--accent)] hover:text-[var(--accent)]"
                >
                  {copy.hero.secondaryCta.label}
                </Link>
              </div>
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[13px] font-medium text-[var(--text-tertiary)]">
                {copy.hero.trustSignals.map((signal) => (
                  <span key={signal} className="inline-flex items-center gap-1.5">
                    <span className="text-[var(--accent)]">✓</span>
                    {signal}
                  </span>
                ))}
              </div>
            </div>

            <HeroMockup copy={copy.hero.mockup} />
          </div>
        </section>

        <StatsBar stats={copy.stats} />

        <section className="py-16">
          <p className="mx-auto max-w-4xl text-center text-lg font-medium text-[var(--accent)]">
            {copy.problem}
          </p>
        </section>

        <section className="py-12 md:py-16">
          <div className="grid gap-6 lg:grid-cols-2">
            <article className="rounded-[16px] border border-[var(--border)] border-t-2 border-t-[var(--platform-instagram)] bg-[var(--bg-elevated)] p-6 shadow-[var(--shadow-md)]">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-bold text-[var(--text-primary)]">{copy.showcase.instagramTitle}</h2>
                <span className="rounded-full bg-[var(--bg-sunken)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)]">
                  Instagram
                </span>
              </div>
              <p className="mt-3 text-sm text-[var(--text-secondary)]">{copy.showcase.instagramLabel}</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {copy.showcase.instagramSlides.map((slide, index) => (
                  <div
                    key={slide.title}
                    className="aspect-square rounded-[var(--card-radius)] border border-[var(--carousel-border)] p-4"
                    style={{ background: index % 2 === 0 ? 'var(--carousel-1)' : 'var(--carousel-2)' }}
                  >
                    <div className="text-xs font-medium text-[var(--text-tertiary)]">{index + 1}/4</div>
                    <div className="mt-4 text-base font-bold text-[var(--text-primary)]">{slide.title}</div>
                    <p className="mt-3 line-clamp-2 text-[13px] text-[var(--text-secondary)]">{slide.body}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-[var(--card-radius)] bg-[var(--bg-sunken)] p-4">
                <div className="text-xs font-medium uppercase tracking-[0.05em] text-[var(--text-tertiary)]">
                  CAPTION
                </div>
                <p className="mt-2 text-sm text-[var(--text-primary)]">{copy.showcase.instagramCaption}</p>
              </div>
            </article>

            <article className="rounded-[16px] border border-[var(--border)] border-t-2 border-t-[var(--platform-seo)] bg-[var(--bg-elevated)] p-6 shadow-[var(--shadow-md)]">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-bold text-[var(--text-primary)]">{copy.showcase.articleTitle}</h2>
                <span className="rounded-full bg-[var(--bg-sunken)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)]">
                  Article
                </span>
              </div>
              <p className="mt-3 text-sm text-[var(--text-secondary)]">{copy.showcase.articleLabel}</p>
              <div className="mt-5 rounded-[var(--card-radius)] bg-[var(--bg-sunken)] p-5">
                <div className="text-xs font-medium uppercase tracking-[0.05em] text-[var(--text-tertiary)]">
                  SEO TITLE
                </div>
                <h3 className="mt-2 text-[18px] font-bold text-[var(--text-primary)]">
                  {copy.showcase.articleSeoTitle}
                </h3>
                <div className="mt-5 text-xs font-medium uppercase tracking-[0.05em] text-[var(--text-tertiary)]">
                  OUTLINE
                </div>
                <ul className="mt-3 space-y-3 text-sm text-[var(--text-primary)]">
                  {copy.showcase.articleOutline.map((heading) => (
                    <li key={heading} className="border-l-2 border-[var(--accent)] pl-3 text-[14px] text-[var(--text-secondary)]">
                      {heading}
                    </li>
                  ))}
                </ul>
                <div className="mt-5 text-xs font-medium uppercase tracking-[0.05em] text-[var(--text-tertiary)]">
                  OPENING PARAGRAPH
                </div>
                <p className="mt-2 text-[14px] text-[var(--text-secondary)]">{copy.showcase.articleParagraph}</p>
              </div>
            </article>
          </div>
          <p className="mt-5 text-center text-sm text-[var(--text-secondary)]">{copy.showcase.generatedNote}</p>
        </section>

        <section className="py-12 md:py-16">
          <h2 className="text-center text-[28px] font-bold tracking-[-0.02em] text-[var(--text-primary)]">
            {copy.howItWorks.title}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-[16px] leading-7 text-[var(--text-secondary)]">
            {copy.howItWorks.subtitle}
          </p>
          <div className="relative mt-10 grid gap-5 md:grid-cols-3 md:before:absolute md:before:left-[16%] md:before:right-[16%] md:before:top-8 md:before:h-0.5 md:before:border-t-2 md:before:border-dashed md:before:border-[var(--border-glow)] md:before:content-['']">
            {copy.howItWorks.steps.map((step, index) => (
              <div
                key={step.title}
                className="relative rounded-[var(--card-radius)] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 text-center shadow-[var(--shadow-sm)] transition-all duration-150 hover:-translate-y-0.5 hover:border-[var(--border-glow)] hover:shadow-[0_0_24px_var(--accent-glow)]"
              >
                <div className="relative z-10 mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--secondary-subtle)] text-[48px] shadow-[var(--shadow-sm)]">
                  <span className="absolute -left-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-black text-black">
                    {index + 1}
                  </span>
                  <span className="text-[30px]" aria-hidden="true">{step.icon}</span>
                </div>
                <h3 className="mt-5 text-xl font-bold text-[var(--text-primary)]">{step.title}</h3>
                <p className="mt-3 text-sm text-[var(--text-secondary)]">{step.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="py-10 md:py-14">
          <h2 className="text-center text-[28px] font-bold tracking-[-0.02em] text-[var(--text-primary)]">
            {copy.differentiation.title}
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {copy.differentiation.cards.map((card) => (
              <div
                key={card.title}
                className="rounded-[var(--card-radius)] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-[var(--shadow-sm)] transition-all duration-150 hover:-translate-y-0.5 hover:border-[var(--border-glow)] hover:shadow-[0_0_24px_var(--accent-glow)]"
              >
                <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-[var(--secondary-subtle)] text-[40px] font-black text-[var(--secondary)]">
                  <span className="absolute inset-0 rounded-full bg-[var(--secondary-subtle)] blur-md" />
                  <span className="relative text-2xl" aria-hidden="true">{card.icon}</span>
                </div>
                <h3 className="mt-5 text-lg font-bold text-[var(--text-primary)]">{card.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{card.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="py-10 md:py-14">
          <div className="mx-auto max-w-3xl rounded-[24px] border border-[rgba(245,158,11,0.2)] bg-[var(--gradient-card)] p-8 text-center shadow-[var(--shadow-md)] md:p-10">
            <h2 className="text-2xl font-bold tracking-[-0.02em] text-[var(--text-primary)]">
              {copy.chatgpt.title}
            </h2>
            <p className="mt-5 text-base font-semibold leading-8 text-[var(--text-primary)]">
              {copy.chatgpt.lead}
            </p>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
              {copy.chatgpt.body}
            </p>
          </div>
        </section>

        <section className="py-12 md:py-16">
          <h2 className="text-[28px] font-bold tracking-[-0.02em] text-[var(--text-primary)]">
            {copy.platformGrid.title}
          </h2>
          <p className="mt-3 max-w-2xl text-[16px] leading-7 text-[var(--text-secondary)]">
            {copy.platformGrid.subtitle}
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {copy.platformGrid.cards.map((card) =>
              card.href ? (
                <Link
                  key={card.name}
                  href={card.href}
                  className={[
                    'relative overflow-hidden rounded-[var(--card-radius)] border border-[var(--border)] border-l-4 bg-[var(--bg-elevated)] p-6 shadow-[var(--shadow-sm)] transition-all duration-150 hover:-translate-y-0.5 hover:border-[var(--border-glow)] hover:shadow-[0_0_24px_var(--accent-glow)]',
                    card.brand === 'instagram' ? 'before:absolute before:bottom-0 before:left-0 before:top-0 before:w-1 before:bg-[linear-gradient(180deg,#F58529,#DD2A7B,#8134AF)] before:content-[\'\']' : '',
                  ].join(' ')}
                  style={platformBorderStyle(card.brand)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span
                        className={[
                          'flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bg-sunken)] text-lg font-black',
                          card.brand === 'instagram' ? 'bg-[linear-gradient(135deg,#F58529,#DD2A7B,#8134AF)] text-white' : '',
                          card.brand === 'seo' ? 'text-[var(--platform-seo)]' : '',
                          card.brand === 'threads' ? 'text-[var(--text-primary)]' : '',
                          card.brand === 'facebook' ? 'text-[var(--platform-facebook)]' : '',
                        ].join(' ')}
                        aria-hidden="true"
                      >
                        {card.icon}
                      </span>
                      <h3 className="text-xl font-bold text-[var(--text-primary)]">{card.name}</h3>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-[var(--text-secondary)]">{card.description}</p>
                  <div className="mt-6 text-sm font-medium text-[var(--accent)]">{card.cta}</div>
                </Link>
              ) : (
                <div
                  key={card.name}
                  className="rounded-[var(--card-radius)] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-[var(--shadow-sm)]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bg-sunken)] text-lg font-black text-[var(--text-tertiary)]" aria-hidden="true">
                        {card.icon}
                      </span>
                      <h3 className="text-xl font-bold text-[var(--text-primary)]">{card.name}</h3>
                    </div>
                    {card.soon ? <PageComingSoonBadge label={language === 'zh-TW' ? '即將推出' : 'Coming soon'} /> : null}
                  </div>
                  <p className="mt-3 text-sm text-[var(--text-secondary)]">{card.description}</p>
                  <div className="mt-6 text-sm font-medium text-[var(--text-secondary)]">{card.cta}</div>
                </div>
              ),
            )}
          </div>
        </section>

        <section className="py-12 md:py-16">
          <h2 className="text-[28px] font-bold tracking-[-0.02em] text-[var(--text-primary)]">
            {copy.useCases.title}
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {copy.useCases.cards.map((card) =>
              card.href ? (
                <Link
                  key={card.title}
                  href={card.href}
                  className="rounded-[var(--card-radius)] border border-[var(--border)] border-l-4 border-l-[var(--accent-subtle)] bg-[var(--bg-sunken)] p-5 shadow-[var(--shadow-sm)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-xl font-bold text-[var(--text-primary)]">{card.title}</h3>
                  </div>
                  <p className="mt-3 text-sm text-[var(--text-secondary)]">{card.description}</p>
                </Link>
              ) : (
                <div
                  key={card.title}
                  className="rounded-[var(--card-radius)] border border-[var(--border)] border-l-4 border-l-[var(--accent-subtle)] bg-[var(--bg-sunken)] p-5 shadow-[var(--shadow-sm)]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-xl font-bold text-[var(--text-primary)]">{card.title}</h3>
                    {card.soon ? <PageComingSoonBadge label={language === 'zh-TW' ? '即將推出' : 'Coming soon'} /> : null}
                  </div>
                  <p className="mt-3 text-sm text-[var(--text-secondary)]">{card.description}</p>
                </div>
              ),
            )}
          </div>
        </section>

        <section className="py-12 md:py-16">
          <div className="relative mx-auto max-w-[900px] px-0">
          <div className="homepage-cta relative overflow-hidden rounded-[28px] px-6 py-12 text-center shadow-[var(--shadow-glow)] sm:px-10 md:p-12">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.16)_0%,transparent_62%)]" />
            <div className="relative mx-auto max-w-3xl">
            <h2 className="text-[32px] font-bold tracking-[-0.02em]">
              {copy.finalCta.title}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-[16px] leading-7 text-white/80">
              {copy.finalCta.subtitle}
            </p>
            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/generate"
                className="homepage-cta-button inline-flex items-center justify-center rounded-[10px] px-6 py-3 text-[15px] font-semibold shadow-[0_0_20px_var(--accent-glow)] transition-all duration-150 hover:-translate-y-0.5"
              >
                {copy.finalCta.primary}
              </Link>
              <Link
                href="mailto:support@neoxra.com?subject=Neoxra%20Demo"
                className="homepage-cta-link text-sm font-medium underline underline-offset-4 transition"
              >
                {copy.finalCta.secondary}
              </Link>
            </div>
            <p className="mt-4 text-[13px] font-medium text-white/70">{copy.finalCta.trust}</p>
            </div>
          </div>
          </div>
        </section>

        <footer className="border-t border-[var(--border)] py-8 text-center text-sm text-[var(--text-secondary)]">
          <p>{copy.brandNote}</p>
          <p className="mt-2">{copy.footer}</p>
        </footer>
      </div>
      <style jsx global>{`
        .homepage-cta {
          background: var(--gradient-cta-bg);
          color: #ffffff;
        }

        .homepage-cta h2 {
          color: inherit;
        }

        .homepage-cta-button {
          background: #ffffff;
          color: #b45309;
        }

        .homepage-cta-button:hover {
          background: #fffbeb;
        }

        .homepage-cta-link {
          color: rgba(255, 255, 255, 0.78);
        }

        .homepage-cta-link:hover {
          color: #ffffff;
        }
      `}</style>
    </main>
  )
}
