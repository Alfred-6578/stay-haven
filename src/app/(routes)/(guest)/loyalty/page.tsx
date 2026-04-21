'use client'
import React, { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import LoyaltyTierBadge from '@/component/guest/LoyaltyTierBadge'
import LoyaltyProgressRing from '@/component/guest/LoyaltyProgressRing'
import EmptyState from '@/component/ui/EmptyState'
import ErrorState from '@/component/ui/ErrorState'
import { SkeletonBar, TableRowSkeleton } from '@/component/ui/PageSkeleton'
import {
  HiOutlineStar,
  HiOutlineArrowUp,
  HiOutlineArrowDown,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
} from 'react-icons/hi'

// ── Types ──

interface Transaction {
  id: string
  points: number
  type: string
  description: string
  bookingRef: string | null
  createdAt: string
}

interface LoyaltyData {
  tier: string
  totalPoints: number
  lifetimePoints: number
  pointsValue: number
  nextTier: { name: string; pointsNeeded: number; pointsAway: number; isMax: boolean }
  tierProgress: number
  totalStays: number
  totalSpend: string | number
}

// ── Constants ──

const formatNaira = (v: number) =>
  `₦${new Intl.NumberFormat('en-NG', { maximumFractionDigits: 0 }).format(v)}`

const tierBenefits: Record<string, string[]> = {
  BRONZE: ['Earn 3 pts per ₦1,000 spent (3% return)', 'Access to member rates', 'Birthday bonus points'],
  SILVER: ['Earn 3.5 pts per ₦1,000 spent (3.5% return)', 'Priority check-in', 'Free room upgrade (subject to availability)'],
  GOLD: ['Earn 4 pts per ₦1,000 spent (4% return)', 'Late checkout', 'Complimentary breakfast', 'Lounge access'],
  PLATINUM: ['Earn 5 pts per ₦1,000 spent (5% return)', 'Suite upgrades', 'Personal concierge', 'Airport transfers'],
}

const ALL_TIERS = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'] as const
const TIER_THRESHOLDS: Record<string, number> = { BRONZE: 0, SILVER: 500, GOLD: 1500, PLATINUM: 5000 }

// ── Component ──

export default function LoyaltyPage() {
  const [data, setData] = useState<LoyaltyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  // Paginated transactions
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [txPage, setTxPage] = useState(1)
  const [txTotal, setTxTotal] = useState(0)
  const [txLoading, setTxLoading] = useState(false)
  const txLimit = 15
  const txTotalPages = Math.ceil(txTotal / txLimit)

  const loadLoyalty = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const res = await api.get('/guest/loyalty')
      setData(res.data.data)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadLoyalty() }, [loadLoyalty])

  const fetchTransactions = useCallback(async (page: number) => {
    setTxLoading(true)
    try {
      const res = await api.get(`/loyalty/transactions?page=${page}&limit=${txLimit}`)
      setTransactions(res.data.data.transactions || [])
      setTxTotal(res.data.data.pagination?.total || 0)
    } catch {}
    setTxLoading(false)
  }, [])

  useEffect(() => {
    fetchTransactions(txPage)
  }, [txPage, fetchTransactions])

  if (loading) {
    return (
      <div>
        <SkeletonBar className="h-8 w-40 mb-6" />
        <SkeletonBar className="h-44 sm:h-48 rounded-2xl mb-6" />
        <div className="grid lg:grid-cols-3 gap-6">
          <SkeletonBar className="h-72 rounded-2xl" />
          <SkeletonBar className="h-72 rounded-2xl lg:col-span-2" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <ErrorState
        title="Couldn't load your loyalty"
        description="We had trouble fetching your points and tier. Please try again."
        onRetry={loadLoyalty}
      />
    )
  }

  if (!data) return null

  return (
    <div>
      <h1 className="text-foreground font-heading text-2xl font-bold mb-6">Loyalty Program</h1>

      {/* ── Hero Card ── */}
      <div className="bg-foreground rounded-2xl p-6 vsm:p-8 mb-6">
        <div className="flex flex-col sm:flex-row items-center gap-8">
          {/* Progress ring */}
          <LoyaltyProgressRing
            percentage={data.tierProgress}
            tier={data.tier}
            size={140}
          />

          <div className="text-center sm:text-left flex-1">
            <LoyaltyTierBadge tier={data.tier} size="md" />
            <div className="flex items-baseline gap-2 mt-3 justify-center sm:justify-start">
              <span className="text-foreground-inverse text-4xl font-bold">
                {data.totalPoints.toLocaleString()}
              </span>
              <span className="text-foreground-inverse/50 text-sm">points</span>
            </div>
            <p className="text-foreground-inverse/50 text-sm mt-1">
              Worth {formatNaira(data.pointsValue)} &middot; {data.lifetimePoints.toLocaleString()} lifetime
            </p>
            {!data.nextTier.isMax && (
              <p className="text-foreground-inverse/40 text-xs mt-2">
                {data.nextTier.pointsAway.toLocaleString()} points to {data.nextTier.name}
              </p>
            )}
          </div>

          {/* Quick stats */}
          <div className="flex sm:flex-col gap-6 sm:gap-4 text-center">
            <div>
              <p className="text-foreground-inverse text-2xl font-bold">{data.totalStays}</p>
              <p className="text-foreground-inverse/50 text-xs">Total Stays</p>
            </div>
            <div>
              <p className="text-foreground-inverse text-2xl font-bold">{formatNaira(Number(data.totalSpend))}</p>
              <p className="text-foreground-inverse/50 text-xs">Total Spend</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* ── Tier Benefits ── */}
        <div className="border border-border rounded-2xl p-5 vsm:p-6">
          <h2 className="text-foreground font-semibold text-sm mb-4 flex items-center gap-2">
            <HiOutlineStar size={16} />
            Tier Benefits
          </h2>
          <div className="space-y-5">
            {ALL_TIERS.map(tier => {
              const isActive = tier === data.tier
              return (
                <div
                  key={tier}
                  className={`rounded-xl p-3 transition-colors ${
                    isActive ? 'bg-foreground-disabled/10 border border-foreground/10' : ''
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <LoyaltyTierBadge tier={tier} />
                    <span className="text-foreground-tertiary text-[10px]">
                      {TIER_THRESHOLDS[tier].toLocaleString()} pts
                    </span>
                    {isActive && (
                      <span className="ml-auto text-foreground text-[10px] font-semibold bg-foreground-disabled/20 px-2 py-0.5 rounded-full">
                        Current
                      </span>
                    )}
                  </div>
                  <ul className="space-y-1">
                    {(tierBenefits[tier] || []).map(b => (
                      <li key={b} className="flex items-start gap-1.5 text-xs text-foreground-secondary">
                        <svg className="w-3 h-3 text-success mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Points History ── */}
        <div className="lg:col-span-2 border border-border rounded-2xl p-5 vsm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-foreground font-semibold text-sm">Points History</h2>
            {txTotal > 0 && (
              <p className="text-foreground-tertiary text-xs">{txTotal} transaction{txTotal !== 1 ? 's' : ''}</p>
            )}
          </div>

          {txLoading && transactions.length === 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <tbody>
                  {[0, 1, 2].map(i => <TableRowSkeleton key={i} columns={4} widths={['w-16', 'w-40', 'w-20', 'w-12 ml-auto']} />)}
                </tbody>
              </table>
            </div>
          ) : transactions.length === 0 ? (
            <EmptyState
              icon={<HiOutlineStar />}
              title="No transactions yet"
              description="Complete a booking to start earning points and climb the tiers."
              actionLabel="Browse Rooms"
              actionHref="/rooms"
              className="py-8"
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-foreground-tertiary text-[11px] uppercase tracking-wider border-b border-border">
                      <th className="py-2 px-2 font-semibold">Date</th>
                      <th className="py-2 px-2 font-semibold">Description</th>
                      <th className="py-2 px-2 font-semibold max-md:hidden">Booking</th>
                      <th className="py-2 px-2 font-semibold text-right">Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map(t => (
                      <tr key={t.id} className="border-b border-border last:border-0">
                        <td className="py-3 px-2 text-foreground-tertiary text-xs whitespace-nowrap">
                          {new Date(t.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                              t.points > 0 ? 'bg-success/10' : 'bg-danger-bg'
                            }`}>
                              {t.points > 0 ? (
                                <HiOutlineArrowUp size={12} className="text-success" />
                              ) : (
                                <HiOutlineArrowDown size={12} className="text-danger" />
                              )}
                            </div>
                            <span className="text-foreground text-sm">{t.description}</span>
                          </div>
                        </td>
                        <td className="py-3 px-2 max-md:hidden">
                          {t.bookingRef ? (
                            <Link href="/bookings" className="text-foreground text-xs font-mono hover:underline">
                              {t.bookingRef}
                            </Link>
                          ) : (
                            <span className="text-foreground-tertiary text-xs">—</span>
                          )}
                        </td>
                        <td className="py-3 px-2 text-right">
                          <span className={`font-semibold text-sm ${t.points > 0 ? 'text-success' : 'text-danger'}`}>
                            {t.points > 0 ? '+' : ''}{t.points.toLocaleString()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {txTotalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                  <p className="text-foreground-tertiary text-xs">
                    Page {txPage} of {txTotalPages}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setTxPage(p => Math.max(1, p - 1))}
                      disabled={txPage <= 1 || txLoading}
                      className="p-1.5 rounded-md border border-border text-foreground-tertiary hover:text-foreground disabled:opacity-40"
                    >
                      <HiOutlineChevronLeft size={14} />
                    </button>
                    <button
                      onClick={() => setTxPage(p => Math.min(txTotalPages, p + 1))}
                      disabled={txPage >= txTotalPages || txLoading}
                      className="p-1.5 rounded-md border border-border text-foreground-tertiary hover:text-foreground disabled:opacity-40"
                    >
                      <HiOutlineChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
