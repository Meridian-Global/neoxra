import { render, screen } from '@testing-library/react'
import { CarouselPreview } from '../components/CarouselPreview'
import type { CarouselSlide } from '../lib/instagram-types'

const slides: CarouselSlide[] = [
  { title: 'Intro', body: 'Welcome to the series' },
  { title: 'Problem', body: 'Here is the challenge' },
  { title: 'Solution', body: 'Our approach explained' },
  { title: 'Evidence', body: 'Data that supports it' },
  { title: 'CTA', body: 'Follow for more tips' },
]

describe('CarouselPreview', () => {
  it('renders the correct number of cards', () => {
    const { container } = render(<CarouselPreview slides={slides} />)
    expect(container.querySelectorAll('.carousel-card')).toHaveLength(5)
  })

  it('displays 1-based slide numbers', () => {
    render(<CarouselPreview slides={slides} />)
    for (let i = 1; i <= 5; i++) {
      expect(screen.getByText(String(i))).toBeInTheDocument()
    }
  })

  it('renders each slide title in bold', () => {
    render(<CarouselPreview slides={slides} />)
    for (const slide of slides) {
      const el = screen.getByText(slide.title)
      expect(el.tagName).toBe('STRONG')
    }
  })

  it('renders each slide body text', () => {
    render(<CarouselPreview slides={slides} />)
    for (const slide of slides) {
      expect(screen.getByText(slide.body)).toBeInTheDocument()
    }
  })

  it('container has horizontal scroll style', () => {
    const { container } = render(<CarouselPreview slides={slides} />)
    const wrapper = container.querySelector('.carousel-preview') as HTMLElement
    expect(wrapper.style.overflowX).toBe('auto')
  })

  it('cards have a minimum width of 200px', () => {
    const { container } = render(<CarouselPreview slides={slides} />)
    const cards = container.querySelectorAll('.carousel-card')
    for (const card of cards) {
      expect((card as HTMLElement).style.minWidth).toBe('200px')
    }
  })
})
