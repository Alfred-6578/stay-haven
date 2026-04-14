'use client'
import React from 'react'
import Link from 'next/link'
import { HiOutlineArrowRight } from 'react-icons/hi'

interface Booking {
  id: string
  bookingRef: string
  guestName: string
  roomNumber: string
  roomType: string
  amount: number
  status: string
  createdAt: string
}

interface Props {
  bookings: Booking[]
}

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: 'bg-success-bg text-success',
  CHECKED_IN: 'bg-[#EAF3DE] text-[#4A6B2E]',
  CHECKED_OUT: 'bg-foreground-disabled/15 text-foreground-secondary',
  PENDING: 'bg-warning-bg text-warning',
  CANCELLED: 'bg-danger-bg text-danger',
  NO_SHOW: 'bg-danger-bg text-danger',
}

const formatNaira = (v: number) =>
  `₦${new Intl.NumberFormat('en-NG', { maximumFractionDigits: 0 }).format(v)}`

const StatusBadge = ({ status }: { status: string }) => (
  <span
    className={`${STATUS_COLORS[status] || 'bg-foreground-disabled/15 text-foreground-secondary'} text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider whitespace-nowrap`}
  >
    {status.replace('_', ' ')}
  </span>
)

const RecentBookingsTable = ({ bookings }: Props) => {
  return (
    <div className="bg-foreground-inverse border border-border rounded-2xl p-5 vsm:p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-foreground font-semibold text-sm">Recent Bookings</h3>
          <p className="text-foreground-tertiary text-xs">Last 8 bookings</p>
        </div>
        <Link
          href="/admin/bookings"
          className="text-foreground text-xs font-medium hover:underline flex items-center gap-1"
        >
          View all <HiOutlineArrowRight size={12} />
        </Link>
      </div>

      {bookings.length === 0 ? (
        <p className="text-foreground-tertiary text-sm text-center py-10">No bookings yet</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-foreground-tertiary text-[11px] uppercase tracking-wider border-b border-border">
                <th className="py-2 px-2 font-semibold">Ref</th>
                <th className="py-2 px-2 font-semibold">Guest</th>
                <th className="py-2 px-2 font-semibold max-md:hidden">Room</th>
                <th className="py-2 px-2 font-semibold max-sm:hidden">Created</th>
                <th className="py-2 px-2 font-semibold">Amount</th>
                <th className="py-2 px-2 font-semibold">Status</th>
                <th className="py-2 px-2 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {bookings.slice(0, 8).map(b => (
                <tr key={b.id} className="border-b border-border last:border-0">
                  <td className="py-3 px-2 text-foreground font-mono text-xs">{b.bookingRef}</td>
                  <td className="py-3 px-2 text-foreground font-medium">{b.guestName}</td>
                  <td className="py-3 px-2 text-foreground-secondary max-md:hidden">
                    <span className="text-foreground">{b.roomNumber}</span>
                    <span className="text-foreground-tertiary text-xs"> · {b.roomType}</span>
                  </td>
                  <td className="py-3 px-2 text-foreground-tertiary text-xs max-sm:hidden">
                    {new Date(b.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </td>
                  <td className="py-3 px-2 text-foreground font-medium whitespace-nowrap">{formatNaira(b.amount)}</td>
                  <td className="py-3 px-2"><StatusBadge status={b.status} /></td>
                  <td className="py-3 px-2 text-right">
                    <Link
                      href={`/admin/bookings/${b.id}`}
                      className="text-foreground text-xs font-medium hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default RecentBookingsTable
