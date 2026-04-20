'use client'
import React, { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { HiOutlineCalendar, HiOutlineX, HiOutlineCheck } from 'react-icons/hi'
import ConfirmModal from '@/component/ui/ConfirmModal'

interface Extension {
  id: string
  originalCheckOut: string
  newCheckOut: string
  additionalNights: number
  additionalAmount: number | string
  paymentReference: string | null
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  createdAt: string
  booking: {
    id: string
    bookingRef: string
    checkIn: string
    status: string
    guest: { firstName: string; lastName: string; email: string }
    room: { number: string; roomType: { name: string } } | null
  }
}

const formatNaira = (v: number | string) =>
  `₦${new Intl.NumberFormat('en-NG', { maximumFractionDigits: 0 }).format(Number(v))}`

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-warning-bg text-warning',
  APPROVED: 'bg-success-bg text-success',
  REJECTED: 'bg-danger-bg text-danger',
}

const TABS = ['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const

export default function AdminExtensionsPage() {
  const [extensions, setExtensions] = useState<Extension[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<string>('PENDING')
  const [processing, setProcessing] = useState<string | null>(null)
  const [confirmAction, setConfirmAction] = useState<{
    ext: Extension
    type: 'approve' | 'reject'
  } | null>(null)

  const fetchExtensions = useCallback(async () => {
    setLoading(true)
    try {
      const params = tab !== 'ALL' ? `?status=${tab}` : ''
      const res = await api.get(`/admin/extensions${params}`)
      setExtensions(res.data.data.extensions || [])
    } catch {
      toast.error('Failed to load extensions')
    }
    setLoading(false)
  }, [tab])

  useEffect(() => {
    fetchExtensions()
  }, [fetchExtensions])

  const handleApprove = async (id: string) => {
    setProcessing(id)
    setConfirmAction(null)
    try {
      const res = await api.patch(`/admin/extensions/${id}/approve`)
      const amount = res.data.data?.amount
      toast.success(`Guest notified — they'll pay ${formatNaira(amount)} to confirm`)
      fetchExtensions()
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
      await api.patch(`/admin/extensions/${id}/reject`)
      toast.success('Extension rejected')
      fetchExtensions()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to reject'
      toast.error(msg)
    } finally {
      setProcessing(null)
    }
  }

  const pendingCount = extensions.filter(e => e.status === 'PENDING').length

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-foreground font-heading text-2xl font-bold">Stay Extensions</h1>
          {pendingCount > 0 && (
            <p className="text-foreground-tertiary text-sm mt-1">
              {pendingCount} pending extension{pendingCount !== 1 ? 's' : ''}
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
        <div className="space-y-3">
          {[0, 1, 2].map(i => <div key={i} className="h-20 bg-foreground-disabled/10 rounded-xl animate-pulse" />)}
        </div>
      ) : extensions.length === 0 ? (
        <div className="text-center py-16">
          <HiOutlineCalendar size={28} className="text-foreground-disabled mx-auto mb-3" />
          <p className="text-foreground-tertiary text-sm">
            No extensions{tab !== 'ALL' ? ` with status ${tab.toLowerCase()}` : ''}.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-foreground-tertiary text-[11px] uppercase tracking-wider border-b border-border">
                <th className="py-2 px-2 font-semibold">Guest</th>
                <th className="py-2 px-2 font-semibold">Booking</th>
                <th className="py-2 px-2 font-semibold">Original Checkout</th>
                <th className="py-2 px-2 font-semibold">New Checkout</th>
                <th className="py-2 px-2 font-semibold text-right">Nights</th>
                <th className="py-2 px-2 font-semibold text-right">Amount</th>
                <th className="py-2 px-2 font-semibold">Status</th>
                <th className="py-2 px-2 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {extensions.map(ext => {
                const needsReview = ext.status === 'PENDING' && !ext.paymentReference
                const awaitingPayment = ext.status === 'PENDING' && !!ext.paymentReference
                const badgeLabel = awaitingPayment ? 'AWAITING PAYMENT' : ext.status
                const badgeClass = awaitingPayment
                  ? 'bg-[#E0F2FE] text-[#0369A1]'
                  : STATUS_COLORS[ext.status]
                return (
                  <tr key={ext.id} className="border-b border-border last:border-0">
                    <td className="py-3 px-2">
                      <p className="text-foreground font-medium">
                        {ext.booking.guest.firstName} {ext.booking.guest.lastName}
                      </p>
                      <p className="text-foreground-tertiary text-xs">{ext.booking.guest.email}</p>
                    </td>
                    <td className="py-3 px-2">
                      <p className="text-foreground font-mono text-xs">{ext.booking.bookingRef}</p>
                      <p className="text-foreground-tertiary text-xs">
                        {ext.booking.room ? `Room ${ext.booking.room.number}` : '—'}
                      </p>
                    </td>
                    <td className="py-3 px-2 text-foreground-secondary text-xs">
                      {fmtDate(ext.originalCheckOut)}
                    </td>
                    <td className="py-3 px-2 text-foreground text-xs font-medium">
                      {fmtDate(ext.newCheckOut)}
                    </td>
                    <td className="py-3 px-2 text-right text-foreground font-medium">
                      +{ext.additionalNights}
                    </td>
                    <td className="py-3 px-2 text-right text-foreground font-semibold">
                      {formatNaira(ext.additionalAmount)}
                    </td>
                    <td className="py-3 px-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${badgeClass}`}>
                        {badgeLabel}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right">
                      {needsReview ? (
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => setConfirmAction({ ext, type: 'approve' })}
                            disabled={processing === ext.id}
                            className="bg-success text-foreground-inverse text-[11px] font-semibold px-2.5 py-1 rounded-md hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-1"
                          >
                            <HiOutlineCheck size={12} />
                            Approve
                          </button>
                          <button
                            onClick={() => setConfirmAction({ ext, type: 'reject' })}
                            disabled={processing === ext.id}
                            className="bg-danger text-foreground-inverse text-[11px] font-semibold px-2.5 py-1 rounded-md hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-1"
                          >
                            <HiOutlineX size={12} />
                            Reject
                          </button>
                        </div>
                      ) : awaitingPayment ? (
                        <span className="text-foreground-tertiary text-[11px]">Guest to pay</span>
                      ) : (
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

      {confirmAction && (
        <ConfirmModal
          open
          title={confirmAction.type === 'approve' ? 'Approve Extension' : 'Reject Extension'}
          message={
            confirmAction.type === 'approve'
              ? `Approve ${confirmAction.ext.booking.guest.firstName}'s extension on ${confirmAction.ext.booking.bookingRef} (+${confirmAction.ext.additionalNights} night${confirmAction.ext.additionalNights !== 1 ? 's' : ''})? The guest will be prompted to pay ${formatNaira(confirmAction.ext.additionalAmount)} (plus 10% tax) via Paystack.`
              : `Reject ${confirmAction.ext.booking.guest.firstName}'s request to extend ${confirmAction.ext.booking.bookingRef} by ${confirmAction.ext.additionalNights} night${confirmAction.ext.additionalNights !== 1 ? 's' : ''}? The guest will be notified.`
          }
          confirmLabel={confirmAction.type === 'approve' ? 'Approve' : 'Reject'}
          variant={confirmAction.type === 'reject' ? 'danger' : 'default'}
          loading={processing === confirmAction.ext.id}
          onConfirm={() =>
            confirmAction.type === 'approve'
              ? handleApprove(confirmAction.ext.id)
              : handleReject(confirmAction.ext.id)
          }
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  )
}
