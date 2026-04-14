'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import {
  HiOutlineCash,
  HiOutlineChartBar,
  HiOutlineCalendar,
  HiOutlineUserGroup,
  HiOutlineClock,
  HiOutlineUserAdd,
  HiOutlinePlus,
  HiOutlineDownload,
} from 'react-icons/hi'
import StatCard from '@/component/admin/StatCard'
import RevenueChart from '@/component/admin/RevenueChart'
import OccupancyChart from '@/component/admin/OccupancyChart'
import RecentBookingsTable from '@/component/admin/RecentBookingsTable'
import ExportDashboardModal from '@/component/admin/ExportDashboardModal'

interface DashboardStats {
  overview: {
    totalRevenue: number
    totalBookings: number
    totalGuests: number
    totalRooms: number
  }
  today: {
    todayRevenue: number
    todayCheckIns: number
    todayCheckOuts: number
    newBookingsToday: number
  }
  thisMonth: {
    monthRevenue: number
    monthBookings: number
    currentOccupancyRate: number
    occupiedRooms: number
    totalRooms: number
  }
  recent: {
    recentBookings: Array<{
      id: string
      bookingRef: string
      guestName: string
      roomNumber: string
      roomType: string
      amount: number
      status: string
      createdAt: string
    }>
    recentGuests: Array<{
      id: string
      firstName: string
      lastName: string
      email: string
      createdAt: string
    }>
  }
}

const formatNaira = (v: number) =>
  `₦${new Intl.NumberFormat('en-NG', { maximumFractionDigits: 0 }).format(v)}`

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [exportOpen, setExportOpen] = useState(false)

  useEffect(() => {
    api.get('/admin/stats')
      .then(res => setStats(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-1 vsm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map(i => <div key={i} className="h-32 bg-foreground-disabled/10 rounded-2xl animate-pulse" />)}
        </div>
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="h-80 bg-foreground-disabled/10 rounded-2xl animate-pulse" />
          <div className="h-80 bg-foreground-disabled/10 rounded-2xl animate-pulse" />
        </div>
      </div>
    )
  }

  if (!stats) return null

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-foreground font-heading text-2xl font-bold">Dashboard</h1>
          <p className="text-foreground-tertiary text-sm">Overview of hotel performance</p>
        </div>
        <button
          onClick={() => setExportOpen(true)}
          className="flex items-center gap-2 bg-[#0B1B3A] text-white rounded-lg px-4 py-2 text-sm font-semibold hover:opacity-90 shadow-sm"
        >
          <HiOutlineDownload size={16} />
          Export
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 vsm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Revenue"
          value={formatNaira(stats.overview.totalRevenue)}
          subtext={`${formatNaira(stats.thisMonth.monthRevenue)} this month`}
          icon={HiOutlineCash}
          trend="up"
        />
        <StatCard
          label="Occupancy Rate"
          value={`${stats.thisMonth.currentOccupancyRate}%`}
          subtext={`${stats.thisMonth.occupiedRooms} of ${stats.thisMonth.totalRooms} rooms`}
          icon={HiOutlineChartBar}
          trend={stats.thisMonth.currentOccupancyRate >= 50 ? 'up' : 'neutral'}
        />
        <StatCard
          label="Total Bookings"
          value={stats.overview.totalBookings.toLocaleString()}
          subtext={`+${stats.today.newBookingsToday} today`}
          icon={HiOutlineCalendar}
          trend={stats.today.newBookingsToday > 0 ? 'up' : 'neutral'}
        />
        <StatCard
          label="Registered Guests"
          value={stats.overview.totalGuests.toLocaleString()}
          subtext={`${stats.recent.recentGuests.length} new recently`}
          icon={HiOutlineUserGroup}
          trend="up"
        />
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <RevenueChart />
        <OccupancyChart />
      </div>

      {/* Recent Bookings */}
      <div className="mb-6">
        <RecentBookingsTable bookings={stats.recent.recentBookings} />
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-foreground font-semibold text-sm mb-3">Quick Actions</h3>
        <div className="grid grid-cols-1 vsm:grid-cols-3 gap-3">
          {[
            { href: '/admin/overstay', label: 'Check Overstay', desc: 'Review guests past checkout', icon: HiOutlineClock },
            { href: '/admin/staff', label: 'Invite Staff', desc: 'Add a new team member', icon: HiOutlineUserAdd },
            { href: '/admin/rooms', label: 'Add Room', desc: 'Create a new room', icon: HiOutlinePlus },
          ].map(action => (
            <Link
              key={action.href}
              href={action.href}
              className="group flex items-center gap-3 p-4 rounded-xl border border-border bg-foreground-inverse hover:border-foreground-disabled/50 hover:shadow-sm transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-[#0B1B3A]/5 flex items-center justify-center text-[#0B1B3A] flex-shrink-0 group-hover:bg-[#0B1B3A] group-hover:text-white transition-colors">
                <action.icon size={20} />
              </div>
              <div>
                <p className="text-foreground text-sm font-medium">{action.label}</p>
                <p className="text-foreground-tertiary text-xs">{action.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <ExportDashboardModal
        open={exportOpen}
        stats={stats}
        onClose={() => setExportOpen(false)}
      />
    </div>
  )
}
