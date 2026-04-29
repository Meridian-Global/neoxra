'use client'

import { useCallback, useEffect, useState } from 'react'
import { useLanguage } from '../../../components/LanguageProvider'
import {
  fetchOrganizations,
  fetchOrganizationDetail,
  type AdminOrganization,
  type OrgDetailResponse,
  type PaginatedOrganizations,
} from '../../../lib/admin-api'

type Language = 'en' | 'zh-TW'

const COPY: Record<Language, Record<string, string>> = {
  en: {
    title: 'Organizations',
    name: 'Name',
    tenantKey: 'Tenant Key',
    type: 'Type',
    members: 'Members',
    plan: 'Plan',
    generations: 'Generations',
    status: 'Status',
    active: 'Active',
    inactive: 'Inactive',
    noOrgs: 'No organizations found.',
    error: 'Failed to load organizations.',
    retry: 'Retry',
    page: 'Page',
    of: 'of',
    prev: 'Previous',
    next: 'Next',
    noPlan: 'No plan',
    detailMembers: 'Members',
    detailSubscription: 'Subscription',
    detailUsage: 'Usage this month',
    detailPeriod: 'Period',
    noSubscription: 'No active subscription.',
    noMembers: 'No members.',
    role: 'Role',
    email: 'Email',
    loadingDetail: 'Loading...',
    errorDetail: 'Failed to load details.',
    generationsLabel: 'generations',
  },
  'zh-TW': {
    title: '組織',
    name: '名稱',
    tenantKey: '租戶金鑰',
    type: '類型',
    members: '成員',
    plan: '方案',
    generations: '生成次數',
    status: '狀態',
    active: '啟用',
    inactive: '停用',
    noOrgs: '找不到組織。',
    error: '無法載入組織資料。',
    retry: '重試',
    page: '第',
    of: '/',
    prev: '上一頁',
    next: '下一頁',
    noPlan: '無方案',
    detailMembers: '成員列表',
    detailSubscription: '訂閱資訊',
    detailUsage: '本月用量',
    detailPeriod: '週期',
    noSubscription: '無有效訂閱。',
    noMembers: '無成員。',
    role: '角色',
    email: '電子郵件',
    loadingDetail: '載入中...',
    errorDetail: '無法載入詳細資料。',
    generationsLabel: '次生成',
  },
}

const PER_PAGE = 20

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] overflow-hidden">
        <div className="h-10 bg-[var(--bg-sunken)]" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-4 border-t border-[var(--border)] px-4 py-3">
            <div className="h-4 flex-1 rounded bg-[var(--bg-sunken)]" />
            <div className="h-4 w-20 rounded bg-[var(--bg-sunken)]" />
            <div className="h-4 w-16 rounded bg-[var(--bg-sunken)]" />
            <div className="h-4 w-16 rounded bg-[var(--bg-sunken)]" />
          </div>
        ))}
      </div>
    </div>
  )
}

function formatPeriod(start: string, end: string, language: Language): string {
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString(language === 'zh-TW' ? 'zh-TW' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  return `${fmt(start)} – ${fmt(end)}`
}

function OrgExpandedDetail({ orgId, language, copy }: { orgId: string; language: Language; copy: Record<string, string> }) {
  const [detail, setDetail] = useState<OrgDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(false)

    fetchOrganizationDetail(orgId)
      .then((data) => { if (!cancelled) setDetail(data) })
      .catch(() => { if (!cancelled) setError(true) })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [orgId])

  if (loading) {
    return (
      <div className="px-4 py-4 text-sm text-[var(--text-tertiary)] animate-pulse">
        {copy.loadingDetail}
      </div>
    )
  }

  if (error || !detail) {
    return (
      <div className="px-4 py-4 text-sm text-[var(--text-secondary)]">
        {copy.errorDetail}
      </div>
    )
  }

  const { members, subscription } = detail
  const usagePct = subscription
    ? Math.min((subscription.generations_used / Math.max(subscription.generations_limit, 1)) * 100, 100)
    : 0

  return (
    <div className="grid grid-cols-1 gap-4 px-4 py-4 lg:grid-cols-2">
      {/* Members */}
      <div>
        <h4 className="text-sm font-semibold text-[var(--text-primary)]">{copy.detailMembers}</h4>
        {members.length > 0 ? (
          <div className="mt-2 overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--bg-sunken)]">
                  <th className="px-3 py-2 text-left font-medium text-[var(--text-secondary)]">{copy.email}</th>
                  <th className="px-3 py-2 text-left font-medium text-[var(--text-secondary)]">{copy.role}</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id} className="border-t border-[var(--border)]">
                    <td className="px-3 py-2 text-[var(--text-primary)]">{m.email}</td>
                    <td className="px-3 py-2 text-[var(--text-secondary)]">{m.role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-2 text-sm text-[var(--text-tertiary)]">{copy.noMembers}</p>
        )}
      </div>

      {/* Subscription & Usage */}
      <div>
        <h4 className="text-sm font-semibold text-[var(--text-primary)]">{copy.detailSubscription}</h4>
        {subscription ? (
          <div className="mt-2 space-y-3 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-[var(--text-primary)]">{subscription.plan_name}</span>
              <span className={`rounded px-2 py-0.5 text-xs font-medium ${
                subscription.status === 'active'
                  ? 'bg-emerald-500/15 text-emerald-600'
                  : 'bg-gray-500/15 text-[var(--text-secondary)]'
              }`}>
                {subscription.status}
              </span>
            </div>
            <div>
              <p className="text-xs text-[var(--text-tertiary)]">{copy.detailPeriod}</p>
              <p className="text-sm text-[var(--text-secondary)]">
                {formatPeriod(subscription.period_start, subscription.period_end, language)}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-tertiary)]">{copy.detailUsage}</p>
              <p className="text-sm text-[var(--text-secondary)]">
                {subscription.generations_used} / {subscription.generations_limit} {copy.generationsLabel}
              </p>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[var(--bg-sunken)]">
                <div
                  className={`h-full rounded-full transition-all ${
                    usagePct < 60 ? 'bg-emerald-500' : usagePct < 85 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.max(usagePct, 1)}%` }}
                />
              </div>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-sm text-[var(--text-tertiary)]">{copy.noSubscription}</p>
        )}
      </div>
    </div>
  )
}

export default function AdminOrgsPage() {
  const { language } = useLanguage()
  const copy = COPY[language]

  const [data, setData] = useState<PaginatedOrganizations | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const loadOrgs = useCallback(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fetchOrganizations({ page, per_page: PER_PAGE })
      .then((result) => { if (!cancelled) setData(result) })
      .catch(() => { if (!cancelled) setError(copy.error) })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [page, copy.error])

  useEffect(() => {
    return loadOrgs()
  }, [loadOrgs])

  const totalPages = data ? Math.max(Math.ceil(data.total / PER_PAGE), 1) : 1

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-[var(--text-primary)]">{copy.title}</h1>

      {loading ? (
        <LoadingSkeleton />
      ) : error ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6">
          <p className="text-sm text-[var(--text-secondary)]">{error}</p>
          <button
            onClick={loadOrgs}
            className="mt-3 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
            {copy.retry}
          </button>
        </div>
      ) : !data || data.organizations.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6 text-sm text-[var(--text-secondary)]">
          {copy.noOrgs}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] shadow-[var(--shadow-sm)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--bg-sunken)]">
                  <th className="px-4 py-3 text-left font-semibold text-[var(--text-secondary)]">{copy.name}</th>
                  <th className="px-4 py-3 text-left font-semibold text-[var(--text-secondary)]">{copy.tenantKey}</th>
                  <th className="px-4 py-3 text-left font-semibold text-[var(--text-secondary)]">{copy.type}</th>
                  <th className="px-4 py-3 text-left font-semibold text-[var(--text-secondary)]">{copy.members}</th>
                  <th className="px-4 py-3 text-left font-semibold text-[var(--text-secondary)]">{copy.plan}</th>
                  <th className="px-4 py-3 text-left font-semibold text-[var(--text-secondary)]">{copy.generations}</th>
                  <th className="px-4 py-3 text-left font-semibold text-[var(--text-secondary)]">{copy.status}</th>
                </tr>
              </thead>
              <tbody>
                {data.organizations.map((org: AdminOrganization, idx: number) => {
                  const isExpanded = expandedId === org.id
                  return (
                    <OrgRow
                      key={org.id}
                      org={org}
                      idx={idx}
                      isExpanded={isExpanded}
                      onToggle={() => setExpandedId(isExpanded ? null : org.id)}
                      language={language}
                      copy={copy}
                    />
                  )
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

function OrgRow({
  org,
  idx,
  isExpanded,
  onToggle,
  language,
  copy,
}: {
  org: AdminOrganization
  idx: number
  isExpanded: boolean
  onToggle: () => void
  language: Language
  copy: Record<string, string>
}) {
  const isActive = org.status === 'active'

  return (
    <>
      <tr
        onClick={onToggle}
        className={`cursor-pointer border-t border-[var(--border)] transition hover:bg-[var(--bg-sunken)] ${
          idx % 2 === 1 ? 'bg-[var(--bg-sunken)]/30' : ''
        } ${isExpanded ? 'bg-[var(--bg-sunken)]/50' : ''}`}
      >
        <td className="px-4 py-3 font-medium text-[var(--text-primary)]">
          <span className="mr-1.5 inline-block text-xs text-[var(--text-tertiary)]">
            {isExpanded ? '▾' : '▸'}
          </span>
          {org.name}
        </td>
        <td className="px-4 py-3 text-[var(--text-secondary)]">
          <code className="rounded bg-[var(--bg-sunken)] px-1.5 py-0.5 text-xs">{org.tenant_key}</code>
        </td>
        <td className="px-4 py-3 text-[var(--text-secondary)]">{org.org_type}</td>
        <td className="px-4 py-3 text-[var(--text-secondary)]">{org.member_count}</td>
        <td className="px-4 py-3 text-[var(--text-secondary)]">{org.plan_name || copy.noPlan}</td>
        <td className="px-4 py-3 text-[var(--text-secondary)]">{org.generations_this_month.toLocaleString()}</td>
        <td className="px-4 py-3">
          <span className="inline-flex items-center gap-1.5">
            <span className={`inline-block h-2 w-2 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
            <span className={`text-xs font-medium ${isActive ? 'text-emerald-600' : 'text-red-500'}`}>
              {isActive ? copy.active : copy.inactive}
            </span>
          </span>
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={7} className="border-t border-[var(--border)] bg-[var(--bg-sunken)]/20">
            <OrgExpandedDetail orgId={org.id} language={language} copy={copy} />
          </td>
        </tr>
      )}
    </>
  )
}
