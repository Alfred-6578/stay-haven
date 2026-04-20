'use client'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import {
  HiOutlineStar,
  HiOutlineTrendingUp,
  HiOutlineTrendingDown,
  HiOutlineCash,
  HiOutlinePlus,
  HiOutlineX,
  HiOutlineSearch,
  HiOutlineUser,
} from 'react-icons/hi'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import LoyaltyTierBadge from '@/component/guest/LoyaltyTierBadge'
import EmptyState from '@/component/ui/EmptyState'
import ErrorState from '@/component/ui/ErrorState'
import { SkeletonBar, StatCardSkeleton } from '@/component/ui/PageSkeleton'

// ── Types ──

interface TopGuest {
  id: string
  firstName: string
  lastName: string
  email: string
  loyaltyTier: string
  totalPoints: number
  lifetimePoints: number
  totalSpend: number
}

interface LoyaltyStats {
  totalPointsIssued: number
  totalPointsRedeemed: number
  pointsOutstanding: number
  pointsOutstandingValue: number
  tierBreakdown: Record<string, number>
  topGuests: TopGuest[]
  avgPointsPerGuest: number
  pointsValueNgn: number
}

// ── Constants ──

const TIER_CHART_COLORS: Record<string, string> = {
  BRONZE: '#CD7F32',
  SILVER: '#A0AEC0',
  GOLD: '#D97706',
  PLATINUM: '#6366F1',
}

const formatNaira = (v: number) =>
  `₦${new Intl.NumberFormat('en-NG', { maximumFractionDigits: 0 }).format(v)}`

// ── Component ──

interface GuestSearchResult {
  id: string
  firstName: string
  lastName: string
  email: string
  guestProfile: { loyaltyTier: string; totalPoints: number } | null
}

export default function AdminLoyaltyPage() {
  const [data, setData] = useState<LoyaltyStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  // Award modal
  const [awardOpen, setAwardOpen] = useState(false)
  const [guestQuery, setGuestQuery] = useState('')
  const [guestResults, setGuestResults] = useState<GuestSearchResult[]>([])
  const [guestSearching, setGuestSearching] = useState(false)
  const [selectedGuest, setSelectedGuest] = useState<GuestSearchResult | null>(null)
  const [awardPoints, setAwardPoints] = useState('')
  const [awardDesc, setAwardDesc] = useState('')
  const [awarding, setAwarding] = useState(false)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchStats = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const res = await api.get('/admin/loyalty')
      setData(res.data.data)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  // Debounced guest search
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    const q = guestQuery.trim()
    if (q.length < 2) { setGuestResults([]); return }
    setGuestSearching(true)
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await api.get(`/staff/guests/search?q=${encodeURIComponent(q)}`)
        setGuestResults(res.data.data || [])
      } catch {
        setGuestResults([])
      } finally {
        setGuestSearching(false)
      }
    }, 350)
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current) }
  }, [guestQuery])

  const openAward = (guest?: TopGuest) => {
    if (guest) {
      setSelectedGuest({
        id: guest.id,
        firstName: guest.firstName,
        lastName: guest.lastName,
        email: guest.email,
        guestProfile: { loyaltyTier: guest.loyaltyTier, totalPoints: guest.totalPoints },
      })
      setGuestQuery('')
    } else {
      setSelectedGuest(null)
      setGuestQuery('')
    }
    setGuestResults([])
    setAwardPoints('')
    setAwardDesc('')
    setAwardOpen(true)
  }

  const handleAward = async () => {
    if (!selectedGuest) { toast.error('Select a guest'); return }
    const pts = parseInt(awardPoints, 10)
    if (!pts || pts === 0) { toast.error('Points cannot be zero'); return }
    if (!awardDesc.trim()) { toast.error('Description is required'); return }
    setAwarding(true)
    try {
      const res = await api.post('/admin/loyalty/award', {
        userId: selectedGuest.id,
        points: pts,
        description: awardDesc.trim(),
      })
      const d = res.data.data
      toast.success(
        `${pts > 0 ? '+' : ''}${pts} points → ${selectedGuest.firstName} ${selectedGuest.lastName}` +
        (d.tierChanged ? ` (upgraded to ${d.tier})` : '')
      )
      setAwardOpen(false)
      fetchStats()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to award'
      toast.error(msg)
    } finally {
      setAwarding(false)
    }
  }

  if (loading) {
    return (
      <div>
        <SkeletonBar className="h-8 w-48 mb-6" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {[0, 1, 2, 3].map(i => <StatCardSkeleton key={i} />)}
        </div>
        <div className="grid lg:grid-cols-3 gap-6">
          <SkeletonBar className="h-72 rounded-2xl" />
          <SkeletonBar className="h-72 rounded-2xl lg:col-span-2" />
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <ErrorState
        title="Couldn't load loyalty data"
        description="We had trouble fetching loyalty program stats. Please try again."
        onRetry={fetchStats}
      />
    )
  }

  // Prepare donut data
  const tierOrder = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'] as const
  const donutData = tierOrder
    .map(tier => ({
      name: tier.charAt(0) + tier.slice(1).toLowerCase(),
      value: data.tierBreakdown[tier] || 0,
      tier,
    }))
    .filter(d => d.value > 0)
  const totalGuests = donutData.reduce((s, d) => s + d.value, 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <h1 className="text-foreground font-heading text-xl sm:text-2xl font-bold">Loyalty Program</h1>
        <button
          onClick={() => openAward()}
          className="inline-flex items-center gap-2 bg-foreground text-foreground-inverse px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 shrink-0"
        >
          <HiOutlinePlus size={16} />
          Award Points
        </button>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard
          label="Points Issued"
          value={data.totalPointsIssued.toLocaleString()}
          sub="All time"
          icon={HiOutlineTrendingUp}
          bg="bg-[#EAF3DE]"
        />
        <StatCard
          label="Points Redeemed"
          value={data.totalPointsRedeemed.toLocaleString()}
          sub="All time"
          icon={HiOutlineTrendingDown}
          bg="bg-[#F0ECE4]"
        />
        <StatCard
          label="Outstanding"
          value={data.pointsOutstanding.toLocaleString()}
          sub={formatNaira(data.pointsOutstandingValue)}
          icon={HiOutlineCash}
          bg="bg-[#FAEEDA]"
        />
        <StatCard
          label="Avg / Guest"
          value={data.avgPointsPerGuest.toLocaleString()}
          sub="Lifetime average"
          icon={HiOutlineStar}
          bg="bg-[#FAECE7]"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* ── Tier Breakdown Donut ── */}
        <div className="border border-border rounded-2xl p-5 vsm:p-6">
          <h2 className="text-foreground font-semibold text-sm mb-4">Tier Breakdown</h2>
          {donutData.length === 0 ? (
            <EmptyState
              icon={<HiOutlineStar />}
              title="No guest data yet"
              description="Once guests start earning points, tier distribution will appear here."
              className="py-8"
            />
          ) : (
            <>
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      strokeWidth={0}
                    >
                      {donutData.map(d => (
                        <Cell key={d.tier} fill={TIER_CHART_COLORS[d.tier]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: 10,
                        border: 'none',
                        boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
                        fontSize: 12,
                      }}
                      formatter={(value) => [`${value} guest${value !== 1 ? 's' : ''}`, '']}
                    />
                    <Legend
                      verticalAlign="bottom"
                      iconType="circle"
                      iconSize={8}
                      formatter={(value: string) => (
                        <span className="text-foreground-secondary text-xs">{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <p className="text-center text-foreground-tertiary text-xs mt-2">
                {totalGuests} total guest{totalGuests !== 1 ? 's' : ''}
              </p>
            </>
          )}
        </div>

        {/* ── Top Guests Table ── */}
        <div className="lg:col-span-2 border border-border rounded-2xl p-5 vsm:p-6">
          <h2 className="text-foreground font-semibold text-sm mb-4">Top Guests by Lifetime Points</h2>
          {data.topGuests.length === 0 ? (
            <EmptyState
              icon={<HiOutlineUser />}
              title="No guests yet"
              description="Top earners will appear here once guests start earning loyalty points."
              className="py-8"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-foreground-tertiary text-[11px] uppercase tracking-wider border-b border-border">
                    <th className="py-2 px-2 font-semibold">#</th>
                    <th className="py-2 px-2 font-semibold">Guest</th>
                    <th className="py-2 px-2 font-semibold">Tier</th>
                    <th className="py-2 px-2 font-semibold text-right">Lifetime</th>
                    <th className="py-2 px-2 font-semibold text-right">Balance</th>
                    <th className="py-2 px-2 font-semibold text-right max-md:hidden">Spend</th>
                    <th className="py-2 px-2 font-semibold text-right" />
                  </tr>
                </thead>
                <tbody>
                  {data.topGuests.map((g, i) => (
                    <tr key={g.id} className="border-b border-border last:border-0">
                      <td className="py-3 px-2 text-foreground-tertiary font-mono text-xs">{i + 1}</td>
                      <td className="py-3 px-2">
                        <p className="text-foreground font-medium">{g.firstName} {g.lastName}</p>
                        <p className="text-foreground-tertiary text-xs">{g.email}</p>
                      </td>
                      <td className="py-3 px-2">
                        <LoyaltyTierBadge tier={g.loyaltyTier} />
                      </td>
                      <td className="py-3 px-2 text-right text-foreground font-semibold">
                        {g.lifetimePoints.toLocaleString()}
                      </td>
                      <td className="py-3 px-2 text-right text-foreground-secondary">
                        {g.totalPoints.toLocaleString()}
                      </td>
                      <td className="py-3 px-2 text-right text-foreground-tertiary max-md:hidden">
                        {formatNaira(g.totalSpend)}
                      </td>
                      <td className="py-3 px-2 text-right">
                        <button
                          onClick={() => openAward(g)}
                          className="text-foreground text-xs font-semibold px-2.5 py-1 border border-border rounded-md hover:bg-foreground-disabled/5"
                        >
                          Award
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ═══ Award Points Modal ═══ */}
      {awardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-foreground/40" onClick={awarding ? undefined : () => setAwardOpen(false)} />
          <div className="relative w-full max-w-md bg-foreground-inverse rounded-2xl shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-foreground font-bold text-lg">Award Points</h2>
              <button onClick={() => setAwardOpen(false)} disabled={awarding} className="p-2 text-foreground-tertiary hover:text-foreground">
                <HiOutlineX size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* Guest search / selected */}
              {selectedGuest ? (
                <div className="flex items-center gap-3 bg-foreground-disabled/5 border border-border rounded-lg p-3">
                  <div className="w-9 h-9 rounded-full bg-foreground-disabled/15 flex items-center justify-center shrink-0">
                    <HiOutlineUser size={16} className="text-foreground-tertiary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground font-semibold text-sm">{selectedGuest.firstName} {selectedGuest.lastName}</p>
                    <p className="text-foreground-tertiary text-xs truncate">{selectedGuest.email}</p>
                    {selectedGuest.guestProfile && (
                      <p className="text-foreground-tertiary text-xs">
                        <LoyaltyTierBadge tier={selectedGuest.guestProfile.loyaltyTier} /> · {selectedGuest.guestProfile.totalPoints.toLocaleString()} pts
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => { setSelectedGuest(null); setGuestQuery('') }}
                    className="text-foreground-tertiary text-xs hover:text-foreground"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div>
                  <label className="text-foreground-tertiary text-[11px] uppercase tracking-wider font-semibold">
                    Find Guest
                  </label>
                  <div className="relative mt-1.5">
                    <HiOutlineSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-tertiary" />
                    <input
                      autoFocus
                      type="text"
                      value={guestQuery}
                      onChange={e => setGuestQuery(e.target.value)}
                      placeholder="Name, email, or phone…"
                      className="w-full pl-9 pr-3 py-2.5 bg-foreground-inverse border border-border rounded-lg text-sm text-foreground outline-none focus:border-foreground"
                    />
                  </div>
                  {guestSearching && <p className="text-foreground-tertiary text-xs mt-2">Searching…</p>}
                  {!guestSearching && guestResults.length > 0 && (
                    <ul className="mt-2 max-h-[200px] overflow-y-auto space-y-1">
                      {guestResults.map(g => (
                        <li key={g.id}>
                          <button
                            onClick={() => { setSelectedGuest(g); setGuestResults([]) }}
                            className="w-full text-left flex items-center gap-3 p-2.5 rounded-lg border border-border hover:border-foreground/40 transition-colors"
                          >
                            <div className="w-8 h-8 rounded-full bg-foreground-disabled/10 flex items-center justify-center shrink-0">
                              <HiOutlineUser size={14} className="text-foreground-tertiary" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-foreground text-sm font-medium truncate">{g.firstName} {g.lastName}</p>
                              <p className="text-foreground-tertiary text-xs truncate">{g.email}</p>
                            </div>
                            {g.guestProfile && (
                              <span className="ml-auto shrink-0">
                                <LoyaltyTierBadge tier={g.guestProfile.loyaltyTier} />
                              </span>
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Points */}
              <div>
                <label className="text-foreground-tertiary text-[11px] uppercase tracking-wider font-semibold">
                  Points
                </label>
                <input
                  type="number"
                  value={awardPoints}
                  onChange={e => setAwardPoints(e.target.value)}
                  placeholder="e.g. 500 (positive to award, negative to deduct)"
                  className="mt-1.5 w-full px-3 py-2.5 bg-foreground-inverse border border-border rounded-lg text-sm text-foreground outline-none focus:border-foreground"
                />
                {awardPoints && parseInt(awardPoints, 10) !== 0 && (
                  <p className="text-foreground-tertiary text-xs mt-1">
                    {parseInt(awardPoints, 10) > 0 ? 'Award' : 'Deduct'} {Math.abs(parseInt(awardPoints, 10)).toLocaleString()} points
                    {parseInt(awardPoints, 10) > 0 ? ` (worth ${formatNaira(parseInt(awardPoints, 10) * (data?.pointsValueNgn || 10))})` : ''}
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="text-foreground-tertiary text-[11px] uppercase tracking-wider font-semibold">
                  Reason / Description
                </label>
                <textarea
                  value={awardDesc}
                  onChange={e => setAwardDesc(e.target.value)}
                  rows={2}
                  placeholder="e.g. Birthday bonus, compensation for service issue…"
                  className="mt-1.5 w-full px-3 py-2 bg-foreground-inverse border border-border rounded-lg text-sm text-foreground placeholder:text-foreground-tertiary outline-none focus:border-foreground resize-none"
                />
              </div>
            </div>

            <div className="flex gap-2 px-5 py-4 border-t border-border">
              <button
                onClick={() => setAwardOpen(false)}
                disabled={awarding}
                className="flex-1 border border-border rounded-lg py-2.5 text-sm text-foreground hover:bg-foreground-disabled/5"
              >
                Cancel
              </button>
              <button
                onClick={handleAward}
                disabled={awarding || !selectedGuest || !awardPoints || !awardDesc.trim()}
                className="flex-1 bg-foreground text-foreground-inverse rounded-lg py-2.5 text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {awarding && <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                {awarding ? 'Awarding…' : 'Award Points'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Stat Card ──

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  bg,
}: {
  label: string
  value: string
  sub: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  bg: string
}) {
  return (
    <div className={`${bg} rounded-2xl p-5`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-foreground-secondary text-xs uppercase tracking-wider font-semibold">{label}</p>
        <Icon size={20} className="text-foreground/40" />
      </div>
      <p className="text-foreground text-2xl font-bold">{value}</p>
      <p className="text-foreground-tertiary text-xs mt-0.5">{sub}</p>
    </div>
  )
}
