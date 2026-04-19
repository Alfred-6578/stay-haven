'use client'
import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import { toast } from 'sonner'
import {
  HiOutlineX,
  HiOutlineCheck,
  HiOutlineArrowUp,
  HiOutlineClock,
} from 'react-icons/hi'
import { api } from '@/lib/api'
import PaymentPolling from './PaymentPolling'

interface UpgradeOption {
  roomType: {
    id: string
    name: string
    image: string | null
    images: string[]
    amenities: string[]
    capacity: number
    basePrice: number
  }
  availableCount: number
  priceDifference: number
  newTotalEstimate: number
}

interface Props {
  bookingId: string
  currentRoomType: string
  currentAmenities: string[]
  onClose: () => void
  onSuccess: () => void
}

const formatNaira = (v: number) =>
  `₦${new Intl.NumberFormat('en-NG', { maximumFractionDigits: 0 }).format(v)}`

const UpgradeOptionsModal = ({ bookingId, currentRoomType, currentAmenities, onClose, onSuccess }: Props) => {
  const [options, setOptions] = useState<UpgradeOption[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [payment, setPayment] = useState<{ reference: string } | null>(null)

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get(`/bookings/${bookingId}/upgrade/options`)
        setOptions(res.data.data || [])
      } catch {
        toast.error('Failed to load upgrade options')
      }
      setLoading(false)
    })()
  }, [bookingId])

  const handleSelect = async (typeId: string) => {
    setSubmitting(true)
    try {
      await api.post(`/bookings/${bookingId}/upgrade/request`, {
        requestedTypeId: typeId,
      })
      setSubmitted(true)
      toast.success('Upgrade request submitted')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to request upgrade'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  // Payment polling state
  if (payment) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-foreground/40" />
        <div className="relative w-full max-w-md bg-foreground-inverse rounded-2xl shadow-xl p-6">
          <PaymentPolling
            reference={payment.reference}
            bookingId={bookingId}
            statusPath={`/payments/upgrade/status/${payment.reference}`}
            onSuccess={() => { onSuccess(); onClose() }}
            onRetry={() => setPayment(null)}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/40" onClick={submitting ? undefined : onClose} />
      <div className="relative w-full max-w-lg bg-foreground-inverse rounded-2xl shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <p className="text-foreground-tertiary text-xs uppercase tracking-wider">Room Upgrade</p>
            <h2 className="text-foreground font-bold text-lg">
              {submitted ? 'Request Submitted' : 'Available Upgrades'}
            </h2>
          </div>
          <button onClick={onClose} disabled={submitting} className="p-2 text-foreground-tertiary hover:text-foreground">
            <HiOutlineX size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Success state */}
          {submitted ? (
            <div className="text-center py-8">
              <div className="inline-flex w-14 h-14 rounded-full bg-success-bg items-center justify-center mb-4">
                <HiOutlineCheck size={28} className="text-success" />
              </div>
              <h3 className="text-foreground text-lg font-bold mb-1">Request Submitted</h3>
              <p className="text-foreground-tertiary text-sm mb-2">
                Your upgrade request is under review. You&apos;ll be notified once it&apos;s processed.
              </p>
              <div className="inline-flex items-center gap-1.5 bg-warning-bg text-warning text-xs font-semibold px-3 py-1.5 rounded-full">
                <HiOutlineClock size={12} />
                PENDING
              </div>
              <div className="mt-6">
                <button
                  onClick={() => { onSuccess(); onClose() }}
                  className="bg-foreground text-foreground-inverse px-6 py-2.5 rounded-lg text-sm font-medium hover:opacity-90"
                >
                  Done
                </button>
              </div>
            </div>
          ) : loading ? (
            <div className="space-y-3 py-4">
              {[0, 1, 2].map(i => <div key={i} className="h-28 bg-foreground-disabled/10 rounded-xl animate-pulse" />)}
            </div>
          ) : options.length === 0 ? (
            <div className="text-center py-10">
              <HiOutlineArrowUp size={28} className="text-foreground-disabled mx-auto mb-3" />
              <p className="text-foreground-tertiary text-sm">No upgrades available for your dates.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-foreground-tertiary text-xs mb-2">
                Currently: <strong className="text-foreground">{currentRoomType}</strong>. Select a room type below to request an upgrade.
              </p>
              {options.map(opt => {
                // Find amenities the upgrade has that the current room doesn't
                const newAmenities = opt.roomType.amenities.filter(
                  a => !currentAmenities.includes(a)
                )
                return (
                  <div
                    key={opt.roomType.id}
                    className="border border-border rounded-xl overflow-hidden hover:border-foreground/30 transition-colors"
                  >
                    <div className="flex gap-4 p-4">
                      {/* Image */}
                      <div className="relative w-24 h-24 rounded-lg overflow-hidden shrink-0">
                        <Image
                          src={opt.roomType.image || opt.roomType.images?.[0] || '/room_2.jpeg'}
                          alt={opt.roomType.name}
                          fill
                          className="object-cover"
                        />
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className="text-foreground font-semibold text-sm">{opt.roomType.name}</h4>
                          <span className="text-foreground-tertiary text-xs shrink-0">
                            {opt.availableCount} available
                          </span>
                        </div>

                        <p className="text-foreground-tertiary text-xs mb-2">
                          Fits {opt.roomType.capacity} · {formatNaira(opt.roomType.basePrice)}/night
                        </p>

                        {newAmenities.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {newAmenities.slice(0, 4).map(a => (
                              <span key={a} className="text-[10px] text-success bg-success-bg px-1.5 py-0.5 rounded-full font-medium">
                                + {a}
                              </span>
                            ))}
                            {newAmenities.length > 4 && (
                              <span className="text-[10px] text-foreground-tertiary">+{newAmenities.length - 4} more</span>
                            )}
                          </div>
                        )}

                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-foreground/5">
                          <div>
                            <p className="text-foreground font-bold text-sm">
                              {opt.priceDifference > 0 ? `+${formatNaira(opt.priceDifference)}` : 'Free upgrade'}
                            </p>
                            <p className="text-foreground-tertiary text-[10px]">
                              {opt.priceDifference > 0 ? 'Price difference' : 'No additional cost'}
                            </p>
                          </div>
                          <button
                            onClick={() => handleSelect(opt.roomType.id)}
                            disabled={submitting}
                            className="bg-foreground text-foreground-inverse text-xs font-semibold px-4 py-1.5 rounded-lg hover:opacity-90 disabled:opacity-50"
                          >
                            {submitting ? 'Requesting…' : 'Select'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default UpgradeOptionsModal
