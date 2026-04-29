'use client'

import Link from 'next/link'
import { ArrowRight, CheckCircle2, KeyRound, ShieldCheck } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { Suspense, useMemo, useState } from 'react'
import { GlobalNav } from '../../components/GlobalNav'
import { useLanguage } from '../../components/LanguageProvider'
import { useAuth } from '../../contexts/AuthContext'
import { getGoogleAuthUrl, GOOGLE_AUTH_REDIRECT_KEY } from '../../lib/auth'

function createCopy(language: 'en' | 'zh-TW') {
  if (language === 'zh-TW') {
    return {
      badge: '登入',
      title: '登入 Neoxra',
      body: '使用 Google 帳號開始使用。',
      google: '使用 Google 登入',
      signingIn: '登入中…',
      signedIn: '已登入',
      signedOut: '未登入',
      currentUser: '目前身份',
      logout: '登出',
      back: '返回首頁',
      openInstagram: '前往 Instagram Studio',
      openLegal: '前往法律 demo',
      openGenerate: '前往 Generate All',
      error: '無法開始 Google 登入，請稍後再試。',
      panelEyebrow: 'Secure access',
      panelTitle: '使用 Google 帳號登入',
      panelBody: '點選下方按鈕，透過 Google 帳號安全登入 Neoxra。',
      identityCard: 'Session 狀態',
      signedInBody: '目前 session 已可使用受保護頁面與指定 demo。',
      signedOutBody: '尚未建立 session。使用 Google 登入即可開始。',
      quickActions: '快速前往',
      trustPoints: ['Google 帳號登入', '安全驗證', '適合客戶 demo 與內部測試'],
    }
  }

  return {
    badge: 'Sign in',
    title: 'Sign in to Neoxra',
    body: 'Use your Google account to get started.',
    google: 'Continue with Google',
    signingIn: 'Signing in…',
    signedIn: 'Signed in',
    signedOut: 'Signed out',
    currentUser: 'Current identity',
    logout: 'Log out',
    back: 'Back to landing',
    openInstagram: 'Open Instagram Studio',
    openLegal: 'Open Legal Demo',
    openGenerate: 'Open Generate All',
    error: 'Could not start Google sign-in. Please try again.',
    panelEyebrow: 'Secure access',
    panelTitle: 'Sign in with your Google account',
    panelBody: 'Click below to securely sign in to Neoxra with your Google account.',
    identityCard: 'Session status',
    signedInBody: 'This session can already access protected product surfaces and configured demos.',
    signedOutBody: 'No active session yet. Sign in with Google to get started.',
    quickActions: 'Quick actions',
    trustPoints: ['Google account sign-in', 'Secure authentication', 'Built for guided demos and internal testing'],
  }
}

const GOOGLE_ICON = (
  <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.43 3.45 1.18 4.93l3.66-2.84z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
)

function LoginPageContent() {
  const { language } = useLanguage()
  const copy = useMemo(() => createCopy(language), [language])
  const searchParams = useSearchParams()
  const auth = useAuth()

  const [error, setError] = useState<string | null>(null)
  const [isRedirecting, setIsRedirecting] = useState(false)

  const identity = auth.user

  async function handleGoogleLogin() {
    setError(null)
    setIsRedirecting(true)
    try {
      const redirect = searchParams.get('redirect')
      try {
        if (redirect && redirect.startsWith('/') && !redirect.startsWith('//') && !redirect.includes('://') && !redirect.includes('//')) {
          window.localStorage.setItem(GOOGLE_AUTH_REDIRECT_KEY, redirect)
        } else {
          window.localStorage.removeItem(GOOGLE_AUTH_REDIRECT_KEY)
        }
      } catch {}
      const url = await getGoogleAuthUrl()
      window.location.href = url
    } catch {
      setError(copy.error)
      setIsRedirecting(false)
    }
  }

  async function handleLogout() {
    await auth.logout()
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--bg)] text-[var(--text)]">
      <div className="absolute inset-0 bg-[var(--ambient-glow)] opacity-90" />
      <div className="absolute left-[-8%] top-16 h-72 w-72 rounded-full bg-[var(--accent-glow)] blur-3xl" />
      <div className="absolute right-[-6%] top-28 h-80 w-80 rounded-full bg-[var(--secondary-glow)] blur-3xl" />

      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 pb-20 pt-8 sm:px-6 lg:px-8">
        <GlobalNav />

        <section className="grid gap-8 lg:grid-cols-[minmax(0,1.12fr)_400px] lg:items-start">
          <div className="space-y-6">
            <div className="rounded-full border border-[var(--border)] bg-[var(--bg-elevated)]/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--subtle)] backdrop-blur">
              {copy.badge}
            </div>

            <div className="max-w-3xl">
              <h1 className="text-4xl font-semibold tracking-[-0.06em] text-[var(--text-primary)] sm:text-5xl">
                {copy.title}
              </h1>
              <p className="mt-5 text-lg leading-8 text-[var(--text-secondary)]">
                {copy.body}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {copy.trustPoints.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)]/80 p-4 shadow-[var(--shadow-sm)] backdrop-blur"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[image:var(--gradient-cta)] text-white">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <p className="mt-4 text-sm font-medium leading-6 text-[var(--text-primary)]">{item}</p>
                </div>
              ))}
            </div>

            <div className="rounded-[32px] border border-[var(--border)] bg-[var(--bg-elevated)]/90 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.2)] backdrop-blur sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--subtle)]">
                    {copy.panelEyebrow}
                  </div>
                  <h2 className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-[var(--text-primary)]">
                    {copy.panelTitle}
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
                    {copy.panelBody}
                  </p>
                </div>
                <div className="hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] p-3 text-[var(--accent)] sm:block">
                  <KeyRound className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-8 grid gap-5">
                {error ? (
                  <div className="rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-500">
                    {error}
                  </div>
                ) : null}

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={isRedirecting}
                    className="inline-flex h-14 items-center justify-center gap-3 rounded-xl border border-[var(--border)] bg-white px-6 text-base font-semibold text-gray-800 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {GOOGLE_ICON}
                    {isRedirecting ? copy.signingIn : copy.google}
                  </button>

                  <Link
                    href="/"
                    className="inline-flex h-14 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-6 text-sm font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-bold)] hover:text-[var(--text-primary)]"
                  >
                    {copy.back}
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <aside className="space-y-5">
            <div className="rounded-[32px] border border-[var(--border)] bg-[var(--bg-elevated)]/90 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.18)] backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--subtle)]">{copy.identityCard}</div>
                  <div className="mt-2 text-lg font-semibold text-[var(--text-primary)]">{copy.currentUser}</div>
                </div>
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] p-3 text-[var(--accent)]">
                  {identity ? <CheckCircle2 className="h-5 w-5" /> : <KeyRound className="h-5 w-5" />}
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] p-4">
                <div className="text-sm font-semibold text-[var(--text-primary)]">
                  {identity ? copy.signedIn : copy.signedOut}
                </div>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  {identity ? copy.signedInBody : copy.signedOutBody}
                </p>
              </div>

              {identity ? (
                <div className="mt-5 space-y-3 text-sm text-[var(--text-secondary)]">
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] px-4 py-3">
                    {identity.user.email}
                  </div>
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] px-4 py-3">
                    {identity.organization?.tenant_key || 'personal'}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="rounded-[32px] border border-[var(--border)] bg-[var(--bg-elevated)]/90 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.14)] backdrop-blur">
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--subtle)]">{copy.quickActions}</div>
              <div className="mt-5 grid gap-3">
                <Link
                  href="/generate"
                  className="group inline-flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] px-4 py-4 text-sm font-medium text-[var(--text-primary)] transition hover:border-[var(--accent)]"
                >
                  <span>{copy.openGenerate}</span>
                  <ArrowRight className="h-4 w-4 text-[var(--text-tertiary)] transition group-hover:text-[var(--accent)]" />
                </Link>
                <Link
                  href="/instagram"
                  className="group inline-flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] px-4 py-4 text-sm font-medium text-[var(--text-primary)] transition hover:border-[var(--accent)]"
                >
                  <span>{copy.openInstagram}</span>
                  <ArrowRight className="h-4 w-4 text-[var(--text-tertiary)] transition group-hover:text-[var(--accent)]" />
                </Link>
                <Link
                  href="/demo/legal"
                  className="group inline-flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] px-4 py-4 text-sm font-medium text-[var(--text-primary)] transition hover:border-[var(--accent)]"
                >
                  <span>{copy.openLegal}</span>
                  <ArrowRight className="h-4 w-4 text-[var(--text-tertiary)] transition group-hover:text-[var(--accent)]" />
                </Link>
                {identity ? (
                  <button
                    onClick={handleLogout}
                    className="inline-flex items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-4 text-sm font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-bold)] hover:text-[var(--text-primary)]"
                  >
                    {copy.logout}
                  </button>
                ) : null}
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  )
}
