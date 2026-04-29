import { NextRequest, NextResponse } from 'next/server'
import { ADMIN_COOKIE_NAME, AUTH_COOKIE_NAME } from './lib/auth-constants'

const PROTECTED_ROUTES = ['/generate', '/instagram', '/seo', '/threads', '/facebook', '/usage']
const ADMIN_ROUTES = ['/admin']

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const hasAuthCookie = request.cookies.get(AUTH_COOKIE_NAME)?.value === '1'
  const hasAdminCookie = request.cookies.get(ADMIN_COOKIE_NAME)?.value === '1'

  // Allow Google OAuth callback through without redirect
  if (pathname === '/login/google/callback') {
    return NextResponse.next()
  }

  // Already logged in — skip the login page
  if (pathname === '/login' && hasAuthCookie) {
    return NextResponse.redirect(new URL('/generate', request.url))
  }

  // Admin routes — must be logged in AND have admin cookie hint
  if (ADMIN_ROUTES.some((route) => pathname === route || pathname.startsWith(route + '/'))) {
    if (!hasAuthCookie) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname + search)
      return NextResponse.redirect(loginUrl)
    }
    if (!hasAdminCookie) {
      return NextResponse.redirect(new URL('/generate', request.url))
    }
    return NextResponse.next()
  }

  // Protected route without auth cookie — redirect to login
  if (PROTECTED_ROUTES.some((route) => pathname === route || pathname.startsWith(route + '/')) && !hasAuthCookie) {
    const loginUrl = new URL('/login', request.url)
    const redirectTarget = pathname + search
    loginUrl.searchParams.set('redirect', redirectTarget)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|api/).*)'],
}
