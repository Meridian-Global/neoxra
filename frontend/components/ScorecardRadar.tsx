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
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--text-tertiary)]">Quality Scan</span>
          <h3 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">Scorecard</h3>
        </div>
        <div className="rounded-full border border-[var(--border)] bg-[var(--bg-elevated-2)] px-3 py-1.5 text-sm font-semibold text-[var(--text-primary)]">
          {average.toFixed(1)} / 10
        </div>
      </div>
      {DIMENSIONS.map(({ key, label }) => {
        const value = scorecard[key]
        return (
          <div key={key} className="mb-4 last:mb-0">
            <div className="mb-2 flex items-center justify-between gap-3 text-sm">
              <span className="text-[var(--text-secondary)]">{label}</span>
              <span className="text-[var(--text-primary)]">{value}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-[var(--bg-elevated-2)]">
              <div
                className="scorecard-fill"
                style={{
                  width: `${(value / 10) * 100}%`,
                  background: 'var(--gradient-warm)',
                }}
              />
            </div>
          </div>
        )
      })}
      <div className="mt-5 text-sm font-medium text-[var(--text-secondary)]">Average: {average.toFixed(1)}</div>
    </div>
  )
}
