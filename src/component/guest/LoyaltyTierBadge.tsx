'use client'
import React from 'react'
import { HiOutlineStar } from 'react-icons/hi'

const tierColors: Record<string, { bg: string; text: string; border: string }> = {
  BRONZE: { bg: 'bg-bronze/10', text: 'text-bronze', border: 'border-bronze/30' },
  SILVER: { bg: 'bg-silver/10', text: 'text-silver', border: 'border-silver/30' },
  GOLD: { bg: 'bg-gold/10', text: 'text-gold', border: 'border-gold/30' },
  PLATINUM: { bg: 'bg-platinum/10', text: 'text-platinum', border: 'border-platinum/30' },
}

interface Props {
  tier: string
  size?: 'sm' | 'md'
}

const LoyaltyTierBadge = ({ tier, size = 'sm' }: Props) => {
  const colors = tierColors[tier] || tierColors.BRONZE

  return (
    <span className={`inline-flex items-center gap-1 border rounded-full font-medium ${colors.bg} ${colors.text} ${colors.border} ${
      size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-3 py-1'
    }`}>
      <HiOutlineStar size={size === 'sm' ? 10 : 12} />
      {tier.charAt(0) + tier.slice(1).toLowerCase()}
    </span>
  )
}

export default LoyaltyTierBadge
