'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { HiOutlineBell, HiOutlineCheck } from 'react-icons/hi'
import { api } from '@/lib/api'

interface Notification {
  id: string
  title: string
  message: string
  type: string
  isRead: boolean
  createdAt: string
}

const NotificationBell = () => {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)

  const fetchCount = useCallback(async () => {
    try {
      const res = await api.get('/notifications?limit=1')
      setUnreadCount(res.data.data.unreadCount)
    } catch {}
  }, [])

  useEffect(() => {
    fetchCount()
    const interval = setInterval(fetchCount, 30000)
    return () => clearInterval(interval)
  }, [fetchCount])

  const fetchNotifications = async () => {
    setLoading(true)
    try {
      const res = await api.get('/notifications?limit=20')
      setNotifications(res.data.data.notifications)
      setUnreadCount(res.data.data.unreadCount)
    } catch {}
    setLoading(false)
  }

  const handleOpen = () => {
    setOpen(!open)
    if (!open) fetchNotifications()
  }

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all')
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
      setUnreadCount(0)
    } catch {}
  }

  const markRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`)
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, isRead: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch {}
  }

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    return `${days}d ago`
  }

  return (
    <div className="relative">
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-lg hover:bg-foreground-disabled/10 transition-colors"
      >
        <HiOutlineBell size={20} className="text-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 bg-danger text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 vsm:w-96 bg-foreground-inverse border border-border rounded-2xl shadow-xl z-50 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="text-foreground font-semibold text-sm">Notifications</h3>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-foreground-tertiary text-xs hover:text-foreground transition-colors flex items-center gap-1">
                  <HiOutlineCheck size={12} />
                  Mark all read
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto">
              {loading ? (
                <div className="p-8 flex justify-center">
                  <div className="w-5 h-5 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <HiOutlineBell size={24} className="text-foreground-disabled mx-auto mb-2" />
                  <p className="text-foreground-tertiary text-sm">No notifications yet</p>
                </div>
              ) : (
                notifications.map(n => (
                  <button
                    key={n.id}
                    onClick={() => { if (!n.isRead) markRead(n.id) }}
                    className={`w-full text-left px-4 py-3 border-b border-border last:border-0 hover:bg-foreground-disabled/5 transition-colors ${
                      !n.isRead ? 'bg-foreground-disabled/[0.04]' : ''
                    }`}
                  >
                    <div className="flex gap-2.5">
                      {!n.isRead && (
                        <div className="w-2 h-2 rounded-full bg-danger mt-1.5 flex-shrink-0" />
                      )}
                      <div className={!n.isRead ? '' : 'pl-4.5'}>
                        <p className="text-foreground text-sm font-medium leading-tight">{n.title}</p>
                        <p className="text-foreground-tertiary text-xs mt-0.5 line-clamp-2">{n.message}</p>
                        <p className="text-foreground-disabled text-[10px] mt-1">{timeAgo(n.createdAt)}</p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default NotificationBell
