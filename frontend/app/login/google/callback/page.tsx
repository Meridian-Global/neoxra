'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useRef, useState } from 'react'
import { useAuth } from '../../../../contexts/AuthContext'
import { handleGoogleCallback, GOOGLE_AUTH_REDIRECT_KEY } from '../../../../lib/auth'

function isSafeRedirectPath(path: string): boolean {
  return (
    typeof path === 'string' &&
    path.startsWith('/') &&
    !path.startsWith('//') &&
    !path.includes('://') &&
    !path.includes('//')
  )
}

function GoogleCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const auth = useAuth()
  const handled = useRef(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (handled.current) return
    handled.current = true

    const code = searchParams.get('code')
    const state = searchParams.get('state')

    if (!code || !state) {
      setError('Missing authorization parameters.')
      window.setTimeout(() => router.push('/login'), 2000)
      return
    }

    void handleGoogleCallback(code, state)
      .then(async (result) => {
        await auth.login(result.session_token)
        let rawRedirect = '/generate'
        try {
          rawRedirect = window.localStorage.getItem(GOOGLE_AUTH_REDIRECT_KEY) || '/generate'
          window.localStorage.removeItem(GOOGLE_AUTH_REDIRECT_KEY)
        } catch {}
        const redirectPath = isSafeRedirectPath(rawRedirect) ? rawRedirect : '/generate'
        router.push(redirectPath)
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        setError(`Sign-in failed: ${msg}`)
        window.setTimeout(() => router.push('/login'), 3000)
      })
  }, [searchParams, router, auth])

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] text-[var(--text)]">
      <div className="text-center">
        {error ? (
          <p className="text-sm text-rose-500">{error}</p>
        ) : (
          <p className="text-sm text-[var(--text-secondary)]">Signing you in...</p>
        )}
      </div>
    </div>
  )
}

export default function GoogleCallbackPage() {
  return (
    <Suspense fallback={null}>
      <GoogleCallbackContent />
    </Suspense>
  )
}
