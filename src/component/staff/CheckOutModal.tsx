'use client'
import React, { useState } from 'react'
import { HiOutlineX, HiOutlineExclamation } from 'react-icons/hi'
import { api } from '@/lib/api'
import { toast } from 'sonner'

export interface CheckOutBooking {
  id: string
  bookingRef: string
  checkIn: string
  checkOut: string
  totalNights: number
  guest: { firstName: string; lastName: string; email: string }
  room: { number: string; floor: number; roomType: { name: string } }
  roomServiceOrders: Array<{ id: string; status: string; totalAmount: number | string }>
}

interface Props {
  booking: CheckOutBooking | null
  onClose: () => void
  onSuccess: () => void
}

const CheckOutModal = ({ booking, onClose, onSuccess }: Props) => {
  const [loading, setLoading] = useState(false)

  if (!booking) return null

  const hasPending = booking.roomServiceOrders.length > 0

  const handleConfirm = async (force: boolean) => {
    setLoading(true)
    try {
      await api.post(`/staff/bookings/${booking.id}/checkout${force ? '?force=true' : ''}`)
      toast.success(`${booking.guest.firstName} ${booking.guest.lastName} checked out of Room ${booking.room.number}`)
      onSuccess()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Check-out failed'
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
            <p className="text-foreground-tertiary text-xs uppercase tracking-wider">Check-Out</p>
            <h2 className="text-foreground font-bold text-lg">{booking.bookingRef}</h2>
          </div>
          <button onClick={onClose} disabled={loading} className="p-2 text-foreground-tertiary hover:text-foreground">
            <HiOutlineX size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div>
            <p className="text-foreground-tertiary text-[11px] uppercase tracking-wider mb-1">Guest</p>
            <p className="text-foreground font-semibold text-base">
              {booking.guest.firstName} {booking.guest.lastName}
            </p>
            <p className="text-foreground-tertiary text-xs">{booking.guest.email}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-foreground-tertiary text-[11px] uppercase tracking-wider">Room</p>
              <p className="text-foreground font-semibold">{booking.room.number} · Floor {booking.room.floor}</p>
              <p className="text-foreground-tertiary text-xs">{booking.room.roomType.name}</p>
            </div>
            <div>
              <p className="text-foreground-tertiary text-[11px] uppercase tracking-wider">Stay Duration</p>
              <p className="text-foreground font-semibold">{booking.totalNights} night{booking.totalNights !== 1 ? 's' : ''}</p>
              <p className="text-foreground-tertiary text-xs">
                {new Date(booking.checkIn).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {new Date(booking.checkOut).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </p>
            </div>
          </div>

          {hasPending && (
            <div className="bg-warning-bg/30 border border-warning/30 rounded-xl p-4">
              <div className="flex items-start gap-2">
                <HiOutlineExclamation size={18} className="text-warning flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-foreground font-semibold text-sm">
                    {booking.roomServiceOrders.length} pending room service order{booking.roomServiceOrders.length !== 1 ? 's' : ''}
                  </p>
                  <p className="text-foreground-secondary text-xs mt-1">
                    These have not been marked as delivered. You can still proceed, but verify with the guest first.
                  </p>
                </div>
              </div>
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
            onClick={() => handleConfirm(hasPending)}
            disabled={loading}
            className={`flex-1 rounded-lg py-2.5 text-sm font-medium disabled:opacity-50 ${
              hasPending ? 'bg-warning text-foreground-inverse' : 'bg-foreground text-foreground-inverse'
            }`}
          >
            {loading ? 'Checking out...' : hasPending ? 'Force Check-Out' : 'Confirm Check-Out'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default CheckOutModal
