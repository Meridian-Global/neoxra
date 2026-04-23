'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { GlobalNav } from '../../../components/GlobalNav'
import { API_BASE_URL } from '../../../lib/api'
import { normalizeLegalLivePayload } from '../../../lib/legal-live-parser'
import { APIError, streamSSE } from '../../../lib/sse'
import type { CarouselSlide, InstagramContent } from '../../../lib/instagram-types'

type ContentTab = 'instagram' | 'article'
type DemoStatus = 'idle' | 'loading' | 'completed' | 'error'

interface ArticlePreview {
  seoTitle: string
  outline: string[]
  summary: string
}

interface ShowcaseContent {
  caption: string
  slides: CarouselSlide[]
  article: ArticlePreview
}

interface SampleCase {
  key: string
  label: string
  instagram: ShowcaseContent
}

const PAGE_TEXT = 'var(--text-primary)'
const PAGE_MUTED = 'var(--text-secondary)'
const PAGE_BORDER = 'var(--border)'
const PAGE_SHADOW = 'var(--shadow-sm)'

const SAMPLE_CASES: SampleCase[] = [
  {
    key: 'accident',
    label: '車禍理賠流程',
    instagram: {
      caption:
        '車禍發生後，很多人第一時間只想到修車與和解，卻忽略了最關鍵的證據保全與時效問題。從報警、驗傷、保留單據，到後續保險理賠與損害賠償主張，每一步都會影響最終能不能拿回合理補償。如果你能在一開始就把流程走對，不只談判會更有底氣，也能避免在不清楚權利義務的情況下草率簽下和解。以下整理五個最重要的處理步驟，幫你先把方向抓清楚。',
      slides: [
        { title: '車禍後第一件事，不是先談和解', body: '先確認人身安全、報警備案，並保留現場照片與對話紀錄。' },
        { title: '先把證據留好', body: '事故現場、車損、行車紀錄器、診斷證明與維修估價，都可能成為求償關鍵。' },
        { title: '理賠與求償要分開看', body: '保險公司理賠不等於完整賠償，仍要評估是否另向對方主張醫療與工作損失。' },
        { title: '別忽略時效與書面文件', body: '任何和解、放棄或收據文件，都要確認內容，避免先簽後失去追償空間。' },
        { title: '需要專業協助？歡迎私訊諮詢', body: '若案件涉及受傷、失能或責任爭議，及早讓律師協助更安心。' },
      ],
      article: {
        seoTitle: '車禍理賠怎麼算？完整流程、時效、注意事項一次看',
        outline: ['車禍發生後第一時間應該做什麼', '保險理賠與民事求償有什麼差別', '和解前一定要確認的三件事', '什麼情況下建議尋求律師協助'],
        summary:
          '車禍理賠常見爭議，不在於有沒有保險，而在於是否在一開始就把證據、流程與時效掌握好。這篇文章會帶你快速看懂報警、驗傷、理賠與和解時最容易忽略的重點。',
      },
    },
  },
  {
    key: 'lease',
    label: '租約糾紛常見問題',
    instagram: {
      caption:
        '租屋糾紛通常不是因為某一方特別惡意，而是雙方一開始就沒有把押金、修繕、提前解約與違約責任講清楚。等到真的發生漏水、提前搬離、房東不退押金時，才發現租約內容太模糊，甚至連照片、對話與點交紀錄都沒有留下。其實很多爭議如果在簽約前就先檢查，後面就能少掉很多來回溝通與情緒成本。以下整理租約裡最容易出事的幾個重點。',
      slides: [
        { title: '租約不是簽了就好', body: '押金、修繕責任、提前解約與違約金，都要寫得明確才有保障。' },
        { title: '點交紀錄很重要', body: '入住與退租時都要拍照、列清單，避免日後對設備損壞各說各話。' },
        { title: '押金不能隨便扣', body: '房東若主張扣押金，通常仍需有具體損害或費用依據。' },
        { title: '提前解約先看約定', body: '不是一句「我不租了」就結束，還要確認通知期限與違約責任。' },
        { title: '需要專業協助？歡迎私訊諮詢', body: '若金額較大或雙方僵持，先讓專業法律意見協助判斷。' },
      ],
      article: {
        seoTitle: '租約糾紛怎麼處理？押金、修繕、提前解約常見問題整理',
        outline: ['租約中最應該先確認的條款', '押金返還常見爭議怎麼看', '房屋修繕責任如何分配', '提前解約時租客與房東各自要注意什麼'],
        summary:
          '租屋糾紛最常發生在押金、修繕與提前解約。只要租約條款模糊、點交紀錄不完整，後續爭議就很難快速解決。這篇文章整理租屋雙方最常忽略的法律重點。',
      },
    },
  },
  {
    key: 'labor',
    label: '勞資爭議處理',
    instagram: {
      caption:
        '勞資爭議常常不是單一事件，而是加班費、考績、資遣流程與溝通方式累積後一起爆發。對企業來說，最怕的是以為內部已經講清楚，結果沒有留下制度文件與通知紀錄；對員工來說，最擔心的是在不知道自己權利的情況下就簽下離職或資遣文件。無論站在哪一方，先把事實、時間點與文件整理清楚，才有機會理性處理，不讓問題升高成更大的風險。',
      slides: [
        { title: '勞資爭議，先把事實整理好', body: '出勤紀錄、薪資單、通知訊息與合約版本，是釐清爭議的基本材料。' },
        { title: '加班費與工時最常出問題', body: '若工時管理不清楚，很容易在離職或申訴時成為主要爭點。' },
        { title: '資遣流程不能只靠口頭', body: '通知、理由、資遣費與程序是否合法，都需要完整書面紀錄。' },
        { title: '企業要做的是制度化', body: '有規則不等於有執行，真正重要的是制度能不能被證明有落地。' },
        { title: '需要專業協助？歡迎私訊諮詢', body: '若案件涉及申訴、調解或訴訟風險，建議提早尋求專業判斷。' },
      ],
      article: {
        seoTitle: '勞資爭議怎麼處理？加班費、資遣、申訴風險一次整理',
        outline: ['勞資爭議發生時應先整理哪些資料', '加班費與工時管理的常見爭點', '資遣前企業應確認哪些程序', '員工申訴或調解時的實務注意事項'],
        summary:
          '勞資爭議往往牽涉工時、薪資、通知程序與內部制度執行。無論你是企業主還是人資，先把事實與文件整理清楚，才能有效降低後續調解與訴訟風險。',
      },
    },
  },
]

function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[。！？!?])/)
    .map((part) => part.trim())
    .filter(Boolean)
}

function deriveCarouselSlides(topic: string, content: Partial<InstagramContent>): CarouselSlide[] {
  const existingSlides = Array.isArray(content.carousel_outline)
    ? content.carousel_outline.filter((slide) => slide?.title?.trim() && slide?.body?.trim())
    : []

  if (existingSlides.length >= 5) {
    return existingSlides.slice(0, 5)
  }

  const hook = content.hook_options?.[0]?.trim() || `${topic}，先抓住三個關鍵重點`
  const captionParts = splitSentences(content.caption ?? '')
  const reelParts = splitSentences(content.reel_script ?? '')
  const bodies = [...captionParts, ...reelParts].filter(Boolean)

  const middleSlides = Array.from({ length: 3 }).map((_, index) => {
    const fallbackBody = bodies[index] || `先釐清 ${topic} 的關鍵事實、流程與風險，才能做出正確下一步。`
    return {
      title: `重點 ${index + 1}`,
      body: fallbackBody,
    }
  })

  const merged = [
    { title: hook, body: bodies[0] || `先用一句清楚的結論，讓讀者知道 ${topic} 影響的是什麼。` },
    ...middleSlides,
    { title: '需要專業協助？歡迎私訊諮詢', body: '涉及金額、時效或責任爭議時，建議及早尋求律師協助。' },
  ]

  return merged.slice(0, 5)
}

function buildArticlePreview(topic: string, content: Partial<InstagramContent>, slides: CarouselSlide[]): ArticlePreview {
  const summary = [
    content.caption ?? '',
    content.reel_script ?? '',
    ...slides.map((slide) => slide.body),
  ]
    .flatMap((text) => text.split(/\n+/))
    .map((part) => part.trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)[0]

  const outline = [
    `${topic}的核心問題是什麼`,
    ...slides.slice(1, 4).map((slide) => slide.title),
    '什麼情況下建議盡快找律師',
  ].slice(0, 4)

  return {
    seoTitle: `${topic}怎麼處理？流程、重點與注意事項一次看`,
    outline,
    summary:
      summary ||
      `如果你正在面對「${topic}」相關問題，先把流程、證據與時效觀念掌握清楚，會比急著做決定更重要。`,
  }
}

function normalizeGeneratedContent(topic: string, content: Partial<InstagramContent>): ShowcaseContent {
  const caption =
    content.caption?.trim() ||
    `針對「${topic}」，建議先把核心事實、程序節點與常見風險整理清楚，才能對外說明得更專業，也更容易轉成可持續發布的內容。`
  const slides = deriveCarouselSlides(topic, { ...content, caption })
  const article = buildArticlePreview(topic, { ...content, caption }, slides)

  return {
    caption,
    slides,
    article,
  }
}

function normalizeFromAnyPayload(topic: string, payload: unknown): ShowcaseContent {
  const normalized = normalizeLegalLivePayload(topic, payload)

  return {
    caption: normalized.caption,
    slides: normalized.slides,
    article: {
      seoTitle: normalized.articleTitle,
      outline: normalized.articleOutline.map((item) => item.heading),
      summary: normalized.articleSummary,
    },
  }
}

function createLegalTemplate(topic: string) {
  return `請以法律事務所對外教育內容的口吻，為主題「${topic}」生成內容。語氣要專業、親民、可信，先講結論，再拆解 3 到 4 個實際重點，最後提醒何時應該尋求專業法律協助。請讓內容適合台灣法律事務所用於 Instagram 圖文與網站文章。`
}

const DEFAULT_LIVE_TOPIC = '遺產繼承程序'

const DEFAULT_LIVE_CONTENT: ShowcaseContent = {
  caption:
    '遺產繼承往往不是卡在誰有權利，而是卡在大家不知道程序先後。從死亡登記、遺產清冊、繼承人範圍，到不動產、存款與稅務申報，每一步都會影響後續能不能順利辦完。如果一開始就把文件、時程與分配方式整理清楚，不只家人之間比較不容易失焦，整個流程也會快很多。以下先用五張輪播，把最重要的繼承程序整理給你。',
  slides: [
    { title: '先確認誰是繼承人', body: '配偶、子女、父母與其他順位不同，第一步先把繼承範圍釐清。' },
    { title: '文件先準備齊', body: '戶籍、除戶、財產資料與關係證明，缺一項都可能拖慢整體流程。' },
    { title: '遺產內容要盤點', body: '不動產、存款、保單、債務都要一起看，不能只看表面資產。' },
    { title: '稅務申報別延誤', body: '遺產稅申報有時程壓力，越晚整理，越容易讓後面流程卡住。' },
    { title: '分配爭議先談清楚', body: '涉及特留分、代位繼承或家族分配時，提早釐清最省時間。' },
  ],
  article: {
    seoTitle: '遺產繼承程序怎麼跑？文件、時程與常見爭議一次看懂',
    outline: ['先確認繼承人與繼承順位', '辦理繼承前需要準備哪些文件', '遺產稅申報與財產移轉怎麼安排', '什麼情況下應該提早請律師協助'],
    summary:
      '遺產繼承不是單純辦文件，而是同時處理身份、財產、稅務與家族協調。只要程序順序搞錯，後面的移轉、申報與分配都可能一起延誤。這篇先帶你快速看懂實務上最常卡住的環節。',
  },
}

function LegalSection({
  id,
  eyebrow,
  title,
  description,
  children,
  titleClassName = '',
}: {
  id?: string
  eyebrow: string
  title: string
  description?: string
  children: React.ReactNode
  titleClassName?: string
}) {
  return (
    <section id={id} className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm font-semibold tracking-[0.18em] text-[var(--accent)]">{eyebrow}</p>
        <h2 className={`text-2xl font-black leading-tight text-[var(--text-primary)] md:text-4xl ${titleClassName}`}>{title}</h2>
        {description ? <p className="max-w-3xl text-base leading-7 text-[var(--text-secondary)] md:text-lg">{description}</p> : null}
      </div>
      {children}
    </section>
  )
}

function SurfaceCard({
  children,
  className = '',
  style,
}: {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <div
      className={`rounded-[12px] border border-[var(--border)] bg-[var(--bg-elevated)] ${className}`}
      style={{ boxShadow: PAGE_SHADOW, ...style }}
    >
      {children}
    </div>
  )
}

function CarouselDeck({ slides }: { slides: CarouselSlide[] }) {
  return (
    <div className="grid grid-flow-col auto-cols-[200px] gap-4 overflow-x-auto pb-2 md:auto-cols-[220px]">
      {slides.map((slide, index) => (
        <SurfaceCard
          key={`${slide.title}-${index}`}
          className="flex min-h-[200px] flex-col justify-between p-5"
          style={{
            background: index % 2 === 0 ? 'var(--bg-sunken)' : 'var(--bg-elevated)',
          }}
        >
          <div className="space-y-4">
            <div className="text-xs font-medium tracking-[0.08em] text-[var(--text-tertiary)]">
              {index + 1}/{slides.length}
            </div>
            <h4 className="text-lg font-bold leading-snug text-[var(--text-primary)] md:text-xl">{slide.title}</h4>
          </div>
          <p className="line-clamp-2 text-[15px] font-normal leading-6 text-[var(--text-secondary)]">{slide.body}</p>
        </SurfaceCard>
      ))}
    </div>
  )
}

function ShowcaseTabs({
  content,
  activeTab,
  onChange,
}: {
  content: ShowcaseContent
  activeTab: ContentTab
  onChange: (tab: ContentTab) => void
}) {
  return (
    <div className="space-y-6">
      <div className="inline-flex gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-sunken)] p-1.5">
        {([
          ['instagram', 'Instagram'],
          ['article', '文章'],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={`relative rounded-lg px-5 py-2.5 text-sm font-medium transition ${
              activeTab === key
                ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                : 'text-[var(--text-tertiary)]'
            }`}
            style={activeTab === key ? { boxShadow: PAGE_SHADOW } : undefined}
          >
            {label}
            {activeTab === key ? (
              <span className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full bg-[image:var(--gradient-warm)]" />
            ) : null}
          </button>
        ))}
      </div>

      {activeTab === 'instagram' ? (
        <div className="space-y-6">
          <SurfaceCard className="relative overflow-hidden p-6">
            <div className="absolute bottom-0 left-0 top-0 w-[3px] bg-[image:var(--gradient-instagram)]" />
            <p className="mb-3 text-sm font-semibold text-[var(--accent)]">貼文說明</p>
            <p className="whitespace-pre-line text-base leading-8 text-[var(--text-primary)]">{content.caption}</p>
          </SurfaceCard>
          <div className="space-y-3">
            <p className="text-sm font-semibold text-[var(--accent)]">輪播卡片</p>
            <CarouselDeck slides={content.slides} />
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <SurfaceCard className="relative overflow-hidden p-6">
            <div className="absolute bottom-0 left-0 top-0 w-[3px] bg-[image:var(--gradient-seo)]" />
            <p className="mb-2 text-sm font-semibold text-[var(--accent)]">SEO 標題</p>
            <h3 className="text-xl font-black leading-snug text-[var(--text-primary)]">{content.article.seoTitle}</h3>
          </SurfaceCard>
          <div className="grid gap-5 lg:grid-cols-[1.1fr,0.9fr]">
            <SurfaceCard className="p-6">
              <p className="mb-3 text-sm font-semibold text-[var(--accent)]">文章大綱</p>
              <div className="space-y-3">
                {content.article.outline.map((item, index) => (
                  <div key={`${item}-${index}`} className="rounded-xl bg-[var(--bg-sunken)] px-4 py-3 text-sm font-medium text-[var(--text-primary)]">
                    H2 {index + 1}｜{item}
                  </div>
                ))}
              </div>
            </SurfaceCard>
            <SurfaceCard className="p-6">
              <p className="mb-3 text-sm font-semibold text-[var(--accent)]">首段摘要</p>
              <p className="text-sm leading-8 text-[var(--text-secondary)]">{content.article.summary}</p>
            </SurfaceCard>
          </div>
        </div>
      )}
    </div>
  )
}

export default function LegalLandingPage() {
  const [activeCaseKey, setActiveCaseKey] = useState<string>(SAMPLE_CASES[0].key)
  const [activeSampleTab, setActiveSampleTab] = useState<ContentTab>('instagram')
  const [activeLiveTab, setActiveLiveTab] = useState<ContentTab>('instagram')
  const [topic, setTopic] = useState(DEFAULT_LIVE_TOPIC)
  const [status, setStatus] = useState<DemoStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [liveContent, setLiveContent] = useState<ShowcaseContent | null>(DEFAULT_LIVE_CONTENT)

  const activeCase = useMemo(
    () => SAMPLE_CASES.find((item) => item.key === activeCaseKey) ?? SAMPLE_CASES[0],
    [activeCaseKey],
  )

  async function handleGenerate() {
    const trimmedTopic = topic.trim()
    if (!trimmedTopic) return

    setStatus('loading')
    setError(null)
    setActiveLiveTab('instagram')

    try {
      let latestPayload: unknown = null

      for await (const chunk of streamSSE(`${API_BASE_URL}/api/instagram/generate`, {
        topic: trimmedTopic,
        template_text: createLegalTemplate(trimmedTopic),
        goal: 'authority',
        locale: 'zh-TW',
      })) {
        if (chunk.event === 'content_ready') {
          latestPayload = chunk.data?.content ?? chunk.data
        }

        if (chunk.event === 'pipeline_completed') {
          const normalized = normalizeFromAnyPayload(trimmedTopic, chunk.data ?? latestPayload ?? {})
          setLiveContent(normalized)
          setStatus('completed')
          return
        }

        if (chunk.event === 'error') {
          throw new Error(typeof chunk.data?.message === 'string' ? chunk.data.message : '內容產生失敗。')
        }
      }

      if (latestPayload) {
        const normalized = normalizeFromAnyPayload(trimmedTopic, latestPayload)
        setLiveContent(normalized)
        setStatus('completed')
        return
      }

      throw new Error('目前無法取得可展示的內容，請稍後再試。')
    } catch (err) {
      if (err instanceof APIError) {
        if (err.status === 422) {
          setError('請輸入更明確的法律主題，再重新產生。')
        } else if (err.status === 503) {
          setError('系統目前較忙，建議稍後再試。')
        } else {
          setError('目前無法完成內容產生，請稍後再試。')
        }
      } else if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('目前無法完成內容產生，請稍後再試。')
      }
      setStatus('error')
    }
  }

  return (
    <main
      className="min-h-screen bg-[var(--bg)]"
      style={{ color: PAGE_TEXT }}
      lang="zh-Hant"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-20 px-6 py-10 md:px-10 md:py-14">
        <GlobalNav />

        <section className="grid gap-10 rounded-[28px] border border-[var(--border)] bg-[var(--bg-elevated)] px-8 py-10 md:grid-cols-[1.05fr,0.95fr] md:px-12 md:py-14" style={{ boxShadow: 'var(--shadow-lg)' }}>
          <div className="space-y-8">
            <div className="space-y-5">
              <div className="inline-flex rounded-full bg-[var(--accent-subtle)] px-4 py-2 text-sm font-semibold text-[var(--accent)]">
                Neoxra › Use Cases › 法律事務所
              </div>
              <div className="space-y-4">
                <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-[-0.03em] text-[var(--text-primary)] md:text-6xl">
                  法律事務所的 AI 內容系統
                </h1>
                <p className="text-sm font-medium tracking-[0.04em] text-[var(--text-secondary)]">
                  Powered by Neoxra — AI 內容引擎
                </p>
                <p className="max-w-2xl text-lg leading-8 text-[var(--text-secondary)] md:text-2xl">
                  一個主題，自動產出 Instagram 圖文 + SEO 文章。每篇省下 2–3 小時。
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                ['每月內容產能', '8 篇以上'],
                ['單篇準備時間', '5 分鐘'],
                ['審稿方式', '律師最後把關'],
              ].map(([label, value]) => (
                <SurfaceCard key={label} className="p-5">
                  <p className="text-sm font-medium text-[var(--text-secondary)]">{label}</p>
                  <p className="mt-3 text-2xl font-black text-[var(--text-primary)]">{value}</p>
                </SurfaceCard>
              ))}
            </div>

            <div className="flex flex-wrap gap-4">
              <a
                href="#cta"
                className="inline-flex items-center justify-center rounded-[8px] bg-[image:var(--gradient-cta)] px-6 py-3 text-[15px] font-semibold text-white transition-all duration-150 hover:-translate-y-0.5 hover:bg-[image:var(--gradient-cta-hover)]"
              >
                預約 2 週免費試用
              </a>
              <a
                href="#live-demo"
                className="inline-flex items-center justify-center rounded-full border px-6 py-3 text-base font-semibold text-[var(--text-primary)]"
                style={{ borderColor: PAGE_BORDER, background: 'var(--bg-sunken)' }}
              >
                直接試一個主題
              </a>
            </div>
          </div>

          <SurfaceCard className="overflow-hidden">
            <div className="border-b border-[var(--border)] bg-[var(--bg-sunken)] px-6 py-5">
              <p className="text-sm font-semibold text-[var(--accent)]">不只是貼文，而是一套穩定內容流程</p>
            </div>
            <div className="grid gap-4 p-6">
              {[
                {
                  title: 'Instagram 圖文',
                  body: '自動產出 5 張輪播 + caption，直接可發布。',
                },
                {
                  title: 'SEO 文章',
                  body: '標題、大綱、全文初稿，SEO 結構自動內建。',
                },
                {
                  title: '律師最後把關',
                  body: 'AI 寫初稿，你只需 10 分鐘審稿。',
                },
              ].map((item) => (
                <div key={item.title} className="rounded-2xl bg-[var(--bg-sunken)] p-5">
                  <h3 className="text-lg font-black text-[var(--text-primary)]">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{item.body}</p>
                </div>
              ))}
            </div>
          </SurfaceCard>
        </section>

        <LegalSection
          eyebrow="預製範例"
          title="直接看到法律內容長什麼樣"
          description="以下三組內容直接模擬法律事務所最常需要對外說明的主題，讓會議現場可以快速感受最終輸出的樣子。"
        >
          <div className="flex flex-wrap gap-3">
            {SAMPLE_CASES.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  setActiveCaseKey(item.key)
                  setActiveSampleTab('instagram')
                }}
                className={`rounded-full border px-5 py-3 text-sm font-semibold transition ${
                  activeCase.key === item.key
                    ? 'border-transparent bg-[image:var(--gradient-cta)] text-white'
                    : 'border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <SurfaceCard className="p-6 md:p-8">
            <div className="mb-6 space-y-2">
              <p className="text-sm font-semibold text-[var(--accent)]">範例主題</p>
              <h3 className="text-2xl font-black text-[var(--text-primary)]">{activeCase.label}</h3>
            </div>
            <ShowcaseTabs content={activeCase.instagram} activeTab={activeSampleTab} onChange={setActiveSampleTab} />
          </SurfaceCard>
        </LegalSection>

        <LegalSection
          id="live-demo"
          eyebrow="即時體驗區"
          title="試試你的主題"
          description="直接輸入你想推廣的法律主題，頁面會即時整理成可展示的 Instagram 圖文與文章骨架。"
          titleClassName="text-3xl font-bold md:text-5xl"
        >
          <SurfaceCard className="p-6 md:p-8">
            <div className="grid gap-4 md:grid-cols-[1fr,160px]">
              <input
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                placeholder="輸入法律主題，例如：遺產繼承程序"
                className="h-14 rounded-2xl border bg-[var(--bg-elevated)] px-5 text-base text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent)]"
                style={{ borderColor: PAGE_BORDER }}
              />
              <button
                type="button"
                onClick={() => void handleGenerate()}
                disabled={status === 'loading'}
                className="h-14 rounded-[8px] bg-[image:var(--gradient-cta)] px-5 text-base font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[image:var(--gradient-cta-hover)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {status === 'loading' ? '產生中…' : '產生內容'}
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              {['遺產繼承程序', '醫療糾紛處理', '公司章程設計'].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setTopic(preset)}
                  className="rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] px-5 py-2.5 text-[15px] font-medium text-[var(--text-secondary)] transition hover:border-[var(--accent)]"
                >
                  {preset}
                </button>
              ))}
            </div>

            {error ? (
              <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] px-5 py-4 text-sm leading-7 text-[var(--text-secondary)]">
                {error}
              </div>
            ) : null}

            {liveContent ? (
              <div className="mt-8 space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--accent)]">最新主題</p>
                    <h3 className="text-2xl font-black text-[var(--text-primary)]">{topic.trim() || DEFAULT_LIVE_TOPIC}</h3>
                  </div>
                  <div className="rounded-full bg-[var(--accent-subtle)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)]">
                    {status === 'loading' ? '內容整理中' : topic.trim() === DEFAULT_LIVE_TOPIC && status === 'idle' ? '預設展示內容' : '已生成可展示內容'}
                  </div>
                </div>

                <ShowcaseTabs content={liveContent} activeTab={activeLiveTab} onChange={setActiveLiveTab} />
              </div>
            ) : null}
          </SurfaceCard>
        </LegalSection>

        <LegalSection
          eyebrow="價值對比"
          title="把律師時間花在最後把關，而不是從零開始寫"
          description="這不是要取代律師，而是把原本散落在蒐集資料、整理架構、撰寫初稿的時間集中縮短。"
        >
          <SurfaceCard className="overflow-hidden">
            <div className="grid grid-cols-3 bg-[var(--bg-sunken)] text-sm font-semibold text-[var(--text-secondary)]">
              <div className="px-5 py-4">項目</div>
              <div className="px-5 py-4">傳統做法</div>
              <div className="px-5 py-4">使用 Neoxra</div>
            </div>
            {[
              ['一篇 IG 圖文', '1.5–2 小時', '5 分鐘'],
              ['一篇 SEO 文章', '2–3 小時', '5 分鐘'],
              ['每月 8 篇內容', '20+ 小時', '< 2 小時'],
              ['需要的人力', '1 位內容編輯', 'AI 系統 + 律師審稿'],
            ].map((row, index) => (
              <div
                key={row[0]}
                className={`grid grid-cols-3 text-sm md:text-base ${index !== 3 ? 'border-t' : ''}`}
                style={{ borderColor: 'var(--border)' }}
              >
                <div className="px-5 py-4 font-semibold text-[var(--text-primary)]">{row[0]}</div>
                <div className="px-5 py-4 text-[var(--text-secondary)]">{row[1]}</div>
                <div className="px-5 py-4 font-semibold text-[var(--text-primary)]">{row[2]}</div>
              </div>
            ))}
          </SurfaceCard>
        </LegalSection>

        <section
          id="cta"
          className="rounded-[28px] border border-[var(--border)] bg-[var(--bg-sunken)]/70 px-8 py-10 text-center backdrop-blur-sm md:px-12 md:py-14"
        >
          <div className="mx-auto max-w-3xl space-y-5">
            <h2 className="text-3xl font-black leading-tight text-[var(--text-primary)] md:text-5xl">如果你希望內容穩定產出，現在就安排 2 週免費試用</h2>
            <p className="text-lg leading-8 text-[var(--text-secondary)]">
              用真實主題測試內容產出速度、律師審稿流程與每月固定欄位規劃。
            </p>
            <p className="text-sm leading-7 text-[var(--text-secondary)]">
              直接評估是否適合導入 NTD 20,000 / 月的 pilot。
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <a
                href="mailto:support@neoxra.com?subject=%E9%A0%90%E7%B4%84%202%20%E9%80%B1%E5%85%8D%E8%B2%BB%E8%A9%A6%E7%94%A8"
                className="inline-flex items-center justify-center rounded-[8px] bg-[image:var(--gradient-cta)] px-6 py-3 text-[15px] font-semibold text-white transition-all duration-150 hover:-translate-y-0.5 hover:bg-[image:var(--gradient-cta-hover)]"
              >
                預約 2 週免費試用
              </a>
              <Link
                href="/instagram"
                className="inline-flex items-center justify-center rounded-full border px-7 py-3 text-base font-semibold text-[var(--text-primary)]"
                style={{ borderColor: PAGE_BORDER, background: 'var(--bg-sunken)' }}
              >
                看更多內容範例
              </Link>
            </div>
            <p className="text-sm text-[var(--text-tertiary)]">由 Neoxra 提供技術支援</p>
          </div>
        </section>
      </div>
    </main>
  )
}
