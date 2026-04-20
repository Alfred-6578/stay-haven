'use client'
import React, { useCallback, useEffect, useState } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { api } from '@/lib/api'
import ErrorState from '@/component/ui/ErrorState'
import { SkeletonBar } from '@/component/ui/PageSkeleton'

interface TypeRow {
  roomType: string
  total: number
  occupied: number
  available: number
  cleaning: number
  maintenance: number
}

const COLORS = {
  available: '#10B981', // green
  occupied: '#EF4444', // red
  cleaning: '#F59E0B', // yellow
  maintenance: '#9CA3AF', // gray
}

const OccupancyChart = () => {
  const [data, setData] = useState<TypeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const res = await api.get('/admin/stats/occupancy')
      setData(res.data.data.currentByType)
    } catch {
      setError(true)
      setData([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="bg-foreground-inverse border border-border rounded-2xl p-5 vsm:p-6 h-full flex flex-col">
      <div className="mb-4">
        <h3 className="text-foreground font-semibold text-sm">Current Occupancy by Room Type</h3>
        <p className="text-foreground-tertiary text-xs">Live room status</p>
      </div>

      <div className="flex-1 min-h-[260px]">
        {loading ? (
          <SkeletonBar className="h-full rounded-lg" />
        ) : error ? (
          <ErrorState
            title="Couldn't load occupancy"
            description="Try again to fetch room occupancy data."
            onRetry={load}
            compact
          />
        ) : data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-foreground-tertiary text-sm">
            No room data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E8" vertical={false} />
              <XAxis
                dataKey="roomType"
                tick={{ fontSize: 10, fill: '#999' }}
                axisLine={false}
                tickLine={false}
                angle={-20}
                textAnchor="end"
                height={60}
                interval={0}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#999' }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                contentStyle={{
                  borderRadius: 8,
                  border: '1px solid #E8E8E8',
                  fontSize: 12,
                }}
              />
              <Legend
                verticalAlign="bottom"
                iconType="circle"
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
              />
              <Bar dataKey="available" fill={COLORS.available} name="Available" radius={[3, 3, 0, 0]} />
              <Bar dataKey="occupied" fill={COLORS.occupied} name="Occupied" radius={[3, 3, 0, 0]} />
              <Bar dataKey="cleaning" fill={COLORS.cleaning} name="Cleaning" radius={[3, 3, 0, 0]} />
              <Bar dataKey="maintenance" fill={COLORS.maintenance} name="Maintenance" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

export default OccupancyChart
