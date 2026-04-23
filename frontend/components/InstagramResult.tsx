'use client'

import { useMemo, useState } from 'react'
import { useLanguage } from './LanguageProvider'
import type { InstagramContent } from '../lib/instagram-types'

interface InstagramResultProps {
  content: InstagramContent
  critique: string
}

function paragraphize(text: string) {
  return text
    .split(/\n\s*\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
}

function CopyButton({ text, idleLabel, doneLabel }: { text: string; idleLabel: string; doneLabel: string }) {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <button
      className="inline-flex items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
      type="button"
      onClick={copy}
    >
      {copied ? doneLabel : idleLabel}
    </button>
  )
}

export function InstagramResult({ content, critique }: InstagramResultProps) {
  const { language } = useLanguage()
  const copy =
    language === 'zh-TW'
      ? {
          overview: '展示版輸出',
          overviewTitle: '可直接展示、複製與講解的內容組合。',
          overviewBody: 'Neoxra 已把同一個主題整理成主 caption、hooks、輪播架構與 reel script，方便你在會議中直接走讀。',
          copy: '複製',
          copied: '已複製',
          copyAll: '複製整組',
          ready: '可展示',
          platformFit: 'Instagram-ready',
          primaryCopy: '主內容',
          caption: 'Caption',
          hookEyebrow: '開場選項',
          hookTitle: 'Hook Options',
          discovery: '擴散元素',
          hashtags: 'Hashtags',
          structure: '內容結構',
          carousel: 'Carousel Outline',
          motion: '影音版本',
          reel: 'Reel Script',
          editor: '編輯觀點',
          critique: 'Critique',
          slide: '第',
          slideSuffix: '頁',
        }
      : {
          overview: 'Presentation-ready',
          overviewTitle: 'A cleaner content package for live walkthroughs.',
          overviewBody: 'Neoxra has already shaped the topic into a primary caption, hooks, carousel structure, and reel script so you can present or copy it immediately.',
          copy: 'copy',
          copied: 'copied',
          copyAll: 'copy package',
          ready: 'ready to present',
          platformFit: 'Instagram-ready',
          primaryCopy: 'Primary copy',
          caption: 'Caption',
          hookEyebrow: 'Open strong',
          hookTitle: 'Hook Options',
          discovery: 'Discovery',
          hashtags: 'Hashtags',
          structure: 'Structure',
          carousel: 'Carousel Outline',
          motion: 'Motion version',
          reel: 'Reel Script',
          editor: 'Editor note',
          critique: 'Critique',
          slide: 'Slide',
          slideSuffix: '',
        }

  const captionParagraphs = useMemo(() => paragraphize(content.caption), [content.caption])
  const critiqueParagraphs = useMemo(() => paragraphize(critique), [critique])
  const fullPackage = useMemo(
    () =>
      [
        `${copy.caption}\n${content.caption}`,
        `${copy.hookTitle}\n${content.hook_options.map((hook, index) => `${index + 1}. ${hook}`).join('\n')}`,
        `${copy.hashtags}\n${content.hashtags.join(' ')}`,
        `${copy.carousel}\n${content.carousel_outline
          .map((slide, index) => `${copy.slide} ${index + 1}${copy.slideSuffix}\n${slide.title}\n${slide.body}`)
          .join('\n\n')}`,
        `${copy.reel}\n${content.reel_script}`,
      ].join('\n\n'),
    [content, copy]
  )

  return (
    <div className="space-y-5">
      <section className="rounded-[32px] border border-[color:var(--accent-soft)] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-lg)] sm:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex items-center rounded-full border border-[color:var(--accent-soft)] bg-[var(--accent-soft)] px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-[var(--text)]">
              {copy.overview}
            </span>
            <h3 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-[var(--text)] sm:text-3xl">
              {copy.overviewTitle}
            </h3>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)] sm:text-base">{copy.overviewBody}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <span className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--subtle)]">
              {copy.platformFit}
            </span>
            <span className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--accent-subtle)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
              {copy.ready}
            </span>
            <CopyButton text={fullPackage} idleLabel={copy.copyAll} doneLabel={copy.copied} />
          </div>
        </div>
      </section>

      <section className="rounded-[32px] border border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-lg)] backdrop-blur sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--subtle)]">{copy.primaryCopy}</span>
            <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--text)]">{copy.caption}</h3>
          </div>
          <CopyButton text={content.caption} idleLabel={copy.copy} doneLabel={copy.copied} />
        </div>
        <div className="space-y-4 rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
          {captionParagraphs.map((paragraph, index) => (
            <p key={`${paragraph}-${index}`} className="whitespace-pre-wrap text-[15px] leading-8 text-[var(--text)] sm:text-base">
              {paragraph}
            </p>
          ))}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(280px,0.95fr)]">
        <section className="rounded-[32px] border border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-lg)]">
          <div className="mb-4">
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--subtle)]">{copy.hookEyebrow}</span>
            <h3 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-[var(--text)]">{copy.hookTitle}</h3>
          </div>
          <ol className="space-y-3">
            {content.hook_options.map((hook, i) => (
              <li key={i} className="flex items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4">
                <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-full bg-[var(--accent-soft)] text-sm font-semibold text-[var(--text)]">
                  {i + 1}
                </span>
                <span className="text-sm leading-6 text-[var(--text)] sm:text-[15px]">{hook}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-[32px] border border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-lg)]">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <span className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--subtle)]">{copy.discovery}</span>
              <h3 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-[var(--text)]">{copy.hashtags}</h3>
            </div>
            <CopyButton text={content.hashtags.join(' ')} idleLabel={copy.copy} doneLabel={copy.copied} />
          </div>
          <div className="flex flex-wrap gap-2">
            {content.hashtags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)]"
              >
                {tag}
              </span>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-[32px] border border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-lg)]">
        <div className="mb-4">
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--subtle)]">{copy.structure}</span>
          <h3 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-[var(--text)]">{copy.carousel}</h3>
        </div>
        <ol className="grid gap-3 md:grid-cols-2">
          {content.carousel_outline.map((slide, i) => (
            <li key={i} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="mb-3 inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--panel)] px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-[var(--subtle)]">
                {copy.slide} {i + 1}
                {copy.slideSuffix}
              </div>
              <strong className="block text-base text-[var(--text)]">{slide.title}</strong>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{slide.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
        <section className="rounded-[32px] border border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-lg)]">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <span className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--subtle)]">{copy.motion}</span>
              <h3 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-[var(--text)]">{copy.reel}</h3>
            </div>
            <CopyButton text={content.reel_script} idleLabel={copy.copy} doneLabel={copy.copied} />
          </div>
          <div className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-5">
            <p className="whitespace-pre-wrap text-[15px] leading-8 text-[var(--text)] sm:text-base">{content.reel_script}</p>
          </div>
        </section>

        <section className="rounded-[32px] border border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-lg)]">
          <div className="mb-4">
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--subtle)]">{copy.editor}</span>
            <h3 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-[var(--text)]">{copy.critique}</h3>
          </div>
          <div className="space-y-3">
            {critiqueParagraphs.map((paragraph, index) => (
              <p key={`${paragraph}-${index}`} className="text-sm leading-6 text-[var(--muted)]">
                {paragraph}
              </p>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
