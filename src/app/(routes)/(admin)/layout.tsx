'use client'
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Toaster } from 'sonner'
import { HiOutlineLogout } from 'react-icons/hi'
import AdminSidebar from '@/component/layout/AdminSidebar'
import { useAuth } from '@/context/AuthContext'
import ConfirmModal from '@/component/ui/ConfirmModal'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth()
  const router = useRouter()
  const [confirmLogout, setConfirmLogout] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    if (!loading && (!user || user.role !== 'ADMIN')) {
      router.replace('/login')
    }
  }, [loading, user, router])

  const handleSignOut = async () => {
    setSigningOut(true)
    try { await logout() } finally {
      setSigningOut(false)
      setConfirmLogout(false)
    }
  }

  if (loading || !user || user.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-foreground-inverse flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background-secondary">
      <AdminSidebar />
      <div className="lg:ml-64">
        <header className="sticky top-0 z-30 bg-foreground-inverse/80 backdrop-blur-md border-b border-border px-5 vsm:px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="lg:hidden w-10" />
            <div className="hidden lg:block">
              <p className="text-foreground-tertiary text-xs">Admin Console</p>
              <p className="text-foreground font-semibold text-sm">{user.firstName} {user.lastName}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#0B1B3A] flex items-center justify-center text-foreground-inverse font-semibold text-xs">
                {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
              </div>
              <button
                onClick={() => setConfirmLogout(true)}
                className="hidden vsm:flex items-center gap-1.5 text-foreground-secondary hover:text-danger text-xs font-medium px-2 py-1.5 rounded-md hover:bg-danger-bg transition-colors"
              >
                <HiOutlineLogout size={16} />
                Logout
              </button>
            </div>
          </div>
        </header>
        <main className="px-5 vsm:px-8 py-6 vsm:py-8">
          {children}
        </main>
      </div>
      <Toaster position="top-right" richColors />
      <ConfirmModal
        open={confirmLogout}
        title="Sign out?"
        message="You'll be returned to the login page."
        confirmLabel="Sign Out"
        variant="danger"
        loading={signingOut}
        onConfirm={handleSignOut}
        onCancel={() => setConfirmLogout(false)}
      />
    </div>
  )
}
