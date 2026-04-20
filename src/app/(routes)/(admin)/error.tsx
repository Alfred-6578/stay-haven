'use client'
import { useEffect } from 'react'
import ErrorState from '@/component/ui/ErrorState'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function AdminSegmentError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('[admin error boundary]', error)
  }, [error])

  return (
    <ErrorState
      title="Something went wrong"
      description="This admin page failed to load. Try refreshing, or return to the dashboard."
      onRetry={reset}
      homeHref="/admin/dashboard"
    />
  )
}
