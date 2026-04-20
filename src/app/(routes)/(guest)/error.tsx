'use client'
import { useEffect } from 'react'
import ErrorState from '@/component/ui/ErrorState'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GuestSegmentError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('[guest error boundary]', error)
  }, [error])

  return (
    <ErrorState
      title="Something went wrong"
      description="We couldn't load this page. Please try again, or head to your dashboard."
      onRetry={reset}
      homeHref="/dashboard"
    />
  )
}
