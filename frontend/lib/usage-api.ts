import { API_BASE_URL } from './api'
import { getSessionToken } from './auth'

function authHeaders(): Record<string, string> {
  const token = getSessionToken()
  if (!token) return {}
  return { 'X-Neoxra-Session-Token': token }
}

export interface QuotaResponse {
  plan_name: string
  plan_status: string
  generations_used: number
  generations_limit: number
  period_start: string
  period_end: string
}

export interface UsageHistoryEntry {
  date: string
  count: number
}

export interface UsageBreakdownEntry {
  platform: string
  count: number
}

export async function fetchQuota(): Promise<QuotaResponse> {
  const response = await fetch(`${API_BASE_URL}/api/usage/quota`, {
    headers: authHeaders(),
  })
  if (!response.ok) throw new Error('Failed to fetch quota')
  const data = await response.json()
  // Backend returns { plan: { name, generations_per_month }, usage: { generations_used, generations_remaining }, period: { start, end }, subscription: { status } }
  return {
    plan_name: data.plan?.name ?? data.plan?.slug ?? 'Free',
    plan_status: data.subscription?.status ?? 'none',
    generations_used: data.usage?.generations_used ?? 0,
    generations_limit: data.plan?.generations_per_month ?? 0,
    period_start: data.period?.start ?? '',
    period_end: data.period?.end ?? '',
  }
}

export async function fetchUsageHistory(days: number = 30): Promise<UsageHistoryEntry[]> {
  const response = await fetch(`${API_BASE_URL}/api/usage/history?days=${days}`, {
    headers: authHeaders(),
  })
  if (!response.ok) throw new Error('Failed to fetch usage history')
  const data = await response.json()
  // Backend returns { daily: [{ date, count }], total }
  return Array.isArray(data) ? data : (data.daily ?? [])
}

export async function fetchUsageBreakdown(days: number = 30): Promise<UsageBreakdownEntry[]> {
  const response = await fetch(`${API_BASE_URL}/api/usage/breakdown?days=${days}`, {
    headers: authHeaders(),
  })
  if (!response.ok) throw new Error('Failed to fetch usage breakdown')
  const data = await response.json()
  // Backend returns { by_platform: { instagram: 5, seo: 3 }, total }
  if (Array.isArray(data)) return data
  const byPlatform: Record<string, number> = data.by_platform ?? {}
  return Object.entries(byPlatform).map(([platform, count]) => ({ platform, count }))
}
