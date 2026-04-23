'use client'

import { useState } from 'react'
import { useLanguage } from './LanguageProvider'
import type { ThreadsPost, ThreadsThread } from '../lib/threads-types'

type Language = 'en' | 'zh-TW'

const PURPOSE_LABELS: Record<Language, Record<ThreadsPost['purpose'], string>> = {
  'zh-TW': {
    hook: '開場',
    argument: '論點',
    evidence: '證據',
    punchline: '收束',
    cta: '互動',
  },
  en: {
    hook: 'Hook',
    argument: 'Argument',
    evidence: 'Evidence',
    punchline: 'Close',
    cta: 'CTA',
  },
}

const COPY = {
  'zh-TW': {
    title: '可直接貼到 Threads 的草稿',
    subtitle: '每則貼文都會顯示字數。超過 500 字會以紅色標示。',
    copyAll: '複製整串',
    copyOne: '複製此則',
    copied: '已複製',
  },
  en: {
    title: 'Draft ready to paste into Threads',
    subtitle: 'Each post shows character count. Posts over 500 characters are marked in red.',
    copyAll: 'Copy thread',
    copyOne: 'Copy post',
    copied: 'Copied',
  },
} satisfies Record<Language, Record<string, string>>

function formatThread(thread: ThreadsThread) {
  return thread.posts
    .map((post) => `${post.post_number}/${thread.posts.length}\n${post.content}`)
    .join('\n\n')
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

export function ThreadsPreview({ thread }: { thread: ThreadsThread }) {
  const { language } = useLanguage()
  const copy = COPY[language]
  const purposeLabels = PURPOSE_LABELS[language]
  const purposeStyles: Record<ThreadsPost['purpose'], string> = {
    hook: 'var(--gradient-icon-1)',
    argument: 'var(--gradient-icon-2)',
    evidence: 'var(--gradient-seo)',
    punchline: 'var(--gradient-icon-3)',
    cta: 'var(--gradient-icon-4)',
  }

  return (
    <section className="rounded-[24px] border border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-sm)] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
            THREADS PREVIEW
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-[-0.03em] text-[var(--text-primary)]">
            {copy.title}
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            {copy.subtitle}
          </p>
        </div>
        <CopyButton label={copy.copyAll} copiedLabel={copy.copied} value={formatThread(thread)} />
      </div>

      <div className="mt-8 space-y-5">
        {thread.posts.map((post, index) => {
          const charCount = post.content.length
          const isOverLimit = charCount > 500

          return (
            <article key={post.post_number} className="relative grid grid-cols-[32px_minmax(0,1fr)] gap-4">
              <div className="relative flex justify-center">
                <div className="z-10 flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] text-xs font-bold text-[var(--text-primary)]">
                  {post.post_number}
                </div>
                {index < thread.posts.length - 1 ? (
                  <div className="absolute top-8 h-[calc(100%+1.25rem)] w-[2px]" style={{ background: 'var(--gradient-warm)' }} />
                ) : null}
              </div>

              <div className="rounded-[18px] border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span
                    className="rounded-full px-3 py-1 text-xs font-semibold text-white"
                    style={{ background: purposeStyles[post.purpose] }}
                  >
                    {purposeLabels[post.purpose] ?? post.purpose}
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className={[
                        'rounded-full px-3 py-1 text-xs font-semibold',
                        isOverLimit
                          ? 'bg-red-500/12 text-red-500'
                          : 'bg-[var(--accent-subtle)] text-[var(--text-tertiary)]',
                      ].join(' ')}
                    >
                      {charCount}/500
                    </span>
                    <CopyButton label={copy.copyOne} copiedLabel={copy.copied} value={post.content} />
                  </div>
                </div>
                <p className="mt-4 whitespace-pre-wrap text-[15px] leading-7 text-[var(--text-primary)]">
                  {post.content}
                </p>
              </div>
            </article>
          )
        })}
      </div>

      <div className="mt-8 rounded-[18px] border border-[var(--border)] bg-[var(--bg-sunken)] p-5">
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
          Reply bait
        </div>
        <p className="mt-2 text-[15px] leading-7 text-[var(--text-primary)]">{thread.reply_bait}</p>
      </div>
    </section>
  )
}
