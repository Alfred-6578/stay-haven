'use client'
import React, { useState, useEffect } from 'react'
import { HiOutlineX, HiOutlineCheck, HiOutlineSparkles, HiOutlineCog } from 'react-icons/hi'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import type { StaffRoom } from './RoomStatusBoard'

interface Props {
  room: StaffRoom | null
  onClose: () => void
  onUpdated: () => void
}

type ActionStatus = 'AVAILABLE' | 'CLEANING' | 'MAINTENANCE'

const actionConfig: Record<ActionStatus, { label: string; icon: React.ComponentType<{ size?: number }>; color: string }> = {
  AVAILABLE: { label: 'Mark as Available', icon: HiOutlineCheck, color: 'text-success' },
  CLEANING: { label: 'Mark as Cleaning', icon: HiOutlineSparkles, color: 'text-warning' },
  MAINTENANCE: { label: 'Mark as Maintenance', icon: HiOutlineCog, color: 'text-foreground-secondary' },
}

const RoomActionSheet = ({ room, onClose, onUpdated }: Props) => {
  const [pending, setPending] = useState<ActionStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    setPending(null)
    setNotes('')
  }, [room?.id])

  if (!room) return null

  const handleConfirm = async () => {
    if (!pending) return
    setLoading(true)
    try {
      await api.patch(`/staff/rooms/${room.id}/status`, {
        status: pending,
        notes: pending === 'AVAILABLE' ? undefined : notes || undefined,
      })
      toast.success(`Room ${room.number} marked as ${pending.toLowerCase()}`)
      onUpdated()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to update room'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const canAction = (status: ActionStatus) => room.status !== status

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-foreground/40" onClick={loading ? undefined : onClose} />

      {/* Sheet: bottom on mobile, right side panel on desktop */}
      <div className="relative ml-auto w-full vsm:max-w-md bg-foreground-inverse h-full vsm:h-auto vsm:my-auto vsm:mr-6 vsm:rounded-2xl shadow-xl flex flex-col mt-auto max-h-[85vh] vsm:max-h-[calc(100vh-3rem)] rounded-t-2xl vsm:rounded-2xl animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <p className="text-foreground-tertiary text-xs">Room</p>
            <h2 className="text-foreground font-bold text-xl">{room.number}</h2>
          </div>
          <button onClick={onClose} disabled={loading} className="p-2 text-foreground-tertiary hover:text-foreground">
            <HiOutlineX size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Room info */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div>
              <p className="text-foreground-tertiary text-[11px] uppercase tracking-wider">Floor</p>
              <p className="text-foreground text-sm font-medium">Floor {room.floor}</p>
            </div>
            <div>
              <p className="text-foreground-tertiary text-[11px] uppercase tracking-wider">Type</p>
              <p className="text-foreground text-sm font-medium">{room.roomType.name}</p>
            </div>
            <div>
              <p className="text-foreground-tertiary text-[11px] uppercase tracking-wider">Status</p>
              <p className="text-foreground text-sm font-medium">{room.status}</p>
            </div>
            {room.notes && (
              <div className="col-span-2">
                <p className="text-foreground-tertiary text-[11px] uppercase tracking-wider">Notes</p>
                <p className="text-foreground text-sm">{room.notes}</p>
              </div>
            )}
          </div>

          {/* Current guest (if occupied) */}
          {room.status === 'OCCUPIED' && room.currentBooking && (
            <div className="bg-foreground-disabled/5 rounded-xl p-4 mb-5">
              <p className="text-foreground-tertiary text-[11px] uppercase tracking-wider mb-1">Current Guest</p>
              <p className="text-foreground font-semibold">
                {room.currentBooking.guest.firstName} {room.currentBooking.guest.lastName}
              </p>
              <p className="text-foreground-tertiary text-xs mt-1">
                {room.currentBooking.bookingRef} · Checks out {new Date(room.currentBooking.checkOut).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </p>
            </div>
          )}

          {/* Actions */}
          {room.status !== 'OCCUPIED' ? (
            <>
              <h4 className="text-foreground font-semibold text-sm mb-3">Actions</h4>
              <div className="flex flex-col gap-2">
                {(['AVAILABLE', 'CLEANING', 'MAINTENANCE'] as ActionStatus[]).map(status => {
                  const config = actionConfig[status]
                  const Icon = config.icon
                  const active = pending === status
                  const disabled = !canAction(status) || loading
                  return (
                    <button
                      key={status}
                      onClick={() => setPending(status)}
                      disabled={disabled}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${
                        active
                          ? 'border-foreground bg-foreground-disabled/5'
                          : 'border-border hover:bg-foreground-disabled/5'
                      } disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                      <Icon size={18} />
                      <span className={config.color}>{config.label}</span>
                    </button>
                  )
                })}
              </div>

              {/* Notes input for cleaning/maintenance */}
              {pending && pending !== 'AVAILABLE' && (
                <div className="mt-4">
                  <label className="text-foreground-tertiary text-[11px] uppercase tracking-wider">Notes (optional)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder="e.g. Leaking faucet in bathroom"
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-foreground/20 mt-1 resize-none"
                  />
                </div>
              )}

              {/* Confirm */}
              {pending && (
                <div className="mt-5 border-t border-border pt-4">
                  <p className="text-foreground-secondary text-sm mb-3">
                    Confirm changing room <b>{room.number}</b> to <b>{pending.toLowerCase()}</b>?
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPending(null)}
                      disabled={loading}
                      className="flex-1 border border-border rounded-lg py-2.5 text-sm text-foreground hover:bg-foreground-disabled/5"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirm}
                      disabled={loading}
                      className="flex-1 bg-foreground text-foreground-inverse rounded-lg py-2.5 text-sm font-medium disabled:opacity-50"
                    >
                      {loading ? 'Updating...' : 'Confirm'}
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-warning-bg/30 border border-warning/20 rounded-lg p-4 text-sm text-foreground-secondary">
              Occupied rooms cannot have their status changed manually. Check the guest out first.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default RoomActionSheet
