'use client'
import React, { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import {
  HiOutlineClock,
  HiOutlineSparkles,
  HiOutlineCheck,
  HiOutlineShoppingBag,
  HiOutlineChevronRight,
} from 'react-icons/hi'

interface OrderItemLine {
  itemId: string
  name: string
  price: number
  quantity: number
  subtotal: number
}

export interface ActiveOrder {
  id: string
  status: 'PENDING' | 'PREPARING' | 'DELIVERED' | 'CANCELLED'
  totalAmount: number
  items: OrderItemLine[]
  estimatedAt: string
  deliveredAt: string | null
  createdAt: string
  roomNumber: string
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = {
  PENDING: {
    label: 'Order received',
    bg: 'bg-warning-bg',
    text: 'text-warning',
    dot: 'bg-warning',
    icon: HiOutlineShoppingBag,
  },
  PREPARING: {
    label: 'Being prepared',
    bg: 'bg-[#FAEEDA]',
    text: 'text-[#8A6A20]',
    dot: 'bg-[#D97706]',
    icon: HiOutlineSparkles,
  },
  DELIVERED: {
    label: 'Delivered',
    bg: 'bg-success-bg',
    text: 'text-success',
    dot: 'bg-success',
    icon: HiOutlineCheck,
  },
}

const formatNaira = (v: number) =>
  `₦${new Intl.NumberFormat('en-NG', { maximumFractionDigits: 0 }).format(v)}`

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

interface Props {
  // Shows a compact single-card variant (dashboard) when true; full list when false
  compact?: boolean
}

const ActiveOrdersSection = ({ compact = false }: Props) => {
  const [orders, setOrders] = useState<ActiveOrder[]>([])
  const [loading, setLoading] = useState(true)

  const fetchActive = useCallback(async () => {
    try {
      // Pull recent orders; filter active client-side to avoid 3 requests
      const res = await api.get('/room-service/orders?limit=20')
      const list = (res.data.data.orders || []) as ActiveOrder[]
      const active = list.filter(o => o.status === 'PENDING' || o.status === 'PREPARING')
      setOrders(active)
    } catch {
      setOrders([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchActive()
    const interval = setInterval(fetchActive, 15_000) // 15s
    return () => clearInterval(interval)
  }, [fetchActive])

  if (loading) {
    return (
      <div className={compact ? 'h-24 bg-foreground-disabled/10 rounded-2xl animate-pulse' : 'h-20 bg-foreground-disabled/10 rounded-2xl animate-pulse'} />
    )
  }

  if (orders.length === 0) return null

  // Compact variant for dashboard — shows a single summary card linking to /room-service
  if (compact) {
    const first = orders[0]
    const config = STATUS_CONFIG[first.status]
    const Icon = config.icon
    return (
      <Link
        href="/room-service"
        className="group block border border-border rounded-2xl p-5 vsm:p-6 bg-foreground-inverse hover:border-foreground-disabled/50 transition-colors"
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-foreground font-semibold text-sm flex items-center gap-2">
            <Icon size={16} />
            Room Service
            {orders.length > 1 && (
              <span className="text-foreground-tertiary text-xs">({orders.length} active)</span>
            )}
          </h2>
          <HiOutlineChevronRight size={16} className="text-foreground-disabled group-hover:text-foreground transition-colors" />
        </div>

        <div className="flex items-center gap-3">
          <div className={`${config.bg} ${config.text} w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0`}>
            <Icon size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className={`w-2 h-2 rounded-full ${config.dot} animate-pulse`} />
              <p className="text-foreground font-semibold text-sm truncate">{config.label}</p>
            </div>
            <p className="text-foreground-tertiary text-xs truncate">
              {first.items.reduce((s, i) => s + i.quantity, 0)} item{first.items.reduce((s, i) => s + i.quantity, 0) !== 1 ? 's' : ''} · {formatNaira(first.totalAmount)}
            </p>
            <p className="text-foreground-tertiary text-[11px] flex items-center gap-1 mt-0.5">
              <HiOutlineClock size={10} />
              ETA {formatTime(first.estimatedAt)}
            </p>
          </div>
        </div>
      </Link>
    )
  }

  // Full variant for room-service page
  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-foreground font-semibold text-sm">
          Active Orders <span className="text-foreground-tertiary">({orders.length})</span>
        </h2>
        <p className="text-foreground-tertiary text-xs">Updates automatically</p>
      </div>

      <div className="grid vsm:grid-cols-2 gap-3">
        {orders.map(order => {
          const config = STATUS_CONFIG[order.status]
          const Icon = config.icon
          const itemCount = order.items.reduce((s, i) => s + i.quantity, 0)
          return (
            <div
              key={order.id}
              className={`${config.bg} rounded-2xl p-4 border border-transparent hover:border-foreground/10 transition-colors`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${config.dot} animate-pulse`} />
                  <p className={`${config.text} text-[11px] font-semibold uppercase tracking-wider`}>{config.label}</p>
                </div>
                <Icon size={18} className={config.text} />
              </div>

              <p className="text-foreground font-semibold text-sm">
                {itemCount} item{itemCount !== 1 ? 's' : ''} · {formatNaira(order.totalAmount)}
              </p>

              <p className="text-foreground-secondary text-xs mt-1 line-clamp-1">
                {order.items.map(i => `${i.quantity}× ${i.name}`).join(', ')}
              </p>

              <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-foreground/10">
                <p className="text-foreground-tertiary text-[11px] flex items-center gap-1">
                  <HiOutlineClock size={11} />
                  ETA {formatTime(order.estimatedAt)}
                </p>
                <p className="text-foreground-tertiary text-[10px] font-mono">#{order.id.slice(-6).toUpperCase()}</p>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default ActiveOrdersSection
