'use client'
import React from 'react'
import Image from 'next/image'
import Button from '@/component/ui/Button'
import { HiOutlineCalendar, HiOutlineUsers } from 'react-icons/hi'
import { MdOutlineKingBed } from 'react-icons/md'

interface NightBreakdown {
  date: string
  isWeekend: boolean
  price: number
}

interface Props {
  roomImage: string
  roomTypeName: string
  roomNumber: string
  floor: number
  checkIn: string
  checkOut: string
  adults: number
  totalNights: number
  nightBreakdown: NightBreakdown[]
  baseAmount: number
  taxAmount: number
  totalAmount: number
  onConfirm: () => void
}

const BookingStepReview = ({
  roomImage, roomTypeName, roomNumber, floor,
  checkIn, checkOut, adults,
  totalNights, nightBreakdown, baseAmount, taxAmount, totalAmount,
  onConfirm,
}: Props) => {
  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
  const weekendNights = nightBreakdown.filter(n => n.isWeekend).length
  const weekdayNights = totalNights - weekendNights

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="font-heading text-2xl vsm:text-3xl font-bold text-foreground mb-2">Review Your Booking</h2>
      <p className="text-foreground-tertiary text-sm mb-8">Please confirm the details below before proceeding.</p>

      <div className="grid sm:grid-cols-5 gap-6">
        {/* Room preview */}
        <div className="sm:col-span-2">
          <div className="relative h-48 vsm:h-56 rounded-2xl overflow-hidden">
            <Image src={roomImage} alt={roomTypeName} fill className="object-cover" />
          </div>
        </div>

        {/* Details */}
        <div className="sm:col-span-3">
          <h3 className="font-heading text-xl font-bold text-foreground mb-1">{roomTypeName}</h3>
          <p className="text-foreground-tertiary text-sm mb-4">Room {roomNumber} &middot; Floor {floor}</p>

          <div className="flex flex-col gap-3 mb-6">
            <div className="flex items-center gap-3 text-foreground-secondary text-sm">
              <HiOutlineCalendar size={16} className="text-foreground-tertiary" />
              <span>{formatDate(checkIn)} → {formatDate(checkOut)}</span>
            </div>
            <div className="flex items-center gap-3 text-foreground-secondary text-sm">
              <MdOutlineKingBed size={16} className="text-foreground-tertiary" />
              <span>{totalNights} night{totalNights !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center gap-3 text-foreground-secondary text-sm">
              <HiOutlineUsers size={16} className="text-foreground-tertiary" />
              <span>{adults} guest{adults !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Price breakdown */}
      <div className="mt-8 border border-border rounded-2xl overflow-hidden">
        <div className="p-5 vsm:p-6 border-b border-border bg-foreground-disabled/[0.04]">
          <h4 className="font-semibold text-foreground text-sm">Price Breakdown</h4>
        </div>
        <div className="p-5 vsm:p-6">
          {/* Night details */}
          {weekdayNights > 0 && (
            <div className="flex justify-between text-sm text-foreground-secondary mb-2">
              <span>{weekdayNights} weekday night{weekdayNights !== 1 ? 's' : ''}</span>
              <span>${nightBreakdown.filter(n => !n.isWeekend).reduce((s, n) => s + n.price, 0).toFixed(0)}</span>
            </div>
          )}
          {weekendNights > 0 && (
            <div className="flex justify-between text-sm mb-2">
              <span className="text-warning">{weekendNights} weekend night{weekendNights !== 1 ? 's' : ''} (surcharge applied)</span>
              <span className="text-warning">${nightBreakdown.filter(n => n.isWeekend).reduce((s, n) => s + n.price, 0).toFixed(0)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm text-foreground-secondary pt-2 border-t border-border mt-2 mb-2">
            <span>Subtotal</span>
            <span>${baseAmount.toFixed(0)}</span>
          </div>
          <div className="flex justify-between text-sm text-foreground-secondary mb-2">
            <span>Tax (10%)</span>
            <span>${taxAmount.toFixed(0)}</span>
          </div>
          <div className="flex justify-between text-foreground font-bold text-lg pt-3 border-t border-border mt-2">
            <span>Total</span>
            <span>${totalAmount.toFixed(0)}</span>
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <Button onClick={onConfirm} withArrow size="lg">
          Confirm Details
        </Button>
      </div>
    </div>
  )
}

export default BookingStepReview
