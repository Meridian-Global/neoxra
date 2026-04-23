'use client'

import Link from 'next/link'
import { ArrowRight, CheckCircle2, KeyRound, Mail, ShieldCheck, Sparkles } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { GlobalNav } from '../../components/GlobalNav'
import { useLanguage } from '../../components/LanguageProvider'
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
      openGenerate: '前往 Generate All',
      linkReady: 'Magic link 已建立',
      linkHint: '如果目前環境開啟 debug，你會看到可直接使用的 magic link。',
      verifyError: 'Magic link 無效或已過期。',
      requestError: '無法建立 magic link，請稍後再試。',
      success: '登入成功，正在導向…',
      panelEyebrow: 'Secure access',
      panelTitle: '給早期客戶與受邀 demo 的登入入口',
      panelBody: '用 email 建立一次性 magic link，不需要密碼，也不用額外記憶登入資訊。',
      emailHint: '我們會寄送一封可直接登入的連結。',
      identityCard: 'Session 狀態',
      signedInBody: '目前 session 已可使用受保護頁面與指定 demo。',
      signedOutBody: '尚未建立 session。送出 email 後即可取得登入連結。',
      quickActions: '快速前往',
      trustPoints: ['無密碼登入', '一次性驗證連結', '適合客戶 demo 與內部測試'],
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
    openGenerate: 'Open Generate All',
    linkReady: 'Magic link ready',
    linkHint: 'If debug mode is enabled for this environment, the direct magic link will appear below.',
    verifyError: 'That magic link is invalid or has expired.',
    requestError: 'Could not create a magic link. Please try again.',
    success: 'Signed in successfully. Redirecting…',
    panelEyebrow: 'Secure access',
    panelTitle: 'A focused sign-in flow for invited demos and early customers',
    panelBody: 'Use an email-based magic link instead of a password. It keeps the entry point simple while still gating protected surfaces.',
    emailHint: 'We will issue a one-time sign-in link for this address.',
    identityCard: 'Session status',
    signedInBody: 'This session can already access protected product surfaces and configured demos.',
    signedOutBody: 'No active session yet. Submit an email to request access.',
    quickActions: 'Quick actions',
    trustPoints: ['Passwordless sign-in', 'One-time verification link', 'Built for guided demos and internal testing'],
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
  const pathname = usePathname()
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
        const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname
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

              <form onSubmit={handleSubmit} className="mt-8 grid gap-5">
                <label className="block text-sm font-semibold text-[var(--text-secondary)]">
                  {copy.email}
                  <div className="relative mt-2">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
                    <input
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="h-14 w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] pl-11 pr-4 text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent)]"
                      type="email"
                      placeholder="name@company.com"
                      required
                    />
                  </div>
                  <p className="mt-2 text-xs font-normal leading-5 text-[var(--text-tertiary)]">{copy.emailHint}</p>
                </label>

                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="block text-sm font-semibold text-[var(--text-secondary)]">
                    {copy.fullName}
                    <input
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      className="mt-2 h-14 w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] px-4 text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent)]"
                    />
                  </label>

                  <label className="block text-sm font-semibold text-[var(--text-secondary)]">
                    {copy.organizationKey}
                    <input
                      value={organizationKey}
                      onChange={(event) => setOrganizationKey(event.target.value)}
                      className="mt-2 h-14 w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] px-4 text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent)]"
                    />
                  </label>
                </div>

                {error ? (
                  <div className="rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                    {error}
                  </div>
                ) : null}

                {message ? (
                  <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
                    {message}
                  </div>
                ) : null}

                {magicLink ? (
                  <div className="rounded-2xl border border-[var(--accent-soft)] bg-[var(--bg-sunken)] p-4 text-sm break-all text-[var(--text-secondary)]">
                    <a href={magicLink} className="text-[var(--accent)] underline underline-offset-4">
                      {magicLink}
                    </a>
                  </div>
                ) : null}

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="submit"
                    disabled={isSubmitting || isVerifying}
                    className="inline-flex h-14 items-center justify-center gap-2 rounded-xl bg-[image:var(--gradient-cta)] px-6 text-base font-semibold text-white shadow-[var(--shadow-glow)] transition hover:-translate-y-0.5 hover:bg-[image:var(--gradient-cta-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Sparkles className="h-4 w-4" />
                    {isVerifying ? copy.verifying : isSubmitting ? copy.requesting : copy.requestLink}
                  </button>

                  <Link
                    href="/"
                    className="inline-flex h-14 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-6 text-sm font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-bold)] hover:text-[var(--text-primary)]"
                  >
                    {copy.back}
                  </Link>
                </div>
              </form>
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
