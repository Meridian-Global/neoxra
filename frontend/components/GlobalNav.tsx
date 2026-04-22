'use client'

import Link from 'next/link'
import { LanguageToggle } from './LanguageToggle'
import { useLanguage } from './LanguageProvider'
import { ThemeToggle } from './landing/ThemeToggle'

function ComingSoonBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex rounded-full bg-[var(--bg-sunken)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-tertiary)]">
      {label}
    </span>
  )
}

function NavDropdown({
  label,
  items,
  soonLabel,
}: {
  label: string
  items: Array<{ label: string; href?: string; soon?: boolean }>
  soonLabel: string
}) {
  return (
    <details className="group relative">
      <summary className="flex h-10 cursor-pointer list-none items-center gap-2 rounded-full px-3 text-[15px] font-medium text-[var(--text-primary)] transition hover:bg-[var(--bg-sunken)]">
        {label}
        <span className="text-xs transition group-open:rotate-180">▾</span>
      </summary>
      <div className="absolute left-0 top-full z-20 mt-2 w-64 rounded-[12px] border border-[var(--border)] bg-[var(--bg-elevated)] p-2 shadow-[var(--shadow-lg)]">
        {items.map((item) =>
          item.href ? (
            <Link
              key={item.label}
              href={item.href}
              className="block rounded-[10px] px-3 py-2.5 text-sm text-[var(--text-primary)] transition hover:bg-[var(--bg-sunken)]"
            >
              {item.label}
            </Link>
          ) : (
            <div
              key={item.label}
              className="flex items-center justify-between gap-3 rounded-[10px] px-3 py-2.5 text-sm text-[var(--text-secondary)]"
            >
              <span>{item.label}</span>
              {item.soon ? <ComingSoonBadge label={soonLabel} /> : null}
            </div>
          ),
        )}
      </div>
    </details>
  )
}

export function GlobalNav() {
  const { language } = useLanguage()

  const copy =
    language === 'zh-TW'
      ? {
          brand: 'Neoxra',
          generateAll: 'Generate All',
          products: 'Products',
          useCases: 'Use Cases',
          instagram: 'Instagram Studio',
          articles: 'SEO Articles',
          threads: 'Threads',
          facebook: 'Facebook',
          lawFirms: '法律事務所',
          moreVerticals: '更多產業即將推出',
          soon: '即將推出',
        }
      : {
          brand: 'Neoxra',
          generateAll: 'Generate All',
          products: 'Products',
          useCases: 'Use Cases',
          instagram: 'Instagram Studio',
          articles: 'SEO Articles',
          threads: 'Threads',
          facebook: 'Facebook',
          lawFirms: 'Law Firms',
          moreVerticals: 'More verticals coming soon',
          soon: 'Coming soon',
        }

  return (
    <header className="sticky top-0 z-50 py-3">
      <div
        className="flex h-14 items-center justify-between gap-4 rounded-full border border-[var(--border)] px-1 shadow-[var(--shadow-sm)] backdrop-blur"
        style={{ background: 'color-mix(in srgb, var(--bg-elevated) 78%, transparent)' }}
      >
        <Link
          href="/"
          className="inline-flex h-10 items-center rounded-full px-4 text-[15px] font-bold tracking-[-0.02em] text-[var(--text-primary)]"
        >
          {copy.brand}
        </Link>

        <nav className="hidden items-center gap-2 md:flex">
          <Link
            href="/generate"
            className="inline-flex h-10 items-center rounded-full bg-[var(--bg-accent)] px-4 text-[15px] font-semibold text-[var(--text-on-accent)] transition hover:opacity-90"
          >
            {copy.generateAll}
          </Link>
          <NavDropdown
            label={copy.products}
            soonLabel={copy.soon}
            items={[
              { label: copy.instagram, href: '/instagram' },
              { label: copy.articles, href: '/seo' },
              { label: copy.threads, href: '/threads' },
              { label: copy.facebook, href: '/facebook' },
            ]}
          />
          <NavDropdown
            label={copy.useCases}
            soonLabel={copy.soon}
            items={[
              { label: copy.lawFirms, href: '/demo/legal' },
              { label: copy.moreVerticals, soon: true },
            ]}
          />
        </nav>

        <div className="flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
