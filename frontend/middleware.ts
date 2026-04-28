import { NextRequest, NextResponse } from 'next/server'

const PROTECTED_ROUTES = ['/generate', '/instagram', '/seo', '/threads', '/facebook']

const AUTH_COOKIE = 'neoxra-auth'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hasAuthCookie = request.cookies.get(AUTH_COOKIE)?.value === '1'

  // Already logged in — skip the login page
  if (pathname === '/login' && hasAuthCookie) {
    return NextResponse.redirect(new URL('/generate', request.url))
  }

  // Protected route without auth cookie — redirect to login
  if (PROTECTED_ROUTES.some((route) => pathname === route || pathname.startsWith(route + '/')) && !hasAuthCookie) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|api/).*)'],
}
