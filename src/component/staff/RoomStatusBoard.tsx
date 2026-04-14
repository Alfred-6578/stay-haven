'use client'
import React, { useState } from 'react'
import RoomActionSheet from './RoomActionSheet'

export interface StaffRoom {
  id: string
  number: string
  floor: number
  status: 'AVAILABLE' | 'OCCUPIED' | 'CLEANING' | 'MAINTENANCE'
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
  rooms: StaffRoom[]
}

interface Props {
  floors: FloorGroup[]
  onRoomUpdated: () => void
}

const statusStyles: Record<StaffRoom['status'], { bg: string; label: string; text: string }> = {
  AVAILABLE: { bg: 'bg-[#EAF3DE]', label: 'Available', text: 'text-[#4A6B2E]' },
  OCCUPIED: { bg: 'bg-[#FAECE7]', label: 'Occupied', text: 'text-[#8A4A30]' },
  CLEANING: { bg: 'bg-[#FAEEDA]', label: 'Cleaning', text: 'text-[#8A6A20]' },
  MAINTENANCE: { bg: 'bg-[#F1EFE8]', label: 'Maintenance', text: 'text-[#5E5A4E]' },
}

const RoomStatusCard = ({ room, onClick }: { room: StaffRoom; onClick: () => void }) => {
  const style = statusStyles[room.status]
  return (
    <button
      onClick={onClick}
      className={`${style.bg} rounded-xl p-4 text-left hover:ring-2 hover:ring-foreground/20 transition-all min-h-[110px] flex flex-col justify-between`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-foreground font-bold text-2xl leading-none">{room.number}</span>
        <span className={`${style.text} text-[10px] font-semibold uppercase tracking-wider`}>{style.label}</span>
      </div>
      <div className="mt-2">
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
      </div>
    </button>
  )
}

const RoomStatusBoard = ({ floors, onRoomUpdated }: Props) => {
  const [selectedRoom, setSelectedRoom] = useState<StaffRoom | null>(null)

  return (
    <>
      <div className="flex flex-col gap-6">
        {floors.map(({ floor, rooms }) => (
          <div key={floor}>
            <h3 className="text-foreground font-semibold text-sm mb-3">Floor {floor}</h3>
            <div className="grid grid-cols-2 vsm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {rooms.map(room => (
                <RoomStatusCard key={room.id} room={room} onClick={() => setSelectedRoom(room)} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <RoomActionSheet
        room={selectedRoom}
        onClose={() => setSelectedRoom(null)}
        onUpdated={() => {
          setSelectedRoom(null)
          onRoomUpdated()
        }}
      />
    </>
  )
}

export default RoomStatusBoard
