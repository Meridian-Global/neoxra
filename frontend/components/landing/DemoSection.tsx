'use client'

import { useCallback, useRef, useState } from 'react'
import { streamSSE } from '../../lib/sse'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8000'

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

const DEFAULT_IDEA =
  'How AI tools help small teams ship faster without adding headcount.'

const STAGE_COPY: Record<string, { step: StepId; message: string; platform?: PlatformKey }> = {
  planner_started: { step: 'planner', message: 'Planner is building the brief.' },
  instagram_pass1_started: { step: 'agents', message: 'Instagram agent is drafting.', platform: 'instagram' },
  threads_pass1_started: { step: 'agents', message: 'Threads agent is drafting.', platform: 'threads' },
  linkedin_pass1_started: { step: 'agents', message: 'LinkedIn agent is drafting.', platform: 'linkedin' },
  instagram_pass2_started: { step: 'agents', message: 'Instagram agent is refining.', platform: 'instagram' },
  threads_pass2_started: { step: 'agents', message: 'Threads agent is refining.', platform: 'threads' },
  linkedin_pass2_started: { step: 'agents', message: 'LinkedIn agent is refining.', platform: 'linkedin' },
  critic_started: { step: 'critic', message: 'Critic is tightening the final outputs.' },
}

const PLATFORM_EVENT_MAP: Record<string, { platform: PlatformKey; status: string }> = {
  linkedin_pass1_completed: { platform: 'linkedin', status: 'Drafted' },
  linkedin_pass2_completed: { platform: 'linkedin', status: 'Refined' },
  instagram_pass1_completed: { platform: 'instagram', status: 'Drafted' },
  instagram_pass2_completed: { platform: 'instagram', status: 'Refined' },
  threads_pass1_completed: { platform: 'threads', status: 'Drafted' },
  threads_pass2_completed: { platform: 'threads', status: 'Refined' },
}

const PLATFORM_META: Array<{ key: PlatformKey; eyebrow: string }> = [
  { key: 'linkedin', eyebrow: 'Professional narrative' },
  { key: 'instagram', eyebrow: 'Visual-first storytelling' },
  { key: 'threads', eyebrow: 'Fast conversational take' },
]

function createInitialOutputs(): OutputState {
  return {
    linkedin: { label: 'LinkedIn', status: 'Waiting', content: '' },
    instagram: { label: 'Instagram', status: 'Waiting', content: '' },
    threads: { label: 'Threads', status: 'Waiting', content: '' },
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

export function DemoSection() {
  const [idea, setIdea] = useState(DEFAULT_IDEA)
  const [status, setStatus] = useState<Status>('idle')
  const [activeStep, setActiveStep] = useState<StepId>('planner')
  const [stageMessage, setStageMessage] = useState('Ready to generate.')
  const [outputs, setOutputs] = useState<OutputState>(createInitialOutputs)
  const [criticNotes, setCriticNotes] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState<string | null>(null)
  const [briefPreview, setBriefPreview] = useState<Array<[string, string]>>([])
  const [activePlatform, setActivePlatform] = useState<PlatformKey | null>(null)

  const abortRef = useRef<AbortController | null>(null)

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

    setStatus('running')
    setActiveStep('planner')
    setStageMessage('Planner is building the brief.')
    setOutputs(createInitialOutputs())
    setCriticNotes('')
    setError('')
    setBriefPreview([])
    setActivePlatform(null)

    try {
      for await (const { event, data } of streamSSE(
        `${API_BASE}/api/run`,
        { idea: idea.trim() },
        abortController.signal
      )) {
        if (abortController.signal.aborted) break

        const stage = STAGE_COPY[event]
        if (stage) {
          setActiveStep(stage.step)
          setStageMessage(stage.message)
          setActivePlatform(stage.platform ?? null)
        }

        if (event === 'planner_completed' && data?.brief && typeof data.brief === 'object') {
          const preview = Object.entries(data.brief)
            .filter(([, value]) => typeof value === 'string' && value.trim())
            .slice(0, 3) as Array<[string, string]>
          setBriefPreview(preview)
          continue
        }

        const platformEvent = PLATFORM_EVENT_MAP[event]
        if (platformEvent && typeof data?.output === 'string') {
          setOutputs(prev => ({
            ...prev,
            [platformEvent.platform]: {
              ...prev[platformEvent.platform],
              status: platformEvent.status,
              content: data.output,
            },
          }))
          setActivePlatform(platformEvent.platform)
          continue
        }

        if (event === 'critic_completed' && typeof data?.notes === 'string') {
          setCriticNotes(data.notes)
          setActivePlatform(null)
          continue
        }

        if (event === 'pipeline_completed') {
          setOutputs(prev => ({
            linkedin: {
              ...prev.linkedin,
              status: 'Ready',
              content:
                typeof data?.linkedin_final === 'string' ? data.linkedin_final : prev.linkedin.content,
            },
            instagram: {
              ...prev.instagram,
              status: 'Ready',
              content:
                typeof data?.instagram_final === 'string'
                  ? data.instagram_final
                  : prev.instagram.content,
            },
            threads: {
              ...prev.threads,
              status: 'Ready',
              content:
                typeof data?.threads_final === 'string' ? data.threads_final : prev.threads.content,
            },
          }))
          if (typeof data?.critic_notes === 'string') setCriticNotes(data.critic_notes)
          setStageMessage('Three platform-native outputs generated.')
          setStatus('done')
          setActivePlatform(null)
        }
      }
    } catch (err) {
      if (!abortController.signal.aborted) {
        setStatus('error')
        setError(err instanceof Error ? err.message : 'Unable to generate right now.')
        setStageMessage('The stream failed before completion.')
        setActivePlatform(null)
      }
    }
  }, [idea, status])

  const stop = useCallback(() => {
    abortRef.current?.abort()
    setStatus('idle')
    setStageMessage('Generation stopped.')
    setActivePlatform(null)
  }, [])

  const hasAnyOutput = Object.values(outputs).some(output => output.content)

  return (
    <section id="demo" className="scroll-mt-24">
      <div className="mb-6 max-w-2xl">
        <div className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--subtle)]">
          Live demo
        </div>
        <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[var(--text)] sm:text-4xl">
          Show the product, not the pitch.
        </h2>
        <p className="mt-3 text-base leading-7 text-[var(--muted)]">
          Enter one idea and watch Neoxra stream a planner brief, coordinate platform agents, and
          return channel-specific outputs in real time.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.86fr)_minmax(420px,1.14fr)]">
        <div className="rounded-[28px] border border-[var(--border)] bg-[var(--panel)] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.2)] backdrop-blur sm:p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-[var(--text)]">Try an idea</div>
              <div className="text-sm text-[var(--subtle)]">Connected to the existing SSE pipeline</div>
            </div>
            <div className="rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--subtle)]">
              /api/run
            </div>
          </div>

          <label className="mb-3 block text-xs font-medium uppercase tracking-[0.22em] text-[var(--subtle)]">
            Input
          </label>
          <textarea
            value={idea}
            onChange={event => setIdea(event.target.value)}
            className="min-h-[180px] w-full resize-none rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4 text-base leading-7 text-[var(--text)] outline-none ring-0 transition placeholder:text-[var(--subtle)] focus:border-[var(--accent)]"
            placeholder="Explain the idea you want to turn into content."
          />

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={run}
              disabled={status === 'running' || !idea.trim()}
              className="inline-flex items-center justify-center rounded-xl bg-[var(--text)] px-5 py-3 text-sm font-semibold text-[var(--bg)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {status === 'running' ? 'Generating…' : 'Generate'}
            </button>

            <button
              type="button"
              onClick={stop}
              disabled={status !== 'running'}
              className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--panel)] px-5 py-3 text-sm font-medium text-[var(--muted)] transition hover:bg-[var(--surface-2)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Stop
            </button>
          </div>

          <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="text-sm font-medium text-[var(--text)]">Pipeline status</div>
              <div className="text-xs uppercase tracking-[0.18em] text-[var(--subtle)]">
                {status === 'running'
                  ? 'streaming'
                  : status === 'done'
                    ? 'complete'
                    : status === 'error'
                      ? 'error'
                      : 'idle'}
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
                    <div className="text-xs uppercase tracking-[0.18em] text-[var(--subtle)]">{step}</div>
                    <div className="mt-1 font-medium capitalize">{state === 'idle' ? 'Pending' : state}</div>
                  </div>
                )
              })}
            </div>

            <p className="mt-4 text-sm leading-6 text-[var(--muted)]">{stageMessage}</p>

            {briefPreview.length > 0 && (
              <div className="mt-4 grid gap-2 rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-[var(--subtle)]">Planner brief</div>
                {briefPreview.map(([key, value]) => (
                  <div key={key} className="grid gap-1 sm:grid-cols-[100px_minmax(0,1fr)]">
                    <div className="text-sm text-[var(--subtle)]">{key}</div>
                    <div className="text-sm text-[var(--muted)]">{value}</div>
                  </div>
                ))}
              </div>
            )}

            {error && <p className="mt-4 text-sm text-rose-300">{error}</p>}
          </div>
        </div>

        <div className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.24)] sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-[var(--text)]">Generated outputs</div>
              <div className="text-sm text-[var(--subtle)]">LinkedIn, Instagram, and Threads from one run</div>
            </div>
            <div className="hidden rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--subtle)] sm:block">
              platform-native
            </div>
          </div>

          <div className="grid gap-4">
            {PLATFORM_META.map(({ key, eyebrow }) => {
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
                      {isActive ? 'Streaming' : output.status}
                    </div>
                  </div>

                  <div
                    className={[
                      'min-h-[156px] rounded-2xl border p-4 transition',
                      isActive
                        ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                        : 'border-[var(--border)] bg-[var(--surface-2)]',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {isReady ? (
                      <p className="whitespace-pre-wrap text-sm leading-6 text-[var(--muted)]">
                        {output.content}
                      </p>
                    ) : (
                      <div className="flex h-full flex-col justify-between">
                        <div className="space-y-2">
                          <div className="h-3 w-2/3 rounded-full bg-white/8" />
                          <div className="h-3 w-full rounded-full bg-white/6" />
                          <div className="h-3 w-5/6 rounded-full bg-white/6" />
                        </div>
                        <p className="text-sm text-[var(--subtle)]">
                          {status === 'running'
                            ? 'Waiting for this agent to complete its pass.'
                            : 'Run the demo to generate this output.'}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div className="text-xs text-[var(--subtle)]">
                      {isActive
                        ? 'Receiving live output'
                        : status === 'running' && !isReady
                          ? 'Streaming soon'
                          : 'Ready to review'}
                    </div>
                    <button
                      type="button"
                      onClick={() => copyText(key, output.content)}
                      disabled={!output.content}
                      className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-medium text-[var(--muted)] transition hover:bg-[var(--surface-2)] disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      {copied === key ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {(criticNotes || hasAnyOutput) && (
            <div className="mt-4 rounded-[24px] border border-[color:var(--accent-soft)] bg-[var(--accent-soft)] p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-[var(--subtle)]">Critic</div>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                {criticNotes || 'The critic review will appear here after generation completes.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
