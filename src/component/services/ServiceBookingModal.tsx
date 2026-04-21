'use client'
import React, { useMemo, useState } from 'react'
import Image from 'next/image'
import { toast } from 'sonner'
import { HiOutlineX, HiOutlineCheck, HiOutlineClock } from 'react-icons/hi'
import { api } from '@/lib/api'

interface HotelService {
  id: string
  name: string
  description: string
  price: number | string
  category: string
  image: string | null
}

interface ActiveBooking {
  id: string
  bookingRef: string
  checkIn: string
  checkOut: string
  status: string
  room?: { number: string }
}

interface Props {
  service: HotelService | null
  bookings: ActiveBooking[]
  onClose: () => void
  onSuccess: () => void
}

const TIME_SLOTS = Array.from({ length: 14 }, (_, i) => {
  const h = 9 + i // 9am → 10pm
  const label = h < 12 ? `${h}:00 AM` : h === 12 ? '12:00 PM' : `${h - 12}:00 PM`
  return { value: `${String(h).padStart(2, '0')}:00`, label }
})

const formatNaira = (v: number | string) =>
  `₦${new Intl.NumberFormat('en-NG', { maximumFractionDigits: 0 }).format(Number(v))}`

const ServiceBookingModal = ({ service, bookings, onClose, onSuccess }: Props) => {
  const [selectedBookingId, setSelectedBookingId] = useState(bookings[0]?.id || '')
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  const selectedBooking = bookings.find(b => b.id === selectedBookingId)

  // Constrain date picker to stay dates of the selected booking
  const dateConstraints = useMemo(() => {
    if (!selectedBooking) return { min: '', max: '' }
    const now = new Date()
    const checkIn = new Date(selectedBooking.checkIn)
    const checkOut = new Date(selectedBooking.checkOut)
    // min = max(today, checkIn)
    const minDate = checkIn > now ? checkIn : now
    const pad = (n: number) => String(n).padStart(2, '0')
    return {
      min: `${minDate.getFullYear()}-${pad(minDate.getMonth() + 1)}-${pad(minDate.getDate())}`,
      max: `${checkOut.getFullYear()}-${pad(checkOut.getMonth() + 1)}-${pad(checkOut.getDate())}`,
    }
  }, [selectedBooking])

  if (!service) return null

  const handleSubmit = async () => {
    if (!selectedBookingId || !selectedDate || !selectedTime) {
      toast.error('Please select a booking, date, and time')
      return
    }
    setSubmitting(true)
    try {
      const scheduledAt = new Date(`${selectedDate}T${selectedTime}:00`).toISOString()
      await api.post('/services/book', {
        serviceId: service.id,
        bookingId: selectedBookingId,
        scheduledAt,
        notes: notes.trim() || undefined,
      })
      setConfirmed(true)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to book service'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const busy = submitting

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/40" onClick={busy ? undefined : onClose} />
      <div className="relative w-full max-w-md bg-foreground-inverse rounded-2xl shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <p className="text-foreground-tertiary text-xs uppercase tracking-wider">
              {confirmed ? 'Request Submitted' : 'Request Service'}
            </p>
            <h2 className="text-foreground font-bold text-lg">{service.name}</h2>
          </div>
          <button onClick={onClose} disabled={busy} className="p-2 text-foreground-tertiary hover:text-foreground">
            <HiOutlineX size={20} />
          </button>
        </div>

        {/* Success state */}
        {confirmed ? (
          <div className="px-5 py-8 text-center">
            <div className="inline-flex w-14 h-14 rounded-full bg-success-bg items-center justify-center mb-4">
              <HiOutlineCheck size={28} className="text-success" />
            </div>
            <h3 className="text-foreground text-lg font-bold mb-1">Request Submitted</h3>
            <p className="text-foreground-tertiary text-sm mb-2">
              Your <strong>{service.name}</strong> request is pending confirmation.
            </p>
            <div className="inline-flex items-center gap-1.5 bg-warning-bg text-warning text-xs font-semibold px-3 py-1.5 rounded-full">
              <HiOutlineClock size={12} />
              PENDING
            </div>
            <p className="text-foreground-tertiary text-xs mt-4">
              {selectedDate && selectedTime && (
                <>Scheduled for {new Date(`${selectedDate}T${selectedTime}`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at {TIME_SLOTS.find(t => t.value === selectedTime)?.label}</>
              )}
            </p>
            <div className="mt-6">
              <button
                onClick={() => { onSuccess(); onClose() }}
                className="bg-foreground text-foreground-inverse px-6 py-2.5 rounded-lg text-sm font-medium hover:opacity-90"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* Service info */}
              {service.image && (
                <div className="relative h-36 rounded-xl overflow-hidden">
                  <Image src={service.image} alt={service.name} fill className="object-cover" />
                </div>
              )}
              <div className="flex items-center justify-between bg-foreground-disabled/5 border border-border rounded-lg px-3 py-2.5">
                <div>
                  <p className="text-foreground-tertiary text-[10px] uppercase tracking-wider font-semibold">
                    {service.category.charAt(0) + service.category.slice(1).toLowerCase()}
                  </p>
                  <p className="text-foreground text-xs line-clamp-1">{service.description}</p>
                </div>
                <span className="text-foreground font-bold text-base ml-3">{formatNaira(service.price)}</span>
              </div>

              {/* Booking selector */}
              <div>
                <label className="text-foreground-tertiary text-[11px] uppercase tracking-wider font-semibold">
                  For which booking?
                </label>
                <select
                  value={selectedBookingId}
                  onChange={e => { setSelectedBookingId(e.target.value); setSelectedDate('') }}
                  className="mt-1.5 w-full px-3 py-2.5 bg-foreground-inverse border border-border rounded-lg text-sm text-foreground outline-none focus:border-foreground"
                >
                  <option value="">Select a booking</option>
                  {bookings.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.bookingRef}{b.room ? ` · Room ${b.room.number}` : ''} ({new Date(b.checkIn).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {new Date(b.checkOut).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="text-foreground-tertiary text-[11px] uppercase tracking-wider font-semibold">
                  Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  min={dateConstraints.min}
                  max={dateConstraints.max}
                  onChange={e => setSelectedDate(e.target.value)}
                  disabled={!selectedBookingId}
                  className="mt-1.5 w-full px-3 py-2.5 bg-foreground-inverse border border-border rounded-lg text-sm text-foreground outline-none focus:border-foreground disabled:opacity-50"
                />
              </div>

              {/* Time slots */}
              <div>
                <label className="text-foreground-tertiary text-[11px] uppercase tracking-wider font-semibold">
                  Preferred Time
                </label>
                <div className="mt-1.5 grid grid-cols-4 gap-1.5 max-h-[140px] overflow-y-auto">
                  {TIME_SLOTS.map(slot => (
                    <button
                      key={slot.value}
                      onClick={() => setSelectedTime(slot.value)}
                      disabled={!selectedDate}
                      className={`py-2 rounded-lg text-xs font-medium border transition-colors disabled:opacity-40 ${
                        selectedTime === slot.value
                          ? 'border-foreground bg-foreground text-foreground-inverse'
                          : 'border-border text-foreground hover:bg-foreground-disabled/5'
                      }`}
                    >
                      {slot.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-foreground-tertiary text-[11px] uppercase tracking-wider font-semibold">
                  Notes <span className="normal-case text-foreground-tertiary">(optional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Any preferences or special requirements…"
                  className="mt-1.5 w-full px-3 py-2 bg-foreground-inverse border border-border rounded-lg text-sm text-foreground placeholder:text-foreground-tertiary outline-none focus:border-foreground resize-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-2 px-5 py-4 border-t border-border">
              <button
                onClick={onClose}
                disabled={busy}
                className="flex-1 border border-border rounded-lg py-2.5 text-sm text-foreground hover:bg-foreground-disabled/5"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={busy || !selectedBookingId || !selectedDate || !selectedTime}
                className="flex-1 bg-foreground text-foreground-inverse rounded-lg py-2.5 text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting && <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                {submitting ? 'Submitting…' : `Request · ${formatNaira(service.price)}`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default ServiceBookingModal
