'use client'
import React, { useState } from 'react'
import { HiOutlineUsers, HiOutlineCheck } from 'react-icons/hi'
import { MdOutlineKingBed } from 'react-icons/md'
import { BsStar, BsStarFill } from 'react-icons/bs'
import { FiWifi, FiMonitor, FiCoffee } from 'react-icons/fi'
import { TbAirConditioning, TbBath, TbToolsKitchen2 } from 'react-icons/tb'
import { LuConciergeBell } from 'react-icons/lu'

const amenityIcons: Record<string, React.ReactNode> = {
  'WiFi': <FiWifi size={18} />,
  'AC': <TbAirConditioning size={18} />,
  'TV': <FiMonitor size={18} />,
  'Smart TV': <FiMonitor size={18} />,
  'Mini-fridge': <TbToolsKitchen2 size={18} />,
  'Mini-bar': <TbToolsKitchen2 size={18} />,
  'Full bar': <TbToolsKitchen2 size={18} />,
  'Coffee maker': <FiCoffee size={18} />,
  'Bathtub': <TbBath size={18} />,
  'Rain shower': <TbBath size={18} />,
  'Butler service': <LuConciergeBell size={18} />,
}

interface Room {
  id: string
  number: string
  floor: number
  status: string
}

interface Props {
  name: string
  tag: string | null
  description: string
  capacity: number
  amenities: string[]
  basePrice: number
  weekendMultiplier: number
  rooms: Room[]
  availableCount: number
  selectedRoom: string | null
  visible: boolean
}

const RoomInfo = ({
  name, tag, description, capacity, amenities, basePrice,
  weekendMultiplier, rooms, availableCount, selectedRoom, visible,
}: Props) => {
  const [showAllAmenities, setShowAllAmenities] = useState(false)
  const visibleAmenities = showAllAmenities ? amenities : amenities.slice(0, 8)

  return (
    <div className={`lg:col-span-2 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
      {/* Title block */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            {tag && (
              <span className="text-xs font-medium text-foreground-tertiary bg-foreground-disabled/15 px-2.5 py-0.5 rounded-full">{tag}</span>
            )}
            <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${availableCount > 0 ? 'bg-success-bg text-success' : 'bg-danger-bg text-danger'}`}>
              {availableCount > 0 ? `${availableCount} available` : 'Fully booked'}
            </span>
          </div>
          <h1 className="font-heading text-2xl vsm:text-3xl sm:text-4xl font-bold text-foreground">{name}</h1>
        </div>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map(star => (
            <span key={star} className="text-foreground">
              {star <= 4 ? <BsStarFill size={14} /> : <BsStar size={14} />}
            </span>
          ))}
          <span className="text-foreground-tertiary text-sm ml-1">4.0</span>
        </div>
      </div>

      {/* Description */}
      <div className="pb-8 border-b border-border mb-8">
        <p className="text-foreground-secondary text-sm vsm:text-base leading-relaxed">{description}</p>
        <div className="flex flex-wrap items-center gap-4 mt-5">
          <div className="flex items-center gap-1.5 text-foreground-secondary text-sm">
            <HiOutlineUsers size={16} className="text-foreground-tertiary" />
            <span>{capacity} Guests</span>
          </div>
          <div className="w-px h-4 bg-border" />
          <div className="flex items-center gap-1.5 text-foreground-secondary text-sm">
            <MdOutlineKingBed size={16} className="text-foreground-tertiary" />
            <span>{rooms.length} Rooms</span>
          </div>
        </div>
      </div>

      {/* Amenities */}
      <div className="pb-8 border-b border-border mb-8">
        <h2 className="font-heading text-xl font-bold text-foreground mb-5">What this room offers</h2>
        <div className="grid max-[300px]:grid-cols-1 grid-cols-2 gap-x-8 gap-y-4">
          {visibleAmenities.map((amenity, i) => (
            <div
              key={amenity}
              className="flex items-center gap-3"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateX(0)' : 'translateX(-12px)',
                transition: `all 0.4s ease-out ${0.1 + i * 0.04}s`,
              }}
            >
              <div className="w-10 h-10 rounded-xl bg-foreground-disabled/10 flex items-center justify-center text-foreground flex-shrink-0">
                {amenityIcons[amenity] || <HiOutlineCheck size={16} />}
              </div>
              <span className="text-foreground text-sm">{amenity}</span>
            </div>
          ))}
        </div>
        {amenities.length > 8 && (
          <button
            onClick={() => setShowAllAmenities(!showAllAmenities)}
            className="mt-5 text-foreground text-sm font-medium border border-foreground rounded-lg px-5 py-2.5 hover:bg-foreground hover:text-foreground-inverse transition-colors"
          >
            {showAllAmenities ? 'Show less' : `Show all ${amenities.length} amenities`}
          </button>
        )}
      </div>

      {/* Room Details */}
      <div className="pb-8 border-b border-border mb-8">
        <h2 className="font-heading text-xl font-bold text-foreground mb-5">Room Details</h2>
        <div className="grid grid-cols-2 vsm:grid-cols-3 gap-4">
          {[
            { label: 'Type', value: name },
            { label: 'Max Guests', value: `${capacity} persons` },
            { label: 'Base Rate', value: `$${basePrice.toFixed(0)}/night` },
            ...(weekendMultiplier > 1 ? [{ label: 'Weekend Rate', value: `$${(basePrice * weekendMultiplier).toFixed(0)}/night` }] : []),
            { label: 'Rooms', value: `${rooms.length} total` },
            { label: 'Available', value: `${availableCount} now` },
          ].map(({ label, value }) => (
            <div key={label} className="bg-foreground-disabled/[0.08] rounded-xl p-4">
              <p className="text-foreground-tertiary text-xs mb-1">{label}</p>
              <p className="text-foreground text-sm font-semibold">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Floor Map */}
      <div>
        <h2 className="font-heading text-xl font-bold text-foreground mb-5">Floor Map</h2>
        <div className="bg-foreground-disabled/[0.08] rounded-2xl p-5 vsm:p-6">
          {Object.entries(
            rooms.reduce<Record<number, Room[]>>((acc, room) => {
              (acc[room.floor] = acc[room.floor] || []).push(room)
              return acc
            }, {})
          )
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([floor, floorRooms], fIdx) => (
              <div key={floor} className={`${fIdx > 0 ? 'mt-5 pt-5 border-t border-border' : ''}`}>
                <p className="text-foreground-tertiary text-xs font-semibold uppercase tracking-wider mb-3">Floor {floor}</p>
                <div className="flex flex-wrap gap-2">
                  {floorRooms.map(room => {
                    const isSelected = selectedRoom === room.id
                    return (
                      <div
                        key={room.id}
                        className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
                          isSelected
                            ? 'bg-foreground text-foreground-inverse ring-2 ring-foreground ring-offset-2'
                            : room.status === 'AVAILABLE'
                            ? 'bg-success/10 text-success'
                            : room.status === 'OCCUPIED'
                            ? 'bg-danger/10 text-danger'
                            : 'bg-foreground-disabled/15 text-foreground-tertiary'
                        }`}
                      >
                        {room.number}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          <div className="flex flex-wrap gap-4 mt-5 pt-4 border-t border-border">
            {[
              { color: 'bg-success/20', label: 'Available' },
              { color: 'bg-danger/20', label: 'Occupied' },
              { color: 'bg-foreground-disabled/20', label: 'Other' },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-sm ${l.color}`} />
                <span className="text-foreground-tertiary text-[11px]">{l.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default RoomInfo
