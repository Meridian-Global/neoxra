'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { FacebookPreview } from '../../components/FacebookPreview'
import { GlobalNav } from '../../components/GlobalNav'
import { QuotaWarning, QuotaExceededModal, isQuotaExceededError } from '../../components/QuotaWarning'
import { useLanguage } from '../../components/LanguageProvider'
import { API_BASE_URL } from '../../lib/api'
import { buildDemoHeaders } from '../../lib/demo-access'
import { getDemoSurfaceConfig } from '../../lib/demo-config'
import type { FacebookPost } from '../../lib/facebook-types'
import { APIError, streamSSE } from '../../lib/sse'

type PageStatus = 'idle' | 'loading' | 'streaming' | 'completed' | 'error'
type Language = 'en' | 'zh-TW'

type FacebookCopy = {
  presets: string[]
  defaultPost: FacebookPost
  title: string
  subtitle: string
  presetsLabel: string
  topicLabel: string
  topicPlaceholder: string
  generating: string
  generate: string
  statusComplete: string
  statusWorking: string
  statusIdle: string
  errors: {
    unavailable: string
    invalid: string
    timeout: string
    generic: string
    stream: string
    ended: string
  }
}

const COPY: Record<Language, FacebookCopy> = {
  'zh-TW': {
    presets: [
      'AI 工具如何幫小團隊在不增加人力下更快出貨',
      '為什麼多數創辦人低估內容分發',
      '常見法律錯誤如何讓新創合約變得更難處理',
    ],
    defaultPost: {
      hook: '很多小團隊以為內容做不起來，是因為人手不夠。',
      body:
        '但真正卡住的，通常不是點子，而是流程。每次要發文都重新討論角度、語氣、格式和審稿標準，團隊很快就會把內容當成額外負擔。比較好的做法，是先把一個主題整理成核心觀點，再依照不同平台改寫。',
      discussion_prompt: '你們團隊目前最卡的是想主題、寫初稿，還是最後審稿？',
      share_hook: '分享給那個正在用小團隊做大內容量的創辦人或營運夥伴。',
      image_recommendation: '使用一張簡潔 checklist 圖，整理主題、平台改寫、人工審稿三步驟。',
    },
    title: '把 Instagram 內容改寫成 Facebook 貼文',
    subtitle: '先產生 Instagram 內容，再延展成更長、更適合討論與分享的 Facebook 版本。',
    presetsLabel: 'Demo 預設',
    topicLabel: '主題',
    topicPlaceholder: '例如：小團隊如何用 AI 減少重複工作',
    generating: '產生中…',
    generate: '產生 Facebook',
    statusComplete: '已完成，可以複製 Facebook 貼文。',
    statusWorking: '正在改寫 Facebook 版本…',
    statusIdle: '選擇主題後開始產生。',
    errors: {
      unavailable: 'Facebook 生成服務目前尚未開啟，請稍後再試。',
      invalid: '請輸入更明確的主題。',
      timeout: '生成時間過長，請重新嘗試。',
      generic: '目前無法產生 Facebook 內容，請稍後再試。',
      stream: 'Facebook 生成失敗。',
      ended: 'Facebook 生成尚未完成，串流已提早結束。',
    },
  },
  en: {
    presets: [
      'How AI tools help small teams ship faster without hiring',
      'Why most founders underestimate content distribution',
      'Common legal mistakes that make startup contracts harder to manage',
    ],
    defaultPost: {
      hook: 'Many small teams think content is hard because they do not have enough people.',
      body:
        'But the real bottleneck is usually not ideas. It is the process. When every post requires a new debate about angle, voice, format, and review standards, content quickly becomes extra work. A better approach is to turn one topic into a clear point of view, then adapt it for each platform.',
      discussion_prompt: 'Where does your team get stuck most often: ideas, drafting, or final review?',
      share_hook: 'Share this with a founder or operator trying to create more content with a small team.',
      image_recommendation: 'Use a simple checklist showing topic, platform adaptation, and human review.',
    },
    title: 'Turn Instagram content into Facebook posts',
    subtitle: 'Start from Instagram content, then expand it into a longer Facebook-native version built for discussion and sharing.',
    presetsLabel: 'Demo presets',
    topicLabel: 'Topic',
    topicPlaceholder: 'Example: how small teams use AI to reduce repetitive work',
    generating: 'Generating…',
    generate: 'Generate Facebook',
    statusComplete: 'Completed. You can copy the Facebook post.',
    statusWorking: 'Rewriting for Facebook…',
    statusIdle: 'Choose a topic to start.',
    errors: {
      unavailable: 'Facebook generation is not available yet. Please try again later.',
      invalid: 'Please enter a more specific topic.',
      timeout: 'Generation took too long. Please try again.',
      generic: 'Facebook content could not be generated right now. Please try again later.',
      stream: 'Facebook generation failed.',
      ended: 'Facebook generation did not complete before the stream ended.',
    },
  },
}

function friendlyError(error: unknown, copy: FacebookCopy) {
  if (error instanceof APIError) {
    if (error.status === 503) return copy.errors.unavailable
    if (error.status === 422) return copy.errors.invalid
  }
  if (error instanceof Error && error.message.includes('timed out')) {
    return copy.errors.timeout
  }
  return copy.errors.generic
}

export default function FacebookPage() {
  const { language } = useLanguage()
  const copy = COPY[language]
  const demoConfig = useMemo(() => getDemoSurfaceConfig('facebook'), [])
  const [topic, setTopic] = useState<string>(copy.presets[0])
  const [status, setStatus] = useState<PageStatus>('idle')
  const [post, setPost] = useState<FacebookPost>(copy.defaultPost)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const [showQuotaModal, setShowQuotaModal] = useState(false)
  const isWorking = status === 'loading' || status === 'streaming'

  useEffect(() => {
    setTopic(copy.presets[0])
    setPost(copy.defaultPost)
  }, [copy.defaultPost, copy.presets])

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
        `${API_BASE_URL}/api/facebook/generate`,
        {
          topic: trimmedTopic,
          locale: language,
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
        if (chunk.event === 'content_ready') {
          setPost(chunk.data as FacebookPost)
          setStatus('streaming')
          continue
        }
        if (chunk.event === 'pipeline_completed') {
          const nextPost = chunk.data?.facebook_post as FacebookPost | undefined
          if (nextPost) setPost(nextPost)
          setStatus('completed')
          return
        }
        if (chunk.event === 'error') {
          throw new Error(typeof chunk.data?.message === 'string' ? chunk.data.message : copy.errors.stream)
        }
      }
      if (!abort.signal.aborted) {
        throw new Error(copy.errors.ended)
      }
    } catch (err) {
      if (!abort.signal.aborted) {
        if (isQuotaExceededError(err)) {
          setShowQuotaModal(true)
          setStatus('error')
          return
        }
        setStatus('error')
        setError(friendlyError(err, copy))
      }
    }
  }

  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text-primary)]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 pb-16 pt-8 sm:px-6 lg:px-8">
        <GlobalNav />
        <QuotaWarning />

        <section className="grid gap-6 lg:grid-cols-[minmax(280px,0.36fr)_minmax(0,0.64fr)]">
          <aside className="space-y-6 rounded-[20px] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-[var(--shadow-sm)] lg:sticky lg:top-24 lg:self-start">
            <div>
              <p className="text-sm font-semibold tracking-[0.14em] text-[var(--text-tertiary)]">FACEBOOK ADAPTER</p>
              <h1 className="mt-3 text-3xl font-bold tracking-[-0.03em] text-[var(--text-primary)]">
                {copy.title}
              </h1>
              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                {copy.subtitle}
              </p>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium text-[var(--text-secondary)]">{copy.presetsLabel}</p>
              <div className="flex flex-wrap gap-2">
                {copy.presets.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setTopic(preset)}
                    className="rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--accent)]"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label htmlFor="facebook-topic" className="block text-sm font-medium text-[var(--text-secondary)]">
                {copy.topicLabel}
              </label>
              <textarea
                id="facebook-topic"
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                placeholder={copy.topicPlaceholder}
                className="min-h-[140px] w-full resize-none rounded-[14px] border border-[var(--border)] bg-[var(--bg-sunken)] px-5 py-4 text-base leading-7 text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent)]"
              />
            </div>

            <button
              type="button"
              onClick={() => void handleGenerate()}
              disabled={isWorking || !topic.trim()}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[8px] bg-[image:var(--gradient-cta)] px-6 text-[15px] font-semibold text-white transition-all duration-150 hover:-translate-y-0.5 hover:bg-[image:var(--gradient-cta-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isWorking ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  {copy.generating}
                </>
              ) : (
                copy.generate
              )}
            </button>

            {error ? (
              <div className="rounded-[12px] border border-[var(--border)] bg-[var(--bg-sunken)] px-4 py-3 text-sm leading-6 text-[var(--text-secondary)]">
                {error}
              </div>
            ) : null}
          </aside>

          <section className="space-y-5">
            <div className="rounded-[20px] border border-[var(--border)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow-sm)]">
              <p className="text-xs font-semibold tracking-[0.12em] text-[var(--text-tertiary)]">STATUS</p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                {status === 'completed'
                  ? copy.statusComplete
                  : status === 'streaming' || status === 'loading'
                    ? copy.statusWorking
                    : copy.statusIdle}
              </p>
            </div>
            <FacebookPreview post={post} />
          </section>
        </section>
      </div>
      {showQuotaModal && <QuotaExceededModal onClose={() => setShowQuotaModal(false)} />}
    </main>
  )
}
