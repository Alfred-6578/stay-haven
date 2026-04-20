'use client'
import React, { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import BookingCard from '@/component/guest/BookingCard'
import { HiOutlineCalendar } from 'react-icons/hi'
import Button from '@/component/ui/Button'
import EmptyState from '@/component/ui/EmptyState'
import ErrorState from '@/component/ui/ErrorState'
import { ListSkeleton, BookingCardSkeleton } from '@/component/ui/PageSkeleton'

type BookingData = React.ComponentProps<typeof BookingCard>['booking']

export default function GuestBookingsPage() {
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming')
  const [upcoming, setUpcoming] = useState<BookingData[]>([])
  const [past, setPast] = useState<BookingData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const res = await api.get('/guest/bookings?limit=50')
      setUpcoming(res.data.data.upcoming || [])
      setPast(res.data.data.past || [])
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const current = tab === 'upcoming' ? upcoming : past

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-6">
        <h1 className="text-foreground font-heading text-xl sm:text-2xl font-bold">My Bookings</h1>
        <Button href="/rooms" size="sm" withArrow>New Booking</Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-foreground-disabled/10 rounded-lg p-1 mb-6 w-fit">
        {(['upcoming', 'past'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors ${
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
        <ListSkeleton count={3} item={BookingCardSkeleton} />
      ) : error ? (
        <ErrorState
          title="Couldn't load your bookings"
          description="We had trouble fetching your bookings. Please try again."
          onRetry={load}
        />
      ) : current.length === 0 ? (
        <EmptyState
          icon={<HiOutlineCalendar />}
          title={tab === 'upcoming' ? 'No upcoming bookings' : 'No past bookings'}
          description={tab === 'upcoming' ? 'Your next adventure awaits — let\'s find the perfect room for your stay.' : 'Your booking history will appear here once you have completed a stay.'}
          {...(tab === 'upcoming' ? { actionLabel: 'Browse Rooms', actionHref: '/rooms' } : {})}
        />
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
