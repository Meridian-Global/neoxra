import Link from 'next/link'

type CTAFooterProps = {
  title: string
  subtitle: string
  button: string
  trust: string
}

export default function CTAFooter({ title, subtitle, button, trust }: CTAFooterProps) {
  return (
    <section className="bg-[var(--bg)] py-24" id="cta-footer">
      <div className="mx-auto max-w-[900px] px-6">
        <div className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--bg-elevated)] p-12 text-center shadow-[var(--shadow-lg)]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{ background: 'linear-gradient(135deg, var(--accent-subtle) 0%, transparent 45%, color-mix(in srgb, var(--secondary) 12%, transparent) 100%)' }}
          />
          <div className="relative">
            <h2 className="text-3xl font-bold tracking-[-0.02em] text-[var(--text-primary)] md:text-4xl">{title}</h2>
            <p className="mt-4 text-base text-[var(--text-secondary)] md:text-lg">{subtitle}</p>
            <Link
              className="mt-8 inline-flex items-center justify-center rounded-xl bg-[image:var(--gradient-cta)] px-8 py-3.5 text-base font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[image:var(--gradient-cta-hover)] hover:shadow-[var(--shadow-glow)]"
              href="/generate"
            >
              {button}
            </Link>
            <p className="mt-4 text-sm text-[var(--text-tertiary)]">{trust}</p>
          </div>
        </div>
      </div>
    </section>
  )
}
