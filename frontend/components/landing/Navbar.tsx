'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { ArrowRight, Menu, X } from 'lucide-react'
import { LanguageToggle } from '../LanguageToggle'
import { ThemeToggle } from './ThemeToggle'

type NavCopy = {
  products: string
  features: string
  useCases: string
  resources: string
  pricing: string
  login: string
  getStarted: string
}

type NavbarProps = {
  copy: NavCopy
  anchorPrefix?: string
}

const NAV_ITEMS = [
  { key: 'features', href: '#features' },
  { key: 'useCases', href: '#platform-output' },
  { key: 'resources', href: '#how-it-works' },
  { key: 'pricing', href: '#cta-footer' },
] as const

const PRODUCT_LINKS = [
  { label: 'Instagram', href: '/instagram' },
  { label: 'Threads', href: '/threads' },
  { label: 'SEO', href: '/seo' },
  { label: 'Facebook', href: '/facebook' },
] as const

export default function Navbar({ copy, anchorPrefix = '' }: NavbarProps) {
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
        <Link className="flex items-center gap-2.5" href="/">
          <Image src="/Neoxra_Logo.png" alt="Neoxra" width={34} height={34} className="rounded-lg" />
          <span className="font-logo text-xl font-bold tracking-[-0.03em] text-[var(--text-primary)]">Neoxra</span>
        </Link>

        <nav className="hidden items-center gap-7 lg:flex">
          <details className="group relative">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]">
              {copy.products}
              <span className="text-xs transition group-open:rotate-180">▾</span>
            </summary>
            <div className="absolute left-0 top-full z-20 mt-3 w-52 rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-2 shadow-[var(--shadow-lg)]">
              {PRODUCT_LINKS.map((item) => (
                <Link
                  key={item.href}
                  className="block rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--bg-sunken)] hover:text-[var(--text-primary)]"
                  href={item.href}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </details>
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.key}
              className="text-sm font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
              href={`${anchorPrefix}${item.href}`}
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
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[image:var(--gradient-cta)] px-4 py-2 text-sm font-semibold text-white shadow-[var(--shadow-glow)] transition hover:-translate-y-0.5 hover:bg-[image:var(--gradient-cta-hover)]"
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
          <div className="mb-1 px-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
            {copy.products}
          </div>
          {PRODUCT_LINKS.map((item) => (
            <Link
              key={item.href}
              className="rounded-xl px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
              href={item.href}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.key}
              className="rounded-xl px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
              href={`${anchorPrefix}${item.href}`}
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
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[image:var(--gradient-cta)] px-4 py-2 text-sm font-semibold text-white shadow-[var(--shadow-glow)] transition hover:-translate-y-0.5 hover:bg-[image:var(--gradient-cta-hover)]"
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
