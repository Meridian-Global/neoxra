'use client'

import Link from 'next/link'
import { LanguageToggle } from '../LanguageToggle'
import { useLanguage } from '../LanguageProvider'
import { ThemeToggle } from './ThemeToggle'

export function HeroSection() {
  const { language } = useLanguage()
  const copy =
    language === 'zh-TW'
      ? {
          stack: 'FastAPI + SSE + Next.js',
          eyebrow: '多代理內容系統',
          title: '把一個想法轉成平台原生內容。',
          body:
            'Neoxra 透過 planner、平台代理與 critic，把一個輸入轉成適合 LinkedIn、Instagram 與 Threads 的內容，而不是單純複製貼上。',
          noticePrefix: '內部 demo 頁面在',
          noticeSuffix: '。要進行法律服務 demo 時，請直接輸入這個網址。',
          instagram: 'Instagram',
          login: '登入',
          what: '它做什麼',
          whatBody: '一個想法進來，三個平台原生版本輸出。',
          why: '為什麼重要',
          whyBody: '多數團隊不是沒有想法，而是卡在要把同一個想法重寫成不同平台版本。',
          speed: '速度感',
          speedBody: '既有 backend 透過 SSE 串流輸出，讓產品在 demo 時看起來是即時運作的。',
        }
      : {
          stack: 'FastAPI + SSE + Next.js',
          eyebrow: 'Multi-agent content system',
          title: 'Turn one idea into platform-native content.',
          body:
            'Neoxra uses a planner, platform agents, and a critic to turn one input into LinkedIn, Instagram, and Threads content that feels native instead of copy-pasted.',
          noticePrefix: 'Internal demo surface is available at',
          noticeSuffix: 'Use that route directly when you want the legal-services walkthrough.',
          instagram: 'Instagram',
          login: 'Login',
          what: 'What it does',
          whatBody: 'One idea in. Native outputs for three channels out.',
          why: 'Why it matters',
          whyBody:
            'Distribution breaks when teams rewrite the same idea three times. Neoxra makes adaptation the default.',
          speed: 'Built for speed',
          speedBody: 'Existing backend streams results over SSE, so the product feels active immediately.',
        }

  return (
    <section className="pt-8 sm:pt-12">
      <div className="mb-12 flex items-center justify-between gap-4 text-sm text-[var(--muted)]">
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--panel)] px-3 py-1.5">
          <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
          Neoxra
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden text-[var(--subtle)] sm:block">{copy.stack}</div>
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </div>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] lg:items-end">
        <div className="max-w-3xl">
          <div className="mb-5 inline-flex items-center rounded-full border border-[color:var(--accent-soft)] bg-[var(--accent-soft)] px-3 py-1 text-xs font-medium uppercase tracking-[0.22em] text-[var(--text)]">
            {copy.eyebrow}
          </div>

          <h1 className="max-w-4xl text-5xl font-semibold tracking-[-0.075em] text-[var(--text)] sm:text-6xl lg:text-7xl">
            {copy.title}
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--muted)] sm:text-lg">
            {copy.body}
          </p>

          <div className="mt-8 max-w-2xl rounded-2xl border border-[var(--border)] bg-[var(--panel)] px-4 py-4 text-sm leading-6 text-[var(--muted)]">
            {copy.noticePrefix} <span className="font-semibold text-[var(--text)]">`/demo/legal`</span>. {copy.noticeSuffix}
          </div>

          <div className="mt-4">
            <div className="flex flex-wrap gap-3">
              <Link
                href="/instagram"
                className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--panel)] px-5 py-3 text-sm font-semibold text-[var(--text)] transition hover:border-[var(--accent)] hover:bg-[var(--surface)]"
              >
                {copy.instagram}
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--panel)] px-5 py-3 text-sm font-semibold text-[var(--text)] transition hover:border-[var(--accent)] hover:bg-[var(--surface)]"
              >
                {copy.login}
              </Link>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.18)] backdrop-blur">
          <div className="grid gap-3">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="mb-2 text-xs uppercase tracking-[0.18em] text-[var(--subtle)]">{copy.what}</div>
              <p className="text-sm leading-6 text-[var(--muted)]">
                {copy.whatBody}
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="mb-2 text-xs uppercase tracking-[0.18em] text-[var(--subtle)]">{copy.why}</div>
              <p className="text-sm leading-6 text-[var(--muted)]">
                {copy.whyBody}
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="mb-2 text-xs uppercase tracking-[0.18em] text-[var(--subtle)]">{copy.speed}</div>
              <p className="text-sm leading-6 text-[var(--muted)]">
                {copy.speedBody}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
