'use client'

import { useEffect, useState } from 'react'
import { CAROUSEL_THEMES, getCarouselTheme, type CarouselThemeId } from '../lib/carousel-themes'
import type { CarouselSlide } from '../lib/instagram-types'

interface VisualCarouselRendererProps {
  slides: CarouselSlide[]
  selectedTheme: CarouselThemeId
  onThemeChange: (theme: CarouselThemeId) => void
}

function clampSlideIndex(index: number, slideCount: number) {
  if (slideCount <= 0) return 0
  if (index < 0) return slideCount - 1
  if (index >= slideCount) return 0
  return index
}

export function VisualCarouselRenderer({
  slides,
  selectedTheme,
  onThemeChange,
}: VisualCarouselRendererProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const theme = getCarouselTheme(selectedTheme)
  const activeSlide = slides[activeIndex] ?? slides[0]

  useEffect(() => {
    setActiveIndex((current) => clampSlideIndex(current, slides.length))
  }, [slides.length])

  function goToPrevious() {
    setActiveIndex((current) => clampSlideIndex(current - 1, slides.length))
  }

  function goToNext() {
    setActiveIndex((current) => clampSlideIndex(current + 1, slides.length))
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {CAROUSEL_THEMES.map((themeOption) => (
          <button
            key={themeOption.id}
            type="button"
            onClick={() => onThemeChange(themeOption.id)}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
              selectedTheme === themeOption.id
                ? 'border-[var(--border-bold)] bg-[var(--bg-accent)] text-[var(--text-on-accent)]'
                : 'border-[var(--border)] bg-[var(--bg-sunken)] text-[var(--text-secondary)] hover:border-[var(--border-bold)]'
            }`}
          >
            {themeOption.name}
          </button>
        ))}
      </div>

      <div className="mx-auto w-full max-w-[420px] rounded-[34px] border border-[var(--border)] bg-[var(--bg-sunken)] p-3 shadow-[var(--shadow-lg)] sm:p-4">
        <div className="mb-3 flex items-center justify-between px-3 text-[11px] font-semibold text-[var(--text-tertiary)]">
          <span>9:41</span>
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-4 rounded-full bg-[var(--text-tertiary)]/50" />
            <span className="h-1.5 w-3 rounded-full bg-[var(--text-tertiary)]/50" />
            <span className="h-1.5 w-5 rounded-full bg-[var(--text-tertiary)]/50" />
          </div>
        </div>

        <div className="overflow-hidden rounded-[24px] border border-black/10 bg-black shadow-[var(--shadow-md)]">
          <div
            className="relative aspect-square w-full p-7 sm:p-8"
            style={{ background: theme.bgColor, color: theme.textColor }}
          >
            <div
              className="inline-flex rounded-full px-3 py-1 text-xs font-bold"
              style={{ background: theme.accentColor, color: theme.id === 'minimal' ? '#FFFFFF' : '#111827' }}
            >
              {activeIndex + 1}/{slides.length || 1}
            </div>

            <div className="flex h-[calc(100%-2.25rem)] flex-col justify-center">
              <h4 className="max-w-[92%] text-[30px] font-bold leading-[1.08] tracking-[-0.03em] sm:text-[36px]">
                {activeSlide?.title ?? '內容重點'}
              </h4>
              <p
                className="mt-5 max-w-[92%] text-[16px] font-medium leading-7 sm:text-[18px]"
                style={{ color: theme.subtextColor }}
              >
                {activeSlide?.body ?? '輸入主題後，這裡會顯示適合 Instagram 輪播的內容。'}
              </p>
            </div>

            <div
              className="absolute bottom-6 left-7 h-1 w-16 rounded-full sm:left-8"
              style={{ background: theme.accentColor }}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={goToPrevious}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] text-lg text-[var(--text-primary)] shadow-[var(--shadow-sm)] transition hover:bg-[var(--bg-sunken)]"
          aria-label="上一張輪播"
        >
          ‹
        </button>
        <div className="flex items-center gap-2">
          {slides.map((slide, index) => (
            <button
              key={`${slide.title}-${index}`}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`h-2.5 rounded-full transition ${
                activeIndex === index ? 'w-7 bg-[var(--text-primary)]' : 'w-2.5 bg-[var(--border-bold)]'
              }`}
              aria-label={`切換到第 ${index + 1} 張`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={goToNext}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] text-lg text-[var(--text-primary)] shadow-[var(--shadow-sm)] transition hover:bg-[var(--bg-sunken)]"
          aria-label="下一張輪播"
        >
          ›
        </button>
      </div>
    </div>
  )
}
