'use client'
import React, { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { HiOutlineExclamation, HiOutlineBell, HiOutlineRefresh } from 'react-icons/hi'
import ConfirmModal from '@/component/ui/ConfirmModal'

interface OverstayItem {
  booking: { id: string; bookingRef: string }
  guest: {
    id: string
    firstName: string
    lastName: string
    email: string
    phone: string | null
  }
  room: { number: string }
  originalCheckOut: string
  overstayHours: number
}

const AUTO_REFRESH_MS = 5 * 60 * 1000 // 5 min

export default function AdminOverstayPage() {
  const [items, setItems] = useState<OverstayItem[]>([])
  const [loading, setLoading] = useState(true)
  const [notifyingId, setNotifyingId] = useState<string | null>(null)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkLoading, setBulkLoading] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const fetchOverstays = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await api.get('/admin/overstay/check')
      setItems(res.data.data)
      setLastRefresh(new Date())
    } catch {
      if (!silent) toast.error('Failed to load overstays')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOverstays()
    const interval = setInterval(() => fetchOverstays(true), AUTO_REFRESH_MS)
    return () => clearInterval(interval)
  }, [fetchOverstays])

  const notifyOne = async (bookingId: string, guestName: string) => {
    setNotifyingId(bookingId)
    try {
      await api.post(`/admin/overstay/notify/${bookingId}`)
      toast.success(`${guestName} notified`)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to send notice'
      toast.error(msg)
    } finally {
      setNotifyingId(null)
    }
  }

  const notifyAll = async () => {
    setBulkLoading(true)
    try {
      const res = await api.post('/admin/overstay/notify-all')
      const count = res.data.data.notified
      toast.success(`Notified ${count} guest${count !== 1 ? 's' : ''}`)
      setBulkOpen(false)
      fetchOverstays()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Bulk notify failed'
      toast.error(msg)
    } finally {
      setBulkLoading(false)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="text-foreground font-heading text-2xl font-bold">Overstay</h1>
          <p className="text-foreground-tertiary text-sm mt-1">
            Guests past their scheduled checkout.
            {lastRefresh && (
              <span className="ml-1">Last checked {lastRefresh.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}.</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchOverstays()}
            disabled={loading}
            className="flex items-center gap-1.5 border border-border rounded-lg px-3 py-2 text-xs font-medium text-foreground hover:bg-foreground-disabled/5 disabled:opacity-50"
          >
            <HiOutlineRefresh size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => setBulkOpen(true)}
            disabled={items.length === 0}
            className="flex items-center gap-1.5 bg-[#0B1B3A] text-white rounded-lg px-4 py-2 text-xs font-semibold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <HiOutlineBell size={14} />
            Notify All ({items.length})
          </button>
        </div>
      </div>

      {/* Warning banner */}
      {items.length > 0 && (
        <div className="bg-danger-bg border border-danger/20 rounded-xl p-4 mb-6 flex items-start gap-3">
          <HiOutlineExclamation size={20} className="text-danger flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-foreground font-semibold text-sm">
              {items.length} guest{items.length !== 1 ? 's' : ''} currently overstaying
            </p>
            <p className="text-foreground-secondary text-xs mt-0.5">
              {items.filter(i => i.overstayHours > 12).length} are over 12 hours past checkout. Notify them individually or use bulk notify.
            </p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-foreground-inverse border border-border rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-8">
            <div className="h-40 bg-foreground-disabled/10 rounded-lg animate-pulse" />
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-success-bg flex items-center justify-center">
              <HiOutlineBell size={22} className="text-success" />
            </div>
            <p className="text-foreground font-medium">All clear</p>
            <p className="text-foreground-tertiary text-sm mt-1">No overstayed guests right now.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-foreground-tertiary text-[11px] uppercase tracking-wider border-b border-border bg-foreground-disabled/[0.03]">
                  <th className="py-3 px-4 font-semibold">Guest</th>
                  <th className="py-3 px-4 font-semibold">Room</th>
                  <th className="py-3 px-4 font-semibold max-md:hidden">Scheduled Checkout</th>
                  <th className="py-3 px-4 font-semibold">Hours Overdue</th>
                  <th className="py-3 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => {
                  const severe = item.overstayHours > 12
                  const isNotifying = notifyingId === item.booking.id
                  return (
                    <tr key={item.booking.id} className="border-b border-border last:border-0 hover:bg-foreground-disabled/[0.02]">
                      <td className="py-3 px-4">
                        <p className="text-foreground font-medium">
                          {item.guest.firstName} {item.guest.lastName}
                        </p>
                        <p className="text-foreground-tertiary text-xs">{item.guest.email}</p>
                        <p className="text-foreground-tertiary text-[10px] font-mono mt-0.5">{item.booking.bookingRef}</p>
                      </td>
                      <td className="py-3 px-4 text-foreground font-medium">{item.room.number}</td>
                      <td className="py-3 px-4 text-foreground-secondary max-md:hidden text-xs">
                        {new Date(item.originalCheckOut).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`font-semibold ${severe ? 'text-danger' : 'text-warning'}`}>
                          {item.overstayHours}h
                        </span>
                        {severe && (
                          <span className="ml-2 bg-danger-bg text-danger text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wider">
                            Urgent
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => notifyOne(item.booking.id, `${item.guest.firstName} ${item.guest.lastName}`)}
                          disabled={isNotifying}
                          className="bg-foreground text-foreground-inverse text-xs font-medium px-3 py-1.5 rounded-lg hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-1.5"
                        >
                          {isNotifying ? (
                            <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <HiOutlineBell size={12} />
                          )}
                          Notify
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmModal
        open={bulkOpen}
        title={`Notify all ${items.length} guests?`}
        message="This will send a notification and email to every overstayed guest. Proceed?"
        confirmLabel={`Send ${items.length} Notice${items.length !== 1 ? 's' : ''}`}
        loading={bulkLoading}
        onConfirm={notifyAll}
        onCancel={() => setBulkOpen(false)}
      />
    </div>
  )
}
