'use client'

import { useState } from 'react'
import { useLanguage } from './LanguageProvider'
import type { FacebookPost } from '../lib/facebook-types'

type Language = 'en' | 'zh-TW'

const COPY: Record<Language, Record<string, string>> = {
  'zh-TW': {
    copied: '已複製',
    copyPost: '複製貼文',
    title: 'Facebook 原生長文草稿',
    subtitle: '從 Instagram 內容延展成更適合討論與分享的 Facebook 貼文。',
    nowPublic: '剛剛 · 公開',
    discussion: '討論引導',
    image: '圖像建議',
    like: '讚',
    comment: '留言',
    share: '分享',
  },
  en: {
    copied: 'Copied',
    copyPost: 'Copy post',
    title: 'Facebook-native long-form draft',
    subtitle: 'Expanded from Instagram content into a Facebook post built for discussion and sharing.',
    nowPublic: 'Just now · Public',
    discussion: 'Discussion prompt',
    image: 'Image suggestion',
    like: 'Like',
    comment: 'Comment',
    share: 'Share',
  },
}

function formatFacebookPost(post: FacebookPost) {
  return [
    post.hook,
    post.body,
    post.discussion_prompt,
    post.share_hook,
  ]
    .filter(Boolean)
    .join('\n\n')
}

function CopyButton({ value, copy }: { value: string; copy: Record<string, string> }) {
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
      className="inline-flex h-9 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] px-4 text-xs font-semibold text-[var(--text-primary)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
    >
      {copied ? copy.copied : copy.copyPost}
    </button>
  )
}

export function FacebookPreview({ post }: { post: FacebookPost }) {
  const { language } = useLanguage()
  const copy = COPY[language]

  return (
    <section className="rounded-[24px] border border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-sm)] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
            FACEBOOK PREVIEW
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-[-0.03em] text-[var(--text-primary)]">
            {copy.title}
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            {copy.subtitle}
          </p>
        </div>
        <CopyButton value={formatFacebookPost(post)} copy={copy} />
      </div>

      <article className="mt-7 overflow-hidden rounded-[22px] border border-[var(--border)] bg-[var(--bg-sunken)]">
        <div className="border-b border-[var(--border)] bg-[var(--bg-elevated)] p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#1877f2] text-sm font-bold text-white">
              N
            </div>
            <div>
              <div className="font-semibold text-[var(--text-primary)]">Neoxra Demo</div>
              <div className="text-xs text-[var(--text-tertiary)]">{copy.nowPublic}</div>
            </div>
          </div>
        </div>

        <div className="space-y-5 p-5">
          <div>
            <p className="text-lg font-bold leading-7 text-[var(--text-primary)]">{post.hook}</p>
            <p className="mt-4 whitespace-pre-wrap text-[15px] leading-7 text-[var(--text-primary)]">
              {post.body}
            </p>
          </div>

          <div className="relative overflow-hidden rounded-[18px] border border-[var(--border)] bg-[var(--bg-elevated)] p-4 pl-6">
            <div className="absolute bottom-0 left-0 top-0 w-[3px]" style={{ background: 'var(--gradient-fb)' }} />
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
              {copy.discussion}
            </div>
            <p className="mt-2 text-[15px] font-semibold leading-7 text-[var(--text-primary)]">
              {post.discussion_prompt}
            </p>
          </div>

          <p className="rounded-[14px] bg-[var(--accent-subtle)] px-4 py-3 text-[15px] italic leading-7 text-[var(--text-secondary)]">
            {post.share_hook}
          </p>

          <div className="rounded-[16px] border border-[var(--border)] bg-[var(--bg-elevated-2)] p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
              {copy.image}
            </div>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{post.image_recommendation}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 border-t border-[var(--border)] bg-[var(--bg-elevated)] text-center text-sm font-semibold text-[var(--text-secondary)]">
          <div className="py-3">{copy.like}</div>
          <div className="border-x border-[var(--border)] py-3">{copy.comment}</div>
          <div className="py-3">{copy.share}</div>
        </div>
      </article>
    </section>
  )
}
