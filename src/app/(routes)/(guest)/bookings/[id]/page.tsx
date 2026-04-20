'use client'
import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { api } from '@/lib/api'
import Button from '@/component/ui/Button'
import LoyaltyTierBadge from '@/component/guest/LoyaltyTierBadge'
import PayRoomServiceModal from '@/component/room-service/PayRoomServiceModal'
import UpgradeOptionsModal from '@/component/booking/UpgradeOptionsModal'
import ExtendStayModal from '@/component/booking/ExtendStayModal'
import PaymentPolling from '@/component/booking/PaymentPolling'
import { toast } from 'sonner'
import { HiOutlineCalendar, HiOutlineUsers, HiOutlineArrowLeft, HiOutlineArrowUp, HiOutlineClock, HiOutlineCheck, HiOutlineX as HiOutlineXMark } from 'react-icons/hi'
import { MdOutlineKingBed } from 'react-icons/md'
import { BsShieldCheck } from 'react-icons/bs'

interface BookingDetail {
  id: string
  bookingRef: string
  checkIn: string
  checkOut: string
  adults: number
  children: number
  totalNights: number
  baseAmount: string | number
  discountAmount: string | number
  taxAmount: string | number
  totalAmount: string | number
  pointsUsed: number
  status: string
  specialRequests: string | null
  createdAt: string
  daysUntilCheckIn: number | null
  nightsStayed: number | null
  room: {
    number: string
    floor: number
    roomType: {
      name: string
      slug: string
      image: string | null
      amenities: string[]
    }
  }
  payment: {
    reference: string
    status: string
    amount: string | number
    currency: string
  } | null
  roomServiceOrders: Array<{ id: string; totalAmount: string | number; status: string; createdAt: string }>
  serviceBookings: Array<{ id: string; amount: string | number; status: string; service: { name: string; category: string } }>
  upgradeRequest: {
    id: string
    status: string
    paymentReference: string | null
    priceDifference: string | number
    requestedType: { name: string; basePrice: string | number }
  } | null
  stayExtension: { id: string; status: string; newCheckOut: string; additionalNights: number; additionalAmount: string | number; paymentReference: string | null } | null
  roomServiceBalance: {
    unsettledTotal: number
    settledTotal: number
    unsettledOrders: Array<{ id: string; totalAmount: number; status: string; createdAt: string }>
  }
}

const statusColors: Record<string, string> = {
  PENDING: 'bg-warning-bg text-warning',
  CONFIRMED: 'bg-success-bg text-success',
  CHECKED_IN: 'bg-success-bg text-success',
  CHECKED_OUT: 'bg-foreground-disabled/15 text-foreground-tertiary',
  CANCELLED: 'bg-danger-bg text-danger',
  NO_SHOW: 'bg-danger-bg text-danger',
}

export default function BookingDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [booking, setBooking] = useState<BookingDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [payOpen, setPayOpen] = useState(false)
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [upgradePaying, setUpgradePaying] = useState(false)
  const [upgradePayment, setUpgradePayment] = useState<{ reference: string } | null>(null)
  const [extendOpen, setExtendOpen] = useState(false)
  const [extendPaying, setExtendPaying] = useState(false)
  const [extendPayment, setExtendPayment] = useState<{ reference: string } | null>(null)

  const refreshBooking = async () => {
    try {
      const res = await api.get(`/guest/bookings/${id}`)
      setBooking(res.data.data)
    } catch {}
  }

  useEffect(() => {
    (async () => {
      await refreshBooking()
      setLoading(false)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const handleUpgradePay = async () => {
    if (!booking) return
    setUpgradePaying(true)
    try {
      const res = await api.post(`/bookings/${booking.id}/upgrade/pay-link`)
      const { authorizationUrl, reference } = res.data.data
      setUpgradePayment({ reference })
      window.open(authorizationUrl, '_blank', 'width=600,height=700,scrollbars=yes')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to start payment'
      toast.error(msg)
    } finally {
      setUpgradePaying(false)
    }
  }

  const handleExtendPay = async () => {
    if (!booking) return
    setExtendPaying(true)
    try {
      const res = await api.post(`/bookings/${booking.id}/extend/pay-link`)
      const { authorizationUrl, reference } = res.data.data
      setExtendPayment({ reference })
      window.open(authorizationUrl, '_blank', 'width=600,height=700,scrollbars=yes')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to start payment'
      toast.error(msg)
    } finally {
      setExtendPaying(false)
    }
  }

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this booking?')) return
    setCancelling(true)
    try {
      await api.patch(`/bookings/${id}/cancel`)
      setBooking(prev => prev ? { ...prev, status: 'CANCELLED' } : prev)
    } catch {}
    setCancelling(false)
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-6 w-32 bg-foreground-disabled/15 rounded mb-6" />
        <div className="h-64 bg-foreground-disabled/10 rounded-2xl mb-6" />
        <div className="h-48 bg-foreground-disabled/10 rounded-2xl" />
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="text-center py-16">
        <MdOutlineKingBed size={40} className="text-foreground-disabled mx-auto mb-3" />
        <h2 className="text-foreground font-semibold text-lg mb-2">Booking not found</h2>
        <Button href="/bookings" variant="outline" size="sm">Back to Bookings</Button>
      </div>
    )
  }

  const canCancel = ['PENDING', 'CONFIRMED'].includes(booking.status)

  return (
    <div>
      {/* Back */}
      <Link href="/bookings" className="inline-flex items-center gap-1.5 text-foreground-tertiary text-sm hover:text-foreground transition-colors mb-5">
        <HiOutlineArrowLeft size={14} /> Back to bookings
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-5 mb-8">
        <div className="relative w-full sm:w-48 h-36 rounded-xl overflow-hidden flex-shrink-0">
          <Image src={booking.room.roomType.image || '/room_2.jpeg'} alt="" fill className="object-cover" />
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
            <div>
              <h1 className="text-foreground font-heading text-xl vsm:text-2xl font-bold">{booking.room.roomType.name}</h1>
              <p className="text-foreground-tertiary text-sm">Room {booking.room.number} &middot; Floor {booking.room.floor}</p>
            </div>
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${statusColors[booking.status] || ''}`}>
              {booking.status.replace('_', ' ')}
            </span>
          </div>
          <p className="text-foreground-secondary text-sm font-mono">{booking.bookingRef}</p>
          {booking.daysUntilCheckIn !== null && booking.daysUntilCheckIn > 0 && (
            <span className="inline-block mt-2 text-xs font-medium bg-success-bg text-success px-2.5 py-0.5 rounded-full">
              {booking.daysUntilCheckIn} day{booking.daysUntilCheckIn !== 1 ? 's' : ''} until check-in
            </span>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Details */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Stay Details */}
          <div className="border border-border rounded-xl p-5">
            <h3 className="text-foreground font-semibold text-sm mb-4">Stay Details</h3>
            <div className="grid grid-cols-2 vsm:grid-cols-4 gap-4">
              {[
                { label: 'Check-in', value: formatDate(booking.checkIn) },
                { label: 'Check-out', value: formatDate(booking.checkOut) },
                { label: 'Nights', value: String(booking.totalNights) },
                { label: 'Guests', value: `${booking.adults} adult${booking.adults !== 1 ? 's' : ''}${booking.children ? `, ${booking.children} child` : ''}` },
              ].map(item => (
                <div key={item.label}>
                  <p className="text-foreground-tertiary text-xs mb-0.5">{item.label}</p>
                  <p className="text-foreground text-sm font-medium">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Price Breakdown */}
          <div className="border border-border rounded-xl p-5">
            <h3 className="text-foreground font-semibold text-sm mb-4">Price Breakdown</h3>
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between text-foreground-secondary">
                <span>Base amount</span>
                <span>${Number(booking.baseAmount).toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-foreground-secondary">
                <span>Tax (10%)</span>
                <span>${Number(booking.taxAmount).toFixed(0)}</span>
              </div>
              {Number(booking.discountAmount) > 0 && (
                <div className="flex justify-between text-success">
                  <span>Loyalty discount ({booking.pointsUsed} pts)</span>
                  <span>-${Number(booking.discountAmount).toFixed(0)}</span>
                </div>
              )}
              <div className="flex justify-between text-foreground font-bold text-base pt-2 border-t border-border mt-1">
                <span>Total</span>
                <span>${Number(booking.totalAmount).toFixed(0)}</span>
              </div>
            </div>
          </div>

          {/* Special Requests */}
          {booking.specialRequests && (
            <div className="border border-border rounded-xl p-5">
              <h3 className="text-foreground font-semibold text-sm mb-2">Special Requests</h3>
              <p className="text-foreground-secondary text-sm">{booking.specialRequests}</p>
            </div>
          )}

          {/* Services */}
          {(booking.roomServiceOrders.length > 0 || booking.serviceBookings.length > 0) && (
            <div className="border border-border rounded-xl p-5">
              <h3 className="text-foreground font-semibold text-sm mb-4">Services & Orders</h3>
              <div className="flex flex-col gap-2">
                {booking.roomServiceOrders.map(o => (
                  <div key={o.id} className="flex justify-between text-sm py-2 border-b border-border last:border-0">
                    <span className="text-foreground-secondary">Room Service</span>
                    <span className="text-foreground font-medium">${Number(o.totalAmount).toFixed(0)} &middot; {o.status}</span>
                  </div>
                ))}
                {booking.serviceBookings.map(s => (
                  <div key={s.id} className="flex justify-between text-sm py-2 border-b border-border last:border-0">
                    <span className="text-foreground-secondary">{s.service.name}</span>
                    <span className="text-foreground font-medium">${Number(s.amount).toFixed(0)} &middot; {s.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Payment + Actions */}
        <div className="flex flex-col gap-6">
          {/* Payment */}
          <div className="border border-border rounded-xl p-5">
            <h3 className="text-foreground font-semibold text-sm mb-4">Payment</h3>
            {booking.payment ? (
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-foreground-tertiary">Status</span>
                  <span className={`font-medium ${booking.payment.status === 'COMPLETED' ? 'text-success' : booking.payment.status === 'REFUNDED' ? 'text-warning' : 'text-foreground'}`}>
                    {booking.payment.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground-tertiary">Reference</span>
                  <span className="text-foreground font-mono text-xs">{booking.payment.reference}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground-tertiary">Amount</span>
                  <span className="text-foreground font-medium">${Number(booking.payment.amount).toFixed(0)}</span>
                </div>
              </div>
            ) : (
              <p className="text-foreground-tertiary text-sm">No payment recorded</p>
            )}
          </div>

          {/* Room Service Balance */}
          {booking.roomServiceBalance && (booking.roomServiceBalance.unsettledTotal > 0 || booking.roomServiceBalance.settledTotal > 0) && (
            <div className={`border rounded-xl p-5 ${booking.roomServiceBalance.unsettledTotal > 0 ? 'border-warning/30 bg-warning-bg/30' : 'border-border'}`}>
              <h3 className="text-foreground font-semibold text-sm mb-3">Room Service</h3>
              {booking.roomServiceBalance.unsettledTotal > 0 ? (
                <>
                  <p className="text-foreground-tertiary text-[11px] uppercase tracking-wider font-semibold">Outstanding balance</p>
                  <p className="text-foreground text-2xl font-bold mt-1">₦{booking.roomServiceBalance.unsettledTotal.toLocaleString()}</p>
                  <p className="text-foreground-secondary text-xs mt-2">
                    {booking.roomServiceBalance.unsettledOrders.length} order{booking.roomServiceBalance.unsettledOrders.length !== 1 ? 's' : ''} pending payment. Pay now or settle at check-out.
                  </p>
                  <button
                    onClick={() => setPayOpen(true)}
                    className="mt-3 w-full bg-foreground text-foreground-inverse rounded-lg py-2.5 text-sm font-semibold hover:opacity-90"
                  >
                    Pay Now
                  </button>
                  {booking.roomServiceBalance.settledTotal > 0 && (
                    <p className="text-foreground-tertiary text-xs mt-1">
                      ₦{booking.roomServiceBalance.settledTotal.toLocaleString()} already settled
                    </p>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-foreground-secondary text-sm">Settled</span>
                  <span className="text-foreground font-semibold text-sm">₦{booking.roomServiceBalance.settledTotal.toLocaleString()}</span>
                </div>
              )}
            </div>
          )}

          {/* Upgrade Section */}
          {['CONFIRMED', 'CHECKED_IN'].includes(booking.status) && (
            <div className="border border-border rounded-xl p-5">
              <h3 className="text-foreground font-semibold text-sm mb-3 flex items-center gap-2">
                <HiOutlineArrowUp size={16} />
                Room Upgrade
              </h3>
              {booking.upgradeRequest ? (
                <div>
                  {(() => {
                    const ur = booking.upgradeRequest
                    const awaitingPayment = ur.status === 'PENDING' && !!ur.paymentReference
                    const statusLabel = awaitingPayment ? 'AWAITING PAYMENT' : ur.status
                    const statusStyle = awaitingPayment
                      ? 'bg-[#E0F2FE] text-[#0369A1]'
                      : ur.status === 'PENDING'
                        ? 'bg-warning-bg text-warning'
                        : ur.status === 'APPROVED'
                          ? 'bg-success-bg text-success'
                          : 'bg-danger-bg text-danger'
                    return (
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-foreground-secondary text-sm">
                          {ur.requestedType.name}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${statusStyle}`}>
                          {statusLabel}
                        </span>
                      </div>
                    )
                  })()}
                  {booking.upgradeRequest.status === 'PENDING' && !booking.upgradeRequest.paymentReference && (
                    <p className="text-foreground-tertiary text-xs flex items-center gap-1">
                      <HiOutlineClock size={12} />
                      Your upgrade request is under review.
                    </p>
                  )}
                  {booking.upgradeRequest.status === 'PENDING' && booking.upgradeRequest.paymentReference && (
                    <>
                      <p className="text-foreground text-xs mb-3">
                        Your upgrade is approved! Pay <strong>₦{Number(booking.upgradeRequest.priceDifference).toLocaleString()}</strong> to confirm your new room.
                      </p>
                      <button
                        onClick={handleUpgradePay}
                        disabled={upgradePaying}
                        className="w-full bg-foreground text-foreground-inverse rounded-lg py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {upgradePaying && <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                        {upgradePaying ? 'Opening Paystack…' : `Pay ₦${Number(booking.upgradeRequest.priceDifference).toLocaleString()}`}
                      </button>
                    </>
                  )}
                  {booking.upgradeRequest.status === 'APPROVED' && (
                    <p className="text-success text-xs flex items-center gap-1">
                      <HiOutlineCheck size={12} />
                      Upgrade confirmed! Check your new room assignment.
                    </p>
                  )}
                  {booking.upgradeRequest.status === 'REJECTED' && (
                    <>
                      <p className="text-foreground-tertiary text-xs mb-2 flex items-center gap-1">
                        <HiOutlineXMark size={12} />
                        This upgrade wasn&apos;t available. You can try again.
                      </p>
                      <button
                        onClick={() => setUpgradeOpen(true)}
                        className="w-full border border-border rounded-lg py-2 text-sm text-foreground font-medium hover:bg-foreground-disabled/5"
                      >
                        Request New Upgrade
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <div>
                  <p className="text-foreground-tertiary text-xs mb-3">
                    Want a better room? Check available upgrades for your stay dates.
                  </p>
                  <button
                    onClick={() => setUpgradeOpen(true)}
                    className="w-full bg-foreground text-foreground-inverse rounded-lg py-2.5 text-sm font-semibold hover:opacity-90"
                  >
                    Request Room Upgrade
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Extend Stay Section */}
          {['CONFIRMED', 'CHECKED_IN'].includes(booking.status) && (
            <div className="border border-border rounded-xl p-5">
              <h3 className="text-foreground font-semibold text-sm mb-3 flex items-center gap-2">
                <HiOutlineCalendar size={16} />
                Extend Stay
              </h3>
              {booking.stayExtension ? (
                (() => {
                  const ex = booking.stayExtension
                  const awaitingPayment = ex.status === 'PENDING' && !!ex.paymentReference
                  const statusLabel = awaitingPayment ? 'AWAITING PAYMENT' : ex.status
                  const statusStyle = awaitingPayment
                    ? 'bg-[#E0F2FE] text-[#0369A1]'
                    : ex.status === 'PENDING'
                      ? 'bg-warning-bg text-warning'
                      : ex.status === 'APPROVED'
                        ? 'bg-success-bg text-success'
                        : 'bg-danger-bg text-danger'
                  const newCheckout = new Date(ex.newCheckOut).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })
                  return (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-foreground-secondary text-sm">
                          +{ex.additionalNights} night{ex.additionalNights !== 1 ? 's' : ''} · {newCheckout}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${statusStyle}`}>
                          {statusLabel}
                        </span>
                      </div>
                      {ex.status === 'PENDING' && !ex.paymentReference && (
                        <p className="text-foreground-tertiary text-xs flex items-center gap-1">
                          <HiOutlineClock size={12} />
                          Your extension request is under review.
                        </p>
                      )}
                      {awaitingPayment && (
                        <>
                          <p className="text-foreground text-xs mb-3">
                            Your extension is approved! Pay to confirm your new checkout date.
                          </p>
                          <button
                            onClick={handleExtendPay}
                            disabled={extendPaying}
                            className="w-full bg-foreground text-foreground-inverse rounded-lg py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            {extendPaying && <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                            {extendPaying ? 'Opening Paystack…' : 'Pay Now'}
                          </button>
                        </>
                      )}
                      {ex.status === 'APPROVED' && (
                        <p className="text-success text-xs flex items-center gap-1">
                          <HiOutlineCheck size={12} />
                          Your stay has been extended.
                        </p>
                      )}
                      {ex.status === 'REJECTED' && (
                        <>
                          <p className="text-foreground-tertiary text-xs mb-2 flex items-center gap-1">
                            <HiOutlineXMark size={12} />
                            Your previous request was declined.
                          </p>
                          <button
                            onClick={() => setExtendOpen(true)}
                            className="w-full border border-border rounded-lg py-2 text-sm text-foreground font-medium hover:bg-foreground-disabled/5"
                          >
                            Try Again
                          </button>
                        </>
                      )}
                    </div>
                  )
                })()
              ) : (
                <div>
                  <p className="text-foreground-tertiary text-xs mb-3">
                    Need a few more days? Extend your stay if your room is available.
                  </p>
                  <button
                    onClick={() => setExtendOpen(true)}
                    className="w-full bg-foreground text-foreground-inverse rounded-lg py-2.5 text-sm font-semibold hover:opacity-90"
                  >
                    Extend Stay
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2">
            {canCancel && (
              <Button
                onClick={handleCancel}
                loading={cancelling}
                variant="danger"
                fullWidth
              >
                Cancel Booking
              </Button>
            )}
            <Button href={`/bookings/${booking.id}/receipt`} variant="outline" fullWidth>
              View Receipt
            </Button>
          </div>

          {/* Trust */}
          <div className="flex flex-col gap-2">
            {['Free cancellation 24hrs before', 'Secure payment', 'Instant confirmation'].map(t => (
              <div key={t} className="flex items-center gap-2 text-foreground-tertiary">
                <BsShieldCheck size={12} />
                <span className="text-xs">{t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {booking.roomServiceBalance && booking.roomServiceBalance.unsettledTotal > 0 && (
        <PayRoomServiceModal
          open={payOpen}
          bookingId={booking.id}
          amount={booking.roomServiceBalance.unsettledTotal}
          onClose={() => setPayOpen(false)}
          onPaid={() => {
            setPayOpen(false)
            refreshBooking()
          }}
        />
      )}

      {upgradeOpen && (
        <UpgradeOptionsModal
          bookingId={booking.id}
          currentRoomType={booking.room.roomType.name}
          currentAmenities={booking.room.roomType.amenities}
          onClose={() => setUpgradeOpen(false)}
          onSuccess={refreshBooking}
        />
      )}

      {extendOpen && (
        <ExtendStayModal
          bookingId={booking.id}
          currentCheckOut={booking.checkOut}
          onClose={() => setExtendOpen(false)}
          onSuccess={refreshBooking}
        />
      )}

      {upgradePayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-foreground/40" />
          <div className="relative w-full max-w-md bg-foreground-inverse rounded-2xl shadow-xl p-6">
            <PaymentPolling
              reference={upgradePayment.reference}
              bookingId={booking.id}
              statusPath={`/payments/upgrade/status/${upgradePayment.reference}`}
              onSuccess={() => {
                setUpgradePayment(null)
                refreshBooking()
                toast.success('Upgrade confirmed — your new room is ready!')
              }}
              onRetry={() => setUpgradePayment(null)}
            />
          </div>
        </div>
      )}

      {extendPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-foreground/40" />
          <div className="relative w-full max-w-md bg-foreground-inverse rounded-2xl shadow-xl p-6">
            <PaymentPolling
              reference={extendPayment.reference}
              bookingId={booking.id}
              statusPath={`/payments/extension/status/${extendPayment.reference}`}
              onSuccess={() => {
                setExtendPayment(null)
                refreshBooking()
                toast.success('Stay extended!')
              }}
              onRetry={() => setExtendPayment(null)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
