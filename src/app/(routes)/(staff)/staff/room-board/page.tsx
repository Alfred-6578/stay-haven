'use client'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import {
  HiOutlineRefresh,
  HiOutlineArrowCircleRight,
  HiOutlineArrowCircleLeft,
  HiOutlineCog,
  HiOutlineSparkles,
  HiOutlineCheck,
  HiOutlineX,
} from 'react-icons/hi'
import CheckInModal, { CheckInBooking } from '@/component/staff/CheckInModal'
import CheckOutModal, { CheckOutBooking } from '@/component/staff/CheckOutModal'

type RoomStatus = 'AVAILABLE' | 'OCCUPIED' | 'CLEANING' | 'MAINTENANCE'

interface BoardRoom {
  id: string
  number: string
  floor: number
  status: RoomStatus
  notes: string | null
  roomType: { name: string; basePrice: number | string }
  currentBooking: {
    id: string
    bookingRef: string
    checkIn: string
    checkOut: string
    guest: { firstName: string; lastName: string }
  } | null
}

interface FloorGroup {
  floor: number
  rooms: BoardRoom[]
}

const AUTO_REFRESH_MS = 60_000

const statusStyles: Record<RoomStatus, { bg: string; label: string; text: string }> = {
  AVAILABLE: { bg: 'bg-[#EAF3DE]', label: 'Available', text: 'text-[#4A6B2E]' },
  OCCUPIED: { bg: 'bg-[#FAECE7]', label: 'Occupied', text: 'text-[#8A4A30]' },
  CLEANING: { bg: 'bg-[#FAEEDA]', label: 'Cleaning', text: 'text-[#8A6A20]' },
  MAINTENANCE: { bg: 'bg-[#F1EFE8]', label: 'Maintenance', text: 'text-[#5E5A4E]' },
}

export default function StaffRoomBoardPage() {
  const [floors, setFloors] = useState<FloorGroup[]>([])
  const [arrivals, setArrivals] = useState<CheckInBooking[]>([])
  const [departures, setDepartures] = useState<CheckOutBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  // Modals & selections
  const [checkInBooking, setCheckInBooking] = useState<CheckInBooking | null>(null)
  const [checkOutBooking, setCheckOutBooking] = useState<CheckOutBooking | null>(null)
  const [statusRoom, setStatusRoom] = useState<BoardRoom | null>(null)
  const [statusUpdating, setStatusUpdating] = useState(false)

  const fetchAll = useCallback(async (opts: { silent?: boolean } = {}) => {
    if (!opts.silent) setLoading(true)
    else setRefreshing(true)
    try {
      const [roomsRes, arrivalsRes, departuresRes] = await Promise.all([
        api.get('/staff/rooms'),
        api.get('/staff/arrivals'),
        api.get('/staff/departures'),
      ])
      setFloors(roomsRes.data.data.floors || [])
      setArrivals(arrivalsRes.data.data || [])
      setDepartures(departuresRes.data.data || [])
      setLastRefresh(new Date())
    } catch {
      if (!opts.silent) toast.error('Failed to load board')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Auto-refresh every 60s
  useEffect(() => {
    const interval = setInterval(() => fetchAll({ silent: true }), AUTO_REFRESH_MS)
    return () => clearInterval(interval)
  }, [fetchAll])

  const handleRoomClick = (room: BoardRoom) => {
    if (room.status === 'OCCUPIED' && room.currentBooking) {
      // Try to find in today's departures first (has full roomServiceOrders data)
      const existingDeparture = departures.find(d => d.id === room.currentBooking?.id)
      if (existingDeparture) {
        setCheckOutBooking(existingDeparture)
        return
      }
      // Not checking out today — fetch full booking
      openCheckOutForBooking(room.currentBooking.id)
    } else {
      // AVAILABLE / CLEANING / MAINTENANCE → status change
      setStatusRoom(room)
    }
  }

  const openCheckOutForBooking = async (bookingId: string) => {
    try {
      const res = await api.get(`/bookings/${bookingId}`)
      const full = res.data.data
      setCheckOutBooking({
        id: full.id,
        bookingRef: full.bookingRef,
        checkIn: full.checkIn,
        checkOut: full.checkOut,
        totalNights: full.totalNights,
        guest: {
          firstName: full.guest.firstName,
          lastName: full.guest.lastName,
          email: full.guest.email,
        },
        room: {
          number: full.room.number,
          floor: full.room.floor,
          roomType: { name: full.room.roomType.name },
        },
        roomServiceOrders: (full.roomServiceOrders || []).filter(
          (o: { status: string }) => o.status !== 'DELIVERED'
        ),
      })
    } catch {
      toast.error('Failed to load booking')
    }
  }

  const updateRoomStatus = async (status: 'AVAILABLE' | 'CLEANING' | 'MAINTENANCE') => {
    if (!statusRoom) return
    setStatusUpdating(true)
    try {
      await api.patch(`/staff/rooms/${statusRoom.id}/status`, { status })
      toast.success(`Room ${statusRoom.number} → ${status.toLowerCase()}`)
      setStatusRoom(null)
      fetchAll({ silent: true })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Update failed'
      toast.error(msg)
    } finally {
      setStatusUpdating(false)
    }
  }

  // Stats strip
  const stats = useMemo(() => {
    const all = floors.flatMap(f => f.rooms)
    return {
      total: all.length,
      occupied: all.filter(r => r.status === 'OCCUPIED').length,
      available: all.filter(r => r.status === 'AVAILABLE').length,
      cleaning: all.filter(r => r.status === 'CLEANING').length,
      maintenance: all.filter(r => r.status === 'MAINTENANCE').length,
    }
  }, [floors])

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap mb-6">
        <div>
          <h1 className="text-foreground font-heading text-2xl font-bold">Room Board</h1>
          <p className="text-foreground-tertiary text-sm">
            Real-time status of every room. Click any room for actions.
            {lastRefresh && (
              <span className="ml-1">
                Updated {lastRefresh.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}.
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => fetchAll()}
          disabled={loading || refreshing}
          className="flex items-center gap-1.5 border border-border rounded-lg px-3 py-2 text-xs font-medium text-foreground hover:bg-foreground-disabled/5 disabled:opacity-50"
        >
          <HiOutlineRefresh size={14} className={loading || refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="h-20 bg-foreground-disabled/10 rounded-2xl animate-pulse" />
          <div className="h-40 bg-foreground-disabled/10 rounded-2xl animate-pulse" />
          <div className="h-60 bg-foreground-disabled/10 rounded-2xl animate-pulse" />
        </div>
      ) : (
        <>
          {/* Stats strip */}
          <div className="grid grid-cols-2 vsm:grid-cols-4 gap-3 mb-6">
            <StatPill label="Occupied" value={stats.occupied} total={stats.total} color="#8A4A30" bg="#FAECE7" />
            <StatPill label="Available" value={stats.available} total={stats.total} color="#4A6B2E" bg="#EAF3DE" />
            <StatPill label="Cleaning" value={stats.cleaning} total={stats.total} color="#8A6A20" bg="#FAEEDA" />
            <StatPill label="Maintenance" value={stats.maintenance} total={stats.total} color="#5E5A4E" bg="#F1EFE8" />
          </div>

          {/* Arrivals row */}
          {arrivals.length > 0 && (
            <section className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <HiOutlineArrowCircleRight size={18} className="text-[#4A6B2E]" />
                <h2 className="text-foreground font-semibold text-sm">
                  Today&apos;s Arrivals <span className="text-foreground-tertiary">({arrivals.length})</span>
                </h2>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-1 -mx-5 vsm:-mx-8 px-5 vsm:px-8">
                {arrivals.map(a => (
                  <button
                    key={a.id}
                    onClick={() => setCheckInBooking(a)}
                    className="flex-shrink-0 w-64 text-left bg-[#EAF3DE] hover:ring-2 hover:ring-[#4A6B2E]/20 rounded-xl p-3 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-foreground font-semibold text-sm truncate">
                        {a.guest.firstName} {a.guest.lastName}
                      </p>
                      <span className="text-[10px] font-semibold text-[#4A6B2E] bg-white/60 px-2 py-0.5 rounded-full whitespace-nowrap">Room {a.room.number}</span>
                    </div>
                    <p className="text-foreground-secondary text-xs truncate">{a.room.roomType.name} · Floor {a.room.floor}</p>
                    <p className="text-foreground-tertiary text-[11px] mt-1">{a.totalNights} night{a.totalNights !== 1 ? 's' : ''} · {a.bookingRef}</p>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Departures row */}
          {departures.length > 0 && (
            <section className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <HiOutlineArrowCircleLeft size={18} className="text-[#8A4A30]" />
                <h2 className="text-foreground font-semibold text-sm">
                  Departures <span className="text-foreground-tertiary">({departures.length})</span>
                </h2>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-1 -mx-5 vsm:-mx-8 px-5 vsm:px-8">
                {departures.map(d => {
                  const pending = d.roomServiceOrders?.length || 0
                  return (
                    <button
                      key={d.id}
                      onClick={() => setCheckOutBooking(d)}
                      className="flex-shrink-0 w-64 text-left bg-[#FAECE7] hover:ring-2 hover:ring-[#8A4A30]/20 rounded-xl p-3 transition-all"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-foreground font-semibold text-sm truncate">
                          {d.guest.firstName} {d.guest.lastName}
                        </p>
                        <span className="text-[10px] font-semibold text-[#8A4A30] bg-white/60 px-2 py-0.5 rounded-full whitespace-nowrap">Room {d.room.number}</span>
                      </div>
                      <p className="text-foreground-secondary text-xs truncate">{d.room.roomType.name}</p>
                      <p className="text-foreground-tertiary text-[11px] mt-1">
                        {d.bookingRef}
                        {pending > 0 && (
                          <span className="ml-2 text-warning font-semibold">{pending} pending order{pending !== 1 ? 's' : ''}</span>
                        )}
                      </p>
                    </button>
                  )
                })}
              </div>
            </section>
          )}

          {/* Floor board */}
          <section className="bg-foreground-inverse border border-border rounded-2xl p-5 vsm:p-6">
            <h2 className="text-foreground font-semibold text-sm mb-4">Floors</h2>
            {floors.length === 0 ? (
              <p className="text-foreground-tertiary text-sm text-center py-6">No rooms configured</p>
            ) : (
              <div className="flex flex-col gap-6">
                {floors.map(({ floor, rooms }) => (
                  <div key={floor}>
                    <h3 className="text-foreground-secondary font-semibold text-xs uppercase tracking-wider mb-3">
                      Floor {floor} <span className="text-foreground-tertiary">· {rooms.length} rooms</span>
                    </h3>
                    <div className="grid grid-cols-2 vsm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                      {rooms.map(room => {
                        const style = statusStyles[room.status]
                        return (
                          <button
                            key={room.id}
                            onClick={() => handleRoomClick(room)}
                            className={`${style.bg} rounded-xl p-3 text-left hover:ring-2 hover:ring-foreground/20 transition-all min-h-[130px] flex flex-col justify-between`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-foreground font-bold text-xl leading-none">{room.number}</span>
                              <span className={`${style.text} text-[9px] font-semibold uppercase tracking-wider`}>{style.label}</span>
                            </div>
                            <div>
                              <p className="text-foreground-secondary text-[11px] truncate">{room.roomType.name}</p>
                              {room.status === 'OCCUPIED' && room.currentBooking && (
                                <>
                                  <p className="text-foreground text-xs font-medium truncate mt-1">
                                    {room.currentBooking.guest.firstName} {room.currentBooking.guest.lastName}
                                  </p>
                                  <p className="text-foreground-tertiary text-[10px]">
                                    Out: {new Date(room.currentBooking.checkOut).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  </p>
                                </>
                              )}
                              {room.notes && room.status !== 'OCCUPIED' && (
                                <p className="text-foreground-tertiary text-[10px] truncate mt-1" title={room.notes}>
                                  📝 {room.notes}
                                </p>
                              )}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {/* Modals */}
      <CheckInModal
        booking={checkInBooking}
        onClose={() => setCheckInBooking(null)}
        onSuccess={() => { setCheckInBooking(null); fetchAll({ silent: true }) }}
      />
      <CheckOutModal
        booking={checkOutBooking}
        onClose={() => setCheckOutBooking(null)}
        onSuccess={() => { setCheckOutBooking(null); fetchAll({ silent: true }) }}
      />

      {/* Status change dialog */}
      {statusRoom && (
        <StatusChangeDialog
          room={statusRoom}
          loading={statusUpdating}
          onClose={() => setStatusRoom(null)}
          onChange={updateRoomStatus}
        />
      )}
    </div>
  )
}

function StatPill({ label, value, total, color, bg }: { label: string; value: number; total: number; color: string; bg: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div className="rounded-xl p-4" style={{ backgroundColor: bg }}>
      <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color }}>{label}</p>
      <p className="text-foreground text-2xl font-bold mt-1">{value}</p>
      <p className="text-foreground-tertiary text-[11px] mt-0.5">{pct}% of rooms</p>
    </div>
  )
}

function StatusChangeDialog({
  room,
  loading,
  onClose,
  onChange,
}: {
  room: BoardRoom
  loading: boolean
  onClose: () => void
  onChange: (status: 'AVAILABLE' | 'CLEANING' | 'MAINTENANCE') => void
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && !loading) onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [loading, onClose])

  const options: Array<{ key: 'AVAILABLE' | 'CLEANING' | 'MAINTENANCE'; label: string; icon: React.ComponentType<{ size?: number }> }> = [
    { key: 'AVAILABLE', label: 'Mark Available', icon: HiOutlineCheck },
    { key: 'CLEANING', label: 'Mark for Cleaning', icon: HiOutlineSparkles },
    { key: 'MAINTENANCE', label: 'Mark for Maintenance', icon: HiOutlineCog },
  ]

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-foreground/50 backdrop-blur-sm animate-modal-backdrop" onClick={loading ? undefined : onClose} />
      <div className="relative w-full max-w-sm bg-foreground-inverse rounded-2xl shadow-2xl overflow-hidden animate-modal-content">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <p className="text-foreground-tertiary text-xs">Room</p>
            <h2 className="text-foreground font-heading font-bold text-lg">{room.number} · Floor {room.floor}</h2>
            <p className="text-foreground-tertiary text-xs">{room.roomType.name} · Currently {room.status.toLowerCase()}</p>
          </div>
          <button onClick={onClose} disabled={loading} className="p-2 text-foreground-tertiary hover:text-foreground">
            <HiOutlineX size={18} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-2">
          {options.map(({ key, label, icon: Icon }) => {
            const isCurrent = room.status === key
            return (
              <button
                key={key}
                onClick={() => !isCurrent && onChange(key)}
                disabled={isCurrent || loading}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${
                  isCurrent
                    ? 'border-foreground-disabled text-foreground-disabled bg-foreground-disabled/5 cursor-not-allowed'
                    : 'border-border text-foreground hover:bg-foreground-disabled/5'
                }`}
              >
                <Icon size={16} />
                {label}
                {isCurrent && <span className="ml-auto text-[10px] uppercase tracking-wider">current</span>}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
