'use client'
import React, { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  HiOutlineX,
  HiOutlineCalendar,
  HiOutlineExclamationCircle,
  HiOutlineCheck,
  HiOutlineClock,
} from 'react-icons/hi'
import { api } from '@/lib/api'

interface Props {
  bookingId: string
  currentCheckOut: string
  onClose: () => void
  onSuccess: () => void
}

interface AvailableCheck {
  available: true
  additionalNights: number
  additionalAmount: number
  taxAmount: number
  totalAdditional: number
  newCheckOut: string
}

interface UnavailableCheck {
  available: false
  earliestAvailable: string
}

type CheckResult = AvailableCheck | UnavailableCheck

const formatNaira = (v: number) =>
  `₦${new Intl.NumberFormat('en-NG', { maximumFractionDigits: 0 }).format(v)}`

const toDateInputValue = (d: Date) => d.toISOString().split('T')[0]

const ExtendStayModal = ({ bookingId, currentCheckOut, onClose, onSuccess }: Props) => {
  const checkOutDate = useMemo(() => new Date(currentCheckOut), [currentCheckOut])

  const minDate = useMemo(() => {
    const d = new Date(checkOutDate)
    d.setDate(d.getDate() + 1)
    return toDateInputValue(d)
  }, [checkOutDate])

  const maxDate = useMemo(() => {
    const d = new Date(checkOutDate)
    d.setDate(d.getDate() + 30)
    return toDateInputValue(d)
  }, [checkOutDate])

  const [selectedDate, setSelectedDate] = useState<string>('')
  const [checking, setChecking] = useState(false)
  const [check, setCheck] = useState<CheckResult | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    if (!selectedDate) {
      setCheck(null)
      return
    }
    const controller = new AbortController()
    const run = async () => {
      setChecking(true)
      try {
        const newCheckOut = new Date(`${selectedDate}T12:00:00.000Z`).toISOString()
        const res = await api.get(
          `/bookings/${bookingId}/extend/check?newCheckOut=${encodeURIComponent(newCheckOut)}`,
          { signal: controller.signal }
        )
        setCheck(res.data.data as CheckResult)
      } catch (err: unknown) {
        const aborted = (err as { name?: string })?.name === 'CanceledError' || (err as { name?: string })?.name === 'AbortError'
        if (!aborted) {
          const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to check availability'
          toast.error(msg)
          setCheck(null)
        }
      } finally {
        setChecking(false)
      }
    }
    run()
    return () => controller.abort()
  }, [bookingId, selectedDate])

  const handleSubmit = async () => {
    if (!selectedDate || !check || !check.available) return
    setSubmitting(true)
    try {
      const newCheckOut = new Date(`${selectedDate}T12:00:00.000Z`).toISOString()
      await api.post(`/bookings/${bookingId}/extend`, { newCheckOut })
      setSubmitted(true)
      toast.success('Extension request submitted')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to submit request'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/40" onClick={submitting ? undefined : onClose} />
      <div className="relative w-full max-w-md bg-foreground-inverse rounded-2xl shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <p className="text-foreground-tertiary text-xs uppercase tracking-wider">Extend Stay</p>
            <h2 className="text-foreground font-bold text-lg">
              {submitted ? 'Request Submitted' : 'Choose new checkout'}
            </h2>
          </div>
          <button onClick={onClose} disabled={submitting} className="p-2 text-foreground-tertiary hover:text-foreground">
            <HiOutlineX size={20} />
          </button>
        </div>

        {submitted ? (
          <div className="px-5 py-8 text-center">
            <div className="inline-flex w-14 h-14 rounded-full bg-success-bg items-center justify-center mb-4">
              <HiOutlineCheck size={28} className="text-success" />
            </div>
            <h3 className="text-foreground text-lg font-bold mb-1">Request Submitted</h3>
            <p className="text-foreground-tertiary text-sm mb-4">
              Your extension request is under review. Once approved, you&apos;ll receive a payment link to confirm.
            </p>
            <div className="inline-flex items-center gap-1.5 bg-warning-bg text-warning text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
              <HiOutlineClock size={12} />
              PENDING
            </div>
            <div>
              <button
                onClick={() => { onSuccess(); onClose() }}
                className="bg-foreground text-foreground-inverse px-6 py-2.5 rounded-lg text-sm font-medium hover:opacity-90"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="px-5 py-4">
              <p className="text-foreground-tertiary text-xs mb-3">
                Current checkout: <strong className="text-foreground">
                  {checkOutDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </strong>. Pick a new date up to 30 days later.
              </p>

              <label className="block text-foreground text-xs font-medium mb-1.5">New Checkout Date</label>
              <div className="relative mb-4">
                <HiOutlineCalendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-tertiary pointer-events-none" />
                <input
                  type="date"
                  min={minDate}
                  max={maxDate}
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="w-full border border-border rounded-lg pl-9 pr-3 py-2.5 text-sm text-foreground bg-foreground-inverse focus:outline-none focus:border-foreground/40"
                />
              </div>

              {checking && (
                <div className="flex items-center gap-2 text-foreground-tertiary text-xs py-4">
                  <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Checking availability…
                </div>
              )}

              {!checking && check && check.available === false && (
                <div className="flex gap-2 items-start bg-danger-bg/60 border border-danger/20 rounded-lg p-3 mb-1">
                  <HiOutlineExclamationCircle size={16} className="text-danger shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="text-danger font-semibold mb-0.5">Room not available</p>
                    <p className="text-foreground-secondary">
                      The earliest your room is free after your current checkout is{' '}
                      <strong className="text-foreground">
                        {new Date(check.earliestAvailable).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </strong>
                      . Try a different date.
                    </p>
                  </div>
                </div>
              )}

              {!checking && check && check.available && (
                <div className="border border-border rounded-lg p-4 mb-1 bg-foreground-disabled/5">
                  <div className="flex items-center justify-between mb-3 pb-3 border-b border-border">
                    <div>
                      <p className="text-foreground-tertiary text-[10px] uppercase tracking-wider">New Checkout</p>
                      <p className="text-foreground font-semibold text-sm mt-0.5">
                        {new Date(check.newCheckOut).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-foreground-tertiary text-[10px] uppercase tracking-wider">Extra Nights</p>
                      <p className="text-foreground font-bold text-lg">+{check.additionalNights}</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 text-xs">
                    <div className="flex justify-between text-foreground-secondary">
                      <span>Additional room cost</span>
                      <span>{formatNaira(check.additionalAmount)}</span>
                    </div>
                    <div className="flex justify-between text-foreground-secondary">
                      <span>Tax (10%)</span>
                      <span>{formatNaira(check.taxAmount)}</span>
                    </div>
                    <div className="flex justify-between pt-2 mt-1 border-t border-border text-foreground font-bold text-sm">
                      <span>Estimated Total</span>
                      <span>{formatNaira(check.totalAdditional)}</span>
                    </div>
                  </div>
                  <p className="text-foreground-tertiary text-[11px] mt-3 leading-relaxed">
                    This estimate needs admin approval. You&apos;ll get a payment link once approved.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-border flex items-center justify-end gap-2">
              <button
                onClick={onClose}
                disabled={submitting}
                className="text-foreground-secondary text-sm font-medium px-4 py-2 rounded-lg hover:bg-foreground-disabled/10 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || checking || !check || !check.available}
                className="bg-foreground text-foreground-inverse text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
              >
                {submitting && <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                {submitting ? 'Submitting…' : 'Submit Request'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default ExtendStayModal
