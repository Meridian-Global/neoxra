'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AdminGuard } from '../../components/AdminGuard'
import { useLanguage } from '../../components/LanguageProvider'
import { useAuth } from '../../contexts/AuthContext'

type Language = 'en' | 'zh-TW'

const COPY: Record<Language, Record<string, string>> = {
  en: {
    title: 'Neoxra Admin',
    overview: 'Overview',
    users: 'Users',
    organizations: 'Organizations',
    plans: 'Plans',
    activity: 'Activity',
    system: 'System',
    backToApp: 'Back to App',
  },
  'zh-TW': {
    title: 'Neoxra 管理後台',
    overview: '總覽',
    users: '使用者',
    organizations: '組織',
    plans: '方案',
    activity: '活動紀錄',
    system: '系統',
    backToApp: '返回應用',
  },
}

const NAV_ITEMS = [
  { key: 'overview', href: '/admin' },
  { key: 'users', href: '/admin/users' },
  { key: 'organizations', href: '/admin/orgs' },
  { key: 'plans', href: '/admin/plans' },
  { key: 'activity', href: '/admin/activity' },
  { key: 'system', href: '/admin/system' },
] as const

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { language } = useLanguage()
  const { user } = useAuth()
  const pathname = usePathname()
  const copy = COPY[language]

  return (
    <AdminGuard>
      <div className="flex min-h-screen bg-[var(--bg)]">
        {/* Sidebar */}
        <aside className="flex w-[200px] shrink-0 flex-col border-r border-[var(--border)] bg-[var(--bg-elevated)]">
          <div className="border-b border-[var(--border)] px-4 py-4">
            <h1 className="text-sm font-bold text-[var(--text-primary)]">{copy.title}</h1>
          </div>
          <nav className="flex flex-1 flex-col gap-1 p-3">
            {NAV_ITEMS.map((item) => {
              const isActive = item.href === '/admin'
                ? pathname === '/admin'
                : pathname.startsWith(item.href)
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? 'bg-[var(--bg-sunken)] text-[var(--text-primary)]'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-sunken)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {copy[item.key]}
                </Link>
              )
            })}
          </nav>
          <div className="border-t border-[var(--border)] p-3">
            <Link
              href="/generate"
              className="block rounded-lg px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--bg-sunken)] hover:text-[var(--text-primary)]"
            >
              &larr; {copy.backToApp}
            </Link>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex flex-1 flex-col">
          {/* Top bar */}
          <header className="flex h-14 items-center justify-between border-b border-[var(--border)] bg-[var(--bg-elevated)] px-6">
            <span className="text-sm font-semibold text-[var(--text-primary)]">{copy.title}</span>
            <div className="flex items-center gap-4">
              <span className="text-sm text-[var(--text-secondary)]">{user?.user?.email}</span>
              <Link
                href="/generate"
                className="text-sm font-medium text-[var(--accent)] hover:underline"
              >
                {copy.backToApp}
              </Link>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </AdminGuard>
  )
}
