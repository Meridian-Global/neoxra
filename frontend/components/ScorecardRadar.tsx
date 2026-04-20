'use client'

import type { Scorecard } from '../lib/instagram-types'

const DIMENSIONS: { key: keyof Omit<Scorecard, 'average'>; label: string }[] = [
  { key: 'hook_strength', label: 'Hook Strength' },
  { key: 'cta_clarity', label: 'CTA Clarity' },
  { key: 'hashtag_relevance', label: 'Hashtag Relevance' },
  { key: 'platform_fit', label: 'Platform Fit' },
  { key: 'tone_match', label: 'Tone Match' },
  { key: 'originality', label: 'Originality' },
]

interface ScorecardRadarProps {
  scorecard: Scorecard
}

export function ScorecardRadar({ scorecard }: ScorecardRadarProps) {
  const average =
    DIMENSIONS.reduce((sum, d) => sum + scorecard[d.key], 0) / DIMENSIONS.length

  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--subtle)]">Quality Scan</span>
          <h3 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-[var(--text)]">Scorecard</h3>
        </div>
        <div className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm font-semibold text-[var(--text)]">
          {average.toFixed(1)} / 10
        </div>
      </div>
      {DIMENSIONS.map(({ key, label }) => {
        const value = scorecard[key]
        return (
          <div key={key} className="mb-4 last:mb-0">
            <div className="mb-2 flex items-center justify-between gap-3 text-sm">
              <span className="text-[var(--text)]">{label}</span>
              <span className="text-[var(--subtle)]">{value}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-[var(--surface)]">
              <div
                className="scorecard-fill"
                style={{
                  width: `${(value / 10) * 100}%`,
                  background: 'linear-gradient(90deg, var(--accent), var(--accent-hover))',
                }}
              />
            </div>
          </div>
        )
      })}
      <div className="mt-5 text-sm font-medium text-[var(--muted)]">Average: {average.toFixed(1)}</div>
    </div>
  )
}
