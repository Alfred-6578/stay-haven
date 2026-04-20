'use client'
import React, { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { HiOutlineRefresh } from 'react-icons/hi'
import OrderQueueCard, { QueueOrder } from '@/component/staff/OrderQueueCard'

type Tab = 'PENDING' | 'PREPARING' | 'ALL'

const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'PENDING', label: 'Pending' },
  { key: 'PREPARING', label: 'Preparing' },
  { key: 'ALL', label: 'All' },
]

const AUTO_REFRESH_MS = 30_000

export default function StaffOrdersPage() {
  const [tab, setTab] = useState<Tab>('PENDING')
  const [orders, setOrders] = useState<QueueOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const fetchOrders = useCallback(
    async (opts: { silent?: boolean } = {}) => {
      if (!opts.silent) setLoading(true)
      else setRefreshing(true)
      try {
        const params = new URLSearchParams({ limit: '50' })
        if (tab !== 'ALL') params.set('status', tab)
        const res = await api.get(`/room-service/orders?${params.toString()}`)
        setOrders(res.data.data.orders || [])
        setLastRefresh(new Date())
      } catch {
        if (!opts.silent) setOrders([])
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [tab]
  )

  // Fetch on tab change
  useEffect(() => { fetchOrders() }, [fetchOrders])

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(() => fetchOrders({ silent: true }), AUTO_REFRESH_MS)
    return () => clearInterval(interval)
  }, [fetchOrders])

  const handleOptimisticChange = (orderId: string, newStatus: QueueOrder['status']) => {
    setOrders(prev => {
      // If filtering by a specific status and the new status no longer matches, remove it
      if (tab !== 'ALL' && newStatus !== tab) {
        return prev.filter(o => o.id !== orderId)
      }
      return prev.map(o => (o.id === orderId ? { ...o, status: newStatus } : o))
    })
  }

  const counts = {
    pending: orders.filter(o => o.status === 'PENDING').length,
    preparing: orders.filter(o => o.status === 'PREPARING').length,
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap mb-6">
        <div>
          <h1 className="text-foreground font-heading text-2xl font-bold">Order Queue</h1>
          <p className="text-foreground-tertiary text-sm">
            Room service orders requiring action.
            {lastRefresh && (
              <span className="ml-1">
                Last updated {lastRefresh.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}.
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => fetchOrders()}
          disabled={loading || refreshing}
          className="flex items-center gap-1.5 border border-border rounded-lg px-3 py-2 text-xs font-medium text-foreground hover:bg-foreground-disabled/5 disabled:opacity-50"
        >
          <HiOutlineRefresh size={14} className={loading || refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border mb-5">
        {TABS.map(t => {
          const active = tab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              disabled={loading}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                active ? 'border-foreground text-foreground' : 'border-transparent text-foreground-tertiary hover:text-foreground'
              }`}
            >
              {t.label}
              {t.key === 'PENDING' && counts.pending > 0 && (
                <span className="ml-1.5 bg-warning text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">
                  {counts.pending}
                </span>
              )}
              {t.key === 'PREPARING' && counts.preparing > 0 && (
                <span className="ml-1.5 bg-[#8A6A20] text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">
                  {counts.preparing}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[0, 1, 2, 3].map(i => <div key={i} className="h-52 bg-foreground-disabled/10 rounded-2xl animate-pulse" />)}
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-foreground-inverse border border-border rounded-2xl p-16 text-center">
          <p className="text-foreground font-medium">No {tab === 'ALL' ? '' : tab.toLowerCase()} orders</p>
          <p className="text-foreground-tertiary text-sm mt-1">
            {tab === 'PENDING'
              ? 'New orders will appear here as guests place them.'
              : tab === 'PREPARING'
              ? 'Orders you start preparing will show up here.'
              : 'Nothing to show yet.'}
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {orders.map(order => (
            <OrderQueueCard
              key={order.id}
              order={order}
              onStatusChange={(s) => handleOptimisticChange(order.id, s)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
