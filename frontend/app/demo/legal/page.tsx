'use client'

import Link from 'next/link'
import { useCallback, useMemo, useRef, useState } from 'react'
import { CarouselPreview } from '../../../components/CarouselPreview'
import { InstagramForm } from '../../../components/InstagramForm'
import { InstagramResult as InstagramResultView } from '../../../components/InstagramResult'
import { ScorecardRadar } from '../../../components/ScorecardRadar'
import { ThemeToggle } from '../../../components/landing/ThemeToggle'
import { API_BASE_URL } from '../../../lib/api'
import {
  LEGAL_DEMO_PRESETS,
  LEGAL_DEMO_VALUE_PROP,
  LEGAL_GOLDEN_SCENARIO,
  LEGAL_VOICE_PRESETS,
} from '../../../lib/legal-demo'
import { APIError, streamSSE } from '../../../lib/sse'
import type {
  InstagramContent,
  Scorecard,
  StyleAnalysis,
} from '../../../lib/instagram-types'

const STAGE_LABELS: Record<string, string> = {
  pipeline_started: 'Setting up the generation run…',
  style_analysis_started: 'Analyzing writing style…',
  generation_started: 'Generating Instagram content…',
  scoring_started: 'Scoring content quality…',
}

const STAGE_SEQUENCE = [
  { event: 'style_analysis_started', label: 'Style analysis' },
  { event: 'generation_started', label: 'Draft generation' },
  { event: 'scoring_started', label: 'Quality scoring' },
] as const

const SCORE_DIMS = [
  'hook_strength',
  'cta_clarity',
  'hashtag_relevance',
  'platform_fit',
  'tone_match',
  'originality',
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
    description: 'Choose a legal scenario, then start a live generation run.',
  },
  loading: {
    label: 'Connecting',
    description: 'Opening the stream and preparing the demo workflow.',
  },
  streaming: {
    label: 'Live',
    description: 'Partial output is arriving as the legal demo runs.',
  },
  completed: {
    label: 'Completed',
    description: 'The final completion event arrived and the demo output is ready.',
  },
  error: {
    label: 'Needs attention',
    description: 'The run stopped early, so switch to the golden scenario if needed.',
  },
} as const

type PageStatus = 'idle' | 'loading' | 'streaming' | 'completed' | 'error'
type LegalVoicePresetId = (typeof LEGAL_VOICE_PRESETS)[number]['id']

function toFriendlyError(error: unknown): string {
  if (error instanceof APIError) {
    if (error.status === 422) {
      return 'Please check the demo inputs and try again.'
    }
    if (error.status === 503) {
      return 'System temporarily unavailable. Use the golden scenario or retry.'
    }
    return 'Something went wrong. Please try again.'
  }

  if (error instanceof Error && error.message.includes('timed out')) {
    return 'The generation took too long. Please retry or switch to the golden scenario.'
  }

  return 'Something went wrong. Please try again.'
}

export default function LegalDemoPage() {
  const [selectedScenarioLabel, setSelectedScenarioLabel] = useState(LEGAL_DEMO_PRESETS[0].label)
  const [selectedVoiceId, setSelectedVoiceId] = useState<LegalVoicePresetId>(LEGAL_VOICE_PRESETS[0].id)
  const [preview, setPreview] = useState({
    topic: LEGAL_DEMO_PRESETS[0].topic,
    template_text: LEGAL_DEMO_PRESETS[0].templateText,
    goal: LEGAL_DEMO_PRESETS[0].goal,
  })
  const [status, setStatus] = useState<PageStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [currentStage, setCurrentStage] = useState('')
  const [styleAnalysis, setStyleAnalysis] = useState<StyleAnalysis | null>(null)
  const [content, setContent] = useState<InstagramContent | null>(null)
  const [scorecard, setScorecard] = useState<Scorecard | null>(null)
  const [critique, setCritique] = useState<string | null>(null)
  const [resultOrigin, setResultOrigin] = useState<'live' | 'golden' | null>(null)

  const abortRef = useRef<AbortController | null>(null)

  const selectedScenario = useMemo(
    () => LEGAL_DEMO_PRESETS.find((preset) => preset.label === selectedScenarioLabel) ?? LEGAL_DEMO_PRESETS[0],
    [selectedScenarioLabel],
  )
  const selectedVoice = useMemo(
    () => LEGAL_VOICE_PRESETS.find((preset) => preset.id === selectedVoiceId) ?? LEGAL_VOICE_PRESETS[0],
    [selectedVoiceId],
  )

  const beforeAfterTopic = preview.topic.trim() || selectedScenario.topic
  const beforeAfterGoal = preview.goal || selectedScenario.goal
  const completedSteps = [
    styleAnalysis ? 'Voice read complete' : null,
    content ? 'Draft generated' : null,
    scorecard ? 'Quality review complete' : null,
  ].filter(Boolean) as string[]
  const statusMeta = STATUS_META[status]
  const activeStepIndex = currentStage
    ? STAGE_SEQUENCE.findIndex((item) => STAGE_LABELS[item.event] === currentStage)
    : status === 'completed'
      ? STAGE_SEQUENCE.length
      : -1
  const isLoading = status === 'loading'
  const isStreaming = status === 'streaming'
  const isWorking = isLoading || isStreaming

  const clearResults = useCallback(() => {
    setStyleAnalysis(null)
    setContent(null)
    setScorecard(null)
    setCritique(null)
    setError(null)
    setCurrentStage('')
    setResultOrigin(null)
  }, [])

  const applyGoldenScenario = useCallback(() => {
    abortRef.current?.abort()
    setSelectedScenarioLabel('Contract myths')
    setSelectedVoiceId('trusted-counsel')
    setPreview({
      topic: LEGAL_GOLDEN_SCENARIO.topic,
      template_text: LEGAL_DEMO_PRESETS.find((preset) => preset.label === 'Contract myths')?.templateText ?? '',
      goal: LEGAL_DEMO_PRESETS.find((preset) => preset.label === 'Contract myths')?.goal ?? 'save',
    })
    setStyleAnalysis(LEGAL_GOLDEN_SCENARIO.result.style_analysis)
    setContent(LEGAL_GOLDEN_SCENARIO.result.content)
    setScorecard(LEGAL_GOLDEN_SCENARIO.result.scorecard)
    setCritique(LEGAL_GOLDEN_SCENARIO.result.critique)
    setError(null)
    setCurrentStage('')
    setStatus('completed')
    setResultOrigin('golden')
  }, [])

  const handleScenarioSelect = useCallback((label: string) => {
    setSelectedScenarioLabel(label)
    clearResults()
    setStatus('idle')
  }, [clearResults])

  const handleSubmit = useCallback(
    async (data: { topic: string; template_text: string; goal: string }) => {
      clearResults()
      setStatus('loading')

      const abort = new AbortController()
      abortRef.current = abort
      let completed = false
      let failed = false
      let sawStreamEvent = false
      const enrichedTemplate = `${data.template_text}\n\nVoice preset: ${selectedVoice.label}. ${selectedVoice.instructions}`

      try {
        for await (const { event, data: payload } of streamSSE(
          `${API_BASE_URL}/api/instagram/generate`,
          {
            topic: data.topic,
            template_text: enrichedTemplate,
            goal: data.goal,
          },
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
            const avg = SCORE_DIMS.reduce((sum, dim) => sum + payload[dim], 0) / SCORE_DIMS.length
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
            setStatus('completed')
            setResultOrigin('live')
            completed = true
            continue
          }

          if (event === 'error') {
            const rawMessage = typeof payload?.message === 'string' ? payload.message : ''
            if (rawMessage.includes('temporarily unavailable')) {
              setError('System temporarily unavailable. Use the golden scenario or retry.')
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
    [clearResults, selectedVoice],
  )

  function handleCancel() {
    abortRef.current?.abort()
    setStatus('idle')
    setCurrentStage('')
  }

  function handleRetry() {
    clearResults()
    setStatus('idle')
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--bg)] text-[var(--text)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/10" />
      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-10 px-5 pb-20 pt-8 sm:px-6 lg:px-8 lg:pb-28">
        <section className="pt-8 sm:pt-12">
          <div className="mb-12 flex items-center justify-between gap-4 text-sm text-[var(--muted)]">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--panel)] px-3 py-1.5">
              <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
              Neoxra Legal Demo
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden text-[var(--subtle)] sm:block">Legal demo workflow</div>
              <Link
                href="/"
                className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--panel)] px-3 py-1.5 text-sm text-[var(--subtle)] transition hover:border-white/20 hover:text-[var(--text)]"
              >
                Back to landing
              </Link>
              <ThemeToggle />
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.08fr)_360px] lg:items-end">
            <div className="max-w-3xl">
              <div className="mb-5 inline-flex items-center rounded-full border border-[color:var(--accent-soft)] bg-[var(--accent-soft)] px-3 py-1 text-xs font-medium uppercase tracking-[0.22em] text-[var(--text)]">
                Legal-services demo
              </div>

              <h1 className="max-w-4xl text-4xl font-semibold tracking-[-0.075em] text-[var(--text)] sm:text-5xl lg:text-6xl">
                Show legal thought leadership as a strategic content system.
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--muted)] sm:text-lg">
                {LEGAL_DEMO_VALUE_PROP}
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/instagram"
                  className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--panel)] px-5 py-3 text-sm font-semibold text-[var(--text)] transition hover:border-[var(--accent)] hover:bg-[var(--surface)]"
                >
                  Open Instagram Studio
                </Link>
                <button
                  type="button"
                  onClick={applyGoldenScenario}
                  className="inline-flex items-center justify-center rounded-xl bg-[var(--text)] px-5 py-3 text-sm font-semibold text-[var(--bg)] transition hover:opacity-90"
                >
                  Load Golden Scenario
                </button>
                <div className="text-sm text-[var(--subtle)]">
                  Built for live meetings where clarity and trust matter more than novelty.
                </div>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] px-4 py-3">
                  <div className="text-2xl font-semibold tracking-[-0.04em] text-[var(--text)]">4</div>
                  <div className="text-sm text-[var(--subtle)]">legal scenarios</div>
                </div>
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] px-4 py-3">
                  <div className="text-2xl font-semibold tracking-[-0.04em] text-[var(--text)]">3</div>
                  <div className="text-sm text-[var(--subtle)]">voice presets</div>
                </div>
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] px-4 py-3">
                  <div className="text-2xl font-semibold tracking-[-0.04em] text-[var(--text)]">
                    {resultOrigin === 'golden' ? 'Safe' : 'Live'}
                  </div>
                  <div className="text-sm text-[var(--subtle)]">demo mode</div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.18)] backdrop-blur">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="text-sm font-medium text-[var(--text)]">Demo state</div>
                <span className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--subtle)]">
                  {statusMeta.label}
                </span>
              </div>

              <p className="mb-4 text-sm leading-6 text-[var(--muted)]">{statusMeta.description}</p>

              <div className="space-y-3">
                {STAGE_SEQUENCE.map((step, index) => {
                  const isComplete =
                    status === 'completed' ||
                    index < activeStepIndex ||
                    (index === 0 && styleAnalysis && !currentStage) ||
                    (index === 1 && content && !currentStage) ||
                    (index === 2 && scorecard && !currentStage)
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
                      <span
                        className={`mt-1 h-2.5 w-2.5 rounded-full ${
                          isActive ? 'bg-[var(--accent)]' : isComplete ? 'bg-[var(--text)]' : 'bg-[var(--subtle)]'
                        }`}
                      />
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
                  {isLoading ? 'Connecting to the legal demo pipeline…' : currentStage || 'Streaming partial output…'}
                </div>
              )}

              {completedSteps.length > 0 && (
                <div className="mt-4 text-sm text-[var(--subtle)]">{completedSteps.join(' • ')}</div>
              )}

              {resultOrigin === 'golden' && (
                <div className="mt-4 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
                  Golden scenario loaded. Use this path if you want a deterministic demo fallback.
                </div>
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

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_360px]">
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.14)] backdrop-blur">
            <div className="mb-4">
              <div className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--subtle)]">One-click scenarios</div>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--text)]">
                Pick the legal narrative you want to demo.
              </h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {LEGAL_DEMO_PRESETS.map((preset) => {
                const isSelected = preset.label === selectedScenarioLabel
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handleScenarioSelect(preset.label)}
                    className={`rounded-2xl border p-4 text-left transition ${
                      isSelected
                        ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                        : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)]'
                    }`}
                  >
                    <div className="text-sm font-semibold text-[var(--text)]">{preset.label}</div>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{preset.topic}</p>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.14)] backdrop-blur">
            <div className="mb-4">
              <div className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--subtle)]">Voice preset</div>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--text)]">
                Set the expert tone.
              </h2>
            </div>
            <div className="space-y-3">
              {LEGAL_VOICE_PRESETS.map((preset) => {
                const isSelected = preset.id === selectedVoiceId
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setSelectedVoiceId(preset.id)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      isSelected
                        ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                        : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)]'
                    }`}
                  >
                    <div className="text-sm font-semibold text-[var(--text)]">{preset.label}</div>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{preset.description}</p>
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_360px]">
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.14)] backdrop-blur">
            <div className="mb-4">
              <div className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--subtle)]">Before → After</div>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--text)]">
                Make the transformation feel strategic.
              </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
                <div className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--subtle)]">Original topic</div>
                <p className="mt-3 text-sm leading-6 text-[var(--text)]">{beforeAfterTopic}</p>
              </div>

              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
                <div className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--subtle)]">Neoxra strategy layer</div>
                <p className="mt-3 text-sm leading-6 text-[var(--text)]">{selectedScenario.strategy}</p>
                <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[var(--subtle)]">
                  Goal: {beforeAfterGoal} • Voice: {selectedVoice.label}
                </p>
              </div>

              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
                <div className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--subtle)]">Platform outputs</div>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--text)]">
                  {selectedScenario.platformOutcomes.map((outcome) => (
                    <li key={outcome}>{outcome}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.14)] backdrop-blur">
            <div className="mb-4">
              <div className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--subtle)]">Golden scenario</div>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--text)]">
                Reliable fallback for live meetings.
              </h2>
            </div>
            <p className="text-sm leading-6 text-[var(--muted)]">
              Use this if you want a near-deterministic path during the meeting. It loads a polished
              legal-services example instantly without depending on live model output.
            </p>
            <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="text-sm font-semibold text-[var(--text)]">{LEGAL_GOLDEN_SCENARIO.label}</div>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{LEGAL_GOLDEN_SCENARIO.transformation}</p>
            </div>
            <button
              type="button"
              onClick={applyGoldenScenario}
              className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-[var(--text)] px-5 py-3 text-sm font-semibold text-[var(--bg)] transition hover:opacity-90"
            >
              Load Golden Scenario
            </button>
          </div>
        </section>

        <section>
          <div className="mb-6 max-w-2xl">
            <div className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--subtle)]">
              Demo brief
            </div>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[var(--text)] sm:text-4xl">
              Generate a legal-focused content system live.
            </h2>
            <p className="mt-3 text-base leading-7 text-[var(--muted)]">
              Start from a credible legal topic, keep the tone expert and trustworthy, and show how
              Neoxra turns one narrative into platform-ready thought leadership.
            </p>
          </div>

          <InstagramForm
            key={selectedScenarioLabel}
            onSubmit={handleSubmit}
            disabled={isWorking}
            presets={LEGAL_DEMO_PRESETS}
            presetsTitle="Legal demo presets"
            presetsDescription="High-quality prompts tuned for legal and SMB education, credibility, and save-worthy content."
            submitLabel="Generate Legal Demo"
            initialTopic={selectedScenario.topic}
            initialTemplateText={selectedScenario.templateText}
            initialGoal={selectedScenario.goal}
            topicPlaceholder="Example: A founder-facing post on contract risk, hiring mistakes, or legal myths."
            templatePlaceholder="Professional, plain-English, credible, and practical..."
            bestInputTips={[
              'Lead with one legal misconception or founder mistake.',
              'Keep the advice concrete enough to sound expert, not generic.',
              'Use the voice preset to match the audience in the room.',
            ]}
            onPreviewChange={setPreview}
          />
        </section>

        {status === 'error' && error && (
          <div className="rounded-3xl border border-rose-400/30 bg-rose-400/10 p-5 text-[var(--text)]">
            <div>
              <strong className="block text-base">Generation stopped</strong>
              <p className="mt-2 text-sm leading-6 text-rose-100/90">{error}</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-[var(--text)] transition hover:bg-white/10"
                onClick={handleRetry}
              >
                Reset
              </button>
              <button
                className="inline-flex items-center justify-center rounded-xl bg-[var(--text)] px-5 py-3 text-sm font-semibold text-[var(--bg)] transition hover:opacity-90"
                onClick={applyGoldenScenario}
              >
                Use Golden Scenario
              </button>
            </div>
          </div>
        )}

        {(styleAnalysis || content || scorecard) && (
          <section>
            <div className="mb-6 max-w-2xl">
              <div>
                <span className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--subtle)]">Output</span>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[var(--text)] sm:text-4xl">
                  Review the legal demo output.
                </h2>
              </div>
              <p className="mt-3 text-base leading-7 text-[var(--muted)]">
                Show the client that Neoxra is not just generating text. It is shaping tone,
                structure, and business-safe messaging for expert-service content.
              </p>
            </div>

            {styleAnalysis && (
              <section className="mb-6 rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-5">
                <div className="mb-4">
                  <span className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--subtle)]">Style read</span>
                  <h3 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-[var(--text)]">Detected legal voice</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {styleAnalysis.tone_keywords.map((keyword) => (
                    <span
                      key={keyword}
                      className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm text-[var(--text)]"
                    >
                      {keyword}
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
                      <span className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--subtle)]">Preview</span>
                      <h3 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-[var(--text)]">Carousel deck</h3>
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
