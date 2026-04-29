'use client'

import { useCallback, useEffect, useState } from 'react'
import { useLanguage } from '../../../components/LanguageProvider'
import {
  fetchPlans,
  fetchSubscriptions,
  type AdminPlan,
  type AdminSubscription,
  type PaginatedSubscriptions,
} from '../../../lib/admin-api'

type Language = 'en' | 'zh-TW'

const COPY: Record<Language, Record<string, string>> = {
  en: {
    title: 'Plans',
    free: 'Free',
    perMonth: '/mo',
    generationsLimit: 'generations / month',
    activeSubscribers: 'active subscribers',
    planActive: 'Active',
    planInactive: 'Inactive',
    subscriptionsTitle: 'Subscriptions',
    filterAll: 'All',
    filterActive: 'Active',
    filterCanceled: 'Canceled',
    filterPastDue: 'Past Due',
    orgCol: 'Organization',
    planCol: 'Plan',
    statusCol: 'Status',
    usageCol: 'Usage',
    periodEndCol: 'Period End',
    noPlans: 'No plans found.',
    noSubscriptions: 'No subscriptions found.',
    error: 'Failed to load data.',
    retry: 'Retry',
    page: 'Page',
    of: 'of',
    prev: 'Previous',
    next: 'Next',
  },
  'zh-TW': {
    title: '方案',
    free: '免費',
    perMonth: '/月',
    generationsLimit: '次生成 / 月',
    activeSubscribers: '位有效訂閱者',
    planActive: '啟用',
    planInactive: '停用',
    subscriptionsTitle: '訂閱列表',
    filterAll: '全部',
    filterActive: '有效',
    filterCanceled: '已取消',
    filterPastDue: '逾期',
    orgCol: '組織',
    planCol: '方案',
    statusCol: '狀態',
    usageCol: '用量',
    periodEndCol: '週期結束',
    noPlans: '找不到方案。',
    noSubscriptions: '找不到訂閱。',
    error: '無法載入資料。',
    retry: '重試',
    page: '第',
    of: '/',
    prev: '上一頁',
    next: '下一頁',
  },
}

const STATUS_FILTERS = ['', 'active', 'canceled', 'past_due'] as const

const PER_PAGE = 20

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
            <div className="h-5 w-24 rounded bg-[var(--bg-sunken)]" />
            <div className="mt-3 h-8 w-20 rounded bg-[var(--bg-sunken)]" />
            <div className="mt-2 h-3 w-32 rounded bg-[var(--bg-sunken)]" />
            <div className="mt-2 h-3 w-28 rounded bg-[var(--bg-sunken)]" />
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] overflow-hidden">
        <div className="h-10 bg-[var(--bg-sunken)]" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4 border-t border-[var(--border)] px-4 py-3">
            <div className="h-4 flex-1 rounded bg-[var(--bg-sunken)]" />
            <div className="h-4 w-20 rounded bg-[var(--bg-sunken)]" />
            <div className="h-4 w-16 rounded bg-[var(--bg-sunken)]" />
          </div>
        ))}
      </div>
    </div>
  )
}

function formatPrice(cents: number, language: Language, freeLabel: string, perMonth: string): string {
  if (cents === 0) return freeLabel
  const dollars = cents / 100
  const formatted = language === 'zh-TW'
    ? `$${dollars.toLocaleString('en-US')}`
    : `$${dollars.toLocaleString('en-US')}`
  return `${formatted}${perMonth}`
}

function formatDate(dateStr: string, language: Language): string {
  return new Date(dateStr).toLocaleDateString(language === 'zh-TW' ? 'zh-TW' : 'en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case 'active':
      return 'bg-emerald-500/15 text-emerald-600'
    case 'canceled':
      return 'bg-gray-500/15 text-[var(--text-secondary)]'
    case 'past_due':
      return 'bg-red-500/15 text-red-500'
    default:
      return 'bg-gray-500/15 text-[var(--text-secondary)]'
  }
}

export default function AdminPlansPage() {
  const { language } = useLanguage()
  const copy = COPY[language]

  const [plans, setPlans] = useState<AdminPlan[]>([])
  const [subs, setSubs] = useState<PaginatedSubscriptions | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [subsPage, setSubsPage] = useState(1)

  const filterLabels: Record<string, string> = {
    '': copy.filterAll,
    active: copy.filterActive,
    canceled: copy.filterCanceled,
    past_due: copy.filterPastDue,
  }

  const loadData = useCallback(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    Promise.all([
      fetchPlans(),
      fetchSubscriptions({
        status: statusFilter || undefined,
        page: subsPage,
      }),
    ])
      .then(([planList, subData]) => {
        if (cancelled) return
        setPlans(planList)
        setSubs(subData)
      })
      .catch(() => {
        if (!cancelled) setError(copy.error)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [statusFilter, subsPage, copy.error])

  useEffect(() => {
    return loadData()
  }, [loadData])

  const totalSubPages = subs ? Math.max(Math.ceil(subs.total / PER_PAGE), 1) : 1

  if (loading) return <LoadingSkeleton />

  if (error) {
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

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-[var(--text-primary)]">{copy.title}</h1>

      {/* Plan Cards */}
      {plans.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-sm)]"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-[var(--text-primary)]">{plan.name}</h3>
                <span
                  className={`rounded px-2 py-0.5 text-xs font-medium ${
                    plan.is_active
                      ? 'bg-emerald-500/15 text-emerald-600'
                      : 'bg-gray-500/15 text-[var(--text-secondary)]'
                  }`}
                >
                  {plan.is_active ? copy.planActive : copy.planInactive}
                </span>
              </div>
              <p className="mt-1 text-xs text-[var(--text-tertiary)]">{plan.slug}</p>
              <p className="mt-3 text-2xl font-bold text-[var(--text-primary)]">
                {formatPrice(plan.price_cents, language, copy.free, copy.perMonth)}
              </p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                {plan.generations_per_month.toLocaleString()} {copy.generationsLimit}
              </p>
              <p className="mt-1 text-sm text-[var(--text-tertiary)]">
                {plan.active_subscribers} {copy.activeSubscribers}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6 text-sm text-[var(--text-secondary)]">
          {copy.noPlans}
        </div>
      )}

      {/* Subscriptions */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">{copy.subscriptionsTitle}</h2>

        {/* Filter Tabs */}
        <div className="flex gap-1 rounded-lg bg-[var(--bg-sunken)] p-1 w-fit">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter}
              onClick={() => { setStatusFilter(filter); setSubsPage(1) }}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                statusFilter === filter
                  ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {filterLabels[filter]}
            </button>
          ))}
        </div>

        {!subs || subs.subscriptions.length === 0 ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6 text-sm text-[var(--text-secondary)]">
            {copy.noSubscriptions}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] shadow-[var(--shadow-sm)]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--bg-sunken)]">
                    <th className="px-4 py-3 text-left font-semibold text-[var(--text-secondary)]">{copy.orgCol}</th>
                    <th className="px-4 py-3 text-left font-semibold text-[var(--text-secondary)]">{copy.planCol}</th>
                    <th className="px-4 py-3 text-left font-semibold text-[var(--text-secondary)]">{copy.statusCol}</th>
                    <th className="px-4 py-3 text-left font-semibold text-[var(--text-secondary)]">{copy.periodEndCol}</th>
                  </tr>
                </thead>
                <tbody>
                  {subs.subscriptions.map((sub: AdminSubscription, idx: number) => (
                    <tr
                      key={sub.id}
                      className={`border-t border-[var(--border)] transition hover:bg-[var(--bg-sunken)] ${
                        idx % 2 === 1 ? 'bg-[var(--bg-sunken)]/30' : ''
                      }`}
                    >
                      <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{sub.organization_name}</td>
                      <td className="px-4 py-3 text-[var(--text-secondary)]">{sub.plan_name}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${statusBadgeClass(sub.status)}`}>
                          {sub.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[var(--text-secondary)]">
                        {formatDate(sub.current_period_end, language)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-[var(--text-tertiary)]">
                {language === 'zh-TW'
                  ? `${copy.page} ${subsPage} ${copy.of} ${totalSubPages} 頁`
                  : `${copy.page} ${subsPage} ${copy.of} ${totalSubPages}`}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setSubsPage((p) => Math.max(1, p - 1))}
                  disabled={subsPage <= 1}
                  className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--bg-elevated)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {copy.prev}
                </button>
                <button
                  onClick={() => setSubsPage((p) => Math.min(totalSubPages, p + 1))}
                  disabled={subsPage >= totalSubPages}
                  className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--bg-elevated)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {copy.next}
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
