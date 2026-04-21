'use client'
import React, { useState } from 'react'
import { HiOutlineX, HiOutlineIdentification, HiOutlineAnnotation } from 'react-icons/hi'
import { api } from '@/lib/api'
import { toast } from 'sonner'

export interface CheckInBooking {
  id: string
  bookingRef: string
  checkIn: string
  checkOut: string
  totalNights: number
  specialRequests: string | null
  guest: {
    firstName: string
    lastName: string
    email: string
    phone: string | null
    guestProfile: {
      idNumber: string | null
      idType: string | null
    } | null
  }
  room: {
    number: string
    floor: number
    roomType: { name: string }
  }
}

interface Props {
  booking: CheckInBooking | null
  onClose: () => void
  onSuccess: () => void
}

const CheckInModal = ({ booking, onClose, onSuccess }: Props) => {
  const [loading, setLoading] = useState(false)

  if (!booking) return null

  const handleConfirm = async () => {
    setLoading(true)
    try {
      await api.post(`/staff/bookings/${booking.id}/checkin`)
      toast.success(`${booking.guest.firstName} ${booking.guest.lastName} checked into Room ${booking.room.number}`)
      onSuccess()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Check-in failed'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/40" onClick={loading ? undefined : onClose} />
      <div className="relative w-full max-w-md bg-foreground-inverse rounded-2xl shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <p className="text-foreground-tertiary text-xs uppercase tracking-wider">Check-In</p>
            <h2 className="text-foreground font-bold text-lg">{booking.bookingRef}</h2>
          </div>
          <button onClick={onClose} disabled={loading} className="p-2 text-foreground-tertiary hover:text-foreground">
            <HiOutlineX size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Guest */}
          <div>
            <p className="text-foreground-tertiary text-[11px] uppercase tracking-wider mb-1">Guest</p>
            <p className="text-foreground font-semibold text-base">
              {booking.guest.firstName} {booking.guest.lastName}
            </p>
            <p className="text-foreground-tertiary text-xs">{booking.guest.email}</p>
            {booking.guest.phone && <p className="text-foreground-tertiary text-xs">{booking.guest.phone}</p>}
          </div>

          {/* Room */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-foreground-tertiary text-[11px] uppercase tracking-wider">Room</p>
              <p className="text-foreground font-semibold">{booking.room.number} · Floor {booking.room.floor}</p>
              <p className="text-foreground-tertiary text-xs">{booking.room.roomType.name}</p>
            </div>
            <div>
              <p className="text-foreground-tertiary text-[11px] uppercase tracking-wider">Nights</p>
              <p className="text-foreground font-semibold">{booking.totalNights}</p>
              <p className="text-foreground-tertiary text-xs">
                {new Date(booking.checkIn).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {new Date(booking.checkOut).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </p>
            </div>
          </div>

          {/* ID Verification */}
          <div className="bg-foreground-disabled/5 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <HiOutlineIdentification size={16} className="text-foreground-tertiary" />
              <span className="text-foreground-tertiary text-[11px] uppercase tracking-wider font-semibold">ID Verification</span>
            </div>
            {booking.guest.guestProfile?.idNumber ? (
              <>
                <p className="text-foreground font-mono text-sm">{booking.guest.guestProfile.idNumber}</p>
                <p className="text-foreground-tertiary text-xs mt-0.5">{booking.guest.guestProfile.idType || 'ID'}</p>
              </>
            ) : (
              <p className="text-foreground-tertiary text-sm italic">No ID on file — verify physical ID on arrival</p>
            )}
          </div>

          {/* Special Requests */}
          {booking.specialRequests && (
            <div className="border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <HiOutlineAnnotation size={16} className="text-foreground-tertiary" />
                <span className="text-foreground-tertiary text-[11px] uppercase tracking-wider font-semibold">Special Requests</span>
              </div>
              <p className="text-foreground text-sm">{booking.specialRequests}</p>
            </div>
          )}
        </div>

        <div className="flex gap-2 px-5 py-4 border-t border-border">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 border border-border rounded-lg py-2.5 text-sm text-foreground hover:bg-foreground-disabled/5"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 bg-foreground text-foreground-inverse rounded-lg py-2.5 text-sm font-medium disabled:opacity-50"
          >
            {loading ? 'Checking in...' : 'Confirm Check-In'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default CheckInModal
