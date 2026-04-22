'use client'

import { useState } from 'react'
import { FacebookPreview } from './FacebookPreview'
import { useLanguage } from './LanguageProvider'
import { SeoArticlePreview } from './SeoArticlePreview'
import { ThreadsPreview } from './ThreadsPreview'
import { VisualCarouselRenderer } from './VisualCarouselRenderer'
import type { PipelineStepStatus } from './PipelineProgress'
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

const TABS: Array<{ id: PlatformId; label: string; icon: string }> = [
  { id: 'instagram', label: 'Instagram', icon: '◎' },
  { id: 'seo', label: 'SEO', icon: 'S' },
  { id: 'threads', label: 'Threads', icon: '#' },
  { id: 'facebook', label: 'Facebook', icon: 'f' },
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
  },
}

function statusBadge(status: PipelineStepStatus) {
  if (status === 'running') return <span className="h-3 w-3 animate-spin rounded-full border-2 border-[var(--border-bold)] border-t-[var(--accent)]" />
  if (status === 'complete') return <span className="text-emerald-500">✓</span>
  if (status === 'error') return <span className="text-red-500">!</span>
  return <span className="h-2 w-2 rounded-full bg-[var(--text-tertiary)]" />
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
      className="inline-flex h-9 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] px-3 text-xs font-semibold text-[var(--text-primary)] transition hover:bg-[var(--bg-sunken)]"
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
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
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
}: {
  content?: InstagramContent
  topicSlug: string
  exportDisabled: boolean
  copy: Record<string, string>
}) {
  const [theme, setTheme] = useState<CarouselThemeId>('professional')

  if (!content) return <EmptyState label="Instagram" copy={copy} />

  const slidesText = content.carousel_outline
    .map((slide, index) => `${index + 1}/${content.carousel_outline.length}\n${slide.title}\n${slide.body}`)
    .join('\n\n')

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
        <VisualCarouselRenderer
          slides={content.carousel_outline}
          selectedTheme={theme}
          onThemeChange={setTheme}
          topicSlug={topicSlug}
          exportDisabled={exportDisabled}
        />
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
}: {
  results: PlatformResults
  statuses: PlatformStatuses
  errors: PlatformErrors
  topicSlug: string
  isGenerating: boolean
}) {
  const { language } = useLanguage()
  const copy = COPY[language]
  const [activeTab, setActiveTab] = useState<PlatformId>('instagram')
  const active = TABS.find((tab) => tab.id === activeTab) ?? TABS[0]

  return (
    <section className="rounded-[24px] border border-[var(--border)] bg-[var(--bg-elevated)] shadow-[var(--shadow-md)]">
      <div className="border-b border-[var(--border)] p-3">
        <div className="grid gap-2 sm:grid-cols-4">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={[
                'flex items-center justify-between gap-3 rounded-[14px] px-4 py-3 text-left text-sm font-bold transition',
                activeTab === tab.id
                  ? 'bg-[var(--bg-accent)] text-[var(--text-on-accent)]'
                  : 'bg-[var(--bg-sunken)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
              ].join(' ')}
            >
              <span className="flex items-center gap-2">
                <span>{tab.icon}</span>
                {tab.label}
              </span>
              <span>{statusBadge(statuses[tab.id])}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="p-5 sm:p-6">
        {errors[active.id] ? (
          <EmptyState label={active.label} error={errors[active.id]} copy={copy} />
        ) : active.id === 'instagram' ? (
          <InstagramTab content={results.instagram} topicSlug={topicSlug} exportDisabled={isGenerating} copy={copy} />
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
