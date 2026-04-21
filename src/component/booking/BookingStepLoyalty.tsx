'use client'
import React, { useState } from 'react'
import Button from '@/component/ui/Button'
import { HiOutlineStar } from 'react-icons/hi'
import { POINTS_VALUE_NGN } from '@/lib/loyalty'

interface Props {
  totalPoints: number
  totalAmount: number
  onApply: (pointsUsed: number, discount: number) => void
  onSkip: () => void
}

const formatNaira = (v: number) =>
  `₦${new Intl.NumberFormat('en-NG', { maximumFractionDigits: 0 }).format(v)}`

const BookingStepLoyalty = ({ totalPoints, totalAmount, onApply, onSkip }: Props) => {
  // Max points the guest can use: capped so discount doesn't exceed totalAmount
  const maxRedeemable = Math.min(
    totalPoints,
    Math.floor(totalAmount / POINTS_VALUE_NGN)
  )
  const [pointsToUse, setPointsToUse] = useState(0)
  const discount = pointsToUse * POINTS_VALUE_NGN
  const newTotal = Math.max(0, totalAmount - discount)

  if (totalPoints === 0) {
    return (
      <div className="max-w-xl mx-auto text-center">
        <div className="w-16 h-16 rounded-full bg-foreground-disabled/10 flex items-center justify-center mx-auto mb-5">
          <HiOutlineStar size={28} className="text-foreground-tertiary" />
        </div>
        <h2 className="font-heading text-2xl vsm:text-3xl font-bold text-foreground mb-2">Loyalty Points</h2>
        <p className="text-foreground-tertiary text-sm mb-8">
          You don&apos;t have any loyalty points yet. You&apos;ll earn points on this booking!
        </p>
        <Button onClick={onSkip} withArrow size="lg">
          Continue to Payment
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto">
      <h2 className="font-heading text-2xl vsm:text-3xl font-bold text-foreground mb-2">Redeem Loyalty Points</h2>
      <p className="text-foreground-tertiary text-sm mb-8">Use your points to reduce the total cost.</p>

      {/* Balance */}
      <div className="bg-foreground-disabled/[0.06] rounded-2xl p-5 vsm:p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center">
              <HiOutlineStar size={20} className="text-gold" />
            </div>
            <div>
              <p className="text-foreground font-semibold">{totalPoints.toLocaleString()} points</p>
              <p className="text-foreground-tertiary text-xs">Available balance</p>
            </div>
          </div>
          <p className="text-foreground-tertiary text-sm">
            Worth <span className="text-foreground font-medium">{formatNaira(totalPoints * POINTS_VALUE_NGN)}</span>
          </p>
        </div>

        {/* Slider */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-foreground-tertiary mb-2">
            <span>0 pts</span>
            <span>{maxRedeemable.toLocaleString()} pts</span>
          </div>
          <input
            type="range"
            min={0}
            max={maxRedeemable}
            step={1}
            value={pointsToUse}
            onChange={(e) => setPointsToUse(Number(e.target.value))}
            className="w-full accent-foreground"
          />
          <div className="text-center mt-2">
            <span className="text-foreground font-bold text-lg">{pointsToUse.toLocaleString()}</span>
            <span className="text-foreground-tertiary text-sm ml-1">points</span>
            {pointsToUse > 0 && (
              <span className="text-success text-sm ml-2">= {formatNaira(discount)} off</span>
            )}
          </div>
        </div>
      </div>

      {/* Live total */}
      <div className="border border-border rounded-2xl p-5 vsm:p-6 mb-8">
        <div className="flex justify-between text-sm text-foreground-secondary mb-2">
          <span>Booking total</span>
          <span>{formatNaira(totalAmount)}</span>
        </div>
        {pointsToUse > 0 && (
          <div className="flex justify-between text-sm text-success mb-2">
            <span>Points discount ({pointsToUse} pts)</span>
            <span>-{formatNaira(discount)}</span>
          </div>
        )}
        <div className="flex justify-between text-foreground font-bold text-lg pt-3 border-t border-border mt-2">
          <span>You pay</span>
          <span>{formatNaira(newTotal)}</span>
        </div>
      </div>

      <div className="flex flex-col vsm:flex-row gap-3 justify-end">
        <Button onClick={onSkip} variant="ghost">
          Skip
        </Button>
        <Button onClick={() => onApply(pointsToUse, discount)} withArrow size="lg">
          {pointsToUse > 0 ? 'Apply & Continue' : 'Continue to Payment'}
        </Button>
      </div>
    </div>
  )
}

export default BookingStepLoyalty
