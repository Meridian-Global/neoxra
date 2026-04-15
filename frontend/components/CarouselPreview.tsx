'use client'

import type { CarouselSlide } from '../lib/instagram-types'

interface CarouselPreviewProps {
  slides: CarouselSlide[]
}

export function CarouselPreview({ slides }: CarouselPreviewProps) {
  return (
    <div className="carousel-preview">
      {slides.map((slide, i) => (
        <div key={i} className="carousel-card">
          <span className="carousel-number">0{i + 1}</span>
          <strong className="carousel-title">{slide.title}</strong>
          <p className="carousel-body">{slide.body}</p>
        </div>
      ))}
    </div>
  )
}
