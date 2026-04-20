'use client'
import { useEffect } from 'react'
import Link from 'next/link'
import { HiOutlineExclamation, HiOutlineRefresh } from 'react-icons/hi'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function RootError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('[root error boundary]', error)
  }, [error])

  return (
    <html lang="en">
      <body className="min-h-screen bg-background-secondary flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-md text-center">
          <div className="inline-flex w-16 h-16 rounded-full bg-danger-bg items-center justify-center text-danger mb-5">
            <HiOutlineExclamation size={28} />
          </div>
          <h1 className="font-heading text-foreground text-2xl font-bold mb-2">
            Something went wrong
          </h1>
          <p className="text-foreground-tertiary text-sm leading-relaxed max-w-sm mx-auto mb-6">
            We hit an unexpected error. Try again, or head back home.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
            <button
              onClick={reset}
              className="inline-flex items-center gap-2 bg-foreground text-foreground-inverse text-sm font-semibold px-5 py-2.5 rounded-full hover:opacity-90 transition-opacity"
            >
              <HiOutlineRefresh size={14} />
              Try Again
            </button>
            <Link
              href="/"
              className="inline-flex items-center justify-center border border-border text-foreground text-sm font-medium px-5 py-2.5 rounded-full hover:bg-foreground-disabled/5 transition-colors"
            >
              Go Home
            </Link>
          </div>
          {error.digest && (
            <p className="text-foreground-disabled text-[11px] mt-6 font-mono">
              Ref: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  )
}
