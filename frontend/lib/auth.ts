'use client'

import { API_BASE_URL } from './api'

const SESSION_TOKEN_KEY = 'neoxra-session-token'

export interface AuthIdentity {
  user: {
    id: string
    email: string
    full_name?: string | null
  }
  organization: {
    id?: string | null
    tenant_key?: string | null
    name?: string | null
  }
}

export function getSessionToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(SESSION_TOKEN_KEY)
  } catch {
    return null
  }
}

export function setSessionToken(token: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(SESSION_TOKEN_KEY, token)
    document.cookie = 'neoxra-auth=1; path=/; max-age=1209600; SameSite=Lax'
  } catch {}
}

export function clearSessionToken(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(SESSION_TOKEN_KEY)
    document.cookie = 'neoxra-auth=; path=/; max-age=0; SameSite=Lax'
  } catch {}
}

export async function requestMagicLink(input: {
  email: string
  organizationKey?: string
  redirectPath?: string
  fullName?: string
}) {
  const response = await fetch(`${API_BASE_URL}/api/auth/request-link`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: input.email,
      organization_key: input.organizationKey || undefined,
      redirect_path: input.redirectPath || '/instagram',
      full_name: input.fullName || undefined,
    }),
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(typeof payload?.detail === 'string' ? payload.detail : 'Magic link request failed.')
  }
  return payload as {
    status: string
    delivery: string
    email: string
    expires_at: string
    magic_link?: string
    organization?: { tenant_key?: string; name?: string }
  }
}

export async function verifyMagicLink(token: string) {
  const response = await fetch(`${API_BASE_URL}/api/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(typeof payload?.detail === 'string' ? payload.detail : 'Magic link verification failed.')
  }
  if (typeof payload?.session_token === 'string') {
    setSessionToken(payload.session_token)
  }
  return payload as {
    status: string
    session_token: string
    expires_at: string
    redirect_path?: string | null
  } & AuthIdentity
}

export async function fetchCurrentUser() {
  const token = getSessionToken()
  if (!token) return null
  const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
    headers: {
      'X-Neoxra-Session-Token': token,
    },
  })
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      clearSessionToken()
    }
    return null
  }
  return (await response.json()) as {
    authenticated: true
  } & AuthIdentity
}

export async function logout() {
  const token = getSessionToken()
  if (token) {
    await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'X-Neoxra-Session-Token': token,
      },
    }).catch(() => undefined)
  }
  clearSessionToken()
}
