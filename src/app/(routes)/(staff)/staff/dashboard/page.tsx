'use client'
import React, { useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import {
  HiOutlineArrowCircleRight,
  HiOutlineArrowCircleLeft,
  HiOutlineExclamation,
  HiOutlineSparkles,
  HiOutlinePlus,
} from 'react-icons/hi'
import RoomStatusBoard, { StaffRoom } from '@/component/staff/RoomStatusBoard'
import CheckInModal, { CheckInBooking } from '@/component/staff/CheckInModal'
import CheckOutModal, { CheckOutBooking } from '@/component/staff/CheckOutModal'
import WalkInBookingModal from '@/component/staff/walkin/WalkInBookingModal'
import OverstayModal from '@/component/staff/OverstayModal'
import ErrorState from '@/component/ui/ErrorState'
import { StatCardSkeleton, SkeletonBar } from '@/component/ui/PageSkeleton'

interface DashboardData {
  todayArrivals: Array<{
    id: string
    bookingRef: string
    checkIn: string
    specialRequests: string | null
    guestName: string
    roomNumber: string
    roomType: string
  }>
  todayDepartures: Array<{
    id: string
    bookingRef: string
    checkOut: string
    guestName: string
    roomNumber: string
  }>
  overdueCheckouts: Array<{
    id: string
    bookingRef: string
    checkIn: string
    checkOut: string
    guestName: string
    roomNumber: string
    hoursOverdue: number
  }>
  noShows: Array<{
    id: string
    bookingRef: string
    checkIn: string
    guestName: string
    guestEmail: string
    roomNumber: string
    roomType: string
    daysMissed: number
  }>
  pendingCleaning: Array<{ id: string; number: string; floor: number }>
  counts: {
    arrivals: number
    departures: number
    overdue: number
    noShows: number
    cleaning: number
  }
}

interface FloorGroup {
  floor: number
  rooms: StaffRoom[]
}

const StatCard = ({
  label,
  value,
  bg,
  icon: Icon,
}: {
  label: string
  value: number
  bg: string
  icon: React.ComponentType<{ size?: number; className?: string }>
}) => (
  <div className={`${bg} rounded-2xl p-5`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-foreground-secondary text-xs uppercase tracking-wider font-semibold">{label}</p>
        <p className="text-foreground text-3xl font-bold mt-1">{value}</p>
      </div>
      <Icon size={28} className="text-foreground/40" />
    </div>
  </div>
)

export default function StaffDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [arrivals, setArrivals] = useState<CheckInBooking[]>([])
  const [departures, setDepartures] = useState<CheckOutBooking[]>([])
  const [rooms, setRooms] = useState<FloorGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [checkInBooking, setCheckInBooking] = useState<CheckInBooking | null>(null)
  const [checkOutBooking, setCheckOutBooking] = useState<CheckOutBooking | null>(null)
  const [walkInOpen, setWalkInOpen] = useState(false)
  const [markingNoShow, setMarkingNoShow] = useState<string | null>(null)
  const [overstayBooking, setOverstayBooking] = useState<{
    id: string; bookingRef: string; checkIn: string; checkOut: string;
    guestName: string; roomNumber: string; hoursOverdue: number
  } | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const [dashRes, arrivalsRes, departuresRes, roomsRes] = await Promise.all([
        api.get('/staff/dashboard'),
        api.get('/staff/arrivals'),
        api.get('/staff/departures'),
        api.get('/staff/rooms'),
      ])
      setData(dashRes.data.data)
      setArrivals(arrivalsRes.data.data)
      setDepartures(departuresRes.data.data)
      setRooms(roomsRes.data.data.floors)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const openCheckIn = (bookingId: string) => {
    const match = arrivals.find(b => b.id === bookingId)
    if (match) setCheckInBooking(match)
  }

  const openCheckOut = (bookingId: string) => {
    const match = departures.find(b => b.id === bookingId)
    if (match) setCheckOutBooking(match)
  }

  const pendingOrdersByBookingId = React.useMemo(() => {
    const map: Record<string, number> = {}
    for (const d of departures) map[d.id] = d.roomServiceOrders?.length || 0
    return map
  }, [departures])

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <SkeletonBar className="h-8 w-48" />
          <SkeletonBar className="h-10 w-40 rounded-lg" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[0, 1, 2, 3, 4].map(i => <StatCardSkeleton key={i} />)}
        </div>
        <SkeletonBar className="h-48 rounded-2xl" />
        <SkeletonBar className="h-48 rounded-2xl" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <ErrorState
        title="Couldn't load the dashboard"
        description="We had trouble fetching today's activity. Please try again."
        onRetry={fetchAll}
      />
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <h1 className="text-foreground font-heading text-xl sm:text-2xl font-bold">Staff Dashboard</h1>
        <button
          onClick={() => setWalkInOpen(true)}
          className="inline-flex items-center gap-2 bg-foreground text-foreground-inverse px-4 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 shrink-0"
        >
          <HiOutlinePlus size={16} />
          Walk-in Booking
        </button>
      </div>

      {/* Stat bar */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <StatCard label="Arrivals Today" value={data.counts.arrivals} bg="bg-[#EAF3DE]" icon={HiOutlineArrowCircleRight} />
        <StatCard label="Departures Today" value={data.counts.departures} bg="bg-[#F0ECE4]" icon={HiOutlineArrowCircleLeft} />
        <StatCard label="Overdue" value={data.counts.overdue} bg="bg-[#FAECE7]" icon={HiOutlineExclamation} />
        <StatCard label="No-Shows" value={data.counts.noShows} bg="bg-[#FEE2E2]" icon={HiOutlineExclamation} />
        <StatCard label="Needs Cleaning" value={data.counts.cleaning} bg="bg-[#FAEEDA]" icon={HiOutlineSparkles} />
      </div>

      {/* Overdue Checkouts — prominent alert */}
      {data.overdueCheckouts.length > 0 && (
        <section className="bg-danger-bg/40 border border-danger/30 rounded-2xl p-5 vsm:p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <HiOutlineExclamation size={20} className="text-danger" />
            <h2 className="text-danger font-semibold text-base">
              Overdue Checkouts ({data.overdueCheckouts.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-danger/70 text-[11px] uppercase tracking-wider border-b border-danger/20">
                  <th className="py-2 px-2 font-semibold">Guest</th>
                  <th className="py-2 px-2 font-semibold">Room</th>
                  <th className="py-2 px-2 font-semibold">Overdue</th>
                  <th className="py-2 px-2 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {data.overdueCheckouts.map(b => (
                  <tr key={b.id} className="border-b border-danger/10 last:border-0">
                    <td className="py-3 px-2">
                      <p className="text-foreground font-medium">{b.guestName}</p>
                      <p className="text-foreground-tertiary text-xs">{b.bookingRef}</p>
                    </td>
                    <td className="py-3 px-2 text-foreground">{b.roomNumber}</td>
                    <td className="py-3 px-2">
                      <span className="inline-flex items-center gap-1 bg-danger text-foreground-inverse text-[11px] font-bold px-2 py-0.5 rounded-full">
                        {b.hoursOverdue}h overdue
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <button
                        onClick={() => setOverstayBooking(b)}
                        className="bg-warning text-foreground-inverse text-xs font-medium px-3 py-1.5 rounded-lg hover:opacity-90"
                      >
                        Resolve
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* No-Shows — CONFIRMED bookings where check-in date has passed */}
      {data.noShows.length > 0 && (
        <section className="bg-[#FEE2E2]/40 border border-[#F87171]/30 rounded-2xl p-5 vsm:p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <HiOutlineExclamation size={20} className="text-[#DC2626]" />
            <h2 className="text-[#DC2626] font-semibold text-base">
              No-Shows ({data.noShows.length})
            </h2>
            <span className="text-foreground-tertiary text-xs ml-auto">
              Guests who didn&apos;t check in — mark as no-show to free the room
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[#DC2626]/70 text-[11px] uppercase tracking-wider border-b border-[#F87171]/20">
                  <th className="py-2 px-2 font-semibold">Guest</th>
                  <th className="py-2 px-2 font-semibold">Room</th>
                  <th className="py-2 px-2 font-semibold">Was Expected</th>
                  <th className="py-2 px-2 font-semibold">Missed</th>
                  <th className="py-2 px-2 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {data.noShows.map(b => (
                  <tr key={b.id} className="border-b border-[#F87171]/10 last:border-0">
                    <td className="py-3 px-2">
                      <p className="text-foreground font-medium">{b.guestName}</p>
                      <p className="text-foreground-tertiary text-xs">{b.bookingRef}</p>
                    </td>
                    <td className="py-3 px-2">
                      <p className="text-foreground">{b.roomNumber}</p>
                      <p className="text-foreground-tertiary text-xs">{b.roomType}</p>
                    </td>
                    <td className="py-3 px-2 text-foreground-secondary text-xs">
                      {new Date(b.checkIn).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </td>
                    <td className="py-3 px-2">
                      <span className="inline-flex items-center gap-1 bg-[#DC2626] text-foreground-inverse text-[11px] font-bold px-2 py-0.5 rounded-full">
                        {b.daysMissed}d ago
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <button
                        onClick={async () => {
                          setMarkingNoShow(b.id)
                          try {
                            await api.post(`/staff/bookings/${b.id}/no-show`)
                            toast.success(`${b.guestName} marked as no-show — Room ${b.roomNumber} freed`)
                            fetchAll()
                          } catch {
                            toast.error('Failed to mark no-show')
                          }
                          setMarkingNoShow(null)
                        }}
                        disabled={markingNoShow === b.id}
                        className="bg-[#DC2626] text-foreground-inverse text-xs font-medium px-3 py-1.5 rounded-lg hover:opacity-90 disabled:opacity-50"
                      >
                        {markingNoShow === b.id ? 'Marking…' : 'Mark No-Show'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Today Arrivals */}
      <section className="bg-foreground-inverse border border-border rounded-2xl p-5 vsm:p-6 mb-6">
        <h2 className="text-foreground font-semibold text-base mb-4">Today&apos;s Arrivals</h2>
        {data.todayArrivals.length === 0 ? (
          <p className="text-foreground-tertiary text-sm text-center py-6">No arrivals scheduled for today</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-foreground-tertiary text-[11px] uppercase tracking-wider border-b border-border">
                  <th className="py-2 px-2 font-semibold">Guest</th>
                  <th className="py-2 px-2 font-semibold">Room</th>
                  <th className="py-2 px-2 font-semibold">Type</th>
                  <th className="py-2 px-2 font-semibold max-md:hidden">Special Requests</th>
                  <th className="py-2 px-2 font-semibold">Check-in</th>
                  <th className="py-2 px-2 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {data.todayArrivals.map(b => (
                  <tr key={b.id} className="border-b border-border last:border-0">
                    <td className="py-3 px-2 text-foreground font-medium">{b.guestName}</td>
                    <td className="py-3 px-2 text-foreground">{b.roomNumber}</td>
                    <td className="py-3 px-2 text-foreground-secondary">{b.roomType}</td>
                    <td className="py-3 px-2 text-foreground-tertiary max-md:hidden max-w-[200px] truncate">{b.specialRequests || '—'}</td>
                    <td className="py-3 px-2 text-foreground-tertiary">
                      {new Date(b.checkIn).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </td>
                    <td className="py-3 px-2 text-right">
                      <button
                        onClick={() => openCheckIn(b.id)}
                        className="bg-foreground text-foreground-inverse text-xs font-medium px-3 py-1.5 rounded-lg hover:opacity-90"
                      >
                        Check In
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Today Departures */}
      <section className="bg-foreground-inverse border border-border rounded-2xl p-5 vsm:p-6 mb-6">
        <h2 className="text-foreground font-semibold text-base mb-4">Today&apos;s Departures</h2>
        {data.todayDepartures.length === 0 ? (
          <p className="text-foreground-tertiary text-sm text-center py-6">No departures scheduled for today</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-foreground-tertiary text-[11px] uppercase tracking-wider border-b border-border">
                  <th className="py-2 px-2 font-semibold">Guest</th>
                  <th className="py-2 px-2 font-semibold">Room</th>
                  <th className="py-2 px-2 font-semibold">Checkout</th>
                  <th className="py-2 px-2 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {data.todayDepartures.map(b => {
                  const pending = pendingOrdersByBookingId[b.id] || 0
                  return (
                    <tr key={b.id} className="border-b border-border last:border-0">
                      <td className="py-3 px-2 text-foreground font-medium">
                        {b.guestName}
                        {pending > 0 && (
                          <span className="ml-2 inline-flex items-center bg-warning-bg text-warning text-[10px] font-semibold px-2 py-0.5 rounded-full">
                            {pending} pending
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-foreground">{b.roomNumber}</td>
                      <td className="py-3 px-2 text-foreground-tertiary">
                        {new Date(b.checkOut).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </td>
                      <td className="py-3 px-2 text-right">
                        <button
                          onClick={() => openCheckOut(b.id)}
                          className="bg-foreground text-foreground-inverse text-xs font-medium px-3 py-1.5 rounded-lg hover:opacity-90"
                        >
                          Check Out
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Room Status Board */}
      <section className="bg-foreground-inverse border border-border rounded-2xl p-5 vsm:p-6">
        <h2 className="text-foreground font-semibold text-base mb-4">Room Status Board</h2>
        <RoomStatusBoard floors={rooms} onRoomUpdated={fetchAll} />
      </section>

      <CheckInModal
        booking={checkInBooking}
        onClose={() => setCheckInBooking(null)}
        onSuccess={() => {
          setCheckInBooking(null)
          fetchAll()
        }}
      />
      <CheckOutModal
        booking={checkOutBooking}
        onClose={() => setCheckOutBooking(null)}
        onSuccess={() => {
          setCheckOutBooking(null)
          fetchAll()
        }}
      />
      <WalkInBookingModal
        open={walkInOpen}
        onClose={() => setWalkInOpen(false)}
        onSuccess={fetchAll}
      />

      <OverstayModal
        room={overstayBooking ? { id: '', number: overstayBooking.roomNumber, floor: 0, roomType: { name: '' } } : null}
        booking={overstayBooking ? {
          id: overstayBooking.id,
          bookingRef: overstayBooking.bookingRef,
          checkIn: overstayBooking.checkIn,
          checkOut: overstayBooking.checkOut,
          guest: {
            firstName: overstayBooking.guestName.split(' ')[0],
            lastName: overstayBooking.guestName.split(' ').slice(1).join(' '),
          },
          hoursOverdue: overstayBooking.hoursOverdue,
        } : null}
        onClose={() => setOverstayBooking(null)}
        onSuccess={() => { setOverstayBooking(null); fetchAll() }}
      />
    </div>
  )
}
