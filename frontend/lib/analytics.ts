'use client'

import { API_BASE_URL } from './api'
import type { DemoSurfaceId } from './demo-config'

declare global {
  interface Window {
    plausible?: (eventName: string, options?: { props?: Record<string, unknown> }) => void
  }
}

const VISITOR_STORAGE_KEY = 'neoxra-visitor-id'
const SESSION_STORAGE_KEY = 'neoxra-session-id'

function randomId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export function getVisitorId(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const existing = window.localStorage.getItem(VISITOR_STORAGE_KEY)
    if (existing) return existing
    const next = randomId()
    window.localStorage.setItem(VISITOR_STORAGE_KEY, next)
    return next
  } catch {
    return null
  }
}

export function getSessionId(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const existing = window.sessionStorage.getItem(SESSION_STORAGE_KEY)
    if (existing) return existing
    const next = randomId()
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, next)
    return next
  } catch {
    return null
  }
}

export function buildAnalyticsHeaders(source?: string | null): Record<string, string> {
  const headers: Record<string, string> = {}
  const visitorId = getVisitorId()
  const sessionId = getSessionId()
  if (visitorId) headers['X-Neoxra-Visitor-ID'] = visitorId
  if (sessionId) headers['X-Neoxra-Session-ID'] = sessionId
  if (source) headers['X-Neoxra-Demo-Source'] = source
  return headers
}

export function trackPlausibleEvent(eventName: string, props?: Record<string, unknown>) {
  if (typeof window === 'undefined') return
  window.plausible?.(eventName, props ? { props } : undefined)
}

type AnalyticsEventName =
  | 'page_view'
  | 'demo_viewed'
  | 'demo_started'
  | 'demo_completed'
  | 'demo_failed'
  | 'demo_abandoned'
  | 'demo_access_unlocked'

interface BackendAnalyticsEvent {
  eventName: AnalyticsEventName
  route: string
  surface?: DemoSurfaceId | 'public'
  source?: string | null
  locale?: string
  metadata?: Record<string, unknown>
}

export async function trackBackendAnalyticsEvent(event: BackendAnalyticsEvent): Promise<void> {
  await fetch(`${API_BASE_URL}/api/analytics/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...buildAnalyticsHeaders(event.source),
    },
    body: JSON.stringify({
      event_name: event.eventName,
      route: event.route,
      pipeline: 'frontend',
      surface: event.surface,
      source: event.source,
      locale: event.locale,
      metadata: event.metadata ?? {},
    }),
    keepalive: true,
  }).catch(() => undefined)
}

export function sendBeaconAnalyticsEvent(event: BackendAnalyticsEvent): void {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return
  const headers = buildAnalyticsHeaders(event.source)
  const payload = JSON.stringify({
    event_name: event.eventName,
    route: event.route,
    pipeline: 'frontend',
    surface: event.surface,
    source: event.source,
    locale: event.locale,
    metadata: {
      ...(event.metadata ?? {}),
      visitor_id: headers['X-Neoxra-Visitor-ID'],
      session_id: headers['X-Neoxra-Session-ID'],
    },
  })
  navigator.sendBeacon(`${API_BASE_URL}/api/analytics/events`, new Blob([payload], { type: 'application/json' }))
}

export function getSurfaceForPath(pathname: string): DemoSurfaceId | 'public' {
  if (pathname === '/') return 'landing'
  if (pathname === '/instagram') return 'instagram'
  if (pathname === '/demo/legal') return 'legal'
  return 'public'
}
