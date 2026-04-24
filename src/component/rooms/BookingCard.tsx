'use client'
import React from 'react'
import { HiOutlineCheck } from 'react-icons/hi'
import { BsShieldCheck } from 'react-icons/bs'
import Button from '@/component/ui/Button'
import { TAX_LABEL } from '@/lib/pricing'

interface AvailabilityResult {
  room: { id: string; number: string; floor: number }
  baseAmount: number
  taxAmount: number
  totalAmount: number
  totalNights: number
}

interface Props {
  basePrice: number
  weekendMultiplier: number
  capacity: number
  checkIn: string
  checkOut: string
  guests: string
  onCheckInChange: (v: string) => void
  onCheckOutChange: (v: string) => void
  onGuestsChange: (v: string) => void
  availability: AvailabilityResult[]
  availLoading: boolean
  selectedRooms: string[]
  onRoomToggle: (roomId: string) => void
  onBook: () => void
  visible: boolean
}

const BookingCard = ({
  basePrice, weekendMultiplier, capacity,
  checkIn, checkOut, guests,
  onCheckInChange, onCheckOutChange, onGuestsChange,
  availability, availLoading, selectedRooms, onRoomToggle, onBook,
  visible,
}: Props) => {
  const selectedAvails = availability.filter(a => selectedRooms.includes(a.room.id))
  const combinedBase = selectedAvails.reduce((s, a) => s + a.baseAmount, 0)
  const combinedTax = selectedAvails.reduce((s, a) => s + a.taxAmount, 0)
  const combinedTotal = selectedAvails.reduce((s, a) => s + a.totalAmount, 0)
  const nights = selectedAvails[0]?.totalNights || 0
  const selectedCount = selectedRooms.length

  return (
    <div className={`lg:col-span-1 transition-all duration-700 delay-200 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
      <div className="lg:sticky lg:top-6">
        <div className="border border-border rounded-2xl overflow-hidden shadow-sm">
          {/* Price header */}
          <div className="p-5 vsm:p-6 border-b border-border">
            <div className="flex items-baseline gap-1.5 mb-1">
              <span className="text-foreground text-2xl vsm:text-3xl font-bold">₦{basePrice.toLocaleString()}</span>
              <span className="text-foreground-tertiary text-sm">/ night</span>
            </div>
            {weekendMultiplier > 1 && (
              <p className="text-warning text-xs">
                Weekend: ₦{(basePrice * weekendMultiplier).toLocaleString()}/night
              </p>
            )}
          </div>

          {/* Booking form */}
          <div className="p-5 vsm:p-6">
            {/* Date grid */}
            <div className="grid grid-cols-2 border border-border rounded-xl overflow-hidden mb-3">
              <div className="p-3 border-r border-border">
                <label className="text-foreground-tertiary text-[10px] font-bold uppercase tracking-wider">Check In</label>
                <input type="date" value={checkIn} onChange={(e) => onCheckInChange(e.target.value)} min={new Date().toISOString().split('T')[0]} className="w-full text-sm text-foreground outline-none bg-transparent mt-0.5" />
              </div>
              <div className="p-3">
                <label className="text-foreground-tertiary text-[10px] font-bold uppercase tracking-wider">Check Out</label>
                <input type="date" value={checkOut} onChange={(e) => onCheckOutChange(e.target.value)} min={checkIn || new Date().toISOString().split('T')[0]} className="w-full text-sm text-foreground outline-none bg-transparent mt-0.5" />
              </div>
            </div>
            <div className="border border-border rounded-xl p-3 mb-4">
              <label className="text-foreground-tertiary text-[10px] font-bold uppercase tracking-wider">Guests</label>
              <select value={guests} onChange={(e) => onGuestsChange(e.target.value)} className="w-full text-sm text-foreground outline-none bg-transparent mt-0.5 appearance-none cursor-pointer">
                {Array.from({ length: capacity }, (_, n) => n + 1).map(n => (
                  <option key={n} value={n}>{n} {n === 1 ? 'Guest' : 'Guests'}</option>
                ))}
              </select>
            </div>

            {/* Availability results */}
            {checkIn && checkOut && (
              <div className="mb-4">
                {availLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <div className="w-5 h-5 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : availability.length > 0 ? (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-foreground-secondary text-xs">
                        {availability.length} room{availability.length !== 1 ? 's' : ''} &middot; {availability[0].totalNights} night{availability[0].totalNights !== 1 ? 's' : ''}
                      </p>
                      {selectedCount > 0 && (
                        <p className="text-foreground text-[11px] font-semibold">
                          {selectedCount} selected
                        </p>
                      )}
                    </div>
                    <p className="text-foreground-tertiary text-[11px] mb-2">
                      Select one or more rooms for your party.
                    </p>
                    <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                      {availability.map(ar => {
                        const isSelected = selectedRooms.includes(ar.room.id)
                        return (
                          <button
                            key={ar.room.id}
                            onClick={() => onRoomToggle(ar.room.id)}
                            className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all duration-200 ${
                              isSelected
                                ? 'border-foreground bg-foreground/[0.03]'
                                : 'border-border hover:border-foreground-disabled/70'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-4.5 h-4.5 rounded border flex items-center justify-center flex-shrink-0 ${
                                isSelected ? 'border-foreground bg-foreground' : 'border-border'
                              }`}>
                                {isSelected && <HiOutlineCheck className="text-foreground-inverse text-[10px]" />}
                              </div>
                              <div>
                                <p className="text-foreground text-sm font-medium">Room {ar.room.number}</p>
                                <p className="text-foreground-tertiary text-[11px]">Floor {ar.room.floor}</p>
                              </div>
                            </div>
                            <p className="text-foreground font-semibold text-sm">₦{ar.totalAmount.toLocaleString()}</p>
                          </button>
                        )
                      })}
                    </div>
                  </>
                ) : (
                  <p className="text-danger text-xs text-center py-4 bg-danger-bg rounded-xl">No rooms available for these dates</p>
                )}
              </div>
            )}

            {/* Price breakdown */}
            {selectedCount > 0 && (
              <div className="border-t border-border pt-4 mb-4">
                <div className="flex flex-col gap-1.5 text-sm">
                  <div className="flex justify-between text-foreground-secondary">
                    <span>Rooms × {selectedCount} · {nights} night{nights !== 1 ? 's' : ''}</span>
                    <span>₦{combinedBase.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-foreground-secondary">
                    <span>{TAX_LABEL}</span>
                    <span>₦{combinedTax.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-foreground font-bold text-base pt-2.5 mt-1 border-t border-border">
                    <span>Total</span>
                    <span>₦{combinedTotal.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Reserve button */}
            <Button
              fullWidth
              size="lg"
              disabled={!checkIn || !checkOut || selectedCount === 0}
              onClick={onBook}
            >
              {!checkIn || !checkOut
                ? 'Select dates'
                : selectedCount === 0
                  ? 'Select a room'
                  : selectedCount === 1
                    ? 'Reserve'
                    : `Reserve ${selectedCount} Rooms`}
            </Button>

            {selectedCount === 0 && checkIn && checkOut && availability.length > 0 && (
              <p className="text-foreground-tertiary text-[11px] text-center mt-2.5">You won&apos;t be charged yet</p>
            )}
          </div>
        </div>

        {/* Trust signals */}
        <div className="flex flex-col gap-3 mt-5">
          {[
            { icon: <BsShieldCheck size={14} />, text: 'Free cancellation up to 24hrs before check-in' },
            { icon: <HiOutlineCheck size={14} />, text: 'Instant confirmation' },
            { icon: <BsShieldCheck size={14} />, text: 'Secure payment via Paystack' },
          ].map(item => (
            <div key={item.text} className="flex items-center gap-2.5 text-foreground-tertiary">
              {item.icon}
              <span className="text-xs">{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default BookingCard
