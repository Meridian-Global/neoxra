'use client'

import { useLanguage } from '../LanguageProvider'

export function WhySection() {
  const { language } = useLanguage()
  const copy =
    language === 'zh-TW'
      ? {
          eyebrow: '為什麼重要',
          title: '內容問題本質上是分發問題。真正的瓶頸是多平台適配。',
          body:
            '大多數團隊不是缺想法，而是無法把一個想法足夠快地轉成平台原生內容。Neoxra 就是為了這個瓶頸而打造。',
        }
      : {
          eyebrow: 'Why this matters',
          title: 'Content is a distribution problem. Multi-platform adaptation is the bottleneck.',
          body:
            'Most teams do not struggle to come up with ideas. They struggle to turn one idea into channel-native assets fast enough to stay visible. Neoxra is built for that specific bottleneck.',
        }
  return (
    <section className="rounded-[32px] border border-[var(--border)] bg-[var(--panel)] px-6 py-8 sm:px-8 sm:py-10">
      <div className="max-w-4xl">
        <div className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--subtle)]">
          {copy.eyebrow}
        </div>
        <p className="mt-4 text-2xl font-semibold leading-tight tracking-[-0.05em] text-[var(--text)] sm:text-4xl">
          {copy.title}
        </p>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--muted)]">
          {copy.body}
        </p>
      </div>
    </section>
  )
}
