import { render, screen } from '@testing-library/react'
import { ScorecardRadar } from '../components/ScorecardRadar'
import type { Scorecard } from '../lib/instagram-types'

const scorecard: Scorecard = {
  hook_strength: 8,
  cta_clarity: 6,
  hashtag_relevance: 7,
  platform_fit: 9,
  tone_match: 5,
  originality: 7,
  average: 7,
}

// Component computes its own average: (8+6+7+9+5+7)/6 = 42/6 = 7.0
const expectedAverage = '7.0'

describe('ScorecardRadar', () => {
  it('renders all six dimension labels', () => {
    render(<ScorecardRadar scorecard={scorecard} />)
    for (const label of ['Hook Strength', 'CTA Clarity', 'Hashtag Relevance', 'Platform Fit', 'Tone Match', 'Originality']) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })

  it('renders all six numeric values', () => {
    render(<ScorecardRadar scorecard={scorecard} />)
    // Each value appears in its own .scorecard-value span
    expect(screen.getByText('8')).toBeInTheDocument()
    expect(screen.getByText('6')).toBeInTheDocument()
    expect(screen.getByText('9')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    // 7 appears twice (hashtag_relevance and originality)
    expect(screen.getAllByText('7')).toHaveLength(2)
  })

  it('displays the correct average', () => {
    render(<ScorecardRadar scorecard={scorecard} />)
    expect(screen.getByText(`Average: ${expectedAverage}`)).toBeInTheDocument()
  })

  it('sets bar widths proportional to scores', () => {
    const { container } = render(<ScorecardRadar scorecard={scorecard} />)
    const fills = container.querySelectorAll('.scorecard-fill')
    expect(fills).toHaveLength(6)

    // hook_strength = 8 → 80%
    expect((fills[0] as HTMLElement).style.width).toBe('80%')
    // cta_clarity = 6 → 60%
    expect((fills[1] as HTMLElement).style.width).toBe('60%')
    // hashtag_relevance = 7 → 70%
    expect((fills[2] as HTMLElement).style.width).toBe('70%')
    // platform_fit = 9 → 90%
    expect((fills[3] as HTMLElement).style.width).toBe('90%')
    // tone_match = 5 → 50%
    expect((fills[4] as HTMLElement).style.width).toBe('50%')
    // originality = 7 → 70%
    expect((fills[5] as HTMLElement).style.width).toBe('70%')
  })

  it('applies Instagram pink color to all bars', () => {
    const { container } = render(<ScorecardRadar scorecard={scorecard} />)
    const fills = container.querySelectorAll('.scorecard-fill')
    for (const fill of fills) {
      expect((fill as HTMLElement).style.backgroundColor).toBe('rgb(225, 48, 108)')
    }
  })

  it('computes average independently of the scorecard.average field', () => {
    // Pass a scorecard where .average differs from the true mean
    const skewed: Scorecard = { ...scorecard, average: 999 }
    render(<ScorecardRadar scorecard={skewed} />)
    // Should still show the component-calculated average
    expect(screen.getByText(`Average: ${expectedAverage}`)).toBeInTheDocument()
  })
})
