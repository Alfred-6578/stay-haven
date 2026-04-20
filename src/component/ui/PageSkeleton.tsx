import React from 'react'

/**
 * Generic skeleton primitives used across the app. Each variant mirrors
 * the shape of the content it replaces so the layout doesn't jump when
 * real data arrives.
 */

const pulse = 'bg-foreground-disabled/15 animate-pulse rounded'

interface SkeletonProps {
  className?: string
}

/** Single pulsing bar. Base building block for custom skeletons. */
export const SkeletonBar = ({ className = '' }: SkeletonProps) => (
  <div className={`${pulse} ${className}`} />
)

/** Generic full-page skeleton — header bar + three content blocks. */
export const PageSkeleton = () => (
  <div className="flex flex-col gap-6">
    <div className="flex items-center gap-3">
      <SkeletonBar className="h-8 w-40" />
      <SkeletonBar className="h-4 w-24" />
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <SkeletonBar className="h-24" />
      <SkeletonBar className="h-24" />
      <SkeletonBar className="h-24" />
    </div>
    <SkeletonBar className="h-64" />
  </div>
)

/** Booking card — matches BookingCard's ~112px height and image+text layout. */
export const BookingCardSkeleton = () => (
  <div className="flex gap-3 border border-border rounded-xl p-3">
    <div className={`${pulse} w-20 h-20 sm:w-24 sm:h-24 rounded-lg shrink-0`} />
    <div className="flex-1 flex flex-col gap-2 py-1">
      <SkeletonBar className="h-4 w-3/4" />
      <SkeletonBar className="h-3 w-1/2" />
      <SkeletonBar className="h-3 w-2/5" />
    </div>
    <div className="flex flex-col items-end gap-2 py-1">
      <SkeletonBar className="h-5 w-16 rounded-full" />
      <SkeletonBar className="h-3 w-12" />
    </div>
  </div>
)

/** Stat tile — number + label pair. */
export const StatCardSkeleton = () => (
  <div className="border border-border rounded-xl p-4">
    <SkeletonBar className="h-3 w-20 mb-3" />
    <SkeletonBar className="h-7 w-24 mb-2" />
    <SkeletonBar className="h-3 w-16" />
  </div>
)

interface TableRowSkeletonProps {
  columns?: number
  widths?: string[]
}

/** Table row with n pulse cells. Pass column widths via Tailwind classes if needed. */
export const TableRowSkeleton = ({ columns = 5, widths }: TableRowSkeletonProps) => (
  <tr className="border-b border-border last:border-0">
    {Array.from({ length: columns }).map((_, i) => (
      <td key={i} className="py-3 px-2">
        <SkeletonBar className={`h-4 ${widths?.[i] || 'w-full max-w-24'}`} />
      </td>
    ))}
  </tr>
)

/** Room card — image-forward card with title, sub-title, price. */
export const RoomCardSkeleton = () => (
  <div className="border border-border rounded-2xl overflow-hidden">
    <div className={`${pulse} w-full h-40 sm:h-48 rounded-none`} />
    <div className="p-4 flex flex-col gap-2">
      <SkeletonBar className="h-5 w-2/3" />
      <SkeletonBar className="h-3 w-1/2" />
      <div className="flex justify-between pt-2 mt-1">
        <SkeletonBar className="h-5 w-20" />
        <SkeletonBar className="h-8 w-20 rounded-full" />
      </div>
    </div>
  </div>
)

interface ListSkeletonProps {
  count?: number
  item?: React.ComponentType
}

/** Repeating list of skeletons — defaults to BookingCardSkeleton. */
export const ListSkeleton = ({ count = 3, item: Item = BookingCardSkeleton }: ListSkeletonProps) => (
  <div className="flex flex-col gap-3">
    {Array.from({ length: count }).map((_, i) => (
      <Item key={i} />
    ))}
  </div>
)

export default PageSkeleton
