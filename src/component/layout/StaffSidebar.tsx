'use client'
import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import logo from '@/assets/logo.png'
import { useAuth } from '@/context/AuthContext'
import ConfirmModal from '@/component/ui/ConfirmModal'
import {
  HiOutlineViewGrid,
  HiOutlineHome,
  HiOutlineUserGroup,
  HiOutlineClipboardList,
  HiOutlineLogout,
  HiOutlineMenu,
  HiOutlineX,
} from 'react-icons/hi'

const navItems = [
  { href: '/staff/dashboard', label: 'Dashboard', icon: HiOutlineHome },
  { href: '/staff/room-board', label: 'Room Board', icon: HiOutlineViewGrid },
  { href: '/staff/guests', label: 'Guest Lookup', icon: HiOutlineUserGroup },
  { href: '/staff/orders', label: 'Order Queue', icon: HiOutlineClipboardList },
]

const StaffSidebar = () => {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  const handleSignOut = async () => {
    setSigningOut(true)
    try {
      await logout()
    } finally {
      setSigningOut(false)
      setConfirmOpen(false)
      setMobileOpen(false)
    }
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  const department = user?.staffProfile?.department?.replace('_', ' ') || 'Staff'

  const sidebarContent = (
    <>
      <div className="flex items-center gap-2.5 px-5 pt-6 pb-5">
        <Image src={logo} alt="StayHaven" className="w-7 h-7 rounded-sm" />
        <div className="flex flex-col">
          <span className="text-foreground font-bold text-base leading-tight">StayHaven</span>
          <span className="text-foreground-tertiary text-[10px] uppercase tracking-wider">Staff</span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-2">
        <ul className="flex flex-col gap-0.5">
          {navItems.map(item => {
            const active = isActive(item.href)
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-foreground text-foreground-inverse'
                      : 'text-foreground-secondary hover:bg-foreground-disabled/10 hover:text-foreground'
                  }`}
                >
                  <item.icon size={18} />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Staff info + logout */}
      <div className="px-3 pb-5 mt-auto">
        <div className="px-3 py-3 border-t border-border mb-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-foreground-disabled/15 flex items-center justify-center text-foreground font-semibold text-sm flex-shrink-0">
              {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-foreground text-sm font-medium truncate">{user?.firstName} {user?.lastName}</p>
              <p className="text-foreground-tertiary text-[11px] uppercase tracking-wider">{department}</p>
            </div>
          </div>
        </div>
        <button
          onClick={() => setConfirmOpen(true)}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-danger hover:bg-danger-bg transition-colors w-full"
        >
          <HiOutlineLogout size={18} />
          Sign Out
        </button>
      </div>
    </>
  )

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 p-2 bg-foreground-inverse border border-border rounded-lg shadow-sm"
      >
        <HiOutlineMenu size={20} className="text-foreground" />
      </button>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-foreground/30" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72 bg-foreground-inverse border-r border-border flex flex-col shadow-xl">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-1 text-foreground-tertiary hover:text-foreground"
            >
              <HiOutlineX size={20} />
            </button>
            {sidebarContent}
          </div>
        </div>
      )}

      <aside className="hidden lg:flex flex-col w-64 h-screen border-r border-border bg-foreground-inverse fixed left-0 top-0">
        {sidebarContent}
      </aside>

      <ConfirmModal
        open={confirmOpen}
        title="Sign out?"
        message="Make sure you've completed any in-progress check-ins or check-outs before signing out."
        confirmLabel="Sign Out"
        variant="danger"
        loading={signingOut}
        onConfirm={handleSignOut}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  )
}

export default StaffSidebar
