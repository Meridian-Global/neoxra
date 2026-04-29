'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useLanguage } from '../../../components/LanguageProvider'
import { fetchSystemHealth, type PipelineMetrics, type SystemHealth } from '../../../lib/admin-api'

type Language = 'en' | 'zh-TW'

const COPY: Record<Language, Record<string, string>> = {
  en: {
    title: 'System Health',
    database: 'Database',
    coreLibrary: 'Core Library',
    rateLimiter: 'Rate Limiter',
    ok: 'OK',
    degraded: 'Degraded',
    disabled: 'Disabled',
    version: 'Version',
    backend: 'Backend',
    metricsTitle: 'Generation Metrics',
    successRate: 'Success Rate',
    totalRuns: 'Total Runs',
    failedRuns: 'Failed Runs',
    pipelineBreakdown: 'Per-Pipeline Breakdown',
    pipeline: 'Pipeline',
    total: 'Total',
    successful: 'Successful',
    failed: 'Failed',
    rate: 'Success Rate',
    noPipelines: 'No pipeline data yet.',
    autoRefresh: 'Auto-refresh',
    lastUpdated: 'Last updated',
    error: 'Failed to load system health.',
    retry: 'Retry',
    justNow: 'just now',
    secondsAgo: 's ago',
  },
  'zh-TW': {
    title: '系統健康狀態',
    database: '資料庫',
    coreLibrary: '核心函式庫',
    rateLimiter: '速率限制器',
    ok: '正常',
    degraded: '異常',
    disabled: '停用',
    version: '版本',
    backend: '後端',
    metricsTitle: '生成指標',
    successRate: '成功率',
    totalRuns: '總執行次數',
    failedRuns: '失敗次數',
    pipelineBreakdown: '各管線明細',
    pipeline: '管線',
    total: '總計',
    successful: '成功',
    failed: '失敗',
    rate: '成功率',
    noPipelines: '尚無管線資料。',
    autoRefresh: '自動刷新',
    lastUpdated: '最後更新',
    error: '無法載入系統健康資料。',
    retry: '重試',
    justNow: '剛剛',
    secondsAgo: '秒前',
  },
}

const REFRESH_INTERVAL_MS = 30_000

function StatusDot({ status }: { status: string }) {
  const color =
    status === 'ok'
      ? 'bg-emerald-500'
      : status === 'degraded'
        ? 'bg-red-500'
        : 'bg-gray-400'
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${color}`} />
}

function statusLabel(status: string, copy: Record<string, string>): string {
  if (status === 'ok') return copy.ok
  if (status === 'degraded') return copy.degraded
  return copy.disabled
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
            <div className="h-4 w-24 rounded bg-[var(--bg-sunken)]" />
            <div className="mt-3 h-6 w-16 rounded bg-[var(--bg-sunken)]" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
            <div className="h-4 w-20 rounded bg-[var(--bg-sunken)]" />
            <div className="mt-3 h-8 w-24 rounded bg-[var(--bg-sunken)]" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AdminSystemPage() {
  const { language } = useLanguage()
  const copy = COPY[language]

  const [health, setHealth] = useState<SystemHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [secondsAgo, setSecondsAgo] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const loadHealth = useCallback(() => {
    setLoading((prev) => prev)
    setError(null)
    fetchSystemHealth()
      .then((data) => {
        setHealth(data)
        setLastUpdated(new Date())
        setSecondsAgo(0)
      })
      .catch(() => setError(copy.error))
      .finally(() => setLoading(false))
  }, [copy.error])

  // Initial load
  useEffect(() => {
    loadHealth()
  }, [loadHealth])

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(loadHealth, REFRESH_INTERVAL_MS)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [autoRefresh, loadHealth])

  // Seconds-ago ticker
  useEffect(() => {
    const tick = setInterval(() => {
      if (lastUpdated) {
        setSecondsAgo(Math.floor((Date.now() - lastUpdated.getTime()) / 1000))
      }
    }, 1000)
    return () => clearInterval(tick)
  }, [lastUpdated])

  const timeAgoLabel =
    secondsAgo < 5 ? copy.justNow : `${secondsAgo}${copy.secondsAgo}`

  if (loading && !health) return <LoadingSkeleton />

  if (error && !health) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">{copy.title}</h1>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6">
          <p className="text-sm text-[var(--text-secondary)]">{error}</p>
          <button
            onClick={loadHealth}
            className="mt-3 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
            {copy.retry}
          </button>
        </div>
      </div>
    )
  }

  if (!health) return null

  const pipelines = Object.entries(health.generation_metrics.by_pipeline)
  const overall = health.generation_metrics.overall

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">{copy.title}</h1>
        <div className="flex items-center gap-4">
          {lastUpdated && (
            <span className="text-xs text-[var(--text-tertiary)]">
              {copy.lastUpdated}: {timeAgoLabel}
            </span>
          )}
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
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Database */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-sm)]">
          <p className="text-sm font-medium text-[var(--text-secondary)]">{copy.database}</p>
          <div className="mt-3 flex items-center gap-2">
            <StatusDot status={health.database.status} />
            <span className="text-lg font-semibold text-[var(--text-primary)]">
              {statusLabel(health.database.status, copy)}
            </span>
          </div>
        </div>

        {/* Core Library */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-sm)]">
          <p className="text-sm font-medium text-[var(--text-secondary)]">{copy.coreLibrary}</p>
          <div className="mt-3 flex items-center gap-2">
            <StatusDot status={health.core_library.status} />
            <span className="text-lg font-semibold text-[var(--text-primary)]">
              {statusLabel(health.core_library.status, copy)}
            </span>
          </div>
          <p className="mt-1 text-xs text-[var(--text-tertiary)]">
            {copy.version}: {health.core_library.distribution_version}
          </p>
        </div>

        {/* Rate Limiter */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-sm)]">
          <p className="text-sm font-medium text-[var(--text-secondary)]">{copy.rateLimiter}</p>
          <div className="mt-3 flex items-center gap-2">
            <StatusDot status="ok" />
            <span className="text-lg font-semibold text-[var(--text-primary)]">
              {statusLabel('ok', copy)}
            </span>
          </div>
          <p className="mt-1 text-xs text-[var(--text-tertiary)]">
            {copy.backend}: {health.guardrails.rate_limit_backend}
          </p>
        </div>
      </div>

      {/* Generation Metrics */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">{copy.metricsTitle}</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Success Rate */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-sm)]">
            <p className="text-sm font-medium text-[var(--text-secondary)]">{copy.successRate}</p>
            <p className="mt-2 text-3xl font-bold text-[var(--text-primary)]">
              {overall.total_runs > 0 ? `${overall.success_rate_percent}%` : '--'}
            </p>
          </div>

          {/* Total Runs */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-sm)]">
            <p className="text-sm font-medium text-[var(--text-secondary)]">{copy.totalRuns}</p>
            <p className="mt-2 text-3xl font-bold text-[var(--text-primary)]">
              {overall.total_runs.toLocaleString()}
            </p>
          </div>

          {/* Failed Runs */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-sm)]">
            <p className="text-sm font-medium text-[var(--text-secondary)]">{copy.failedRuns}</p>
            <p className={`mt-2 text-3xl font-bold ${overall.failed_runs > 0 ? 'text-red-500' : 'text-[var(--text-primary)]'}`}>
              {overall.failed_runs.toLocaleString()}
            </p>
          </div>
        </div>
      </section>

      {/* Per-Pipeline Breakdown */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">{copy.pipelineBreakdown}</h2>

        {pipelines.length === 0 ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6 text-sm text-[var(--text-secondary)]">
            {copy.noPipelines}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] shadow-[var(--shadow-sm)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--bg-sunken)]">
                  <th className="px-4 py-3 text-left font-semibold text-[var(--text-secondary)]">{copy.pipeline}</th>
                  <th className="px-4 py-3 text-right font-semibold text-[var(--text-secondary)]">{copy.total}</th>
                  <th className="px-4 py-3 text-right font-semibold text-[var(--text-secondary)]">{copy.successful}</th>
                  <th className="px-4 py-3 text-right font-semibold text-[var(--text-secondary)]">{copy.failed}</th>
                  <th className="px-4 py-3 text-right font-semibold text-[var(--text-secondary)]">{copy.rate}</th>
                </tr>
              </thead>
              <tbody>
                {pipelines.map(([name, metrics]: [string, PipelineMetrics], idx: number) => (
                  <tr
                    key={name}
                    className={`border-t border-[var(--border)] transition hover:bg-[var(--bg-sunken)] ${
                      idx % 2 === 1 ? 'bg-[var(--bg-sunken)]/30' : ''
                    }`}
                  >
                    <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{name}</td>
                    <td className="px-4 py-3 text-right text-[var(--text-secondary)]">{metrics.total_runs}</td>
                    <td className="px-4 py-3 text-right text-emerald-600">{metrics.successful_runs}</td>
                    <td className={`px-4 py-3 text-right ${metrics.failed_runs > 0 ? 'text-red-500' : 'text-[var(--text-secondary)]'}`}>
                      {metrics.failed_runs}
                    </td>
                    <td className="px-4 py-3 text-right text-[var(--text-secondary)]">
                      {metrics.total_runs > 0 ? `${metrics.success_rate_percent}%` : '--'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
