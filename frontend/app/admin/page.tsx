'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useLanguage } from '../../components/LanguageProvider'
import { fetchDashboardStats, type DashboardStats } from '../../lib/admin-api'

type Language = 'en' | 'zh-TW'

const COPY: Record<Language, Record<string, string>> = {
  en: {
    totalUsers: 'Total Users',
    newThisWeek: 'new this week',
    activeToday: 'Active Today',
    generationsThisMonth: 'Generations This Month',
    totalOrganizations: 'Total Organizations',
    planDistribution: 'Plan Distribution',
    generationsByPlatform: 'Generations by Platform',
    todayStats: "Today's Stats",
    generationsToday: 'generations today',
    viewAllUsers: 'View all users',
    loading: 'Loading...',
    error: 'Failed to load dashboard stats. Please try again.',
  },
  'zh-TW': {
    totalUsers: '總使用者數',
    newThisWeek: '本週新增',
    activeToday: '今日活躍',
    generationsThisMonth: '本月生成次數',
    totalOrganizations: '總組織數',
    planDistribution: '方案分佈',
    generationsByPlatform: '各平台生成次數',
    todayStats: '今日統計',
    generationsToday: '次生成（今日）',
    viewAllUsers: '查看所有使用者',
    loading: '載入中...',
    error: '無法載入統計資料，請重試。',
  },
}

const PLATFORM_COLORS: Record<string, string> = {
  instagram: 'bg-pink-500',
  seo: 'bg-blue-500',
  threads: 'bg-purple-500',
  facebook: 'bg-indigo-500',
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
            <div className="h-4 w-20 rounded bg-[var(--bg-sunken)]" />
            <div className="mt-3 h-8 w-16 rounded bg-[var(--bg-sunken)]" />
            <div className="mt-2 h-3 w-24 rounded bg-[var(--bg-sunken)]" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
            <div className="h-4 w-32 rounded bg-[var(--bg-sunken)]" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="h-6 rounded bg-[var(--bg-sunken)]" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function StatCard({ label, value, subtitle }: { label: string; value: number | undefined; subtitle?: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-sm)]">
      <p className="text-sm font-medium text-[var(--text-secondary)]">{label}</p>
      <p className="mt-2 text-3xl font-bold text-[var(--text-primary)]">{(value ?? 0).toLocaleString()}</p>
      {subtitle && (
        <p className="mt-1 text-xs text-[var(--text-tertiary)]">{subtitle}</p>
      )}
    </div>
  )
}

function BarRow({ label, count, max, colorClass }: { label: string; count: number; max: number; colorClass: string }) {
  const pct = max > 0 ? (count / max) * 100 : 0
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-[var(--text-primary)]">{label}</span>
        <span className="text-[var(--text-tertiary)]">{count.toLocaleString()}</span>
      </div>
      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[var(--bg-sunken)]">
        <div
          className={`h-full rounded-full ${colorClass} transition-all`}
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
      </div>
    </div>
  )
}

export default function AdminOverviewPage() {
  const { language } = useLanguage()
  const copy = COPY[language]

  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fetchDashboardStats()
      .then((data) => {
        if (!cancelled) setStats(data)
      })
      .catch(() => {
        if (!cancelled) setError(copy.error)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [copy.error])

  if (loading) return <LoadingSkeleton />

  if (error || !stats) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6 text-sm text-[var(--text-secondary)]">
        {error || copy.error}
      </div>
    )
  }

  // The backend returns nested: { users: { total, active_today, new_this_week }, organizations: { total }, plans: {...}, generations: { today, this_month, by_platform } }
  const raw = stats as Record<string, any>
  const users = raw.users ?? {}
  const orgs = raw.organizations ?? {}
  const generations = raw.generations ?? {}

  const totalUsers = users.total ?? stats.total_users ?? 0
  const newThisWeek = users.new_this_week ?? stats.new_users_this_week ?? 0
  const activeToday = users.active_today ?? stats.active_today ?? 0
  const generationsThisMonth = generations.this_month ?? stats.generations_this_month ?? 0
  const generationsToday = generations.today ?? stats.generations_today ?? 0
  const totalOrgs = orgs.total ?? stats.total_organizations ?? 0

  const planEntries = Object.entries(raw.plans ?? stats.plan_distribution ?? {})
  const maxPlanCount = Math.max(...planEntries.map(([, v]) => v as number), 1)

  const platformEntries = Object.entries(generations.by_platform ?? stats.generations_by_platform ?? {})
  const maxPlatformCount = Math.max(...platformEntries.map(([, v]) => v as number), 1)

  return (
    <div className="space-y-6">
      {/* Top stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={copy.totalUsers}
          value={totalUsers}
          subtitle={`${newThisWeek} ${copy.newThisWeek}`}
        />
        <StatCard label={copy.activeToday} value={activeToday} />
        <StatCard label={copy.generationsThisMonth} value={generationsThisMonth} />
        <StatCard label={copy.totalOrganizations} value={totalOrgs} />
      </div>

      {/* Middle row — plan distribution + generations by platform */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-sm)]">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">{copy.planDistribution}</h2>
          <div className="mt-4 space-y-3">
            {planEntries.length > 0 ? (
              planEntries.map(([plan, count]) => (
                <BarRow
                  key={plan}
                  label={plan}
                  count={count as number}
                  max={maxPlanCount}
                  colorClass="bg-emerald-500"
                />
              ))
            ) : (
              <p className="text-sm text-[var(--text-tertiary)]">No data</p>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-sm)]">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">{copy.generationsByPlatform}</h2>
          <div className="mt-4 space-y-3">
            {platformEntries.length > 0 ? (
              platformEntries.map(([platform, count]) => (
                <BarRow
                  key={platform}
                  label={platform.charAt(0).toUpperCase() + platform.slice(1)}
                  count={count as number}
                  max={maxPlatformCount}
                  colorClass={PLATFORM_COLORS[platform] ?? 'bg-gray-500'}
                />
              ))
            ) : (
              <p className="text-sm text-[var(--text-tertiary)]">No data</p>
            )}
          </div>
        </section>
      </div>

      {/* Bottom — today's stats */}
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-sm)]">
        <h2 className="text-base font-semibold text-[var(--text-primary)]">{copy.todayStats}</h2>
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-[var(--text-secondary)]">
            <span className="text-2xl font-bold text-[var(--text-primary)]">{generationsToday.toLocaleString()}</span>{' '}
            {copy.generationsToday}
          </p>
          <Link
            href="/admin/users"
            className="text-sm font-medium text-[var(--accent)] hover:underline"
          >
            {copy.viewAllUsers} &rarr;
          </Link>
        </div>
      </section>
    </div>
  )
}
