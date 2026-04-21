'use client'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'
import { HiOutlineSearch, HiOutlineChevronLeft, HiOutlineChevronRight, HiOutlineUsers } from 'react-icons/hi'
import LoyaltyTierBadge from '@/component/guest/LoyaltyTierBadge'
import GuestDetailDrawer from '@/component/admin/GuestDetailDrawer'
import EmptyState from '@/component/ui/EmptyState'
import ErrorState from '@/component/ui/ErrorState'
import { TableRowSkeleton } from '@/component/ui/PageSkeleton'

interface GuestRow {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  avatar: string | null
  createdAt: string
  guestProfile: {
    loyaltyTier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM'
    totalStays: number
    totalSpend: number | string
  } | null
  lastBooking: {
    id: string
    bookingRef: string
    status: string
    checkIn: string
    checkOut: string
  } | null
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

const TIERS = ['', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM'] as const
const TIER_LABELS: Record<string, string> = {
  '': 'All Tiers',
  BRONZE: 'Bronze',
  SILVER: 'Silver',
  GOLD: 'Gold',
  PLATINUM: 'Platinum',
}

const formatNaira = (v: number | string) =>
  `₦${new Intl.NumberFormat('en-NG', { maximumFractionDigits: 0 }).format(Number(v))}`

export default function AdminGuestsPage() {
  const [search, setSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const [tier, setTier] = useState('')
  const [page, setPage] = useState(1)

  const [rows, setRows] = useState<GuestRow[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const debounceRef = useRef<NodeJS.Timeout | null>(null)

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

  const fetchGuests = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '15' })
      if (searchDebounced) params.set('q', searchDebounced)
      if (tier) params.set('loyaltyTier', tier)

      const res = await api.get(`/admin/guests?${params.toString()}`)
      setRows(res.data.data.guests || [])
      setPagination(res.data.data.pagination || null)
    } catch {
      setRows([])
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [page, searchDebounced, tier])

  useEffect(() => { fetchGuests() }, [fetchGuests])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-foreground font-heading text-xl sm:text-2xl font-bold">Guests</h1>
        <p className="text-foreground-tertiary text-sm">View all registered guests and award loyalty points</p>
      </div>

      {/* Search + tier filter */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <HiOutlineSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-tertiary" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, or phone..."
            className="w-full border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-foreground/20 bg-foreground-inverse"
          />
        </div>
        <div className="flex gap-1 bg-foreground-disabled/10 p-1 rounded-lg overflow-x-auto">
          {TIERS.map(t => (
            <button
              key={t || 'all'}
              onClick={() => { setTier(t); setPage(1) }}
              disabled={loading}
              className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-60 ${
                tier === t ? 'bg-foreground-inverse text-foreground shadow-sm' : 'text-foreground-secondary'
              }`}
            >
              {TIER_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-foreground-inverse border border-border rounded-2xl overflow-hidden">
        {loading ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody>
                {[0, 1, 2, 3, 4].map(i => <TableRowSkeleton key={i} columns={7} />)}
              </tbody>
            </table>
          </div>
        ) : error ? (
          <ErrorState
            title="Couldn't load guests"
            description="We had trouble fetching the guest list. Please try again."
            onRetry={fetchGuests}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<HiOutlineUsers />}
            title={searchDebounced || tier ? 'No guests match these filters' : 'No guests yet'}
            description={searchDebounced || tier
              ? 'Try adjusting your search or tier filter to see more.'
              : 'Registered guests will appear here as they sign up.'}
            {...(searchDebounced || tier ? { actionLabel: 'Clear Filters', onAction: () => { setSearch(''); setTier(''); setPage(1) } } : {})}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-foreground-tertiary text-[11px] uppercase tracking-wider border-b border-border bg-foreground-disabled/[0.03]">
                  <th className="py-3 px-4 font-semibold">Guest</th>
                  <th className="py-3 px-4 font-semibold max-md:hidden">Phone</th>
                  <th className="py-3 px-4 font-semibold">Tier</th>
                  <th className="py-3 px-4 font-semibold">Stays</th>
                  <th className="py-3 px-4 font-semibold">Total Spend</th>
                  <th className="py-3 px-4 font-semibold max-lg:hidden">Joined</th>
                  <th className="py-3 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(g => (
                  <tr key={g.id} className="border-b border-border last:border-0 hover:bg-foreground-disabled/[0.02]">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-foreground-disabled/15 flex items-center justify-center text-foreground font-semibold text-xs shrink-0">
                          {g.firstName.charAt(0)}{g.lastName.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-foreground font-medium">{g.firstName} {g.lastName}</p>
                          <p className="text-foreground-tertiary text-xs truncate max-w-[220px]">{g.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-foreground-secondary max-md:hidden text-xs">{g.phone || '—'}</td>
                    <td className="py-3 px-4">
                      {g.guestProfile ? (
                        <LoyaltyTierBadge tier={g.guestProfile.loyaltyTier} />
                      ) : '—'}
                    </td>
                    <td className="py-3 px-4 text-foreground">{g.guestProfile?.totalStays ?? 0}</td>
                    <td className="py-3 px-4 text-foreground font-medium whitespace-nowrap">
                      {formatNaira(g.guestProfile?.totalSpend ?? 0)}
                    </td>
                    <td className="py-3 px-4 text-foreground-tertiary text-xs max-lg:hidden">
                      {new Date(g.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedId(g.id)}
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

      <GuestDetailDrawer
        guestId={selectedId}
        onClose={() => setSelectedId(null)}
        onChanged={fetchGuests}
      />
    </div>
  )
}
