'use client'
import React, { useState } from 'react'
import { toast } from 'sonner'
import { HiOutlineCash, HiOutlineExclamation } from 'react-icons/hi'
import { api } from '@/lib/api'
import {
  PaymentMethod,
  WalkInFormData,
  formatNaira,
  sumRoomsTotal,
  sumRoomsBase,
  sumRoomsTax,
} from './types'

interface Props {
  data: WalkInFormData
  update: (patch: Partial<WalkInFormData>) => void
  onSuccess: () => void
  onBack: () => void
  processedByName: string
}

const METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Cash',
  POS: 'POS / Card',
  BANK_TRANSFER: 'Bank Transfer',
}

const WalkInStep4Payment = ({ data, update, onSuccess, onBack, processedByName }: Props) => {
  const [submitting, setSubmitting] = useState(false)

  const total = sumRoomsTotal(data.selectedRooms)
  const base = sumRoomsBase(data.selectedRooms)
  const tax = sumRoomsTax(data.selectedRooms)
  const underpaid = data.amountReceived < total
  const shortfall = underpaid ? total - data.amountReceived : 0
  const isGroup = data.selectedRooms.length > 1

  const handleConfirm = async () => {
    if (data.selectedRooms.length === 0) return
    if (data.amountReceived < 0) {
      toast.error('Amount received must be >= 0')
      return
    }
    if ((data.paymentMethod === 'POS' || data.paymentMethod === 'BANK_TRANSFER') && !data.receiptRef.trim()) {
      toast.error('Receipt / reference number is required for this payment method')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        guestId: data.guestId,
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        email: data.email.trim().toLowerCase(),
        phone: data.phone.trim() || undefined,
        roomIds: data.selectedRooms.map(r => r.room.id),
        // Send the YMD parsed as UTC midnight. This keeps the calendar date
        // consistent across timezones: both client display and server
        // comparisons anchor on UTC-midnight of the same calendar day.
        checkIn: new Date(`${data.checkIn}T00:00:00Z`).toISOString(),
        checkOut: new Date(`${data.checkOut}T00:00:00Z`).toISOString(),
        adults: data.adults,
        children: data.children || 0,
        specialRequests: data.specialRequests.trim() || undefined,
        paymentMethod: data.paymentMethod,
        amountReceived: Number(data.amountReceived),
        receiptRef: data.receiptRef.trim() || undefined,
      }

      const res = await api.post('/staff/walk-in', payload)
      const result = res.data.data
      update({
        result: {
          groupRef: result.groupRef,
          isGroup: result.isGroup,
          bookings: result.bookings,
          guest: result.guest,
          payment: result.payment,
          loyaltyPointsAwarded: result.loyaltyPointsAwarded,
          processedByName,
          processedAt: new Date().toISOString(),
        },
      })
      if (underpaid) {
        toast.warning(`Booking created with a shortfall of ${formatNaira(shortfall)}`)
      } else {
        toast.success(isGroup ? `Group booking (${data.selectedRooms.length} rooms) created` : 'Walk-in booking created')
      }
      onSuccess()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to create booking'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="grid md:grid-cols-[1fr_260px] gap-5">
      {/* Payment form */}
      <div className="space-y-4">
        <div>
          <p className="text-foreground-tertiary text-[11px] uppercase tracking-wider font-semibold mb-2">
            Payment Method
          </p>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(METHOD_LABELS) as PaymentMethod[]).map(m => (
              <button
                key={m}
                onClick={() => update({ paymentMethod: m })}
                disabled={submitting}
                className={`py-2 px-2 rounded-lg border text-xs font-semibold transition-colors ${
                  data.paymentMethod === m
                    ? 'border-foreground bg-foreground text-foreground-inverse'
                    : 'border-border text-foreground hover:bg-foreground-disabled/5'
                }`}
              >
                {METHOD_LABELS[m]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-foreground-tertiary text-[11px] uppercase tracking-wider font-semibold">
            Amount Received (₦)
          </label>
          <input
            type="number"
            min="0"
            step="1"
            value={data.amountReceived}
            onChange={e => update({ amountReceived: Number(e.target.value) || 0 })}
            disabled={submitting}
            className="mt-1.5 w-full px-3 py-2.5 bg-foreground-inverse border border-border rounded-lg text-sm text-foreground outline-none focus:border-foreground"
          />
          {underpaid && data.amountReceived > 0 && (
            <div className="mt-2 flex items-start gap-2 bg-warning-bg/40 border border-warning/30 rounded-lg px-3 py-2">
              <HiOutlineExclamation size={14} className="text-warning shrink-0 mt-0.5" />
              <p className="text-foreground text-xs">
                Shortfall of <strong>{formatNaira(shortfall)}</strong> will be flagged for admin review.
              </p>
            </div>
          )}
          {isGroup && (
            <p className="text-foreground-tertiary text-[11px] mt-1">
              One receipt covers the entire {data.selectedRooms.length}-room group; amount is split proportionally across rooms.
            </p>
          )}
        </div>

        {data.paymentMethod !== 'CASH' && (
          <div>
            <label className="text-foreground-tertiary text-[11px] uppercase tracking-wider font-semibold">
              {data.paymentMethod === 'POS' ? 'POS Terminal Reference' : 'Transfer Reference'}
            </label>
            <input
              type="text"
              value={data.receiptRef}
              onChange={e => update({ receiptRef: e.target.value })}
              disabled={submitting}
              placeholder={data.paymentMethod === 'POS' ? 'e.g. last 4 digits of receipt' : 'e.g. bank ref number'}
              className="mt-1.5 w-full px-3 py-2.5 bg-foreground-inverse border border-border rounded-lg text-sm text-foreground placeholder:text-foreground-tertiary outline-none focus:border-foreground"
            />
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button
            onClick={onBack}
            disabled={submitting}
            className="flex-1 border border-border rounded-lg py-2.5 text-sm text-foreground hover:bg-foreground-disabled/5"
          >
            Back
          </button>
          <button
            onClick={handleConfirm}
            disabled={submitting || data.selectedRooms.length === 0}
            className="flex-1 bg-foreground text-foreground-inverse rounded-lg py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting && <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />}
            {submitting ? 'Creating booking…' : isGroup ? `Confirm & Create ${data.selectedRooms.length} Bookings` : 'Confirm & Create Booking'}
          </button>
        </div>
      </div>

      {/* Summary */}
      <aside className="bg-foreground-disabled/5 border border-border rounded-xl p-4 h-max md:sticky md:top-0">
        <div className="flex items-center gap-2 mb-3">
          <HiOutlineCash size={16} className="text-foreground-tertiary" />
          <p className="text-foreground-tertiary text-[11px] uppercase tracking-wider font-semibold">
            Order Summary
          </p>
        </div>

        <div className="space-y-2 text-xs">
          <div>
            <p className="text-foreground-tertiary">Guest</p>
            <p className="text-foreground font-semibold text-sm">
              {data.firstName} {data.lastName}
            </p>
            <p className="text-foreground-tertiary">{data.email}</p>
          </div>

          <div className="pt-2 border-t border-foreground/10">
            <p className="text-foreground-tertiary mb-1">
              {isGroup ? `Rooms (${data.selectedRooms.length})` : 'Room'}
            </p>
            {data.selectedRooms.map(r => (
              <div key={r.room.id} className="flex items-baseline justify-between">
                <span className="text-foreground text-sm">
                  {r.room.number} — {r.room.roomType.name}
                </span>
                <span className="text-foreground-tertiary">{formatNaira(r.totalAmount)}</span>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-foreground/10">
            <p className="text-foreground-tertiary">Dates</p>
            <p className="text-foreground text-sm">
              {new Date(data.checkIn).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {new Date(data.checkOut).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </p>
            <p className="text-foreground-tertiary">
              {data.selectedRooms[0]?.totalNights ?? 0} night{(data.selectedRooms[0]?.totalNights ?? 0) !== 1 ? 's' : ''} · {data.adults} adult{data.adults !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="pt-2 border-t border-foreground/10 space-y-1">
            <div className="flex justify-between">
              <span className="text-foreground-secondary">Base</span>
              <span className="text-foreground">{formatNaira(base)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-foreground-secondary">Tax</span>
              <span className="text-foreground">{formatNaira(tax)}</span>
            </div>
            <div className="flex justify-between pt-1.5 mt-1.5 border-t border-foreground/10">
              <span className="text-foreground font-semibold">Total Due</span>
              <span className="text-foreground font-bold text-sm">{formatNaira(total)}</span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  )
}

export default WalkInStep4Payment
