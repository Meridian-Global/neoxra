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
    <div className="scorecard-radar ig-panel">
      <div className="ig-panel-head">
        <div>
          <span className="ig-section-kicker">Quality Scan</span>
          <h3>Scorecard</h3>
        </div>
        <div className="scorecard-badge">{average.toFixed(1)} / 10</div>
      </div>
      {DIMENSIONS.map(({ key, label }) => {
        const value = scorecard[key]
        return (
          <div key={key} className="scorecard-bar-row">
            <span className="scorecard-label">{label}</span>
            <div className="scorecard-track">
              <div
                className="scorecard-fill"
                style={{
                  width: `${(value / 10) * 100}%`,
                  background: `linear-gradient(90deg, rgba(250, 126, 30, ${0.45 + value * 0.04}), rgba(214, 41, 118, ${0.5 + value * 0.04}), rgba(150, 47, 191, ${0.44 + value * 0.04}))`,
                }}
              />
            </div>
            <span className="scorecard-value">{value}</span>
          </div>
        )
      })}
      <div className="scorecard-average">Average: {average.toFixed(1)}</div>
    </div>
  )
}
