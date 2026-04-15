'use client'
import React, { useEffect, useRef, useState } from 'react'
import { HiOutlineX, HiOutlineCheckCircle, HiOutlineExclamation, HiOutlineExternalLink } from 'react-icons/hi'
import { api } from '@/lib/api'
import { toast } from 'sonner'

interface Props {
  open: boolean
  bookingId: string
  amount: number
  onClose: () => void
  onPaid: () => void
}

type Phase = 'idle' | 'initializing' | 'waiting' | 'success' | 'failed' | 'timeout'

const formatNaira = (v: number) =>
  `₦${new Intl.NumberFormat('en-NG', { maximumFractionDigits: 0 }).format(v)}`

const PayRoomServiceModal = ({ open, bookingId, amount, onClose, onPaid }: Props) => {
  const [phase, setPhase] = useState<Phase>('idle')
  const [reference, setReference] = useState<string | null>(null)
  const [authUrl, setAuthUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const pollAttempts = useRef(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const popupRef = useRef<Window | null>(null)

  // Reset on open/close
  useEffect(() => {
    if (!open) {
      setPhase('idle')
      setReference(null)
      setAuthUrl(null)
      setError(null)
      if (intervalRef.current) clearInterval(intervalRef.current)
      pollAttempts.current = 0
      return
    }
  }, [open])

  // Escape + scroll lock
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && phase !== 'waiting') onClose() }
    window.addEventListener('keydown', handler)
    const orig = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = orig
    }
  }, [open, phase, onClose])

  const startPolling = (ref: string) => {
    pollAttempts.current = 0
    intervalRef.current = setInterval(async () => {
      pollAttempts.current++
      try {
        const res = await api.get(`/payments/room-service/status/${ref}`)
        const status = res.data.data?.status
        if (status === 'COMPLETED') {
          if (intervalRef.current) clearInterval(intervalRef.current)
          setPhase('success')
          toast.success('Payment confirmed')
          setTimeout(() => {
            onPaid()
          }, 1200)
        } else if (status === 'FAILED') {
          if (intervalRef.current) clearInterval(intervalRef.current)
          setPhase('failed')
        }
      } catch {
        // keep trying
      }
      if (pollAttempts.current >= 30) {
        if (intervalRef.current) clearInterval(intervalRef.current)
        setPhase('timeout')
      }
    }, 2000)
  }

  const initializeAndOpen = async () => {
    setError(null)
    setPhase('initializing')
    try {
      const res = await api.post('/payments/room-service/initialize', { bookingId })
      const { authorizationUrl, reference: ref } = res.data.data as {
        authorizationUrl: string
        reference: string
      }
      setReference(ref)
      setAuthUrl(authorizationUrl)

      // Open Paystack in a popup
      popupRef.current = window.open(
        authorizationUrl,
        'paystack_rs',
        'width=600,height=720,scrollbars=yes'
      )
      setPhase('waiting')
      startPolling(ref)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Could not start payment'
      setError(msg)
      setPhase('failed')
    }
  }

  const retry = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    pollAttempts.current = 0
    setPhase('idle')
    setReference(null)
    setAuthUrl(null)
    setError(null)
  }

  const manualCheck = async () => {
    if (!reference) return
    try {
      const res = await api.get(`/payments/room-service/status/${reference}`)
      const status = res.data.data?.status
      if (status === 'COMPLETED') {
        if (intervalRef.current) clearInterval(intervalRef.current)
        setPhase('success')
        setTimeout(onPaid, 1200)
      } else if (status === 'FAILED') {
        setPhase('failed')
      } else {
        toast('Still waiting for confirmation...')
      }
    } catch {
      toast.error('Could not verify. Try again.')
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div
        className="absolute inset-0 bg-foreground/50 backdrop-blur-sm animate-modal-backdrop"
        onClick={phase === 'waiting' || phase === 'initializing' ? undefined : onClose}
      />
      <div className="relative w-full max-w-md bg-foreground-inverse rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-modal-content">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <p className="text-foreground-tertiary text-xs uppercase tracking-wider">Room Service</p>
            <h2 className="text-foreground font-heading font-bold text-lg">Pay Bill</h2>
          </div>
          <button
            onClick={onClose}
            disabled={phase === 'waiting' || phase === 'initializing'}
            className="p-2 text-foreground-tertiary hover:text-foreground disabled:opacity-40"
          >
            <HiOutlineX size={20} />
          </button>
        </div>

        <div className="px-6 py-6 space-y-4">
          {/* Amount */}
          <div className="text-center">
            <p className="text-foreground-tertiary text-[11px] uppercase tracking-wider font-semibold">Amount Due</p>
            <p className="text-foreground font-heading text-4xl font-bold mt-1">{formatNaira(amount)}</p>
          </div>

          {/* Phase content */}
          {phase === 'idle' && (
            <div className="space-y-3">
              <div className="bg-background-secondary rounded-xl p-4 text-sm text-foreground-secondary">
                <p>You'll be redirected to Paystack to complete payment via card, bank transfer, or USSD.</p>
              </div>
              <button
                onClick={initializeAndOpen}
                className="w-full bg-foreground text-foreground-inverse rounded-lg py-3 text-sm font-semibold hover:opacity-90"
              >
                Continue to Payment
              </button>
            </div>
          )}

          {phase === 'initializing' && (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="w-8 h-8 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
              <p className="text-foreground-secondary text-sm">Preparing payment...</p>
            </div>
          )}

          {phase === 'waiting' && (
            <div className="space-y-3">
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="w-10 h-10 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
                <p className="text-foreground font-semibold text-sm">Waiting for payment...</p>
                <p className="text-foreground-tertiary text-xs text-center max-w-xs">
                  Complete the payment in the popup window. This screen will update automatically.
                </p>
              </div>
              <div className="flex gap-2">
                {authUrl && (
                  <button
                    onClick={() => window.open(authUrl, 'paystack_rs', 'width=600,height=720')}
                    className="flex-1 border border-border rounded-lg py-2 text-xs font-medium text-foreground hover:bg-foreground-disabled/5 flex items-center justify-center gap-1.5"
                  >
                    <HiOutlineExternalLink size={13} />
                    Reopen Window
                  </button>
                )}
                <button
                  onClick={manualCheck}
                  className="flex-1 border border-border rounded-lg py-2 text-xs font-medium text-foreground hover:bg-foreground-disabled/5"
                >
                  I've Paid
                </button>
              </div>
            </div>
          )}

          {phase === 'success' && (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="w-12 h-12 rounded-full bg-success-bg flex items-center justify-center">
                <HiOutlineCheckCircle size={24} className="text-success" />
              </div>
              <p className="text-foreground font-semibold text-base">Payment received</p>
              <p className="text-foreground-tertiary text-sm text-center">Your room service bill is now settled.</p>
            </div>
          )}

          {(phase === 'failed' || phase === 'timeout') && (
            <div className="space-y-3">
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="w-12 h-12 rounded-full bg-danger-bg flex items-center justify-center">
                  <HiOutlineExclamation size={24} className="text-danger" />
                </div>
                <p className="text-foreground font-semibold text-base">
                  {phase === 'timeout' ? "We didn't get confirmation" : 'Payment failed'}
                </p>
                <p className="text-foreground-tertiary text-sm text-center max-w-xs">
                  {error || (phase === 'timeout'
                    ? 'If you completed the payment, it may still go through — check back in a minute.'
                    : 'Your card may have been declined. Try again or use a different method.')}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="flex-1 border border-border rounded-lg py-2 text-sm text-foreground hover:bg-foreground-disabled/5"
                >
                  Close
                </button>
                <button
                  onClick={retry}
                  className="flex-1 bg-foreground text-foreground-inverse rounded-lg py-2 text-sm font-semibold hover:opacity-90"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default PayRoomServiceModal
