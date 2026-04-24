'use client'
import { useEffect, useState } from 'react'

/**
 * Paystack callback target for popup flows.
 *
 * The booking / upgrade / extension / room-service pay flows all open
 * Paystack in a new tab and poll the parent window for status. When
 * Paystack redirects back here after checkout, we just close the tab —
 * the parent tab already knows the outcome and renders the right state.
 *
 * `window.close()` is allowed here because the window was script-opened
 * via `window.open(...)`. If the browser blocks the close (rare), the
 * fallback message below tells the user to dismiss the tab manually.
 */
export default function PaymentClosePage() {
  const [stuck, setStuck] = useState(false)

  useEffect(() => {
    window.close()
    // If we're still mounted 400ms later, the browser refused to close.
    const t = setTimeout(() => setStuck(true), 400)
    return () => clearTimeout(t)
  }, [])

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#fff',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        padding: '24px',
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: 360 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: '#F0F7F3',
            margin: '0 auto 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#2A7A45"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111', marginBottom: 8 }}>
          {stuck ? 'Payment received' : 'Closing…'}
        </h1>
        <p style={{ color: '#555', fontSize: 14, lineHeight: 1.6 }}>
          {stuck
            ? 'You can close this tab — your booking is being confirmed on the previous page.'
            : 'Taking you back to your booking.'}
        </p>
      </div>
    </div>
  )
}
