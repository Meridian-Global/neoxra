const STEPS = [
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
]

export function StepsSection() {
  return (
    <section className="grid gap-8 lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start">
      <div>
        <div className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--subtle)]">
          How it works
        </div>
        <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[var(--text)] sm:text-4xl">
          Three steps. One system.
        </h2>
        <p className="mt-3 max-w-lg text-base leading-7 text-[var(--muted)]">
          The architecture is simple on purpose: plan the idea, adapt it by platform, then review it
          like an editor would.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {STEPS.map((step, index) => (
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
