'use client'

import { useState } from 'react'
import type { InstagramContent } from '../lib/instagram-types'

interface InstagramResultProps {
  content: InstagramContent
  critique: string
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <button
      className="inline-flex items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--subtle)] transition hover:border-[var(--accent)] hover:text-[var(--text)]"
      type="button"
      onClick={copy}
    >
      {copied ? 'copied' : 'copy'}
    </button>
  )
}

export function InstagramResult({ content, critique }: InstagramResultProps) {
  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.14)] backdrop-blur">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--subtle)]">Primary Copy</span>
            <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--text)]">Caption</h3>
          </div>
          <CopyButton text={content.caption} />
        </div>
        <p className="text-base leading-7 text-[var(--text)]">{content.caption}</p>
      </section>

      <section className="rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-5">
        <div className="mb-4">
          <div>
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--subtle)]">Open Strong</span>
            <h3 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-[var(--text)]">Hook Options</h3>
          </div>
        </div>
        <ol className="space-y-3">
          {content.hook_options.map((hook, i) => (
            <li key={i} className="flex items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
              <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-[var(--accent-soft)] text-xs font-semibold text-[var(--text)]">
                {i + 1}
              </span>
              <span className="text-sm leading-6 text-[var(--text)]">{hook}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-5">
        <div className="mb-4">
          <div>
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--subtle)]">Discovery</span>
            <h3 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-[var(--text)]">Hashtags</h3>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {content.hashtags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm text-[var(--text)]"
            >
              {tag}
            </span>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-5">
        <div className="mb-4">
          <div>
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--subtle)]">Structure</span>
            <h3 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-[var(--text)]">Carousel Outline</h3>
          </div>
        </div>
        <ol className="space-y-3">
          {content.carousel_outline.map((slide, i) => (
            <li key={i} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-[var(--subtle)]">Slide {i + 1}</div>
              <div>
                <strong className="text-base text-[var(--text)]">{slide.title}</strong>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{slide.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-5">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--subtle)]">Motion Version</span>
            <h3 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-[var(--text)]">Reel Script</h3>
          </div>
          <CopyButton text={content.reel_script} />
        </div>
        <p className="text-base leading-7 text-[var(--text)]">{content.reel_script}</p>
      </section>

      <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="mb-4">
          <div>
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--subtle)]">Editor Note</span>
            <h3 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-[var(--text)]">Critique</h3>
          </div>
        </div>
        <p className="text-sm leading-6 text-[var(--muted)]">{critique}</p>
      </section>
    </div>
  )
}
