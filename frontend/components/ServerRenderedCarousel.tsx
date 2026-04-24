'use client'

import { useEffect, useState } from 'react'
import { useLanguage } from './LanguageProvider'
import { DownloadPanel } from './DownloadPanel'

const COPY = {
  'zh-TW': {
    rendering: '正在渲染高畫質圖片…',
    renderError: '圖片渲染失敗，使用預覽版本',
    retry: '重試',
    quality: '高畫質',
    format: '1080 × 1080 PNG',
    previous: '上一張輪播',
    next: '下一張輪播',
    goTo: (index: number) => `切換到第 ${index + 1} 張`,
  },
  en: {
    rendering: 'Rendering high-quality images…',
    renderError: 'Image rendering failed, using preview',
    retry: 'Retry',
    quality: 'High Quality',
    format: '1080 × 1080 PNG',
    previous: 'Previous carousel slide',
    next: 'Next carousel slide',
    goTo: (index: number) => `Go to slide ${index + 1}`,
  },
}

function clampSlideIndex(index: number, count: number) {
  if (count <= 0) return 0
  if (index < 0) return count - 1
  if (index >= count) return 0
  return index
}

interface ServerRenderedCarouselProps {
  images: string[]
  loading: boolean
  error: string | null
  topicSlug: string
  slideCount: number
  onRetry?: () => void
}

export function ServerRenderedCarousel({
  images,
  loading,
  error,
  topicSlug,
  slideCount,
  onRetry,
}: ServerRenderedCarouselProps) {
  const { language } = useLanguage()
  const copy = COPY[language]
  const [activeIndex, setActiveIndex] = useState(0)

  const totalSlides = images.length || slideCount

  useEffect(() => {
    setActiveIndex((current) => clampSlideIndex(current, totalSlides))
  }, [totalSlides])

  function goToPrevious() {
    setActiveIndex((current) => clampSlideIndex(current - 1, totalSlides))
  }

  function goToNext() {
    setActiveIndex((current) => clampSlideIndex(current + 1, totalSlides))
  }

  return (
    <div className="space-y-5">
      {/* Phone frame */}
      <div className="mx-auto w-full max-w-[420px] rounded-[34px] border border-[var(--border)] bg-[var(--bg-sunken)] p-3 shadow-[var(--shadow-lg)] sm:p-4">
        <div className="mb-3 flex items-center justify-between px-3 text-[11px] font-semibold text-[var(--text-tertiary)]">
          <span>9:41</span>
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-4 rounded-full bg-[var(--text-tertiary)]/50" />
            <span className="h-1.5 w-3 rounded-full bg-[var(--text-tertiary)]/50" />
            <span className="h-1.5 w-5 rounded-full bg-[var(--text-tertiary)]/50" />
          </div>
        </div>

        <div className="overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--bg-elevated)] shadow-[var(--shadow-md)]">
          <div className="relative aspect-square w-full">
            {loading ? (
              <div className="flex h-full flex-col items-center justify-center gap-4 bg-[var(--bg-sunken)]">
                <span className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--border-bold)] border-t-[var(--accent)]" />
                <p className="text-sm font-medium text-[var(--text-secondary)]">{copy.rendering}</p>
              </div>
            ) : error ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 bg-[var(--bg-sunken)] px-6">
                <p className="text-center text-sm text-[var(--text-secondary)]">{error}</p>
                {onRetry ? (
                  <button
                    type="button"
                    onClick={onRetry}
                    className="rounded-[8px] border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-2 text-xs font-semibold text-[var(--text-primary)] transition hover:bg-[var(--bg-sunken)]"
                  >
                    {copy.retry}
                  </button>
                ) : null}
              </div>
            ) : images[activeIndex] ? (
              <img
                src={images[activeIndex]}
                alt={`Slide ${activeIndex + 1}`}
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-[var(--bg-sunken)]">
                <p className="text-sm text-[var(--text-tertiary)]">{copy.rendering}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quality badge */}
      {images.length > 0 ? (
        <div className="flex justify-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--bg-sunken)] px-3 py-1 text-[10px] font-medium text-[var(--text-tertiary)]">
            {copy.quality} · {copy.format}
          </span>
        </div>
      ) : null}

      {/* Navigation */}
      {totalSlides > 1 ? (
        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={goToPrevious}
            disabled={loading}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] text-lg text-[var(--text-primary)] shadow-[var(--shadow-sm)] transition hover:bg-[var(--bg-sunken)] disabled:opacity-50"
            aria-label={copy.previous}
          >
            ‹
          </button>
          <div className="flex items-center gap-2">
            {Array.from({ length: totalSlides }).map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={`h-2.5 rounded-full transition ${
                  activeIndex === index ? 'w-7 bg-[var(--text-primary)]' : 'w-2.5 bg-[var(--border-bold)]'
                }`}
                aria-label={copy.goTo(index)}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={goToNext}
            disabled={loading}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] text-lg text-[var(--text-primary)] shadow-[var(--shadow-sm)] transition hover:bg-[var(--bg-sunken)] disabled:opacity-50"
            aria-label={copy.next}
          >
            ›
          </button>
        </div>
      ) : null}

      {/* Download panel */}
      {images.length > 0 ? (
        <DownloadPanel
          images={images}
          topicSlug={topicSlug}
          currentIndex={activeIndex}
          disabled={loading}
        />
      ) : null}
    </div>
  )
}
