'use client'
import React, { useState } from 'react'
import { HiOutlineShoppingBag, HiOutlineTrash, HiPlus, HiMinus, HiOutlineClock } from 'react-icons/hi'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import type { MenuItem } from './MenuItemCard'

export interface CartLine {
  item: MenuItem
  quantity: number
}

interface Props {
  bookingId: string
  lines: CartLine[]
  onIncrement: (itemId: string) => void
  onDecrement: (itemId: string) => void
  onRemove: (itemId: string) => void
  onOrderPlaced: (orderId: string) => void
  // For mobile bottom sheet: open/close state
  mobileOpen: boolean
  onMobileClose: () => void
}

const formatNaira = (v: number) =>
  `₦${new Intl.NumberFormat('en-NG', { maximumFractionDigits: 0 }).format(v)}`

const CartSidebar = ({
  bookingId,
  lines,
  onIncrement,
  onDecrement,
  onRemove,
  onOrderPlaced,
  mobileOpen,
  onMobileClose,
}: Props) => {
  const [instructions, setInstructions] = useState('')
  const [placing, setPlacing] = useState(false)

  const total = lines.reduce((sum, l) => sum + Number(l.item.price) * l.quantity, 0)
  const itemCount = lines.reduce((sum, l) => sum + l.quantity, 0)
  const maxPrep = lines.reduce((m, l) => Math.max(m, l.item.prepMinutes), 0)
  const etaMinutes = maxPrep > 0 ? maxPrep + 15 : 0

  const placeOrder = async () => {
    if (lines.length === 0) return
    setPlacing(true)
    try {
      const res = await api.post('/room-service/orders', {
        bookingId,
        items: lines.map(l => ({ itemId: l.item.id, quantity: l.quantity })),
        instructions: instructions.trim() || undefined,
      })
      toast.success('Order placed')
      onOrderPlaced(res.data.data.id)
      setInstructions('')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to place order'
      toast.error(msg)
    } finally {
      setPlacing(false)
    }
  }

  const content = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <HiOutlineShoppingBag size={18} className="text-foreground" />
          <h2 className="text-foreground font-semibold text-base">Your Cart</h2>
          {itemCount > 0 && (
            <span className="bg-foreground text-foreground-inverse text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
              {itemCount}
            </span>
          )}
        </div>
        <button
          onClick={onMobileClose}
          className="lg:hidden text-foreground-tertiary hover:text-foreground text-xl leading-none"
        >
          ×
        </button>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {lines.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <HiOutlineShoppingBag size={32} className="text-foreground-disabled mb-3" />
            <p className="text-foreground-tertiary text-sm">Your cart is empty</p>
            <p className="text-foreground-tertiary text-xs mt-1">Add items from the menu to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {lines.map(({ item, quantity }) => (
              <div key={item.id} className="flex items-start gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
                <div className="flex-1 min-w-0">
                  <p className="text-foreground text-sm font-medium truncate">{item.name}</p>
                  <p className="text-foreground-tertiary text-xs">{formatNaira(Number(item.price))} each</p>
                  <div className="flex items-center gap-1 mt-2 border border-border rounded-full p-0.5 w-fit">
                    <button
                      onClick={() => onDecrement(item.id)}
                      className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-foreground-disabled/15 text-foreground"
                    >
                      <HiMinus size={11} />
                    </button>
                    <span className="min-w-[20px] text-center text-xs font-semibold tabular-nums">{quantity}</span>
                    <button
                      onClick={() => onIncrement(item.id)}
                      className="w-6 h-6 flex items-center justify-center rounded-full bg-foreground text-foreground-inverse hover:opacity-90"
                    >
                      <HiPlus size={11} />
                    </button>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <p className="text-foreground font-semibold text-sm whitespace-nowrap">
                    {formatNaira(Number(item.price) * quantity)}
                  </p>
                  <button
                    onClick={() => onRemove(item.id)}
                    className="text-foreground-tertiary hover:text-danger p-1"
                    aria-label="Remove item"
                  >
                    <HiOutlineTrash size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Instructions */}
        {lines.length > 0 && (
          <div className="mt-5">
            <label className="text-foreground-tertiary text-[11px] uppercase tracking-wider font-semibold mb-1.5 block">
              Special Instructions (optional)
            </label>
            <textarea
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder="e.g. No onions, allergic to peanuts..."
              className="w-full border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-foreground/20 resize-none"
            />
          </div>
        )}
      </div>

      {/* Footer */}
      {lines.length > 0 && (
        <div className="border-t border-border px-5 py-4 bg-background-secondary flex-shrink-0 space-y-3">
          <div className="flex items-center justify-between text-xs text-foreground-secondary">
            <p className="flex items-center gap-1.5">
              <HiOutlineClock size={12} />
              Estimated delivery
            </p>
            <p className="text-foreground font-medium">~{etaMinutes} min</p>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-foreground-tertiary text-xs uppercase tracking-wider font-semibold">Total</p>
            <p className="text-foreground text-xl font-bold">{formatNaira(total)}</p>
          </div>
          <button
            onClick={placeOrder}
            disabled={placing}
            className="w-full bg-foreground text-foreground-inverse rounded-lg py-3 text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {placing && <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
            {placing ? 'Placing order...' : `Place Order · ${formatNaira(total)}`}
          </button>
        </div>
      )}
    </div>
  )

  return (
    <>
      {/* Desktop — sticky sidebar */}
      <aside className="hidden lg:block sticky top-20 w-80 bg-foreground-inverse border border-border rounded-2xl overflow-hidden h-[calc(100vh-6rem)]">
        {content}
      </aside>

      {/* Mobile — bottom sheet */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-foreground/40" onClick={onMobileClose} />
          <div className="relative w-full bg-foreground-inverse rounded-t-2xl max-h-[85vh] flex flex-col shadow-2xl animate-modal-content">
            {content}
          </div>
        </div>
      )}
    </>
  )
}

export default CartSidebar
