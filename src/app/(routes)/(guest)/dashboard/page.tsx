'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'
import LoyaltyTierBadge from '@/component/guest/LoyaltyTierBadge'
import Button from '@/component/ui/Button'
import { HiOutlineCalendar, HiOutlineStar, HiOutlineArrowRight } from 'react-icons/hi'
import { MdOutlineRoomService, MdOutlineMiscellaneousServices, MdOutlineKingBed } from 'react-icons/md'

interface UpcomingBooking {
  id: string
  bookingRef: string
  checkIn: string
  checkOut: string
  totalNights: number
  status: string
  room: {
    number: string
    roomType: { name: string; image: string | null }
  }
}

interface LoyaltyData {
  tier: string
  totalPoints: number
  tierProgress: number
  nextTier: { name: string; pointsAway: number; isMax: boolean }
}

export default function GuestDashboard() {
  const { user } = useAuth()
  const [upcoming, setUpcoming] = useState<UpcomingBooking | null>(null)
  const [loyalty, setLoyalty] = useState<LoyaltyData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      try {
        const [bookingsRes, loyaltyRes] = await Promise.all([
          api.get('/guest/bookings?limit=1&status=CONFIRMED'),
          api.get('/guest/loyalty'),
        ])
        const upcomingList = bookingsRes.data.data.upcoming
        if (upcomingList?.length > 0) setUpcoming(upcomingList[0])
        setLoyalty(loyaltyRes.data.data)
      } catch {}
      setLoading(false)
    })()
  }, [])

  const daysUntil = upcoming ? Math.ceil((new Date(upcoming.checkIn).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0

  return (
    <div>
      {/* Welcome */}
      <div className="bg-foreground rounded-2xl p-6 vsm:p-8 mb-6">
        <div className="flex flex-col vsm:flex-row vsm:items-center justify-between gap-4">
          <div>
            <h1 className="text-foreground-inverse font-heading text-2xl vsm:text-3xl font-bold mb-1">
              Welcome back, {user?.firstName}!
            </h1>
            <p className="text-foreground-inverse/60 text-sm">
              Here&apos;s what&apos;s happening with your stays.
            </p>
          </div>
          <LoyaltyTierBadge tier={user?.guestProfile?.loyaltyTier || 'BRONZE'} size="md" />
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Upcoming Booking */}
        <div className="border border-border rounded-2xl p-5 vsm:p-6">
          <h2 className="text-foreground font-semibold text-sm mb-4 flex items-center gap-2">
            <HiOutlineCalendar size={16} />
            Upcoming Stay
          </h2>
          {loading ? (
            <div className="h-24 bg-foreground-disabled/10 rounded-xl animate-pulse" />
          ) : upcoming ? (
            <Link href={`/bookings/${upcoming.id}`} className="group flex gap-4">
              <div className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
                <Image src={upcoming.room.roomType.image || '/room_2.jpeg'} alt="" fill className="object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-foreground font-semibold text-sm">{upcoming.room.roomType.name}</p>
                <p className="text-foreground-tertiary text-xs">Room {upcoming.room.number} &middot; {upcoming.bookingRef}</p>
                <p className="text-foreground-secondary text-xs mt-1">
                  {new Date(upcoming.checkIn).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — {new Date(upcoming.checkOut).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
                {daysUntil > 0 && (
                  <span className="inline-block mt-2 text-[11px] font-medium bg-success-bg text-success px-2 py-0.5 rounded-full">
                    {daysUntil} day{daysUntil !== 1 ? 's' : ''} away
                  </span>
                )}
              </div>
              <HiOutlineArrowRight size={16} className="text-foreground-disabled group-hover:text-foreground mt-1 transition-colors" />
            </Link>
          ) : (
            <div className="text-center py-6">
              <MdOutlineKingBed size={28} className="text-foreground-disabled mx-auto mb-2" />
              <p className="text-foreground-tertiary text-sm mb-3">No upcoming stays</p>
              <Button href="/rooms" size="sm">Browse Rooms</Button>
            </div>
          )}
        </div>

        {/* Loyalty Snapshot */}
        <div className="border border-border rounded-2xl p-5 vsm:p-6">
          <h2 className="text-foreground font-semibold text-sm mb-4 flex items-center gap-2">
            <HiOutlineStar size={16} />
            Loyalty Points
          </h2>
          {loading ? (
            <div className="h-24 bg-foreground-disabled/10 rounded-xl animate-pulse" />
          ) : loyalty ? (
            <div>
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-foreground text-3xl font-bold">{loyalty.totalPoints.toLocaleString()}</span>
                <span className="text-foreground-tertiary text-sm">points</span>
              </div>
              {/* Progress bar */}
              <div className="mb-2">
                <div className="h-2 w-full rounded-full bg-foreground-disabled/15 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-foreground transition-all duration-500"
                    style={{ width: `${loyalty.tierProgress}%` }}
                  />
                </div>
              </div>
              {!loyalty.nextTier.isMax ? (
                <p className="text-foreground-tertiary text-xs">
                  {loyalty.nextTier.pointsAway.toLocaleString()} points to {loyalty.nextTier.name}
                </p>
              ) : (
                <p className="text-foreground-tertiary text-xs">You&apos;ve reached the highest tier!</p>
              )}
              <Link href="/loyalty" className="inline-flex items-center gap-1 text-foreground text-xs font-medium mt-3 hover:underline">
                View Details <HiOutlineArrowRight size={12} />
              </Link>
            </div>
          ) : null}
        </div>
      </div>

      {/* Quick Actions */}
      <h2 className="text-foreground font-semibold text-sm mb-3">Quick Actions</h2>
      <div className="grid grid-cols-1 vsm:grid-cols-3 gap-3">
        {[
          { href: '/rooms', icon: MdOutlineKingBed, label: 'Book a Room', desc: 'Browse available rooms' },
          { href: '/room-service', icon: MdOutlineRoomService, label: 'Room Service', desc: 'Order food & drinks' },
          { href: '/services', icon: MdOutlineMiscellaneousServices, label: 'Request Service', desc: 'Spa, transport & more' },
        ].map(action => (
          <Link
            key={action.href}
            href={action.href}
            className="group flex items-center gap-3 p-4 rounded-xl border border-border hover:border-foreground-disabled/50 hover:shadow-sm transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-foreground-disabled/10 flex items-center justify-center text-foreground flex-shrink-0 group-hover:bg-foreground group-hover:text-foreground-inverse transition-colors">
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
  )
}
