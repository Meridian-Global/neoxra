'use client'

export type PipelineStepStatus = 'waiting' | 'running' | 'complete' | 'error'

export interface PipelineStep {
  id: string
  label: string
  status: PipelineStepStatus
}

const STATUS_CLASS: Record<PipelineStepStatus, string> = {
  waiting: 'border-[var(--border)] bg-[var(--bg-sunken)] text-[var(--text-tertiary)]',
  running: 'border-yellow-400/70 bg-yellow-400/10 text-yellow-600 dark:text-yellow-300',
  complete: 'border-emerald-500/70 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
  error: 'border-red-500/70 bg-red-500/10 text-red-600 dark:text-red-300',
}

const STATUS_DOT: Record<PipelineStepStatus, string> = {
  waiting: 'bg-[var(--text-tertiary)]',
  running: 'animate-pulse bg-yellow-500',
  complete: 'bg-emerald-500',
  error: 'bg-red-500',
}

function statusLabel(status: PipelineStepStatus) {
  if (status === 'running') return '進行中'
  if (status === 'complete') return '完成'
  if (status === 'error') return '錯誤'
  return '等待'
}

export function PipelineProgress({ steps }: { steps: PipelineStep[] }) {
  return (
    <section className="rounded-[24px] border border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-sm)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-[var(--text-tertiary)]">PIPELINE</p>
          <h2 className="mt-2 text-xl font-bold text-[var(--text-primary)]">生成進度</h2>
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
                <span className="text-sm font-bold">{step.label}</span>
              </div>
              <p className="mt-2 text-xs font-medium opacity-80">{statusLabel(step.status)}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
