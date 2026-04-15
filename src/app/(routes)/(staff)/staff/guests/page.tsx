'use client'
import React, { useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'
import { HiOutlineSearch, HiOutlineChevronDown, HiOutlineChevronUp, HiOutlineLogin, HiOutlineLogout } from 'react-icons/hi'
import LoyaltyTierBadge from '@/component/guest/LoyaltyTierBadge'
import CheckInModal, { CheckInBooking } from '@/component/staff/CheckInModal'
import CheckOutModal, { CheckOutBooking } from '@/component/staff/CheckOutModal'

interface GuestSearchResult {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  avatar: string | null
  guestProfile: {
    loyaltyTier: string
    totalStays: number
    totalPoints: number
  } | null
  latestBooking: {
    id: string
    bookingRef: string
    status: string
    checkIn: string
    checkOut: string
    room: { number: string; roomType: { name: string } }
  } | null
}

interface DetailBooking {
  id: string
  bookingRef: string
  status: string
  checkIn: string
  checkOut: string
  totalNights?: number
  totalAmount: string | number
  specialRequests?: string | null
  room: { number: string; floor: number; roomType: { name: string } }
  payment: { status: string } | null
}

interface GuestDetail {
  user: {
    id: string
    firstName: string
    lastName: string
    email: string
    phone: string | null
    createdAt: string
  }
  guestProfile: {
    idType: string | null
    idNumber: string | null
    nationality: string | null
    dateOfBirth: string | null
    address: string | null
    preferences: Record<string, boolean>
    loyaltyTier: string
    totalStays: number
  } | null
  bookings: DetailBooking[]
  loyalty: {
    tier: string
    totalPoints: number
    lifetimePoints: number
    totalStays: number
    tierProgress: number
    nextTier: { name: string; pointsAway: number; isMax: boolean }
  }
}

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: 'bg-success-bg text-success',
  CHECKED_IN: 'bg-[#EAF3DE] text-[#4A6B2E]',
  CHECKED_OUT: 'bg-foreground-disabled/15 text-foreground-secondary',
  PENDING: 'bg-warning-bg text-warning',
  CANCELLED: 'bg-danger-bg text-danger',
  NO_SHOW: 'bg-danger-bg text-danger',
}

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_COLORS[status] || 'bg-foreground-disabled/15 text-foreground-secondary'
  return (
    <span className={`${style} text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider`}>
      {status.replace('_', ' ')}
    </span>
  )
}

// A booking is ready for check-in if its check-in date is today or past
function isCheckInReady(booking: DetailBooking): boolean {
  if (booking.status !== 'CONFIRMED') return false
  const checkInDate = new Date(booking.checkIn)
  const endOfToday = new Date()
  endOfToday.setHours(23, 59, 59, 999)
  return checkInDate <= endOfToday
}

export default function StaffGuestsPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GuestSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [detailMap, setDetailMap] = useState<Record<string, GuestDetail>>({})
  const [detailLoadingId, setDetailLoadingId] = useState<string | null>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // Modal state
  const [checkInBooking, setCheckInBooking] = useState<CheckInBooking | null>(null)
  const [checkOutBooking, setCheckOutBooking] = useState<CheckOutBooking | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) {
      setResults([])
      setSearching(false)
      return
    }
    setSearching(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await api.get(`/staff/guests/search?q=${encodeURIComponent(query.trim())}`)
        setResults(res.data.data)
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  const reloadDetail = async (guestId: string) => {
    try {
      const res = await api.get(`/staff/guests/${guestId}`)
      setDetailMap(prev => ({ ...prev, [guestId]: res.data.data }))
    } catch {
      // ignore
    }
  }

  const toggleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null)
      return
    }
    setExpandedId(id)
    if (!detailMap[id]) {
      setDetailLoadingId(id)
      try {
        const res = await api.get(`/staff/guests/${id}`)
        setDetailMap(prev => ({ ...prev, [id]: res.data.data }))
      } catch {
        // ignore
      } finally {
        setDetailLoadingId(null)
      }
    }
  }

  const handleCheckIn = (detail: GuestDetail, booking: DetailBooking) => {
    setCheckInBooking({
      id: booking.id,
      bookingRef: booking.bookingRef,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      totalNights: booking.totalNights || 0,
      specialRequests: booking.specialRequests || null,
      guest: {
        firstName: detail.user.firstName,
        lastName: detail.user.lastName,
        email: detail.user.email,
        phone: detail.user.phone,
        guestProfile: detail.guestProfile
          ? { idNumber: detail.guestProfile.idNumber, idType: detail.guestProfile.idType }
          : null,
      },
      room: {
        number: booking.room.number,
        floor: booking.room.floor,
        roomType: { name: booking.room.roomType.name },
      },
    })
  }

  const handleCheckOut = async (detail: GuestDetail, booking: DetailBooking) => {
    // Fetch full booking to get roomServiceOrders for the pending-orders warning
    try {
      const res = await api.get(`/bookings/${booking.id}`)
      const full = res.data.data
      setCheckOutBooking({
        id: full.id,
        bookingRef: full.bookingRef,
        checkIn: full.checkIn,
        checkOut: full.checkOut,
        totalNights: full.totalNights,
        guest: {
          firstName: detail.user.firstName,
          lastName: detail.user.lastName,
          email: detail.user.email,
        },
        room: {
          number: full.room.number,
          floor: full.room.floor,
          roomType: { name: full.room.roomType.name },
        },
        roomServiceOrders: (full.roomServiceOrders || []).filter(
          (o: { status: string }) => o.status !== 'DELIVERED'
        ),
      })
    } catch {
      // Fall back to opening with minimal data if the fetch fails
      setCheckOutBooking({
        id: booking.id,
        bookingRef: booking.bookingRef,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        totalNights: booking.totalNights || 0,
        guest: {
          firstName: detail.user.firstName,
          lastName: detail.user.lastName,
          email: detail.user.email,
        },
        room: {
          number: booking.room.number,
          floor: booking.room.floor,
          roomType: { name: booking.room.roomType.name },
        },
        roomServiceOrders: [],
      })
    }
  }

  return (
    <div>
      <h1 className="text-foreground font-heading text-2xl font-bold mb-2">Guest Lookup</h1>
      <p className="text-foreground-tertiary text-sm mb-6">Search by name, email, phone, or booking reference.</p>

      {/* Search */}
      <div className="relative mb-6">
        <HiOutlineSearch size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground-tertiary" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search guests..."
          className="w-full border border-border rounded-xl pl-11 pr-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-foreground/20 bg-foreground-inverse"
        />
      </div>

      {/* Results */}
      {!query.trim() ? (
        <div className="text-center py-16">
          <HiOutlineSearch size={32} className="text-foreground-disabled mx-auto mb-3" />
          <p className="text-foreground-tertiary text-sm">Start typing to find a guest</p>
        </div>
      ) : searching ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-16 bg-foreground-disabled/10 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : results.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-foreground-tertiary text-sm">No guests match &ldquo;{query}&rdquo;</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {results.map(guest => {
            const expanded = expandedId === guest.id
            const detail = detailMap[guest.id]
            return (
              <div key={guest.id} className="border border-border rounded-xl bg-foreground-inverse overflow-hidden">
                <button
                  onClick={() => toggleExpand(guest.id)}
                  className="w-full flex items-center gap-4 px-4 py-3 hover:bg-foreground-disabled/5 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-foreground-disabled/15 flex items-center justify-center text-foreground font-semibold text-sm flex-shrink-0">
                    {guest.firstName.charAt(0)}{guest.lastName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-foreground font-semibold text-sm truncate">{guest.firstName} {guest.lastName}</p>
                    <p className="text-foreground-tertiary text-xs truncate">{guest.email}</p>
                  </div>
                  <div className="hidden vsm:flex items-center gap-2 flex-shrink-0">
                    {guest.guestProfile && <LoyaltyTierBadge tier={guest.guestProfile.loyaltyTier as 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM'} />}
                    {guest.latestBooking && <StatusBadge status={guest.latestBooking.status} />}
                  </div>
                  {expanded ? (
                    <HiOutlineChevronUp size={18} className="text-foreground-tertiary flex-shrink-0" />
                  ) : (
                    <HiOutlineChevronDown size={18} className="text-foreground-tertiary flex-shrink-0" />
                  )}
                </button>

                {expanded && (
                  <div className="border-t border-border px-4 py-4 bg-foreground-disabled/[0.02]">
                    {detailLoadingId === guest.id || !detail ? (
                      <div className="h-32 bg-foreground-disabled/10 rounded-lg animate-pulse" />
                    ) : (
                      <GuestDetailPanel
                        detail={detail}
                        onCheckIn={(b) => handleCheckIn(detail, b)}
                        onCheckOut={(b) => handleCheckOut(detail, b)}
                      />
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modals */}
      <CheckInModal
        booking={checkInBooking}
        onClose={() => setCheckInBooking(null)}
        onSuccess={() => {
          const id = expandedId
          setCheckInBooking(null)
          if (id) reloadDetail(id)
        }}
      />
      <CheckOutModal
        booking={checkOutBooking}
        onClose={() => setCheckOutBooking(null)}
        onSuccess={() => {
          const id = expandedId
          setCheckOutBooking(null)
          if (id) reloadDetail(id)
        }}
      />
    </div>
  )
}

function GuestDetailPanel({
  detail,
  onCheckIn,
  onCheckOut,
}: {
  detail: GuestDetail
  onCheckIn: (booking: DetailBooking) => void
  onCheckOut: (booking: DetailBooking) => void
}) {
  const { guestProfile, bookings, loyalty, user } = detail
  const preferences = guestProfile?.preferences || {}
  const activePrefs = Object.entries(preferences).filter(([, v]) => v).map(([k]) => k)

  return (
    <div className="grid md:grid-cols-3 gap-5">
      {/* Profile info */}
      <div className="md:col-span-1">
        <h4 className="text-foreground font-semibold text-sm mb-3">Profile</h4>
        <dl className="space-y-2 text-sm">
          <div>
            <dt className="text-foreground-tertiary text-[11px] uppercase tracking-wider">Phone</dt>
            <dd className="text-foreground">{user.phone || '—'}</dd>
          </div>
          <div>
            <dt className="text-foreground-tertiary text-[11px] uppercase tracking-wider">Nationality</dt>
            <dd className="text-foreground">{guestProfile?.nationality || '—'}</dd>
          </div>
          <div>
            <dt className="text-foreground-tertiary text-[11px] uppercase tracking-wider">ID</dt>
            <dd className="text-foreground">
              {guestProfile?.idNumber ? `${guestProfile.idType || 'ID'} · ${guestProfile.idNumber}` : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-foreground-tertiary text-[11px] uppercase tracking-wider">Loyalty</dt>
            <dd className="text-foreground flex items-center gap-2">
              <LoyaltyTierBadge tier={loyalty.tier as 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM'} />
              <span className="text-foreground-tertiary text-xs">{loyalty.totalPoints.toLocaleString()} pts · {loyalty.totalStays} stays</span>
            </dd>
          </div>
          {activePrefs.length > 0 && (
            <div>
              <dt className="text-foreground-tertiary text-[11px] uppercase tracking-wider">Preferences</dt>
              <dd className="text-foreground text-xs mt-1 flex flex-wrap gap-1">
                {activePrefs.map(p => (
                  <span key={p} className="bg-foreground-disabled/15 px-2 py-0.5 rounded-full">
                    {p.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
                  </span>
                ))}
              </dd>
            </div>
          )}
        </dl>
      </div>

      {/* Booking history */}
      <div className="md:col-span-2">
        <h4 className="text-foreground font-semibold text-sm mb-3">Booking History ({bookings.length})</h4>
        {bookings.length === 0 ? (
          <p className="text-foreground-tertiary text-sm">No bookings yet</p>
        ) : (
          <div className="flex flex-col gap-2 max-h-[340px] overflow-y-auto">
            {bookings.map(b => {
              const canCheckIn = isCheckInReady(b)
              const canCheckOut = b.status === 'CHECKED_IN'
              return (
                <div key={b.id} className="border border-border rounded-lg px-3 py-2.5 bg-foreground-inverse">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-foreground text-sm font-medium truncate">
                        {b.room.roomType.name} · Room {b.room.number}
                      </p>
                      <p className="text-foreground-tertiary text-xs">
                        {new Date(b.checkIn).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} – {new Date(b.checkOut).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <StatusBadge status={b.status} />
                      <p className="text-foreground text-xs font-semibold">${Number(b.totalAmount).toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-foreground-tertiary text-[10px]">{b.bookingRef}</p>
                    {(canCheckIn || canCheckOut) && (
                      <div className="flex gap-1">
                        {canCheckIn && (
                          <button
                            onClick={() => onCheckIn(b)}
                            className="inline-flex items-center gap-1 bg-foreground text-foreground-inverse text-[11px] font-semibold px-2.5 py-1 rounded-md hover:opacity-90"
                          >
                            <HiOutlineLogin size={12} />
                            Check In
                          </button>
                        )}
                        {canCheckOut && (
                          <button
                            onClick={() => onCheckOut(b)}
                            className="inline-flex items-center gap-1 bg-warning text-foreground-inverse text-[11px] font-semibold px-2.5 py-1 rounded-md hover:opacity-90"
                          >
                            <HiOutlineLogout size={12} />
                            Check Out
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
