'use client'
import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { HiOutlineCalendar, HiOutlineArrowRight } from 'react-icons/hi'

const statusColors: Record<string, string> = {
  PENDING: 'bg-warning-bg text-warning',
  CONFIRMED: 'bg-success-bg text-success',
  CHECKED_IN: 'bg-success-bg text-success',
  CHECKED_OUT: 'bg-foreground-disabled/15 text-foreground-tertiary',
  CANCELLED: 'bg-danger-bg text-danger',
  NO_SHOW: 'bg-danger-bg text-danger',
}

interface Props {
  booking: {
    id: string
    bookingRef: string
    checkIn: string
    checkOut: string
    totalNights: number
    totalAmount: string | number
    status: string
    room: {
      number: string
      floor: number
      roomType: {
        name: string
        slug: string
        image: string | null
      }
    }
    payment?: { status: string; amount: string | number } | null
  }
}

const BookingCard = ({ booking }: Props) => {
  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return (
    <Link
      href={`/bookings/${booking.id}`}
      className="group flex flex-col vsm:flex-row gap-4 p-4 rounded-xl border border-border hover:border-foreground-disabled/50 hover:shadow-sm transition-all"
    >
      {/* Image */}
      <div className="relative w-full vsm:w-32 h-28 vsm:h-24 rounded-lg overflow-hidden flex-shrink-0">
        <Image
          src={booking.room.roomType.image || '/room_2.jpeg'}
          alt={booking.room.roomType.name}
          fill
          className="object-cover"
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div>
            <h3 className="text-foreground font-semibold text-sm">{booking.room.roomType.name}</h3>
            <p className="text-foreground-tertiary text-xs">Room {booking.room.number} &middot; {booking.bookingRef}</p>
          </div>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${statusColors[booking.status] || statusColors.PENDING}`}>
            {booking.status.replace('_', ' ')}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-foreground-secondary text-xs mb-2">
          <HiOutlineCalendar size={13} />
          <span>{formatDate(booking.checkIn)} — {formatDate(booking.checkOut)}</span>
          <span className="text-foreground-disabled">&middot;</span>
          <span>{booking.totalNights} night{booking.totalNights !== 1 ? 's' : ''}</span>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-foreground font-bold text-sm">${Number(booking.totalAmount).toFixed(0)}</p>
          <span className="text-foreground-tertiary text-xs flex items-center gap-1 group-hover:text-foreground group-hover:gap-2 transition-all">
            View Details
            <HiOutlineArrowRight size={12} />
          </span>
        </div>
      </div>
    </Link>
  )
}

export default BookingCard
