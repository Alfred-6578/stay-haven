'use client'
import React, { ReactNode } from 'react'
import Link from 'next/link'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  actionHref?: string
  secondaryLabel?: string
  onSecondary?: () => void
  secondaryHref?: string
  className?: string
}

const EmptyState = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  actionHref,
  secondaryLabel,
  onSecondary,
  secondaryHref,
  className = '',
}: EmptyStateProps) => {
  const renderAction = () => {
    if (!actionLabel) return null
    const cls = 'inline-flex items-center justify-center bg-foreground text-foreground-inverse text-sm font-semibold px-5 py-2.5 rounded-full hover:opacity-90 transition-opacity'
    if (actionHref) return <Link href={actionHref} className={cls}>{actionLabel}</Link>
    return <button onClick={onAction} className={cls}>{actionLabel}</button>
  }

  const renderSecondary = () => {
    if (!secondaryLabel) return null
    const cls = 'inline-flex items-center justify-center border border-border text-foreground text-sm font-medium px-5 py-2.5 rounded-full hover:bg-foreground-disabled/5 transition-colors'
    if (secondaryHref) return <Link href={secondaryHref} className={cls}>{secondaryLabel}</Link>
    return <button onClick={onSecondary} className={cls}>{secondaryLabel}</button>
  }

  return (
    <div className={`text-center py-12 sm:py-16 px-4 ${className}`}>
      {icon && (
        <div className="inline-flex w-16 h-16 rounded-full bg-foreground-disabled/10 items-center justify-center text-foreground-tertiary mb-4 [&>svg]:w-7 [&>svg]:h-7">
          {icon}
        </div>
      )}
      <h3 className="font-heading text-foreground font-bold text-lg sm:text-xl mb-1.5">
        {title}
      </h3>
      {description && (
        <p className="text-foreground-tertiary text-sm leading-relaxed max-w-sm mx-auto mb-5">
          {description}
        </p>
      )}
      {(actionLabel || secondaryLabel) && (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
          {renderAction()}
          {renderSecondary()}
        </div>
      )}
    </div>
  )
}

export default EmptyState
