'use client'
import { useEffect } from 'react'
import ErrorState from '@/component/ui/ErrorState'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function PublicSegmentError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('[public error boundary]', error)
  }, [error])

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <ErrorState
        title="Something went wrong"
        description="We couldn't load this page. Please try again."
        onRetry={reset}
        homeHref="/"
      />
    </div>
  )
}
