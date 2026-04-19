'use client'

import { useEffect, useState } from 'react'
import type { DemoSurfaceId } from '../lib/demo-config'
import {
  clearStoredDemoToken,
  consumeDemoTokenFromUrl,
  getStoredDemoToken,
  requestDemoAccess,
} from '../lib/demo-access'

interface DemoAccessCopy {
  eyebrow: string
  title: string
  body: string
  inputLabel: string
  inputPlaceholder: string
  submitLabel: string
  loadingLabel: string
  signedLinkLoaded: string
  invalidCode: string
  clearAccess: string
}

interface DemoAccessGateProps {
  surface: DemoSurfaceId
  copy: DemoAccessCopy
  onAccessReady: (token: string | null) => void
}

export function DemoAccessGate({ surface, copy, onAccessReady }: DemoAccessGateProps) {
  const [accessCode, setAccessCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const tokenFromUrl = consumeDemoTokenFromUrl(surface)
    const stored = tokenFromUrl ?? getStoredDemoToken(surface)
    if (stored) {
      onAccessReady(stored)
    }
  }, [onAccessReady, surface])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!accessCode.trim()) return
    setIsSubmitting(true)
    setError(null)
    try {
      const token = await requestDemoAccess(surface, accessCode)
      onAccessReady(token)
    } catch {
      setError(copy.invalidCode)
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleClear() {
    clearStoredDemoToken(surface)
    setAccessCode('')
    setError(null)
    onAccessReady(null)
  }

  return (
    <section className="mx-auto w-full max-w-xl rounded-[32px] border border-[var(--border)] bg-[var(--panel)] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.16)] sm:p-8">
      <div className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--subtle)]">{copy.eyebrow}</div>
      <h2 className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-[var(--text)]">{copy.title}</h2>
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{copy.body}</p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <label className="block text-sm font-medium text-[var(--text)]">
          {copy.inputLabel}
          <input
            value={accessCode}
            onChange={(event) => setAccessCode(event.target.value)}
            placeholder={copy.inputPlaceholder}
            className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text)] outline-none transition focus:border-[var(--accent)]"
          />
        </label>
        {error ? <div className="text-sm text-[var(--danger)]">{error}</div> : null}
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={isSubmitting || !accessCode.trim()}
            className="inline-flex items-center justify-center rounded-xl bg-[var(--text)] px-5 py-3 text-sm font-semibold text-[var(--bg)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSubmitting ? copy.loadingLabel : copy.submitLabel}
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--panel)] px-5 py-3 text-sm font-medium text-[var(--muted)] transition hover:bg-[var(--surface-2)]"
          >
            {copy.clearAccess}
          </button>
        </div>
      </form>
      <p className="mt-4 text-xs leading-5 text-[var(--subtle)]">{copy.signedLinkLoaded}</p>
    </section>
  )
}
