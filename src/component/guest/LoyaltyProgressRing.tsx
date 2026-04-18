'use client'
import React, { useEffect, useState } from 'react'

const TIER_COLORS: Record<string, string> = {
  BRONZE: '#CD7F32',
  SILVER: '#A0AEC0',
  GOLD: '#D97706',
  PLATINUM: '#6366F1',
}

interface Props {
  /** 0–100 */
  percentage: number
  /** e.g. "GOLD" */
  tier: string
  /** Ring diameter in px (default 140) */
  size?: number
}

const LoyaltyProgressRing = ({ percentage, tier, size = 140 }: Props) => {
  const color = TIER_COLORS[tier] || TIER_COLORS.BRONZE
  const stroke = 8
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const center = size / 2

  // Animate from 0 → target on mount
  const [animatedPct, setAnimatedPct] = useState(0)
  useEffect(() => {
    const timer = setTimeout(() => setAnimatedPct(percentage), 50)
    return () => clearTimeout(timer)
  }, [percentage])

  const offset = circumference - (animatedPct / 100) * circumference
  const tierLabel = tier.charAt(0) + tier.slice(1).toLowerCase()

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={stroke}
        />
        {/* Progress */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-foreground-inverse text-2xl font-bold leading-none">
          {Math.round(percentage)}%
        </span>
        <span className="text-foreground-inverse/60 text-[10px] font-semibold uppercase tracking-wider mt-1">
          {tierLabel}
        </span>
      </div>
    </div>
  )
}

export default LoyaltyProgressRing
