'use client'

import Link from 'next/link'
import { useAuth } from '../contexts/AuthContext'

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { isAdmin, isLoading, isAuthenticated } = useAuth()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    )
  }

  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <p className="text-lg text-gray-600">Access denied. This page is for administrators only.</p>
        <Link href="/generate" className="text-blue-600 hover:underline">
          Go to Generate
        </Link>
      </div>
    )
  }

  return <>{children}</>
}
