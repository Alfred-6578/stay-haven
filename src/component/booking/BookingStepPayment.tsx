'use client'
import React, { useState } from 'react'
import Button from '@/component/ui/Button'
import PaymentPolling from './PaymentPolling'
import { api } from '@/lib/api'
import { BsShieldCheck } from 'react-icons/bs'

interface Props {
  roomId: string
  checkIn: string
  checkOut: string
  adults: number
  specialRequests?: string
  pointsUsed: number
  discount: number
  totalAmount: number
  onSuccess: (bookingId: string) => void
}

const BookingStepPayment = ({
  roomId, checkIn, checkOut, adults, specialRequests,
  pointsUsed, discount, totalAmount,
  onSuccess,
}: Props) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [paymentState, setPaymentState] = useState<{
    reference: string
    bookingId: string
  } | null>(null)

  const finalAmount = Math.max(0, totalAmount - discount)

  const handlePay = async () => {
    setError('')
    setLoading(true)

    try {
      // Step 1: Create the booking
      const bookingRes = await api.post('/bookings', {
        roomId,
        checkIn,
        checkOut,
        adults,
        specialRequests: specialRequests || undefined,
      })
      const booking = bookingRes.data.data
      const bookingId = booking.id

      // Step 2: Initialize payment
      const paymentRes = await api.post('/payments/initialize', {
        bookingId,
        pointsUsed,
      })
      const { authorizationUrl, reference } = paymentRes.data.data

      setPaymentState({ reference, bookingId })

      // Step 3: Open Paystack popup
      window.open(authorizationUrl, '_blank', 'width=600,height=700,scrollbars=yes')
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to process payment'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  if (paymentState) {
    return (
      <PaymentPolling
        reference={paymentState.reference}
        bookingId={paymentState.bookingId}
        onSuccess={() => onSuccess(paymentState.bookingId)}
        onRetry={() => setPaymentState(null)}
      />
    )
  }

  return (
    <div className="max-w-xl mx-auto">
      <h2 className="font-heading text-2xl vsm:text-3xl font-bold text-foreground mb-2">Complete Payment</h2>
      <p className="text-foreground-tertiary text-sm mb-8">Review your final total and proceed to pay.</p>

      {/* Order summary */}
      <div className="border border-border rounded-2xl p-5 vsm:p-6 mb-6">
        <h4 className="font-semibold text-foreground text-sm mb-4">Order Summary</h4>
        <div className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between text-foreground-secondary">
            <span>Room total</span>
            <span>${totalAmount.toFixed(0)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-success">
              <span>Loyalty discount ({pointsUsed} pts)</span>
              <span>-${discount.toFixed(0)}</span>
            </div>
          )}
          <div className="flex justify-between text-foreground font-bold text-lg pt-3 border-t border-border mt-1">
            <span>Amount to pay</span>
            <span>${finalAmount.toFixed(0)}</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-danger-bg border border-danger/20 text-danger text-sm rounded-xl p-3 mb-6">
          {error}
        </div>
      )}

      <Button onClick={handlePay} loading={loading} fullWidth size="lg">
        Pay ${finalAmount.toFixed(0)} with Paystack
      </Button>

      {/* Trust signals */}
      <div className="flex flex-col gap-2.5 mt-6">
        {[
          'Your payment is secured by Paystack',
          'Free cancellation up to 24 hours before check-in',
          'Instant booking confirmation via email',
        ].map(text => (
          <div key={text} className="flex items-center gap-2 text-foreground-tertiary">
            <BsShieldCheck size={13} />
            <span className="text-xs">{text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default BookingStepPayment
