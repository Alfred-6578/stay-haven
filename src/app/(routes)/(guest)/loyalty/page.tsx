'use client'
import React, { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import LoyaltyTierBadge from '@/component/guest/LoyaltyTierBadge'
import { HiOutlineStar, HiOutlineArrowUp, HiOutlineArrowDown } from 'react-icons/hi'

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
  recentTransactions: Transaction[]
  totalStays: number
  totalSpend: string | number
}

const tierBenefits: Record<string, string[]> = {
  BRONZE: ['Earn 1 point per $1 spent', 'Access to member rates', 'Birthday bonus points'],
  SILVER: ['Everything in Bronze', '10% bonus on points earned', 'Priority check-in', 'Free room upgrade (subject to availability)'],
  GOLD: ['Everything in Silver', '25% bonus on points earned', 'Late checkout', 'Complimentary breakfast', 'Lounge access'],
  PLATINUM: ['Everything in Gold', '50% bonus on points earned', 'Suite upgrades', 'Personal concierge', 'Airport transfers'],
}

export default function LoyaltyPage() {
  const [data, setData] = useState<LoyaltyData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/guest/loyalty')
        setData(res.data.data)
      } catch {}
      setLoading(false)
    })()
  }, [])

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 w-40 bg-foreground-disabled/15 rounded mb-6" />
        <div className="h-48 bg-foreground-disabled/10 rounded-2xl mb-6" />
        <div className="h-64 bg-foreground-disabled/10 rounded-2xl" />
      </div>
    )
  }

  if (!data) return null

  const circumference = 2 * Math.PI * 54
  const offset = circumference - (data.tierProgress / 100) * circumference

  return (
    <div>
      <h1 className="text-foreground font-heading text-2xl font-bold mb-6">Loyalty Program</h1>

      {/* Hero card */}
      <div className="bg-foreground rounded-2xl p-6 vsm:p-8 mb-6">
        <div className="flex flex-col sm:flex-row items-center gap-8">
          {/* Progress ring */}
          <div className="relative flex-shrink-0">
            <svg width="128" height="128" className="-rotate-90">
              <circle cx="64" cy="64" r="54" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
              <circle
                cx="64" cy="64" r="54" fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                className="text-foreground-inverse transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-foreground-inverse text-2xl font-bold">{Math.round(data.tierProgress)}%</span>
            </div>
          </div>

          <div className="text-center sm:text-left flex-1">
            <LoyaltyTierBadge tier={data.tier} size="md" />
            <div className="flex items-baseline gap-2 mt-3 justify-center sm:justify-start">
              <span className="text-foreground-inverse text-4xl font-bold">{data.totalPoints.toLocaleString()}</span>
              <span className="text-foreground-inverse/50 text-sm">points</span>
            </div>
            <p className="text-foreground-inverse/50 text-sm mt-1">
              Worth ₦{data.pointsValue.toLocaleString()} &middot; {data.lifetimePoints.toLocaleString()} lifetime points
            </p>
            {!data.nextTier.isMax && (
              <p className="text-foreground-inverse/40 text-xs mt-2">
                {data.nextTier.pointsAway.toLocaleString()} points to reach {data.nextTier.name}
              </p>
            )}
          </div>

          {/* Stats */}
          <div className="flex sm:flex-col gap-6 sm:gap-4 text-center">
            <div>
              <p className="text-foreground-inverse text-2xl font-bold">{data.totalStays}</p>
              <p className="text-foreground-inverse/50 text-xs">Total Stays</p>
            </div>
            <div>
              <p className="text-foreground-inverse text-2xl font-bold">${Number(data.totalSpend).toLocaleString()}</p>
              <p className="text-foreground-inverse/50 text-xs">Total Spend</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Tier benefits */}
        <div className="border border-border rounded-2xl p-5 vsm:p-6">
          <h2 className="text-foreground font-semibold text-sm mb-4 flex items-center gap-2">
            <HiOutlineStar size={16} />
            {data.tier.charAt(0) + data.tier.slice(1).toLowerCase()} Benefits
          </h2>
          <ul className="flex flex-col gap-2.5">
            {(tierBenefits[data.tier] || tierBenefits.BRONZE).map(b => (
              <li key={b} className="flex items-start gap-2 text-sm text-foreground-secondary">
                <div className="w-4 h-4 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-2.5 h-2.5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                {b}
              </li>
            ))}
          </ul>
        </div>

        {/* Transaction history */}
        <div className="lg:col-span-2 border border-border rounded-2xl p-5 vsm:p-6">
          <h2 className="text-foreground font-semibold text-sm mb-4">Points History</h2>
          {data.recentTransactions.length === 0 ? (
            <p className="text-foreground-tertiary text-sm text-center py-8">No transactions yet</p>
          ) : (
            <div className="flex flex-col">
              {data.recentTransactions.map((t, i) => (
                <div key={t.id} className={`flex items-center justify-between py-3 ${i > 0 ? 'border-t border-border' : ''}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      t.points > 0 ? 'bg-success/10' : 'bg-warning-bg'
                    }`}>
                      {t.points > 0 ? (
                        <HiOutlineArrowUp size={14} className="text-success" />
                      ) : (
                        <HiOutlineArrowDown size={14} className="text-warning" />
                      )}
                    </div>
                    <div>
                      <p className="text-foreground text-sm font-medium">{t.description}</p>
                      <p className="text-foreground-tertiary text-xs">
                        {new Date(t.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        {t.bookingRef && <span> &middot; {t.bookingRef}</span>}
                      </p>
                    </div>
                  </div>
                  <span className={`text-sm font-semibold ${t.points > 0 ? 'text-success' : 'text-warning'}`}>
                    {t.points > 0 ? '+' : ''}{t.points.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
