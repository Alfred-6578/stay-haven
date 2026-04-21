'use client'
import React, { useEffect, useState } from 'react'
import { HiOutlineX } from 'react-icons/hi'
import { toast } from 'sonner'
import { api } from '@/lib/api'

export interface StaffRecord {
  id: string
  firstName: string
  lastName: string
  email: string
  role: 'STAFF' | 'MANAGER'
  isActive: boolean
  staffProfile: {
    staffNumber: string
    department: 'FRONT_DESK' | 'HOUSEKEEPING' | 'MANAGEMENT'
    isOnDuty: boolean
  } | null
}

interface Props {
  open: boolean
  staff: StaffRecord | null
  onClose: () => void
  onSaved: () => void
}

const StaffEditModal = ({ open, staff, onClose, onSaved }: Props) => {
  const [role, setRole] = useState<'STAFF' | 'MANAGER'>('STAFF')
  const [department, setDepartment] = useState<'FRONT_DESK' | 'HOUSEKEEPING' | 'MANAGEMENT'>('FRONT_DESK')
  const [isActive, setIsActive] = useState(true)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !staff) return
    setRole(staff.role)
    setDepartment(staff.staffProfile?.department || 'FRONT_DESK')
    setIsActive(staff.isActive)

    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && !loading) onClose() }
    window.addEventListener('keydown', handler)
    const orig = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = orig
    }
  }, [open, staff, loading, onClose])

  const handleSave = async () => {
    if (!staff) return
    setLoading(true)
    try {
      await api.patch(`/admin/staff/${staff.id}`, { role, department, isActive })
      toast.success('Staff updated')
      onSaved()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Save failed'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  if (!open || !staff) return null

  const inputClasses = "w-full border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none bg-transparent focus:ring-2 focus:ring-foreground/20"

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-foreground/50 backdrop-blur-sm animate-modal-backdrop" onClick={loading ? undefined : onClose} />

      <div className="relative w-full max-w-md bg-foreground-inverse rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-modal-content">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-foreground font-heading font-bold text-lg">Edit Staff</h2>
            <p className="text-foreground-tertiary text-xs">{staff.firstName} {staff.lastName} · {staff.staffProfile?.staffNumber}</p>
          </div>
          <button onClick={onClose} disabled={loading} className="p-2 text-foreground-tertiary hover:text-foreground">
            <HiOutlineX size={20} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="text-foreground-tertiary text-[11px] uppercase tracking-wider font-semibold mb-1.5 block">Email</label>
            <input
              value={staff.email}
              disabled
              className={`${inputClasses} bg-foreground-disabled/5 text-foreground-tertiary cursor-not-allowed`}
            />
          </div>

          <div>
            <label className="text-foreground-tertiary text-[11px] uppercase tracking-wider font-semibold mb-1.5 block">Role</label>
            <div className="grid grid-cols-2 gap-2">
              {(['STAFF', 'MANAGER'] as const).map(r => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  type="button"
                  className={`border rounded-lg py-2 text-sm font-medium transition-colors ${
                    role === r ? 'border-[#0B1B3A] bg-[#0B1B3A] text-white' : 'border-border text-foreground hover:bg-foreground-disabled/5'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-foreground-tertiary text-[11px] uppercase tracking-wider font-semibold mb-1.5 block">Department</label>
            <select
              value={department}
              onChange={e => setDepartment(e.target.value as typeof department)}
              className={inputClasses}
            >
              <option value="FRONT_DESK">Front Desk</option>
              <option value="HOUSEKEEPING">Housekeeping</option>
              <option value="MANAGEMENT">Management</option>
            </select>
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between border border-border rounded-lg p-3">
            <div>
              <p className="text-foreground text-sm font-medium">Account Status</p>
              <p className="text-foreground-tertiary text-xs">{isActive ? 'Can sign in and access staff tools' : 'Account is disabled'}</p>
            </div>
            <button
              type="button"
              onClick={() => setIsActive(v => !v)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isActive ? 'bg-success' : 'bg-foreground-disabled'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isActive ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>

        <div className="flex gap-2 px-6 py-4 border-t border-border bg-background-secondary">
          <button onClick={onClose} disabled={loading} className="flex-1 border border-border rounded-lg py-2 text-sm text-foreground hover:bg-foreground-disabled/5">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 bg-[#0B1B3A] text-white rounded-lg py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
            {loading ? 'Saving' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default StaffEditModal
