'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowRight, Menu, X } from 'lucide-react'
import { LanguageToggle } from '../LanguageToggle'
import { ThemeToggle } from './ThemeToggle'
import NeoxraLogo from './NeoxraLogo'

type NavCopy = {
  features: string
  useCases: string
  resources: string
  pricing: string
  login: string
  getStarted: string
}

type NavbarProps = {
  copy: NavCopy
}

const NAV_ITEMS = [
  { key: 'features', href: '#features' },
  { key: 'useCases', href: '#platform-output' },
  { key: 'resources', href: '#how-it-works' },
  { key: 'pricing', href: '#cta-footer' },
] as const

export default function Navbar({ copy }: NavbarProps) {
  const [open, setOpen] = useState(false)

  const labels: Record<(typeof NAV_ITEMS)[number]['key'], string> = {
    features: copy.features,
    useCases: copy.useCases,
    resources: copy.resources,
    pricing: copy.pricing,
  }

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-6">
        <Link className="flex items-center gap-3" href="/">
          <NeoxraLogo size={34} />
          <span className="text-lg font-bold tracking-[-0.02em] text-[var(--text-primary)]">Neoxra</span>
        </Link>

        <nav className="hidden items-center gap-7 lg:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.key}
              className="text-sm font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
              href={item.href}
            >
              {labels[item.key]}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <LanguageToggle />
          <ThemeToggle />
          <Link
            className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-bold)] hover:text-[var(--text-primary)]"
            href="/login"
          >
            {copy.login}
          </Link>
          <Link
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[image:var(--gradient-cta)] px-4 py-2 text-sm font-semibold text-black shadow-[var(--shadow-glow)] transition hover:-translate-y-0.5 hover:bg-[image:var(--gradient-cta-hover)]"
            href="/generate"
          >
            {copy.getStarted}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <button
          aria-label={open ? 'Close menu' : 'Open menu'}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] text-[var(--text-primary)] lg:hidden"
          onClick={() => setOpen((value) => !value)}
          type="button"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <div
        className={[
          'border-t border-[var(--border)] bg-[var(--bg)]/95 transition-all duration-200 lg:hidden',
          open ? 'max-h-[420px] opacity-100' : 'max-h-0 overflow-hidden opacity-0',
        ].join(' ')}
      >
        <div className="mx-auto flex max-w-[1200px] flex-col gap-2 px-6 py-4">
          <div className="mb-3 flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
          </div>
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.key}
              className="rounded-xl px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
              href={item.href}
              onClick={() => setOpen(false)}
            >
              {labels[item.key]}
            </Link>
          ))}
          <div className="mt-2 grid gap-2">
            <Link
              className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-bold)] hover:text-[var(--text-primary)]"
              href="/login"
              onClick={() => setOpen(false)}
            >
              {copy.login}
            </Link>
            <Link
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[image:var(--gradient-cta)] px-4 py-2 text-sm font-semibold text-black shadow-[var(--shadow-glow)] transition hover:-translate-y-0.5 hover:bg-[image:var(--gradient-cta-hover)]"
              href="/generate"
              onClick={() => setOpen(false)}
            >
              {copy.getStarted}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}
