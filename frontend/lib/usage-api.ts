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
  return response.json()
}

export async function fetchUsageHistory(days: number = 30): Promise<UsageHistoryEntry[]> {
  const response = await fetch(`${API_BASE_URL}/api/usage/history?days=${days}`, {
    headers: authHeaders(),
  })
  if (!response.ok) throw new Error('Failed to fetch usage history')
  return response.json()
}

export async function fetchUsageBreakdown(days: number = 30): Promise<UsageBreakdownEntry[]> {
  const response = await fetch(`${API_BASE_URL}/api/usage/breakdown?days=${days}`, {
    headers: authHeaders(),
  })
  if (!response.ok) throw new Error('Failed to fetch usage breakdown')
  return response.json()
}
