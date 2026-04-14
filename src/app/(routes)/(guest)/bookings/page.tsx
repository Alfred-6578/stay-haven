'use client'
import React, { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import BookingCard from '@/component/guest/BookingCard'
import { HiOutlineCalendar } from 'react-icons/hi'
import Button from '@/component/ui/Button'

type BookingData = React.ComponentProps<typeof BookingCard>['booking']

export default function GuestBookingsPage() {
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming')
  const [upcoming, setUpcoming] = useState<BookingData[]>([])
  const [past, setPast] = useState<BookingData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/guest/bookings?limit=50')
        setUpcoming(res.data.data.upcoming || [])
        setPast(res.data.data.past || [])
      } catch {}
      setLoading(false)
    })()
  }, [])

  const current = tab === 'upcoming' ? upcoming : past

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-foreground font-heading text-2xl font-bold">My Bookings</h1>
        <Button href="/rooms" size="sm" withArrow>New Booking</Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-foreground-disabled/10 rounded-lg p-1 mb-6 w-fit">
        {(['upcoming', 'past'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === t
                ? 'bg-foreground-inverse text-foreground shadow-sm'
                : 'text-foreground-tertiary hover:text-foreground'
            }`}
          >
            {t === 'upcoming' ? 'Upcoming' : 'Past'}
            {t === 'upcoming' && upcoming.length > 0 && (
              <span className="ml-1.5 text-[10px] bg-foreground text-foreground-inverse w-5 h-5 rounded-full inline-flex items-center justify-center">
                {upcoming.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex flex-col gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 bg-foreground-disabled/10 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : current.length === 0 ? (
        <div className="text-center py-16">
          <HiOutlineCalendar size={32} className="text-foreground-disabled mx-auto mb-3" />
          <h3 className="text-foreground font-semibold mb-1">
            {tab === 'upcoming' ? 'No upcoming bookings' : 'No past bookings'}
          </h3>
          <p className="text-foreground-tertiary text-sm mb-4">
            {tab === 'upcoming' ? 'Your next adventure awaits!' : 'Your booking history will appear here.'}
          </p>
          {tab === 'upcoming' && <Button href="/rooms" size="sm">Browse Rooms</Button>}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {current.map(b => (
            <BookingCard key={b.id} booking={b} />
          ))}
        </div>
      )}
    </div>
  )
}
