'use client'
import React, { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import {
  HiOutlineCheck,
  HiOutlineClock,
  HiOutlineSparkles,
  HiOutlineBan,
  HiOutlineShoppingBag,
} from 'react-icons/hi'

interface OrderItemLine {
  itemId: string
  name: string
  price: number
  quantity: number
  subtotal: number
}

interface Order {
  id: string
  status: 'PENDING' | 'PREPARING' | 'DELIVERED' | 'CANCELLED'
  totalAmount: number
  items: OrderItemLine[]
  instructions: string | null
  estimatedAt: string
  deliveredAt: string | null
  createdAt: string
  booking: { bookingRef: string; roomNumber: string }
}

interface Props {
  orderId: string
  onBackToMenu: () => void
}

const STAGES = ['PENDING', 'PREPARING', 'DELIVERED'] as const

const STAGE_CONFIG: Record<string, { label: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = {
  PENDING: { label: 'Order Received', icon: HiOutlineShoppingBag },
  PREPARING: { label: 'In the Kitchen', icon: HiOutlineSparkles },
  DELIVERED: { label: 'Delivered', icon: HiOutlineCheck },
}

const formatNaira = (v: number) =>
  `₦${new Intl.NumberFormat('en-NG', { maximumFractionDigits: 0 }).format(v)}`

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

const OrderConfirmationCard = ({ orderId, onBackToMenu }: Props) => {
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const fetchOnce = async () => {
      try {
        const res = await api.get(`/room-service/orders/${orderId}`)
        if (!cancelled) setOrder(res.data.data)
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchOnce()
    const interval = setInterval(() => {
      if (!cancelled) fetchOnce()
    }, 30_000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [orderId])

  if (loading || !order) {
    return (
      <div className="bg-foreground-inverse border border-border rounded-2xl p-8 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const isCancelled = order.status === 'CANCELLED'
  const currentStageIdx = isCancelled
    ? -1
    : STAGES.indexOf(order.status as (typeof STAGES)[number])

  return (
    <div className="bg-foreground-inverse border border-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 bg-foreground text-foreground-inverse">
        <p className="text-foreground-inverse/60 text-xs uppercase tracking-wider font-semibold">Order Placed</p>
        <p className="text-foreground-inverse text-xs mt-0.5 font-mono">#{order.id.slice(-8).toUpperCase()}</p>
        <p className="text-foreground-inverse text-2xl font-heading font-bold mt-2">{formatNaira(order.totalAmount)}</p>
      </div>

      {/* Status tracker */}
      <div className="px-6 py-6 border-b border-border">
        {isCancelled ? (
          <div className="flex items-center gap-3 bg-danger-bg rounded-xl p-4">
            <HiOutlineBan size={20} className="text-danger flex-shrink-0" />
            <div>
              <p className="text-foreground font-semibold text-sm">Order Cancelled</p>
              <p className="text-foreground-tertiary text-xs mt-0.5">Please contact the front desk if this was unexpected.</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            {STAGES.map((stage, i) => {
              const Config = STAGE_CONFIG[stage]
              const done = i < currentStageIdx
              const active = i === currentStageIdx
              return (
                <React.Fragment key={stage}>
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div
                      className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors ${
                        done
                          ? 'bg-success text-white'
                          : active
                          ? 'bg-foreground text-foreground-inverse'
                          : 'bg-foreground-disabled/15 text-foreground-disabled'
                      }`}
                    >
                      <Config.icon size={18} className={active ? 'animate-pulse' : ''} />
                    </div>
                    <p
                      className={`text-[10px] font-semibold uppercase tracking-wider mt-1.5 text-center ${
                        done || active ? 'text-foreground' : 'text-foreground-disabled'
                      }`}
                    >
                      {Config.label}
                    </p>
                  </div>
                  {i < STAGES.length - 1 && (
                    <div className="flex-1 h-0.5 bg-foreground-disabled/15 relative -mt-4 mx-1 rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-success transition-all duration-500`}
                        style={{ width: i < currentStageIdx ? '100%' : '0%' }}
                      />
                    </div>
                  )}
                </React.Fragment>
              )
            })}
          </div>
        )}

        {!isCancelled && order.status !== 'DELIVERED' && (
          <p className="text-foreground-tertiary text-xs flex items-center gap-1.5 mt-4 justify-center">
            <HiOutlineClock size={12} />
            Estimated delivery around <span className="text-foreground font-medium">{formatTime(order.estimatedAt)}</span>
          </p>
        )}

        {order.status === 'DELIVERED' && order.deliveredAt && (
          <p className="text-success text-xs flex items-center gap-1.5 mt-4 justify-center">
            <HiOutlineCheck size={12} />
            Delivered at {formatTime(order.deliveredAt)}
          </p>
        )}
      </div>

      {/* Items */}
      <div className="px-6 py-5">
        <p className="text-foreground-tertiary text-[11px] uppercase tracking-wider font-semibold mb-3">Items</p>
        <div className="space-y-2">
          {order.items.map(line => (
            <div key={line.itemId} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="text-foreground font-semibold">{line.quantity}×</span>
                <span className="text-foreground-secondary">{line.name}</span>
              </div>
              <span className="text-foreground font-medium">{formatNaira(line.subtotal)}</span>
            </div>
          ))}
        </div>

        {order.instructions && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-foreground-tertiary text-[11px] uppercase tracking-wider font-semibold mb-1">Instructions</p>
            <p className="text-foreground-secondary text-sm italic">&ldquo;{order.instructions}&rdquo;</p>
          </div>
        )}
      </div>

      {/* Action */}
      <div className="px-6 py-4 border-t border-border bg-background-secondary">
        <button
          onClick={onBackToMenu}
          className="w-full border border-border rounded-lg py-2.5 text-sm font-medium text-foreground hover:bg-foreground-disabled/5"
        >
          Order Again
        </button>
      </div>
    </div>
  )
}

export default OrderConfirmationCard
