'use client'

import Script from 'next/script'
import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { getStoredDemoSource } from '../lib/demo-access'
import { getSurfaceForPath, trackBackendAnalyticsEvent } from '../lib/analytics'

const PLAUSIBLE_DOMAIN = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN?.trim()
const PLAUSIBLE_API_HOST = process.env.NEXT_PUBLIC_PLAUSIBLE_API_HOST?.trim() || 'https://plausible.io'

export function AnalyticsProvider() {
  const pathname = usePathname()
  const lastTrackedPath = useRef<string | null>(null)

  useEffect(() => {
    if (!pathname || lastTrackedPath.current === pathname) return
    lastTrackedPath.current = pathname

    let cancelled = false
    const timeoutId = window.setTimeout(() => {
      if (cancelled) return
      const surface = getSurfaceForPath(pathname)
      const source =
        surface === 'legal' || surface === 'instagram' || surface === 'landing'
          ? getStoredDemoSource(surface)
          : 'public'

      void trackBackendAnalyticsEvent({
        eventName: 'page_view',
        route: pathname,
        surface,
        source,
      })
    }, 0)

    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [pathname])

  if (!PLAUSIBLE_DOMAIN) {
    return null
  }

  return (
    <Script
      defer
      data-domain={PLAUSIBLE_DOMAIN}
      src={`${PLAUSIBLE_API_HOST}/js/script.js`}
      strategy="afterInteractive"
    />
  )
}
