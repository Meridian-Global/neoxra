import { NextResponse } from 'next/server'
import { middleware } from '../middleware'

jest.mock('next/server', () => ({
  NextResponse: {
    next: jest.fn(),
    redirect: jest.fn(),
  },
}))

const mockRedirect = NextResponse.redirect as jest.Mock
const mockNext = NextResponse.next as jest.Mock

function makeRequest(pathname: string, search = '', cookies: Record<string, string> = {}) {
  return {
    nextUrl: { pathname, search },
    url: `http://localhost${pathname}${search}`,
    cookies: {
      get: (name: string) => (name in cookies ? { value: cookies[name] } : undefined),
    },
  } as any
}

describe('middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('unauthenticated user', () => {
    it('allows access to /login', () => {
      middleware(makeRequest('/login'))
      expect(mockNext).toHaveBeenCalledTimes(1)
      expect(mockRedirect).not.toHaveBeenCalled()
    })

    it.each(['/generate', '/instagram', '/seo', '/threads', '/facebook'])(
      'redirects %s to /login',
      (route) => {
        middleware(makeRequest(route))
        expect(mockRedirect).toHaveBeenCalledTimes(1)
        const redirectUrl: URL = mockRedirect.mock.calls[0][0]
        expect(redirectUrl.pathname).toBe('/login')
      },
    )

    it('sets redirect param to the original pathname', () => {
      middleware(makeRequest('/generate'))
      const redirectUrl: URL = mockRedirect.mock.calls[0][0]
      expect(redirectUrl.searchParams.get('redirect')).toBe('/generate')
    })

    it('preserves query string in the redirect param', () => {
      middleware(makeRequest('/instagram', '?tab=caption'))
      const redirectUrl: URL = mockRedirect.mock.calls[0][0]
      expect(redirectUrl.searchParams.get('redirect')).toBe('/instagram?tab=caption')
    })

    it('redirects sub-paths of protected routes', () => {
      middleware(makeRequest('/instagram/export'))
      expect(mockRedirect).toHaveBeenCalledTimes(1)
      const redirectUrl: URL = mockRedirect.mock.calls[0][0]
      expect(redirectUrl.pathname).toBe('/login')
    })

    it('allows access to non-protected routes', () => {
      middleware(makeRequest('/'))
      expect(mockNext).toHaveBeenCalledTimes(1)
      expect(mockRedirect).not.toHaveBeenCalled()
    })
  })

  describe('authenticated user', () => {
    const authCookies = { 'neoxra-auth': '1' }

    it('redirects /login to /generate', () => {
      middleware(makeRequest('/login', '', authCookies))
      expect(mockRedirect).toHaveBeenCalledTimes(1)
      const redirectUrl: URL = mockRedirect.mock.calls[0][0]
      expect(redirectUrl.pathname).toBe('/generate')
    })

    it.each(['/generate', '/instagram', '/seo', '/threads', '/facebook'])(
      'allows access to protected route %s',
      (route) => {
        middleware(makeRequest(route, '', authCookies))
        expect(mockNext).toHaveBeenCalledTimes(1)
        expect(mockRedirect).not.toHaveBeenCalled()
      },
    )
  })
})
