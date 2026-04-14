'use client'
import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import logo from '@/assets/logo.png'
import { useAuth } from '@/context/AuthContext'
import LoyaltyTierBadge from '@/component/guest/LoyaltyTierBadge'
import {
  HiOutlineViewGrid,
  HiOutlineCalendar,
  HiOutlineStar,
  HiOutlineUser,
  HiOutlineBell,
  HiOutlineLogout,
  HiOutlineMenu,
  HiOutlineX,
} from 'react-icons/hi'
import { MdOutlineRoomService, MdOutlineMiscellaneousServices } from 'react-icons/md'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: HiOutlineViewGrid },
  { href: '/bookings', label: 'My Bookings', icon: HiOutlineCalendar },
  { href: '/loyalty', label: 'Loyalty', icon: HiOutlineStar },
  { href: '/room-service', label: 'Room Service', icon: MdOutlineRoomService },
  { href: '/services', label: 'Services', icon: MdOutlineMiscellaneousServices },
  { href: '/profile', label: 'Profile', icon: HiOutlineUser },
  { href: '/notifications', label: 'Notifications', icon: HiOutlineBell },
]

const GuestSidebar = () => {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 pt-6 pb-5">
        <Image src={logo} alt="StayHaven" className="w-7 h-7 rounded-sm" />
        <span className="text-foreground font-bold text-lg">StayHaven</span>
      </div>

      {/* User summary */}
      <div className="px-5 pb-5 border-b border-border mb-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-foreground-disabled/15 flex items-center justify-center text-foreground font-semibold text-sm flex-shrink-0">
            {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="text-foreground text-sm font-medium truncate">{user?.firstName} {user?.lastName}</p>
            <LoyaltyTierBadge tier={user?.guestProfile?.loyaltyTier || 'BRONZE'} />
          </div>
        </div>
      </div>

      {/* Nav */}
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

      {/* Logout */}
      <div className="px-3 pb-5 mt-auto">
        <button
          onClick={() => { logout(); setMobileOpen(false) }}
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
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 p-2 bg-foreground-inverse border border-border rounded-lg shadow-sm"
      >
        <HiOutlineMenu size={20} className="text-foreground" />
      </button>

      {/* Mobile overlay */}
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

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 h-screen border-r border-border bg-foreground-inverse fixed left-0 top-0">
        {sidebarContent}
      </aside>
    </>
  )
}

export default GuestSidebar
