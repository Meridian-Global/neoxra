import { ThemeToggle } from './ThemeToggle'

export function HeroSection() {
  return (
    <section className="pt-8 sm:pt-12">
      <div className="mb-12 flex items-center justify-between gap-4 text-sm text-[var(--muted)]">
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--panel)] px-3 py-1.5">
          <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
          Neoxra
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden text-[var(--subtle)] sm:block">FastAPI + SSE + Next.js</div>
          <ThemeToggle />
        </div>
      </div>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] lg:items-end">
        <div className="max-w-3xl">
          <div className="mb-5 inline-flex items-center rounded-full border border-[color:var(--accent-soft)] bg-[var(--accent-soft)] px-3 py-1 text-xs font-medium uppercase tracking-[0.22em] text-[var(--text)]">
            Multi-agent content system
          </div>

          <h1 className="max-w-4xl text-5xl font-semibold tracking-[-0.075em] text-[var(--text)] sm:text-6xl lg:text-7xl">
            Turn one idea into platform-native content.
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--muted)] sm:text-lg">
            Neoxra uses a planner, platform agents, and a critic to turn one input into LinkedIn,
            Instagram, and Threads content that feels native instead of copy-pasted.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a
              href="#demo"
              className="inline-flex items-center justify-center rounded-xl bg-[var(--text)] px-5 py-3 text-sm font-semibold text-[var(--bg)] transition hover:opacity-90"
            >
              Try Demo
            </a>
            <div className="text-sm text-[var(--subtle)]">Working generation, streamed live from the product</div>
          </div>
        </div>

        <div className="rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.18)] backdrop-blur">
          <div className="grid gap-3">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="mb-2 text-xs uppercase tracking-[0.18em] text-[var(--subtle)]">What it does</div>
              <p className="text-sm leading-6 text-[var(--muted)]">
                One idea in. Native outputs for three channels out.
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="mb-2 text-xs uppercase tracking-[0.18em] text-[var(--subtle)]">Why it matters</div>
              <p className="text-sm leading-6 text-[var(--muted)]">
                Distribution breaks when teams rewrite the same idea three times. Neoxra makes
                adaptation the default.
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="mb-2 text-xs uppercase tracking-[0.18em] text-[var(--subtle)]">Built for speed</div>
              <p className="text-sm leading-6 text-[var(--muted)]">
                Existing backend streams results over SSE, so the product feels active immediately.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
