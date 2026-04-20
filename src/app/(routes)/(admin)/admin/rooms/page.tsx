'use client'
import React, { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import {
  HiOutlinePlus,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineViewGrid,
  HiOutlineTable,
  HiOutlinePhotograph,
} from 'react-icons/hi'
import { MdOutlineKingBed } from 'react-icons/md'
import RoomTypeFormModal from '@/component/admin/RoomTypeFormModal'
import RoomFormModal from '@/component/admin/RoomFormModal'
import RoomStatusBoardAdmin, { AdminRoom } from '@/component/admin/RoomStatusBoardAdmin'
import ConfirmModal from '@/component/ui/ConfirmModal'
import EmptyState from '@/component/ui/EmptyState'
import ErrorState from '@/component/ui/ErrorState'
import { RoomCardSkeleton, TableRowSkeleton } from '@/component/ui/PageSkeleton'

interface RoomType {
  id: string
  slug: string
  name: string
  tag: string | null
  description: string
  capacity: number
  amenities: string[]
  basePrice: number | string
  weekendMultiplier: number | string
  image: string | null
  images: string[]
  _count?: { rooms: number }
}

interface Room {
  id: string
  number: string
  floor: number
  status: 'AVAILABLE' | 'OCCUPIED' | 'CLEANING' | 'MAINTENANCE'
  notes: string | null
  roomTypeId: string
  roomType: { name: string; basePrice: number | string }
}

type Tab = 'types' | 'rooms'
type RoomsView = 'table' | 'board'

const STATUS_STYLES: Record<string, string> = {
  AVAILABLE: 'bg-success-bg text-success',
  OCCUPIED: 'bg-danger-bg text-danger',
  CLEANING: 'bg-warning-bg text-warning',
  MAINTENANCE: 'bg-foreground-disabled/15 text-foreground-secondary',
}

export default function AdminRoomsPage() {
  const [tab, setTab] = useState<Tab>('types')
  const [types, setTypes] = useState<RoomType[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [roomsView, setRoomsView] = useState<RoomsView>('table')

  // Type modal
  const [typeModalOpen, setTypeModalOpen] = useState(false)
  const [editingType, setEditingType] = useState<RoomType | null>(null)

  // Room modal
  const [roomModalOpen, setRoomModalOpen] = useState(false)
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)

  // Delete confirms
  const [deleteType, setDeleteType] = useState<RoomType | null>(null)
  const [deleteRoom, setDeleteRoom] = useState<Room | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const [typesRes, roomsRes] = await Promise.all([
        api.get('/rooms/types'),
        api.get('/rooms?limit=200'),
      ])
      setTypes(typesRes.data.data || [])
      setRooms(roomsRes.data.data?.rooms || roomsRes.data.data || [])
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Build floor-grouped board data
  const floorGroups = React.useMemo(() => {
    const map = new Map<number, AdminRoom[]>()
    for (const r of rooms) {
      if (!map.has(r.floor)) map.set(r.floor, [])
      map.get(r.floor)!.push({
        id: r.id,
        number: r.number,
        floor: r.floor,
        status: r.status,
        notes: r.notes,
        roomType: { name: r.roomType.name },
        currentBooking: null,
      })
    }
    return Array.from(map.entries()).sort(([a], [b]) => a - b).map(([floor, rooms]) => ({ floor, rooms }))
  }, [rooms])

  const handleDeleteType = async () => {
    if (!deleteType) return
    setDeleteLoading(true)
    try {
      await api.delete(`/rooms/types/${deleteType.slug}`)
      toast.success(`${deleteType.name} deleted`)
      setDeleteType(null)
      fetchAll()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Delete failed'
      toast.error(msg)
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleDeleteRoom = async () => {
    if (!deleteRoom) return
    setDeleteLoading(true)
    try {
      await api.delete(`/rooms/${deleteRoom.id}`)
      toast.success(`Room ${deleteRoom.number} deleted`)
      setDeleteRoom(null)
      fetchAll()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Delete failed'
      toast.error(msg)
    } finally {
      setDeleteLoading(false)
    }
  }

  const formatNaira = (v: number | string) =>
    `₦${new Intl.NumberFormat('en-NG', { maximumFractionDigits: 0 }).format(Number(v))}`

  const roomCountByType = (typeId: string) =>
    rooms.filter(r => r.roomTypeId === typeId).length

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap mb-6">
        <div>
          <h1 className="text-foreground font-heading text-xl sm:text-2xl font-bold">Rooms</h1>
          <p className="text-foreground-tertiary text-sm">Manage room types and individual rooms</p>
        </div>
        <button
          onClick={() => {
            if (tab === 'types') { setEditingType(null); setTypeModalOpen(true) }
            else { setEditingRoom(null); setRoomModalOpen(true) }
          }}
          className="flex items-center gap-2 bg-[#0B1B3A] text-white rounded-lg px-4 py-2 text-sm font-semibold hover:opacity-90 shrink-0"
        >
          <HiOutlinePlus size={16} />
          {tab === 'types' ? 'Add Type' : 'Add Room'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border mb-6 overflow-x-auto">
        <button
          onClick={() => setTab('types')}
          disabled={loading}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-60 ${
            tab === 'types' ? 'border-[#D97706] text-foreground' : 'border-transparent text-foreground-tertiary hover:text-foreground'
          }`}
        >
          Room Types <span className="text-foreground-tertiary text-xs">({types.length})</span>
        </button>
        <button
          onClick={() => setTab('rooms')}
          disabled={loading}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-60 ${
            tab === 'rooms' ? 'border-[#D97706] text-foreground' : 'border-transparent text-foreground-tertiary hover:text-foreground'
          }`}
        >
          Individual Rooms <span className="text-foreground-tertiary text-xs">({rooms.length})</span>
        </button>
      </div>

      {/* Content */}
      {loading ? (
        tab === 'types' ? (
          <div className="grid vsm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[0, 1, 2, 3, 4, 5].map(i => <RoomCardSkeleton key={i} />)}
          </div>
        ) : (
          <div className="bg-foreground-inverse border border-border rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <tbody>
                  {[0, 1, 2, 3, 4].map(i => <TableRowSkeleton key={i} columns={6} />)}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : error ? (
        <ErrorState
          title="Couldn't load rooms"
          description="We had trouble fetching rooms and types. Please try again."
          onRetry={fetchAll}
        />
      ) : tab === 'types' ? (
        <div className="grid vsm:grid-cols-2 lg:grid-cols-3 gap-4">
          {types.length === 0 ? (
            <div className="col-span-full">
              <EmptyState
                icon={<MdOutlineKingBed />}
                title="No room types yet"
                description="Create your first room type — e.g. Deluxe, Suite, Standard — before adding individual rooms."
                actionLabel="Add Room Type"
                onAction={() => { setEditingType(null); setTypeModalOpen(true) }}
              />
            </div>
          ) : types.map(type => (
            <div key={type.id} className="bg-foreground-inverse border border-border rounded-2xl overflow-hidden flex flex-col hover:border-foreground-disabled/50 transition-colors">
              <div className="relative aspect-[16/10] bg-foreground-disabled/10">
                {type.image || type.images[0] ? (
                  <Image
                    src={type.image || type.images[0]}
                    alt={type.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-foreground-tertiary">
                    <HiOutlinePhotograph size={28} />
                  </div>
                )}
                {type.tag && (
                  <span className="absolute top-2 left-2 bg-foreground-inverse/90 text-foreground text-[10px] font-semibold px-2 py-0.5 rounded-full">
                    {type.tag}
                  </span>
                )}
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-foreground font-semibold">{type.name}</h3>
                  <span className="text-foreground font-semibold text-sm whitespace-nowrap">{formatNaira(type.basePrice)}</span>
                </div>
                <p className="text-foreground-tertiary text-xs line-clamp-2 mb-3">{type.description}</p>
                <div className="flex items-center gap-3 text-xs text-foreground-tertiary mb-3">
                  <span>{type.capacity} guests</span>
                  <span>·</span>
                  <span>{roomCountByType(type.id)} room{roomCountByType(type.id) !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex gap-2 mt-auto">
                  <button
                    onClick={() => { setEditingType(type); setTypeModalOpen(true) }}
                    className="flex-1 flex items-center justify-center gap-1.5 border border-border rounded-lg py-2 text-xs font-medium text-foreground hover:bg-foreground-disabled/5"
                  >
                    <HiOutlinePencil size={12} />
                    Edit
                  </button>
                  <button
                    onClick={() => setDeleteType(type)}
                    className="flex items-center justify-center gap-1.5 border border-danger/20 rounded-lg px-3 py-2 text-xs font-medium text-danger hover:bg-danger-bg"
                  >
                    <HiOutlineTrash size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div>
          {/* View toggle */}
          <div className="flex items-center justify-end mb-4">
            <div className="flex gap-1 bg-foreground-disabled/10 p-1 rounded-lg">
              <button
                onClick={() => setRoomsView('table')}
                className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${
                  roomsView === 'table' ? 'bg-foreground-inverse text-foreground shadow-sm' : 'text-foreground-secondary'
                }`}
              >
                <HiOutlineTable size={14} />
                Table
              </button>
              <button
                onClick={() => setRoomsView('board')}
                className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${
                  roomsView === 'board' ? 'bg-foreground-inverse text-foreground shadow-sm' : 'text-foreground-secondary'
                }`}
              >
                <HiOutlineViewGrid size={14} />
                Board
              </button>
            </div>
          </div>

          {roomsView === 'table' ? (
            <div className="bg-foreground-inverse border border-border rounded-2xl overflow-hidden">
              {rooms.length === 0 ? (
                <EmptyState
                  icon={<MdOutlineKingBed />}
                  title="No rooms yet"
                  description={types.length === 0
                    ? "Create a room type first, then add individual rooms to it."
                    : "Add your first room to start accepting bookings."}
                  actionLabel={types.length === 0 ? 'Add Room Type' : 'Add Room'}
                  onAction={() => {
                    if (types.length === 0) { setTab('types'); setEditingType(null); setTypeModalOpen(true) }
                    else { setEditingRoom(null); setRoomModalOpen(true) }
                  }}
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-foreground-tertiary text-[11px] uppercase tracking-wider border-b border-border bg-foreground-disabled/[0.03]">
                        <th className="py-3 px-4 font-semibold">Number</th>
                        <th className="py-3 px-4 font-semibold">Floor</th>
                        <th className="py-3 px-4 font-semibold">Type</th>
                        <th className="py-3 px-4 font-semibold">Status</th>
                        <th className="py-3 px-4 font-semibold max-md:hidden">Notes</th>
                        <th className="py-3 px-4 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rooms.map(r => (
                        <tr key={r.id} className="border-b border-border last:border-0 hover:bg-foreground-disabled/[0.02]">
                          <td className="py-3 px-4 text-foreground font-semibold">{r.number}</td>
                          <td className="py-3 px-4 text-foreground">{r.floor}</td>
                          <td className="py-3 px-4 text-foreground-secondary">{r.roomType.name}</td>
                          <td className="py-3 px-4">
                            <span className={`${STATUS_STYLES[r.status]} text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider`}>
                              {r.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-foreground-tertiary max-md:hidden max-w-[200px] truncate">{r.notes || '—'}</td>
                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex gap-1">
                              <button
                                onClick={() => { setEditingRoom(r); setRoomModalOpen(true) }}
                                className="text-foreground text-xs font-medium hover:underline px-2"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => setDeleteRoom(r)}
                                disabled={r.status === 'OCCUPIED'}
                                className="text-danger text-xs font-medium hover:underline px-2 disabled:text-foreground-disabled disabled:cursor-not-allowed"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-foreground-inverse border border-border rounded-2xl p-5">
              <RoomStatusBoardAdmin floors={floorGroups} onUpdated={fetchAll} />
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <RoomTypeFormModal
        open={typeModalOpen}
        initial={editingType}
        onClose={() => setTypeModalOpen(false)}
        onSaved={() => { setTypeModalOpen(false); fetchAll() }}
      />
      <RoomFormModal
        open={roomModalOpen}
        initial={editingRoom}
        onClose={() => setRoomModalOpen(false)}
        onSaved={() => { setRoomModalOpen(false); fetchAll() }}
      />
      <ConfirmModal
        open={!!deleteType}
        title={`Delete ${deleteType?.name}?`}
        message={`This will deactivate the room type. Rooms of this type will remain but can't accept new bookings.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleteLoading}
        onConfirm={handleDeleteType}
        onCancel={() => setDeleteType(null)}
      />
      <ConfirmModal
        open={!!deleteRoom}
        title={`Delete Room ${deleteRoom?.number}?`}
        message={`This removes the room from inventory. This can't be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleteLoading}
        onConfirm={handleDeleteRoom}
        onCancel={() => setDeleteRoom(null)}
      />
    </div>
  )
}
