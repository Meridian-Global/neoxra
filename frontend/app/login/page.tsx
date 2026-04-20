'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { LanguageToggle } from '../../components/LanguageToggle'
import { useLanguage } from '../../components/LanguageProvider'
import { ThemeToggle } from '../../components/landing/ThemeToggle'
import { fetchCurrentUser, logout, requestMagicLink, verifyMagicLink } from '../../lib/auth'

function createCopy(language: 'en' | 'zh-TW') {
  if (language === 'zh-TW') {
    return {
      badge: '早期客戶登入',
      title: '用 email magic link 進入 Neoxra。',
      body: '這是給早期客戶與客製 demo 使用的最小登入入口。輸入 email 後，我們會建立一個 magic link session。',
      email: 'Email',
      fullName: '姓名（選填）',
      organizationKey: '組織代碼（選填）',
      requestLink: '寄送 magic link',
      requesting: '建立中…',
      verifying: '驗證中…',
      signedIn: '已登入',
      signedOut: '未登入',
      currentUser: '目前身份',
      logout: '登出',
      back: '返回首頁',
      openInstagram: '前往 Instagram Studio',
      openLegal: '前往法律 demo',
      linkReady: 'Magic link 已建立',
      linkHint: '如果目前環境開啟 debug，你會看到可直接使用的 magic link。',
      verifyError: 'Magic link 無效或已過期。',
      requestError: '無法建立 magic link，請稍後再試。',
      success: '登入成功，正在導向…',
    }
  }

  return {
    badge: 'Early customer login',
    title: 'Sign in to Neoxra with a magic link.',
    body: 'This is the smallest practical login path for early customers and client-specific demos. Enter an email and Neoxra will issue a magic link session.',
    email: 'Email',
    fullName: 'Full name (optional)',
    organizationKey: 'Organization key (optional)',
    requestLink: 'Send magic link',
    requesting: 'Creating…',
    verifying: 'Verifying…',
    signedIn: 'Signed in',
    signedOut: 'Signed out',
    currentUser: 'Current identity',
    logout: 'Log out',
    back: 'Back to landing',
    openInstagram: 'Open Instagram Studio',
    openLegal: 'Open Legal Demo',
    linkReady: 'Magic link ready',
    linkHint: 'If debug mode is enabled for this environment, the direct magic link will appear below.',
    verifyError: 'That magic link is invalid or has expired.',
    requestError: 'Could not create a magic link. Please try again.',
    success: 'Signed in successfully. Redirecting…',
  }
}

function isSafeRedirectPath(path: string): boolean {
  return (
    typeof path === 'string' &&
    path.startsWith('/') &&
    !path.startsWith('//') &&
    !path.includes('://')
  )
}

function LoginPageContent() {
  const { language } = useLanguage()
  const copy = useMemo(() => createCopy(language), [language])
  const router = useRouter()
  const searchParams = useSearchParams()

  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [organizationKey, setOrganizationKey] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [magicLink, setMagicLink] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [identity, setIdentity] = useState<Awaited<ReturnType<typeof fetchCurrentUser>>>(null)
  const hasVerified = useRef(false)

  useEffect(() => {
    void fetchCurrentUser().then(setIdentity)
  }, [])

  useEffect(() => {
    const token = searchParams.get('token')
    if (!token || hasVerified.current) return
    hasVerified.current = true
    setIsVerifying(true)
    setError(null)
    void verifyMagicLink(token)
      .then(async (result) => {
        const me = await fetchCurrentUser()
        setIdentity(me)
        setMessage(copy.success)
        // Remove the token from the URL so refreshes / language switches don't re-trigger
        const params = new URLSearchParams(searchParams.toString())
        params.delete('token')
        const nextUrl = params.toString() ? `?${params.toString()}` : '/login'
        router.replace(nextUrl)
        const rawRedirect = result.redirect_path || searchParams.get('redirect') || '/instagram'
        const redirectPath = isSafeRedirectPath(rawRedirect) ? rawRedirect : '/instagram'
        window.setTimeout(() => router.push(redirectPath), 800)
      })
      .catch(() => {
        setError(copy.verifyError)
      })
      .finally(() => {
        setIsVerifying(false)
      })
  }, [searchParams, router, copy.success, copy.verifyError])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setError(null)
    setMessage(null)
    setMagicLink(null)
    try {
      const payload = await requestMagicLink({
        email,
        fullName,
        organizationKey,
        redirectPath: '/instagram',
      })
      setMessage(`${copy.linkReady}. ${copy.linkHint}`)
      setMagicLink(payload.magic_link ?? null)
    } catch {
      setError(copy.requestError)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleLogout() {
    await logout()
    setIdentity(null)
    setMessage(null)
    setMagicLink(null)
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--bg)] text-[var(--text)]">
      <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-10 px-5 pb-20 pt-8 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 text-sm text-[var(--muted)]">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--panel)] px-3 py-1.5">
            <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
            {copy.badge}
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="rounded-full border border-[var(--border)] bg-[var(--panel)] px-3 py-1.5">
              {copy.back}
            </Link>
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>

        <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-[32px] border border-[var(--border)] bg-[var(--panel)] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.18)] sm:p-8">
            <h1 className="text-4xl font-semibold tracking-[-0.06em]">{copy.title}</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--muted)]">{copy.body}</p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <label className="block text-sm text-[var(--muted)]">
                {copy.email}
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[var(--text)]"
                  type="email"
                  required
                />
              </label>
              <label className="block text-sm text-[var(--muted)]">
                {copy.fullName}
                <input
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[var(--text)]"
                />
              </label>
              <label className="block text-sm text-[var(--muted)]">
                {copy.organizationKey}
                <input
                  value={organizationKey}
                  onChange={(event) => setOrganizationKey(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[var(--text)]"
                />
              </label>

              {error ? <div className="text-sm text-[var(--danger)]">{error}</div> : null}
              {message ? <div className="text-sm text-[var(--muted)]">{message}</div> : null}
              {magicLink ? (
                <div className="rounded-2xl border border-[var(--accent-soft)] bg-[var(--surface)] p-4 text-sm break-all">
                  <a href={magicLink} className="text-[var(--accent)] underline underline-offset-4">
                    {magicLink}
                  </a>
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting || isVerifying}
                className="inline-flex items-center justify-center rounded-xl bg-[var(--text)] px-5 py-3 text-sm font-semibold text-[var(--bg)] transition hover:opacity-90 disabled:opacity-50"
              >
                {isVerifying ? copy.verifying : isSubmitting ? copy.requesting : copy.requestLink}
              </button>
            </form>
          </div>

          <aside className="rounded-[32px] border border-[var(--border)] bg-[var(--panel)] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.16)]">
            <div className="text-xs uppercase tracking-[0.22em] text-[var(--subtle)]">{copy.currentUser}</div>
            <div className="mt-3 text-sm text-[var(--muted)]">
              {identity ? copy.signedIn : copy.signedOut}
            </div>
            {identity ? (
              <div className="mt-4 space-y-2 text-sm text-[var(--muted)]">
                <div>{identity.user.email}</div>
                <div>{identity.organization?.tenant_key || 'personal'}</div>
                <div className="flex flex-wrap gap-3 pt-2">
                  <Link href="/instagram" className="rounded-xl border border-[var(--border)] px-4 py-2">
                    {copy.openInstagram}
                  </Link>
                  <Link href="/demo/legal" className="rounded-xl border border-[var(--border)] px-4 py-2">
                    {copy.openLegal}
                  </Link>
                  <button onClick={handleLogout} className="rounded-xl border border-[var(--border)] px-4 py-2">
                    {copy.logout}
                  </button>
                </div>
              </div>
            ) : null}
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
