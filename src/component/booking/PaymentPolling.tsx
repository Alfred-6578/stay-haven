'use client'
import React, { useEffect, useState, useRef } from 'react'
import { api } from '@/lib/api'
import Button from '@/component/ui/Button'

interface Props {
  reference: string
  bookingId: string
  onSuccess: () => void
  onRetry: () => void
}

const PaymentPolling = ({ reference, bookingId, onSuccess, onRetry }: Props) => {
  const [status, setStatus] = useState<'waiting' | 'success' | 'failed' | 'timeout'>('waiting')
  const attempts = useRef(0)
  const maxAttempts = 20
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    intervalRef.current = setInterval(async () => {
      attempts.current++

      try {
        const res = await api.get(`/payments/status/${reference}`)
        const paymentStatus = res.data.data?.status

        if (paymentStatus === 'COMPLETED') {
          setStatus('success')
          if (intervalRef.current) clearInterval(intervalRef.current)
          setTimeout(onSuccess, 1500)
        } else if (paymentStatus === 'FAILED') {
          setStatus('failed')
          if (intervalRef.current) clearInterval(intervalRef.current)
        }
      } catch {
        // Keep polling
      }

      if (attempts.current >= maxAttempts) {
        setStatus('timeout')
        if (intervalRef.current) clearInterval(intervalRef.current)
      }
    }, 2000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [reference, onSuccess])

  return (
    <div className="max-w-md mx-auto text-center py-10">
      {status === 'waiting' && (
        <>
          <div className="w-14 h-14 border-3 border-foreground border-t-transparent rounded-full animate-spin mx-auto mb-6" />
          <h3 className="font-heading text-xl font-bold text-foreground mb-2">Processing Payment</h3>
          <p className="text-foreground-tertiary text-sm">
            Please complete payment in the Paystack window. We&apos;re waiting for confirmation...
          </p>
          <p className="text-foreground-disabled text-xs mt-4">
            Attempt {attempts.current} of {maxAttempts}
          </p>
        </>
      )}

      {status === 'success' && (
        <>
          <div className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
            <svg className="w-7 h-7 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="font-heading text-xl font-bold text-foreground mb-2">Payment Successful!</h3>
          <p className="text-foreground-tertiary text-sm">Redirecting to your booking...</p>
        </>
      )}

      {status === 'failed' && (
        <>
          <div className="w-14 h-14 rounded-full bg-danger/10 flex items-center justify-center mx-auto mb-6">
            <span className="text-danger text-2xl font-bold">!</span>
          </div>
          <h3 className="font-heading text-xl font-bold text-foreground mb-2">Payment Failed</h3>
          <p className="text-foreground-tertiary text-sm mb-6">
            The payment could not be processed. Please try again.
          </p>
          <Button onClick={onRetry}>Try Again</Button>
        </>
      )}

      {status === 'timeout' && (
        <>
          <div className="w-14 h-14 rounded-full bg-warning-bg flex items-center justify-center mx-auto mb-6">
            <span className="text-warning text-2xl font-bold">?</span>
          </div>
          <h3 className="font-heading text-xl font-bold text-foreground mb-2">Verification Timeout</h3>
          <p className="text-foreground-tertiary text-sm mb-6">
            We couldn&apos;t confirm your payment in time. If you were charged, please contact support with reference: <span className="text-foreground font-mono text-xs">{reference}</span>
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={onRetry} variant="outline">Retry</Button>
            <Button href={`/guest/bookings/${bookingId}`}>View Booking</Button>
          </div>
        </>
      )}
    </div>
  )
}

export default PaymentPolling
