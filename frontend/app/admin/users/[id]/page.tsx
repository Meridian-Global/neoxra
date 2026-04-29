'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { useLanguage } from '../../../../components/LanguageProvider'
import { useAuth } from '../../../../contexts/AuthContext'
import {
  assignPlan,
  fetchPlans,
  fetchUserDetailFull,
  updateUser,
  type AdminPlan,
  type UserDetailResponse,
} from '../../../../lib/admin-api'

type Language = 'en' | 'zh-TW'

const COPY: Record<Language, Record<string, string>> = {
  en: {
    backToUsers: 'Back to Users',
    userInfo: 'User Info',
    email: 'Email',
    name: 'Name',
    userId: 'User ID',
    status: 'Status',
    active: 'Active',
    inactive: 'Inactive',
    admin: 'Admin',
    lastLogin: 'Last Login',
    created: 'Account Created',
    never: 'Never',
    organization: 'Organization',
    orgName: 'Name',
    tenantKey: 'Tenant Key',
    orgType: 'Type',
    noOrg: 'No organization assigned.',
    subscription: 'Subscription',
    plan: 'Plan',
    period: 'Period',
    usage: 'Usage',
    generations: 'generations',
    changePlan: 'Change Plan',
    selectPlan: 'Select plan...',
    confirmChangePlan: 'Are you sure you want to change this user\'s plan?',
    planChanged: 'Plan changed successfully.',
    noSubscription: 'No active subscription.',
    sessions: 'Active Sessions',
    authMethod: 'Auth Method',
    sessionStatus: 'Status',
    lastSeen: 'Last Seen',
    sessionCreated: 'Created',
    noSessions: 'No active sessions.',
    recentGenerations: 'Recent Generations',
    route: 'Platform',
    genStatus: 'Status',
    duration: 'Duration',
    genCreated: 'Created',
    noGenerations: 'No recent generations.',
    completed: 'Completed',
    failed: 'Failed',
    adminActions: 'Admin Actions',
    toggleActive: 'Deactivate User',
    toggleActiveOn: 'Activate User',
    toggleAdmin: 'Revoke Admin',
    toggleAdminOn: 'Grant Admin',
    confirmToggleAdmin: 'Are you sure you want to change this user\'s admin status?',
    cannotToggleSelf: 'Cannot change your own admin status.',
    loading: 'Loading...',
    error: 'Failed to load user details.',
    retry: 'Retry',
    saving: 'Saving...',
  },
  'zh-TW': {
    backToUsers: '返回使用者列表',
    userInfo: '使用者資訊',
    email: '電子郵件',
    name: '姓名',
    userId: '使用者 ID',
    status: '狀態',
    active: '啟用',
    inactive: '停用',
    admin: '管理員',
    lastLogin: '最後登入',
    created: '帳號建立時間',
    never: '從未',
    organization: '組織',
    orgName: '名稱',
    tenantKey: '租戶金鑰',
    orgType: '類型',
    noOrg: '未指派組織。',
    subscription: '訂閱',
    plan: '方案',
    period: '週期',
    usage: '用量',
    generations: '次生成',
    changePlan: '變更方案',
    selectPlan: '選擇方案...',
    confirmChangePlan: '確定要變更此使用者的方案嗎？',
    planChanged: '方案已成功變更。',
    noSubscription: '無有效訂閱。',
    sessions: '活躍工作階段',
    authMethod: '驗證方式',
    sessionStatus: '狀態',
    lastSeen: '最後活動',
    sessionCreated: '建立時間',
    noSessions: '無活躍工作階段。',
    recentGenerations: '近期生成紀錄',
    route: '平台',
    genStatus: '狀態',
    duration: '耗時',
    genCreated: '建立時間',
    noGenerations: '無近期生成紀錄。',
    completed: '完成',
    failed: '失敗',
    adminActions: '管理員操作',
    toggleActive: '停用使用者',
    toggleActiveOn: '啟用使用者',
    toggleAdmin: '撤銷管理員',
    toggleAdminOn: '授予管理員',
    confirmToggleAdmin: '確定要變更此使用者的管理員狀態嗎？',
    cannotToggleSelf: '無法變更自己的管理員狀態。',
    loading: '載入中...',
    error: '無法載入使用者詳情。',
    retry: '重試',
    saving: '儲存中...',
  },
}

function formatDate(dateStr: string | null, language: Language, neverLabel: string): string {
  if (!dateStr) return neverLabel
  const date = new Date(dateStr)
  return date.toLocaleDateString(language === 'zh-TW' ? 'zh-TW' : 'en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
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

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-4 w-32 rounded bg-[var(--bg-sunken)]" />
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6">
        <div className="h-5 w-40 rounded bg-[var(--bg-sunken)]" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-4 w-64 rounded bg-[var(--bg-sunken)]" />
          ))}
        </div>
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6">
          <div className="h-5 w-36 rounded bg-[var(--bg-sunken)]" />
          <div className="mt-4 space-y-2">
            <div className="h-4 w-48 rounded bg-[var(--bg-sunken)]" />
            <div className="h-4 w-32 rounded bg-[var(--bg-sunken)]" />
          </div>
        </div>
      ))}
    </div>
  )
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-1.5">
      <span className="w-36 shrink-0 text-sm font-medium text-[var(--text-secondary)]">{label}</span>
      <span className="text-sm text-[var(--text-primary)]">{children}</span>
    </div>
  )
}

export default function AdminUserDetailPage() {
  const params = useParams()
  const userId = params.id as string
  const { language } = useLanguage()
  const { user: currentUser } = useAuth()
  const copy = COPY[language]

  const [detail, setDetail] = useState<UserDetailResponse | null>(null)
  const [plans, setPlans] = useState<AdminPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedPlan, setSelectedPlan] = useState('')
  const [planSaving, setPlanSaving] = useState(false)
  const [planMessage, setPlanMessage] = useState<string | null>(null)

  const [activeToggling, setActiveToggling] = useState(false)
  const [adminToggling, setAdminToggling] = useState(false)

  const isSelf = currentUser?.user?.id === userId

  const loadData = useCallback(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    Promise.all([fetchUserDetailFull(userId), fetchPlans()])
      .then(([userDetail, planList]) => {
        if (cancelled) return
        setDetail(userDetail)
        setPlans(planList)
      })
      .catch(() => {
        if (!cancelled) setError(copy.error)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [userId, copy.error])

  useEffect(() => {
    return loadData()
  }, [loadData])

  const handleChangePlan = async () => {
    if (!selectedPlan || !detail?.organization) return
    if (!window.confirm(copy.confirmChangePlan)) return

    setPlanSaving(true)
    setPlanMessage(null)
    try {
      await assignPlan(detail.organization.id, selectedPlan)
      setPlanMessage(copy.planChanged)
      setSelectedPlan('')
      // Refresh data
      const refreshed = await fetchUserDetailFull(userId)
      setDetail(refreshed)
    } catch {
      setPlanMessage(copy.error)
    } finally {
      setPlanSaving(false)
    }
  }

  const handleToggleActive = async () => {
    if (!detail) return
    setActiveToggling(true)
    try {
      const updated = await updateUser(userId, { is_active: !detail.user.is_active })
      setDetail((prev) => prev ? { ...prev, user: updated } : prev)
    } catch {
      // silent — user sees the state didn't change
    } finally {
      setActiveToggling(false)
    }
  }

  const handleToggleAdmin = async () => {
    if (!detail || isSelf) return
    if (!window.confirm(copy.confirmToggleAdmin)) return

    setAdminToggling(true)
    try {
      const updated = await updateUser(userId, { is_admin: !detail.user.is_admin })
      setDetail((prev) => prev ? { ...prev, user: updated } : prev)
    } catch {
      // silent
    } finally {
      setAdminToggling(false)
    }
  }

  if (loading) {
    return (
      <div>
        <Link href="/admin/users" className="text-sm font-medium text-[var(--accent)] hover:underline">
          &larr; {copy.backToUsers}
        </Link>
        <div className="mt-4">
          <LoadingSkeleton />
        </div>
      </div>
    )
  }

  if (error || !detail) {
    return (
      <div>
        <Link href="/admin/users" className="text-sm font-medium text-[var(--accent)] hover:underline">
          &larr; {copy.backToUsers}
        </Link>
        <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6">
          <p className="text-sm text-[var(--text-secondary)]">{error || copy.error}</p>
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

  const { user, organization, subscription, sessions, recent_generations } = detail
  const usagePct = subscription
    ? Math.min((subscription.generations_used / Math.max(subscription.generations_limit, 1)) * 100, 100)
    : 0

  return (
    <div className="space-y-6">
      <Link href="/admin/users" className="text-sm font-medium text-[var(--accent)] hover:underline">
        &larr; {copy.backToUsers}
      </Link>

      {/* User Info */}
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-[var(--shadow-sm)]">
        <h2 className="text-base font-semibold text-[var(--text-primary)]">{copy.userInfo}</h2>
        <div className="mt-4">
          <InfoRow label={copy.email}>{user.email}</InfoRow>
          <InfoRow label={copy.name}>{user.full_name || '—'}</InfoRow>
          <InfoRow label={copy.userId}>
            <code className="rounded bg-[var(--bg-sunken)] px-1.5 py-0.5 text-xs">{user.id}</code>
          </InfoRow>
          <InfoRow label={copy.status}>
            <span className="inline-flex items-center gap-1.5">
              <span className={`inline-block h-2 w-2 rounded-full ${user.is_active ? 'bg-emerald-500' : 'bg-red-500'}`} />
              <span className={`text-sm font-medium ${user.is_active ? 'text-emerald-600' : 'text-red-500'}`}>
                {user.is_active ? copy.active : copy.inactive}
              </span>
            </span>
            {user.is_admin && (
              <span className="ml-2 rounded bg-purple-500/15 px-2 py-0.5 text-xs font-semibold text-purple-500">
                {copy.admin}
              </span>
            )}
          </InfoRow>
          <InfoRow label={copy.lastLogin}>{formatDate(user.last_login_at, language, copy.never)}</InfoRow>
          <InfoRow label={copy.created}>{formatDate(user.created_at, language, '—')}</InfoRow>
        </div>
      </section>

      {/* Organization */}
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-[var(--shadow-sm)]">
        <h2 className="text-base font-semibold text-[var(--text-primary)]">{copy.organization}</h2>
        {organization ? (
          <div className="mt-4">
            <InfoRow label={copy.orgName}>{organization.name}</InfoRow>
            <InfoRow label={copy.tenantKey}>
              <code className="rounded bg-[var(--bg-sunken)] px-1.5 py-0.5 text-xs">{organization.tenant_key}</code>
            </InfoRow>
            <InfoRow label={copy.orgType}>{organization.org_type}</InfoRow>
          </div>
        ) : (
          <p className="mt-3 text-sm text-[var(--text-tertiary)]">{copy.noOrg}</p>
        )}
      </section>

      {/* Subscription */}
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-[var(--shadow-sm)]">
        <h2 className="text-base font-semibold text-[var(--text-primary)]">{copy.subscription}</h2>
        {subscription ? (
          <div className="mt-4">
            <InfoRow label={copy.plan}>
              {subscription.plan_name}
              <span className="ml-2 text-xs text-[var(--text-tertiary)]">({subscription.plan_slug})</span>
            </InfoRow>
            <InfoRow label={copy.period}>
              {formatPeriod(subscription.period_start, subscription.period_end, language)}
            </InfoRow>
            <InfoRow label={copy.usage}>
              <div className="w-full max-w-xs">
                <p className="text-sm">
                  {subscription.generations_used} / {subscription.generations_limit} {copy.generations}
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
            </InfoRow>

            {/* Change Plan */}
            {organization && (
              <div className="mt-4 flex items-center gap-3">
                <select
                  value={selectedPlan}
                  onChange={(e) => setSelectedPlan(e.target.value)}
                  className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-sm text-[var(--text-primary)] outline-none"
                >
                  <option value="">{copy.selectPlan}</option>
                  {plans.map((p) => (
                    <option key={p.slug} value={p.slug}>
                      {p.name} ({p.generations_per_month}/mo)
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleChangePlan}
                  disabled={!selectedPlan || planSaving}
                  className="rounded-lg bg-[var(--accent)] px-4 py-1.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {planSaving ? copy.saving : copy.changePlan}
                </button>
                {planMessage && (
                  <span className="text-sm text-[var(--text-secondary)]">{planMessage}</span>
                )}
              </div>
            )}
          </div>
        ) : (
          <p className="mt-3 text-sm text-[var(--text-tertiary)]">{copy.noSubscription}</p>
        )}
      </section>

      {/* Sessions */}
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)]/50 p-6 shadow-[var(--shadow-sm)]">
        <h2 className="text-base font-semibold text-[var(--text-primary)]">{copy.sessions}</h2>
        {sessions.length > 0 ? (
          <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--bg-sunken)]">
                  <th className="px-4 py-2.5 text-left font-semibold text-[var(--text-secondary)]">{copy.authMethod}</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-[var(--text-secondary)]">{copy.sessionStatus}</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-[var(--text-secondary)]">{copy.lastSeen}</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-[var(--text-secondary)]">{copy.sessionCreated}</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session, idx) => (
                  <tr
                    key={session.id}
                    className={`border-t border-[var(--border)] ${idx % 2 === 1 ? 'bg-[var(--bg-sunken)]/30' : ''}`}
                  >
                    <td className="px-4 py-2.5 text-[var(--text-primary)]">{session.auth_method}</td>
                    <td className="px-4 py-2.5 text-[var(--text-secondary)]">{session.status}</td>
                    <td className="px-4 py-2.5 text-[var(--text-secondary)]">{formatDate(session.last_seen_at, language, '—')}</td>
                    <td className="px-4 py-2.5 text-[var(--text-secondary)]">{formatDate(session.created_at, language, '—')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-3 text-sm text-[var(--text-tertiary)]">{copy.noSessions}</p>
        )}
      </section>

      {/* Recent Generations */}
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-[var(--shadow-sm)]">
        <h2 className="text-base font-semibold text-[var(--text-primary)]">{copy.recentGenerations}</h2>
        {recent_generations.length > 0 ? (
          <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--border)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--bg-sunken)]">
                  <th className="px-4 py-2.5 text-left font-semibold text-[var(--text-secondary)]">{copy.route}</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-[var(--text-secondary)]">{copy.genStatus}</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-[var(--text-secondary)]">{copy.duration}</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-[var(--text-secondary)]">{copy.genCreated}</th>
                </tr>
              </thead>
              <tbody>
                {recent_generations.map((gen, idx) => {
                  const isCompleted = gen.status === 'completed'
                  const isFailed = gen.status === 'failed'
                  return (
                    <tr
                      key={gen.id}
                      className={`border-t border-[var(--border)] ${idx % 2 === 1 ? 'bg-[var(--bg-sunken)]/30' : ''}`}
                    >
                      <td className="px-4 py-2.5 text-[var(--text-primary)]">
                        {gen.route.replace(/^\/?(generate\/)?/, '').replace(/^api\//, '') || gen.route}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
                            isCompleted
                              ? 'bg-emerald-500/15 text-emerald-600'
                              : isFailed
                                ? 'bg-red-500/15 text-red-500'
                                : 'bg-gray-500/15 text-[var(--text-secondary)]'
                          }`}
                        >
                          {isCompleted ? copy.completed : isFailed ? copy.failed : gen.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-[var(--text-secondary)]">
                        {gen.duration_ms != null ? `${gen.duration_ms.toLocaleString()} ms` : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-[var(--text-secondary)]">
                        {formatDate(gen.created_at, language, '—')}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-3 text-sm text-[var(--text-tertiary)]">{copy.noGenerations}</p>
        )}
      </section>

      {/* Admin Actions */}
      <section className="rounded-2xl border border-red-500/20 bg-[var(--bg-elevated)] p-6 shadow-[var(--shadow-sm)]">
        <h2 className="text-base font-semibold text-[var(--text-primary)]">{copy.adminActions}</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            onClick={handleToggleActive}
            disabled={activeToggling}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
              user.is_active
                ? 'border border-red-500/30 text-red-500 hover:bg-red-500/10'
                : 'border border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10'
            }`}
          >
            {activeToggling ? copy.saving : user.is_active ? copy.toggleActive : copy.toggleActiveOn}
          </button>

          <button
            onClick={handleToggleAdmin}
            disabled={adminToggling || isSelf}
            title={isSelf ? copy.cannotToggleSelf : undefined}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
              user.is_admin
                ? 'border border-red-500/30 text-red-500 hover:bg-red-500/10'
                : 'border border-purple-500/30 text-purple-500 hover:bg-purple-500/10'
            }`}
          >
            {adminToggling ? copy.saving : user.is_admin ? copy.toggleAdmin : copy.toggleAdminOn}
          </button>

          {isSelf && (
            <p className="self-center text-xs text-[var(--text-tertiary)]">{copy.cannotToggleSelf}</p>
          )}
        </div>
      </section>
    </div>
  )
}
