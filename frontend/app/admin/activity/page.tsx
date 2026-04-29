'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useLanguage } from '../../../components/LanguageProvider'
import { fetchActivity, type ActivityItem, type PaginatedActivity } from '../../../lib/admin-api'

type Language = 'en' | 'zh-TW'

const COPY: Record<Language, Record<string, string>> = {
  en: {
    title: 'Activity Log',
    time: 'Time',
    user: 'User',
    platform: 'Platform',
    status: 'Status',
    duration: 'Duration',
    allPlatforms: 'All Platforms',
    allStatuses: 'All Statuses',
    completed: 'Completed',
    failed: 'Failed',
    started: 'Started',
    noActivity: 'No activity found.',
    error: 'Failed to load activity log.',
    retry: 'Retry',
    autoRefresh: 'Auto-refresh',
    page: 'Page',
    of: 'of',
    prev: 'Previous',
    next: 'Next',
    anonymous: 'Anonymous',
    justNow: 'just now',
    secondsAgo: 's ago',
    minutesAgo: 'm ago',
    hoursAgo: 'h ago',
    daysAgo: 'd ago',
  },
  'zh-TW': {
    title: '活動紀錄',
    time: '時間',
    user: '使用者',
    platform: '平台',
    status: '狀態',
    duration: '耗時',
    allPlatforms: '所有平台',
    allStatuses: '所有狀態',
    completed: '完成',
    failed: '失敗',
    started: '進行中',
    noActivity: '查無活動紀錄。',
    error: '無法載入活動紀錄。',
    retry: '重試',
    autoRefresh: '自動刷新',
    page: '第',
    of: '/',
    prev: '上一頁',
    next: '下一頁',
    anonymous: '匿名',
    justNow: '剛剛',
    secondsAgo: '秒前',
    minutesAgo: '分鐘前',
    hoursAgo: '小時前',
    daysAgo: '天前',
  },
}

const PLATFORM_OPTIONS = [
  { value: '', label: 'allPlatforms' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'seo', label: 'SEO' },
  { value: 'threads', label: 'Threads' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'core', label: 'Core' },
] as const

const STATUS_OPTIONS = [
  { value: '', label: 'allStatuses' },
  { value: 'completed', label: 'completed' },
  { value: 'failed', label: 'failed' },
  { value: 'started', label: 'started' },
] as const

const PER_PAGE = 50
const REFRESH_INTERVAL_MS = 10_000

function formatTimeAgo(dateStr: string, copy: Record<string, string>): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 5) return copy.justNow
  if (diff < 60) return `${diff}${copy.secondsAgo}`
  if (diff < 3600) return `${Math.floor(diff / 60)}${copy.minutesAgo}`
  if (diff < 86400) return `${Math.floor(diff / 3600)}${copy.hoursAgo}`
  return `${Math.floor(diff / 86400)}${copy.daysAgo}`
}

function formatDuration(ms: number | null): string {
  if (ms == null) return '--'
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case 'completed':
      return 'bg-emerald-500/15 text-emerald-600'
    case 'failed':
      return 'bg-red-500/15 text-red-500'
    default:
      return 'bg-amber-500/15 text-amber-600'
  }
}

function statusLabel(status: string, copy: Record<string, string>): string {
  if (status === 'completed') return copy.completed
  if (status === 'failed') return copy.failed
  if (status === 'started') return copy.started
  return status
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex gap-3">
        <div className="h-9 w-36 rounded-lg bg-[var(--bg-sunken)]" />
        <div className="h-9 w-36 rounded-lg bg-[var(--bg-sunken)]" />
      </div>
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] overflow-hidden">
        <div className="h-10 bg-[var(--bg-sunken)]" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex gap-4 border-t border-[var(--border)] px-4 py-3">
            <div className="h-4 w-16 rounded bg-[var(--bg-sunken)]" />
            <div className="h-4 flex-1 rounded bg-[var(--bg-sunken)]" />
            <div className="h-4 w-20 rounded bg-[var(--bg-sunken)]" />
            <div className="h-4 w-16 rounded bg-[var(--bg-sunken)]" />
            <div className="h-4 w-12 rounded bg-[var(--bg-sunken)]" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AdminActivityPage() {
  const { language } = useLanguage()
  const copy = COPY[language]

  const [data, setData] = useState<PaginatedActivity | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [platformFilter, setPlatformFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [, setTick] = useState(0)

  const loadData = useCallback(() => {
    setError(null)
    fetchActivity({
      page,
      per_page: PER_PAGE,
      route: platformFilter || undefined,
      status: statusFilter || undefined,
    })
      .then((result) => setData(result))
      .catch(() => setError(copy.error))
      .finally(() => setLoading(false))
  }, [page, platformFilter, statusFilter, copy.error])

  // Initial + filter/page change
  useEffect(() => {
    setLoading(true)
    loadData()
  }, [loadData])

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(loadData, REFRESH_INTERVAL_MS)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [autoRefresh, loadData])

  // Tick for relative time updates
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 10_000)
    return () => clearInterval(t)
  }, [])

  const totalPages = data ? data.pagination.total_pages : 1

  if (loading && !data) return <LoadingSkeleton />

  if (error && !data) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">{copy.title}</h1>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6">
          <p className="text-sm text-[var(--text-secondary)]">{error}</p>
          <button
            onClick={loadData}
            className="mt-3 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
            {copy.retry}
          </button>
        </div>
      </div>
    )
  }

  const activities = data?.activities ?? []

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">{copy.title}</h1>
        <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            className="accent-[var(--accent)]"
          />
          {copy.autoRefresh}
        </label>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={platformFilter}
          onChange={(e) => { setPlatformFilter(e.target.value); setPage(1) }}
          className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
        >
          {PLATFORM_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.value === '' ? copy[opt.label] : opt.label}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.value === '' ? copy[opt.label] : copy[opt.label] || opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      {activities.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6 text-sm text-[var(--text-secondary)]">
          {copy.noActivity}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] shadow-[var(--shadow-sm)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--bg-sunken)]">
                  <th className="px-4 py-3 text-left font-semibold text-[var(--text-secondary)]">{copy.time}</th>
                  <th className="px-4 py-3 text-left font-semibold text-[var(--text-secondary)]">{copy.user}</th>
                  <th className="px-4 py-3 text-left font-semibold text-[var(--text-secondary)]">{copy.platform}</th>
                  <th className="px-4 py-3 text-left font-semibold text-[var(--text-secondary)]">{copy.status}</th>
                  <th className="px-4 py-3 text-right font-semibold text-[var(--text-secondary)]">{copy.duration}</th>
                </tr>
              </thead>
              <tbody>
                {activities.map((item: ActivityItem, idx: number) => {
                  const row = (
                    <tr
                      key={item.id}
                      className={`border-t border-[var(--border)] transition hover:bg-[var(--bg-sunken)] ${
                        idx % 2 === 1 ? 'bg-[var(--bg-sunken)]/30' : ''
                      }`}
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-[var(--text-tertiary)]">
                        {formatTimeAgo(item.created_at, copy)}
                      </td>
                      <td className="px-4 py-3">
                        {item.user_id ? (
                          <Link
                            href={`/admin/users/${item.user_id}`}
                            className="font-medium text-[var(--accent)] hover:underline"
                          >
                            {item.user_email ?? copy.anonymous}
                          </Link>
                        ) : (
                          <span className="text-[var(--text-tertiary)]">{copy.anonymous}</span>
                        )}
                        {item.org_name && (
                          <span className="ml-2 text-xs text-[var(--text-tertiary)]">{item.org_name}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[var(--text-secondary)]">{item.pipeline}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${statusBadgeClass(item.status)}`}>
                          {statusLabel(item.status, copy)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-[var(--text-secondary)]">
                        {formatDuration(item.duration_ms)}
                      </td>
                    </tr>
                  )
                  return row
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-[var(--text-tertiary)]">
              {language === 'zh-TW'
                ? `${copy.page} ${page} ${copy.of} ${totalPages} 頁`
                : `${copy.page} ${page} ${copy.of} ${totalPages}`}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--bg-elevated)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {copy.prev}
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--bg-elevated)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {copy.next}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
