'use client'

import { useEffect, useRef, useState } from 'react'
import { FacebookPreview } from './FacebookPreview'
import { useLanguage } from './LanguageProvider'
import { ServerRenderedCarousel } from './ServerRenderedCarousel'
import { SeoArticlePreview } from './SeoArticlePreview'
import { ThreadsPreview } from './ThreadsPreview'
import { PlatformIcon } from './ui'
import { VisualCarouselRenderer } from './VisualCarouselRenderer'
import type { PipelineStepStatus } from './PipelineProgress'
import { renderCarousel } from '../lib/render-api'
import { toHTML, toMarkdown } from '../lib/seo-export'
import type { CarouselThemeId } from '../lib/carousel-themes'
import type { FacebookPost } from '../lib/facebook-types'
import type { InstagramContent } from '../lib/instagram-types'
import type { SeoArticle } from '../lib/seo-types'
import type { ThreadsThread } from '../lib/threads-types'

export type PlatformId = 'instagram' | 'seo' | 'threads' | 'facebook'
type Language = 'en' | 'zh-TW'

export interface PlatformResults {
  instagram?: InstagramContent
  seo?: SeoArticle
  threads?: ThreadsThread
  facebook?: FacebookPost
}

export type PlatformErrors = Partial<Record<PlatformId, string>>
export type PlatformStatuses = Record<PlatformId, PipelineStepStatus>

const TABS: Array<{ id: PlatformId; label: string }> = [
  { id: 'instagram', label: 'Instagram' },
  { id: 'seo', label: 'SEO' },
  { id: 'threads', label: 'Threads' },
  { id: 'facebook', label: 'Facebook' },
]

const COPY: Record<Language, Record<string, string>> = {
  'zh-TW': {
    copied: '已複製',
    failed: '產生失敗',
    incomplete: '尚未完成',
    waiting: '按下 Generate All 後，完成的內容會自動出現在這裡。',
    copyCaption: '複製 caption',
    copySlides: '複製輪播文字',
    copyHashtags: '複製 hashtags',
    copyMarkdown: '複製 Markdown',
    copyHtml: '複製 HTML',
    renderError: '圖片渲染失敗，使用預覽版本',
  },
  en: {
    copied: 'Copied',
    failed: 'failed',
    incomplete: 'not ready yet',
    waiting: 'After you press Generate All, completed content will appear here automatically.',
    copyCaption: 'Copy caption',
    copySlides: 'Copy slide text',
    copyHashtags: 'Copy hashtags',
    copyMarkdown: 'Copy Markdown',
    copyHtml: 'Copy HTML',
    renderError: 'Image rendering failed, using preview',
  },
}

function statusBadge(status: PipelineStepStatus) {
  if (status === 'running') return <span className="rounded-full bg-[var(--accent-subtle)] px-2 py-1 text-[10px] font-semibold text-[var(--accent)] animate-pulse">RUN</span>
  if (status === 'complete') return <span className="rounded-full bg-[color:color-mix(in_srgb,var(--success)_12%,transparent)] px-2 py-1 text-[10px] font-semibold text-[var(--success)]">DONE</span>
  if (status === 'error') return <span className="rounded-full bg-red-500/10 px-2 py-1 text-[10px] font-semibold text-red-500">ERR</span>
  return <span className="rounded-full bg-[var(--bg-elevated-2)] px-2 py-1 text-[10px] font-semibold text-[var(--text-tertiary)]">WAIT</span>
}

function CopyButton({ label, value, copiedLabel }: { label: string; value: string; copiedLabel: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1400)
  }

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      className="inline-flex h-9 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] px-3 text-xs font-semibold text-[var(--text-primary)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
    >
      {copied ? copiedLabel : label}
    </button>
  )
}

function EmptyState({ label, error, copy }: { label: string; error?: string; copy: Record<string, string> }) {
  return (
    <div className="rounded-[20px] border border-dashed border-[var(--border-bold)] bg-[var(--bg-sunken)] p-8 text-center">
      <p className="text-base font-semibold text-[var(--text-primary)]">
        {error ? `${label} ${copy.failed}` : `${label} ${copy.incomplete}`}
      </p>
      <p className="mt-2 text-sm leading-6 text-[var(--text-tertiary)]">
        {error ?? copy.waiting}
      </p>
    </div>
  )
}

function InstagramTab({
  content,
  topicSlug,
  exportDisabled,
  copy,
  selectedTemplateId,
}: {
  content?: InstagramContent
  topicSlug: string
  exportDisabled: boolean
  copy: Record<string, string>
  selectedTemplateId: string
}) {
  const [theme, setTheme] = useState<CarouselThemeId>('professional')
  const [renderedImages, setRenderedImages] = useState<string[]>([])
  const [isRendering, setIsRendering] = useState(false)
  const [renderError, setRenderError] = useState<string | null>(null)
  const lastRenderKeyRef = useRef<string>('')

  const slides = content?.carousel_outline ?? []
  const slidesKey = slides.map((s) => s.title).join('|')
  const renderKey = `${selectedTemplateId}::${slidesKey}`

  useEffect(() => {
    if (slides.length === 0) return
    if (renderKey === lastRenderKeyRef.current) return
    lastRenderKeyRef.current = renderKey

    let cancelled = false
    setIsRendering(true)
    setRenderError(null)

    renderCarousel(
      selectedTemplateId,
      slides.map((s) => ({
        title: s.title,
        body: s.body,
        text_alignment: s.text_alignment ?? 'center',
        emphasis: s.emphasis ?? 'normal',
      })),
    )
      .then((images) => {
        if (!cancelled) {
          setRenderedImages(images)
          setIsRendering(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRenderError(copy.renderError ?? 'Rendering failed')
          setIsRendering(false)
        }
      })

    return () => { cancelled = true }
  }, [renderKey, slides, copy.renderError, selectedTemplateId])

  if (!content) return <EmptyState label="Instagram" copy={copy} />

  const slidesText = content.carousel_outline
    .map((slide, index) => `${index + 1}/${content.carousel_outline.length}\n${slide.title}\n${slide.body}`)
    .join('\n\n')

  const useServerRendered = renderedImages.length > 0 || isRendering

  return (
    <div className="space-y-6">
      <section className="rounded-[20px] border border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-sm)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-[var(--text-primary)]">Caption</h3>
          <CopyButton label={copy.copyCaption} copiedLabel={copy.copied} value={content.caption} />
        </div>
        <p className="mt-4 whitespace-pre-wrap rounded-[14px] bg-[var(--bg-sunken)] p-4 text-[15px] leading-7 text-[var(--text-secondary)]">
          {content.caption}
        </p>
      </section>

      <section className="rounded-[20px] border border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-sm)]">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-[var(--text-primary)]">Carousel</h3>
          <CopyButton label={copy.copySlides} copiedLabel={copy.copied} value={slidesText} />
        </div>
        {useServerRendered && !renderError ? (
          <ServerRenderedCarousel
            images={renderedImages}
            loading={isRendering}
            error={null}
            topicSlug={topicSlug}
            slideCount={content.carousel_outline.length}
          />
        ) : (
          <VisualCarouselRenderer
            slides={content.carousel_outline}
            selectedTheme={theme}
            onThemeChange={setTheme}
            topicSlug={topicSlug}
            exportDisabled={exportDisabled}
          />
        )}
        {renderError ? (
          <p className="mt-2 text-center text-xs text-[var(--text-tertiary)]">{renderError}</p>
        ) : null}
      </section>

      <section className="rounded-[20px] border border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-sm)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-[var(--text-primary)]">Hashtags</h3>
          <CopyButton label={copy.copyHashtags} copiedLabel={copy.copied} value={content.hashtags.join(' ')} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {content.hashtags.map((tag) => (
            <span key={tag} className="rounded-full bg-[var(--bg-sunken)] px-3 py-1 text-sm font-semibold text-[var(--text-secondary)]">
              {tag}
            </span>
          ))}
        </div>
      </section>
    </div>
  )
}

function SeoTab({ article, copy }: { article?: SeoArticle; copy: Record<string, string> }) {
  if (!article) return <EmptyState label="SEO" copy={copy} />

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap justify-end gap-2 rounded-[20px] border border-[var(--border)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow-sm)]">
        <CopyButton label={copy.copyMarkdown} copiedLabel={copy.copied} value={toMarkdown(article)} />
        <CopyButton label={copy.copyHtml} copiedLabel={copy.copied} value={toHTML(article)} />
      </div>
      <SeoArticlePreview article={article} />
    </div>
  )
}

export function PlatformTabs({
  results,
  statuses,
  errors,
  topicSlug,
  isGenerating,
  selectedTemplateId = 'editorial-green',
}: {
  results: PlatformResults
  statuses: PlatformStatuses
  errors: PlatformErrors
  topicSlug: string
  isGenerating: boolean
  selectedTemplateId?: string
}) {
  const { language } = useLanguage()
  const copy = COPY[language]
  const [activeTab, setActiveTab] = useState<PlatformId>('instagram')
  const active = TABS.find((tab) => tab.id === activeTab) ?? TABS[0]

  return (
    <section className="rounded-[24px] border border-[var(--border)] bg-[var(--bg-elevated)] shadow-[var(--shadow-md)]">
      <div className="border-b border-[var(--border)] p-3">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={[
                'relative flex items-center justify-between gap-3 rounded-[14px] px-4 py-3 text-left text-sm font-bold transition',
                activeTab === tab.id
                  ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                  : 'bg-[var(--bg-sunken)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
              ].join(' ')}
            >
              <span className="flex min-w-0 items-center gap-2">
                <PlatformIcon platform={tab.id} size="sm" />
                <span className="truncate whitespace-nowrap">{tab.label}</span>
              </span>
              <span className="shrink-0">{statusBadge(statuses[tab.id])}</span>
              {activeTab === tab.id ? (
                <span className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full bg-[image:var(--gradient-warm)]" />
              ) : null}
            </button>
          ))}
        </div>
      </div>

      <div className="p-5 sm:p-6">
        {errors[active.id] ? (
          <EmptyState label={active.label} error={errors[active.id]} copy={copy} />
        ) : active.id === 'instagram' ? (
          <InstagramTab content={results.instagram} topicSlug={topicSlug} exportDisabled={isGenerating} copy={copy} selectedTemplateId={selectedTemplateId} />
        ) : active.id === 'seo' ? (
          <SeoTab article={results.seo} copy={copy} />
        ) : active.id === 'threads' ? (
          results.threads ? <ThreadsPreview thread={results.threads} /> : <EmptyState label={active.label} copy={copy} />
        ) : results.facebook ? (
          <FacebookPreview post={results.facebook} />
        ) : (
          <EmptyState label={active.label} copy={copy} />
        )}
      </div>
    </section>
  )
}
