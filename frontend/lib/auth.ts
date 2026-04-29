'use client'

import { API_BASE_URL } from './api'
import { ADMIN_COOKIE_NAME, AUTH_COOKIE_MAX_AGE, AUTH_COOKIE_NAME } from './auth-constants'

const SESSION_TOKEN_KEY = 'neoxra-session-token'

export const GOOGLE_AUTH_REDIRECT_KEY = 'neoxra-google-auth-redirect'

export interface AuthIdentity {
  user: {
    id: string
    email: string
    full_name?: string | null
    is_admin?: boolean
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
    const secure = window.location.protocol === 'https:' ? '; Secure' : ''
    document.cookie = `${AUTH_COOKIE_NAME}=1; path=/; max-age=${AUTH_COOKIE_MAX_AGE}; SameSite=Lax${secure}`
  } catch {}
}

export function clearSessionToken(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(SESSION_TOKEN_KEY)
    document.cookie = `${AUTH_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`
    document.cookie = `${ADMIN_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`
  } catch {}
}

export function setAdminCookie(isAdmin: boolean): void {
  if (typeof window === 'undefined') return
  try {
    if (isAdmin) {
      const secure = window.location.protocol === 'https:' ? '; Secure' : ''
      document.cookie = `${ADMIN_COOKIE_NAME}=1; path=/; max-age=${AUTH_COOKIE_MAX_AGE}; SameSite=Lax${secure}`
    } else {
      document.cookie = `${ADMIN_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`
    }
  } catch {}
}

export async function getGoogleAuthUrl(): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/api/auth/google/url`)
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(typeof payload?.detail === 'string' ? payload.detail : 'Failed to get Google auth URL.')
  }
  if (typeof payload.url !== 'string' || payload.url.length === 0) {
    throw new Error('Failed to get Google auth URL.')
  }
  return payload.url
}

export async function handleGoogleCallback(code: string, state: string): Promise<{ session_token: string }> {
  const response = await fetch(`${API_BASE_URL}/api/auth/google/callback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, state }),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(typeof payload?.detail === 'string' ? payload.detail : 'Google sign-in failed.')
  }
  return payload as { session_token: string }
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
