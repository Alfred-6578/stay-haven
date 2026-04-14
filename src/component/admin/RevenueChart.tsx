'use client'
import React, { useEffect, useState } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import { api } from '@/lib/api'

type Period = '7d' | '30d' | '90d' | '12m'
const PERIODS: Period[] = ['7d', '30d', '90d', '12m']

interface Point {
  date: string
  revenue: number
}

const formatNaira = (v: number) =>
  `₦${new Intl.NumberFormat('en-NG', { maximumFractionDigits: 0 }).format(v)}`

const formatNairaCompact = (v: number) => {
  if (v >= 1_000_000) return `₦${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `₦${(v / 1_000).toFixed(0)}k`
  return `₦${v}`
}

interface TooltipProps {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
}

const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-foreground-inverse border border-border rounded-lg shadow-md px-3 py-2">
      <p className="text-foreground-tertiary text-[11px] uppercase tracking-wider">{label}</p>
      <p className="text-foreground font-semibold text-sm">{formatNaira(payload[0].value)}</p>
    </div>
  )
}

const RevenueChart = () => {
  const [period, setPeriod] = useState<Period>('30d')
  const [data, setData] = useState<Point[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api
      .get(`/admin/stats/revenue?period=${period}`)
      .then(res => {
        if (!cancelled) setData(res.data.data.data)
      })
      .catch(() => {
        if (!cancelled) setData([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [period])

  return (
    <div className="bg-foreground-inverse border border-border rounded-2xl p-5 vsm:p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <div>
          <h3 className="text-foreground font-semibold text-sm">Revenue</h3>
          <p className="text-foreground-tertiary text-xs">Completed payments</p>
        </div>
        <div className="flex gap-1 bg-foreground-disabled/10 p-1 rounded-lg">
          {PERIODS.map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-md transition-colors ${
                period === p
                  ? 'bg-[#0B1B3A] text-white'
                  : 'text-foreground-secondary hover:text-foreground'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-[260px]">
        {loading ? (
          <div className="h-full bg-foreground-disabled/10 rounded-lg animate-pulse" />
        ) : data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-foreground-tertiary text-sm">
            No revenue data for this period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E8" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#999' }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={20}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#999' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={formatNairaCompact}
                width={55}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#D97706"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, fill: '#D97706' }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

export default RevenueChart
