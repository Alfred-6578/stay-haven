'use client'
import React, { useEffect, useState } from 'react'
import { z } from 'zod'
import { HiOutlineX } from 'react-icons/hi'
import { toast } from 'sonner'
import { api } from '@/lib/api'

interface Room {
  id: string
  number: string
  floor: number
  roomTypeId: string
  notes: string | null
}

interface RoomTypeOption {
  id: string
  name: string
}

interface Props {
  open: boolean
  initial?: Room | null
  onClose: () => void
  onSaved: () => void
}

const schema = z.object({
  number: z.string().min(1, 'Room number is required').max(10),
  floor: z.number().int().min(0, 'Floor must be ≥ 0').max(100),
  roomTypeId: z.string().min(1, 'Select a room type'),
  notes: z.string().optional(),
})

const RoomFormModal = ({ open, initial, onClose, onSaved }: Props) => {
  const editing = !!initial

  const [number, setNumber] = useState('')
  const [floor, setFloor] = useState(1)
  const [roomTypeId, setRoomTypeId] = useState('')
  const [notes, setNotes] = useState('')
  const [types, setTypes] = useState<RoomTypeOption[]>([])
  const [loadingTypes, setLoadingTypes] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Load room types when opened
  useEffect(() => {
    if (!open) return
    setLoadingTypes(true)
    api.get('/rooms/types')
      .then(res => setTypes(res.data.data || []))
      .catch(() => setTypes([]))
      .finally(() => setLoadingTypes(false))
  }, [open])

  // Seed form from initial
  useEffect(() => {
    if (!open) return
    if (initial) {
      setNumber(initial.number)
      setFloor(initial.floor)
      setRoomTypeId(initial.roomTypeId)
      setNotes(initial.notes || '')
    } else {
      setNumber('')
      setFloor(1)
      setRoomTypeId('')
      setNotes('')
    }
    setErrors({})
  }, [open, initial])

  // Esc + scroll lock
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && !submitting) onClose() }
    window.addEventListener('keydown', handler)
    const orig = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = orig
    }
  }, [open, submitting, onClose])

  const handleSubmit = async () => {
    const payload = {
      number: number.trim(),
      floor: Number(floor),
      roomTypeId,
      notes: notes.trim() || undefined,
    }

    const result = schema.safeParse(payload)
    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of result.error.issues) fieldErrors[issue.path.join('.')] = issue.message
      setErrors(fieldErrors)
      return
    }

    setSubmitting(true)
    try {
      if (editing && initial) {
        // PATCH /api/rooms/[id] only accepts floor/notes/status. For a number change we'd need a different flow.
        // Here we only send what's editable.
        await api.patch(`/rooms/${initial.id}`, {
          floor: payload.floor,
          notes: payload.notes ?? '',
        })
        toast.success('Room updated')
      } else {
        await api.post('/rooms', payload)
        toast.success('Room created')
      }
      onSaved()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Save failed'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  const inputClasses = "w-full border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none bg-transparent focus:ring-2 focus:ring-foreground/20"

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-foreground/50 backdrop-blur-sm animate-modal-backdrop" onClick={submitting ? undefined : onClose} />

      <div className="relative w-full max-w-md bg-foreground-inverse rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-modal-content">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-foreground font-heading font-bold text-lg">{editing ? 'Edit Room' : 'New Room'}</h2>
            <p className="text-foreground-tertiary text-xs">{editing ? 'Update floor, type, or notes' : 'Add a new room to the inventory'}</p>
          </div>
          <button onClick={onClose} disabled={submitting} className="p-2 text-foreground-tertiary hover:text-foreground">
            <HiOutlineX size={20} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-foreground-tertiary text-[11px] uppercase tracking-wider font-semibold mb-1.5 block">Room Number</label>
              <input
                value={number}
                onChange={e => setNumber(e.target.value)}
                disabled={editing}
                className={`${inputClasses} ${editing ? 'bg-foreground-disabled/5 text-foreground-tertiary cursor-not-allowed' : ''}`}
                placeholder="e.g. 205"
              />
              {editing && <p className="text-foreground-tertiary text-[10px] mt-1">Room number can&apos;t be changed</p>}
              {errors.number && <p className="text-danger text-xs mt-1">{errors.number}</p>}
            </div>
            <div>
              <label className="text-foreground-tertiary text-[11px] uppercase tracking-wider font-semibold mb-1.5 block">Floor</label>
              <input
                type="number"
                min={0}
                value={floor}
                onChange={e => setFloor(Number(e.target.value) || 0)}
                className={inputClasses}
              />
              {errors.floor && <p className="text-danger text-xs mt-1">{errors.floor}</p>}
            </div>
          </div>

          <div>
            <label className="text-foreground-tertiary text-[11px] uppercase tracking-wider font-semibold mb-1.5 block">Room Type</label>
            <select
              value={roomTypeId}
              onChange={e => setRoomTypeId(e.target.value)}
              disabled={editing || loadingTypes}
              className={`${inputClasses} ${editing ? 'bg-foreground-disabled/5 text-foreground-tertiary cursor-not-allowed' : ''}`}
            >
              <option value="">{loadingTypes ? 'Loading...' : 'Select a type'}</option>
              {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            {editing && <p className="text-foreground-tertiary text-[10px] mt-1">Room type can&apos;t be changed after creation</p>}
            {errors.roomTypeId && <p className="text-danger text-xs mt-1">{errors.roomTypeId}</p>}
          </div>

          <div>
            <label className="text-foreground-tertiary text-[11px] uppercase tracking-wider font-semibold mb-1.5 block">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              className={`${inputClasses} resize-none`}
              placeholder="e.g. Connecting room to 204"
            />
          </div>
        </div>

        <div className="flex gap-2 px-6 py-4 border-t border-border bg-background-secondary">
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 border border-border rounded-lg py-2 text-sm text-foreground hover:bg-foreground-disabled/5"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 bg-[#0B1B3A] text-white rounded-lg py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting && <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
            {submitting ? 'Saving' : editing ? 'Save Changes' : 'Create Room'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default RoomFormModal
