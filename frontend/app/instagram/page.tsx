'use client'

import Link from 'next/link'
import { useState, useRef, useCallback } from 'react'
import { InstagramForm } from '../../components/InstagramForm'
import { InstagramResult as InstagramResultView } from '../../components/InstagramResult'
import { ScorecardRadar } from '../../components/ScorecardRadar'
import { CarouselPreview } from '../../components/CarouselPreview'
import { API_BASE_URL } from '../../lib/api'
import { APIError, streamSSE } from '../../lib/sse'
import type {
  StyleAnalysis,
  InstagramContent,
  Scorecard,
} from '../../lib/instagram-types'
import { ThemeToggle } from '../../components/landing/ThemeToggle'

const STAGE_LABELS: Record<string, string> = {
  pipeline_started: 'Setting up the generation run…',
  style_analysis_started: 'Analyzing writing style…',
  generation_started:     'Generating Instagram content…',
  scoring_started:        'Scoring content quality…',
}

const STAGE_SEQUENCE = [
  { event: 'style_analysis_started', label: 'Style analysis' },
  { event: 'generation_started', label: 'Draft generation' },
  { event: 'scoring_started', label: 'Quality scoring' },
] as const

const SCORE_DIMS = [
  'hook_strength', 'cta_clarity', 'hashtag_relevance',
  'platform_fit', 'tone_match', 'originality',
] as const

const KNOWN_EVENTS = new Set([
  'pipeline_started',
  'style_analysis_started',
  'style_analysis_completed',
  'generation_started',
  'generation_completed',
  'scoring_started',
  'scoring_completed',
  'pipeline_completed',
  'error',
])

const STATUS_META = {
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
} as const

function toFriendlyError(error: unknown): string {
  if (error instanceof APIError) {
    if (error.status === 422) {
      return 'Please check your inputs and try again.'
    }
    if (error.status === 503) {
      return 'System temporarily unavailable. Please retry.'
    }
    return 'Something went wrong. Please try again.'
  }

  if (error instanceof Error && error.message.includes('timed out')) {
    return 'The generation took too long. Please retry.'
  }

  return 'Something went wrong. Please try again.'
}

type PageStatus = 'idle' | 'loading' | 'streaming' | 'completed' | 'error'

export default function InstagramPage() {
  const [status, setStatus]               = useState<PageStatus>('idle')
  const [error, setError]                 = useState<string | null>(null)
  const [currentStage, setCurrentStage]   = useState('')
  const [styleAnalysis, setStyleAnalysis] = useState<StyleAnalysis | null>(null)
  const [content, setContent]             = useState<InstagramContent | null>(null)
  const [scorecard, setScorecard]         = useState<Scorecard | null>(null)
  const [critique, setCritique]           = useState<string | null>(null)

  const abortRef = useRef<AbortController | null>(null)

  const handleSubmit = useCallback(
    async (data: { topic: string; template_text: string; goal: string }) => {
      setStatus('loading')
      setStyleAnalysis(null)
      setContent(null)
      setScorecard(null)
      setCritique(null)
      setError(null)
      setCurrentStage('')

      const abort = new AbortController()
      abortRef.current = abort
      let completed = false
      let failed = false
      let sawStreamEvent = false

      try {
        for await (const { event, data: payload } of streamSSE(
          `${API_BASE_URL}/api/instagram/generate`,
          data,
          { signal: abort.signal, timeoutMs: 45_000 },
        )) {
          if (abort.signal.aborted) break
          if (!sawStreamEvent) {
            sawStreamEvent = true
            setStatus('streaming')
          }

          if (!KNOWN_EVENTS.has(event)) {
            setError('Something went wrong. Please try again.')
            setStatus('error')
            failed = true
            break
          }

          // *_started → update stage label
          if (event in STAGE_LABELS) {
            setCurrentStage(STAGE_LABELS[event])
            continue
          }

          if (event === 'style_analysis_completed') {
            setStyleAnalysis(payload as StyleAnalysis)
            setCurrentStage('')
            continue
          }

          if (event === 'generation_completed') {
            setContent(payload as InstagramContent)
            setCurrentStage('')
            continue
          }

          if (event === 'scoring_completed') {
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
            completed = true
            setStatus('completed')
            continue
          }

          // error event from backend
          if (event === 'error') {
            const rawMessage = typeof payload?.message === 'string' ? payload.message : ''
            if (rawMessage.includes('temporarily unavailable')) {
              setError('System temporarily unavailable. Please retry.')
            } else {
              setError('Something went wrong. Please try again.')
            }
            setStatus('error')
            failed = true
            break
          }
        }

        if (!abort.signal.aborted && !completed && !failed) {
          setError('Something went wrong. Please try again.')
          setStatus('error')
          setCurrentStage('')
        }
      } catch (err) {
        if (!abort.signal.aborted && (!(err instanceof DOMException) || err.name !== 'AbortError')) {
          setError(toFriendlyError(err))
          setStatus('error')
          setCurrentStage('')
        }
      }
    },
    [],
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
  }

  const isStreaming = status === 'streaming'
  const isLoading = status === 'loading'
  const isWorking = isLoading || isStreaming
  const completedSteps = [
    styleAnalysis ? 'Style locked' : null,
    content ? 'Draft generated' : null,
    scorecard ? 'Scorecard ready' : null,
  ].filter(Boolean) as string[]
  const statusMeta = STATUS_META[status]
  const activeStepIndex = currentStage
    ? STAGE_SEQUENCE.findIndex((item) => STAGE_LABELS[item.event] === currentStage)
    : status === 'completed'
      ? STAGE_SEQUENCE.length
      : -1

  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--bg)] text-[var(--text)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/10" />
      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-10 px-5 pb-20 pt-8 sm:px-6 lg:px-8 lg:pb-28">
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
                Back to landing
              </Link>
              <ThemeToggle />
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_360px] lg:items-end">
            <div className="max-w-3xl">
              <div className="mb-5 inline-flex items-center rounded-full border border-[color:var(--accent-soft)] bg-[var(--accent-soft)] px-3 py-1 text-xs font-medium uppercase tracking-[0.22em] text-[var(--text)]">
                Instagram Studio
              </div>

              <h1 className="max-w-4xl text-4xl font-semibold tracking-[-0.075em] text-[var(--text)] sm:text-5xl lg:text-6xl">
                Generate a polished Instagram content system live.
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--muted)] sm:text-lg">
                Start with a strong angle, watch Neoxra stream the generation in real time, and
                walk away with a caption, hooks, carousel structure, and scorecard you can present
                on the spot.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] px-4 py-3">
                  <div className="text-2xl font-semibold tracking-[-0.04em] text-[var(--text)]">3</div>
                  <div className="text-sm text-[var(--subtle)]">pipeline stages</div>
                </div>
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] px-4 py-3">
                  <div className="text-2xl font-semibold tracking-[-0.04em] text-[var(--text)]">
                    {scorecard ? scorecard.average.toFixed(1) : '--'}
                  </div>
                  <div className="text-sm text-[var(--subtle)]">avg score</div>
                </div>
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] px-4 py-3">
                  <div className="text-2xl font-semibold tracking-[-0.04em] text-[var(--text)]">
                    {content ? content.carousel_outline.length : '--'}
                  </div>
                  <div className="text-sm text-[var(--subtle)]">carousel slides</div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.18)] backdrop-blur">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="text-sm font-medium text-[var(--text)]">Generation state</div>
                <span className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--subtle)]">
                  {statusMeta.label}
                </span>
              </div>

              <p className="mb-4 text-sm leading-6 text-[var(--muted)]">{statusMeta.description}</p>

              <div className="space-y-3">
              {STAGE_SEQUENCE.map((step, index) => {
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
                        {isActive ? STAGE_LABELS[step.event] : isComplete ? 'Completed' : 'Waiting'}
                      </div>
                    </div>
                  </div>
                )
              })}
              </div>

              {(isLoading || isStreaming) && (
                <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--muted)]">
                  {isLoading ? 'Connecting to the pipeline…' : currentStage || 'Streaming partial output…'}
                </div>
              )}

              {completedSteps.length > 0 && (
                <div className="mt-4 text-sm text-[var(--subtle)]">{completedSteps.join(' • ')}</div>
              )}

              {isWorking && (
                <button
                  className="mt-5 inline-flex items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--panel)] px-5 py-3 text-sm font-medium text-[var(--muted)] transition hover:bg-[var(--surface-2)]"
                  onClick={handleCancel}
                >
                  Cancel run
                </button>
              )}
            </div>
          </div>
        </section>

        <section>
          <div className="mb-6 max-w-2xl">
            <div className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--subtle)]">
              Input
            </div>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[var(--text)] sm:text-4xl">
              Build a presentation-ready generation brief.
            </h2>
            <p className="mt-3 text-base leading-7 text-[var(--muted)]">
              Use a preset for demo speed or bring your own topic. The flow stays simple: input,
              generate, stream, review.
            </p>
          </div>

          <InstagramForm onSubmit={handleSubmit} disabled={isWorking} />
        </section>

        {status === 'error' && error && (
          <div className="rounded-3xl border border-rose-400/30 bg-rose-400/10 p-5 text-[var(--text)]">
            <div>
              <strong className="block text-base">Generation stopped</strong>
              <p className="mt-2 text-sm leading-6 text-rose-100/90">{error}</p>
            </div>
            <button
              className="mt-4 inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-[var(--text)] transition hover:bg-white/10"
              onClick={handleRetry}
            >
              Reset
            </button>
          </div>
        )}

        {(styleAnalysis || content || scorecard) && (
          <section>
            <div className="mb-6 max-w-2xl">
              <div>
                <span className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--subtle)]">Output</span>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[var(--text)] sm:text-4xl">
                  Review the live output.
                </h2>
              </div>
              <p className="mt-3 text-base leading-7 text-[var(--muted)]">
                Partial results show up while the run is still working. The page only marks success
                after the final completion event arrives.
              </p>
            </div>

            {styleAnalysis && (
              <section className="mb-6 rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-5">
                <div className="mb-4">
                  <div>
                    <span className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--subtle)]">Style Read</span>
                    <h3 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-[var(--text)]">Detected Voice</h3>
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
                    <h4 className="text-sm font-semibold text-[var(--text)]">Structural patterns</h4>
                    <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--muted)]">
                      {styleAnalysis.structural_patterns.map((pattern) => (
                        <li key={pattern}>{pattern}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-[var(--text)]">Vocabulary notes</h4>
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
                        <span className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--subtle)]">Preview</span>
                        <h3 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-[var(--text)]">Carousel Deck</h3>
                      </div>
                    </div>
                    <CarouselPreview slides={content.carousel_outline} />
                  </section>
                )}
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
