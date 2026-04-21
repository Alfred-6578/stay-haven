'use client'
import React, { useState } from 'react'
import { toast } from 'sonner'
import {
  HiOutlineCheck,
  HiOutlineClipboardCopy,
  HiOutlinePrinter,
  HiOutlineKey,
  HiOutlineExclamation,
} from 'react-icons/hi'
import { api } from '@/lib/api'
import { WalkInFormData, formatNaira } from './types'
import PrintableReceipt from './PrintableReceipt'

interface Props {
  data: WalkInFormData
  onClose: () => void
}

const WalkInSuccessScreen = ({ data, onClose }: Props) => {
  const [copied, setCopied] = useState(false)
  const [checkingIn, setCheckingIn] = useState(false)
  const r = data.result
  if (!r) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const checkInDate = new Date(r.bookings[0].checkIn)
  checkInDate.setHours(0, 0, 0, 0)
  const isSameDayArrival = checkInDate.getTime() === today.getTime()

  const methodLabel =
    r.payment.method === 'CASH' ? 'Cash'
      : r.payment.method === 'POS' ? 'POS / Card'
        : 'Bank Transfer'

  const primaryRef = r.groupRef || r.bookings[0].bookingRef

  const copyRef = async () => {
    try {
      await navigator.clipboard.writeText(primaryRef)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error('Copy failed')
    }
  }

  const handleCheckInNow = async () => {
    setCheckingIn(true)
    try {
      // Check in every booking in the group
      await Promise.all(
        r.bookings.map(b => api.post(`/staff/bookings/${b.id}/checkin`))
      )
      toast.success(
        r.isGroup
          ? `Checked in ${r.bookings.length} rooms for ${r.guest.firstName} ${r.guest.lastName}`
          : `${r.guest.firstName} ${r.guest.lastName} checked in to Room ${r.bookings[0].room.number}`
      )
      onClose()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Check-in failed'
      toast.error(msg)
    } finally {
      setCheckingIn(false)
    }
  }

  return (
    <div className="space-y-5">
      <PrintableReceipt data={data} />

      <div className="text-center">
        <div className="inline-flex w-14 h-14 rounded-full bg-success-bg items-center justify-center mb-3">
          <HiOutlineCheck size={28} className="text-success" />
        </div>
        <h3 className="text-foreground text-xl font-bold mb-1">
          {r.isGroup ? `Group Booking Confirmed (${r.bookings.length} rooms)` : 'Booking Confirmed'}
        </h3>
        <p className="text-foreground-tertiary text-sm">
          {r.guest.isNewGuest
            ? 'Guest account created — activation email sent.'
            : 'The guest has been notified by email.'}
        </p>
      </div>

      {/* Primary reference */}
      <div className="bg-foreground-disabled/5 border border-border rounded-xl p-4 text-center">
        <p className="text-foreground-tertiary text-[11px] uppercase tracking-wider font-semibold mb-1">
          {r.isGroup ? 'Group Reference' : 'Booking Reference'}
        </p>
        <div className="flex items-center justify-center gap-2">
          <p className="text-foreground font-mono text-2xl font-bold tracking-wider">
            {primaryRef}
          </p>
          <button
            onClick={copyRef}
            className="p-1.5 text-foreground-tertiary hover:text-foreground"
            title="Copy reference"
          >
            <HiOutlineClipboardCopy size={16} />
          </button>
        </div>
        {copied && <p className="text-success text-xs mt-1">Copied!</p>}
      </div>

      {/* Rooms list */}
      <div>
        <p className="text-foreground-tertiary text-[11px] uppercase tracking-wider font-semibold mb-2">
          {r.isGroup ? 'Rooms Assigned' : 'Room Assigned'}
        </p>
        <div className="space-y-2">
          {r.bookings.map(b => (
            <div key={b.id} className="flex items-center justify-between border border-border rounded-lg px-3 py-2.5 text-sm">
              <div>
                <p className="text-foreground font-semibold">
                  Room {b.room.number} · Floor {b.room.floor}
                </p>
                <p className="text-foreground-tertiary text-xs">
                  {b.roomType.name} · {b.adults} adult{b.adults !== 1 ? 's' : ''} · {b.bookingRef}
                </p>
              </div>
              <p className="text-foreground font-semibold text-sm">{formatNaira(b.totalAmount)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Stay + payment grid */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-foreground-tertiary text-[11px] uppercase tracking-wider">Guest</p>
          <p className="text-foreground font-semibold">{r.guest.firstName} {r.guest.lastName}</p>
          <p className="text-foreground-tertiary text-xs">{r.guest.email}</p>
        </div>
        <div>
          <p className="text-foreground-tertiary text-[11px] uppercase tracking-wider">Dates</p>
          <p className="text-foreground font-semibold">
            {new Date(r.bookings[0].checkIn).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {new Date(r.bookings[0].checkOut).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </p>
        </div>
        <div>
          <p className="text-foreground-tertiary text-[11px] uppercase tracking-wider">Amount Paid</p>
          <p className="text-foreground font-semibold">{formatNaira(r.payment.amountReceived)}</p>
          <p className="text-foreground-tertiary text-xs">{methodLabel}</p>
        </div>
        <div>
          <p className="text-foreground-tertiary text-[11px] uppercase tracking-wider">Group Total</p>
          <p className="text-foreground font-semibold">{formatNaira(r.payment.groupTotal)}</p>
          <p className="text-foreground-tertiary text-xs">+{r.loyaltyPointsAwarded} loyalty points</p>
        </div>
      </div>

      {r.payment.underpayment && r.payment.shortfall ? (
        <div className="bg-warning-bg/40 border border-warning/30 rounded-xl p-3 flex items-start gap-2">
          <HiOutlineExclamation size={16} className="text-warning shrink-0 mt-0.5" />
          <div>
            <p className="text-foreground text-xs font-semibold">
              Shortfall: {formatNaira(r.payment.shortfall)}
            </p>
            <p className="text-foreground-secondary text-xs">
              This payment is flagged for admin review.
            </p>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col vsm:flex-row gap-2 pt-2">
        <button
          onClick={() => window.print()}
          className="flex-1 inline-flex items-center justify-center gap-2 border border-border text-foreground rounded-lg py-2.5 text-sm font-medium hover:bg-foreground-disabled/5"
        >
          <HiOutlinePrinter size={16} />
          Print Receipt
        </button>
        {isSameDayArrival ? (
          <button
            onClick={handleCheckInNow}
            disabled={checkingIn}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-foreground text-foreground-inverse rounded-lg py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {checkingIn && <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />}
            {!checkingIn && <HiOutlineKey size={16} />}
            {checkingIn ? 'Checking in…' : r.isGroup ? 'Close & Check In All' : 'Close & Check In Now'}
          </button>
        ) : (
          <button
            onClick={onClose}
            className="flex-1 bg-foreground text-foreground-inverse rounded-lg py-2.5 text-sm font-medium hover:opacity-90"
          >
            Done
          </button>
        )}
      </div>
    </div>
  )
}

export default WalkInSuccessScreen
