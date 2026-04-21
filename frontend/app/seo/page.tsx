'use client'

import { useMemo, useRef, useState } from 'react'
import { GlobalNav } from '../../components/GlobalNav'
import { SeoArticlePreview } from '../../components/SeoArticlePreview'
import { API_BASE_URL } from '../../lib/api'
import { buildDemoHeaders } from '../../lib/demo-access'
import { getDemoSurfaceConfig } from '../../lib/demo-config'
import { APIError, streamSSE } from '../../lib/sse'
import { toHTML, toMarkdown } from '../../lib/seo-export'
import type { SeoArticle } from '../../lib/seo-types'

type PageStatus = 'idle' | 'loading' | 'streaming' | 'completed' | 'error'

const GOAL_OPTIONS = [
  { value: 'authority', label: '建立專業權威' },
  { value: 'conversion', label: '引導諮詢轉換' },
  { value: 'education', label: '教育型搜尋內容' },
] as const

const DEFAULT_ARTICLE: SeoArticle = {
  metadata: {
    title: '車禍理賠怎麼算？流程、時效與注意事項一次看懂',
    meta_description: '整理車禍理賠流程、常見賠償項目與處理時效，協助讀者快速理解事故後該準備哪些資料。',
    url_slug: 'car-accident-claim-process',
    primary_keyword: '車禍理賠',
    secondary_keywords: ['車禍賠償', '交通事故理賠', '損害賠償'],
    target_search_intent: '事故後想了解理賠流程與可主張項目的讀者',
  },
  h1: '車禍理賠怎麼算？流程、時效與注意事項一次看懂',
  introduction:
    '車禍發生後，很多人第一時間只關心保險公司會不會賠，卻忽略了證據保存、醫療紀錄與求償時效。實務上，理賠金額能不能談得合理，往往取決於事故後前幾天是否把資料整理完整。',
  sections: [
    {
      heading: '車禍發生後第一時間要做什麼',
      heading_level: 2,
      content: '先確認安全並報警，接著拍攝現場、車損、路口號誌與受傷情況。如果有行車紀錄器或目擊者，也要盡快保存資料。即使當下覺得只是輕傷，也建議就醫留下診斷紀錄。',
    },
    {
      heading: '常見可以主張的理賠項目',
      heading_level: 2,
      content: '常見項目包括醫療費、交通費、看護費、不能工作的收入損失、車輛修繕費，以及精神慰撫金。每一項都需要對應的單據、診斷證明或工作收入資料支持。',
    },
    {
      heading: '為什麼不要太快簽和解',
      heading_level: 2,
      content: '和解書一旦簽下去，通常會影響後續再主張其他損害的空間。若傷勢還沒穩定、責任比例還沒釐清，或保險公司只提供概略金額，都不建議急著簽字。',
    },
  ],
  conclusion:
    '車禍理賠不是只看保險公司願意賠多少，而是要先確認責任、損害項目與證據是否完整。越早整理資料，後續談判越不容易被動。',
  summary_points: ['事故後先報警、拍照、就醫', '醫療費與工作損失都要保存證明', '和解前應確認責任比例與實際損害'],
  cta: '如果你正在處理車禍理賠爭議，建議先整理事故資料與醫療紀錄，再請專業人士協助判斷可主張的項目。',
  estimated_word_count: 950,
}

function CopyButton({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1400)
  }

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      className="inline-flex h-10 items-center justify-center rounded-[8px] border border-[var(--border)] bg-[var(--bg-elevated)] px-4 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--bg-sunken)]"
    >
      {copied ? '已複製' : label}
    </button>
  )
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="rounded-[var(--card-radius)] border border-[var(--border)] bg-[var(--bg-elevated)] p-6">
        <div className="h-4 w-28 rounded bg-[var(--bg-sunken)]" />
        <div className="mt-4 h-8 w-3/4 rounded bg-[var(--bg-sunken)]" />
        <div className="mt-3 h-4 w-full rounded bg-[var(--bg-sunken)]" />
        <div className="mt-2 h-4 w-2/3 rounded bg-[var(--bg-sunken)]" />
      </div>
      <div className="rounded-[var(--card-radius)] border border-[var(--border)] bg-[var(--bg-elevated)] p-8">
        <div className="h-10 w-4/5 rounded bg-[var(--bg-sunken)]" />
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="mt-7 space-y-3">
            <div className="h-6 w-1/2 rounded bg-[var(--bg-sunken)]" />
            <div className="h-4 w-full rounded bg-[var(--bg-sunken)]" />
            <div className="h-4 w-5/6 rounded bg-[var(--bg-sunken)]" />
          </div>
        ))}
      </div>
    </div>
  )
}

function friendlyError(error: unknown) {
  if (error instanceof APIError) {
    if (error.status === 503) return 'SEO 文章產生服務目前尚未開啟，請稍後再試。'
    if (error.status === 422) return '請輸入更明確的主題。'
  }
  if (error instanceof Error && error.message.includes('timed out')) {
    return '產生時間過長，請重新嘗試。'
  }
  return '目前無法產生 SEO 文章，請稍後再試。'
}

export default function SeoPage() {
  const demoConfig = useMemo(() => getDemoSurfaceConfig('instagram'), [])
  const [topic, setTopic] = useState('車禍理賠流程')
  const [goal, setGoal] = useState('authority')
  const [status, setStatus] = useState<PageStatus>('idle')
  const [article, setArticle] = useState<SeoArticle>(DEFAULT_ARTICLE)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const isWorking = status === 'loading' || status === 'streaming'

  async function handleGenerate() {
    const trimmedTopic = topic.trim()
    if (!trimmedTopic) return

    abortRef.current?.abort()
    const abort = new AbortController()
    abortRef.current = abort
    setStatus('loading')
    setError(null)

    try {
      for await (const chunk of streamSSE(
        `${API_BASE_URL}/api/seo/generate`,
        {
          topic: trimmedTopic,
          goal,
          locale: 'zh-TW',
        },
        {
          signal: abort.signal,
          timeoutMs: 60_000,
          headers: buildDemoHeaders(demoConfig.apiSurface),
        },
      )) {
        if (abort.signal.aborted) break
        if (chunk.event === 'phase_started') {
          setStatus('streaming')
          continue
        }
        if (chunk.event === 'article_ready') {
          setArticle(chunk.data as SeoArticle)
          setStatus('streaming')
          continue
        }
        if (chunk.event === 'pipeline_completed') {
          const nextArticle = chunk.data?.article as SeoArticle | undefined
          if (nextArticle) setArticle(nextArticle)
          setStatus('completed')
          return
        }
        if (chunk.event === 'error') {
          throw new Error(typeof chunk.data?.message === 'string' ? chunk.data.message : 'SEO 文章產生失敗。')
        }
      }
    } catch (err) {
      if (!abort.signal.aborted) {
        setStatus('error')
        setError(friendlyError(err))
      }
    }
  }

  return (
    <main className="min-h-screen bg-transparent text-[var(--text-primary)]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 pb-16 pt-8 sm:px-6 lg:px-8">
        <GlobalNav />

        <section className="grid gap-6 lg:grid-cols-[minmax(280px,0.36fr)_minmax(0,0.64fr)]">
          <aside className="space-y-6 rounded-[20px] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-[var(--shadow-sm)] lg:sticky lg:top-24 lg:self-start">
            <div>
              <p className="text-sm font-semibold tracking-[0.14em] text-[var(--text-tertiary)]">SEO STUDIO</p>
              <h1 className="mt-3 text-3xl font-bold tracking-[-0.03em] text-[var(--text-primary)]">
                產生可發布的 SEO 文章
              </h1>
              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                輸入一個主題，Neoxra 會產出含 metadata、H1、段落架構與 CTA 的文章初稿。
              </p>
            </div>

            <div className="space-y-3">
              <label htmlFor="seo-topic" className="block text-sm font-medium text-[var(--text-secondary)]">
                文章主題
              </label>
              <input
                id="seo-topic"
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                placeholder="輸入主題，例如：遺產繼承程序"
                className="h-14 w-full rounded-[14px] border border-[var(--border)] bg-[var(--bg-sunken)] px-5 text-base text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent)]"
              />
            </div>

            <div className="space-y-3">
              <label htmlFor="seo-goal" className="block text-sm font-medium text-[var(--text-secondary)]">
                文章目標
              </label>
              <select
                id="seo-goal"
                value={goal}
                onChange={(event) => setGoal(event.target.value)}
                className="h-12 w-full rounded-[12px] border border-[var(--border)] bg-[var(--bg-elevated)] px-4 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-bold)]"
              >
                {GOAL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => void handleGenerate()}
              disabled={isWorking || !topic.trim()}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[8px] bg-[var(--bg-accent)] px-6 text-[15px] font-semibold text-[var(--text-on-accent)] transition-all duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isWorking ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  產生中…
                </>
              ) : (
                '產生 SEO 文章'
              )}
            </button>

            {error ? (
              <div className="rounded-[12px] border border-[var(--border)] bg-[var(--bg-sunken)] px-4 py-3 text-sm leading-6 text-[var(--text-secondary)]">
                {error}
              </div>
            ) : null}
          </aside>

          <section className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-[var(--border)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow-sm)]">
              <div>
                <p className="text-xs font-semibold tracking-[0.12em] text-[var(--text-tertiary)]">EXPORT</p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">複製成 Markdown 或 HTML，直接貼到 CMS / WordPress。</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <CopyButton label="複製 Markdown" value={toMarkdown(article)} />
                <CopyButton label="複製 HTML" value={toHTML(article)} />
              </div>
            </div>

            {isWorking ? <LoadingSkeleton /> : <SeoArticlePreview article={article} />}
          </section>
        </section>
      </div>
    </main>
  )
}
