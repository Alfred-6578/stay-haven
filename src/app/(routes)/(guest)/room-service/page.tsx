'use client'
import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { HiOutlineShoppingBag, HiOutlineLockClosed } from 'react-icons/hi'
import MenuItemCard, { MenuItem } from '@/component/room-service/MenuItemCard'
import CartSidebar, { CartLine } from '@/component/room-service/CartSidebar'
import OrderConfirmationCard from '@/component/room-service/OrderConfirmationCard'
import ActiveOrdersSection from '@/component/room-service/ActiveOrdersSection'

type Grouped = Record<string, MenuItem[]>

export default function RoomServicePage() {
  const [menu, setMenu] = useState<Grouped>({})
  const [menuLoading, setMenuLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<string>('ALL')

  const [activeBookingId, setActiveBookingId] = useState<string | null>(null)
  const [eligibilityLoading, setEligibilityLoading] = useState(true)

  const [cart, setCart] = useState<CartLine[]>([])
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null)
  const [cartMobileOpen, setCartMobileOpen] = useState(false)

  // Load eligibility + menu
  useEffect(() => {
    let cancelled = false

    const loadAll = async () => {
      try {
        const [bookingsRes, menuRes] = await Promise.all([
          api.get('/guest/bookings?limit=5&status=CHECKED_IN'),
          api.get('/room-service/menu'),
        ])
        if (cancelled) return

        const upcoming = bookingsRes.data.data.upcoming || []
        const past = bookingsRes.data.data.past || []
        const checkedIn = [...upcoming, ...past].find(
          (b: { status: string }) => b.status === 'CHECKED_IN'
        )
        setActiveBookingId(checkedIn?.id || null)
        setMenu(menuRes.data.data || {})
      } catch {
        if (!cancelled) setMenu({})
      } finally {
        if (!cancelled) {
          setMenuLoading(false)
          setEligibilityLoading(false)
        }
      }
    }

    loadAll()
    return () => { cancelled = true }
  }, [])

  const categories = useMemo(() => Object.keys(menu).sort(), [menu])

  const visibleItems = useMemo(() => {
    if (activeCategory === 'ALL') {
      return categories.flatMap(cat => menu[cat] || [])
    }
    return menu[activeCategory] || []
  }, [activeCategory, categories, menu])

  const quantityFor = (itemId: string) =>
    cart.find(l => l.item.id === itemId)?.quantity || 0

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(l => l.item.id === item.id)
      if (existing) {
        return prev.map(l => (l.item.id === item.id ? { ...l, quantity: l.quantity + 1 } : l))
      }
      return [...prev, { item, quantity: 1 }]
    })
  }

  const increment = (itemId: string) => {
    setCart(prev => prev.map(l => (l.item.id === itemId ? { ...l, quantity: l.quantity + 1 } : l)))
  }

  const decrement = (itemId: string) => {
    setCart(prev => {
      return prev
        .map(l => (l.item.id === itemId ? { ...l, quantity: l.quantity - 1 } : l))
        .filter(l => l.quantity > 0)
    })
  }

  const remove = (itemId: string) => {
    setCart(prev => prev.filter(l => l.item.id !== itemId))
  }

  const cartItemCount = cart.reduce((s, l) => s + l.quantity, 0)

  // Gate 1: loading eligibility
  if (eligibilityLoading) {
    return (
      <div>
        <div className="h-8 w-48 bg-foreground-disabled/15 rounded mb-6 animate-pulse" />
        <div className="grid vsm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2, 3, 4, 5].map(i => <div key={i} className="h-64 bg-foreground-disabled/10 rounded-2xl animate-pulse" />)}
        </div>
      </div>
    )
  }

  // Gate 2: not checked in
  if (!activeBookingId) {
    return (
      <div>
        <h1 className="text-foreground font-heading text-2xl font-bold mb-6">Room Service</h1>
        <div className="bg-foreground-inverse border border-border rounded-2xl p-10 text-center max-w-xl mx-auto">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-foreground-disabled/10 flex items-center justify-center">
            <HiOutlineLockClosed size={24} className="text-foreground-tertiary" />
          </div>
          <h2 className="text-foreground font-semibold text-base mb-1">Not available right now</h2>
          <p className="text-foreground-secondary text-sm max-w-sm mx-auto mb-5">
            Room service is only available during your stay. It&apos;ll unlock automatically after you check in.
          </p>
          <Link
            href="/bookings"
            className="inline-flex items-center gap-2 bg-foreground text-foreground-inverse rounded-lg px-4 py-2 text-sm font-semibold hover:opacity-90"
          >
            View My Bookings
          </Link>
        </div>
      </div>
    )
  }

  // Order placed → show confirmation
  if (placedOrderId) {
    return (
      <div className="max-w-xl mx-auto">
        <OrderConfirmationCard
          orderId={placedOrderId}
          onBackToMenu={() => {
            setPlacedOrderId(null)
            setCart([])
          }}
        />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3 flex-wrap mb-6">
        <div>
          <h1 className="text-foreground font-heading text-2xl font-bold">Room Service</h1>
          <p className="text-foreground-tertiary text-sm">Order food and drinks directly to your room</p>
        </div>
        {/* Mobile cart button */}
        <button
          onClick={() => setCartMobileOpen(true)}
          className="lg:hidden relative flex items-center gap-2 bg-foreground text-foreground-inverse rounded-lg px-4 py-2 text-sm font-semibold"
        >
          <HiOutlineShoppingBag size={16} />
          Cart
          {cartItemCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-danger text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {cartItemCount}
            </span>
          )}
        </button>
      </div>

      <div className="flex gap-6">
        {/* Left: menu */}
        <div className="flex-1 min-w-0">
          {/* Active orders */}
          <ActiveOrdersSection />

          {/* Category tabs */}
          <div className="flex gap-1 overflow-x-auto border-b border-border mb-5 -mx-5 vsm:-mx-8 px-5 vsm:px-8">
            {['ALL', ...categories].map(cat => {
              const active = activeCategory === cat
              const count = cat === 'ALL'
                ? categories.reduce((s, c) => s + (menu[c]?.length || 0), 0)
                : (menu[cat]?.length || 0)
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                    active ? 'border-foreground text-foreground' : 'border-transparent text-foreground-tertiary hover:text-foreground'
                  }`}
                >
                  {cat} <span className="text-foreground-tertiary text-xs">({count})</span>
                </button>
              )
            })}
          </div>

          {/* Grid */}
          {menuLoading ? (
            <div className="grid vsm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[0, 1, 2, 3, 4, 5].map(i => <div key={i} className="h-64 bg-foreground-disabled/10 rounded-2xl animate-pulse" />)}
            </div>
          ) : visibleItems.length === 0 ? (
            <p className="text-foreground-tertiary text-sm text-center py-12">No items in this category</p>
          ) : (
            <div className="grid vsm:grid-cols-2 lg:grid-cols-3 gap-4">
              {visibleItems.map(item => (
                <MenuItemCard
                  key={item.id}
                  item={item}
                  quantity={quantityFor(item.id)}
                  onAdd={() => addToCart(item)}
                  onIncrement={() => increment(item.id)}
                  onDecrement={() => decrement(item.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right: cart */}
        <CartSidebar
          bookingId={activeBookingId}
          lines={cart}
          onIncrement={increment}
          onDecrement={decrement}
          onRemove={remove}
          onOrderPlaced={(id) => {
            setPlacedOrderId(id)
            setCartMobileOpen(false)
          }}
          mobileOpen={cartMobileOpen}
          onMobileClose={() => setCartMobileOpen(false)}
        />
      </div>
    </div>
  )
}
