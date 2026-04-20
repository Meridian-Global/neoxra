'use client'

import Link from 'next/link'
import { useState, useRef, useCallback, useMemo } from 'react'
import { DemoAccessGate } from '../../components/DemoAccessGate'
import { InstagramForm } from '../../components/InstagramForm'
import { InstagramResult as InstagramResultView } from '../../components/InstagramResult'
import { ScorecardRadar } from '../../components/ScorecardRadar'
import { CarouselPreview } from '../../components/CarouselPreview'
import { LanguageToggle } from '../../components/LanguageToggle'
import { useLanguage } from '../../components/LanguageProvider'
import { API_BASE_URL } from '../../lib/api'
import { buildDemoHeaders, clearStoredDemoToken } from '../../lib/demo-access'
import { getDemoSurfaceConfig } from '../../lib/demo-config'
import { getInstagramSampleResult } from '../../lib/instagram-demo'
import { APIError, streamSSE } from '../../lib/sse'
import type {
  StyleAnalysis,
  InstagramContent,
  Scorecard,
} from '../../lib/instagram-types'
import { ThemeToggle } from '../../components/landing/ThemeToggle'

const SCORE_DIMS = [
  'hook_strength', 'cta_clarity', 'hashtag_relevance',
  'platform_fit', 'tone_match', 'originality',
] as const

const KNOWN_EVENTS = new Set([
  'pipeline_started',
  'phase_started',
  'style_ready',
  'content_ready',
  'score_ready',
  'pipeline_completed',
  'error',
])

type PageStatus = 'idle' | 'loading' | 'streaming' | 'completed' | 'error'
type SubmitPayload = { topic: string; template_text: string; goal: string }

function createInstagramCopy(language: 'en' | 'zh-TW') {
  if (language === 'zh-TW') {
    return {
      stageLabels: {
        pipeline_started: '正在建立這次生成流程…',
        analysis: '正在分析語氣與寫作風格…',
        drafting: '正在生成 Instagram 內容…',
        review: '正在評估內容品質…',
      } as Record<string, string>,
      stageSequence: [
        { event: 'analysis', label: '風格分析' },
        { event: 'drafting', label: '內容生成' },
        { event: 'review', label: '品質評分' },
      ] as const,
      statusMeta: {
        idle: {
          label: '準備完成',
          description: '設定輸入內容後，就能開始即時生成。',
        },
        loading: {
          label: '連線中',
          description: '正在開啟串流並準備生成流程。',
        },
        streaming: {
          label: '直播中',
          description: '流程進行中，部分結果會即時出現。',
        },
        completed: {
          label: '已完成',
          description: '已收到最終 completion event，可安心展示。',
        },
        error: {
          label: '需要注意',
          description: '流程提早中止，或系統回傳了錯誤。',
        },
      } as const,
      errors: {
        validation: '請檢查輸入內容後再試一次。',
        unavailable: '系統暫時無法使用，請稍後再試。',
        generic: '發生了一點問題，請再試一次。',
        timeout: '生成時間過長，請重新嘗試。',
        access: '這個 demo 需要有效的存取權限。請重新輸入 access code，或確認 signed link 尚未過期。',
      },
      header: {
        back: '返回首頁',
        badge: 'Instagram Studio',
        title: '即時生成可展示的 Instagram 內容系統。',
        body:
          '從一個明確主題出發，觀看 Neoxra 即時生成 caption、hooks、輪播架構與評分結果，讓你在會議中直接展示。',
        stages: '流程階段',
        avgScore: '平均分數',
        slides: '輪播頁數',
        stateTitle: '生成狀態',
        active: '進行中',
        complete: '已完成',
        waiting: '等待中',
        connecting: '正在連線至生成流程…',
        partial: '正在接收部分結果…',
        sampleLoaded: '已載入示範輸出，可在會議中作為穩定備援。',
        cancel: '取消本次生成',
      },
      formIntro: {
        eyebrow: '輸入',
        title: '建立一份適合展示的生成 brief。',
        body: '可直接使用預設案例，或輸入自己的主題。流程保持簡單：輸入、生成、串流、檢視。',
      },
      editFlow: {
        eyebrow: '編輯後重新生成',
        title: '保留目前內容，調整後再跑一次。',
        body: '你可以先修改主題、模板或目標，再重新生成，不需要清空整個畫面。',
        unsaved: '你有尚未套用的新編輯。',
        synced: '目前顯示的是最近一次生成所使用的版本。',
        currentTopic: '目前主題',
        currentGoal: '目前目標',
        regenerate: '用目前編輯重新生成',
        jump: '回到輸入區',
      },
      errorBox: {
        title: '生成已中止',
        reset: '重設',
        sample: '使用示範輸出',
      },
      access: {
        eyebrow: '客戶 demo 存取',
        title: '這個 demo 需要存取碼或已簽章的連結。',
        body: '若你是針對客戶的展示場景，請輸入 demo access code，或直接使用已授權的 signed link 進入。',
        inputLabel: 'Demo access code',
        inputPlaceholder: '輸入本次 demo 使用的 access code',
        submitLabel: '解鎖 demo',
        loadingLabel: '驗證中…',
        signedLinkLoaded: '如果你是透過 signed link 進入，系統會自動保留這次存取。',
        invalidCode: 'Access code 無效，或這個連結已過期。',
        clearAccess: '清除存取',
      },
      output: {
        eyebrow: '輸出',
        title: '檢視即時生成結果。',
        body: '流程進行中會先顯示部分結果，只有在收到最終 completion event 後才會標示成功。',
        styleRead: '風格讀取',
        detectedVoice: '偵測到的語氣',
        structuralPatterns: '結構特徵',
        vocabularyNotes: '用詞觀察',
        preview: '預覽',
        carouselDeck: '輪播展示',
      },
      completedSteps: {
        style: '風格已鎖定',
        draft: '內容已生成',
        score: '評分已完成',
      },
    }
  }

  return {
    stageLabels: {
      pipeline_started: 'Setting up the generation run…',
      analysis: 'Analyzing writing style…',
      drafting: 'Generating Instagram content…',
      review: 'Scoring content quality…',
    } as Record<string, string>,
    stageSequence: [
      { event: 'analysis', label: 'Style analysis' },
      { event: 'drafting', label: 'Draft generation' },
      { event: 'review', label: 'Quality scoring' },
    ] as const,
    statusMeta: {
      idle: {
        label: 'Ready',
        description: 'Set the input, then start a live generation run.',
      },
      loading: {
        label: 'Connecting',
        description: 'Opening the stream and preparing the pipeline.',
      },
      streaming: {
        label: 'Live',
        description: 'Partial output is arriving as the pipeline runs.',
      },
      completed: {
        label: 'Completed',
        description: 'The final pipeline completion event was received.',
      },
      error: {
        label: 'Needs attention',
        description: 'The run stopped early or the system returned an error.',
      },
    } as const,
    errors: {
      validation: 'Please check your inputs and try again.',
      unavailable: 'System temporarily unavailable. Please retry.',
      generic: 'Something went wrong. Please try again.',
      timeout: 'The generation took too long. Please retry.',
      access: 'This demo requires valid access. Re-enter the access code or confirm the signed link is still valid.',
    },
    header: {
      back: 'Back to landing',
      badge: 'Instagram Studio',
      title: 'Generate a polished Instagram content system live.',
      body:
        'Start with a strong angle, watch Neoxra stream the generation in real time, and walk away with a caption, hooks, carousel structure, and scorecard you can present on the spot.',
      stages: 'pipeline stages',
      avgScore: 'avg score',
      slides: 'carousel slides',
      stateTitle: 'Generation state',
      active: 'Connecting to the pipeline…',
      complete: 'Completed',
      waiting: 'Waiting',
      partial: 'Streaming partial output…',
      sampleLoaded:
        'Sample output loaded for demo continuity. Use this if live generation is unavailable during a meeting.',
      cancel: 'Cancel run',
    },
    formIntro: {
      eyebrow: 'Input',
      title: 'Build a presentation-ready generation brief.',
      body: 'Use a preset for demo speed or bring your own topic. The flow stays simple: input, generate, stream, review.',
    },
    editFlow: {
      eyebrow: 'Edit and regenerate',
      title: 'Keep the current output, then rerun with sharper edits.',
      body: 'Adjust the topic, template, or goal without clearing the whole screen, then regenerate when you are ready.',
      unsaved: 'You have fresh edits that are not reflected in the current output yet.',
      synced: 'The current output matches the most recent submitted brief.',
      currentTopic: 'Current topic',
      currentGoal: 'Current goal',
      regenerate: 'Regenerate with current edits',
      jump: 'Jump to input',
    },
    errorBox: {
      title: 'Generation stopped',
      reset: 'Reset',
      sample: 'Use Sample Output',
    },
    access: {
      eyebrow: 'Client demo access',
      title: 'This demo requires an access code or signed link.',
      body: 'For client-facing meetings, enter the demo access code below or open the signed link that was shared with you.',
      inputLabel: 'Demo access code',
      inputPlaceholder: 'Enter the access code for this client demo',
      submitLabel: 'Unlock demo',
      loadingLabel: 'Checking access…',
      signedLinkLoaded: 'If you opened a signed link, access will be preserved automatically on this device.',
      invalidCode: 'That access code is invalid or this signed link has expired.',
      clearAccess: 'Clear access',
    },
    output: {
      eyebrow: 'Output',
      title: 'Review the live output.',
      body: 'Partial results show up while the run is still working. The page only marks success after the final completion event arrives.',
      styleRead: 'Style Read',
      detectedVoice: 'Detected Voice',
      structuralPatterns: 'Structural patterns',
      vocabularyNotes: 'Vocabulary notes',
      preview: 'Preview',
      carouselDeck: 'Carousel Deck',
    },
    completedSteps: {
      style: 'Style locked',
      draft: 'Draft generated',
      score: 'Scorecard ready',
    },
  }
}

function toFriendlyError(error: unknown, copy: ReturnType<typeof createInstagramCopy>): string {
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

export default function InstagramPage() {
  const { language } = useLanguage()
  const copy = createInstagramCopy(language)
  const sampleResult = getInstagramSampleResult(language)
  const demoConfig = useMemo(() => getDemoSurfaceConfig('instagram'), [])
  const [preview, setPreview] = useState<SubmitPayload>({
    topic: '',
    template_text: '',
    goal: 'engagement',
  })
  const [lastSubmitted, setLastSubmitted] = useState<SubmitPayload | null>(null)
  const [status, setStatus]               = useState<PageStatus>('idle')
  const [error, setError]                 = useState<string | null>(null)
  const [currentStage, setCurrentStage]   = useState('')
  const [styleAnalysis, setStyleAnalysis] = useState<StyleAnalysis | null>(null)
  const [content, setContent]             = useState<InstagramContent | null>(null)
  const [scorecard, setScorecard]         = useState<Scorecard | null>(null)
  const [critique, setCritique]           = useState<string | null>(null)
  const [resultOrigin, setResultOrigin]   = useState<'live' | 'sample' | null>(null)
  const [demoToken, setDemoToken]         = useState<string | null>(null)

  const abortRef = useRef<AbortController | null>(null)

  const handleSubmit = useCallback(
    async (data: SubmitPayload) => {
      setLastSubmitted(data)
      setStatus('loading')
      setStyleAnalysis(null)
      setContent(null)
      setScorecard(null)
      setCritique(null)
      setError(null)
      setCurrentStage('')
      setResultOrigin(null)

      const abort = new AbortController()
      abortRef.current = abort
      let completed = false
      let failed = false
      let sawStreamEvent = false

      try {
        for await (const { event, data: payload } of streamSSE(
          `${API_BASE_URL}/api/instagram/generate`,
          { ...data, locale: language },
          {
            signal: abort.signal,
            timeoutMs: 45_000,
            headers: buildDemoHeaders(demoConfig.apiSurface, demoToken),
          },
        )) {
          if (abort.signal.aborted) break
          if (!sawStreamEvent) {
            sawStreamEvent = true
            setStatus('streaming')
          }

          if (!KNOWN_EVENTS.has(event)) {
            setError(copy.errors.generic)
            setStatus('error')
            failed = true
            break
          }

          // *_started → update stage label
          if (event === 'pipeline_started') {
            setCurrentStage(copy.stageLabels.pipeline_started)
            continue
          }

          if (event === 'phase_started' && typeof payload?.phase === 'string') {
            setCurrentStage(copy.stageLabels[payload.phase] ?? '')
            continue
          }

          if (event === 'style_ready') {
            setStyleAnalysis(payload as StyleAnalysis)
            setCurrentStage('')
            continue
          }

          if (event === 'content_ready') {
            setContent(payload as InstagramContent)
            setCurrentStage('')
            continue
          }

          if (event === 'score_ready') {
            const avg = SCORE_DIMS.reduce((s, d) => s + payload[d], 0) / SCORE_DIMS.length
            setScorecard({ ...payload, average: avg } as Scorecard)
            setCurrentStage('')
            continue
          }

          if (event === 'pipeline_completed') {
            setContent(payload.content)
            setScorecard(payload.scorecard)
            setCritique(payload.critique)
            setStyleAnalysis(payload.style_analysis)
            setCurrentStage('')
            setResultOrigin('live')
            completed = true
            setStatus('completed')
            continue
          }

          // error event from backend
          if (event === 'error') {
            const rawMessage = typeof payload?.message === 'string' ? payload.message : ''
            if (rawMessage.includes('temporarily unavailable')) {
              setError(copy.errors.unavailable)
            } else {
              setError(copy.errors.generic)
            }
            setStatus('error')
            failed = true
            break
          }
        }

        if (!abort.signal.aborted && !completed && !failed) {
          setError(copy.errors.generic)
          setStatus('error')
          setCurrentStage('')
        }
      } catch (err) {
        if (!abort.signal.aborted && (!(err instanceof DOMException) || err.name !== 'AbortError')) {
          if (err instanceof APIError && err.status === 401) {
            clearStoredDemoToken(demoConfig.apiSurface)
            setDemoToken(null)
            setError(copy.errors.access)
            setStatus('error')
            setCurrentStage('')
            return
          }
          setError(toFriendlyError(err, copy))
          setStatus('error')
          setCurrentStage('')
        }
      }
    },
    [copy, demoConfig.apiSurface, demoToken, language],
  )

  function handleCancel() {
    abortRef.current?.abort()
    setStatus('idle')
    setCurrentStage('')
  }

  function handleRetry() {
    setStatus('idle')
    setStyleAnalysis(null)
    setContent(null)
    setScorecard(null)
    setCritique(null)
    setError(null)
    setCurrentStage('')
    setResultOrigin(null)
  }

  function handleUseSample() {
    abortRef.current?.abort()
    setStyleAnalysis(sampleResult.style_analysis)
    setContent(sampleResult.content)
    setScorecard(sampleResult.scorecard)
    setCritique(sampleResult.critique)
    setError(null)
    setCurrentStage('')
    setStatus('completed')
    setResultOrigin('sample')
  }

  const isStreaming = status === 'streaming'
  const isLoading = status === 'loading'
  const isWorking = isLoading || isStreaming
  const hasResults = Boolean(styleAnalysis || content || scorecard || critique)
  const hasPendingEdits = Boolean(
    lastSubmitted &&
      (preview.topic !== lastSubmitted.topic ||
        preview.template_text !== lastSubmitted.template_text ||
        preview.goal !== lastSubmitted.goal)
  )
  const completedSteps = [
    styleAnalysis ? copy.completedSteps.style : null,
    content ? copy.completedSteps.draft : null,
    scorecard ? copy.completedSteps.score : null,
  ].filter(Boolean) as string[]
  const statusMeta = copy.statusMeta[status]
  const activeStepIndex = currentStage
    ? copy.stageSequence.findIndex((item) => copy.stageLabels[item.event] === currentStage)
    : status === 'completed'
      ? copy.stageSequence.length
      : -1
  const needsAccess = demoConfig.accessMode === 'gated' && !demoToken

  const editPanel =
    hasResults || status === 'error' ? (
      <div className="rounded-3xl border border-[color:var(--accent-soft)] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-5 shadow-[0_16px_50px_rgba(0,0,0,0.14)]">
        <div className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--subtle)]">{copy.editFlow.eyebrow}</div>
        <h3 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[var(--text)]">{copy.editFlow.title}</h3>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{copy.editFlow.body}</p>

        <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="text-sm font-medium text-[var(--text)]">
            {hasPendingEdits ? copy.editFlow.unsaved : copy.editFlow.synced}
          </div>
          <div className="mt-3 space-y-3 text-sm">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-[var(--subtle)]">{copy.editFlow.currentTopic}</div>
              <div className="mt-1 line-clamp-3 text-[var(--muted)]">{preview.topic || '-'}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-[var(--subtle)]">{copy.editFlow.currentGoal}</div>
              <div className="mt-1 text-[var(--muted)]">{preview.goal || '-'}</div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => handleSubmit(preview)}
            disabled={isWorking || !preview.topic.trim() || !preview.template_text.trim()}
            className="inline-flex items-center justify-center rounded-xl bg-[var(--text)] px-5 py-3 text-sm font-semibold text-[var(--bg)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {copy.editFlow.regenerate}
          </button>
          <a
            href="#instagram-form"
            className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--panel)] px-5 py-3 text-sm font-medium text-[var(--muted)] transition hover:bg-[var(--surface-2)]"
          >
            {copy.editFlow.jump}
          </a>
        </div>
      </div>
    ) : null

  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--bg)] text-[var(--text)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/10" />
      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-10 px-5 pb-20 pt-8 sm:px-6 lg:px-8 lg:pb-28">
        {needsAccess ? (
          <section className="pt-12 sm:pt-16">
            <div className="mb-8 flex items-center justify-between gap-4 text-sm text-[var(--muted)]">
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--panel)] px-3 py-1.5">
                <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
                Neoxra
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href="/"
                  className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--panel)] px-3 py-1.5 text-sm text-[var(--subtle)] transition hover:border-white/20 hover:text-[var(--text)]"
                >
                  {copy.header.back}
                </Link>
                <LanguageToggle />
                <ThemeToggle />
              </div>
            </div>
            <DemoAccessGate
              surface={demoConfig.apiSurface}
              copy={copy.access}
              onAccessReady={setDemoToken}
            />
          </section>
        ) : null}

        {!needsAccess ? (
          <>
        <section className="pt-8 sm:pt-12">
          <div className="mb-12 flex items-center justify-between gap-4 text-sm text-[var(--muted)]">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--panel)] px-3 py-1.5">
              <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
              Neoxra
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--panel)] px-3 py-1.5 text-sm text-[var(--subtle)] transition hover:border-white/20 hover:text-[var(--text)]"
              >
                {copy.header.back}
              </Link>
              <LanguageToggle />
              <ThemeToggle />
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_360px] lg:items-end">
            <div className="max-w-3xl">
              <div className="mb-5 inline-flex items-center rounded-full border border-[color:var(--accent-soft)] bg-[var(--accent-soft)] px-3 py-1 text-xs font-medium uppercase tracking-[0.22em] text-[var(--text)]">
                {copy.header.badge}
              </div>

              <h1 className="max-w-4xl text-4xl font-semibold tracking-[-0.075em] text-[var(--text)] sm:text-5xl lg:text-6xl">
                {copy.header.title}
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--muted)] sm:text-lg">
                {copy.header.body}
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] px-4 py-3">
                  <div className="text-2xl font-semibold tracking-[-0.04em] text-[var(--text)]">3</div>
                  <div className="text-sm text-[var(--subtle)]">{copy.header.stages}</div>
                </div>
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] px-4 py-3">
                  <div className="text-2xl font-semibold tracking-[-0.04em] text-[var(--text)]">
                    {scorecard ? scorecard.average.toFixed(1) : '--'}
                  </div>
                  <div className="text-sm text-[var(--subtle)]">{copy.header.avgScore}</div>
                </div>
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] px-4 py-3">
                  <div className="text-2xl font-semibold tracking-[-0.04em] text-[var(--text)]">
                    {content ? content.carousel_outline.length : '--'}
                  </div>
                  <div className="text-sm text-[var(--subtle)]">{copy.header.slides}</div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.18)] backdrop-blur">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="text-sm font-medium text-[var(--text)]">{copy.header.stateTitle}</div>
                <span className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--subtle)]">
                  {statusMeta.label}
                </span>
              </div>

              <p className="mb-4 text-sm leading-6 text-[var(--muted)]">{statusMeta.description}</p>

              <div className="space-y-3">
              {copy.stageSequence.map((step, index) => {
                const isComplete =
                  status === 'completed' || index < activeStepIndex || (index === 0 && styleAnalysis && !currentStage) ||
                  (index === 1 && content && !currentStage) || (index === 2 && scorecard && !currentStage)
                const isActive = index === activeStepIndex && isWorking

                return (
                  <div
                    key={step.event}
                    className={`flex items-start gap-3 rounded-2xl border px-4 py-3 transition ${
                      isActive
                        ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                        : isComplete
                          ? 'border-[var(--border)] bg-[var(--surface)]'
                          : 'border-[var(--border)] bg-transparent'
                    }`}
                  >
                    <span className={`mt-1 h-2.5 w-2.5 rounded-full ${isActive ? 'bg-[var(--accent)]' : isComplete ? 'bg-[var(--text)]' : 'bg-[var(--subtle)]'}`} />
                    <div>
                      <div className="text-sm font-medium text-[var(--text)]">{step.label}</div>
                      <div className="mt-1 text-sm text-[var(--muted)]">
                        {isActive ? copy.stageLabels[step.event] : isComplete ? copy.header.complete : copy.header.waiting}
                      </div>
                    </div>
                  </div>
                )
              })}
              </div>

              {(isLoading || isStreaming) && (
                <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--muted)]">
                  {isLoading ? copy.header.active : currentStage || copy.header.partial}
                </div>
              )}

              {completedSteps.length > 0 && (
                <div className="mt-4 text-sm text-[var(--subtle)]">{completedSteps.join(' • ')}</div>
              )}

              {resultOrigin === 'sample' && (
                <div className="mt-4 rounded-2xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
                  {copy.header.sampleLoaded}
                </div>
              )}

              {isWorking && (
                <button
                  className="mt-5 inline-flex items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--panel)] px-5 py-3 text-sm font-medium text-[var(--muted)] transition hover:bg-[var(--surface-2)]"
                  onClick={handleCancel}
                >
                  {copy.header.cancel}
                </button>
              )}
            </div>
          </div>
        </section>

        <section>
          <div className="mb-6 max-w-2xl">
            <div className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--subtle)]">
              {copy.formIntro.eyebrow}
            </div>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[var(--text)] sm:text-4xl">
              {copy.formIntro.title}
            </h2>
            <p className="mt-3 text-base leading-7 text-[var(--muted)]">
              {copy.formIntro.body}
            </p>
          </div>

          <InstagramForm
            onSubmit={handleSubmit}
            disabled={isWorking}
            onPreviewChange={setPreview}
            formAnchorId="instagram-form"
            helperPanel={editPanel}
            submitLabel={
              lastSubmitted
                ? language === 'zh-TW'
                  ? '重新生成內容系統'
                  : 'Regenerate Post System'
                : undefined
            }
          />
        </section>

        {status === 'error' && error && (
          <div className="rounded-3xl border border-rose-400/30 bg-rose-400/10 p-5 text-[var(--text)]">
            <div>
              <strong className="block text-base">{copy.errorBox.title}</strong>
              <p className="mt-2 text-sm leading-6 text-rose-100/90">{error}</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-[var(--text)] transition hover:bg-white/10"
                onClick={handleRetry}
              >
                {copy.errorBox.reset}
              </button>
              <button
                className="inline-flex items-center justify-center rounded-xl bg-[var(--text)] px-5 py-3 text-sm font-semibold text-[var(--bg)] transition hover:opacity-90"
                onClick={handleUseSample}
              >
                {copy.errorBox.sample}
              </button>
            </div>
          </div>
        )}

        {(styleAnalysis || content || scorecard) && (
          <section>
            <div className="mb-6 max-w-2xl">
              <div>
                <span className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--subtle)]">{copy.output.eyebrow}</span>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[var(--text)] sm:text-4xl">
                  {copy.output.title}
                </h2>
              </div>
              <p className="mt-3 text-base leading-7 text-[var(--muted)]">
                {copy.output.body}
              </p>
            </div>

            {styleAnalysis && (
              <section className="mb-6 rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-5">
                <div className="mb-4">
                  <div>
                    <span className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--subtle)]">{copy.output.styleRead}</span>
                    <h3 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-[var(--text)]">{copy.output.detectedVoice}</h3>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {styleAnalysis.tone_keywords.map((kw) => (
                    <span
                      key={kw}
                      className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm text-[var(--text)]"
                    >
                      {kw}
                    </span>
                  ))}
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div>
                    <h4 className="text-sm font-semibold text-[var(--text)]">{copy.output.structuralPatterns}</h4>
                    <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--muted)]">
                      {styleAnalysis.structural_patterns.map((pattern) => (
                        <li key={pattern}>{pattern}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-[var(--text)]">{copy.output.vocabularyNotes}</h4>
                    <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{styleAnalysis.vocabulary_notes}</p>
                  </div>
                </div>
              </section>
            )}

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_360px]">
              {content && (
                <div>
                  <InstagramResultView content={content} critique={critique ?? ''} />
                </div>
              )}

              <div className="space-y-6">
                {scorecard && (
                  <div>
                    <ScorecardRadar scorecard={scorecard} />
                  </div>
                )}

                {critique !== null && content && (
                  <section className="rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-5">
                    <div className="mb-4">
                      <div>
                        <span className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--subtle)]">{copy.output.preview}</span>
                        <h3 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-[var(--text)]">{copy.output.carouselDeck}</h3>
                      </div>
                    </div>
                    <CarouselPreview slides={content.carousel_outline} />
                  </section>
                )}
              </div>
            </div>
          </section>
        )}
          </>
        ) : null}
      </div>
    </main>
  )
}
