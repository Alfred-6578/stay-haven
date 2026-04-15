'use client'
import React, { useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/api'
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
    guestName: string
    roomNumber: string
    hoursOverdue: number
  }>
  pendingCleaning: Array<{ id: string; number: string; floor: number }>
  counts: {
    arrivals: number
    departures: number
    overdue: number
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
  const [checkInBooking, setCheckInBooking] = useState<CheckInBooking | null>(null)
  const [checkOutBooking, setCheckOutBooking] = useState<CheckOutBooking | null>(null)
  const [walkInOpen, setWalkInOpen] = useState(false)

  const fetchAll = useCallback(async () => {
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
      // errors surface via toast at action level
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map(i => <div key={i} className="h-24 bg-foreground-disabled/10 rounded-2xl animate-pulse" />)}
        </div>
        <div className="h-64 bg-foreground-disabled/10 rounded-2xl animate-pulse" />
      </div>
    )
  }

  if (!data) return null

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <h1 className="text-foreground font-heading text-2xl font-bold">Staff Dashboard</h1>
        <button
          onClick={() => setWalkInOpen(true)}
          className="inline-flex items-center gap-2 bg-foreground text-foreground-inverse px-4 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90"
        >
          <HiOutlinePlus size={16} />
          Walk-in Booking
        </button>
      </div>

      {/* Stat bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard label="Arrivals Today" value={data.counts.arrivals} bg="bg-[#EAF3DE]" icon={HiOutlineArrowCircleRight} />
        <StatCard label="Departures Today" value={data.counts.departures} bg="bg-[#F0ECE4]" icon={HiOutlineArrowCircleLeft} />
        <StatCard label="Overdue" value={data.counts.overdue} bg="bg-[#FAECE7]" icon={HiOutlineExclamation} />
        <StatCard label="Needs Cleaning" value={data.counts.cleaning} bg="bg-[#FAEEDA]" icon={HiOutlineSparkles} />
      </div>

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
    </div>
  )
}
