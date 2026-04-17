export function WhySection() {
  return (
    <section className="rounded-[32px] border border-[var(--border)] bg-[var(--panel)] px-6 py-8 sm:px-8 sm:py-10">
      <div className="max-w-4xl">
        <div className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--subtle)]">
          Why this matters
        </div>
        <p className="mt-4 text-2xl font-semibold leading-tight tracking-[-0.05em] text-[var(--text)] sm:text-4xl">
          Content is a distribution problem. Multi-platform adaptation is the bottleneck.
        </p>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--muted)]">
          Most teams do not struggle to come up with ideas. They struggle to turn one idea into
          channel-native assets fast enough to stay visible. Neoxra is built for that specific
          bottleneck.
        </p>
      </div>
    </section>
  )
}
