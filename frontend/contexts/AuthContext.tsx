'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { AuthIdentity } from '../lib/auth'
import {
  clearSessionToken,
  fetchCurrentUser,
  getSessionToken,
  logout as authLogout,
  setSessionToken,
} from '../lib/auth'

interface AuthContextValue {
  user: AuthIdentity | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (token: string) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthIdentity | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = getSessionToken()
    if (!token) {
      setIsLoading(false)
      return
    }
    fetchCurrentUser()
      .then((result) => {
        setUser(result ?? null)
      })
      .catch(() => {
        clearSessionToken()
        setUser(null)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [])

  const login = useCallback(async (token: string) => {
    setSessionToken(token)
    const result = await fetchCurrentUser()
    setUser(result ?? null)
  }, [])

  const logout = useCallback(async () => {
    await authLogout()
    setUser(null)
  }, [])

  const refresh = useCallback(async () => {
    const result = await fetchCurrentUser()
    setUser(result ?? null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: user !== null,
      login,
      logout,
      refresh,
    }),
    [user, isLoading, login, logout, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
