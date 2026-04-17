'use client'
import React, { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import {
  HiOutlinePlus,
  HiOutlinePencil,
  HiOutlineCheck,
  HiOutlineX,
  HiOutlineSearch,
  HiOutlineBan,
} from 'react-icons/hi'

// ── Types ──

interface HotelService {
  id: string
  name: string
  description: string
  price: number | string
  category: string
  image: string | null
  isAvailable: boolean
}

interface ServiceBooking {
  id: string
  scheduledAt: string
  amount: number | string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  notes: string | null
  createdAt: string
  service: { id: string; name: string; category: string }
  booking: { bookingRef: string; room: { number: string } }
  guest: { firstName: string; lastName: string; email: string }
}

// ── Helpers ──

const CATEGORIES = ['FOOD', 'BEVERAGE', 'LAUNDRY', 'SPA', 'TRANSPORT', 'OTHER'] as const
const STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const

const formatNaira = (v: number | string) =>
  `₦${new Intl.NumberFormat('en-NG', { maximumFractionDigits: 0 }).format(Number(v))}`

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-warning-bg text-warning',
  APPROVED: 'bg-success-bg text-success',
  REJECTED: 'bg-danger-bg text-danger',
}

const CAT_COLORS: Record<string, string> = {
  SPA: 'bg-[#F4E8FF] text-[#7C3AED]',
  LAUNDRY: 'bg-[#FAEEDA] text-[#8A6A20]',
  TRANSPORT: 'bg-[#E0F2FE] text-[#0369A1]',
  FOOD: 'bg-[#EAF3DE] text-[#4A6B2E]',
  BEVERAGE: 'bg-[#FEE2E2] text-[#991B1B]',
  OTHER: 'bg-foreground-disabled/15 text-foreground-secondary',
}

// ── Component ──

export default function AdminServicesPage() {
  const [tab, setTab] = useState<'catalog' | 'bookings'>('catalog')

  // Catalog
  const [services, setServices] = useState<HotelService[]>([])
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<HotelService | null>(null)
  const [form, setForm] = useState({ name: '', description: '', price: '', category: 'SPA' as string, image: '' })
  const [saving, setSaving] = useState(false)

  // Bookings
  const [bookings, setBookings] = useState<ServiceBooking[]>([])
  const [bookingsLoading, setBookingsLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [searchQ, setSearchQ] = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  // ── Catalog fetch ──
  const fetchCatalog = useCallback(async () => {
    setCatalogLoading(true)
    try {
      const res = await api.get('/services?all=true')
      setServices(res.data.data.services || [])
    } catch {
      toast.error('Failed to load services')
    } finally {
      setCatalogLoading(false)
    }
  }, [])

  // ── Bookings fetch ──
  const fetchBookings = useCallback(async () => {
    setBookingsLoading(true)
    try {
      const params = new URLSearchParams({ limit: '50' })
      if (dateFilter) params.set('date', dateFilter)
      if (statusFilter) params.set('status', statusFilter)
      const res = await api.get(`/services/bookings?${params}`)
      setBookings(res.data.data.bookings || [])
    } catch {
      toast.error('Failed to load service bookings')
    } finally {
      setBookingsLoading(false)
    }
  }, [dateFilter, statusFilter])

  useEffect(() => {
    fetchCatalog()
  }, [fetchCatalog])

  useEffect(() => {
    if (tab === 'bookings') fetchBookings()
  }, [tab, fetchBookings])

  // ── Catalog actions ──
  const openAdd = () => {
    setEditing(null)
    setForm({ name: '', description: '', price: '', category: 'SPA', image: '' })
    setFormOpen(true)
  }

  const openEdit = (svc: HotelService) => {
    setEditing(svc)
    setForm({
      name: svc.name,
      description: svc.description,
      price: String(svc.price),
      category: svc.category,
      image: svc.image || '',
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
      if (editing) {
        await api.patch(`/services/${editing.id}`, {
          name: form.name,
          description: form.description,
          price: Number(form.price),
          category: form.category,
          image: form.image || null,
        })
        toast.success('Service updated')
      } else {
        await api.post('/services', {
          name: form.name,
          description: form.description,
          price: Number(form.price),
          category: form.category,
          image: form.image || undefined,
        })
        toast.success('Service created')
      }
      setFormOpen(false)
      fetchCatalog()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to save'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const toggleAvailability = async (svc: HotelService) => {
    try {
      await api.patch(`/services/${svc.id}`, { isAvailable: !svc.isAvailable })
      toast.success(svc.isAvailable ? 'Service disabled' : 'Service enabled')
      fetchCatalog()
    } catch {
      toast.error('Failed to toggle')
    }
  }

  // ── Booking actions ──
  const updateStatus = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    setUpdatingId(id)
    try {
      await api.patch(`/services/bookings/${id}/status`, { status })
      toast.success(`Request ${status.toLowerCase()}`)
      fetchBookings()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to update'
      toast.error(msg)
    } finally {
      setUpdatingId(null)
    }
  }

  const filteredBookings = searchQ
    ? bookings.filter(b =>
        b.guest.firstName.toLowerCase().includes(searchQ.toLowerCase()) ||
        b.guest.lastName.toLowerCase().includes(searchQ.toLowerCase()) ||
        b.service.name.toLowerCase().includes(searchQ.toLowerCase()) ||
        b.booking.bookingRef.toLowerCase().includes(searchQ.toLowerCase())
      )
    : bookings

  const fieldClass = 'w-full px-3 py-2.5 bg-foreground-inverse border border-border rounded-lg text-sm text-foreground outline-none focus:border-foreground'

  return (
    <div>
      <h1 className="text-foreground font-heading text-2xl font-bold mb-6">Hotel Services</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-foreground-disabled/10 p-1 rounded-lg w-max mb-6">
        {(['catalog', 'bookings'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === t ? 'bg-foreground text-foreground-inverse' : 'text-foreground-secondary hover:text-foreground'
            }`}
          >
            {t === 'catalog' ? 'Service Catalog' : 'Service Bookings'}
          </button>
        ))}
      </div>

      {/* ═══ Catalog Tab ═══ */}
      {tab === 'catalog' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-foreground-tertiary text-sm">{services.length} services</p>
            <button
              onClick={openAdd}
              className="inline-flex items-center gap-2 bg-foreground text-foreground-inverse px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90"
            >
              <HiOutlinePlus size={16} />
              Add Service
            </button>
          </div>

          {catalogLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map(i => <div key={i} className="h-16 bg-foreground-disabled/10 rounded-xl animate-pulse" />)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-foreground-tertiary text-[11px] uppercase tracking-wider border-b border-border">
                    <th className="py-2 px-2 font-semibold">Service</th>
                    <th className="py-2 px-2 font-semibold">Category</th>
                    <th className="py-2 px-2 font-semibold">Price</th>
                    <th className="py-2 px-2 font-semibold">Status</th>
                    <th className="py-2 px-2 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {services.map(svc => (
                    <tr key={svc.id} className="border-b border-border last:border-0">
                      <td className="py-3 px-2">
                        <p className="text-foreground font-medium">{svc.name}</p>
                        <p className="text-foreground-tertiary text-xs line-clamp-1">{svc.description}</p>
                      </td>
                      <td className="py-3 px-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${CAT_COLORS[svc.category] || CAT_COLORS.OTHER}`}>
                          {svc.category}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-foreground font-medium">{formatNaira(svc.price)}</td>
                      <td className="py-3 px-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${svc.isAvailable ? 'bg-success-bg text-success' : 'bg-danger-bg text-danger'}`}>
                          {svc.isAvailable ? 'ACTIVE' : 'DISABLED'}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => openEdit(svc)} className="p-1.5 text-foreground-tertiary hover:text-foreground" title="Edit">
                            <HiOutlinePencil size={14} />
                          </button>
                          <button
                            onClick={() => toggleAvailability(svc)}
                            className={`p-1.5 ${svc.isAvailable ? 'text-foreground-tertiary hover:text-danger' : 'text-foreground-tertiary hover:text-success'}`}
                            title={svc.isAvailable ? 'Disable' : 'Enable'}
                          >
                            {svc.isAvailable ? <HiOutlineBan size={14} /> : <HiOutlineCheck size={14} />}
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

      {/* ═══ Bookings Tab ═══ */}
      {tab === 'bookings' && (
        <div>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <HiOutlineSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-tertiary" />
              <input
                type="text"
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                placeholder="Search guest, service, ref…"
                className="w-full pl-9 pr-3 py-2 bg-foreground-inverse border border-border rounded-lg text-sm text-foreground outline-none focus:border-foreground"
              />
            </div>
            <input
              type="date"
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              className="px-3 py-2 bg-foreground-inverse border border-border rounded-lg text-sm text-foreground outline-none focus:border-foreground"
            />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-foreground-inverse border border-border rounded-lg text-sm text-foreground outline-none focus:border-foreground"
            >
              <option value="">All statuses</option>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {bookingsLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map(i => <div key={i} className="h-14 bg-foreground-disabled/10 rounded-xl animate-pulse" />)}
            </div>
          ) : filteredBookings.length === 0 ? (
            <p className="text-foreground-tertiary text-sm text-center py-10">No service bookings found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-foreground-tertiary text-[11px] uppercase tracking-wider border-b border-border">
                    <th className="py-2 px-2 font-semibold">Guest</th>
                    <th className="py-2 px-2 font-semibold">Service</th>
                    <th className="py-2 px-2 font-semibold">Scheduled</th>
                    <th className="py-2 px-2 font-semibold">Room</th>
                    <th className="py-2 px-2 font-semibold">Amount</th>
                    <th className="py-2 px-2 font-semibold">Status</th>
                    <th className="py-2 px-2 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBookings.map(sb => (
                    <tr key={sb.id} className="border-b border-border last:border-0">
                      <td className="py-3 px-2">
                        <p className="text-foreground font-medium">{sb.guest.firstName} {sb.guest.lastName}</p>
                        <p className="text-foreground-tertiary text-xs">{sb.guest.email}</p>
                      </td>
                      <td className="py-3 px-2">
                        <p className="text-foreground">{sb.service.name}</p>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${CAT_COLORS[sb.service.category] || CAT_COLORS.OTHER}`}>
                          {sb.service.category}
                        </span>
                      </td>
                      <td className="py-3 px-2 whitespace-nowrap text-foreground-secondary text-xs">
                        {new Date(sb.scheduledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        <br />
                        {new Date(sb.scheduledAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </td>
                      <td className="py-3 px-2 text-foreground">{sb.booking.room.number}</td>
                      <td className="py-3 px-2 text-foreground font-medium">{formatNaira(sb.amount)}</td>
                      <td className="py-3 px-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${STATUS_COLORS[sb.status]}`}>
                          {sb.status}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right">
                        {sb.status === 'PENDING' && (
                          <div className="flex items-center gap-1 justify-end">
                            <button
                              onClick={() => updateStatus(sb.id, 'APPROVED')}
                              disabled={updatingId === sb.id}
                              className="bg-success text-foreground-inverse text-[11px] font-semibold px-2.5 py-1 rounded-md hover:opacity-90 disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => updateStatus(sb.id, 'REJECTED')}
                              disabled={updatingId === sb.id}
                              className="bg-danger text-foreground-inverse text-[11px] font-semibold px-2.5 py-1 rounded-md hover:opacity-90 disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                        {sb.status !== 'PENDING' && (
                          <span className="text-foreground-tertiary text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ═══ Add/Edit Service Modal ═══ */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-foreground/40" onClick={saving ? undefined : () => setFormOpen(false)} />
          <div className="relative w-full max-w-md bg-foreground-inverse rounded-2xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-foreground font-bold text-lg">{editing ? 'Edit Service' : 'Add Service'}</h2>
              <button onClick={() => setFormOpen(false)} disabled={saving} className="p-2 text-foreground-tertiary hover:text-foreground">
                <HiOutlineX size={20} />
              </button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div>
                <label className="text-foreground-tertiary text-[11px] uppercase tracking-wider font-semibold">Name</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={`mt-1.5 ${fieldClass}`} placeholder="e.g. Deep Tissue Massage" />
              </div>
              <div>
                <label className="text-foreground-tertiary text-[11px] uppercase tracking-wider font-semibold">Description</label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} className={`mt-1.5 ${fieldClass} resize-none`} placeholder="What the guest gets…" />
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
