'use client'
import React from 'react'
import Link from 'next/link'
import { HiOutlineExclamation, HiOutlineRefresh } from 'react-icons/hi'

interface ErrorStateProps {
  title?: string
  description?: string
  onRetry?: () => void
  retryLabel?: string
  homeHref?: string
  className?: string
  compact?: boolean
}

const ErrorState = ({
  title = 'Something went wrong',
  description = "We couldn't load this right now. Please try again.",
  onRetry,
  retryLabel = 'Try Again',
  homeHref,
  className = '',
  compact = false,
}: ErrorStateProps) => {
  return (
    <div
      className={`text-center ${compact ? 'py-8' : 'py-12 sm:py-16'} px-4 ${className}`}
      role="alert"
    >
      <div className="inline-flex w-14 h-14 rounded-full bg-danger-bg items-center justify-center text-danger mb-4">
        <HiOutlineExclamation size={24} />
      </div>
      <h3 className="font-heading text-foreground font-bold text-lg sm:text-xl mb-1.5">
        {title}
      </h3>
      <p className="text-foreground-tertiary text-sm leading-relaxed max-w-sm mx-auto mb-5">
        {description}
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 bg-foreground text-foreground-inverse text-sm font-semibold px-5 py-2.5 rounded-full hover:opacity-90 transition-opacity"
          >
            <HiOutlineRefresh size={14} />
            {retryLabel}
          </button>
        )}
        {homeHref && (
          <Link
            href={homeHref}
            className="inline-flex items-center justify-center border border-border text-foreground text-sm font-medium px-5 py-2.5 rounded-full hover:bg-foreground-disabled/5 transition-colors"
          >
            Go Home
          </Link>
        )}
      </div>
    </div>
  )
}

export default ErrorState
