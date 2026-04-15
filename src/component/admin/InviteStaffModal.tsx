'use client'
import React, { useEffect, useState } from 'react'
import { z } from 'zod'
import { HiOutlineX, HiOutlineMail } from 'react-icons/hi'
import { toast } from 'sonner'
import { api } from '@/lib/api'

const schema = z.object({
  email: z.email('Enter a valid email'),
  role: z.enum(['STAFF', 'MANAGER']),
  department: z.enum(['FRONT_DESK', 'HOUSEKEEPING', 'MANAGEMENT']),
})

interface Props {
  open: boolean
  onClose: () => void
  onInvited: () => void
}

const InviteStaffModal = ({ open, onClose, onInvited }: Props) => {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'STAFF' | 'MANAGER'>('STAFF')
  const [department, setDepartment] = useState<'FRONT_DESK' | 'HOUSEKEEPING' | 'MANAGEMENT'>('FRONT_DESK')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) return
    setEmail(''); setRole('STAFF'); setDepartment('FRONT_DESK'); setErrors({})
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && !loading) onClose() }
    window.addEventListener('keydown', handler)
    const orig = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = orig
    }
  }, [open, loading, onClose])

  const handleSubmit = async () => {
    setErrors({})
    const result = schema.safeParse({ email: email.trim(), role, department })
    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of result.error.issues) fieldErrors[issue.path.join('.')] = issue.message
      setErrors(fieldErrors)
      return
    }
    setLoading(true)
    try {
      await api.post('/admin/staff/invite', result.data)
      toast.success(`Invite sent to ${result.data.email}`)
      onInvited()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to send invite'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  const inputClasses = "w-full border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none bg-transparent focus:ring-2 focus:ring-foreground/20"

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-foreground/50 backdrop-blur-sm animate-modal-backdrop" onClick={loading ? undefined : onClose} />

      <div className="relative w-full max-w-md bg-foreground-inverse rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-modal-content">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-foreground font-heading font-bold text-lg">Invite Staff</h2>
            <p className="text-foreground-tertiary text-xs">They'll receive an email with a signup link</p>
          </div>
          <button onClick={onClose} disabled={loading} className="p-2 text-foreground-tertiary hover:text-foreground">
            <HiOutlineX size={20} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="text-foreground-tertiary text-[11px] uppercase tracking-wider font-semibold mb-1.5 block">Email</label>
            <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-foreground/20">
              <HiOutlineMail size={16} className="text-foreground-tertiary" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full text-sm outline-none bg-transparent"
              />
            </div>
            {errors.email && <p className="text-danger text-xs mt-1">{errors.email}</p>}
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
        </div>

        <div className="flex gap-2 px-6 py-4 border-t border-border bg-background-secondary">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 border border-border rounded-lg py-2 text-sm text-foreground hover:bg-foreground-disabled/5"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 bg-[#0B1B3A] text-white rounded-lg py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
            {loading ? 'Sending' : 'Send Invite'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default InviteStaffModal
