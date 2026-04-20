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
    articlesSoon: string
    threadsSoon: string
    lawFirms: string
    moreVerticalsSoon: string
  }
  hero: {
    title: string
    subtitle: string
    primaryCta: string
    secondaryCta: string
  }
  problem: string
  showcase: {
    instagramTitle: string
    instagramLabel: string
    instagramCaption: string
    articleTitle: string
    articleLabel: string
    articleSeoTitle: string
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
  footer: string
}

const COPY: Record<'en' | 'zh-TW', LocalizedCopy> = {
  'zh-TW': {
    nav: {
      brand: 'Neoxra',
      products: 'Products',
      useCases: 'Use Cases',
      instagramStudio: 'Instagram Studio',
      articlesSoon: 'Articles（即將推出）',
      threadsSoon: 'Threads（即將推出）',
      lawFirms: '法律事務所',
      moreVerticalsSoon: '更多產業即將推出',
    },
    hero: {
      title: '把想法變成流量',
      subtitle:
        'Neoxra 用 AI 把一個想法，轉化成能帶來流量的內容資產。不是一般的文字生成，而是有結構、有策略、可直接發布的平台內容。',
      primaryCta: '試試 Instagram Studio',
      secondaryCta: '看法律事務所案例',
    },
    problem: '每個品牌都需要在 5 個平台上做內容。但沒有團隊能跟得上。',
    showcase: {
      instagramTitle: 'Instagram Output',
      instagramLabel: '從「車禍理賠流程」這個主題，自動產出的 IG 內容',
      instagramCaption:
        '車禍後別急著簽和解書。先報警、拍照、就醫，再把醫療收據、請假紀錄與修車估價整理完整，後續理賠與求償才不會陷入被動。',
      articleTitle: 'Article Output',
      articleLabel: '同一個主題，同時產出的 SEO 文章',
      articleSeoTitle: '車禍理賠怎麼算？完整流程、金額計算、注意事項一次搞懂',
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
          name: 'Articles',
          description: 'SEO 標題 + 大綱 + 全文',
          cta: '即將推出',
          soon: true,
        },
        {
          name: 'Threads',
          description: '快速對話式內容',
          cta: '即將推出',
          soon: true,
        },
        {
          name: 'LinkedIn',
          description: '專業敘事型內容',
          cta: '即將推出',
          soon: true,
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
          title: '新創公司',
          description: '把產品洞察與市場觀點變成穩定輸出的成長內容。',
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
      primary: '試試 Instagram Studio',
      secondary: '或預約 Demo 了解更多',
    },
    footer: 'Neoxra © 2026 · Meridian Global LLC',
  },
  en: {
    nav: {
      brand: 'Neoxra',
      products: 'Products',
      useCases: 'Use Cases',
      instagramStudio: 'Instagram Studio',
      articlesSoon: 'Articles (coming soon)',
      threadsSoon: 'Threads (coming soon)',
      lawFirms: 'Law Firms',
      moreVerticalsSoon: 'More verticals coming soon',
    },
    hero: {
      title: 'Turn Ideas Into Traffic',
      subtitle:
        'Neoxra turns one idea into traffic-ready content assets. Not generic text generation, but structured, strategic, platform-native content you can actually publish.',
      primaryCta: 'Try Instagram Studio',
      secondaryCta: 'See the Law Firm Case',
    },
    problem: 'Every brand needs content across five platforms. Almost no team can keep up.',
    showcase: {
      instagramTitle: 'Instagram Output',
      instagramLabel: 'Generated automatically from the topic “Car Accident Compensation Process”',
      instagramCaption:
        'After a car accident, do not rush into signing a settlement. Start with the right evidence, medical records, and timeline so later compensation conversations do not start from a weak position.',
      articleTitle: 'Article Output',
      articleLabel: 'The same topic, turned into an SEO article at the same time',
      articleSeoTitle:
        'How Is Car Accident Compensation Calculated? Process, Timing, and Key Things to Watch',
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
          name: 'Articles',
          description: 'SEO title + outline + full article',
          cta: 'Coming soon',
          soon: true,
        },
        {
          name: 'Threads',
          description: 'Fast conversational content',
          cta: 'Coming soon',
          soon: true,
        },
        {
          name: 'LinkedIn',
          description: 'Narrative-led professional content',
          cta: 'Coming soon',
          soon: true,
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
          title: 'Startups',
          description: 'Turn product insight into consistent growth content.',
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
      primary: 'Try Instagram Studio',
      secondary: 'Or book a demo to learn more',
    },
    footer: 'Neoxra © 2026 · Meridian Global LLC',
  },
}

const INSTAGRAM_SLIDES = [
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
] as const

const ARTICLE_OUTLINE = [
  '車禍發生後第一時間該做哪些事',
  '理賠與民事求償常見的時效怎麼看',
  '醫療費、工作損失、慰撫金如何整理',
] as const

function PageComingSoonBadge() {
  return (
    <span className="inline-flex rounded-full bg-[var(--bg-sunken)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-tertiary)]">
      即將推出
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
            <h1 className="max-w-3xl text-[48px] font-extrabold leading-[1.05] tracking-[-0.03em] text-[var(--text-primary)]">
              {copy.hero.title}
            </h1>
            <p className="mt-6 max-w-3xl text-lg text-[var(--text-secondary)] md:text-xl">
              {copy.hero.subtitle}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/instagram"
                className="inline-flex items-center justify-center rounded-[8px] bg-[var(--bg-accent)] px-6 py-3 text-[15px] font-semibold text-[var(--text-on-accent)] transition-all duration-150 hover:opacity-90"
              >
                {copy.hero.primaryCta}
              </Link>
              <Link
                href="/demo/legal"
                className="inline-flex items-center justify-center rounded-[8px] border border-[var(--border-bold)] px-6 py-3 text-[15px] font-semibold text-[var(--text-primary)] transition-all duration-150 hover:bg-[var(--bg-sunken)]"
              >
                {copy.hero.secondaryCta}
              </Link>
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
                {INSTAGRAM_SLIDES.map((slide, index) => (
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
                  {ARTICLE_OUTLINE.map((heading) => (
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
                    {card.soon ? <PageComingSoonBadge /> : null}
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
                    {card.soon ? <PageComingSoonBadge /> : null}
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
                href="/instagram"
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
          {copy.footer}
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
