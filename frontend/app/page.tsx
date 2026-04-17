'use client'

import { useState, useRef, useCallback } from 'react'
import { StreamCard, CardData } from '../components/StreamCard'
import { streamSSE } from '../lib/sse'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8000'

// Role-based labels — tells the story of what's happening, not just the event name
const STAGE_LABELS: Record<string, string> = {
  planner_started:         'Strategic Brain — building brief',
  instagram_pass1_started: 'Visual Storyteller — first draft',
  threads_pass1_started:   'Narrative Builder — first draft',
  linkedin_pass1_started:  'Professional Framer — first draft',
  instagram_pass2_started: 'Visual Storyteller — refining with full context',
  threads_pass2_started:   'Narrative Builder — refining with full context',
  linkedin_pass2_started:  'Professional Framer — refining with full context',
  critic_started:          'Quality Judge — reviewing all outputs',
}

const CARD_EVENTS: Record<string, { platform: string; label: string }> = {
  planner_completed:          { platform: 'Planner',   label: 'Brief'  },
  instagram_pass1_completed:  { platform: 'Instagram', label: 'Pass 1' },
  threads_pass1_completed:    { platform: 'Threads',   label: 'Pass 1' },
  linkedin_pass1_completed:   { platform: 'LinkedIn',  label: 'Pass 1' },
  instagram_pass2_completed:  { platform: 'Instagram', label: 'Pass 2' },
  threads_pass2_completed:    { platform: 'Threads',   label: 'Pass 2' },
  linkedin_pass2_completed:   { platform: 'LinkedIn',  label: 'Pass 2' },
  critic_completed:           { platform: 'Critic',    label: 'Review' },
}

interface FinalOutput {
  instagram_final: string
  threads_final:   string
  linkedin_final:  string
  critic_notes:    string
}

type Status = 'idle' | 'running' | 'done' | 'error'

const FINAL_PLATFORMS = [
  { key: 'instagram_final' as const, label: 'Instagram', cls: 'p-instagram' },
  { key: 'threads_final'   as const, label: 'Threads',   cls: 'p-threads'   },
  { key: 'linkedin_final'  as const, label: 'LinkedIn',  cls: 'p-linkedin'  },
]

export default function Page() {
  const [idea, setIdea]               = useState('')
  const [status, setStatus]           = useState<Status>('idle')
  const [cards, setCards]             = useState<CardData[]>([])
  const [currentStage, setStage]      = useState('')
  const [finalOutput, setFinalOutput] = useState<FinalOutput | null>(null)
  const [error, setError]             = useState<string | null>(null)
  const [copied, setCopied]           = useState<string | null>(null)

  const abortRef = useRef<AbortController | null>(null)

  function copyText(key: string, text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key)
      setTimeout(() => setCopied(null), 1500)
    })
  }

  const run = useCallback(async () => {
    if (!idea.trim() || status === 'running') return

    setCards([])
    setFinalOutput(null)
    setError(null)
    setStage('')
    setStatus('running')

    const abort = new AbortController()
    abortRef.current = abort

    try {
      for await (const { event, data } of streamSSE(`${API_BASE}/api/run`, { idea }, abort.signal)) {
        if (abort.signal.aborted) break

        if (event in STAGE_LABELS) {
          setStage(STAGE_LABELS[event])
          continue
        }

        if (event in CARD_EVENTS) {
          const { platform, label } = CARD_EVENTS[event]
          const card: CardData = { id: event, platform, label }

          if (event === 'planner_completed') {
            card.brief = data.brief
          } else if (event === 'critic_completed') {
            card.notes = data.notes
          } else {
            card.thinking = data.thinking
            card.output   = data.output
          }

          setCards(prev => [...prev, card])
          setStage('')
        }

        if (event === 'pipeline_completed') {
          setFinalOutput({
            instagram_final: data.instagram_final,
            threads_final:   data.threads_final,
            linkedin_final:  data.linkedin_final,
            critic_notes:    data.critic_notes,
          })
          setStage('')
          setStatus('done')
        }
      }

      setStatus(prev => prev === 'running' ? 'done' : prev)
    } catch (err) {
      if (!abort.signal.aborted) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
        setStatus('error')
      }
    }
  }, [idea, status])

  const isRunning = status === 'running'

  return (
    <main className="page">
      <div className="container">

        <header>
          <h1>Neoxra</h1>
          <p className="subtitle">One idea. Three platforms. Agents working live.</p>
        </header>

        <div className="input-area">
          <textarea
            placeholder="What's your idea?"
            value={idea}
            onChange={e => setIdea(e.target.value)}
            disabled={isRunning}
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) run() }}
          />
          <button
            className="run-btn"
            onClick={run}
            disabled={isRunning || !idea.trim()}
          >
            {isRunning ? 'Running…' : 'Run Neoxra'}
          </button>
        </div>

        {/* Timeline: cards + active stage indicator + error */}
        {(cards.length > 0 || isRunning || status === 'error') && (
          <div className="timeline">
            {cards.map(card => (
              <div key={card.id} className="timeline-item">
                <StreamCard {...card} />
              </div>
            ))}

            {/* Active stage: italic label + pulsing dot from CSS */}
            {isRunning && currentStage && (
              <div className="timeline-item timeline-active">
                <div className="stage-indicator">{currentStage}</div>
              </div>
            )}

            {status === 'error' && error && (
              <div className="timeline-item">
                <div className="error-box">{error}</div>
              </div>
            )}
          </div>
        )}

        {/* Final outputs — appears after pipeline_completed */}
        {finalOutput && (
          <div className="final">

            {/* Stats: what the pipeline just did */}
            <div className="completion-stats">
              <span>8 agent calls</span>
              <span className="stats-dot">·</span>
              <span>2 passes per platform</span>
              <span className="stats-dot">·</span>
              <span>3 platforms</span>
              <span className="stats-dot">·</span>
              <span className="stats-highlight">critic-refined</span>
            </div>

            {finalOutput.critic_notes && (
              <div className="critic-summary">
                <span className="critic-summary-label">Critic notes</span>
                <p className="critic-summary-text">{finalOutput.critic_notes}</p>
              </div>
            )}

            <div className="final-cards">
              {FINAL_PLATFORMS.map(({ key, label, cls }) => (
                <div key={key} className="final-card">
                  <div className={`final-card-label ${cls}`}>{label}</div>
                  <div className="final-card-body">{finalOutput[key]}</div>
                  <div style={{ padding: '0 16px 14px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="copy-btn" onClick={() => copyText(key, finalOutput[key])}>
                      {copied === key ? 'copied' : 'copy'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

      </div>
    </main>
  )
}
