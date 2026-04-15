import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { InstagramResult } from '../components/InstagramResult'
import type { InstagramContent } from '../lib/instagram-types'

const fixture: InstagramContent = {
  caption: 'Test caption about AI tools',
  hook_options: ['Hook A', 'Hook B', 'Hook C'],
  hashtags: ['aitools', 'productivity', 'tech'],
  carousel_outline: [
    { title: 'Slide 1 Title', body: 'Slide 1 body text' },
    { title: 'Slide 2 Title', body: 'Slide 2 body text' },
  ],
  reel_script: 'Open on a close-up of the screen...',
}

const critique = 'Consider adding a stronger call-to-action.'

const writeText = jest.fn().mockResolvedValue(undefined)

beforeEach(() => {
  writeText.mockClear()
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText },
    writable: true,
    configurable: true,
  })
})

describe('InstagramResult', () => {
  it('renders all six section headings', () => {
    render(<InstagramResult content={fixture} critique={critique} />)
    for (const heading of ['Caption', 'Hook Options', 'Hashtags', 'Carousel Outline', 'Reel Script', 'Critique']) {
      expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument()
    }
  })

  it('renders the caption text', () => {
    render(<InstagramResult content={fixture} critique={critique} />)
    expect(screen.getByText(fixture.caption)).toBeInTheDocument()
  })

  it('renders hook options as a numbered list', () => {
    render(<InstagramResult content={fixture} critique={critique} />)
    const items = screen.getAllByRole('listitem')
    expect(items.some((li) => li.textContent === 'Hook A')).toBe(true)
    expect(items.some((li) => li.textContent === 'Hook B')).toBe(true)
    expect(items.some((li) => li.textContent === 'Hook C')).toBe(true)
  })

  it('renders hashtags as individual chips without # prefix', () => {
    render(<InstagramResult content={fixture} critique={critique} />)
    for (const tag of fixture.hashtags) {
      const chip = screen.getByText(tag)
      expect(chip).toBeInTheDocument()
      expect(chip).toHaveClass('hashtag-chip')
    }
  })

  it('renders carousel slides with bold titles and body text', () => {
    render(<InstagramResult content={fixture} critique={critique} />)
    for (const slide of fixture.carousel_outline) {
      const title = screen.getByText(slide.title)
      expect(title.tagName).toBe('STRONG')
      expect(screen.getByText(slide.body)).toBeInTheDocument()
    }
  })

  it('renders the reel script text', () => {
    render(<InstagramResult content={fixture} critique={critique} />)
    expect(screen.getByText(fixture.reel_script)).toBeInTheDocument()
  })

  it('renders the critique text', () => {
    render(<InstagramResult content={fixture} critique={critique} />)
    expect(screen.getByText(critique)).toBeInTheDocument()
  })

  it('caption Copy button copies the caption text', async () => {
    render(<InstagramResult content={fixture} critique={critique} />)

    const copyButtons = screen.getAllByRole('button', { name: 'copy' })
    fireEvent.click(copyButtons[0])

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(fixture.caption)
    })
  })

  it('reel script Copy button copies the reel script text', async () => {
    render(<InstagramResult content={fixture} critique={critique} />)

    const copyButtons = screen.getAllByRole('button', { name: 'copy' })
    fireEvent.click(copyButtons[1])

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(fixture.reel_script)
    })
  })

  it('Copy button shows "copied" after click', async () => {
    render(<InstagramResult content={fixture} critique={critique} />)

    const copyButtons = screen.getAllByRole('button', { name: 'copy' })
    fireEvent.click(copyButtons[0])

    await waitFor(() => {
      expect(screen.getByText('copied')).toBeInTheDocument()
    })
  })
})
