'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import {
  HiOutlineX,
  HiOutlineMail,
  HiOutlinePhone,
  HiOutlineCalendar,
  HiOutlineExternalLink,
  HiOutlineCheck,
  HiOutlineBan,
  HiOutlineX as HiOutlineCross,
} from 'react-icons/hi'
import ConfirmModal from '@/component/ui/ConfirmModal'

interface BookingDetail {
  id: string
  bookingRef: string
  status: string
  checkIn: string
  checkOut: string
  totalNights: number
  adults: number
  children: number
  baseAmount: number | string
  discountAmount: number | string
  taxAmount: number | string
  totalAmount: number | string
  pointsUsed: number
  specialRequests: string | null
  createdAt: string
  guest: {
    id: string
    firstName: string
    lastName: string
    email: string
    phone: string | null
  }
  room: {
    number: string
    floor: number
    roomType: { name: string }
  }
  payment: {
    reference: string
    amount: number | string
    status: string
    type: string
    createdAt: string
  } | null
  roomServiceOrders?: Array<{
    id: string
    status: string
    totalAmount: number | string
    createdAt: string
  }>
}

interface Props {
  bookingId: string | null
  onClose: () => void
  onChanged: () => void
}

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: 'bg-success-bg text-success',
  CHECKED_IN: 'bg-[#EAF3DE] text-[#4A6B2E]',
  CHECKED_OUT: 'bg-foreground-disabled/15 text-foreground-secondary',
  PENDING: 'bg-warning-bg text-warning',
  CANCELLED: 'bg-danger-bg text-danger',
  NO_SHOW: 'bg-danger-bg text-danger',
}

const formatNaira = (v: number | string) =>
  `₦${new Intl.NumberFormat('en-NG', { maximumFractionDigits: 0 }).format(Number(v))}`

const BookingDetailDrawer = ({ bookingId, onClose, onChanged }: Props) => {
  const [booking, setBooking] = useState<BookingDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<'confirm' | 'noshow' | 'cancel' | null>(null)
  const [confirmAction, setConfirmAction] = useState<'confirm' | 'noshow' | 'cancel' | null>(null)

  useEffect(() => {
    if (!bookingId) { setBooking(null); return }
    setLoading(true)
    api.get(`/bookings/${bookingId}`)
      .then(res => setBooking(res.data.data))
      .catch(() => toast.error('Failed to load booking'))
      .finally(() => setLoading(false))
  }, [bookingId])

  useEffect(() => {
    if (!bookingId) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && !actionLoading) onClose() }
    window.addEventListener('keydown', handler)
    const orig = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = orig
    }
  }, [bookingId, actionLoading, onClose])

  const runAction = async () => {
    if (!booking || !confirmAction) return
    setActionLoading(confirmAction)
    try {
      if (confirmAction === 'confirm') {
        await api.patch(`/admin/bookings/${booking.id}`, { status: 'CONFIRMED' })
        toast.success('Booking confirmed')
      } else if (confirmAction === 'noshow') {
        await api.patch(`/admin/bookings/${booking.id}`, { status: 'NO_SHOW' })
        toast.success('Marked as no-show')
      } else if (confirmAction === 'cancel') {
        await api.patch(`/bookings/${booking.id}/cancel`)
        toast.success('Booking cancelled')
      }
      setConfirmAction(null)
      onChanged()
      onClose()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Action failed'
      toast.error(msg)
    } finally {
      setActionLoading(null)
    }
  }

  if (!bookingId) return null

  const confirmConfig = confirmAction && booking ? {
    confirm: { title: `Confirm ${booking.bookingRef}?`, message: 'Mark this booking as confirmed and notify the guest.', label: 'Confirm Booking', variant: 'default' as const },
    noshow: { title: 'Mark as no-show?', message: `${booking.guest.firstName} ${booking.guest.lastName} didn't check in. This marks the booking as NO_SHOW.`, label: 'Mark No-Show', variant: 'danger' as const },
    cancel: { title: 'Cancel booking?', message: `This will cancel ${booking.bookingRef}. Refund policies apply.`, label: 'Cancel Booking', variant: 'danger' as const },
  }[confirmAction] : null

  return (
    <>
      <div className="fixed inset-0 z-[55] flex" role="dialog" aria-modal="true">
        <div className="absolute inset-0 bg-foreground/40 animate-modal-backdrop" onClick={actionLoading ? undefined : onClose} />
        <div className="relative ml-auto w-full max-w-xl bg-foreground-inverse h-full shadow-2xl flex flex-col animate-modal-content">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
            <div>
              <p className="text-foreground-tertiary text-xs">Booking</p>
              <h2 className="text-foreground font-heading font-bold text-lg">{booking?.bookingRef || '...'}</h2>
            </div>
            <button onClick={onClose} disabled={!!actionLoading} className="p-2 text-foreground-tertiary hover:text-foreground">
              <HiOutlineX size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto">
            {loading || !booking ? (
              <div className="p-6 space-y-4">
                {[0, 1, 2, 3].map(i => <div key={i} className="h-20 bg-foreground-disabled/10 rounded-xl animate-pulse" />)}
              </div>
            ) : (
              <div className="p-6 space-y-6">
                {/* Status */}
                <div className="flex items-center gap-2">
                  <span className={`${STATUS_COLORS[booking.status]} text-[11px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider`}>
                    {booking.status.replace('_', ' ')}
                  </span>
                  <span className="text-foreground-tertiary text-xs">
                    Booked {new Date(booking.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>

                {/* Guest */}
                <section>
                  <h3 className="text-foreground font-semibold text-sm mb-2">Guest</h3>
                  <div className="border border-border rounded-xl p-4 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-foreground font-semibold">
                        {booking.guest.firstName} {booking.guest.lastName}
                      </p>
                      <Link
                        href={`/admin/guests/${booking.guest.id}`}
                        className="text-foreground text-xs font-medium hover:underline flex items-center gap-1"
                      >
                        Profile <HiOutlineExternalLink size={11} />
                      </Link>
                    </div>
                    <p className="text-foreground-secondary text-xs flex items-center gap-1.5">
                      <HiOutlineMail size={13} /> {booking.guest.email}
                    </p>
                    {booking.guest.phone && (
                      <p className="text-foreground-secondary text-xs flex items-center gap-1.5">
                        <HiOutlinePhone size={13} /> {booking.guest.phone}
                      </p>
                    )}
                  </div>
                </section>

                {/* Stay */}
                <section>
                  <h3 className="text-foreground font-semibold text-sm mb-2">Stay</h3>
                  <div className="border border-border rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <HiOutlineCalendar size={14} className="text-foreground-tertiary" />
                      <p className="text-foreground text-sm">
                        {new Date(booking.checkIn).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        {' → '}
                        {new Date(booking.checkOut).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <p className="text-foreground-tertiary text-[10px] uppercase tracking-wider">Room</p>
                        <p className="text-foreground font-medium">{booking.room.number}</p>
                      </div>
                      <div>
                        <p className="text-foreground-tertiary text-[10px] uppercase tracking-wider">Type</p>
                        <p className="text-foreground font-medium">{booking.room.roomType.name}</p>
                      </div>
                      <div>
                        <p className="text-foreground-tertiary text-[10px] uppercase tracking-wider">Nights</p>
                        <p className="text-foreground font-medium">{booking.totalNights}</p>
                      </div>
                      <div>
                        <p className="text-foreground-tertiary text-[10px] uppercase tracking-wider">Adults</p>
                        <p className="text-foreground font-medium">{booking.adults}</p>
                      </div>
                      <div>
                        <p className="text-foreground-tertiary text-[10px] uppercase tracking-wider">Children</p>
                        <p className="text-foreground font-medium">{booking.children}</p>
                      </div>
                      <div>
                        <p className="text-foreground-tertiary text-[10px] uppercase tracking-wider">Floor</p>
                        <p className="text-foreground font-medium">{booking.room.floor}</p>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Price */}
                <section>
                  <h3 className="text-foreground font-semibold text-sm mb-2">Price Breakdown</h3>
                  <div className="border border-border rounded-xl p-4 space-y-2 text-sm">
                    <Row label="Base" value={formatNaira(booking.baseAmount)} />
                    {Number(booking.discountAmount) > 0 && (
                      <Row label="Discount" value={`- ${formatNaira(booking.discountAmount)}`} valueClass="text-success" />
                    )}
                    {booking.pointsUsed > 0 && <Row label="Points Used" value={booking.pointsUsed.toLocaleString()} />}
                    <Row label="Tax" value={formatNaira(booking.taxAmount)} />
                    <div className="border-t border-border pt-2 mt-2 flex justify-between">
                      <span className="text-foreground font-semibold">Total</span>
                      <span className="text-foreground font-bold">{formatNaira(booking.totalAmount)}</span>
                    </div>
                  </div>
                </section>

                {/* Payment */}
                {booking.payment && (
                  <section>
                    <h3 className="text-foreground font-semibold text-sm mb-2">Payment</h3>
                    <div className="border border-border rounded-xl p-4 space-y-1.5 text-sm">
                      <div className="flex justify-between">
                        <span className="text-foreground-tertiary">Reference</span>
                        <span className="text-foreground font-mono text-xs">{booking.payment.reference}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-foreground-tertiary">Status</span>
                        <span className="text-foreground font-medium">{booking.payment.status}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-foreground-tertiary">Amount</span>
                        <span className="text-foreground">{formatNaira(booking.payment.amount)}</span>
                      </div>
                    </div>
                  </section>
                )}

                {/* Service orders */}
                {booking.roomServiceOrders && booking.roomServiceOrders.length > 0 && (
                  <section>
                    <h3 className="text-foreground font-semibold text-sm mb-2">Service Orders ({booking.roomServiceOrders.length})</h3>
                    <div className="border border-border rounded-xl divide-y divide-border">
                      {booking.roomServiceOrders.map(o => (
                        <div key={o.id} className="p-3 flex items-center justify-between text-sm">
                          <div>
                            <p className="text-foreground font-medium text-xs">{o.status.replace('_', ' ')}</p>
                            <p className="text-foreground-tertiary text-[11px]">
                              {new Date(o.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </p>
                          </div>
                          <p className="text-foreground text-sm">{formatNaira(o.totalAmount)}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Special requests */}
                {booking.specialRequests && (
                  <section>
                    <h3 className="text-foreground font-semibold text-sm mb-2">Special Requests</h3>
                    <div className="border border-border rounded-xl p-4 text-sm text-foreground-secondary">
                      {booking.specialRequests}
                    </div>
                  </section>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          {booking && !loading && (
            <div className="border-t border-border px-6 py-4 bg-background-secondary flex-shrink-0 flex gap-2 flex-wrap">
              {booking.status === 'PENDING' && (
                <button
                  onClick={() => setConfirmAction('confirm')}
                  disabled={!!actionLoading}
                  className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 bg-[#0B1B3A] text-white rounded-lg py-2 text-xs font-semibold hover:opacity-90 disabled:opacity-50"
                >
                  <HiOutlineCheck size={14} />
                  Confirm
                </button>
              )}
              {['CONFIRMED'].includes(booking.status) && (
                <button
                  onClick={() => setConfirmAction('noshow')}
                  disabled={!!actionLoading}
                  className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 border border-danger/30 text-danger rounded-lg py-2 text-xs font-semibold hover:bg-danger-bg disabled:opacity-50"
                >
                  <HiOutlineBan size={14} />
                  No-Show
                </button>
              )}
              {['PENDING', 'CONFIRMED'].includes(booking.status) && (
                <button
                  onClick={() => setConfirmAction('cancel')}
                  disabled={!!actionLoading}
                  className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 border border-border text-foreground-secondary rounded-lg py-2 text-xs font-semibold hover:bg-foreground-disabled/5 disabled:opacity-50"
                >
                  <HiOutlineCross size={14} />
                  Cancel
                </button>
              )}
              {!['PENDING', 'CONFIRMED'].includes(booking.status) && (
                <p className="text-foreground-tertiary text-xs text-center w-full py-2">
                  No status changes available for {booking.status.replace('_', ' ').toLowerCase()} bookings.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        open={!!confirmAction}
        title={confirmConfig?.title || ''}
        message={confirmConfig?.message || ''}
        confirmLabel={confirmConfig?.label || 'Confirm'}
        variant={confirmConfig?.variant}
        loading={!!actionLoading}
        onConfirm={runAction}
        onCancel={() => !actionLoading && setConfirmAction(null)}
      />
    </>
  )
}

function Row({ label, value, valueClass = 'text-foreground' }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-foreground-tertiary">{label}</span>
      <span className={valueClass}>{value}</span>
    </div>
  )
}

export default BookingDetailDrawer
