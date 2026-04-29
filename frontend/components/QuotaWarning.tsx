'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useLanguage } from './LanguageProvider'
import { useAuth } from '../contexts/AuthContext'
import { fetchQuota, type QuotaResponse } from '../lib/usage-api'

type Language = 'en' | 'zh-TW'

const COPY: Record<Language, {
  warning: (used: number, limit: number) => string
  viewUsage: string
  limitReached: string
  upgrade: string
}> = {
  en: {
    warning: (used, limit) => `You've used ${used} of ${limit} generations this month.`,
    viewUsage: 'View usage',
    limitReached: 'You\'ve reached your monthly limit. Upgrade your plan to continue generating.',
    upgrade: 'Upgrade',
  },
  'zh-TW': {
    warning: (used, limit) => `本月已使用 ${used} / ${limit} 次生成。`,
    viewUsage: '查看用量',
    limitReached: '已達本月上限，請升級方案以繼續生成。',
    upgrade: '升級',
  },
}

let cachedQuota: { data: QuotaResponse; timestamp: number } | null = null
const CACHE_TTL = 5 * 60 * 1000

async function getCachedQuota(): Promise<QuotaResponse | null> {
  if (cachedQuota && Date.now() - cachedQuota.timestamp < CACHE_TTL) {
    return cachedQuota.data
  }
  try {
    const data = await fetchQuota()
    cachedQuota = { data, timestamp: Date.now() }
    return data
  } catch {
    return null
  }
}

export function QuotaWarning() {
  const { language } = useLanguage()
  const { isAuthenticated, isLoading } = useAuth()
  const copy = COPY[language]
  const [quota, setQuota] = useState<QuotaResponse | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (isLoading || !isAuthenticated) return
    let cancelled = false
    getCachedQuota().then((q) => {
      if (!cancelled) setQuota(q)
    })
    return () => { cancelled = true }
  }, [isLoading, isAuthenticated])

  if (!quota || dismissed) return null

  const { generations_used: used, generations_limit: limit } = quota
  if (limit === 0) return null
  const pct = used / limit

  if (pct < 0.8) return null

  const atLimit = pct >= 1

  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-[10px] px-4 py-2.5 text-sm ${
        atLimit
          ? 'border border-red-500/30 bg-red-500/10 text-red-400'
          : 'border border-yellow-500/30 bg-yellow-500/10 text-yellow-400'
      }`}
    >
      <span>
        {atLimit ? copy.limitReached : (
          <>
            {copy.warning(used, limit)}{' '}
            <Link href="/usage" className="underline underline-offset-2 hover:no-underline">
              {copy.viewUsage} →
            </Link>
          </>
        )}
        {atLimit && (
          <>
            {' '}
            <Link href="/usage" className="underline underline-offset-2 hover:no-underline">
              {copy.upgrade} →
            </Link>
          </>
        )}
      </span>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="shrink-0 text-current opacity-60 hover:opacity-100"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  )
}

/**
 * Modal shown when a generation request fails with PLAN_QUOTA_EXCEEDED (429).
 */
export function QuotaExceededModal({ onClose }: { onClose: () => void }) {
  const { language } = useLanguage()

  const copy = language === 'zh-TW'
    ? { title: '已達月度上限', body: '你的方案本月生成次數已用完。升級方案即可繼續使用。', viewUsage: '查看用量', close: '關閉' }
    : { title: 'Monthly limit reached', body: 'You\'ve used all your generations for this month. Upgrade your plan to continue.', viewUsage: 'View usage', close: 'Close' }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-[20px] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-[var(--shadow-lg)]">
        <h2 className="text-lg font-bold text-[var(--text-primary)]">{copy.title}</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{copy.body}</p>
        <div className="mt-5 flex gap-3">
          <Link
            href="/usage"
            className="inline-flex h-10 flex-1 items-center justify-center rounded-[8px] bg-[image:var(--gradient-cta)] text-sm font-semibold text-white transition hover:-translate-y-0.5"
          >
            {copy.viewUsage}
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 flex-1 items-center justify-center rounded-[8px] border border-[var(--border)] text-sm font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
          >
            {copy.close}
          </button>
        </div>
      </div>
    </div>
  )
}

/** Check if an error is a quota-exceeded 429 */
export function isQuotaExceededError(error: unknown): boolean {
  if (error && typeof error === 'object' && 'status' in error) {
    return (error as { status: number }).status === 429
  }
  return false
}
