'use client'
import React from 'react'
import { HiOutlineCheck } from 'react-icons/hi'
import { BsShieldCheck } from 'react-icons/bs'
import Button from '@/component/ui/Button'

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
  selectedRoom: string | null
  onRoomSelect: (roomId: string | null) => void
  onBook: () => void
  visible: boolean
}

const BookingCard = ({
  basePrice, weekendMultiplier, capacity,
  checkIn, checkOut, guests,
  onCheckInChange, onCheckOutChange, onGuestsChange,
  availability, availLoading, selectedRoom, onRoomSelect, onBook,
  visible,
}: Props) => {
  const selectedAvail = availability.find(a => a.room.id === selectedRoom)

  return (
    <div className={`lg:col-span-1 transition-all duration-700 delay-200 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
      <div className="lg:sticky lg:top-6">
        <div className="border border-border rounded-2xl overflow-hidden shadow-sm">
          {/* Price header */}
          <div className="p-5 vsm:p-6 border-b border-border">
            <div className="flex items-baseline gap-1.5 mb-1">
              <span className="text-foreground text-2xl vsm:text-3xl font-bold">${basePrice.toFixed(0)}</span>
              <span className="text-foreground-tertiary text-sm">/ night</span>
            </div>
            {weekendMultiplier > 1 && (
              <p className="text-warning text-xs">
                Weekend: ${(basePrice * weekendMultiplier).toFixed(0)}/night
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
                    <p className="text-foreground-secondary text-xs mb-3">
                      {availability.length} room{availability.length !== 1 ? 's' : ''} &middot; {availability[0].totalNights} night{availability[0].totalNights !== 1 ? 's' : ''}
                    </p>
                    <div className="flex flex-col gap-2 max-h-40 overflow-y-auto">
                      {availability.map(ar => (
                        <button
                          key={ar.room.id}
                          onClick={() => onRoomSelect(ar.room.id === selectedRoom ? null : ar.room.id)}
                          className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all duration-200 ${
                            selectedRoom === ar.room.id
                              ? 'border-foreground bg-foreground/[0.03]'
                              : 'border-border hover:border-foreground-disabled/70'
                          }`}
                        >
                          <div>
                            <p className="text-foreground text-sm font-medium">Room {ar.room.number}</p>
                            <p className="text-foreground-tertiary text-[11px]">Floor {ar.room.floor}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <p className="text-foreground font-semibold text-sm">${ar.totalAmount.toFixed(0)}</p>
                            {selectedRoom === ar.room.id && (
                              <div className="w-4.5 h-4.5 rounded-full bg-foreground flex items-center justify-center">
                                <HiOutlineCheck className="text-foreground-inverse text-[10px]" />
                              </div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-danger text-xs text-center py-4 bg-danger-bg rounded-xl">No rooms available for these dates</p>
                )}
              </div>
            )}

            {/* Price breakdown */}
            {selectedAvail && (
              <div className="border-t border-border pt-4 mb-4">
                <div className="flex flex-col gap-1.5 text-sm">
                  <div className="flex justify-between text-foreground-secondary">
                    <span>${basePrice.toFixed(0)} &times; {selectedAvail.totalNights} nights</span>
                    <span>${selectedAvail.baseAmount.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between text-foreground-secondary">
                    <span>Tax (10%)</span>
                    <span>${selectedAvail.taxAmount.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between text-foreground font-bold text-base pt-2.5 mt-1 border-t border-border">
                    <span>Total</span>
                    <span>${selectedAvail.totalAmount.toFixed(0)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Reserve button */}
            <Button
              fullWidth
              size="lg"
              disabled={!checkIn || !checkOut || !selectedRoom}
              onClick={onBook}
            >
              {!checkIn || !checkOut ? 'Select dates' : !selectedRoom ? 'Select a room' : 'Reserve'}
            </Button>

            {!selectedRoom && checkIn && checkOut && availability.length > 0 && (
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
