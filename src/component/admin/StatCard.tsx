'use client'
import React from 'react'
import { HiArrowUp, HiArrowDown, HiMinus } from 'react-icons/hi'

interface Props {
  label: string
  value: string | number
  subtext?: string
  icon?: React.ComponentType<{ size?: number; className?: string }>
  trend?: 'up' | 'down' | 'neutral'
}

const trendStyles = {
  up: { color: 'text-success', icon: HiArrowUp },
  down: { color: 'text-danger', icon: HiArrowDown },
  neutral: { color: 'text-foreground-tertiary', icon: HiMinus },
}

const StatCard = ({ label, value, subtext, icon: Icon, trend }: Props) => {
  const trendConfig = trend ? trendStyles[trend] : null
  const TrendIcon = trendConfig?.icon

  return (
    <div className="bg-foreground-inverse border border-border rounded-2xl p-5 vsm:p-6 flex flex-col gap-2 hover:border-foreground-disabled/50 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <p className="text-foreground-tertiary text-[11px] uppercase tracking-wider font-semibold">
          {label}
        </p>
        {Icon && (
          <div className="w-9 h-9 rounded-lg bg-[#0B1B3A]/5 flex items-center justify-center text-[#0B1B3A] flex-shrink-0">
            <Icon size={18} />
          </div>
        )}
      </div>
      <p className="text-foreground text-2xl vsm:text-3xl font-bold tracking-tight">
        {value}
      </p>
      {subtext && (
        <div className={`flex items-center gap-1 text-xs ${trendConfig?.color || 'text-foreground-tertiary'}`}>
          {TrendIcon && <TrendIcon size={12} />}
          <span>{subtext}</span>
        </div>
      )}
    </div>
  )
}

export default StatCard
