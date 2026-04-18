'use client'

import type { CarouselSlide } from '../lib/instagram-types'

interface CarouselPreviewProps {
  slides: CarouselSlide[]
}

export function CarouselPreview({ slides }: CarouselPreviewProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {slides.map((slide, i) => (
        <div key={i} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <span className="inline-flex rounded-full border border-[var(--border)] px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-[var(--subtle)]">
            Slide {i + 1}
          </span>
          <strong className="mt-4 block text-base text-[var(--text)]">{slide.title}</strong>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{slide.body}</p>
        </div>
      ))}
    </div>
  )
}
