'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { GlobalNav } from '../../components/GlobalNav'
import { useLanguage } from '../../components/LanguageProvider'
import { ThreadsPreview } from '../../components/ThreadsPreview'
import { API_BASE_URL } from '../../lib/api'
import { buildDemoHeaders } from '../../lib/demo-access'
import { getDemoSurfaceConfig } from '../../lib/demo-config'
import { APIError, streamSSE } from '../../lib/sse'
import type { ThreadsThread } from '../../lib/threads-types'

type PageStatus = 'idle' | 'loading' | 'streaming' | 'completed' | 'error'
type Language = 'en' | 'zh-TW'

type ThreadsCopy = {
  presets: string[]
  defaultThread: ThreadsThread
  title: string
  subtitle: string
  presetsLabel: string
  topicLabel: string
  topicPlaceholder: string
  goalLabel: string
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
  goalOptions: Array<{ value: string; label: string }>
}

const COPY: Record<Language, ThreadsCopy> = {
  'zh-TW': {
    presets: [
      'AI 工具如何幫小團隊在不增加人力下更快出貨',
      '為什麼多數創辦人低估內容分發',
      '創業團隊最容易忽略的合約風險',
    ],
    defaultThread: {
      format: 'thread',
      reply_bait: '你現在的內容流程，最卡的是想法、產出，還是審稿？',
      posts: [
        { post_number: 1, purpose: 'hook', content: '多數小團隊不是缺內容點子，而是缺一個不會拖慢大家的內容節奏。' },
        { post_number: 2, purpose: 'argument', content: '如果每篇內容都要重新討論角度、格式、語氣和審稿標準，AI 只會讓混亂變快。' },
        { post_number: 3, purpose: 'evidence', content: '真正有效的流程通常很簡單：一個主題，一個明確受眾，三個平台版本，一次人工審稿。' },
        { post_number: 4, purpose: 'cta', content: '你現在的內容流程，最卡的是想法、產出，還是審稿？' },
      ],
    },
    title: '產生像真人寫的 Threads 草稿',
    subtitle: '輸入一個主題，產出單則貼文或一串可直接發布的 Threads。每則都會檢查 500 字限制。',
    presetsLabel: 'Demo 預設',
    topicLabel: '主題',
    topicPlaceholder: '例如：小團隊如何用 AI 減少重複工作',
    goalLabel: '內容目標',
    generating: '產生中…',
    generate: '產生 Threads',
    statusComplete: '已完成，可以複製貼文。',
    statusWorking: '正在產生 Threads 草稿…',
    statusIdle: '選擇主題後開始產生。',
    errors: {
      unavailable: 'Threads 生成服務目前尚未開啟，請稍後再試。',
      invalid: '請輸入更明確的主題。',
      timeout: '生成時間過長，請重新嘗試。',
      generic: '目前無法產生 Threads 內容，請稍後再試。',
      stream: 'Threads 生成失敗。',
      ended: 'Threads 生成尚未完成，串流已提早結束。',
    },
    goalOptions: [
      { value: 'engagement', label: '提高回覆' },
      { value: 'authority', label: '建立觀點' },
      { value: 'share', label: '提高轉發' },
    ],
  },
  en: {
    presets: [
      'How AI tools help small teams ship faster without hiring',
      'Why most founders underestimate content distribution',
      'Contract risks startup teams often overlook',
    ],
    defaultThread: {
      format: 'thread',
      reply_bait: 'Where does your content workflow get stuck: ideas, drafting, or review?',
      posts: [
        { post_number: 1, purpose: 'hook', content: 'Most small teams do not lack content ideas. They lack a publishing rhythm that does not slow everyone down.' },
        { post_number: 2, purpose: 'argument', content: 'If every post requires a fresh debate about angle, format, voice, and review standards, AI only makes the chaos faster.' },
        { post_number: 3, purpose: 'evidence', content: 'A stronger workflow is simple: one topic, one audience, three platform versions, and one human review pass.' },
        { post_number: 4, purpose: 'cta', content: 'Where does your content workflow get stuck: ideas, drafting, or review?' },
      ],
    },
    title: 'Generate Threads drafts that sound human',
    subtitle: 'Enter one topic and generate a single post or thread ready to publish. Each post is checked against the 500-character limit.',
    presetsLabel: 'Demo presets',
    topicLabel: 'Topic',
    topicPlaceholder: 'Example: how small teams use AI to reduce repetitive work',
    goalLabel: 'Content goal',
    generating: 'Generating…',
    generate: 'Generate Threads',
    statusComplete: 'Completed. You can copy the posts.',
    statusWorking: 'Generating Threads draft…',
    statusIdle: 'Choose a topic to start.',
    errors: {
      unavailable: 'Threads generation is not available yet. Please try again later.',
      invalid: 'Please enter a more specific topic.',
      timeout: 'Generation took too long. Please try again.',
      generic: 'Threads content could not be generated right now. Please try again later.',
      stream: 'Threads generation failed.',
      ended: 'Threads generation did not complete before the stream ended.',
    },
    goalOptions: [
      { value: 'engagement', label: 'Increase replies' },
      { value: 'authority', label: 'Build a point of view' },
      { value: 'share', label: 'Increase reposts' },
    ],
  },
}

function friendlyError(error: unknown, copy: ThreadsCopy) {
  if (error instanceof APIError) {
    if (error.status === 503) return copy.errors.unavailable
    if (error.status === 422) return copy.errors.invalid
  }
  if (error instanceof Error && error.message.includes('timed out')) {
    return copy.errors.timeout
  }
  return copy.errors.generic
}

export default function ThreadsPage() {
  const { language } = useLanguage()
  const copy = COPY[language]
  const demoConfig = useMemo(() => getDemoSurfaceConfig('threads'), [])
  const [topic, setTopic] = useState<string>(copy.presets[0])
  const [goal, setGoal] = useState('engagement')
  const [status, setStatus] = useState<PageStatus>('idle')
  const [thread, setThread] = useState<ThreadsThread>(copy.defaultThread)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const isWorking = status === 'loading' || status === 'streaming'

  useEffect(() => {
    setTopic(copy.presets[0])
    setThread(copy.defaultThread)
  }, [copy.defaultThread, copy.presets])

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
        `${API_BASE_URL}/api/threads/generate`,
        {
          topic: trimmedTopic,
          goal,
          locale: language,
        },
        {
          signal: abort.signal,
          timeoutMs: 45_000,
          headers: buildDemoHeaders(demoConfig.apiSurface),
        },
      )) {
        if (abort.signal.aborted) break
        if (chunk.event === 'phase_started') {
          setStatus('streaming')
          continue
        }
        if (chunk.event === 'content_ready') {
          setThread(chunk.data as ThreadsThread)
          setStatus('streaming')
          continue
        }
        if (chunk.event === 'pipeline_completed') {
          const nextThread = chunk.data?.thread as ThreadsThread | undefined
          if (nextThread) setThread(nextThread)
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
        setStatus('error')
        setError(friendlyError(err, copy))
      }
    }
  }

  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text-primary)]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 pb-16 pt-8 sm:px-6 lg:px-8">
        <GlobalNav />

        <section className="grid gap-6 lg:grid-cols-[minmax(280px,0.36fr)_minmax(0,0.64fr)]">
          <aside className="space-y-6 rounded-[20px] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-[var(--shadow-sm)] lg:sticky lg:top-24 lg:self-start">
            <div>
              <p className="text-sm font-semibold tracking-[0.14em] text-[var(--text-tertiary)]">THREADS STUDIO</p>
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
              <label htmlFor="threads-topic" className="block text-sm font-medium text-[var(--text-secondary)]">
                {copy.topicLabel}
              </label>
              <textarea
                id="threads-topic"
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                placeholder={copy.topicPlaceholder}
                className="min-h-[140px] w-full resize-none rounded-[14px] border border-[var(--border)] bg-[var(--bg-sunken)] px-5 py-4 text-base leading-7 text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent)]"
              />
            </div>

            <div className="space-y-3">
              <label htmlFor="threads-goal" className="block text-sm font-medium text-[var(--text-secondary)]">
                {copy.goalLabel}
              </label>
              <select
                id="threads-goal"
                value={goal}
                onChange={(event) => setGoal(event.target.value)}
                className="h-12 w-full rounded-[12px] border border-[var(--border)] bg-[var(--bg-elevated)] px-4 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-bold)]"
              >
                {copy.goalOptions.map((option) => (
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
            <ThreadsPreview thread={thread} />
          </section>
        </section>
      </div>
    </main>
  )
}
