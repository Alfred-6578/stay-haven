'use client'
import React, { useEffect, useState } from 'react'
import { HiOutlineX, HiOutlineExclamation, HiOutlineCash, HiOutlineCheck } from 'react-icons/hi'
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

interface Balance {
  unsettledTotal: number
  settledTotal: number
  unsettledOrders: Array<{
    id: string
    totalAmount: number
    status: string
    deliveredAt: string | null
    createdAt: string
  }>
}

interface Props {
  booking: CheckOutBooking | null
  onClose: () => void
  onSuccess: () => void
}

type Method = 'CASH' | 'CARD' | 'BANK_TRANSFER'

const METHOD_LABELS: Record<Method, string> = {
  CASH: 'Cash',
  CARD: 'Card',
  BANK_TRANSFER: 'Bank Transfer',
}

const formatNaira = (v: number | string) =>
  `₦${new Intl.NumberFormat('en-NG', { maximumFractionDigits: 0 }).format(Number(v))}`

const CheckOutModal = ({ booking, onClose, onSuccess }: Props) => {
  const [balance, setBalance] = useState<Balance | null>(null)
  const [balanceLoading, setBalanceLoading] = useState(false)
  const [settling, setSettling] = useState(false)
  const [checkingOut, setCheckingOut] = useState(false)
  const [method, setMethod] = useState<Method>('CASH')
  const [reference, setReference] = useState('')

  // Fetch balance whenever booking changes
  useEffect(() => {
    if (!booking) { setBalance(null); return }
    setBalanceLoading(true)
    api.get(`/bookings/${booking.id}`)
      .then(res => setBalance(res.data.data.roomServiceBalance || null))
      .catch(() => setBalance(null))
      .finally(() => setBalanceLoading(false))
  }, [booking])

  // Reset form when modal reopens
  useEffect(() => {
    if (!booking) return
    setMethod('CASH')
    setReference('')
  }, [booking?.id])

  if (!booking) return null

  const hasPendingOrders = booking.roomServiceOrders.length > 0
  const hasUnsettled = !!balance && balance.unsettledTotal > 0

  const settle = async () => {
    setSettling(true)
    try {
      await api.post(`/staff/bookings/${booking.id}/settle-room-service`, {
        method,
        reference: reference.trim() || undefined,
      })
      toast.success('Bill settled')
      // Refresh balance
      const res = await api.get(`/bookings/${booking.id}`)
      setBalance(res.data.data.roomServiceBalance || null)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Settlement failed'
      toast.error(msg)
    } finally {
      setSettling(false)
    }
  }

  const checkOut = async (force: boolean) => {
    setCheckingOut(true)
    try {
      await api.post(`/staff/bookings/${booking.id}/checkout${force ? '?force=true' : ''}`)
      toast.success(`${booking.guest.firstName} ${booking.guest.lastName} checked out of Room ${booking.room.number}`)
      onSuccess()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Check-out failed'
      toast.error(msg)
    } finally {
      setCheckingOut(false)
    }
  }

  const busy = settling || checkingOut

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/40" onClick={busy ? undefined : onClose} />
      <div className="relative w-full max-w-md bg-foreground-inverse rounded-2xl shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <p className="text-foreground-tertiary text-xs uppercase tracking-wider">Check-Out</p>
            <h2 className="text-foreground font-bold text-lg">{booking.bookingRef}</h2>
          </div>
          <button onClick={onClose} disabled={busy} className="p-2 text-foreground-tertiary hover:text-foreground">
            <HiOutlineX size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Guest & room */}
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

          {/* Pending (undelivered) orders warning */}
          {hasPendingOrders && (
            <div className="bg-warning-bg/30 border border-warning/30 rounded-xl p-3.5">
              <div className="flex items-start gap-2">
                <HiOutlineExclamation size={16} className="text-warning flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-foreground font-semibold text-xs">
                    {booking.roomServiceOrders.length} undelivered order{booking.roomServiceOrders.length !== 1 ? 's' : ''}
                  </p>
                  <p className="text-foreground-secondary text-xs mt-0.5">
                    Verify with the guest before proceeding.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Room service balance */}
          {balanceLoading ? (
            <div className="h-24 bg-foreground-disabled/10 rounded-xl animate-pulse" />
          ) : balance && (balance.unsettledTotal > 0 || balance.settledTotal > 0) ? (
            <div className={`rounded-xl p-4 ${hasUnsettled ? 'bg-danger-bg/40 border border-danger/30' : 'bg-success-bg border border-success/20'}`}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <HiOutlineCash size={16} className={hasUnsettled ? 'text-danger' : 'text-success'} />
                  <p className="text-foreground font-semibold text-xs uppercase tracking-wider">Room Service Bill</p>
                </div>
                {!hasUnsettled && (
                  <span className="bg-success text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Settled
                  </span>
                )}
              </div>

              {hasUnsettled && (
                <>
                  <p className="text-foreground text-2xl font-bold">{formatNaira(balance.unsettledTotal)}</p>
                  <p className="text-foreground-secondary text-xs mt-0.5">
                    {balance.unsettledOrders.length} order{balance.unsettledOrders.length !== 1 ? 's' : ''} · unsettled
                  </p>

                  {/* Payment method */}
                  <div className="mt-3">
                    <p className="text-foreground-tertiary text-[10px] uppercase tracking-wider font-semibold mb-1.5">Settle via</p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(Object.keys(METHOD_LABELS) as Method[]).map(m => (
                        <button
                          key={m}
                          onClick={() => setMethod(m)}
                          disabled={busy}
                          className={`py-1.5 rounded-md border text-[11px] font-semibold transition-colors ${
                            method === m
                              ? 'border-foreground bg-foreground text-foreground-inverse'
                              : 'border-border text-foreground bg-foreground-inverse hover:bg-foreground-disabled/5'
                          }`}
                        >
                          {METHOD_LABELS[m]}
                        </button>
                      ))}
                    </div>
                    {method !== 'CASH' && (
                      <input
                        value={reference}
                        onChange={e => setReference(e.target.value)}
                        disabled={busy}
                        placeholder={method === 'CARD' ? 'Terminal ref / last 4' : 'Transfer ref'}
                        className="mt-2 w-full bg-foreground-inverse border border-border rounded-md px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-foreground/20"
                      />
                    )}
                    <button
                      onClick={settle}
                      disabled={busy}
                      className="mt-2 w-full bg-foreground text-foreground-inverse rounded-md py-2 text-xs font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      {settling && <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                      {settling ? 'Settling...' : `Settle ${formatNaira(balance.unsettledTotal)}`}
                    </button>
                  </div>
                </>
              )}

              {!hasUnsettled && balance.settledTotal > 0 && (
                <div className="flex items-center gap-2">
                  <HiOutlineCheck size={14} className="text-success" />
                  <p className="text-foreground-secondary text-sm">
                    {formatNaira(balance.settledTotal)} paid during stay
                  </p>
                </div>
              )}
            </div>
          ) : null}
        </div>

        <div className="flex gap-2 px-5 py-4 border-t border-border">
          <button
            onClick={onClose}
            disabled={busy}
            className="flex-1 border border-border rounded-lg py-2.5 text-sm text-foreground hover:bg-foreground-disabled/5"
          >
            Cancel
          </button>
          <button
            onClick={() => checkOut(hasPendingOrders || hasUnsettled)}
            disabled={busy || hasUnsettled}
            title={hasUnsettled ? 'Settle the bill before checking out' : undefined}
            className={`flex-1 rounded-lg py-2.5 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
              hasPendingOrders ? 'bg-warning text-foreground-inverse' : 'bg-foreground text-foreground-inverse'
            }`}
          >
            {checkingOut ? 'Checking out...' : hasPendingOrders ? 'Force Check-Out' : 'Confirm Check-Out'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default CheckOutModal
