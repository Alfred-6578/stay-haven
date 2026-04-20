'use client'
import React, { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import {
  HiOutlineCheck,
  HiOutlineX,
  HiOutlineArrowUp,
  HiOutlineExclamation,
} from 'react-icons/hi'
import ConfirmModal from '@/component/ui/ConfirmModal'
import EmptyState from '@/component/ui/EmptyState'
import ErrorState from '@/component/ui/ErrorState'
import { TableRowSkeleton } from '@/component/ui/PageSkeleton'

interface UpgradeRequest {
  id: string
  priceDifference: number | string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  paymentReference: string | null
  createdAt: string
  processedAt: string | null
  booking: {
    bookingRef: string
    checkIn: string
    checkOut: string
    totalNights: number
    status: string
    guest: { firstName: string; lastName: string; email: string }
  }
  currentRoom: {
    number: string
    floor: number
    roomType: { name: string; basePrice: number | string }
  }
  requestedType: {
    name: string
    basePrice: number | string
    image: string | null
  }
  processedBy: { firstName: string; lastName: string } | null
}

const formatNaira = (v: number | string) =>
  `₦${new Intl.NumberFormat('en-NG', { maximumFractionDigits: 0 }).format(Number(v))}`

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-warning-bg text-warning',
  APPROVED: 'bg-success-bg text-success',
  REJECTED: 'bg-danger-bg text-danger',
}

const TABS = ['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const

export default function AdminUpgradesPage() {
  const [upgrades, setUpgrades] = useState<UpgradeRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [tab, setTab] = useState<string>('PENDING')
  const [processing, setProcessing] = useState<string | null>(null)

  // Confirm dialog
  const [confirmAction, setConfirmAction] = useState<{
    id: string
    type: 'approve' | 'reject'
    upgrade: UpgradeRequest
  } | null>(null)

  const fetchUpgrades = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const params = tab !== 'ALL' ? `?status=${tab}` : ''
      const res = await api.get(`/admin/upgrades${params}`)
      setUpgrades(res.data.data.upgrades || [])
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [tab])

  useEffect(() => {
    fetchUpgrades()
  }, [fetchUpgrades])

  const handleApprove = async (id: string) => {
    setProcessing(id)
    setConfirmAction(null)
    try {
      const res = await api.patch(`/admin/upgrades/${id}/approve`)
      const data = res.data.data
      if (data.requiresPayment) {
        toast.success(`Guest notified — they'll pay ${formatNaira(data.amount)} to confirm the upgrade`)
      } else {
        toast.success(`Upgrade applied — guest moved to Room ${data.newRoom}`)
      }
      fetchUpgrades()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to approve'
      toast.error(msg)
    } finally {
      setProcessing(null)
    }
  }

  const handleReject = async (id: string) => {
    setProcessing(id)
    setConfirmAction(null)
    try {
      await api.patch(`/admin/upgrades/${id}/reject`)
      toast.success('Upgrade request rejected')
      fetchUpgrades()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to reject'
      toast.error(msg)
    } finally {
      setProcessing(null)
    }
  }

  const pendingCount = upgrades.filter(u => u.status === 'PENDING').length

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-foreground font-heading text-xl sm:text-2xl font-bold">Room Upgrades</h1>
          {pendingCount > 0 && (
            <p className="text-foreground-tertiary text-sm mt-1">
              {pendingCount} pending request{pendingCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-foreground-disabled/10 p-1 rounded-lg w-max mb-6">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            disabled={loading}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              tab === t ? 'bg-foreground text-foreground-inverse' : 'text-foreground-secondary hover:text-foreground'
            }`}
          >
            {t === 'ALL' ? 'All' : t.charAt(0) + t.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <tbody>
              {[0, 1, 2, 3].map(i => <TableRowSkeleton key={i} columns={8} />)}
            </tbody>
          </table>
        </div>
      ) : error ? (
        <ErrorState
          title="Couldn't load upgrades"
          description="We had trouble fetching upgrade requests. Please try again."
          onRetry={fetchUpgrades}
        />
      ) : upgrades.length === 0 ? (
        <EmptyState
          icon={<HiOutlineArrowUp />}
          title={tab === 'PENDING' ? 'No pending upgrades' : `No ${tab === 'ALL' ? '' : tab.toLowerCase() + ' '}upgrades`}
          description={tab === 'PENDING'
            ? "You're all caught up — no upgrade requests need review."
            : 'Upgrade requests will appear here as guests submit them.'}
          {...(tab !== 'ALL' ? { actionLabel: 'View All', onAction: () => setTab('ALL') } : {})}
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-foreground-tertiary text-[11px] uppercase tracking-wider border-b border-border">
                <th className="py-2 px-2 font-semibold">Guest</th>
                <th className="py-2 px-2 font-semibold">Booking</th>
                <th className="py-2 px-2 font-semibold">Current Room</th>
                <th className="py-2 px-2 font-semibold">Requested</th>
                <th className="py-2 px-2 font-semibold text-right">Price Diff</th>
                <th className="py-2 px-2 font-semibold">Status</th>
                <th className="py-2 px-2 font-semibold max-md:hidden">Requested At</th>
                <th className="py-2 px-2 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {upgrades.map(u => {
                const diff = Number(u.priceDifference)
                const isFree = diff <= 0
                return (
                  <tr key={u.id} className="border-b border-border last:border-0">
                    <td className="py-3 px-2">
                      <p className="text-foreground font-medium">{u.booking.guest.firstName} {u.booking.guest.lastName}</p>
                      <p className="text-foreground-tertiary text-xs">{u.booking.guest.email}</p>
                    </td>
                    <td className="py-3 px-2">
                      <p className="text-foreground font-mono text-xs">{u.booking.bookingRef}</p>
                      <p className="text-foreground-tertiary text-xs">
                        {new Date(u.booking.checkIn).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {new Date(u.booking.checkOut).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </td>
                    <td className="py-3 px-2">
                      <p className="text-foreground">Room {u.currentRoom.number}</p>
                      <p className="text-foreground-tertiary text-xs">{u.currentRoom.roomType.name}</p>
                    </td>
                    <td className="py-3 px-2">
                      <p className="text-foreground font-medium">{u.requestedType.name}</p>
                      <p className="text-foreground-tertiary text-xs">{formatNaira(u.requestedType.basePrice)}/night</p>
                    </td>
                    <td className="py-3 px-2 text-right">
                      {isFree ? (
                        <span className="text-success text-xs font-semibold">Free</span>
                      ) : (
                        <span className="text-foreground font-semibold">+{formatNaira(diff)}</span>
                      )}
                    </td>
                    <td className="py-3 px-2">
                      {(() => {
                        const awaitingPayment = u.status === 'PENDING' && !!u.paymentReference
                        const badgeClass = awaitingPayment
                          ? 'bg-[#E0F2FE] text-[#0369A1]'
                          : STATUS_COLORS[u.status]
                        const label = awaitingPayment ? 'Awaiting Payment' : u.status
                        return (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${badgeClass}`}>
                            {label}
                          </span>
                        )
                      })()}
                    </td>
                    <td className="py-3 px-2 text-foreground-tertiary text-xs max-md:hidden">
                      {new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      {u.processedBy && (
                        <p className="text-foreground-tertiary text-[10px] mt-0.5">
                          by {u.processedBy.firstName}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-2 text-right">
                      {u.status === 'PENDING' && !u.paymentReference && (
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => setConfirmAction({ id: u.id, type: 'approve', upgrade: u })}
                            disabled={processing === u.id}
                            className="bg-success text-foreground-inverse text-[11px] font-semibold px-2.5 py-1 rounded-md hover:opacity-90 disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => setConfirmAction({ id: u.id, type: 'reject', upgrade: u })}
                            disabled={processing === u.id}
                            className="bg-danger text-foreground-inverse text-[11px] font-semibold px-2.5 py-1 rounded-md hover:opacity-90 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      {u.status === 'PENDING' && u.paymentReference && (
                        <span className="text-foreground-tertiary text-[11px]">Guest to pay</span>
                      )}
                      {u.status !== 'PENDING' && (
                        <span className="text-foreground-tertiary text-xs">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirm Dialog */}
      {confirmAction && (
        <ConfirmModal
          open
          title={confirmAction.type === 'approve' ? 'Approve Upgrade' : 'Reject Upgrade'}
          message={
            confirmAction.type === 'approve'
              ? Number(confirmAction.upgrade.priceDifference) <= 0
                ? `This is a free upgrade to ${confirmAction.upgrade.requestedType.name}. The guest will be moved immediately.`
                : `This upgrade to ${confirmAction.upgrade.requestedType.name} requires ${formatNaira(confirmAction.upgrade.priceDifference)} additional payment. The guest will be prompted to pay via Paystack.`
              : `Reject the upgrade request to ${confirmAction.upgrade.requestedType.name}? The guest will be notified.`
          }
          confirmLabel={confirmAction.type === 'approve' ? 'Approve' : 'Reject'}
          variant={confirmAction.type === 'reject' ? 'danger' : 'default'}
          loading={processing === confirmAction.id}
          onConfirm={() =>
            confirmAction.type === 'approve'
              ? handleApprove(confirmAction.id)
              : handleReject(confirmAction.id)
          }
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  )
}
