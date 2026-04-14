'use client'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'
import { HiOutlineSearch, HiOutlineChevronLeft, HiOutlineChevronRight } from 'react-icons/hi'
import BookingDetailDrawer from '@/component/admin/BookingDetailDrawer'

interface BookingRow {
  id: string
  bookingRef: string
  status: string
  checkIn: string
  checkOut: string
  totalNights: number
  totalAmount: number | string
  guest: { firstName: string; lastName: string; email: string }
  room: { number: string; roomType: { name: string } }
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

const STATUS_TABS = [
  { key: '', label: 'All' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'CONFIRMED', label: 'Confirmed' },
  { key: 'CHECKED_IN', label: 'Checked In' },
  { key: 'CHECKED_OUT', label: 'Checked Out' },
  { key: 'CANCELLED', label: 'Cancelled' },
]

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: 'bg-success-bg text-success',
  CHECKED_IN: 'bg-[#EAF3DE] text-[#4A6B2E]',
  CHECKED_OUT: 'bg-foreground-disabled/15 text-foreground-secondary',
  PENDING: 'bg-warning-bg text-warning',
  CANCELLED: 'bg-danger-bg text-danger',
  NO_SHOW: 'bg-danger-bg text-danger',
}

const formatNaira = (v: number | string) =>
  `₦${new Intl.NumberFormat('en-NG', { maximumFractionDigits: 0 }).format(Number(v))}`

export default function AdminBookingsPage() {
  const [search, setSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const [status, setStatus] = useState('')
  const [checkInFrom, setCheckInFrom] = useState('')
  const [checkInTo, setCheckInTo] = useState('')
  const [page, setPage] = useState(1)

  const [rows, setRows] = useState<BookingRow[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // Debounce search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setSearchDebounced(search.trim())
      setPage(1)
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [search])

  const fetchBookings = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '15',
      })
      if (searchDebounced) params.set('search', searchDebounced)
      if (status) params.set('status', status)
      if (checkInFrom) params.set('checkIn', checkInFrom)
      if (checkInTo) params.set('checkOut', checkInTo)

      const res = await api.get(`/admin/bookings?${params.toString()}`)
      setRows(res.data.data.bookings || [])
      setPagination(res.data.data.pagination || null)
    } catch {
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [page, searchDebounced, status, checkInFrom, checkInTo])

  useEffect(() => { fetchBookings() }, [fetchBookings])

  const clearDates = () => {
    setCheckInFrom('')
    setCheckInTo('')
    setPage(1)
  }

  const hasFilters = searchDebounced || status || checkInFrom || checkInTo

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-foreground font-heading text-2xl font-bold">Bookings</h1>
        <p className="text-foreground-tertiary text-sm">Search, filter, and manage all reservations</p>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <HiOutlineSearch size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground-tertiary" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by guest name, email, or booking ref..."
          className="w-full border border-border rounded-xl pl-11 pr-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-foreground/20 bg-foreground-inverse"
        />
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-border mb-4 -mx-5 vsm:-mx-8 px-5 vsm:px-8">
        {STATUS_TABS.map(t => {
          const active = status === t.key
          return (
            <button
              key={t.key || 'all'}
              onClick={() => { setStatus(t.key); setPage(1) }}
              className={`px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                active ? 'border-[#D97706] text-foreground' : 'border-transparent text-foreground-tertiary hover:text-foreground'
              }`}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Date range */}
      <div className="flex items-end gap-2 flex-wrap mb-4">
        <div className="flex flex-col">
          <label className="text-foreground-tertiary text-[10px] uppercase tracking-wider font-semibold mb-1">Check-in from</label>
          <input
            type="date"
            value={checkInFrom}
            onChange={e => { setCheckInFrom(e.target.value); setPage(1) }}
            className="border border-border rounded-lg px-3 py-1.5 text-xs text-foreground outline-none focus:ring-2 focus:ring-foreground/20 bg-foreground-inverse"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-foreground-tertiary text-[10px] uppercase tracking-wider font-semibold mb-1">to</label>
          <input
            type="date"
            value={checkInTo}
            onChange={e => { setCheckInTo(e.target.value); setPage(1) }}
            className="border border-border rounded-lg px-3 py-1.5 text-xs text-foreground outline-none focus:ring-2 focus:ring-foreground/20 bg-foreground-inverse"
          />
        </div>
        {(checkInFrom || checkInTo) && (
          <button
            onClick={clearDates}
            className="text-foreground-tertiary text-xs hover:text-foreground underline mb-1.5"
          >
            Clear dates
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-foreground-inverse border border-border rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-8">
            <div className="h-64 bg-foreground-disabled/10 rounded-lg animate-pulse" />
          </div>
        ) : rows.length === 0 ? (
          <div className="p-16 text-center">
            <p className="text-foreground-tertiary text-sm">
              {hasFilters ? 'No bookings match these filters' : 'No bookings yet'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-foreground-tertiary text-[11px] uppercase tracking-wider border-b border-border bg-foreground-disabled/[0.03]">
                  <th className="py-3 px-4 font-semibold">Ref</th>
                  <th className="py-3 px-4 font-semibold">Guest</th>
                  <th className="py-3 px-4 font-semibold max-md:hidden">Room</th>
                  <th className="py-3 px-4 font-semibold max-lg:hidden">Type</th>
                  <th className="py-3 px-4 font-semibold">Check-in</th>
                  <th className="py-3 px-4 font-semibold max-md:hidden">Check-out</th>
                  <th className="py-3 px-4 font-semibold max-lg:hidden">Nights</th>
                  <th className="py-3 px-4 font-semibold">Amount</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(b => (
                  <tr key={b.id} className="border-b border-border last:border-0 hover:bg-foreground-disabled/[0.02]">
                    <td className="py-3 px-4 text-foreground font-mono text-xs">{b.bookingRef}</td>
                    <td className="py-3 px-4">
                      <p className="text-foreground font-medium">{b.guest.firstName} {b.guest.lastName}</p>
                      <p className="text-foreground-tertiary text-xs truncate max-w-[200px]">{b.guest.email}</p>
                    </td>
                    <td className="py-3 px-4 text-foreground max-md:hidden">{b.room.number}</td>
                    <td className="py-3 px-4 text-foreground-secondary max-lg:hidden">{b.room.roomType.name}</td>
                    <td className="py-3 px-4 text-foreground-tertiary text-xs">
                      {new Date(b.checkIn).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </td>
                    <td className="py-3 px-4 text-foreground-tertiary text-xs max-md:hidden">
                      {new Date(b.checkOut).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </td>
                    <td className="py-3 px-4 text-foreground max-lg:hidden">{b.totalNights}</td>
                    <td className="py-3 px-4 text-foreground font-medium whitespace-nowrap">{formatNaira(b.totalAmount)}</td>
                    <td className="py-3 px-4">
                      <span className={`${STATUS_COLORS[b.status] || 'bg-foreground-disabled/15 text-foreground-secondary'} text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider whitespace-nowrap`}>
                        {b.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedId(b.id)}
                        className="text-foreground text-xs font-medium hover:underline"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-background-secondary">
            <p className="text-foreground-tertiary text-xs">
              Page {pagination.page} of {pagination.totalPages} · {pagination.total} total
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={pagination.page <= 1}
                className="flex items-center gap-1 border border-border rounded-lg px-3 py-1.5 text-xs text-foreground hover:bg-foreground-disabled/5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <HiOutlineChevronLeft size={14} />
                Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                disabled={pagination.page >= pagination.totalPages}
                className="flex items-center gap-1 border border-border rounded-lg px-3 py-1.5 text-xs text-foreground hover:bg-foreground-disabled/5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
                <HiOutlineChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      <BookingDetailDrawer
        bookingId={selectedId}
        onClose={() => setSelectedId(null)}
        onChanged={fetchBookings}
      />
    </div>
  )
}
