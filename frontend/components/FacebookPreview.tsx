'use client'

import { useState } from 'react'
import type { FacebookPost } from '../lib/facebook-types'

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

function CopyButton({ value }: { value: string }) {
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
      className="inline-flex h-9 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] px-4 text-xs font-semibold text-[var(--text-primary)] transition hover:bg-[var(--bg-sunken)]"
    >
      {copied ? '已複製' : '複製貼文'}
    </button>
  )
}

export function FacebookPreview({ post }: { post: FacebookPost }) {
  return (
    <section className="rounded-[24px] border border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-sm)] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
            FACEBOOK PREVIEW
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-[-0.03em] text-[var(--text-primary)]">
            Facebook 原生長文草稿
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            從 Instagram 內容延展成更適合討論與分享的 Facebook 貼文。
          </p>
        </div>
        <CopyButton value={formatFacebookPost(post)} />
      </div>

      <article className="mt-7 overflow-hidden rounded-[22px] border border-[var(--border)] bg-[var(--bg-sunken)]">
        <div className="border-b border-[var(--border)] bg-[var(--bg-elevated)] p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--bg-accent)] text-sm font-bold text-[var(--text-on-accent)]">
              N
            </div>
            <div>
              <div className="font-semibold text-[var(--text-primary)]">Neoxra Demo</div>
              <div className="text-xs text-[var(--text-tertiary)]">剛剛 · 公開</div>
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

          <div className="rounded-[18px] border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
              討論引導
            </div>
            <p className="mt-2 text-[15px] font-semibold leading-7 text-[var(--text-primary)]">
              {post.discussion_prompt}
            </p>
          </div>

          <p className="border-l-2 border-[var(--accent)] pl-4 text-[15px] italic leading-7 text-[var(--text-secondary)]">
            {post.share_hook}
          </p>

          <div className="rounded-[16px] border border-dashed border-[var(--border-bold)] bg-[var(--bg-elevated)] p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
              圖像建議
            </div>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{post.image_recommendation}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 border-t border-[var(--border)] bg-[var(--bg-elevated)] text-center text-sm font-semibold text-[var(--text-secondary)]">
          <div className="py-3">讚</div>
          <div className="border-x border-[var(--border)] py-3">留言</div>
          <div className="py-3">分享</div>
        </div>
      </article>
    </section>
  )
}
