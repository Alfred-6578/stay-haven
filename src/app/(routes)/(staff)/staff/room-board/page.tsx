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
import { MdOutlineKingBed } from 'react-icons/md'
import CheckInModal, { CheckInBooking } from '@/component/staff/CheckInModal'
import CheckOutModal, { CheckOutBooking } from '@/component/staff/CheckOutModal'
import NoShowModal from '@/component/staff/NoShowModal'
import OverstayModal from '@/component/staff/OverstayModal'
import EmptyState from '@/component/ui/EmptyState'
import ErrorState from '@/component/ui/ErrorState'
import { SkeletonBar } from '@/component/ui/PageSkeleton'

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
    status: string
    checkIn: string
    checkOut: string
    guest: { firstName: string; lastName: string }
  } | null
  bookingStatus: string | null
  isNoShow: boolean
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
  const [error, setError] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  // Modals & selections
  const [checkInBooking, setCheckInBooking] = useState<CheckInBooking | null>(null)
  const [checkOutBooking, setCheckOutBooking] = useState<CheckOutBooking | null>(null)
  const [statusRoom, setStatusRoom] = useState<BoardRoom | null>(null)
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [noShowRoom, setNoShowRoom] = useState<BoardRoom | null>(null)
  const [overstayRoom, setOverstayRoom] = useState<BoardRoom | null>(null)

  const fetchAll = useCallback(async (opts: { silent?: boolean } = {}) => {
    if (!opts.silent) { setLoading(true); setError(false) }
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
      if (!opts.silent) setError(true)
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
    // No-show room → open no-show modal
    if (room.isNoShow && room.currentBooking) {
      setNoShowRoom(room)
      return
    }
    if (room.status === 'OCCUPIED' && room.currentBooking) {
      // Check if this is an overdue checkout
      const now = new Date()
      const checkOut = new Date(room.currentBooking.checkOut)
      if (checkOut < now) {
        setOverstayRoom(room)
        return
      }
      // Normal checkout — try today's departures first (has roomServiceOrders data)
      const existingDeparture = departures.find(d => d.id === room.currentBooking?.id)
      if (existingDeparture) {
        setCheckOutBooking(existingDeparture)
        return
      }
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
    const noShows = all.filter(r => r.isNoShow).length
    return {
      total: all.length,
      occupied: all.filter(r => r.status === 'OCCUPIED' && !r.isNoShow).length,
      available: all.filter(r => r.status === 'AVAILABLE' && !r.isNoShow).length,
      cleaning: all.filter(r => r.status === 'CLEANING').length,
      maintenance: all.filter(r => r.status === 'MAINTENANCE').length,
      noShows,
    }
  }, [floors])

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap mb-6">
        <div>
          <h1 className="text-foreground font-heading text-xl sm:text-2xl font-bold">Room Board</h1>
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
          className="flex items-center gap-1.5 border border-border rounded-lg px-3 py-2 text-xs font-medium text-foreground hover:bg-foreground-disabled/5 disabled:opacity-50 shrink-0"
        >
          <HiOutlineRefresh size={14} className={loading || refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 vsm:grid-cols-4 gap-3">
            {[0, 1, 2, 3].map(i => <SkeletonBar key={i} className="h-20 rounded-xl" />)}
          </div>
          <SkeletonBar className="h-40 rounded-2xl" />
          <SkeletonBar className="h-60 rounded-2xl" />
        </div>
      ) : error ? (
        <ErrorState
          title="Couldn't load the board"
          description="We had trouble fetching rooms and today's movements. Please try again."
          onRetry={() => fetchAll()}
        />
      ) : (
        <>
          {/* Stats strip */}
          <div className={`grid grid-cols-2 ${stats.noShows > 0 ? 'vsm:grid-cols-5' : 'vsm:grid-cols-4'} gap-3 mb-6`}>
            <StatPill label="Occupied" value={stats.occupied} total={stats.total} color="#8A4A30" bg="#FAECE7" />
            <StatPill label="Available" value={stats.available} total={stats.total} color="#4A6B2E" bg="#EAF3DE" />
            {stats.noShows > 0 && (
              <StatPill label="No-Show" value={stats.noShows} total={stats.total} color="#DC2626" bg="#FEE2E2" />
            )}
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
                    className="shrink-0 w-64 text-left bg-[#EAF3DE] hover:ring-2 hover:ring-[#4A6B2E]/20 rounded-xl p-3 transition-all"
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
                      className="shrink-0 w-64 text-left bg-[#FAECE7] hover:ring-2 hover:ring-[#8A4A30]/20 rounded-xl p-3 transition-all"
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
              <EmptyState
                icon={<MdOutlineKingBed />}
                title="No rooms configured"
                description="Ask an admin to add rooms from the admin rooms page."
                className="py-8"
              />
            ) : (
              <div className="flex flex-col gap-6">
                {floors.map(({ floor, rooms }) => (
                  <div key={floor}>
                    <h3 className="text-foreground-secondary font-semibold text-xs uppercase tracking-wider mb-3">
                      Floor {floor} <span className="text-foreground-tertiary">· {rooms.length} rooms</span>
                    </h3>
                    <div className="grid grid-cols-2 vsm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                      {rooms.map(room => {
                        const isNoShow = room.isNoShow
                        const style = statusStyles[room.status]
                        const cardBg = isNoShow ? 'bg-[#FEE2E2]' : style.bg
                        return (
                          <button
                            key={room.id}
                            onClick={() => handleRoomClick(room)}
                            className={`${cardBg} rounded-xl p-3 text-left hover:ring-2 hover:ring-foreground/20 transition-all min-h-[130px] flex flex-col justify-between relative`}
                          >
                            {isNoShow && (
                              <div className="absolute top-2 right-2">
                                <span className="bg-[#DC2626] text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase">No-Show</span>
                              </div>
                            )}
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-foreground font-bold text-xl leading-none">{room.number}</span>
                              {!isNoShow && (
                                <span className={`${style.text} text-[9px] font-semibold uppercase tracking-wider`}>{style.label}</span>
                              )}
                            </div>
                            <div>
                              <p className="text-foreground-secondary text-[11px] truncate">{room.roomType.name}</p>
                              {room.currentBooking && (
                                <>
                                  <p className="text-foreground text-xs font-medium truncate mt-1">
                                    {room.currentBooking.guest.firstName} {room.currentBooking.guest.lastName}
                                  </p>
                                  {isNoShow ? (
                                    <p className="text-[#DC2626] text-[10px] font-semibold">
                                      Expected {new Date(room.currentBooking.checkIn).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </p>
                                  ) : room.status === 'OCCUPIED' ? (
                                    <p className="text-foreground-tertiary text-[10px]">
                                      Out: {new Date(room.currentBooking.checkOut).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </p>
                                  ) : null}
                                </>
                              )}
                              {room.notes && !room.currentBooking && (
                                <p className="text-foreground-tertiary text-[10px] truncate mt-1" title={room.notes}>
                                  {room.notes}
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

      {/* No-show modal */}
      <NoShowModal
        room={noShowRoom ? { id: noShowRoom.id, number: noShowRoom.number, floor: noShowRoom.floor, roomType: noShowRoom.roomType } : null}
        booking={noShowRoom?.currentBooking ? {
          id: noShowRoom.currentBooking.id,
          bookingRef: noShowRoom.currentBooking.bookingRef,
          checkIn: noShowRoom.currentBooking.checkIn,
          guest: noShowRoom.currentBooking.guest,
        } : null}
        daysMissed={noShowRoom?.currentBooking ? Math.floor(
          (new Date().getTime() - new Date(noShowRoom.currentBooking.checkIn).getTime()) / (1000 * 60 * 60 * 24)
        ) : undefined}
        onClose={() => setNoShowRoom(null)}
        onSuccess={() => { setNoShowRoom(null); fetchAll({ silent: true }) }}
      />

      {/* Overstay modal */}
      <OverstayModal
        room={overstayRoom ? { id: overstayRoom.id, number: overstayRoom.number, floor: overstayRoom.floor, roomType: overstayRoom.roomType } : null}
        booking={overstayRoom?.currentBooking ? {
          id: overstayRoom.currentBooking.id,
          bookingRef: overstayRoom.currentBooking.bookingRef,
          checkIn: overstayRoom.currentBooking.checkIn,
          checkOut: overstayRoom.currentBooking.checkOut,
          guest: overstayRoom.currentBooking.guest,
          hoursOverdue: Math.floor(
            (new Date().getTime() - new Date(overstayRoom.currentBooking.checkOut).getTime()) / (1000 * 60 * 60)
          ),
        } : null}
        onClose={() => setOverstayRoom(null)}
        onSuccess={() => { setOverstayRoom(null); fetchAll({ silent: true }) }}
      />
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
