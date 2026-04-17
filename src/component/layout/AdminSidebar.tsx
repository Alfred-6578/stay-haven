'use client'
import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import logo from '@/assets/logo.png'
import {
  HiOutlineViewGrid,
  HiOutlineOfficeBuilding,
  HiOutlineCalendar,
  HiOutlineUsers,
  HiOutlineUserGroup,
  HiOutlineStar,
  HiOutlineClock,
  HiOutlineMenu,
  HiOutlineX,
} from 'react-icons/hi'
import { MdOutlineMiscellaneousServices, MdOutlineUpgrade, MdOutlineRoomService } from 'react-icons/md'
import { TbCalendarPlus } from 'react-icons/tb'

const navItems = [
  { href: '/admin/dashboard', label: 'Overview', icon: HiOutlineViewGrid },
  { href: '/admin/rooms', label: 'Rooms', icon: HiOutlineOfficeBuilding },
  { href: '/admin/bookings', label: 'Bookings', icon: HiOutlineCalendar },
  { href: '/admin/staff', label: 'Staff', icon: HiOutlineUsers },
  { href: '/admin/guests', label: 'Guests', icon: HiOutlineUserGroup },
  { href: '/admin/services', label: 'Services', icon: MdOutlineMiscellaneousServices },
  { href: '/admin/room-service', label: 'Room Service', icon: MdOutlineRoomService },
  { href: '/admin/upgrades', label: 'Upgrades', icon: MdOutlineUpgrade },
  { href: '/admin/extensions', label: 'Extensions', icon: TbCalendarPlus },
  { href: '/admin/loyalty', label: 'Loyalty', icon: HiOutlineStar },
  { href: '/admin/overstay', label: 'Overstay', icon: HiOutlineClock },
]

const AdminSidebar = () => {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  const sidebarContent = (
    <>
      <div className="flex items-center gap-2.5 px-5 pt-6 pb-5">
        <Image src={logo} alt="StayHaven" className="w-7 h-7 rounded-sm" />
        <div className="flex flex-col">
          <span className="text-foreground font-bold text-base leading-tight">StayHaven</span>
          <span className="text-[#D97706] text-[10px] uppercase tracking-wider font-semibold">Admin</span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-2 overflow-y-auto">
        <ul className="flex flex-col gap-0.5">
          {navItems.map(item => {
            const active = isActive(item.href)
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`relative flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                    active
                      ? 'bg-[#0B1B3A] text-white border-l-4 border-[#D97706] pl-2'
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
    </>
  )
}

export default AdminSidebar
