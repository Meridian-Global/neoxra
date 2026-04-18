'use client'

import { useState, useRef, useCallback } from 'react'
import { InstagramForm } from '../../components/InstagramForm'
import { InstagramResult as InstagramResultView } from '../../components/InstagramResult'
import { ScorecardRadar } from '../../components/ScorecardRadar'
import { CarouselPreview } from '../../components/CarouselPreview'
import { API_BASE_URL } from '../../lib/api'
import { streamSSE } from '../../lib/sse'
import type {
  StyleAnalysis,
  InstagramContent,
  Scorecard,
} from '../../lib/instagram-types'

const STAGE_LABELS: Record<string, string> = {
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

type Status = 'idle' | 'streaming' | 'done' | 'error'

export default function InstagramPage() {
  const [status, setStatus]               = useState<Status>('idle')
  const [error, setError]                 = useState<string | null>(null)
  const [currentStage, setCurrentStage]   = useState('')
  const [styleAnalysis, setStyleAnalysis] = useState<StyleAnalysis | null>(null)
  const [content, setContent]             = useState<InstagramContent | null>(null)
  const [scorecard, setScorecard]         = useState<Scorecard | null>(null)
  const [critique, setCritique]           = useState<string | null>(null)

  const abortRef = useRef<AbortController | null>(null)

  const handleSubmit = useCallback(
    async (data: { topic: string; template_text: string; goal: string }) => {
      setStatus('streaming')
      setStyleAnalysis(null)
      setContent(null)
      setScorecard(null)
      setCritique(null)
      setError(null)
      setCurrentStage('')

      const abort = new AbortController()
      abortRef.current = abort

      try {
        for await (const { event, data: payload } of streamSSE(
          `${API_BASE_URL}/api/instagram/generate`,
          data,
          abort.signal,
        )) {
          if (abort.signal.aborted) break

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
            setStatus('done')
            continue
          }

          // error event from backend
          if (event === 'error') {
            setError(payload.message ?? 'An error occurred during generation')
            setStatus('error')
            break
          }
        }

        // Stream ended without explicit pipeline_completed or error
        setStatus(prev => (prev === 'streaming' ? 'done' : prev))
      } catch (err) {
        if (!abort.signal.aborted) {
          setError(err instanceof Error ? err.message : 'Something went wrong')
          setStatus('error')
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
  const completedSteps = [
    styleAnalysis ? 'Style locked' : null,
    content ? 'Draft generated' : null,
    scorecard ? 'Scorecard ready' : null,
  ].filter(Boolean) as string[]
  const activeStepIndex = currentStage
    ? STAGE_SEQUENCE.findIndex((item) => STAGE_LABELS[item.event] === currentStage)
    : status === 'done'
      ? STAGE_SEQUENCE.length
      : -1

  return (
    <main className="page ig-page">
      <div className="ig-shell">
        <section className="ig-hero">
          <div className="ig-hero-copy">
            <span className="ig-eyebrow">Instagram Studio</span>
            <h1>Turn a rough idea into an Instagram-ready content system.</h1>
            <p className="ig-hero-text">
              Feed in a topic and a writing template. We analyze the style, generate
              post assets, score the output, and lay everything out in a format you can
              actually review and use.
            </p>

            <div className="ig-hero-stats">
              <div className="ig-stat-card">
                <span className="ig-stat-value">3</span>
                <span className="ig-stat-label">pipeline stages</span>
              </div>
              <div className="ig-stat-card">
                <span className="ig-stat-value">{scorecard ? scorecard.average.toFixed(1) : '--'}</span>
                <span className="ig-stat-label">avg score</span>
              </div>
              <div className="ig-stat-card">
                <span className="ig-stat-value">{content ? content.carousel_outline.length : '--'}</span>
                <span className="ig-stat-label">carousel slides</span>
              </div>
            </div>
          </div>

          <div className="ig-status-card">
            <div className="ig-status-topline">
              <span className={`ig-status-pill ig-status-${status}`}>
                {status === 'idle' && 'Ready'}
                {status === 'streaming' && 'Live'}
                {status === 'done' && 'Completed'}
                {status === 'error' && 'Needs attention'}
              </span>
              {completedSteps.length > 0 && (
                <span className="ig-status-summary">{completedSteps.join(' • ')}</span>
              )}
            </div>

            <div className="ig-stage-list">
              {STAGE_SEQUENCE.map((step, index) => {
                const isComplete =
                  status === 'done' || index < activeStepIndex || (index === 0 && styleAnalysis && !currentStage) ||
                  (index === 1 && content && !currentStage) || (index === 2 && scorecard && !currentStage)
                const isActive = index === activeStepIndex && isStreaming

                return (
                  <div
                    key={step.event}
                    className={`ig-stage-row${isComplete ? ' is-complete' : ''}${isActive ? ' is-active' : ''}`}
                  >
                    <span className="ig-stage-dot" />
                    <div>
                      <div className="ig-stage-name">{step.label}</div>
                      <div className="ig-stage-copy">
                        {isActive ? STAGE_LABELS[step.event] : isComplete ? 'Completed' : 'Waiting'}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {isStreaming && currentStage && (
              <div className="ig-live-note">{currentStage}</div>
            )}

            {isStreaming && (
              <button className="ig-secondary-btn" onClick={handleCancel}>
                Cancel run
              </button>
            )}
          </div>
        </section>

        <section className="ig-form-card">
          <div className="ig-card-heading">
            <div>
              <span className="ig-section-kicker">Input</span>
              <h2>Build the generation brief</h2>
            </div>
            <p>
              Better topic framing and stronger reference text lead to better hooks,
              structure, and CTA alignment.
            </p>
          </div>

          <InstagramForm onSubmit={handleSubmit} disabled={isStreaming} />
        </section>

        {status === 'error' && error && (
          <div className="error-box ig-error-banner">
            <div>
              <strong>Generation stopped</strong>
              <p>{error}</p>
            </div>
            <button className="ig-secondary-btn" onClick={handleRetry}>Reset</button>
          </div>
        )}

        {(styleAnalysis || content || scorecard) && (
          <section className="ig-results">
            <div className="ig-card-heading">
              <div>
                <span className="ig-section-kicker">Output</span>
                <h2>Review the generated system</h2>
              </div>
              <p>
                Scan tone, copy, structure, and quality metrics without digging through raw JSON.
              </p>
            </div>

            {styleAnalysis && (
              <section className="ig-panel ig-style-panel fade-in">
                <div className="ig-panel-head">
                  <div>
                    <span className="ig-section-kicker">Style Read</span>
                    <h3>Detected Voice</h3>
                  </div>
                </div>

                <div className="hashtag-chips">
                  {styleAnalysis.tone_keywords.map((kw) => (
                    <span key={kw} className="hashtag-chip">{kw}</span>
                  ))}
                </div>

                <div className="ig-style-grid">
                  <div>
                    <h4>Structural patterns</h4>
                    <ul className="ig-bullet-list">
                      {styleAnalysis.structural_patterns.map((pattern) => (
                        <li key={pattern}>{pattern}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4>Vocabulary notes</h4>
                    <p>{styleAnalysis.vocabulary_notes}</p>
                  </div>
                </div>
              </section>
            )}

            <div className="ig-results-grid">
              {content && (
                <div className="fade-in">
                  <InstagramResultView content={content} critique={critique ?? ''} />
                </div>
              )}

              <div className="ig-side-column">
                {scorecard && (
                  <div className="fade-in">
                    <ScorecardRadar scorecard={scorecard} />
                  </div>
                )}

                {critique !== null && content && (
                  <section className="ig-panel fade-in">
                    <div className="ig-panel-head">
                      <div>
                        <span className="ig-section-kicker">Preview</span>
                        <h3>Carousel Deck</h3>
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
