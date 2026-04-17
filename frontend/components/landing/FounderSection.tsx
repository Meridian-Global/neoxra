const SIGNALS = [
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
]

export function FounderSection() {
  return (
    <section className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(320px,1.1fr)] lg:items-start">
      <div>
        <div className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--subtle)]">
          Founder signal
        </div>
        <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[var(--text)] sm:text-4xl">
          Credibility should feel earned, not decorated.
        </h2>
        <p className="mt-3 max-w-xl text-base leading-7 text-[var(--muted)]">
          This page stays focused on the product, but the founder story still matters. These are the
          signals that help explain why Neoxra exists and why it is being built now.
        </p>
      </div>

      <div className="grid gap-4">
        {SIGNALS.map(signal => (
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
