'use client'
import React, { useCallback, useEffect, useState } from 'react'
import {
  HiOutlineMinus,
  HiOutlinePlus,
  HiOutlineCheckCircle,
  HiOutlineExclamation,
} from 'react-icons/hi'
import { api } from '@/lib/api'
import {
  AvailableRoom,
  WalkInFormData,
  formatNaira,
  todayYMD,
  addDaysYMD,
  sumRoomsTotal,
  sumRoomsBase,
  sumRoomsTax,
  sumCapacity,
} from './types'

interface Props {
  data: WalkInFormData
  update: (patch: Partial<WalkInFormData>) => void
  onNext: () => void
  onBack: () => void
}

const WalkInStep3RoomSelection = ({ data, update, onNext, onBack }: Props) => {
  const [rooms, setRooms] = useState<AvailableRoom[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchRooms = useCallback(async () => {
    if (!data.checkIn || !data.checkOut || data.checkOut <= data.checkIn) {
      setRooms([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      // Filter by capacity >= 1 so staff can mix & match room sizes
      const res = await api.get(
        `/rooms/available?checkIn=${data.checkIn}&checkOut=${data.checkOut}&adults=1`
      )
      setRooms(res.data.data || [])
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to load rooms'
      setError(msg)
      setRooms([])
    } finally {
      setLoading(false)
    }
  }, [data.checkIn, data.checkOut])

  useEffect(() => {
    fetchRooms()
  }, [fetchRooms])

  // Drop any selected rooms that disappeared from the available list
  useEffect(() => {
    if (data.selectedRooms.length === 0) return
    const stillAvailable = data.selectedRooms.filter(sel =>
      rooms.some(r => r.room.id === sel.room.id)
    )
    if (stillAvailable.length !== data.selectedRooms.length) {
      update({ selectedRooms: stillAvailable })
    }
  }, [rooms, data.selectedRooms, update])

  const setAdults = (delta: number) => {
    const next = Math.max(1, Math.min(20, data.adults + delta))
    update({ adults: next })
  }

  const toggleRoom = (r: AvailableRoom) => {
    const isSelected = data.selectedRooms.some(s => s.room.id === r.room.id)
    const next = isSelected
      ? data.selectedRooms.filter(s => s.room.id !== r.room.id)
      : [...data.selectedRooms, r]
    update({ selectedRooms: next })
  }

  const totalCapacity = sumCapacity(data.selectedRooms)
  const capacityShort = data.selectedRooms.length > 0 && totalCapacity < data.adults

  const handleContinue = () => {
    if (data.selectedRooms.length === 0) {
      setError('Please select at least one room')
      return
    }
    if (capacityShort) {
      setError(`Selected rooms accommodate ${totalCapacity} adults; need ${data.adults}`)
      return
    }
    setError(null)
    update({ amountReceived: sumRoomsTotal(data.selectedRooms) })
    onNext()
  }

  const minCheckIn = todayYMD()
  // Clamp check-in into the valid range if the stored value has drifted
  // (e.g. modal reopened after midnight with stale today-value)
  const clampedCheckIn = data.checkIn < minCheckIn ? minCheckIn : data.checkIn
  const minCheckOut = addDaysYMD(clampedCheckIn, 1)

  const handleCheckInChange = (next: string) => {
    const safe = next < minCheckIn ? minCheckIn : next
    // Auto-bump check-out if it would no longer be after check-in
    const newCheckOut = data.checkOut <= safe ? addDaysYMD(safe, 1) : data.checkOut
    update({ checkIn: safe, checkOut: newCheckOut })
  }

  const handleCheckOutChange = (next: string) => {
    const safe = next <= clampedCheckIn ? addDaysYMD(clampedCheckIn, 1) : next
    update({ checkOut: safe })
  }

  const groupTotal = sumRoomsTotal(data.selectedRooms)
  const groupBase = sumRoomsBase(data.selectedRooms)
  const groupTax = sumRoomsTax(data.selectedRooms)

  return (
    <div className="space-y-4">
      {/* Dates + adults */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-foreground-tertiary text-[11px] uppercase tracking-wider font-semibold">
            Check-in
          </label>
          <input
            type="date"
            min={minCheckIn}
            value={clampedCheckIn}
            onChange={e => handleCheckInChange(e.target.value)}
            className="mt-1.5 w-full px-3 py-2.5 bg-foreground-inverse border border-border rounded-lg text-sm text-foreground outline-none focus:border-foreground"
          />
        </div>
        <div>
          <label className="text-foreground-tertiary text-[11px] uppercase tracking-wider font-semibold">
            Check-out
          </label>
          <input
            type="date"
            min={minCheckOut}
            value={data.checkOut}
            onChange={e => handleCheckOutChange(e.target.value)}
            className="mt-1.5 w-full px-3 py-2.5 bg-foreground-inverse border border-border rounded-lg text-sm text-foreground outline-none focus:border-foreground"
          />
        </div>
      </div>

      <div className="flex items-center justify-between bg-foreground-disabled/5 border border-border rounded-lg px-3 py-2.5">
        <div>
          <p className="text-foreground-tertiary text-[11px] uppercase tracking-wider font-semibold">
            Total Adults
          </p>
          <p className="text-foreground-tertiary text-xs">Across all rooms</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setAdults(-1)}
            disabled={data.adults <= 1}
            className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-foreground disabled:opacity-40"
          >
            <HiOutlineMinus size={14} />
          </button>
          <span className="text-foreground font-semibold w-6 text-center">{data.adults}</span>
          <button
            onClick={() => setAdults(1)}
            disabled={data.adults >= 20}
            className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-foreground disabled:opacity-40"
          >
            <HiOutlinePlus size={14} />
          </button>
        </div>
      </div>

      <div>
        <label className="text-foreground-tertiary text-[11px] uppercase tracking-wider font-semibold">
          Special Requests <span className="text-foreground-tertiary normal-case">(optional)</span>
        </label>
        <textarea
          value={data.specialRequests}
          onChange={e => update({ specialRequests: e.target.value })}
          rows={2}
          placeholder="Adjoining rooms, early check-in, etc."
          className="mt-1.5 w-full px-3 py-2 bg-foreground-inverse border border-border rounded-lg text-sm text-foreground placeholder:text-foreground-tertiary outline-none focus:border-foreground resize-none"
        />
      </div>

      {/* Rooms */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-foreground-tertiary text-[11px] uppercase tracking-wider font-semibold">
            Available Rooms {rooms.length > 0 && <span className="ml-1 normal-case text-foreground">({rooms.length})</span>}
          </p>
          {data.selectedRooms.length > 0 && (
            <p className="text-foreground text-[11px] font-semibold">
              {data.selectedRooms.length} selected · fits {totalCapacity} adult{totalCapacity !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {loading ? (
          <div className="py-6 text-center text-foreground-tertiary text-sm">Searching rooms…</div>
        ) : error && rooms.length === 0 ? (
          <p className="text-danger text-xs py-4">{error}</p>
        ) : rooms.length === 0 ? (
          <div className="py-6 text-center bg-foreground-disabled/5 rounded-lg">
            <p className="text-foreground-tertiary text-sm">No rooms available for these dates.</p>
          </div>
        ) : (
          <ul className="grid grid-cols-1 vsm:grid-cols-2 gap-2 max-h-[260px] overflow-y-auto pr-1">
            {rooms.map(r => {
              const selected = data.selectedRooms.some(s => s.room.id === r.room.id)
              return (
                <li key={r.room.id}>
                  <button
                    onClick={() => toggleRoom(r)}
                    className={`w-full text-left p-3 rounded-xl border transition-colors ${
                      selected
                        ? 'border-foreground bg-foreground-disabled/5'
                        : 'border-border hover:border-foreground/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-foreground font-semibold text-sm">
                        Room {r.room.number} · Floor {r.room.floor}
                      </p>
                      {selected && <HiOutlineCheckCircle size={16} className="text-foreground" />}
                    </div>
                    <p className="text-foreground-secondary text-xs">
                      {r.room.roomType.name} · fits {r.room.roomType.capacity}
                    </p>
                    <div className="mt-2 pt-2 border-t border-foreground/5 flex items-baseline justify-between">
                      <span className="text-foreground-tertiary text-[11px]">
                        {r.totalNights} night{r.totalNights !== 1 ? 's' : ''}
                      </span>
                      <span className="text-foreground font-bold text-sm">{formatNaira(r.totalAmount)}</span>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Capacity warning */}
      {capacityShort && (
        <div className="flex items-start gap-2 bg-warning-bg/40 border border-warning/30 rounded-lg px-3 py-2">
          <HiOutlineExclamation size={14} className="text-warning mt-0.5" />
          <p className="text-foreground text-xs">
            Selected rooms fit <strong>{totalCapacity}</strong> adult{totalCapacity !== 1 ? 's' : ''}, but you
            entered <strong>{data.adults}</strong>. Add more rooms or reduce the adult count.
          </p>
        </div>
      )}

      {/* Price breakdown */}
      {data.selectedRooms.length > 0 && (
        <div className="border border-border rounded-xl p-3.5 bg-foreground-disabled/5">
          <p className="text-foreground-tertiary text-[11px] uppercase tracking-wider font-semibold mb-2">
            Price Breakdown {data.selectedRooms.length > 1 && `(${data.selectedRooms.length} rooms)`}
          </p>
          <div className="space-y-1 text-xs">
            {data.selectedRooms.map(r => (
              <div key={r.room.id} className="flex justify-between text-foreground-secondary">
                <span>Room {r.room.number} — {r.room.roomType.name}</span>
                <span className="text-foreground">{formatNaira(r.totalAmount)}</span>
              </div>
            ))}
            <div className="flex justify-between pt-1.5 mt-1.5 border-t border-foreground/10 text-foreground-secondary">
              <span>Base</span>
              <span className="text-foreground">{formatNaira(groupBase)}</span>
            </div>
            <div className="flex justify-between text-foreground-secondary">
              <span>Tax</span>
              <span className="text-foreground">{formatNaira(groupTax)}</span>
            </div>
            <div className="flex justify-between pt-1.5 mt-1.5 border-t border-foreground/10">
              <span className="text-foreground font-semibold">Total</span>
              <span className="text-foreground font-bold text-sm">{formatNaira(groupTotal)}</span>
            </div>
          </div>
        </div>
      )}

      {error && rooms.length > 0 && (
        <p className="text-danger text-xs">{error}</p>
      )}

      <div className="flex gap-2 pt-2">
        <button
          onClick={onBack}
          className="flex-1 border border-border rounded-lg py-2.5 text-sm text-foreground hover:bg-foreground-disabled/5"
        >
          Back
        </button>
        <button
          onClick={handleContinue}
          disabled={data.selectedRooms.length === 0 || capacityShort}
          className="flex-1 bg-foreground text-foreground-inverse rounded-lg py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue to Payment
        </button>
      </div>
    </div>
  )
}

export default WalkInStep3RoomSelection
