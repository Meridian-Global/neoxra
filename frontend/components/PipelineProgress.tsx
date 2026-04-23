'use client'

import { useLanguage } from './LanguageProvider'

export type PipelineStepStatus = 'waiting' | 'running' | 'complete' | 'error'

export interface PipelineStep {
  id: string
  label: string
  status: PipelineStepStatus
}

const STATUS_CLASS: Record<PipelineStepStatus, string> = {
  waiting: 'border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-tertiary)]',
  running: 'border-[var(--accent)] bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-[var(--shadow-glow)]',
  complete: 'border-[var(--success)] bg-[var(--bg-elevated)] text-[var(--text-primary)]',
  error: 'border-red-500/70 bg-[var(--bg-elevated)] text-red-500',
}

const STATUS_DOT: Record<PipelineStepStatus, string> = {
  waiting: 'bg-[var(--text-tertiary)]',
  running: 'animate-pulse bg-[var(--accent)]',
  complete: 'bg-[var(--success)]',
  error: 'bg-red-500',
}

type Language = 'en' | 'zh-TW'

const COPY: Record<Language, {
  title: string
  status: Record<PipelineStepStatus, string>
}> = {
  'zh-TW': {
    title: '生成進度',
    status: {
      waiting: '等待',
      running: '進行中',
      complete: '完成',
      error: '錯誤',
    },
  },
  en: {
    title: 'Generation progress',
    status: {
      waiting: 'Waiting',
      running: 'Running',
      complete: 'Complete',
      error: 'Error',
    },
  },
}

export function PipelineProgress({ steps }: { steps: PipelineStep[] }) {
  const { language } = useLanguage()
  const copy = COPY[language]

  return (
    <section className="rounded-[24px] border border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-sm)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-[var(--text-tertiary)]">PIPELINE</p>
          <h2 className="mt-2 text-xl font-bold text-[var(--text-primary)]">{copy.title}</h2>
        </div>
        <p className="text-sm text-[var(--text-secondary)]">Planner → Instagram → SEO → Threads → Facebook</p>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-5">
        {steps.map((step, index) => (
          <div key={step.id} className="relative">
            {index > 0 ? (
              <div className="absolute -left-3 top-1/2 hidden h-px w-3 bg-[var(--border)] md:block" />
            ) : null}
            <div className={`rounded-[16px] border px-4 py-3 transition ${STATUS_CLASS[step.status]}`}>
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${STATUS_DOT[step.status]}`} />
                <span className={`text-sm font-bold ${step.status === 'waiting' ? 'text-[var(--text-secondary)]' : 'text-[var(--text-primary)]'}`}>
                  {step.label}
                </span>
              </div>
              <p className="mt-2 text-xs font-medium opacity-80">{copy.status[step.status]}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
