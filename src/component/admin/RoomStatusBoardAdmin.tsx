'use client'
import React, { useState } from 'react'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { HiOutlineCheck, HiOutlineCog, HiOutlineSparkles } from 'react-icons/hi'

export interface AdminRoom {
  id: string
  number: string
  floor: number
  status: 'AVAILABLE' | 'OCCUPIED' | 'CLEANING' | 'MAINTENANCE'
  notes: string | null
  roomType: { name: string }
  currentBooking?: {
    id: string
    guest: { firstName: string; lastName: string }
    checkOut: string
  } | null
}

interface FloorGroup {
  floor: number
  rooms: AdminRoom[]
}

interface Props {
  floors: FloorGroup[]
  onUpdated: () => void
}

const statusStyles: Record<AdminRoom['status'], { bg: string; label: string; text: string }> = {
  AVAILABLE: { bg: 'bg-[#EAF3DE]', label: 'Available', text: 'text-[#4A6B2E]' },
  OCCUPIED: { bg: 'bg-[#FAECE7]', label: 'Occupied', text: 'text-[#8A4A30]' },
  CLEANING: { bg: 'bg-[#FAEEDA]', label: 'Cleaning', text: 'text-[#8A6A20]' },
  MAINTENANCE: { bg: 'bg-[#F1EFE8]', label: 'Maintenance', text: 'text-[#5E5A4E]' },
}

type EditableStatus = 'AVAILABLE' | 'CLEANING' | 'MAINTENANCE'
const EDITABLE_ACTIONS: Array<{ status: EditableStatus; label: string; icon: React.ComponentType<{ size?: number }> }> = [
  { status: 'AVAILABLE', label: 'Available', icon: HiOutlineCheck },
  { status: 'CLEANING', label: 'Cleaning', icon: HiOutlineSparkles },
  { status: 'MAINTENANCE', label: 'Maintenance', icon: HiOutlineCog },
]

const RoomStatusBoardAdmin = ({ floors, onUpdated }: Props) => {
  const [editingRoom, setEditingRoom] = useState<string | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)

  const updateStatus = async (room: AdminRoom, status: EditableStatus) => {
    setUpdating(room.id)
    try {
      await api.patch(`/rooms/${room.id}`, { status })
      toast.success(`Room ${room.number} → ${status.toLowerCase()}`)
      setEditingRoom(null)
      onUpdated()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Update failed'
      toast.error(msg)
    } finally {
      setUpdating(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {floors.map(({ floor, rooms }) => (
        <div key={floor}>
          <h3 className="text-foreground font-semibold text-sm mb-3">Floor {floor}</h3>
          <div className="grid grid-cols-2 vsm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {rooms.map(room => {
              const style = statusStyles[room.status]
              const isEditing = editingRoom === room.id
              const isUpdating = updating === room.id
              const canEdit = room.status !== 'OCCUPIED'

              return (
                <div
                  key={room.id}
                  className={`${style.bg} rounded-xl p-3 min-h-[130px] flex flex-col justify-between relative`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-foreground font-bold text-xl leading-none">{room.number}</span>
                    <span className={`${style.text} text-[10px] font-semibold uppercase tracking-wider`}>{style.label}</span>
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
                    {canEdit && !isEditing && (
                      <button
                        onClick={() => setEditingRoom(room.id)}
                        className="mt-2 text-[10px] font-semibold text-foreground hover:underline w-full text-left"
                      >
                        Change status →
                      </button>
                    )}
                  </div>

                  {/* Inline editor */}
                  {isEditing && (
                    <div className="absolute inset-0 bg-foreground-inverse rounded-xl border-2 border-foreground p-3 shadow-lg z-10 flex flex-col">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-foreground font-semibold text-sm">Room {room.number}</p>
                        <button onClick={() => setEditingRoom(null)} className="text-foreground-tertiary text-xs">×</button>
                      </div>
                      <div className="flex flex-col gap-1 flex-1">
                        {EDITABLE_ACTIONS.map(({ status, label, icon: Icon }) => {
                          const active = room.status === status
                          return (
                            <button
                              key={status}
                              onClick={() => !active && updateStatus(room, status)}
                              disabled={active || isUpdating}
                              className={`flex items-center gap-2 px-2 py-1.5 rounded text-[11px] font-medium transition-colors text-left ${
                                active
                                  ? 'bg-foreground text-foreground-inverse opacity-50 cursor-not-allowed'
                                  : 'hover:bg-foreground-disabled/10 text-foreground'
                              } disabled:opacity-40`}
                            >
                              <Icon size={12} />
                              {label}
                              {active && <span className="ml-auto text-[9px]">current</span>}
                            </button>
                          )
                        })}
                      </div>
                      {isUpdating && (
                        <div className="absolute inset-0 bg-foreground-inverse/80 flex items-center justify-center rounded-xl">
                          <div className="w-4 h-4 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

export default RoomStatusBoardAdmin
