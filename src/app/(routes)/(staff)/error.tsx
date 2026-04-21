'use client'
import { useEffect } from 'react'
import ErrorState from '@/component/ui/ErrorState'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function StaffSegmentError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('[staff error boundary]', error)
  }, [error])

  return (
    <ErrorState
      title="Something went wrong"
      description="This page failed to load. Try refreshing, or head back to the staff dashboard."
      onRetry={reset}
      homeHref="/staff/dashboard"
    />
  )
}
