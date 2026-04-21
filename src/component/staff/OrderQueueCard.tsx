'use client'
import React, { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { HiOutlineSparkles, HiOutlineCheck, HiOutlineBan, HiOutlineClock } from 'react-icons/hi'

interface OrderItemLine {
  itemId: string
  name: string
  price: number
  quantity: number
  subtotal: number
}

export interface QueueOrder {
  id: string
  status: 'PENDING' | 'PREPARING' | 'DELIVERED' | 'CANCELLED'
  totalAmount: number
  items: OrderItemLine[]
  instructions: string | null
  estimatedAt: string
  createdAt: string
  roomNumber: string
  bookingRef: string
  guestName?: string
}

interface Props {
  order: QueueOrder
  onStatusChange: (newStatus: QueueOrder['status']) => void
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-warning-bg text-warning',
  PREPARING: 'bg-[#FAEEDA] text-[#8A6A20]',
  DELIVERED: 'bg-success-bg text-success',
  CANCELLED: 'bg-danger-bg text-danger',
}

const formatNaira = (v: number) =>
  `₦${new Intl.NumberFormat('en-NG', { maximumFractionDigits: 0 }).format(v)}`

// Self-updating relative time (so the card re-renders every minute)
function useElapsed(fromIso: string) {
  const [, force] = useState(0)
  useEffect(() => {
    const t = setInterval(() => force(x => x + 1), 60_000)
    return () => clearInterval(t)
  }, [])
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(fromIso).getTime()) / 60_000))
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ${minutes % 60}m ago`
}

const OrderQueueCard = ({ order, onStatusChange }: Props) => {
  const [pending, setPending] = useState<null | QueueOrder['status']>(null)
  const elapsed = useElapsed(order.createdAt)

  const updateStatus = async (status: 'PREPARING' | 'DELIVERED' | 'CANCELLED') => {
    // Optimistic
    setPending(status)
    const prevStatus = order.status
    onStatusChange(status)
    try {
      await api.patch(`/room-service/orders/${order.id}/status`, { status })
      toast.success(`Order for room ${order.roomNumber} → ${status.toLowerCase()}`)
    } catch (err: unknown) {
      // Rollback
      onStatusChange(prevStatus)
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Status update failed'
      toast.error(msg)
    } finally {
      setPending(null)
    }
  }

  const itemCount = order.items.reduce((s, l) => s + l.quantity, 0)

  return (
    <div className="bg-foreground-inverse border border-border rounded-2xl overflow-hidden hover:border-foreground-disabled/50 transition-colors">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-foreground font-heading font-bold text-lg">Room {order.roomNumber}</h3>
            <span className={`${STATUS_COLORS[order.status]} text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider`}>
              {order.status}
            </span>
          </div>
          {order.guestName && <p className="text-foreground-secondary text-xs mt-0.5">{order.guestName}</p>}
          <p className="text-foreground-tertiary text-[11px] font-mono mt-1">{order.bookingRef}</p>
        </div>
        <div className="text-right">
          <p className="text-foreground-tertiary text-xs flex items-center gap-1 justify-end">
            <HiOutlineClock size={11} />
            {elapsed}
          </p>
          <p className="text-foreground text-sm font-semibold mt-1">{formatNaira(order.totalAmount)}</p>
        </div>
      </div>

      {/* Items */}
      <div className="px-5 py-4">
        <p className="text-foreground-tertiary text-[10px] uppercase tracking-wider font-semibold mb-2">
          {itemCount} item{itemCount !== 1 ? 's' : ''}
        </p>
        <ul className="space-y-1">
          {order.items.map(line => (
            <li key={line.itemId} className="flex items-center gap-2 text-sm">
              <span className="text-foreground font-semibold w-6 flex-shrink-0">{line.quantity}×</span>
              <span className="text-foreground-secondary flex-1 truncate">{line.name}</span>
            </li>
          ))}
        </ul>

        {order.instructions && (
          <div className="mt-3 bg-warning-bg/30 border border-warning/20 rounded-lg px-3 py-2">
            <p className="text-foreground-tertiary text-[10px] uppercase tracking-wider font-semibold mb-0.5">Notes</p>
            <p className="text-foreground-secondary text-xs italic">{order.instructions}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      {(order.status === 'PENDING' || order.status === 'PREPARING') && (
        <div className="border-t border-border px-5 py-3 bg-background-secondary flex gap-2 flex-wrap">
          {order.status === 'PENDING' && (
            <button
              onClick={() => updateStatus('PREPARING')}
              disabled={!!pending}
              className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 bg-[#0B1B3A] text-white rounded-lg py-2 text-xs font-semibold hover:opacity-90 disabled:opacity-50"
            >
              <HiOutlineSparkles size={13} />
              {pending === 'PREPARING' ? 'Starting...' : 'Start Preparing'}
            </button>
          )}
          {order.status === 'PREPARING' && (
            <button
              onClick={() => updateStatus('DELIVERED')}
              disabled={!!pending}
              className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 bg-success text-white rounded-lg py-2 text-xs font-semibold hover:opacity-90 disabled:opacity-50"
            >
              <HiOutlineCheck size={13} />
              {pending === 'DELIVERED' ? 'Marking...' : 'Mark Delivered'}
            </button>
          )}
          <button
            onClick={() => updateStatus('CANCELLED')}
            disabled={!!pending}
            className="flex items-center justify-center gap-1.5 border border-danger/30 text-danger rounded-lg px-3 py-2 text-xs font-semibold hover:bg-danger-bg disabled:opacity-50"
          >
            <HiOutlineBan size={13} />
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}

export default OrderQueueCard
