'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useLanguage } from '../../../components/LanguageProvider'
import { fetchUsers, type AdminUser, type PaginatedUsers } from '../../../lib/admin-api'

type Language = 'en' | 'zh-TW'

const COPY: Record<Language, Record<string, string>> = {
  en: {
    title: 'Users',
    searchPlaceholder: 'Search by email or name...',
    email: 'Email',
    name: 'Name',
    plan: 'Plan',
    generations: 'Generations',
    lastLogin: 'Last Login',
    status: 'Status',
    actions: 'Actions',
    active: 'Active',
    inactive: 'Inactive',
    view: 'View',
    page: 'Page',
    of: 'of',
    prev: 'Previous',
    next: 'Next',
    noUsers: 'No users found.',
    error: 'Failed to load users. Please try again.',
    retry: 'Retry',
    createdAt: 'Created',
    never: 'Never',
  },
  'zh-TW': {
    title: '使用者',
    searchPlaceholder: '搜尋電子郵件或姓名...',
    email: '電子郵件',
    name: '姓名',
    plan: '方案',
    generations: '生成次數',
    lastLogin: '最後登入',
    status: '狀態',
    actions: '操作',
    active: '啟用',
    inactive: '停用',
    view: '查看',
    page: '第',
    of: '/',
    prev: '上一頁',
    next: '下一頁',
    noUsers: '找不到使用者。',
    error: '無法載入使用者資料，請重試。',
    retry: '重試',
    createdAt: '建立時間',
    never: '從未',
  },
}

type SortField = 'email' | 'last_login_at' | 'created_at'
type SortOrder = 'asc' | 'desc'

const PER_PAGE = 20

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-10 w-full max-w-sm rounded-lg bg-[var(--bg-sunken)]" />
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] overflow-hidden">
        <div className="h-10 bg-[var(--bg-sunken)]" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex gap-4 border-t border-[var(--border)] px-4 py-3">
            <div className="h-4 flex-1 rounded bg-[var(--bg-sunken)]" />
            <div className="h-4 w-24 rounded bg-[var(--bg-sunken)]" />
            <div className="h-4 w-16 rounded bg-[var(--bg-sunken)]" />
            <div className="h-4 w-20 rounded bg-[var(--bg-sunken)]" />
          </div>
        ))}
      </div>
    </div>
  )
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

function SortIcon({ field, currentSort, currentOrder }: { field: SortField; currentSort: SortField; currentOrder: SortOrder }) {
  if (field !== currentSort) {
    return <span className="ml-1 text-[var(--text-tertiary)]">&#8597;</span>
  }
  return <span className="ml-1">{currentOrder === 'asc' ? '&#9650;' : '&#9660;'}</span>
}

export default function AdminUsersPage() {
  const { language } = useLanguage()
  const copy = COPY[language]

  const [data, setData] = useState<PaginatedUsers | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [sortField, setSortField] = useState<SortField>('last_login_at')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(value)
      setPage(1)
    }, 300)
  }, [])

  const loadUsers = useCallback(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fetchUsers({
      page,
      per_page: PER_PAGE,
      search: debouncedSearch || undefined,
      sort: sortField,
      order: sortOrder,
    })
      .then((result) => {
        if (!cancelled) setData(result)
      })
      .catch(() => {
        if (!cancelled) setError(copy.error)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [page, debouncedSearch, sortField, sortOrder, copy.error])

  useEffect(() => {
    return loadUsers()
  }, [loadUsers])

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
    setPage(1)
  }

  const totalPages = data ? Math.max(Math.ceil(data.total / PER_PAGE), 1) : 1

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-[var(--text-primary)]">{copy.title}</h1>

      {/* Search */}
      <div className="max-w-sm">
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder={copy.searchPlaceholder}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none transition focus:border-[var(--accent)]"
        />
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : error ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6">
          <p className="text-sm text-[var(--text-secondary)]">{error}</p>
          <button
            onClick={loadUsers}
            className="mt-3 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
            {copy.retry}
          </button>
        </div>
      ) : !data || data.users.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6 text-sm text-[var(--text-secondary)]">
          {copy.noUsers}
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] shadow-[var(--shadow-sm)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--bg-sunken)]">
                  <th
                    className="cursor-pointer px-4 py-3 text-left font-semibold text-[var(--text-secondary)] select-none"
                    onClick={() => handleSort('email')}
                  >
                    {copy.email}
                    <SortIcon field="email" currentSort={sortField} currentOrder={sortOrder} />
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-[var(--text-secondary)]">
                    {copy.name}
                  </th>
                  <th
                    className="cursor-pointer px-4 py-3 text-left font-semibold text-[var(--text-secondary)] select-none"
                    onClick={() => handleSort('last_login_at')}
                  >
                    {copy.lastLogin}
                    <SortIcon field="last_login_at" currentSort={sortField} currentOrder={sortOrder} />
                  </th>
                  <th
                    className="cursor-pointer px-4 py-3 text-left font-semibold text-[var(--text-secondary)] select-none"
                    onClick={() => handleSort('created_at')}
                  >
                    {copy.createdAt}
                    <SortIcon field="created_at" currentSort={sortField} currentOrder={sortOrder} />
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-[var(--text-secondary)]">
                    {copy.status}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-[var(--text-secondary)]">
                    {copy.actions}
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.users.map((user: AdminUser, idx: number) => (
                  <tr
                    key={user.id}
                    className={`border-t border-[var(--border)] transition hover:bg-[var(--bg-sunken)] ${
                      idx % 2 === 1 ? 'bg-[var(--bg-sunken)]/30' : ''
                    }`}
                  >
                    <td className="px-4 py-3 text-[var(--text-primary)]">
                      <div className="flex items-center gap-2">
                        {user.email}
                        {user.is_admin && (
                          <span className="rounded bg-purple-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-purple-500">
                            Admin
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">
                      {user.full_name || '—'}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">
                      {formatDate(user.last_login_at, language, copy.never)}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">
                      {formatDate(user.created_at, language, '—')}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className={`inline-block h-2 w-2 rounded-full ${
                            user.is_active ? 'bg-emerald-500' : 'bg-red-500'
                          }`}
                        />
                        <span className={`text-xs font-medium ${user.is_active ? 'text-emerald-600' : 'text-red-500'}`}>
                          {user.is_active ? copy.active : copy.inactive}
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/users/${user.id}`}
                        className="text-sm font-medium text-[var(--accent)] hover:underline"
                      >
                        {copy.view}
                      </Link>
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
