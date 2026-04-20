'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLanguage } from '../LanguageProvider'
import { API_BASE_URL } from '../../lib/api'
import { buildDemoHeaders } from '../../lib/demo-access'
import { sendBeaconAnalyticsEvent, trackPlausibleEvent } from '../../lib/analytics'
import { getDemoSurfaceConfig } from '../../lib/demo-config'
import { APIError, streamSSE } from '../../lib/sse'

type Status = 'idle' | 'running' | 'done' | 'error'
type StepId = 'planner' | 'agents' | 'critic'
type PlatformKey = 'linkedin' | 'instagram' | 'threads'

type OutputState = Record<
  PlatformKey,
  {
    label: string
    status: string
    content: string
  }
>

const KNOWN_EVENTS = new Set([
  'pipeline_started',
  'phase_started',
  'brief_ready',
  'platform_output',
  'review_ready',
  'pipeline_completed',
  'error',
])

const KNOWN_PLATFORMS = new Set<PlatformKey>(['linkedin', 'instagram', 'threads'])

function createDemoCopy(language: 'en' | 'zh-TW') {
  if (language === 'zh-TW') {
    return {
      defaultIdea: 'AI 工具如何幫助小團隊在不增加人力的情況下更快推進。',
      stageCopy: {
        pipeline_started: { step: 'planner', message: '正在開啟即時生成流程。' },
        briefing: { step: 'planner', message: '正在建立核心訊息與受眾 framing。' },
        drafting: { step: 'agents', message: '正在為各平台起草第一版內容。' },
        refining: { step: 'agents', message: '正在優化各平台版本的結構與說服力。' },
        review: { step: 'critic', message: '正在檢查整體品質與一致性。' },
      } as Record<string, { step: StepId; message: string }>,
      platformStatuses: {
        drafted: '已起稿',
        refined: '已優化',
      } as Record<string, string>,
      platformMeta: [
        {
          key: 'linkedin' as const,
          eyebrow: '專業敘事',
          rationale: '更強調權威感、商業背景與較成熟的高階閱讀方式。',
        },
        {
          key: 'instagram' as const,
          eyebrow: '視覺優先敘事',
          rationale: '為 hook、視覺節奏與適合貼文或輪播的內容形式而設計。',
        },
        {
          key: 'threads' as const,
          eyebrow: '快速對話觀點',
          rationale: '語氣更輕、更快，更適合快速滑讀與互動式討論。',
        },
      ],
      outputs: {
        linkedin: 'LinkedIn',
        instagram: 'Instagram',
        threads: 'Threads',
        waiting: '等待中',
      },
      steps: {
        planner: '訊息策略',
        agents: '平台輸出',
        critic: '最終審閱',
        waiting: '等待中',
        completed: '已完成',
        ready: '準備完成',
        live: '直播中',
        needsAttention: '需要注意',
      },
      errors: {
        validation: '請檢查 demo 輸入內容後再試一次。',
        unavailable: '系統暫時無法使用，請稍後再試。',
        generic: '發生了一點問題，請再試一次。',
        timeout: 'demo 執行時間過長，請重新嘗試。',
        unexpected: '即時串流回傳了未預期的內容。',
        stopped: '流程在最終輸出完成前就停止了。',
        earlyEnd: '串流在收到最終 completion signal 前就結束了。',
      },
      section: {
        eyebrow: '即時 demo',
        title: '展示產品，而不是只講產品。',
        body: '輸入一個想法，觀看 Neoxra 即時產出 planner brief、協調各平台代理，並回傳平台原生內容。',
        tryIdea: '試一個想法',
        helper: '以產品層級進度顯示即時多平台生成',
        input: '輸入',
        placeholder: '輸入你想轉成內容系統的主題。',
        generate: '開始生成',
        generating: '生成中…',
        stop: '停止',
        pipelineStatus: '流程狀態',
        plannerBrief: '策略 brief',
        demoUnavailable: 'Demo 暫時不可用',
        generatedOutputs: '生成結果',
        generatedHelper: '一次生成 LinkedIn、Instagram 與 Threads',
        native: '平台原生',
        presentationView: '展示檢視',
        copyReady: '可直接複製',
        stillPreparing: '這個平台版本仍在準備中。',
        runToGenerate: '執行 demo 後，這裡會出現可展示的版本。',
        receivingLive: '正在接收即時輸出',
        queued: '這個平台正在排隊處理',
        readyToReview: '已可檢視或複製進簡報',
        waitingToGenerate: '等待生成',
        copy: '複製',
        copied: '已複製',
        executiveSummary: '高階摘要',
        executiveFallback: '流程完成後，這裡會顯示一段簡短的品質摘要。',
        readyToGenerate: '準備開始生成。',
        runStopped: 'Demo 已停止。',
        completed: '三個平台的內容已準備好，可直接展示。',
      },
    }
  }

  return {
    defaultIdea: 'How AI tools help small teams ship faster without adding headcount.',
    stageCopy: {
      pipeline_started: { step: 'planner', message: 'Opening the live generation workflow.' },
      briefing: { step: 'planner', message: 'Building the core message and audience framing.' },
      drafting: { step: 'agents', message: 'Drafting the first version for each platform.' },
      refining: { step: 'agents', message: 'Refining each platform version for stronger fit and clarity.' },
      review: { step: 'critic', message: 'Reviewing the final set for quality and consistency.' },
    } as Record<string, { step: StepId; message: string }>,
    platformStatuses: {
      drafted: 'Drafted',
      refined: 'Refined',
    } as Record<string, string>,
    platformMeta: [
      {
        key: 'linkedin' as const,
        eyebrow: 'Professional narrative',
        rationale: 'Framed for authority, business context, and a more executive reading style.',
      },
      {
        key: 'instagram' as const,
        eyebrow: 'Visual-first storytelling',
        rationale: 'Structured for hooks, visual pacing, and content that works well as a carousel or post.',
      },
      {
        key: 'threads' as const,
        eyebrow: 'Fast conversational take',
        rationale: 'Written to feel lighter, quicker, and more discussion-friendly for fast social consumption.',
      },
    ],
    outputs: {
      linkedin: 'LinkedIn',
      instagram: 'Instagram',
      threads: 'Threads',
      waiting: 'Waiting',
    },
    steps: {
      planner: 'message',
      agents: 'channels',
      critic: 'review',
      waiting: 'Waiting',
      completed: 'Completed',
      ready: 'ready',
      live: 'live',
      needsAttention: 'needs attention',
    },
    errors: {
      validation: 'Please check the demo input and try again.',
      unavailable: 'System temporarily unavailable. Please retry in a moment.',
      generic: 'Something went wrong. Please try again.',
      timeout: 'The demo took too long to finish. Please retry.',
      unexpected: 'The live stream returned an unexpected response.',
      stopped: 'The run stopped before the final outputs were ready.',
      earlyEnd: 'The stream ended before the final completion signal arrived.',
    },
    section: {
      eyebrow: 'Live demo',
      title: 'Show the product, not the pitch.',
      body: 'Enter one idea and watch Neoxra build a strategy brief, create channel-ready outputs, and return presentation-friendly content in real time.',
      tryIdea: 'Try an idea',
      helper: 'Live multi-platform generation with product-level progress phases',
      input: 'Input',
      placeholder: 'Explain the idea you want to turn into content.',
      generate: 'Generate',
      generating: 'Generating…',
      stop: 'Stop',
      pipelineStatus: 'Pipeline status',
      plannerBrief: 'Strategy brief',
      demoUnavailable: 'Demo temporarily unavailable',
      generatedOutputs: 'Generated outputs',
      generatedHelper: 'LinkedIn, Instagram, and Threads from one run',
      native: 'platform-native',
      presentationView: 'Presentation view',
      copyReady: 'Copy-ready',
      stillPreparing: 'This platform version is still being prepared.',
      runToGenerate: 'Run the demo to generate a presentation-ready version for this platform.',
      receivingLive: 'Receiving live output',
      queued: 'Queued for this platform',
      readyToReview: 'Ready to review or copy into slides',
      waitingToGenerate: 'Waiting to generate',
      copy: 'Copy',
      copied: 'Copied',
      executiveSummary: 'Executive summary',
      executiveFallback: 'A short quality summary will appear here after the run completes.',
      readyToGenerate: 'Ready to generate.',
      runStopped: 'Demo run stopped.',
      completed: 'Three platform-ready outputs are ready to present.',
    },
  }
}

function createInitialOutputs(copy: ReturnType<typeof createDemoCopy>): OutputState {
  return {
    linkedin: { label: copy.outputs.linkedin, status: copy.outputs.waiting, content: '' },
    instagram: { label: copy.outputs.instagram, status: copy.outputs.waiting, content: '' },
    threads: { label: copy.outputs.threads, status: copy.outputs.waiting, content: '' },
  }
}

function stepState(step: StepId, activeStep: StepId, status: Status) {
  if (status === 'error') return 'error'
  if (status === 'done') return 'done'
  if (status !== 'running') return 'idle'
  if (step === activeStep) return 'active'
  const order: StepId[] = ['planner', 'agents', 'critic']
  return order.indexOf(step) < order.indexOf(activeStep) ? 'done' : 'idle'
}

function toFriendlyError(error: unknown, copy: ReturnType<typeof createDemoCopy>): string {
  if (error instanceof APIError) {
    if (error.status === 422) {
      return copy.errors.validation
    }
    if (error.status === 503) {
      return copy.errors.unavailable
    }
    return copy.errors.generic
  }

  if (error instanceof Error && error.message.includes('timed out')) {
    return copy.errors.timeout
  }

  return copy.errors.generic
}

export function DemoSection() {
  const { language } = useLanguage()
  const copy = createDemoCopy(language)
  const demoConfig = useMemo(() => getDemoSurfaceConfig('landing'), [])
  const [idea, setIdea] = useState(copy.defaultIdea)
  const [status, setStatus] = useState<Status>('idle')
  const [activeStep, setActiveStep] = useState<StepId>('planner')
  const [stageMessage, setStageMessage] = useState(copy.section.readyToGenerate)
  const [outputs, setOutputs] = useState<OutputState>(() => createInitialOutputs(copy))
  const [criticNotes, setCriticNotes] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState<string | null>(null)
  const [briefPreview, setBriefPreview] = useState<Array<[string, string]>>([])
  const [activePlatform, setActivePlatform] = useState<PlatformKey | null>(null)

  const abortRef = useRef<AbortController | null>(null)
  const latestIdeaRef = useRef(copy.defaultIdea)

  useEffect(() => {
    latestIdeaRef.current = idea
  }, [idea])

  useEffect(() => {
    function handlePageHide() {
      if (status !== 'running') return
      trackPlausibleEvent('demo_abandoned', { surface: 'landing', source: 'landing' })
      sendBeaconAnalyticsEvent({
        eventName: 'demo_abandoned',
        route: '/',
        surface: 'landing',
        source: 'landing',
        locale: language,
        metadata: { reason: 'pagehide', idea_length: latestIdeaRef.current.trim().length },
      })
    }

    window.addEventListener('pagehide', handlePageHide)
    return () => window.removeEventListener('pagehide', handlePageHide)
  }, [language, status])

  const copyText = useCallback((key: string, value: string) => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(key)
      window.setTimeout(() => setCopied(null), 1400)
    })
  }, [])

  const run = useCallback(async () => {
    if (!idea.trim() || status === 'running') return

    const abortController = new AbortController()
    abortRef.current = abortController
    let completed = false
    let failed = false

    setStatus('running')
    setActiveStep('planner')
    setStageMessage(copy.stageCopy.briefing.message)
    setOutputs(createInitialOutputs(copy))
    setCriticNotes('')
    setError('')
    setBriefPreview([])
    setActivePlatform(null)
    trackPlausibleEvent('demo_started', { surface: 'landing', source: 'landing', locale: language })

    try {
      for await (const { event, data } of streamSSE(
        `${API_BASE_URL}/api/run`,
        { idea: idea.trim(), locale: language },
        {
          signal: abortController.signal,
          headers: buildDemoHeaders(demoConfig.apiSurface),
        }
      )) {
        if (abortController.signal.aborted) break

        if (!KNOWN_EVENTS.has(event)) {
          setStatus('error')
          setError(copy.errors.generic)
          setStageMessage(copy.errors.unexpected)
          setActivePlatform(null)
          failed = true
          break
        }

        if (event === 'pipeline_started') {
          const stage = copy.stageCopy.pipeline_started
          setActiveStep(stage.step)
          setStageMessage(stage.message)
          setActivePlatform(null)
        }

        if (event === 'phase_started' && typeof data?.phase === 'string') {
          const stage = copy.stageCopy[data.phase]
          if (stage) {
            setActiveStep(stage.step)
            setStageMessage(stage.message)
            setActivePlatform(
              typeof data?.platform === 'string' ? (data.platform as PlatformKey) : null
            )
          }
        }

        if (event === 'brief_ready' && data?.brief && typeof data.brief === 'object') {
          const preview = Object.entries(data.brief)
            .filter(([, value]) => typeof value === 'string' && value.trim())
            .slice(0, 3) as Array<[string, string]>
          setBriefPreview(preview)
          continue
        }

        if (
          event === 'platform_output' &&
          typeof data?.platform === 'string' &&
          typeof data?.status === 'string' &&
          typeof data?.content === 'string'
        ) {
          if (!KNOWN_PLATFORMS.has(data.platform as PlatformKey)) continue
          const platform = data.platform as PlatformKey
          setOutputs(prev => ({
            ...prev,
            [platform]: {
              ...prev[platform],
              status: copy.platformStatuses[data.status] ?? data.status,
              content: data.content,
            },
          }))
          setActivePlatform(platform)
          continue
        }

        if (event === 'review_ready' && typeof data?.notes === 'string') {
          setCriticNotes(data.notes)
          setActivePlatform(null)
          continue
        }

        if (event === 'pipeline_completed') {
          setOutputs(prev => ({
            linkedin: {
              ...prev.linkedin,
              status: copy.steps.completed,
              content:
                typeof data?.linkedin_final === 'string' ? data.linkedin_final : prev.linkedin.content,
            },
            instagram: {
              ...prev.instagram,
              status: copy.steps.completed,
              content:
                typeof data?.instagram_final === 'string'
                  ? data.instagram_final
                  : prev.instagram.content,
            },
            threads: {
              ...prev.threads,
              status: copy.steps.completed,
              content:
                typeof data?.threads_final === 'string' ? data.threads_final : prev.threads.content,
            },
          }))
          if (typeof data?.critic_notes === 'string') setCriticNotes(data.critic_notes)
          setStageMessage(copy.section.completed)
          completed = true
          setStatus('done')
          setActivePlatform(null)
          trackPlausibleEvent('demo_completed', { surface: 'landing', source: 'landing', locale: language })
        }

        if (event === 'error') {
          setStatus('error')
          setError(copy.errors.unavailable)
          setStageMessage(copy.errors.stopped)
          setActivePlatform(null)
          failed = true
          trackPlausibleEvent('demo_failed', { surface: 'landing', source: 'landing', locale: language })
          break
        }
      }

      if (!abortController.signal.aborted && !completed && !failed) {
        setStatus('error')
        setError(copy.errors.generic)
        setStageMessage(copy.errors.earlyEnd)
        setActivePlatform(null)
        trackPlausibleEvent('demo_failed', { surface: 'landing', source: 'landing', locale: language })
      }
    } catch (err) {
      if (!abortController.signal.aborted && (!(err instanceof DOMException) || err.name !== 'AbortError')) {
        setStatus('error')
        setError(toFriendlyError(err, copy))
        setStageMessage(copy.errors.stopped)
        setActivePlatform(null)
        trackPlausibleEvent('demo_failed', { surface: 'landing', source: 'landing', locale: language })
      }
    }
  }, [copy, demoConfig.apiSurface, idea, language, status])

  const stop = useCallback(() => {
    abortRef.current?.abort()
    setStatus('idle')
    setStageMessage(copy.section.runStopped)
    setActivePlatform(null)
    trackPlausibleEvent('demo_abandoned', { surface: 'landing', source: 'landing' })
    sendBeaconAnalyticsEvent({
      eventName: 'demo_abandoned',
      route: '/',
      surface: 'landing',
      source: 'landing',
      locale: language,
      metadata: { reason: 'manual_stop', idea_length: latestIdeaRef.current.trim().length },
    })
  }, [copy.section.runStopped])

  const hasAnyOutput = Object.values(outputs).some(output => output.content)

  return (
    <section id="demo" className="scroll-mt-24">
      <div className="mb-6 max-w-2xl">
        <div className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--subtle)]">
          {copy.section.eyebrow}
        </div>
        <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[var(--text)] sm:text-4xl">
          {copy.section.title}
        </h2>
        <p className="mt-3 text-base leading-7 text-[var(--muted)]">
          {copy.section.body}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.86fr)_minmax(420px,1.14fr)]">
        <div className="rounded-[28px] border border-[var(--border)] bg-[var(--panel)] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.2)] backdrop-blur sm:p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-[var(--text)]">{copy.section.tryIdea}</div>
              <div className="text-sm text-[var(--subtle)]">{copy.section.helper}</div>
            </div>
            <div className="rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--subtle)]">
              /api/run
            </div>
          </div>

          <label className="mb-3 block text-xs font-medium uppercase tracking-[0.22em] text-[var(--subtle)]">
            {copy.section.input}
          </label>
          <textarea
            value={idea}
            onChange={event => setIdea(event.target.value)}
            className="min-h-[180px] w-full resize-none rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4 text-base leading-7 text-[var(--text)] outline-none ring-0 transition placeholder:text-[var(--subtle)] focus:border-[var(--accent)]"
            placeholder={copy.section.placeholder}
          />

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={run}
              disabled={status === 'running' || !idea.trim()}
              className="inline-flex items-center justify-center rounded-xl bg-[var(--text)] px-5 py-3 text-sm font-semibold text-[var(--bg)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {status === 'running' ? copy.section.generating : copy.section.generate}
            </button>

            <button
              type="button"
              onClick={stop}
              disabled={status !== 'running'}
              className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--panel)] px-5 py-3 text-sm font-medium text-[var(--muted)] transition hover:bg-[var(--surface-2)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {copy.section.stop}
            </button>
          </div>

          <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="text-sm font-medium text-[var(--text)]">{copy.section.pipelineStatus}</div>
              <div className="text-xs uppercase tracking-[0.18em] text-[var(--subtle)]">
                {status === 'running'
                  ? copy.steps.live
                  : status === 'done'
                    ? copy.steps.ready
                    : status === 'error'
                      ? copy.steps.needsAttention
                      : copy.steps.ready}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {(['planner', 'agents', 'critic'] as StepId[]).map(step => {
                const state = stepState(step, activeStep, status)

                return (
                  <div
                    key={step}
                    className={[
                      'rounded-2xl border px-4 py-3 text-sm transition',
                      state === 'active' && 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text)] shadow-[0_0_0_1px_rgba(139,92,246,0.12),0_0_28px_rgba(139,92,246,0.14)]',
                      state === 'done' && 'border-emerald-400/30 bg-emerald-400/10 text-[var(--text)]',
                      state === 'error' && 'border-rose-400/40 bg-rose-400/10 text-[var(--text)]',
                      state === 'idle' && 'border-[var(--border)] bg-[var(--panel)] text-[var(--muted)]',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <div className="text-xs uppercase tracking-[0.18em] text-[var(--subtle)]">{copy.steps[step]}</div>
                    <div className="mt-1 font-medium capitalize">
                      {state === 'idle' ? copy.steps.waiting : state === 'done' ? copy.steps.completed : state}
                    </div>
                  </div>
                )
              })}
            </div>

            <p className="mt-4 text-sm leading-6 text-[var(--muted)]">{stageMessage}</p>

            {briefPreview.length > 0 && (
              <div className="mt-4 grid gap-2 rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-[var(--subtle)]">{copy.section.plannerBrief}</div>
                {briefPreview.map(([key, value]) => (
                  <div key={key} className="grid gap-1 sm:grid-cols-[100px_minmax(0,1fr)]">
                    <div className="text-sm text-[var(--subtle)]">{key}</div>
                    <div className="text-sm text-[var(--muted)]">{value}</div>
                  </div>
                ))}
              </div>
            )}

            {error && (
              <div className="mt-4 rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-3">
                <div className="text-sm font-medium text-[var(--text)]">{copy.section.demoUnavailable}</div>
                <p className="mt-1 text-sm text-rose-100/90">{error}</p>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.24)] sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-[var(--text)]">{copy.section.generatedOutputs}</div>
              <div className="text-sm text-[var(--subtle)]">{copy.section.generatedHelper}</div>
            </div>
            <div className="hidden rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--subtle)] sm:block">
              {copy.section.native}
            </div>
          </div>

          <div className="grid gap-4">
            {copy.platformMeta.map(({ key, eyebrow, rationale }) => {
              const output = outputs[key]
              const isReady = Boolean(output.content)
              const isActive = status === 'running' && activePlatform === key

              return (
                <div
                  key={key}
                  className={[
                    'rounded-[24px] border bg-[var(--panel)] p-4 transition',
                    isActive
                      ? 'border-[var(--accent)] shadow-[0_0_0_1px_rgba(139,92,246,0.14),0_0_32px_rgba(139,92,246,0.12)]'
                      : 'border-[var(--border)] hover:border-white/15',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xs uppercase tracking-[0.18em] text-[var(--subtle)]">{eyebrow}</div>
                      <div className="mt-1 text-lg font-semibold text-[var(--text)]">{output.label}</div>
                      <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted)]">{rationale}</p>
                    </div>
                    <div
                      className={[
                        'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs',
                        isActive
                          ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text)]'
                          : 'border-[var(--border)] text-[var(--subtle)]',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      {isActive && <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--accent)]" />}
                      {isActive ? copy.steps.live : output.status}
                    </div>
                  </div>

                  <div
                    className={[
                      'min-h-[220px] rounded-2xl border p-5 transition',
                      isActive
                        ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                        : 'border-[var(--border)] bg-[var(--surface-2)]',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {isReady ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--subtle)]">
                            {copy.section.presentationView}
                          </div>
                          <div className="rounded-full border border-[var(--border)] bg-[var(--panel)] px-3 py-1 text-xs text-[var(--subtle)]">
                            {copy.section.copyReady}
                          </div>
                        </div>
                        <p className="whitespace-pre-wrap text-[15px] leading-7 text-[var(--text)]">
                          {output.content}
                        </p>
                      </div>
                    ) : (
                      <div className="flex h-full flex-col justify-between">
                        <div>
                          <div className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--subtle)]">
                            {copy.section.presentationView}
                          </div>
                          <div className="mt-3 space-y-2">
                            <div className="h-3 w-2/3 rounded-full bg-white/8" />
                            <div className="h-3 w-full rounded-full bg-white/6" />
                            <div className="h-3 w-5/6 rounded-full bg-white/6" />
                            <div className="h-3 w-3/4 rounded-full bg-white/6" />
                          </div>
                        </div>
                        <p className="text-sm leading-6 text-[var(--subtle)]">
                          {status === 'running'
                            ? copy.section.stillPreparing
                            : copy.section.runToGenerate}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div className="text-xs leading-5 text-[var(--subtle)]">
                      {isActive
                        ? copy.section.receivingLive
                        : status === 'running' && !isReady
                          ? copy.section.queued
                          : isReady
                            ? copy.section.readyToReview
                            : copy.section.waitingToGenerate}
                    </div>
                    <button
                      type="button"
                      onClick={() => copyText(key, output.content)}
                      disabled={!output.content}
                      className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-medium text-[var(--muted)] transition hover:bg-[var(--surface-2)] disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      {copied === key ? copy.section.copied : copy.section.copy}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {(criticNotes || hasAnyOutput) && (
            <div className="mt-4 rounded-[24px] border border-[color:var(--accent-soft)] bg-[var(--accent-soft)] p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-[var(--subtle)]">{copy.section.executiveSummary}</div>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                {criticNotes || copy.section.executiveFallback}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
