'use client'
import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Toaster } from 'sonner'
import StaffSidebar from '@/component/layout/StaffSidebar'
import NotificationBell from '@/component/guest/NotificationBell'
import { useAuth } from '@/context/AuthContext'

const STAFF_ROLES = ['STAFF', 'MANAGER', 'ADMIN']

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && (!user || !STAFF_ROLES.includes(user.role))) {
      router.replace('/login')
    }
  }, [loading, user, router])

  if (loading || !user || !STAFF_ROLES.includes(user.role)) {
    return (
      <div className="min-h-screen bg-foreground-inverse flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background-secondary">
      <StaffSidebar />
      <div className="lg:ml-64">
        <header className="sticky top-0 z-30 bg-foreground-inverse/80 backdrop-blur-md border-b border-border px-5 vsm:px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="lg:hidden w-10" />
            <div className="hidden lg:block">
              <p className="text-foreground-tertiary text-xs">Staff Portal</p>
              <p className="text-foreground font-semibold text-sm">{user.firstName} {user.lastName}</p>
            </div>
            <div className="flex items-center gap-3">
              <NotificationBell />
              <div className="w-8 h-8 rounded-full bg-foreground-disabled/15 flex items-center justify-center text-foreground font-semibold text-xs">
                {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
              </div>
            </div>
          </div>
        </header>
        <main className="px-5 vsm:px-8 py-6 vsm:py-8">
          {children}
        </main>
      </div>
      <Toaster position="top-right" richColors />
    </div>
  )
}
