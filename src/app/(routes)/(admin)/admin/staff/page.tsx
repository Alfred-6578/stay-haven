'use client'
import React, { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { HiOutlineUserAdd, HiOutlineSearch, HiOutlinePencil, HiOutlineBan, HiOutlineRefresh, HiOutlineUsers, HiOutlineMail } from 'react-icons/hi'
import InviteStaffModal from '@/component/admin/InviteStaffModal'
import StaffEditModal, { StaffRecord } from '@/component/admin/StaffEditModal'
import ConfirmModal from '@/component/ui/ConfirmModal'
import EmptyState from '@/component/ui/EmptyState'
import ErrorState from '@/component/ui/ErrorState'
import { TableRowSkeleton } from '@/component/ui/PageSkeleton'

interface Invite {
  id: string
  email: string
  role: string
  department: string | null
  status: 'pending' | 'used' | 'expired'
  expiresAt: string
  createdAt: string
  usedAt: string | null
}

const DEPT_LABEL: Record<string, string> = {
  FRONT_DESK: 'Front Desk',
  HOUSEKEEPING: 'Housekeeping',
  MANAGEMENT: 'Management',
}

const DEPT_COLORS: Record<string, string> = {
  FRONT_DESK: 'bg-[#EAF3DE] text-[#4A6B2E]',
  HOUSEKEEPING: 'bg-[#FAEEDA] text-[#8A6A20]',
  MANAGEMENT: 'bg-[#0B1B3A]/10 text-[#0B1B3A]',
}

const ROLE_COLORS: Record<string, string> = {
  STAFF: 'bg-foreground-disabled/15 text-foreground-secondary',
  MANAGER: 'bg-[#D97706]/10 text-[#D97706]',
}

const INVITE_COLORS: Record<string, string> = {
  pending: 'bg-warning-bg text-warning',
  used: 'bg-success-bg text-success',
  expired: 'bg-danger-bg text-danger',
}

export default function AdminStaffPage() {
  const [search, setSearch] = useState('')
  const [department, setDepartment] = useState('')
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('active')

  const [staff, setStaff] = useState<StaffRecord[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const [inviteOpen, setInviteOpen] = useState(false)
  const [editing, setEditing] = useState<StaffRecord | null>(null)
  const [deactivateTarget, setDeactivateTarget] = useState<StaffRecord | null>(null)
  const [revokeTarget, setRevokeTarget] = useState<Invite | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [dutyLoading, setDutyLoading] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const params = new URLSearchParams()
      if (search.trim()) params.set('search', search.trim())
      if (department) params.set('department', department)
      if (activeFilter === 'active') params.set('isActive', 'true')
      if (activeFilter === 'inactive') params.set('isActive', 'false')
      params.set('limit', '50')

      const [staffRes, invitesRes] = await Promise.all([
        api.get(`/admin/staff?${params.toString()}`),
        api.get('/admin/invites'),
      ])
      setStaff(staffRes.data.data.staff || [])
      setInvites(invitesRes.data.data || [])
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [search, department, activeFilter])

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => fetchAll(), search ? 300 : 0)
    return () => clearTimeout(timer)
  }, [fetchAll, search])

  const toggleDuty = async (member: StaffRecord) => {
    setDutyLoading(member.id)
    try {
      await api.patch(`/admin/staff/${member.id}/duty`)
      toast.success(`${member.firstName} is now ${member.staffProfile?.isOnDuty ? 'off' : 'on'} duty`)
      fetchAll()
    } catch {
      toast.error('Duty toggle failed')
    } finally {
      setDutyLoading(null)
    }
  }

  const deactivate = async () => {
    if (!deactivateTarget) return
    setActionLoading(true)
    try {
      await api.delete(`/admin/staff/${deactivateTarget.id}`)
      toast.success(`${deactivateTarget.firstName} deactivated`)
      setDeactivateTarget(null)
      fetchAll()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Deactivate failed'
      toast.error(msg)
    } finally {
      setActionLoading(false)
    }
  }

  const revokeInvite = async () => {
    if (!revokeTarget) return
    setActionLoading(true)
    try {
      await api.delete(`/admin/invites/${revokeTarget.id}`)
      toast.success('Invite revoked')
      setRevokeTarget(null)
      fetchAll()
    } catch {
      toast.error('Revoke failed')
    } finally {
      setActionLoading(false)
    }
  }

  const pendingInvites = invites.filter(i => i.status === 'pending')

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap mb-6">
        <div>
          <h1 className="text-foreground font-heading text-xl sm:text-2xl font-bold">Staff</h1>
          <p className="text-foreground-tertiary text-sm">Manage team members and pending invitations</p>
        </div>
        <button
          onClick={() => setInviteOpen(true)}
          className="flex items-center gap-2 bg-[#0B1B3A] text-white rounded-lg px-4 py-2 text-sm font-semibold hover:opacity-90"
        >
          <HiOutlineUserAdd size={16} />
          Invite Staff
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <HiOutlineSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-tertiary" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-foreground/20 bg-foreground-inverse"
          />
        </div>
        <select
          value={department}
          onChange={e => setDepartment(e.target.value)}
          className="border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none bg-foreground-inverse focus:ring-2 focus:ring-foreground/20"
        >
          <option value="">All Departments</option>
          <option value="FRONT_DESK">Front Desk</option>
          <option value="HOUSEKEEPING">Housekeeping</option>
          <option value="MANAGEMENT">Management</option>
        </select>
        <div className="flex gap-1 bg-foreground-disabled/10 p-1 rounded-lg">
          {(['active', 'inactive', 'all'] as const).map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              disabled={loading}
              className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors capitalize disabled:cursor-not-allowed disabled:opacity-60 ${
                activeFilter === f ? 'bg-foreground-inverse text-foreground shadow-sm' : 'text-foreground-secondary'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Staff table */}
      <div className="bg-foreground-inverse border border-border rounded-2xl overflow-hidden mb-6">
        {loading ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody>
                {[0, 1, 2, 3].map(i => <TableRowSkeleton key={i} columns={7} />)}
              </tbody>
            </table>
          </div>
        ) : error ? (
          <ErrorState
            title="Couldn't load staff"
            description="We had trouble fetching team members. Please try again."
            onRetry={fetchAll}
          />
        ) : staff.length === 0 ? (
          <EmptyState
            icon={<HiOutlineUsers />}
            title={search || department || activeFilter !== 'active' ? 'No staff match these filters' : 'No staff yet'}
            description={search || department || activeFilter !== 'active'
              ? 'Try clearing your filters to see more team members.'
              : 'Invite your first team member to get started.'}
            actionLabel={search || department || activeFilter !== 'active' ? 'Clear Filters' : 'Invite Staff'}
            onAction={() => {
              if (search || department || activeFilter !== 'active') {
                setSearch(''); setDepartment(''); setActiveFilter('active')
              } else {
                setInviteOpen(true)
              }
            }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-foreground-tertiary text-[11px] uppercase tracking-wider border-b border-border bg-foreground-disabled/[0.03]">
                  <th className="py-3 px-4 font-semibold">Member</th>
                  <th className="py-3 px-4 font-semibold max-md:hidden">Staff No.</th>
                  <th className="py-3 px-4 font-semibold">Department</th>
                  <th className="py-3 px-4 font-semibold">Role</th>
                  <th className="py-3 px-4 font-semibold">On Duty</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {staff.map(m => (
                  <tr key={m.id} className="border-b border-border last:border-0 hover:bg-foreground-disabled/[0.02]">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#0B1B3A] text-white flex items-center justify-center text-xs font-semibold shrink-0">
                          {m.firstName.charAt(0)}{m.lastName.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-foreground font-medium">{m.firstName} {m.lastName}</p>
                          <p className="text-foreground-tertiary text-xs truncate">{m.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-foreground-secondary text-xs font-mono max-md:hidden">
                      {m.staffProfile?.staffNumber || '—'}
                    </td>
                    <td className="py-3 px-4">
                      {m.staffProfile?.department ? (
                        <span className={`${DEPT_COLORS[m.staffProfile.department]} text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider whitespace-nowrap`}>
                          {DEPT_LABEL[m.staffProfile.department]}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`${ROLE_COLORS[m.role]} text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider`}>
                        {m.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => toggleDuty(m)}
                        disabled={!m.isActive || dutyLoading === m.id}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-40 ${
                          m.staffProfile?.isOnDuty ? 'bg-success' : 'bg-foreground-disabled'
                        }`}
                      >
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                          m.staffProfile?.isOnDuty ? 'translate-x-5' : 'translate-x-1'
                        }`} />
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`${m.isActive ? 'text-success' : 'text-foreground-tertiary'} text-xs font-medium`}>
                        {m.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex gap-1">
                        <button
                          onClick={() => setEditing(m)}
                          className="text-foreground text-xs font-medium hover:underline px-2 inline-flex items-center gap-1"
                        >
                          <HiOutlinePencil size={11} />
                          Edit
                        </button>
                        {m.isActive && (
                          <button
                            onClick={() => setDeactivateTarget(m)}
                            className="text-danger text-xs font-medium hover:underline px-2 inline-flex items-center gap-1"
                          >
                            <HiOutlineBan size={11} />
                            Deactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pending invites */}
      <div className="bg-foreground-inverse border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-foreground font-semibold text-sm">Pending Invites</h2>
            <p className="text-foreground-tertiary text-xs">{pendingInvites.length} awaiting acceptance</p>
          </div>
          <button
            onClick={fetchAll}
            className="flex items-center gap-1.5 text-foreground-tertiary hover:text-foreground text-xs font-medium"
          >
            <HiOutlineRefresh size={12} />
            Refresh
          </button>
        </div>

        {invites.length === 0 ? (
          <EmptyState
            icon={<HiOutlineMail />}
            title="No invites sent"
            description="Invite new team members via email — they'll receive a link to set up their account."
            actionLabel="Invite Staff"
            onAction={() => setInviteOpen(true)}
            className="py-10"
          />
        ) : (
          <div className="divide-y divide-border">
            {invites.map(inv => (
              <div key={inv.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-foreground text-sm font-medium truncate">{inv.email}</p>
                  <p className="text-foreground-tertiary text-xs">
                    {inv.role}{inv.department && ` · ${DEPT_LABEL[inv.department] || inv.department}`}
                    {' · Sent '}
                    {new Date(inv.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <span className={`${INVITE_COLORS[inv.status]} text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider`}>
                  {inv.status}
                </span>
                {inv.status === 'pending' && (
                  <button
                    onClick={() => setRevokeTarget(inv)}
                    className="text-danger text-xs font-medium hover:underline"
                  >
                    Revoke
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <InviteStaffModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvited={() => { setInviteOpen(false); fetchAll() }}
      />
      <StaffEditModal
        open={!!editing}
        staff={editing}
        onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); fetchAll() }}
      />
      <ConfirmModal
        open={!!deactivateTarget}
        title={`Deactivate ${deactivateTarget?.firstName} ${deactivateTarget?.lastName}?`}
        message="They'll lose access immediately. You can reactivate them later from the edit modal."
        confirmLabel="Deactivate"
        variant="danger"
        loading={actionLoading}
        onConfirm={deactivate}
        onCancel={() => setDeactivateTarget(null)}
      />
      <ConfirmModal
        open={!!revokeTarget}
        title="Revoke invite?"
        message={`${revokeTarget?.email} will not be able to complete their signup with this invite.`}
        confirmLabel="Revoke"
        variant="danger"
        loading={actionLoading}
        onConfirm={revokeInvite}
        onCancel={() => setRevokeTarget(null)}
      />
    </div>
  )
}
