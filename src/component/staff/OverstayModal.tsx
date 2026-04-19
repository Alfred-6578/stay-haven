'use client'
import React, { useEffect, useState } from 'react'
import { HiOutlineX, HiOutlineClock, HiOutlineCash } from 'react-icons/hi'
import { api } from '@/lib/api'
import { toast } from 'sonner'

interface OverstayBooking {
  id: string
  bookingRef: string
  checkIn: string
  checkOut: string
  guest: { firstName: string; lastName: string }
  hoursOverdue: number
}

interface Balance {
  unsettledTotal: number
  settledTotal: number
  unsettledOrders: Array<{ id: string }>
}

interface Props {
  room: { id: string; number: string; floor: number; roomType: { name: string } } | null
  booking: OverstayBooking | null
  onClose: () => void
  onSuccess: () => void
}

const formatNaira = (v: number) =>
  `₦${new Intl.NumberFormat('en-NG', { maximumFractionDigits: 0 }).format(v)}`

const OverstayModal = ({ room, booking, onClose, onSuccess }: Props) => {
  const [loading, setLoading] = useState(false)
  const [balance, setBalance] = useState<Balance | null>(null)
  const [balanceLoading, setBalanceLoading] = useState(false)

  useEffect(() => {
    if (!booking) { setBalance(null); return }
    setBalanceLoading(true)
    api.get(`/bookings/${booking.id}`)
      .then(res => setBalance(res.data.data.roomServiceBalance || null))
      .catch(() => setBalance(null))
      .finally(() => setBalanceLoading(false))
  }, [booking])

  if (!room || !booking) return null

  const guestName = `${booking.guest.firstName} ${booking.guest.lastName}`
  const hasUnsettled = !!balance && balance.unsettledTotal > 0

  const handleCheckOut = async (force: boolean) => {
    setLoading(true)
    try {
      await api.post(`/staff/bookings/${booking.id}/checkout${force ? '?force=true' : ''}`)
      toast.success(`${guestName} checked out of Room ${room.number}`)
      onSuccess()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Check-out failed'
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
            <p className="text-warning text-xs uppercase tracking-wider font-semibold">Overstay</p>
            <h2 className="text-foreground font-bold text-lg">Room {room.number}</h2>
          </div>
          <button onClick={onClose} disabled={loading} className="p-2 text-foreground-tertiary hover:text-foreground">
            <HiOutlineX size={20} />
          </button>
        </div>

        <div className="px-5 py-5">
          {/* Alert */}
          <div className="bg-warning-bg/40 border border-warning/30 rounded-xl p-4 mb-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center shrink-0">
                <HiOutlineClock size={20} className="text-warning" />
              </div>
              <div>
                <p className="text-foreground font-semibold text-sm">Checkout Overdue</p>
                <p className="text-foreground-secondary text-xs mt-1">
                  <strong>{guestName}</strong> was due to check out on{' '}
                  {new Date(booking.checkOut).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  <span className="text-warning font-semibold"> ({booking.hoursOverdue}h overdue)</span>
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
              <p className="text-foreground-tertiary text-[11px] uppercase tracking-wider">Check-in</p>
              <p className="text-foreground text-xs">{new Date(booking.checkIn).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
            </div>
            <div>
              <p className="text-foreground-tertiary text-[11px] uppercase tracking-wider">Expected Checkout</p>
              <p className="text-danger text-xs font-semibold">{new Date(booking.checkOut).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
            </div>
          </div>

          {/* Room service balance */}
          {balanceLoading ? (
            <div className="h-16 bg-foreground-disabled/10 rounded-xl animate-pulse mb-5" />
          ) : balance && (balance.unsettledTotal > 0 || balance.settledTotal > 0) ? (
            <div className={`rounded-xl p-4 mb-5 ${hasUnsettled ? 'bg-danger-bg/40 border border-danger/30' : 'bg-success-bg border border-success/20'}`}>
              <div className="flex items-center gap-2 mb-2">
                <HiOutlineCash size={16} className={hasUnsettled ? 'text-danger' : 'text-success'} />
                <p className="text-foreground font-semibold text-xs uppercase tracking-wider">Room Service</p>
              </div>
              {hasUnsettled ? (
                <div>
                  <p className="text-foreground text-lg font-bold">{formatNaira(balance.unsettledTotal)}</p>
                  <p className="text-foreground-secondary text-xs">
                    {balance.unsettledOrders.length} unsettled order{balance.unsettledOrders.length !== 1 ? 's' : ''} — settle at front desk before checkout
                  </p>
                </div>
              ) : (
                <p className="text-foreground-secondary text-sm">{formatNaira(balance.settledTotal)} settled</p>
              )}
            </div>
          ) : null}
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
            onClick={() => handleCheckOut(true)}
            disabled={loading}
            className="flex-1 bg-warning text-foreground-inverse rounded-lg py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />}
            {loading ? 'Checking out…' : 'Force Check-Out'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default OverstayModal
