'use client'

import { useLanguage } from '../LanguageProvider'

export function StepsSection() {
  const { language } = useLanguage()
  const copy =
    language === 'zh-TW'
      ? {
          eyebrow: '運作方式',
          title: '三個步驟，一個系統。',
          body: '架構刻意保持簡單：先規劃想法，再依平台調整，最後像編輯一樣審查。',
          steps: [
            {
              name: 'Planner',
              detail: '把原始想法整理成清楚 brief：角度、受眾，以及在各平台開始寫之前最重要的重點。',
            },
            {
              name: 'Agents',
              detail: '不同代理分別為 LinkedIn、Instagram 與 Threads 寫作，讓輸出符合各平台語境。',
            },
            {
              name: 'Critic',
              detail: '回頭檢查整組內容、找出弱點，並把輸出推近可發佈品質。',
            },
          ],
        }
      : {
          eyebrow: 'How it works',
          title: 'Three steps. One system.',
          body:
            'The architecture is simple on purpose: plan the idea, adapt it by platform, then review it like an editor would.',
          steps: [
            {
              name: 'Planner',
              detail:
                'Turns a raw idea into a clear brief: angle, audience, and what matters before any platform starts writing.',
            },
            {
              name: 'Agents',
              detail:
                'Dedicated agents write for LinkedIn, Instagram, and Threads so each output matches the norms of that channel.',
            },
            {
              name: 'Critic',
              detail:
                'Reviews the full set, catches weak spots, and pushes the outputs closer to something publishable.',
            },
          ],
        }
  return (
    <section className="grid gap-8 lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start">
      <div>
        <div className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--subtle)]">
          {copy.eyebrow}
        </div>
        <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[var(--text)] sm:text-4xl">
          {copy.title}
        </h2>
        <p className="mt-3 max-w-lg text-base leading-7 text-[var(--muted)]">
          {copy.body}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {copy.steps.map((step, index) => (
          <div
            key={step.name}
            className="rounded-[24px] border border-[var(--border)] bg-[var(--panel)] p-5 shadow-[0_10px_40px_rgba(0,0,0,0.12)]"
          >
            <div className="text-sm font-medium text-[var(--subtle)]">0{index + 1}</div>
            <div className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-[var(--text)]">{step.name}</div>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{step.detail}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
