import type { ReactNode } from 'react'
import { GlobalNav } from '../GlobalNav'

type PageShellProps = {
  children: ReactNode
  eyebrow?: string
  title: string
  subtitle?: string
}

export function PageShell({ children, eyebrow, title, subtitle }: PageShellProps) {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text-primary)]">
      <GlobalNav />
      <main className="mx-auto mt-0 max-w-5xl px-6 pb-20 pt-10">
        {eyebrow ? (
          <p className="text-sm font-semibold text-[var(--accent)]">{eyebrow}</p>
        ) : null}
        <h1 className="mt-2 text-3xl font-bold tracking-tight">{title}</h1>
        {subtitle ? (
          <p className="mt-3 text-lg text-[var(--text-secondary)]">{subtitle}</p>
        ) : null}
        <div className="mt-10">{children}</div>
      </main>
    </div>
  )
}
