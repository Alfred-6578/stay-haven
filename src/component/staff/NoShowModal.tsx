'use client'
import React, { useState } from 'react'
import { HiOutlineX, HiOutlineExclamation } from 'react-icons/hi'
import { api } from '@/lib/api'
import { toast } from 'sonner'

interface NoShowBooking {
  id: string
  bookingRef: string
  checkIn: string
  guest: { firstName: string; lastName: string }
}

interface Props {
  room: { id: string; number: string; floor: number; roomType: { name: string } } | null
  booking: NoShowBooking | null
  daysMissed?: number
  onClose: () => void
  onSuccess: () => void
}

const NoShowModal = ({ room, booking, daysMissed, onClose, onSuccess }: Props) => {
  const [loading, setLoading] = useState(false)

  if (!room || !booking) return null

  const guestName = `${booking.guest.firstName} ${booking.guest.lastName}`

  const handleConfirm = async () => {
    setLoading(true)
    try {
      await api.post(`/staff/bookings/${booking.id}/no-show`)
      toast.success(`${guestName} marked as no-show — Room ${room.number} is now available`)
      onSuccess()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to mark no-show'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/50 backdrop-blur-sm" onClick={loading ? undefined : onClose} />
      <div className="relative w-full max-w-md bg-foreground-inverse rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <p className="text-danger text-xs uppercase tracking-wider font-semibold">No-Show</p>
            <h2 className="text-foreground font-bold text-lg">Room {room.number}</h2>
          </div>
          <button onClick={onClose} disabled={loading} className="p-2 text-foreground-tertiary hover:text-foreground">
            <HiOutlineX size={20} />
          </button>
        </div>

        <div className="px-5 py-5">
          {/* Alert */}
          <div className="bg-danger-bg/40 border border-danger/30 rounded-xl p-4 mb-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-danger/10 flex items-center justify-center shrink-0">
                <HiOutlineExclamation size={20} className="text-danger" />
              </div>
              <div>
                <p className="text-foreground font-semibold text-sm">Guest Never Arrived</p>
                <p className="text-foreground-secondary text-xs mt-1">
                  <strong>{guestName}</strong> was expected on{' '}
                  {new Date(booking.checkIn).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  {daysMissed !== undefined && daysMissed > 0 && (
                    <span className="text-danger font-semibold"> ({daysMissed} day{daysMissed !== 1 ? 's' : ''} ago)</span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 gap-3 mb-5 text-sm">
            <div>
              <p className="text-foreground-tertiary text-[11px] uppercase tracking-wider">Guest</p>
              <p className="text-foreground font-semibold">{guestName}</p>
            </div>
            <div>
              <p className="text-foreground-tertiary text-[11px] uppercase tracking-wider">Booking Ref</p>
              <p className="text-foreground font-mono text-xs">{booking.bookingRef}</p>
            </div>
            <div>
              <p className="text-foreground-tertiary text-[11px] uppercase tracking-wider">Room</p>
              <p className="text-foreground">{room.number} · Floor {room.floor}</p>
            </div>
            <div>
              <p className="text-foreground-tertiary text-[11px] uppercase tracking-wider">Type</p>
              <p className="text-foreground">{room.roomType.name}</p>
            </div>
          </div>

          {/* What happens */}
          <div className="bg-foreground-disabled/5 border border-border rounded-lg p-3 mb-5">
            <p className="text-foreground-secondary text-xs leading-relaxed">
              Marking as no-show will:
            </p>
            <ul className="text-foreground-secondary text-xs mt-1.5 space-y-1">
              <li className="flex items-start gap-1.5">
                <span className="text-foreground-tertiary mt-0.5">•</span>
                Change booking status to <strong className="text-foreground">NO_SHOW</strong>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-foreground-tertiary mt-0.5">•</span>
                Free Room {room.number} back to <strong className="text-success">AVAILABLE</strong>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-foreground-tertiary mt-0.5">•</span>
                Notify the guest via in-app notification
              </li>
            </ul>
          </div>
        </div>

        {/* Actions */}
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
            className="flex-1 bg-danger text-foreground-inverse rounded-lg py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />}
            {loading ? 'Marking…' : 'Mark as No-Show'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default NoShowModal
