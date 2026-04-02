'use client'

import { useState, useEffect, type CSSProperties } from 'react'

interface BriefData {
  original_idea: string
  core_angle: string
  target_audience: string
  tone: string
  instagram_notes: string
  threads_notes: string
  linkedin_notes: string
}

export interface CardData {
  id: string
  platform: string
  label: string
  thinking?: string
  output?: string
  brief?: BriefData
  notes?: string
}

// Each agent has a distinct identity: symbol, role name, accent color
const AGENT_META: Record<string, { role: string; symbol: string; color: string }> = {
  Planner:   { role: 'Strategic Brain',     symbol: '◈', color: '#a78bfa' },
  Instagram: { role: 'Visual Storyteller',  symbol: '◆', color: '#e1306c' },
  Threads:   { role: 'Narrative Builder',   symbol: '◇', color: '#c8c8c8' },
  LinkedIn:  { role: 'Professional Framer', symbol: '○', color: '#4a9eff' },
  Critic:    { role: 'Quality Judge',       symbol: '◉', color: '#fb923c' },
}

// Reveal text over ~800ms regardless of length, then stop
function useReveal(text: string | undefined): { visible: string; done: boolean } {
  const [visible, setVisible] = useState('')

  useEffect(() => {
    if (!text) { setVisible(''); return }
    setVisible('')
    const total = text.length
    const batchSize = Math.max(1, Math.ceil(total / 50)) // ~50 steps → ~800ms at 16ms/frame
    let pos = 0
    const id = setInterval(() => {
      pos = Math.min(pos + batchSize, total)
      setVisible(text.slice(0, pos))
      if (pos >= total) clearInterval(id)
    }, 16)
    return () => clearInterval(id)
  }, [text])

  return { visible, done: visible.length === (text?.length ?? 0) && visible.length > 0 }
}

export function StreamCard({ platform, label, thinking, output, brief, notes }: CardData) {
  const meta = AGENT_META[platform]
  const { visible: revealedOutput, done: revealDone } = useReveal(output)
  const [copied, setCopied] = useState(false)

  function copy(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  // Set --card-accent so CSS can use it for the left border
  const cardStyle = meta?.color
    ? { '--card-accent': meta.color } as CSSProperties
    : undefined

  return (
    <div className="card" style={cardStyle}>
      <div className="card-header">
        <span className="card-symbol" style={{ color: meta?.color }}>{meta?.symbol}</span>
        <div>
          <span className="card-role" style={{ color: meta?.color }}>{meta?.role ?? platform}</span>
          <span className="card-sub">{platform} · {label}</span>
        </div>
      </div>

      {/* Planner brief: structured fields */}
      {brief && (
        <div className="brief-grid">
          <div className="brief-row">
            <span className="brief-key">Angle</span>
            <span className="brief-val">{brief.core_angle}</span>
          </div>
          <div className="brief-row">
            <span className="brief-key">Audience</span>
            <span className="brief-val">{brief.target_audience}</span>
          </div>
          <div className="brief-row">
            <span className="brief-key">Tone</span>
            <span className="brief-val">{brief.tone}</span>
          </div>
          <div className="brief-row">
            <span className="brief-key">Instagram</span>
            <span className="brief-val">{brief.instagram_notes}</span>
          </div>
          <div className="brief-row">
            <span className="brief-key">Threads</span>
            <span className="brief-val">{brief.threads_notes}</span>
          </div>
          <div className="brief-row">
            <span className="brief-key">LinkedIn</span>
            <span className="brief-val">{brief.linkedin_notes}</span>
          </div>
        </div>
      )}

      {/* Critic notes block */}
      {notes && (
        <p className="critic-notes-inline">{notes}</p>
      )}

      {/* Agent reasoning — collapsed by default */}
      {thinking && (
        <details className="thinking">
          <summary>▸ thinking</summary>
          <p className="thinking-body">{thinking}</p>
        </details>
      )}

      {/* Output with type-in reveal + blinking cursor while revealing */}
      {output && (
        <>
          <pre className="output-text">
            {revealedOutput}
            {!revealDone && <span className="cursor">▌</span>}
          </pre>
          {/* Copy button appears only after reveal completes */}
          {revealDone && (
            <button className="copy-btn" onClick={() => copy(output)}>
              {copied ? 'copied' : 'copy'}
            </button>
          )}
        </>
      )}
    </div>
  )
}
