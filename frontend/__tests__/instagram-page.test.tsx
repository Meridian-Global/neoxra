import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import InstagramPage from '../app/instagram/page'
import { streamSSE } from '../lib/sse'
import type { SSEEvent } from '../lib/sse'

jest.mock('../lib/sse')
const mockStreamSSE = streamSSE as jest.MockedFunction<typeof streamSSE>

/* ── Fixture data matching backend SSE payloads ── */

const mockStyleAnalysis = {
  tone_keywords: ['bold', 'direct'],
  structural_patterns: ['hook-body-cta'],
  vocabulary_notes: 'Uses action verbs',
}

const mockContent = {
  caption: 'Test caption about AI tools',
  hook_options: ['Hook Alpha', 'Hook Beta'],
  hashtags: ['aitools', 'productivity'],
  carousel_outline: [
    { title: 'Slide One', body: 'First body' },
    { title: 'Slide Two', body: 'Second body' },
  ],
  reel_script: 'Open on a dramatic zoom',
}

const mockScoreData = {
  hook_strength: 8,
  cta_clarity: 6,
  hashtag_relevance: 7,
  platform_fit: 9,
  tone_match: 5,
  originality: 7,
}

const mockPipelineResult = {
  content: mockContent,
  scorecard: { ...mockScoreData, average: 7.0 },
  critique: 'Strong content with room for improvement.',
  style_analysis: mockStyleAnalysis,
}

/* ── Helpers ── */

function mockEvents(events: SSEEvent[]) {
  mockStreamSSE.mockImplementation(async function* () {
    for (const e of events) yield e
  })
}

async function fillAndSubmit() {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText(/topic/i), 'AI tools')
  await user.type(screen.getByLabelText(/template/i), 'Some template')
  await user.click(screen.getByRole('button', { name: /generate/i }))
}

/* ── Tests ── */

describe('InstagramPage progressive rendering', () => {
  it('shows content sections after generation_completed (no scorecard)', async () => {
    mockEvents([
      { event: 'style_analysis_completed', data: mockStyleAnalysis },
      { event: 'generation_completed', data: mockContent },
    ])

    render(<InstagramPage />)
    await fillAndSubmit()

    // Content sections visible
    await waitFor(() => {
      expect(screen.getByText(mockContent.caption)).toBeInTheDocument()
    })
    expect(screen.getByText('Hook Alpha')).toBeInTheDocument()
    expect(screen.getByText('Hook Beta')).toBeInTheDocument()
    expect(screen.getByText('aitools')).toBeInTheDocument()
    expect(screen.getByText('productivity')).toBeInTheDocument()
    expect(screen.getByText(mockContent.reel_script)).toBeInTheDocument()

    // Style analysis chips visible
    expect(screen.getByText('bold')).toBeInTheDocument()
    expect(screen.getByText('direct')).toBeInTheDocument()

    // Scorecard NOT visible yet
    expect(screen.queryByText('Hook Strength')).not.toBeInTheDocument()
    // Carousel deck NOT visible yet (requires critique)
    expect(screen.queryByText('Carousel Deck')).not.toBeInTheDocument()
  })

  it('shows scorecard bar chart after scoring_completed', async () => {
    mockEvents([
      { event: 'style_analysis_completed', data: mockStyleAnalysis },
      { event: 'generation_completed', data: mockContent },
      { event: 'scoring_completed', data: mockScoreData },
    ])

    render(<InstagramPage />)
    await fillAndSubmit()

    await waitFor(() => {
      expect(screen.getByText('Hook Strength')).toBeInTheDocument()
    })
    expect(screen.getByText('CTA Clarity')).toBeInTheDocument()
    expect(screen.getByText('Hashtag Relevance')).toBeInTheDocument()
    expect(screen.getByText('Platform Fit')).toBeInTheDocument()
    expect(screen.getByText('Tone Match')).toBeInTheDocument()
    expect(screen.getByText('Originality')).toBeInTheDocument()
    // Average: (8+6+7+9+5+7)/6 = 7.0
    expect(screen.getByText('Average: 7.0')).toBeInTheDocument()

    // Carousel deck still NOT visible (requires critique)
    expect(screen.queryByText('Carousel Deck')).not.toBeInTheDocument()
  })

  it('shows all sections including carousel deck and critique after pipeline_completed', async () => {
    mockEvents([
      { event: 'style_analysis_completed', data: mockStyleAnalysis },
      { event: 'generation_completed', data: mockContent },
      { event: 'scoring_completed', data: mockScoreData },
      { event: 'pipeline_completed', data: mockPipelineResult },
    ])

    render(<InstagramPage />)
    await fillAndSubmit()

    // Critique visible
    await waitFor(() => {
      expect(screen.getByText(mockPipelineResult.critique)).toBeInTheDocument()
    })

    // Carousel deck visible (slide titles appear in both InstagramResult and CarouselPreview)
    expect(screen.getByText('Carousel Deck')).toBeInTheDocument()
    expect(screen.getAllByText('Slide One')).toHaveLength(2)
    expect(screen.getAllByText('Slide Two')).toHaveLength(2)

    // Content still visible
    expect(screen.getByText(mockContent.caption)).toBeInTheDocument()

    // Scorecard still visible
    expect(screen.getByText('Hook Strength')).toBeInTheDocument()

    // Style analysis still visible
    expect(screen.getByText('bold')).toBeInTheDocument()
  })

  it('shows stage indicator during streaming', async () => {
    mockEvents([
      { event: 'style_analysis_started', data: {} },
      { event: 'style_analysis_completed', data: mockStyleAnalysis },
    ])

    render(<InstagramPage />)
    // Form is present before submission
    expect(screen.getByRole('button', { name: /generate/i })).toBeInTheDocument()

    await fillAndSubmit()

    // After stream completes, style analysis should be visible
    await waitFor(() => {
      expect(screen.getByText('bold')).toBeInTheDocument()
    })
  })

  it('renders error banner when backend emits an error event', async () => {
    mockEvents([
      { event: 'style_analysis_completed', data: mockStyleAnalysis },
      { event: 'error', data: { message: 'Rate limit exceeded' } },
    ])

    render(<InstagramPage />)
    await fillAndSubmit()

    await waitFor(() => {
      expect(screen.getByText('Generation stopped')).toBeInTheDocument()
    })
    expect(screen.getByText('Rate limit exceeded')).toBeInTheDocument()

    // Style analysis rendered before the error should still be visible
    expect(screen.getByText('bold')).toBeInTheDocument()
  })

  it('renders error banner when stream throws a network error', async () => {
    mockStreamSSE.mockImplementation(async function* () {
      yield { event: 'style_analysis_completed', data: mockStyleAnalysis }
      throw new Error('Network connection lost')
    })

    render(<InstagramPage />)
    await fillAndSubmit()

    await waitFor(() => {
      expect(screen.getByText('Generation stopped')).toBeInTheDocument()
    })
    expect(screen.getByText('Network connection lost')).toBeInTheDocument()
  })

  it('stops streaming when cancel is triggered', async () => {
    let yieldResolve: () => void
    const blockForever = new Promise<void>((r) => { yieldResolve = r })

    mockStreamSSE.mockImplementation(async function* (_url, _body, signal) {
      yield { event: 'style_analysis_started', data: {} }
      // Hang here until the test aborts via the signal
      await Promise.race([
        blockForever,
        new Promise<void>((resolve) => {
          signal?.addEventListener('abort', () => resolve())
        }),
      ])
      // If signal was aborted, this should not be consumed
      if (!signal?.aborted) {
        yield { event: 'generation_completed', data: mockContent }
      }
    })

    const user = userEvent.setup()
    render(<InstagramPage />)

    await user.type(screen.getByLabelText(/topic/i), 'AI tools')
    await user.type(screen.getByLabelText(/template/i), 'Some template')
    await user.click(screen.getByRole('button', { name: /generate/i }))

    // Wait for the streaming state — cancel button appears
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /cancel/i }))

    // After cancel, status should revert to idle — "Ready" pill visible
    await waitFor(() => {
      expect(screen.getByText('Ready')).toBeInTheDocument()
    })

    // generation_completed was never yielded, so caption should not appear
    expect(screen.queryByText(mockContent.caption)).not.toBeInTheDocument()

    // Unblock so the generator can clean up
    yieldResolve!()
  })
})
