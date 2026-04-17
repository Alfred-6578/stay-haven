'use client'
import React, { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import {
  HiOutlinePlus,
  HiOutlinePencil,
  HiOutlineX,
  HiOutlineCheck,
  HiOutlineBan,
  HiOutlineSearch,
  HiOutlineClock,
} from 'react-icons/hi'

// ── Types ──

interface MenuItem {
  id: string
  name: string
  description: string
  price: number | string
  category: string
  image: string | null
  isAvailable: boolean
  prepMinutes: number
}

interface OrderItemLine {
  itemId: string
  name: string
  price: number
  quantity: number
  subtotal: number
}

interface RoomServiceOrder {
  id: string
  status: 'PENDING' | 'PREPARING' | 'DELIVERED' | 'CANCELLED'
  totalAmount: number
  items: OrderItemLine[]
  instructions: string | null
  estimatedAt: string | null
  deliveredAt: string | null
  createdAt: string
  bookingRef: string
  roomNumber: string
  guestName?: string
  guestEmail?: string
  isSettled: boolean
  settledAt: string | null
  settlementMethod: string | null
  settlementReference: string | null
}

// ── Helpers ──

const CATEGORIES = ['FOOD', 'BEVERAGE', 'LAUNDRY', 'SPA', 'TRANSPORT', 'OTHER'] as const
const ORDER_STATUSES = ['PENDING', 'PREPARING', 'DELIVERED', 'CANCELLED'] as const

const formatNaira = (v: number | string) =>
  `₦${new Intl.NumberFormat('en-NG', { maximumFractionDigits: 0 }).format(Number(v))}`

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-warning-bg text-warning',
  PREPARING: 'bg-[#FAEEDA] text-[#8A6A20]',
  DELIVERED: 'bg-success-bg text-success',
  CANCELLED: 'bg-danger-bg text-danger',
}

const CAT_COLORS: Record<string, string> = {
  FOOD: 'bg-[#EAF3DE] text-[#4A6B2E]',
  BEVERAGE: 'bg-[#FEE2E2] text-[#991B1B]',
  SPA: 'bg-[#F4E8FF] text-[#7C3AED]',
  LAUNDRY: 'bg-[#FAEEDA] text-[#8A6A20]',
  TRANSPORT: 'bg-[#E0F2FE] text-[#0369A1]',
  OTHER: 'bg-foreground-disabled/15 text-foreground-secondary',
}

const TRANSITIONS: Record<string, string[]> = {
  PENDING: ['PREPARING', 'CANCELLED'],
  PREPARING: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
}

// ── Component ──

export default function AdminRoomServicePage() {
  const [tab, setTab] = useState<'menu' | 'orders'>('menu')

  // ═══ Menu state ═══
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [menuLoading, setMenuLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<MenuItem | null>(null)
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    category: 'FOOD' as string,
    image: '',
    prepMinutes: '20',
  })
  const [saving, setSaving] = useState(false)

  // ═══ Orders state ═══
  const [orders, setOrders] = useState<RoomServiceOrder[]>([])
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [searchQ, setSearchQ] = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  // ── Menu fetch (all=true to include disabled) ──
  const fetchMenu = useCallback(async () => {
    setMenuLoading(true)
    try {
      const res = await api.get('/room-service/menu?all=true')
      const grouped = res.data.data as Record<string, MenuItem[]>
      const flat = Object.values(grouped).flat()
      setMenuItems(flat)
    } catch {
      toast.error('Failed to load menu')
    } finally {
      setMenuLoading(false)
    }
  }, [])

  // ── Orders fetch ──
  const fetchOrders = useCallback(async () => {
    setOrdersLoading(true)
    try {
      const params = new URLSearchParams({ limit: '50' })
      if (statusFilter) params.set('status', statusFilter)
      const res = await api.get(`/room-service/orders?${params}`)
      setOrders(res.data.data.orders || [])
    } catch {
      toast.error('Failed to load orders')
    } finally {
      setOrdersLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    fetchMenu()
  }, [fetchMenu])

  useEffect(() => {
    if (tab === 'orders') fetchOrders()
  }, [tab, fetchOrders])

  // ── Menu actions ──
  const openAdd = () => {
    setEditing(null)
    setForm({ name: '', description: '', price: '', category: 'FOOD', image: '', prepMinutes: '20' })
    setFormOpen(true)
  }

  const openEdit = (item: MenuItem) => {
    setEditing(item)
    setForm({
      name: item.name,
      description: item.description,
      price: String(item.price),
      category: item.category,
      image: item.image || '',
      prepMinutes: String(item.prepMinutes),
    })
    setFormOpen(true)
  }

  const handleSave = async () => {
    if (!form.name || !form.description || !form.price || !form.category) {
      toast.error('All fields are required')
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: form.name,
        description: form.description,
        price: Number(form.price),
        category: form.category,
        image: form.image || undefined,
        prepMinutes: Number(form.prepMinutes) || 20,
      }
      if (editing) {
        await api.patch(`/room-service/menu/${editing.id}`, payload)
        toast.success('Menu item updated')
      } else {
        await api.post('/room-service/menu', payload)
        toast.success('Menu item created')
      }
      setFormOpen(false)
      fetchMenu()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to save'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const toggleAvailability = async (item: MenuItem) => {
    try {
      await api.patch(`/room-service/menu/${item.id}`, { isAvailable: !item.isAvailable })
      toast.success(item.isAvailable ? 'Item disabled' : 'Item enabled')
      fetchMenu()
    } catch {
      toast.error('Failed to toggle')
    }
  }

  // ── Order actions ──
  const updateOrderStatus = async (id: string, status: string) => {
    setUpdatingId(id)
    try {
      await api.patch(`/room-service/orders/${id}/status`, { status })
      toast.success(`Order marked as ${status.toLowerCase()}`)
      fetchOrders()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to update'
      toast.error(msg)
    } finally {
      setUpdatingId(null)
    }
  }

  const filteredOrders = searchQ
    ? orders.filter(o =>
        (o.guestName || '').toLowerCase().includes(searchQ.toLowerCase()) ||
        o.roomNumber.includes(searchQ) ||
        o.bookingRef.toLowerCase().includes(searchQ.toLowerCase()) ||
        o.items.some(i => i.name.toLowerCase().includes(searchQ.toLowerCase()))
      )
    : orders

  // ── Stats strip for orders ──
  const pendingCount = orders.filter(o => o.status === 'PENDING').length
  const preparingCount = orders.filter(o => o.status === 'PREPARING').length
  const deliveredCount = orders.filter(o => o.status === 'DELIVERED').length

  const fieldClass = 'w-full px-3 py-2.5 bg-foreground-inverse border border-border rounded-lg text-sm text-foreground outline-none focus:border-foreground'

  return (
    <div>
      <h1 className="text-foreground font-heading text-2xl font-bold mb-6">Room Service</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-foreground-disabled/10 p-1 rounded-lg w-max mb-6">
        {(['menu', 'orders'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === t ? 'bg-foreground text-foreground-inverse' : 'text-foreground-secondary hover:text-foreground'
            }`}
          >
            {t === 'menu' ? 'Menu Catalog' : 'Orders'}
          </button>
        ))}
      </div>

      {/* ═══ Menu Catalog Tab ═══ */}
      {tab === 'menu' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-foreground-tertiary text-sm">{menuItems.length} items</p>
            <button
              onClick={openAdd}
              className="inline-flex items-center gap-2 bg-foreground text-foreground-inverse px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90"
            >
              <HiOutlinePlus size={16} />
              Add Item
            </button>
          </div>

          {menuLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map(i => <div key={i} className="h-16 bg-foreground-disabled/10 rounded-xl animate-pulse" />)}
            </div>
          ) : menuItems.length === 0 ? (
            <p className="text-foreground-tertiary text-sm text-center py-10">No menu items yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-foreground-tertiary text-[11px] uppercase tracking-wider border-b border-border">
                    <th className="py-2 px-2 font-semibold">Item</th>
                    <th className="py-2 px-2 font-semibold">Category</th>
                    <th className="py-2 px-2 font-semibold">Price</th>
                    <th className="py-2 px-2 font-semibold max-md:hidden">Prep</th>
                    <th className="py-2 px-2 font-semibold">Status</th>
                    <th className="py-2 px-2 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {menuItems.map(item => (
                    <tr key={item.id} className="border-b border-border last:border-0">
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-3">
                          {item.image && (
                            <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0">
                              <Image src={item.image} alt={item.name} fill className="object-cover" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-foreground font-medium">{item.name}</p>
                            <p className="text-foreground-tertiary text-xs line-clamp-1">{item.description}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${CAT_COLORS[item.category] || CAT_COLORS.OTHER}`}>
                          {item.category}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-foreground font-medium">{formatNaira(item.price)}</td>
                      <td className="py-3 px-2 text-foreground-tertiary text-xs max-md:hidden">
                        <span className="flex items-center gap-1"><HiOutlineClock size={11} />{item.prepMinutes}m</span>
                      </td>
                      <td className="py-3 px-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.isAvailable ? 'bg-success-bg text-success' : 'bg-danger-bg text-danger'}`}>
                          {item.isAvailable ? 'ACTIVE' : 'DISABLED'}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => openEdit(item)} className="p-1.5 text-foreground-tertiary hover:text-foreground" title="Edit">
                            <HiOutlinePencil size={14} />
                          </button>
                          <button
                            onClick={() => toggleAvailability(item)}
                            className={`p-1.5 ${item.isAvailable ? 'text-foreground-tertiary hover:text-danger' : 'text-foreground-tertiary hover:text-success'}`}
                            title={item.isAvailable ? 'Disable' : 'Enable'}
                          >
                            {item.isAvailable ? <HiOutlineBan size={14} /> : <HiOutlineCheck size={14} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ═══ Orders Tab ═══ */}
      {tab === 'orders' && (
        <div>
          {/* Stats strip */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-warning-bg/50 rounded-xl px-4 py-3">
              <p className="text-warning text-[11px] uppercase tracking-wider font-semibold">Pending</p>
              <p className="text-foreground text-2xl font-bold">{pendingCount}</p>
            </div>
            <div className="bg-[#FAEEDA]/50 rounded-xl px-4 py-3">
              <p className="text-[#8A6A20] text-[11px] uppercase tracking-wider font-semibold">Preparing</p>
              <p className="text-foreground text-2xl font-bold">{preparingCount}</p>
            </div>
            <div className="bg-success-bg/50 rounded-xl px-4 py-3">
              <p className="text-success text-[11px] uppercase tracking-wider font-semibold">Delivered</p>
              <p className="text-foreground text-2xl font-bold">{deliveredCount}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <HiOutlineSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-tertiary" />
              <input
                type="text"
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                placeholder="Search guest, room, item…"
                className="w-full pl-9 pr-3 py-2 bg-foreground-inverse border border-border rounded-lg text-sm text-foreground outline-none focus:border-foreground"
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-foreground-inverse border border-border rounded-lg text-sm text-foreground outline-none focus:border-foreground"
            >
              <option value="">All statuses</option>
              {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button
              onClick={fetchOrders}
              className="text-foreground-tertiary text-xs hover:text-foreground"
            >
              Refresh
            </button>
          </div>

          {ordersLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map(i => <div key={i} className="h-20 bg-foreground-disabled/10 rounded-xl animate-pulse" />)}
            </div>
          ) : filteredOrders.length === 0 ? (
            <p className="text-foreground-tertiary text-sm text-center py-10">No orders found.</p>
          ) : (
            <div className="space-y-3">
              {filteredOrders.map(order => {
                const actions = TRANSITIONS[order.status] || []
                return (
                  <div key={order.id} className="border border-border rounded-2xl p-4 bg-foreground-inverse">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-foreground font-semibold text-sm">
                            Room {order.roomNumber}
                          </p>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${STATUS_COLORS[order.status]}`}>
                            {order.status}
                          </span>
                        </div>
                        {order.guestName && (
                          <p className="text-foreground-tertiary text-xs">{order.guestName} · {order.bookingRef}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-foreground font-bold text-sm">{formatNaira(order.totalAmount)}</p>
                        <p className="text-foreground-tertiary text-[10px]">
                          {new Date(order.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>

                    {/* Items list */}
                    <div className="bg-foreground-disabled/5 rounded-lg px-3 py-2 mb-2">
                      <ul className="space-y-0.5">
                        {order.items.map((item, idx) => (
                          <li key={idx} className="flex justify-between text-xs">
                            <span className="text-foreground">{item.quantity}× {item.name}</span>
                            <span className="text-foreground-tertiary">{formatNaira(item.subtotal)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {order.instructions && (
                      <p className="text-foreground-tertiary text-xs italic mb-2">Note: {order.instructions}</p>
                    )}

                    {/* Settlement info */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${order.isSettled ? 'bg-success-bg text-success' : 'bg-foreground-disabled/15 text-foreground-tertiary'}`}>
                        {order.isSettled ? 'Settled' : 'Unsettled'}
                      </span>
                      {order.isSettled && order.settlementMethod && (
                        <span className="text-foreground-tertiary text-[10px]">
                          via {order.settlementMethod}
                          {order.settlementReference ? ` · ${order.settlementReference}` : ''}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-[11px] text-foreground-tertiary">
                        {order.estimatedAt && (
                          <span className="flex items-center gap-1">
                            <HiOutlineClock size={11} />
                            ETA {new Date(order.estimatedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          </span>
                        )}
                        {order.deliveredAt && (
                          <span className="text-success">
                            Delivered {new Date(order.deliveredAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          </span>
                        )}
                      </div>

                      {actions.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          {actions.map(status => {
                            const isPositive = status === 'PREPARING' || status === 'DELIVERED'
                            return (
                              <button
                                key={status}
                                onClick={() => updateOrderStatus(order.id, status)}
                                disabled={updatingId === order.id}
                                className={`text-[11px] font-semibold px-2.5 py-1 rounded-md disabled:opacity-50 ${
                                  isPositive
                                    ? 'bg-foreground text-foreground-inverse hover:opacity-90'
                                    : 'bg-danger text-foreground-inverse hover:opacity-90'
                                }`}
                              >
                                {status === 'PREPARING' ? 'Start Preparing' : status === 'DELIVERED' ? 'Mark Delivered' : 'Cancel'}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══ Add/Edit Menu Item Modal ═══ */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-foreground/40" onClick={saving ? undefined : () => setFormOpen(false)} />
          <div className="relative w-full max-w-md bg-foreground-inverse rounded-2xl shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-foreground font-bold text-lg">{editing ? 'Edit Menu Item' : 'Add Menu Item'}</h2>
              <button onClick={() => setFormOpen(false)} disabled={saving} className="p-2 text-foreground-tertiary hover:text-foreground">
                <HiOutlineX size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              <div>
                <label className="text-foreground-tertiary text-[11px] uppercase tracking-wider font-semibold">Name</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={`mt-1.5 ${fieldClass}`} placeholder="e.g. Jollof Rice" />
              </div>
              <div>
                <label className="text-foreground-tertiary text-[11px] uppercase tracking-wider font-semibold">Description</label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} className={`mt-1.5 ${fieldClass} resize-none`} placeholder="Nigerian party rice with grilled chicken…" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-foreground-tertiary text-[11px] uppercase tracking-wider font-semibold">Price (₦)</label>
                  <input type="number" min="0" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} className={`mt-1.5 ${fieldClass}`} />
                </div>
                <div>
                  <label className="text-foreground-tertiary text-[11px] uppercase tracking-wider font-semibold">Category</label>
                  <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className={`mt-1.5 ${fieldClass}`}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-foreground-tertiary text-[11px] uppercase tracking-wider font-semibold">Prep Time (minutes)</label>
                <input type="number" min="1" max="240" value={form.prepMinutes} onChange={e => setForm(p => ({ ...p, prepMinutes: e.target.value }))} className={`mt-1.5 ${fieldClass}`} />
              </div>
              <div>
                <label className="text-foreground-tertiary text-[11px] uppercase tracking-wider font-semibold">Image URL <span className="normal-case text-foreground-tertiary">(optional)</span></label>
                <input value={form.image} onChange={e => setForm(p => ({ ...p, image: e.target.value }))} className={`mt-1.5 ${fieldClass}`} placeholder="https://…" />
              </div>
            </div>
            <div className="flex gap-2 px-5 py-4 border-t border-border">
              <button onClick={() => setFormOpen(false)} disabled={saving} className="flex-1 border border-border rounded-lg py-2.5 text-sm text-foreground hover:bg-foreground-disabled/5">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving} className="flex-1 bg-foreground text-foreground-inverse rounded-lg py-2.5 text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                {saving && <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                {saving ? 'Saving…' : editing ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
