'use client'

import { useState, useRef, useCallback } from 'react'
import { InstagramForm } from '../../components/InstagramForm'
import { streamSSE } from '../../lib/sse'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8000'

const STAGE_LABELS: Record<string, string> = {
  style_analysis_started: 'Analyzing writing style…',
  generation_started:     'Generating Instagram content…',
  scoring_started:        'Scoring content quality…',
}

type Status = 'idle' | 'streaming' | 'done' | 'error'

export default function InstagramPage() {
  const [status, setStatus]             = useState<Status>('idle')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [result, setResult]             = useState<Record<string, any>>({})
  const [error, setError]               = useState<string | null>(null)
  const [currentStage, setCurrentStage] = useState('')

  const abortRef = useRef<AbortController | null>(null)

  const handleSubmit = useCallback(
    async (data: { topic: string; template_text: string; goal: string }) => {
      setStatus('streaming')
      setResult({})
      setError(null)
      setCurrentStage('')

      const abort = new AbortController()
      abortRef.current = abort

      try {
        for await (const { event, data: payload } of streamSSE(
          `${API_BASE}/api/instagram/generate`,
          data,
          abort.signal,
        )) {
          if (abort.signal.aborted) break

          // *_started → update stage label
          if (event in STAGE_LABELS) {
            setCurrentStage(STAGE_LABELS[event])
            continue
          }

          // *_completed (but not pipeline_completed) → merge data
          if (event.endsWith('_completed') && event !== 'pipeline_completed') {
            setResult(prev => ({ ...prev, ...payload }))
            setCurrentStage('')
            continue
          }

          // pipeline_completed → done
          if (event === 'pipeline_completed') {
            setResult(payload)
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
    setResult({})
    setError(null)
    setCurrentStage('')
  }

  const isStreaming = status === 'streaming'

  return (
    <main className="page">
      <div className="container">
        <header>
          <h1>Instagram Generator</h1>
          <p className="subtitle">Topic + template in, platform-native content out.</p>
        </header>

        <InstagramForm onSubmit={handleSubmit} disabled={isStreaming} />

        {/* Stage indicator while streaming */}
        {isStreaming && currentStage && (
          <div className="timeline-item timeline-active">
            <div className="stage-indicator">{currentStage}</div>
          </div>
        )}

        {/* Cancel button */}
        {isStreaming && (
          <button className="cancel-btn" onClick={handleCancel}>
            Cancel
          </button>
        )}

        {/* Error banner */}
        {status === 'error' && error && (
          <div className="error-box">
            <p>{error}</p>
            <button onClick={handleRetry}>Retry</button>
          </div>
        )}

        {/* Raw JSON result */}
        {status === 'done' && Object.keys(result).length > 0 && (
          <pre className="output-text">
            {JSON.stringify(result, null, 2)}
          </pre>
        )}
      </div>
    </main>
  )
}
