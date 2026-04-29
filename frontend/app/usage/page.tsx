'use client'

import { useEffect, useState } from 'react'
import { GlobalNav } from '../../components/GlobalNav'
import { useLanguage } from '../../components/LanguageProvider'
import { useAuth } from '../../contexts/AuthContext'
import {
  fetchQuota,
  fetchUsageHistory,
  fetchUsageBreakdown,
  type QuotaResponse,
  type UsageHistoryEntry,
  type UsageBreakdownEntry,
} from '../../lib/usage-api'

type Language = 'en' | 'zh-TW'

const COPY: Record<Language, Record<string, string>> = {
  en: {
    pageTitle: 'Usage',
    plan: 'Plan',
    status: 'Active',
    used: 'generations used this month',
    resetPrefix: 'Period resets on',
    upgrade: 'Upgrade to Starter',
    historyTitle: 'Daily Usage (Last 30 Days)',
    breakdownTitle: 'Platform Breakdown',
    loading: 'Loading...',
    error: 'Failed to load usage data. Please try again.',
    noData: 'No usage data yet.',
    generations: 'generations',
  },
  'zh-TW': {
    pageTitle: '用量',
    plan: '方案',
    status: '啟用中',
    used: '次生成（本月）',
    resetPrefix: '週期重置於',
    upgrade: '升級至 Starter',
    historyTitle: '每日用量（近 30 天）',
    breakdownTitle: '平台分佈',
    loading: '載入中...',
    error: '無法載入用量資料，請重試。',
    noData: '尚無用量資料。',
    generations: '次生成',
  },
}

const PLATFORM_LABELS: Record<string, Record<Language, string>> = {
  instagram: { en: 'Instagram', 'zh-TW': 'Instagram' },
  seo: { en: 'SEO', 'zh-TW': 'SEO' },
  threads: { en: 'Threads', 'zh-TW': 'Threads' },
  facebook: { en: 'Facebook', 'zh-TW': 'Facebook' },
}

const PLATFORM_COLORS: Record<string, string> = {
  instagram: 'bg-pink-500',
  seo: 'bg-blue-500',
  threads: 'bg-purple-500',
  facebook: 'bg-indigo-500',
}

function formatDate(dateStr: string, language: Language): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString(language === 'zh-TW' ? 'zh-TW' : 'en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function progressColor(used: number, limit: number): string {
  if (limit === 0) return 'bg-gray-400'
  const pct = used / limit
  if (pct < 0.6) return 'bg-emerald-500'
  if (pct < 0.85) return 'bg-yellow-500'
  return 'bg-red-500'
}

function LoadingSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="rounded-[16px] bg-[var(--bg-elevated)] p-6">
        <div className="h-5 w-32 rounded bg-[var(--bg-sunken)]" />
        <div className="mt-4 h-4 w-48 rounded bg-[var(--bg-sunken)]" />
        <div className="mt-4 h-3 w-full rounded-full bg-[var(--bg-sunken)]" />
        <div className="mt-3 h-4 w-40 rounded bg-[var(--bg-sunken)]" />
      </div>
      <div className="rounded-[16px] bg-[var(--bg-elevated)] p-6">
        <div className="h-5 w-48 rounded bg-[var(--bg-sunken)]" />
        <div className="mt-6 flex items-end gap-1">
          {Array.from({ length: 15 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 rounded-t bg-[var(--bg-sunken)]"
              style={{ height: `${20 + Math.random() * 80}px` }}
            />
          ))}
        </div>
      </div>
      <div className="rounded-[16px] bg-[var(--bg-elevated)] p-6">
        <div className="h-5 w-36 rounded bg-[var(--bg-sunken)]" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 rounded bg-[var(--bg-sunken)]" />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function UsagePage() {
  const { language } = useLanguage()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const copy = COPY[language]

  const [quota, setQuota] = useState<QuotaResponse | null>(null)
  const [history, setHistory] = useState<UsageHistoryEntry[] | null>(null)
  const [breakdown, setBreakdown] = useState<UsageBreakdownEntry[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading || !isAuthenticated) return

    let cancelled = false
    setLoading(true)
    setError(null)

    Promise.all([fetchQuota(), fetchUsageHistory(), fetchUsageBreakdown()])
      .then(([q, h, b]) => {
        if (cancelled) return
        setQuota(q)
        setHistory(h)
        setBreakdown(b)
      })
      .catch(() => {
        if (!cancelled) setError(copy.error)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [authLoading, isAuthenticated, copy.error])

  const maxHistoryCount = history ? Math.max(...history.map((h) => h.count), 1) : 1
  const maxBreakdownCount = breakdown ? Math.max(...breakdown.map((b) => b.count), 1) : 1

  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text-primary)]">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-5 pb-16 pt-8 sm:px-6 lg:px-8">
        <GlobalNav />

        <h1 className="text-2xl font-bold">{copy.pageTitle}</h1>

        {loading || authLoading ? (
          <LoadingSkeleton />
        ) : error ? (
          <div className="rounded-[16px] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 text-sm text-[var(--text-secondary)]">
            {error}
          </div>
        ) : (
          <div className="space-y-8">
            {/* Plan info card */}
            {quota && (
              <section className="rounded-[16px] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-[var(--shadow-sm)]">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold">{quota.plan_name}</h2>
                  <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-500">
                    {copy.status}
                  </span>
                </div>

                <p className="mt-3 text-sm text-[var(--text-secondary)]">
                  {quota.generations_used} / {quota.generations_limit} {copy.used}
                </p>

                <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-[var(--bg-sunken)]">
                  <div
                    className={`h-full rounded-full transition-all ${progressColor(quota.generations_used, quota.generations_limit)}`}
                    style={{
                      width: `${Math.min((quota.generations_used / Math.max(quota.generations_limit, 1)) * 100, 100)}%`,
                    }}
                  />
                </div>

                <p className="mt-3 text-xs text-[var(--text-tertiary)]">
                  {copy.resetPrefix} {formatDate(quota.period_end, language)}
                </p>

                {quota.plan_name.toLowerCase() === 'free' && (
                  <a
                    href="mailto:purmonth@gmail.com"
                    className="mt-4 inline-flex items-center justify-center rounded-[8px] bg-[image:var(--gradient-cta)] px-5 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5"
                  >
                    {copy.upgrade}
                  </a>
                )}
              </section>
            )}

            {/* Usage history chart */}
            {history && history.length > 0 && (
              <section className="rounded-[16px] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-[var(--shadow-sm)]">
                <h2 className="text-base font-semibold">{copy.historyTitle}</h2>

                <div className="mt-6 flex items-end gap-[3px]" style={{ height: '160px' }}>
                  {history.map((entry) => {
                    const heightPct = (entry.count / maxHistoryCount) * 100
                    const date = new Date(entry.date)
                    const dayLabel = `${date.getMonth() + 1}/${date.getDate()}`
                    return (
                      <div
                        key={entry.date}
                        className="group relative flex flex-1 flex-col items-center justify-end"
                        style={{ height: '100%' }}
                      >
                        <div
                          className="w-full rounded-t bg-[var(--accent)] opacity-70 transition hover:opacity-100"
                          style={{
                            height: `${Math.max(heightPct, entry.count > 0 ? 4 : 0)}%`,
                            minHeight: entry.count > 0 ? '3px' : '0',
                          }}
                        />
                        <div className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 rounded bg-[var(--bg-elevated)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-primary)] opacity-0 shadow transition group-hover:opacity-100">
                          {entry.count}
                        </div>
                        {/* Show every 5th label to avoid crowding */}
                        <span className="mt-1 text-[9px] text-[var(--text-tertiary)] [&:nth-child(1)]:block">
                          {history.indexOf(entry) % 5 === 0 ? dayLabel : '\u00A0'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Platform breakdown */}
            {breakdown && breakdown.length > 0 && (
              <section className="rounded-[16px] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-[var(--shadow-sm)]">
                <h2 className="text-base font-semibold">{copy.breakdownTitle}</h2>

                <div className="mt-5 space-y-4">
                  {breakdown.map((entry) => {
                    const pct = (entry.count / maxBreakdownCount) * 100
                    const label =
                      PLATFORM_LABELS[entry.platform]?.[language] ?? entry.platform
                    const color =
                      PLATFORM_COLORS[entry.platform] ?? 'bg-gray-500'
                    return (
                      <div key={entry.platform}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-[var(--text-primary)]">{label}</span>
                          <span className="text-[var(--text-tertiary)]">
                            {entry.count} {copy.generations}
                          </span>
                        </div>
                        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[var(--bg-sunken)]">
                          <div
                            className={`h-full rounded-full ${color} transition-all`}
                            style={{ width: `${Math.max(pct, 2)}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
