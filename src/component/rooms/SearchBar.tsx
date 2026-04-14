'use client'
import React from 'react'
import { HiOutlineCalendar, HiOutlineUsers, HiOutlineAdjustments } from 'react-icons/hi'
import { MdOutlineKingBed } from 'react-icons/md'

interface RoomTypeOption {
  slug: string
  name: string
}

interface Props {
  checkIn: string
  checkOut: string
  guests: string
  selectedType: string
  sortBy: string
  roomTypeOptions: RoomTypeOption[]
  onCheckInChange: (v: string) => void
  onCheckOutChange: (v: string) => void
  onGuestsChange: (v: string) => void
  onTypeChange: (v: string) => void
  onSortChange: (v: string) => void
  className?: string
}

const SearchBar = ({
  checkIn, checkOut, guests, selectedType, sortBy,
  roomTypeOptions,
  onCheckInChange, onCheckOutChange, onGuestsChange, onTypeChange, onSortChange,
  className = '',
}: Props) => {
  return (
    <div className={`bg-foreground-inverse rounded-2xl shadow-xl border border-border p-4 vsm:p-5 ${className}`}>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 vsm:gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-foreground-tertiary text-xs font-semibold uppercase tracking-wider">Check In</label>
          <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-2.5 focus-within:ring-2 focus-within:ring-foreground/20">
            <HiOutlineCalendar className="text-foreground-tertiary" size={16} />
            <input
              type="date"
              value={checkIn}
              onChange={(e) => onCheckInChange(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full text-sm text-foreground outline-none bg-transparent"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-foreground-tertiary text-xs font-semibold uppercase tracking-wider">Check Out</label>
          <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-2.5 focus-within:ring-2 focus-within:ring-foreground/20">
            <HiOutlineCalendar className="text-foreground-tertiary" size={16} />
            <input
              type="date"
              value={checkOut}
              onChange={(e) => onCheckOutChange(e.target.value)}
              min={checkIn || new Date().toISOString().split('T')[0]}
              className="w-full text-sm text-foreground outline-none bg-transparent"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-foreground-tertiary text-xs font-semibold uppercase tracking-wider">Guests</label>
          <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-2.5 focus-within:ring-2 focus-within:ring-foreground/20">
            <HiOutlineUsers className="text-foreground-tertiary" size={16} />
            <select value={guests} onChange={(e) => onGuestsChange(e.target.value)} className="w-full text-sm text-foreground outline-none bg-transparent appearance-none cursor-pointer">
              {[1, 2, 3, 4].map(n => (
                <option key={n} value={n}>{n} {n === 1 ? 'Guest' : 'Guests'}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-foreground-tertiary text-xs font-semibold uppercase tracking-wider">Room Type</label>
          <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-2.5 focus-within:ring-2 focus-within:ring-foreground/20">
            <MdOutlineKingBed className="text-foreground-tertiary" size={16} />
            <select value={selectedType} onChange={(e) => onTypeChange(e.target.value)} className="w-full text-sm text-foreground outline-none bg-transparent appearance-none cursor-pointer">
              <option value="">All Types</option>
              {roomTypeOptions.map(rt => (
                <option key={rt.slug} value={rt.slug}>{rt.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
          <label className="text-foreground-tertiary text-xs font-semibold uppercase tracking-wider">Sort By</label>
          <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-2.5 focus-within:ring-2 focus-within:ring-foreground/20">
            <HiOutlineAdjustments className="text-foreground-tertiary" size={16} />
            <select value={sortBy} onChange={(e) => onSortChange(e.target.value)} className="w-full text-sm text-foreground outline-none bg-transparent appearance-none cursor-pointer">
              <option value="price-asc">Price: Low → High</option>
              <option value="price-desc">Price: High → Low</option>
              <option value="capacity">Capacity</option>
              <option value="availability">Availability</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SearchBar
