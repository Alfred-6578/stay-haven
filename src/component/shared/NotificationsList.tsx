'use client'
import React, { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import {
  HiOutlineBell,
  HiOutlineCheck,
  HiOutlineTrash,
  HiOutlineCheckCircle,
} from 'react-icons/hi'

interface Notification {
  id: string
  title: string
  message: string
  type: string
  isRead: boolean
  createdAt: string
  bookingId: string | null
}

const TYPE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  BOOKING_CONFIRMED: { bg: 'bg-success-bg', text: 'text-success', label: 'Booking' },
  BOOKING_CANCELLED: { bg: 'bg-danger-bg', text: 'text-danger', label: 'Booking' },
  CHECK_IN_REMINDER: { bg: 'bg-[#E0F2FE]', text: 'text-[#0369A1]', label: 'Reminder' },
  OVERSTAY_WARNING: { bg: 'bg-warning-bg', text: 'text-warning', label: 'Overstay' },
  PAYMENT_SUCCESS: { bg: 'bg-success-bg', text: 'text-success', label: 'Payment' },
  ROOM_SERVICE_UPDATE: { bg: 'bg-[#FAEEDA]', text: 'text-[#8A6A20]', label: 'Room Service' },
  POINTS_EARNED: { bg: 'bg-gold/10', text: 'text-gold', label: 'Loyalty' },
  UPGRADE_APPROVED: { bg: 'bg-[#F4E8FF]', text: 'text-[#7C3AED]', label: 'Upgrade' },
  EXTENSION_APPROVED: { bg: 'bg-[#E0F2FE]', text: 'text-[#0369A1]', label: 'Extension' },
  GENERAL: { bg: 'bg-foreground-disabled/10', text: 'text-foreground-secondary', label: 'Info' },
}

const timeAgo = (date: string) => {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

interface Props {
  /** Title shown above the list */
  title?: string
}

const NotificationsList = ({ title = 'Notifications' }: Props) => {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '25',
      })
      if (filter === 'unread') params.set('isRead', 'false')
      const res = await api.get(`/notifications?${params}`)
      setNotifications(res.data.data.notifications || [])
      setTotalPages(res.data.data.pagination?.totalPages || 1)
    } catch {
      toast.error('Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }, [filter, page])

  useEffect(() => {
    fetch()
  }, [fetch])

  const unreadOnPage = notifications.filter(n => !n.isRead).length

  const markRead = async (id: string) => {
    // Optimistic update
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
    try {
      await api.patch(`/notifications/${id}/read`)
    } catch {
      fetch() // rollback
    }
  }

  const markAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    try {
      await api.patch('/notifications/read-all')
      toast.success('All notifications marked as read')
    } catch {
      fetch()
      toast.error('Failed to mark all as read')
    }
  }

  const handleDelete = async (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
    try {
      await api.delete(`/notifications/${id}`)
    } catch {
      fetch()
      toast.error('Failed to delete')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-foreground font-heading text-2xl font-bold">{title}</h1>
          <p className="text-foreground-tertiary text-sm mt-1">
            Stay up to date with activity across your account.
          </p>
        </div>
        {unreadOnPage > 0 && (
          <button
            onClick={markAllRead}
            className="inline-flex items-center gap-1.5 text-foreground text-xs font-semibold px-3 py-2 border border-border rounded-lg hover:bg-foreground-disabled/5"
          >
            <HiOutlineCheckCircle size={14} />
            Mark all as read
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-foreground-disabled/10 p-1 rounded-xl w-max mb-6">
        {(['all', 'unread'] as const).map(f => (
          <button
            key={f}
            onClick={() => { setFilter(f); setPage(1) }}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              filter === f
                ? 'bg-foreground text-foreground-inverse shadow-sm'
                : 'text-foreground-secondary hover:text-foreground'
            }`}
          >
            {f === 'all' ? 'All' : 'Unread'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map(i => <div key={i} className="h-20 bg-foreground-disabled/10 rounded-xl animate-pulse" />)}
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-foreground-disabled/10 flex items-center justify-center mx-auto mb-4">
            <HiOutlineBell size={26} className="text-foreground-tertiary" />
          </div>
          <h3 className="text-foreground font-semibold text-lg mb-1">
            {filter === 'unread' ? 'All caught up' : 'No notifications yet'}
          </h3>
          <p className="text-foreground-tertiary text-sm">
            {filter === 'unread'
              ? "You've read every notification. Nice."
              : "You'll see updates here as they happen."}
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            {notifications.map(n => {
              const meta = TYPE_COLORS[n.type] || TYPE_COLORS.GENERAL
              return (
                <div
                  key={n.id}
                  className={`group relative flex gap-3 p-4 rounded-xl border transition-colors ${
                    n.isRead
                      ? 'border-border bg-foreground-inverse'
                      : 'border-foreground/10 bg-foreground-disabled/[0.04]'
                  }`}
                >
                  {/* Unread dot */}
                  {!n.isRead && (
                    <span className="absolute left-4 top-4 w-2 h-2 rounded-full bg-danger" />
                  )}

                  {/* Content */}
                  <div className={`flex-1 min-w-0 ${!n.isRead ? 'pl-4' : ''}`}>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-foreground font-semibold text-sm">{n.title}</h4>
                        <span className={`${meta.bg} ${meta.text} text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider`}>
                          {meta.label}
                        </span>
                      </div>
                      <p className="text-foreground-tertiary text-[11px] whitespace-nowrap shrink-0">
                        {timeAgo(n.createdAt)}
                      </p>
                    </div>
                    <p className="text-foreground-secondary text-sm leading-relaxed">
                      {n.message}
                    </p>

                    {/* Actions */}
                    <div className="flex items-center gap-3 mt-2">
                      {!n.isRead && (
                        <button
                          onClick={() => markRead(n.id)}
                          className="inline-flex items-center gap-1 text-foreground-tertiary text-xs hover:text-foreground"
                        >
                          <HiOutlineCheck size={12} />
                          Mark as read
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(n.id)}
                        className="inline-flex items-center gap-1 text-foreground-tertiary text-xs hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <HiOutlineTrash size={12} />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
              <p className="text-foreground-tertiary text-xs">
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1 || loading}
                  className="text-foreground text-xs font-semibold px-3 py-1.5 border border-border rounded-md hover:bg-foreground-disabled/5 disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || loading}
                  className="text-foreground text-xs font-semibold px-3 py-1.5 border border-border rounded-md hover:bg-foreground-disabled/5 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default NotificationsList
