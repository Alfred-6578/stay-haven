'use client'
import React, { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { api } from '@/lib/api'
import Button from '@/component/ui/Button'
import { HiOutlineCalendar, HiOutlineUsers } from 'react-icons/hi'
import { MdOutlineKingBed } from 'react-icons/md'

interface Booking {
  id: string
  bookingRef: string
  groupRef: string | null
  checkIn: string
  checkOut: string
  adults: number
  totalNights: number
  totalAmount: string | number
  discountAmount: string | number
  status: string
  room: {
    number: string
    roomType: { name: string }
  }
}

function ConfirmedContent() {
  const searchParams = useSearchParams()
  const bookingId = searchParams.get('bookingId')
  const groupRef = searchParams.get('groupRef')
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        if (groupRef) {
          const res = await api.get(`/guest/bookings?groupRef=${encodeURIComponent(groupRef)}&limit=50`)
          // Endpoint returns { upcoming, past } — we want all bookings in the group
          const data = res.data.data
          setBookings([...(data.upcoming || []), ...(data.past || [])])
        } else if (bookingId) {
          const res = await api.get(`/bookings/${bookingId}`)
          setBookings([res.data.data])
        }
      } catch {}
      setLoading(false)
    })()
  }, [bookingId, groupRef])

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

  const formatNaira = (v: number) =>
    `₦${new Intl.NumberFormat('en-NG', { maximumFractionDigits: 0 }).format(v)}`

  if (loading) {
    return (
      <div className="min-h-screen bg-foreground-inverse flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const isGroup = bookings.length > 1
  const primary = bookings[0]
  const groupTotal = bookings.reduce(
    (s, b) => s + Math.max(0, Number(b.totalAmount) - Number(b.discountAmount || 0)),
    0
  )
  const pointsEarned = Math.floor(groupTotal)

  return (
    <div className="min-h-screen bg-foreground-inverse flex items-center justify-center px-5 py-16">
      <div className="max-w-md w-full text-center">
        {/* Celebration */}
        <div className="relative mb-8">
          <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto animate-hero-scale-in">
            <svg className="w-10 h-10 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full bg-foreground"
              style={{
                top: `${50 + 45 * Math.sin((i * Math.PI * 2) / 8)}%`,
                left: `${50 + 45 * Math.cos((i * Math.PI * 2) / 8)}%`,
                opacity: 0,
                animation: `heroFadeIn 0.4s ease-out ${0.3 + i * 0.05}s forwards`,
                transform: 'scale(0.5)',
              }}
            />
          ))}
        </div>

        <h1 className="font-heading text-2xl vsm:text-3xl font-bold text-foreground mb-2 animate-hero-fade-up hero-delay-2">
          {isGroup ? `Group Booking Confirmed (${bookings.length} rooms)` : 'Booking Confirmed!'}
        </h1>
        <p className="text-foreground-tertiary text-sm mb-8 animate-hero-fade-up hero-delay-3">
          Your reservation has been confirmed. We can&apos;t wait to welcome you!
        </p>

        {primary && (
          <div className="border border-border rounded-2xl p-5 vsm:p-6 text-left mb-8 animate-hero-fade-up hero-delay-4">
            {/* Ref */}
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
              <div>
                <p className="text-foreground-tertiary text-xs">
                  {isGroup ? 'Group Reference' : 'Booking Reference'}
                </p>
                <p className="text-foreground font-mono font-bold text-lg">
                  {isGroup ? primary.groupRef : primary.bookingRef}
                </p>
              </div>
              <span className="bg-success/10 text-success text-xs font-medium px-3 py-1 rounded-full">
                {primary.status}
              </span>
            </div>

            {/* Rooms */}
            {isGroup ? (
              <div className="flex flex-col gap-2.5 mb-4">
                {bookings.map(b => (
                  <div key={b.id} className="flex items-start gap-2.5 text-sm border border-border rounded-lg px-3 py-2">
                    <MdOutlineKingBed size={16} className="text-foreground-tertiary mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground">
                        {b.room.roomType.name} — Room {b.room.number}
                      </p>
                      <p className="text-foreground-tertiary text-xs">
                        {b.bookingRef} · {b.adults} guest{b.adults !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <p className="text-foreground text-sm font-semibold">
                      {formatNaira(Math.max(0, Number(b.totalAmount) - Number(b.discountAmount || 0)))}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-3 mb-4">
                <div className="flex items-center gap-2.5 text-sm">
                  <MdOutlineKingBed size={16} className="text-foreground-tertiary" />
                  <span className="text-foreground">{primary.room.roomType.name} — Room {primary.room.number}</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm">
                  <HiOutlineUsers size={16} className="text-foreground-tertiary" />
                  <span className="text-foreground">{primary.adults} guest{primary.adults !== 1 ? 's' : ''}</span>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2.5 text-sm">
              <HiOutlineCalendar size={16} className="text-foreground-tertiary" />
              <span className="text-foreground">{formatDate(primary.checkIn)} → {formatDate(primary.checkOut)}</span>
              <span className="text-foreground-tertiary">({primary.totalNights} nights)</span>
            </div>

            {/* Total */}
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-border">
              <span className="text-foreground-secondary text-sm">Total Paid</span>
              <span className="text-foreground font-bold text-xl">{formatNaira(groupTotal)}</span>
            </div>

            {/* Points earned */}
            {pointsEarned > 0 && (
              <div className="mt-4 bg-gold/5 border border-gold/20 rounded-xl p-3 text-center">
                <p className="text-sm text-foreground">
                  You earned <span className="font-bold text-gold">{pointsEarned.toLocaleString()}</span> loyalty points!
                </p>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col vsm:flex-row gap-3 justify-center animate-hero-fade-up hero-delay-5">
          {primary && (
            <Button href={isGroup ? '/bookings' : `/bookings/${primary.id}`} variant="outline">
              {isGroup ? 'View My Bookings' : 'View Booking'}
            </Button>
          )}
          <Button href="/dashboard" withArrow>
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function ConfirmedPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-foreground-inverse flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ConfirmedContent />
    </Suspense>
  )
}
