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
    eyebrow: string
    title: string
    tagline: string
    body: string
    orchestraIntro: string
    orchestraBody: string
    result: string
    primaryCta: string
    secondaryCta: string
    ctas: Array<{
      label: string
      href: string
      primary?: boolean
    }>
  }
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
    steps: Array<{
      title: string
      description: string
    }>
  }
  chatgpt: {
    title: string
    body: string
  }
  platformGrid: {
    title: string
    cards: Array<{
      name: string
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
  finalCta: {
    title: string
    primary: string
    secondary: string
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
      eyebrow: 'Neoxra',
      title: '把想法變成流量',
      tagline: '一個想法，四個平台，直接發布。',
      body:
        'Neoxra 將一個想法轉化為 Instagram 輪播、SEO 文章、Threads 貼文與 Facebook 內容，結構完整、格式就緒、可直接上線。',
      orchestraIntro: '而這一切的背後，是你的內容交響樂團。',
      orchestraBody:
        '你是指揮，每個 AI 代理人都是專精的樂手：有人負責 Instagram，有人負責 SEO，有人負責 Threads。你給方向，他們同步執行。',
      result:
        '最後產出的是一整套跨平台內容系統，不是草稿，而是可以直接帶來流量的結果。',
      primaryCta: '一次產出四平台',
      secondaryCta: '試試 Instagram Studio',
      ctas: [
        { label: '一次產出多個平台', href: '/generate', primary: true },
        { label: 'Instagram Studio', href: '/instagram' },
        { label: 'SEO 文章', href: '/seo' },
        { label: 'Threads', href: '/threads' },
        { label: 'Facebook', href: '/facebook' },
      ],
    },
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
      steps: [
        {
          title: '輸入你的主題和目標平台',
          description: '從一個題目開始，定義你想發布的平台與內容目標。',
        },
        {
          title: 'AI 產出有結構的內容資產',
          description: '一次整理出 carousel、caption、文章大綱與 hashtags。',
        },
        {
          title: '你審稿、微調、發布',
          description: '保留品牌判斷與專業語氣，把最後一哩路留給你掌握。',
        },
      ],
    },
    chatgpt: {
      title: '為什麼不直接用 ChatGPT？',
      body:
        'ChatGPT 給你文字，Neoxra 給你內容包。每個輸出都符合平台格式：Instagram 有輪播結構，SEO 文章有標題層級與 meta description，Threads 貼文會控制 500 字限制。更重要的是，每個平台都會保持同一套品牌語氣。',
    },
    platformGrid: {
      title: '一個引擎，多個平台',
      cards: [
        {
          name: 'Instagram',
          description: 'carousel + caption + hooks + hashtags',
          cta: '開始使用 →',
          href: '/instagram',
        },
        {
          name: 'SEO',
          description: 'SEO 標題 + 大綱 + 全文',
          cta: '開始使用 →',
          href: '/seo',
        },
        {
          name: 'Threads',
          description: '快速對話式內容',
          cta: '開始使用 →',
          href: '/threads',
        },
        {
          name: 'Facebook',
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
    finalCta: {
      title: '開始把想法變成流量',
      primary: '一次產出四平台',
      secondary: '或預約 Demo 了解更多',
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
      eyebrow: 'Neoxra',
      title: 'Turn Ideas Into Traffic',
      tagline: 'One idea. Four platforms. Ready to publish.',
      body:
        'Neoxra turns a single idea into Instagram carousels, SEO articles, Threads posts, and Facebook content, structured, formatted, and built to perform.',
      orchestraIntro: "Behind the scenes, it's your content orchestra.",
      orchestraBody:
        "You're the conductor. Each AI agent is a specialist: one writes Instagram, one builds SEO, one crafts Threads. You give direction, they execute in sync.",
      result:
        'The result: a complete, multi-platform content system, not drafts, but outputs you can actually publish.',
      primaryCta: 'Generate All Platforms',
      secondaryCta: 'Try Instagram Studio',
      ctas: [
        { label: 'Generate All Platforms', href: '/generate', primary: true },
        { label: 'Instagram Studio', href: '/instagram' },
        { label: 'SEO Articles', href: '/seo' },
        { label: 'Threads', href: '/threads' },
        { label: 'Facebook', href: '/facebook' },
      ],
    },
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
      steps: [
        {
          title: 'Enter your topic and target platform',
          description: 'Start with a single idea and choose where the content needs to go.',
        },
        {
          title: 'AI builds structured content assets',
          description: 'Generate carousel slides, caption, article outline, and hashtags in one pass.',
        },
        {
          title: 'Review, refine, and publish',
          description: 'Keep the final judgment, voice, and edits in your hands.',
        },
      ],
    },
    chatgpt: {
      title: 'Why Not Just Use ChatGPT?',
      body:
        'ChatGPT gives you text. Neoxra gives you a content package. Each output is platform-native: Instagram has carousel slides with visual structure, SEO articles have heading hierarchy and meta descriptions, and Threads posts respect the 500-character limit. Every output matches your brand voice consistently across every platform.',
    },
    platformGrid: {
      title: 'One Engine, Multiple Platforms',
      cards: [
        {
          name: 'Instagram',
          description: 'carousel + caption + hooks + hashtags',
          cta: 'Start now →',
          href: '/instagram',
        },
        {
          name: 'SEO',
          description: 'SEO title + outline + full article',
          cta: 'Start now →',
          href: '/seo',
        },
        {
          name: 'Threads',
          description: 'Fast conversational content',
          cta: 'Start now →',
          href: '/threads',
        },
        {
          name: 'Facebook',
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
    finalCta: {
      title: 'Start Turning Ideas Into Traffic',
      primary: 'Generate All Platforms',
      secondary: 'Or book a demo to learn more',
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

export default function HomePage() {
  const { language } = useLanguage()
  const copy = COPY[language]

  return (
    <main className="min-h-screen bg-transparent text-[var(--text-primary)]">
      <div className="mx-auto max-w-[1120px] px-6 pb-12 pt-6 sm:px-8 lg:px-10">
        <GlobalNav />

        <section className="py-10 md:py-14">
          <div className="max-w-4xl">
            <p className="text-sm font-semibold tracking-[0.18em] text-[var(--text-tertiary)]">
              {copy.hero.eyebrow}
            </p>
            <h1 className="max-w-3xl text-[48px] font-extrabold leading-[1.05] tracking-[-0.03em] text-[var(--text-primary)]">
              {copy.hero.title}
            </h1>
            <p className="mt-6 max-w-3xl text-xl font-semibold text-[var(--text-primary)] md:text-2xl">
              {copy.hero.tagline}
            </p>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-[var(--text-secondary)] md:text-xl">
              {copy.hero.body}
            </p>
            <div className="mt-7 max-w-3xl rounded-[20px] border border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-sm)]">
              <p className="text-base font-bold text-[var(--text-primary)]">{copy.hero.orchestraIntro}</p>
              <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)] md:text-base">
                {copy.hero.orchestraBody}
              </p>
              <p className="mt-3 text-sm font-semibold leading-7 text-[var(--text-primary)] md:text-base">
                {copy.hero.result}
              </p>
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {copy.hero.ctas.map((cta) => (
                <Link
                  key={cta.href}
                  href={cta.href}
                  className="inline-flex items-center justify-center rounded-[8px] border border-[var(--bg-accent)] bg-[var(--bg-accent)] px-6 py-3 text-[15px] font-semibold text-[var(--text-on-accent)] transition-all duration-150 hover:-translate-y-0.5 hover:bg-[var(--accent)] hover:border-[var(--accent)] hover:shadow-[var(--shadow-md)]"
                >
                  {cta.label}
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16">
          <p className="mx-auto max-w-4xl text-center text-lg font-medium text-[var(--accent)]">
            {copy.problem}
          </p>
        </section>

        <section className="py-12 md:py-16">
          <div className="grid gap-6 lg:grid-cols-2">
            <article className="rounded-[var(--card-radius)] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-[var(--shadow-md)]">
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

            <article className="rounded-[var(--card-radius)] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-[var(--shadow-md)]">
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
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {copy.howItWorks.steps.map((step, index) => (
              <div
                key={step.title}
                className="rounded-[var(--card-radius)] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-[var(--shadow-sm)] transition-shadow duration-150 hover:shadow-[var(--shadow-md)]"
              >
                <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bg-accent)] text-sm font-bold text-[var(--text-on-accent)]">
                  {index + 1}
                </div>
                <h3 className="mt-5 text-xl font-bold text-[var(--text-primary)]">{step.title}</h3>
                <p className="mt-3 text-sm text-[var(--text-secondary)]">{step.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="py-10 md:py-14">
          <div className="mx-auto max-w-4xl rounded-[20px] border border-[var(--border)] bg-[var(--bg-sunken)] p-6 text-center shadow-[var(--shadow-sm)] md:p-8">
            <h2 className="text-[28px] font-bold tracking-[-0.02em] text-[var(--text-primary)]">
              {copy.chatgpt.title}
            </h2>
            <p className="mt-4 text-base leading-8 text-[var(--text-secondary)]">
              {copy.chatgpt.body}
            </p>
          </div>
        </section>

        <section className="py-12 md:py-16">
          <h2 className="text-[28px] font-bold tracking-[-0.02em] text-[var(--text-primary)]">
            {copy.platformGrid.title}
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {copy.platformGrid.cards.map((card) =>
              card.href ? (
                <Link
                  key={card.name}
                  href={card.href}
                  className="rounded-[var(--card-radius)] border border-[var(--border)] border-l-[3px] border-l-[var(--accent)] bg-[var(--bg-elevated)] p-6 shadow-[var(--shadow-sm)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-xl font-bold text-[var(--text-primary)]">{card.name}</h3>
                  </div>
                  <p className="mt-3 text-sm text-[var(--text-secondary)]">{card.description}</p>
                  <div className="mt-6 text-sm font-bold text-[var(--text-primary)]">{card.cta}</div>
                </Link>
              ) : (
                <div
                  key={card.name}
                  className="rounded-[var(--card-radius)] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-[var(--shadow-sm)]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-xl font-bold text-[var(--text-primary)]">{card.name}</h3>
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
          <div className="homepage-cta rounded-[20px] px-6 py-10 text-center shadow-[var(--shadow-md)] sm:px-10">
            <h2 className="text-3xl font-bold tracking-[-0.02em]">
              {copy.finalCta.title}
            </h2>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/generate"
                className="homepage-cta-button inline-flex items-center justify-center rounded-[8px] px-6 py-3 text-[15px] font-semibold transition-all duration-150 hover:opacity-90"
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
          </div>
        </section>

        <footer className="border-t border-[var(--border)] py-8 text-center text-sm text-[var(--text-secondary)]">
          <p>{copy.brandNote}</p>
          <p className="mt-2">{copy.footer}</p>
        </footer>
      </div>
      <style jsx global>{`
        .homepage-cta {
          background: var(--bg-accent);
          color: var(--text-on-accent);
        }

        .homepage-cta h2 {
          color: inherit;
        }

        .homepage-cta-button {
          background: var(--bg-elevated);
          color: var(--text-primary);
        }

        .homepage-cta-link {
          color: rgba(250, 250, 250, 0.78);
        }

        .homepage-cta-link:hover {
          color: var(--text-on-accent);
        }

        html[data-theme='dark'] .homepage-cta {
          background: var(--bg-elevated);
          color: var(--text-primary);
        }

        html[data-theme='dark'] .homepage-cta-button {
          background: var(--accent);
          color: var(--text-on-accent);
        }

        html[data-theme='dark'] .homepage-cta-link {
          color: var(--text-secondary);
        }

        html[data-theme='dark'] .homepage-cta-link:hover {
          color: var(--text-primary);
        }
      `}</style>
    </main>
  )
}
