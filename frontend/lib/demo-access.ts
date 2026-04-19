import { API_BASE_URL } from './api'
import type { DemoSurfaceId } from './demo-config'

const STORAGE_PREFIX = 'neoxra-demo-token'

function storageKey(surface: DemoSurfaceId): string {
  return `${STORAGE_PREFIX}:${surface}`
}

export function getStoredDemoToken(surface: DemoSurfaceId): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(storageKey(surface))
  } catch {
    return null
  }
}

export function setStoredDemoToken(surface: DemoSurfaceId, token: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(storageKey(surface), token)
  } catch {}
}

export function clearStoredDemoToken(surface: DemoSurfaceId): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(storageKey(surface))
  } catch {}
}

export function consumeDemoTokenFromUrl(surface: DemoSurfaceId): string | null {
  if (typeof window === 'undefined') return null
  const url = new URL(window.location.href)
  const token = url.searchParams.get('demo_token')?.trim()
  if (!token) return null

  setStoredDemoToken(surface, token)
  url.searchParams.delete('demo_token')
  window.history.replaceState({}, '', url.toString())
  return token
}

export async function requestDemoAccess(surface: DemoSurfaceId, accessCode: string): Promise<string> {
  const res = await fetch(`${API_BASE_URL}/api/demo/access`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      surface,
      access_code: accessCode,
    }),
  })

  const payload = await res.json().catch(() => ({}))
  if (!res.ok) {
    const detail =
      typeof payload?.detail === 'string' ? payload.detail : 'Demo access could not be granted.'
    throw new Error(detail)
  }

  const token = typeof payload?.demo_token === 'string' ? payload.demo_token : ''
  if (!token) {
    throw new Error('Demo access response did not include a token.')
  }
  setStoredDemoToken(surface, token)
  return token
}

export function buildDemoHeaders(surface: DemoSurfaceId, token?: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'X-Neoxra-Demo-Surface': surface,
  }
  if (token) {
    headers['X-Neoxra-Demo-Token'] = token
  }
  return headers
}
