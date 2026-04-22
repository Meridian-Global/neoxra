'use client'

import { useEffect, useRef, useState } from 'react'
import { CAROUSEL_THEMES, getCarouselTheme, type CarouselThemeId } from '../lib/carousel-themes'
import { exportCarousel } from '../lib/carousel-export'
import { useLanguage } from './LanguageProvider'
import type { CarouselSlide } from '../lib/instagram-types'

const COPY = {
  'zh-TW': {
    exportError: '匯出輪播圖片失敗，請稍後再試。',
    fallbackTitle: '內容重點',
    fallbackBody: '輸入主題後，這裡會顯示適合 Instagram 輪播的內容。',
    previous: '上一張輪播',
    next: '下一張輪播',
    goTo: (index: number) => `切換到第 ${index + 1} 張`,
    exporting: '匯出中…',
    download: '下載輪播圖片',
  },
  en: {
    exportError: 'Carousel image export failed. Please try again later.',
    fallbackTitle: 'Content point',
    fallbackBody: 'After you enter a topic, Instagram carousel-ready content will appear here.',
    previous: 'Previous carousel slide',
    next: 'Next carousel slide',
    goTo: (index: number) => `Go to slide ${index + 1}`,
    exporting: 'Exporting…',
    download: 'Download carousel images',
  },
}

const THEME_LABELS: Record<
  'en' | 'zh-TW',
  Record<CarouselThemeId, string>
> = {
  'zh-TW': {
    professional: '專業',
    bold: '醒目',
    minimal: '極簡',
  },
  en: {
    professional: 'Professional',
    bold: 'Bold',
    minimal: 'Minimal',
  },
}

interface VisualCarouselRendererProps {
  slides: CarouselSlide[]
  selectedTheme: CarouselThemeId
  onThemeChange: (theme: CarouselThemeId) => void
  topicSlug: string
  exportDisabled?: boolean
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
  topicSlug,
  exportDisabled = false,
}: VisualCarouselRendererProps) {
  const { language } = useLanguage()
  const copy = COPY[language]
  const themeLabels = THEME_LABELS[language]
  const [activeIndex, setActiveIndex] = useState(0)
  const [isExporting, setIsExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const exportSlideRefs = useRef<HTMLDivElement[]>([])
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

  async function handleExport() {
    if (exportDisabled || isExporting) return

    setIsExporting(true)
    setExportError(null)

    try {
      await exportCarousel(exportSlideRefs.current.slice(0, slides.length), topicSlug)
    } catch (err) {
      setExportError(err instanceof Error ? err.message : copy.exportError)
    } finally {
      setIsExporting(false)
    }
  }

  function renderSlide(slide: CarouselSlide | undefined, index: number, mode: 'preview' | 'export') {
    const isExport = mode === 'export'
    const textAlignment = slide?.text_alignment ?? 'center'
    const emphasis = slide?.emphasis ?? 'normal'
    const alignmentClass =
      textAlignment === 'left' ? 'items-start text-left' : textAlignment === 'right' ? 'items-end text-right' : 'items-center text-center'
    const headlineClass =
      emphasis === 'strong'
        ? isExport ? 'text-[104px]' : 'text-[34px] sm:text-[40px]'
        : emphasis === 'quiet'
          ? isExport ? 'text-[76px]' : 'text-[26px] sm:text-[32px]'
          : isExport ? 'text-[92px]' : 'text-[30px] sm:text-[36px]'

    return (
      <div
        className={`relative aspect-square w-full ${isExport ? 'p-[88px]' : 'p-7 sm:p-8'}`}
        style={{ background: theme.bgColor, color: theme.textColor }}
      >
        <div
          className={`inline-flex rounded-full font-bold ${isExport ? 'px-8 py-3 text-[32px]' : 'px-3 py-1 text-xs'}`}
          style={{ background: theme.accentColor, color: theme.id === 'minimal' ? '#FFFFFF' : '#111827' }}
        >
          {index + 1}/{slides.length || 1}
        </div>

        <div className={`flex flex-col justify-center ${alignmentClass} ${isExport ? 'h-[calc(100%-92px)]' : 'h-[calc(100%-2.25rem)]'}`}>
          <h4
            className={`max-w-[92%] font-bold tracking-[-0.03em] ${
              isExport ? `${headlineClass} leading-[1.05]` : `${headlineClass} leading-[1.08]`
            }`}
          >
            {slide?.title ?? copy.fallbackTitle}
          </h4>
          <p
            className={`mt-5 max-w-[92%] font-medium ${isExport ? 'text-[44px] leading-[1.42]' : 'text-[16px] leading-7 sm:text-[18px]'}`}
            style={{ color: theme.subtextColor }}
          >
            {slide?.body ?? copy.fallbackBody}
          </p>
        </div>

        <div
          className={`absolute rounded-full ${isExport ? 'bottom-[88px] left-[88px] h-3 w-44' : 'bottom-6 left-7 h-1 w-16 sm:left-8'}`}
          style={{ background: theme.accentColor }}
        />
      </div>
    )
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
            {themeLabels[themeOption.id]}
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
          {renderSlide(activeSlide, activeIndex, 'preview')}
        </div>
      </div>

      <div className="flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={goToPrevious}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] text-lg text-[var(--text-primary)] shadow-[var(--shadow-sm)] transition hover:bg-[var(--bg-sunken)]"
          aria-label={copy.previous}
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
              aria-label={copy.goTo(index)}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={goToNext}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] text-lg text-[var(--text-primary)] shadow-[var(--shadow-sm)] transition hover:bg-[var(--bg-sunken)]"
          aria-label={copy.next}
        >
          ›
        </button>
      </div>

      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={handleExport}
          disabled={exportDisabled || isExporting || slides.length === 0}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] border border-[var(--border)] bg-[var(--bg-elevated)] px-5 text-sm font-semibold text-[var(--text-primary)] shadow-[var(--shadow-sm)] transition hover:bg-[var(--bg-sunken)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isExporting ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--border-bold)] border-t-[var(--text-primary)]" />
              {copy.exporting}
            </>
          ) : (
            copy.download
          )}
        </button>
        {exportError ? <p className="text-sm text-[var(--text-secondary)]">{exportError}</p> : null}
      </div>

      <div className="pointer-events-none fixed left-[-12000px] top-0 z-[-1]">
        {slides.map((slide, index) => (
          <div
            key={`${slide.title}-export-${index}`}
            ref={(element) => {
              if (element) exportSlideRefs.current[index] = element
            }}
            className="h-[1080px] w-[1080px] overflow-hidden"
          >
            {renderSlide(slide, index, 'export')}
          </div>
        ))}
      </div>
    </div>
  )
}
