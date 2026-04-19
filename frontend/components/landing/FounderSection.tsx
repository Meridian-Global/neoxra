'use client'

import { useLanguage } from '../LanguageProvider'

export function FounderSection() {
  const { language } = useLanguage()
  const copy =
    language === 'zh-TW'
      ? {
          eyebrow: '創辦人訊號',
          title: '可信度應該是被建立出來的，而不是被裝飾出來的。',
          body:
            '這個頁面重點仍然放在產品，但創辦人故事依然重要。這些訊號有助於說明 Neoxra 為什麼存在，以及為什麼現在值得打造。',
          signals: [
            {
              metric: '前 Yahoo Search',
              detail: '由曾經在大規模產品環境中出貨的人打造，知道產品品質如何累積成優勢。',
            },
            {
              metric: '3 萬+ 受眾',
              detail: '貼近真實使用者、真實痛點與真正會影響分發的回饋循環。',
            },
            {
              metric: '公開打造中',
              detail: '產品進展透明、快速，也更有責任感。產品與故事一起在市場中被打磨。',
            },
          ],
        }
      : {
          eyebrow: 'Founder signal',
          title: 'Credibility should feel earned, not decorated.',
          body:
            'This page stays focused on the product, but the founder story still matters. These are the signals that help explain why Neoxra exists and why it is being built now.',
          signals: [
            {
              metric: 'ex-Yahoo Search',
              detail: 'Built by someone who has shipped at scale and knows how product quality compounds.',
            },
            {
              metric: '30K+ audience',
              detail: 'Close to the users, the pain, and the feedback loops that actually shape distribution.',
            },
            {
              metric: 'Building in public',
              detail: 'Progress is visible, fast, and accountable. Product and story evolve in the open.',
            },
          ],
        }
  return (
    <section className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(320px,1.1fr)] lg:items-start">
      <div>
        <div className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--subtle)]">
          {copy.eyebrow}
        </div>
        <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[var(--text)] sm:text-4xl">
          {copy.title}
        </h2>
        <p className="mt-3 max-w-xl text-base leading-7 text-[var(--muted)]">
          {copy.body}
        </p>
      </div>

      <div className="grid gap-4">
        {copy.signals.map(signal => (
          <div
            key={signal.metric}
            className="rounded-[24px] border border-[var(--border)] bg-[var(--panel)] p-5 shadow-[0_12px_40px_rgba(0,0,0,0.12)]"
          >
            <div className="text-lg font-semibold tracking-[-0.03em] text-[var(--text)]">{signal.metric}</div>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{signal.detail}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
