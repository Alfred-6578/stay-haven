'use client'
import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { WalkInFormData, formatNaira } from './types'

interface Props {
  data: WalkInFormData
}

/**
 * Portals a B&W receipt directly under <body>. Hidden on screen; visible only
 * in the browser's print dialog via a global @media print rule that hides
 * every other direct child of <body>.
 */
const PrintableReceipt = ({ data }: Props) => {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])
  if (!mounted || !data.result) return null

  const r = data.result
  const methodLabel =
    r.payment.method === 'CASH' ? 'Cash'
      : r.payment.method === 'POS' ? 'POS / Card'
        : 'Bank Transfer'
  const primaryRef = r.groupRef || r.bookings[0].bookingRef
  const firstBooking = r.bookings[0]

  return createPortal(
    <>
      <style>{`
        .sh-print-receipt { display: none; }
        @media print {
          body > *:not(.sh-print-receipt-wrap) { display: none !important; }
          .sh-print-receipt-wrap { display: block !important; }
          .sh-print-receipt {
            display: block !important;
            width: 100%;
            padding: 24px;
            color: #000;
            font-family: 'Helvetica Neue', Arial, sans-serif;
            font-size: 12px;
            line-height: 1.5;
          }
          .sh-print-receipt h1 { font-size: 20px; margin: 0 0 4px; font-weight: 700; }
          .sh-print-receipt h2 { font-size: 14px; margin: 20px 0 6px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; border-bottom: 1px solid #000; padding-bottom: 4px; }
          .sh-print-receipt table { width: 100%; border-collapse: collapse; margin: 6px 0; }
          .sh-print-receipt td { padding: 3px 0; vertical-align: top; }
          .sh-print-receipt td.label { color: #555; width: 40%; }
          .sh-print-receipt td.value { font-weight: 600; text-align: right; }
          .sh-print-receipt .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 16px; }
          .sh-print-receipt .tagline { font-size: 11px; color: #555; margin-top: 2px; }
          .sh-print-receipt .ref { font-family: 'Courier New', monospace; font-size: 16px; font-weight: 700; letter-spacing: 0.08em; }
          .sh-print-receipt .total-row td { padding-top: 8px; border-top: 1px solid #000; font-size: 14px; font-weight: 700; }
          .sh-print-receipt .footer { margin-top: 24px; padding-top: 12px; border-top: 1px dashed #000; text-align: center; font-size: 11px; color: #555; }
          .sh-print-receipt .room-row { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px dotted #ccc; }
          .sh-print-receipt .room-row:last-child { border-bottom: 0; }
        }
      `}</style>
      <div className="sh-print-receipt-wrap sh-print-receipt">
        <div className="header">
          <h1>StayHaven</h1>
          <p className="tagline">Where Every Stay Becomes a Memory</p>
          <p className="tagline">
            {r.isGroup ? `Group Walk-in Receipt (${r.bookings.length} rooms)` : 'Walk-in Booking Receipt'}
          </p>
        </div>

        <table>
          <tbody>
            <tr>
              <td className="label">{r.isGroup ? 'Group Ref' : 'Booking Ref'}</td>
              <td className="value ref">{primaryRef}</td>
            </tr>
            <tr><td className="label">Issued</td><td className="value">{new Date(r.processedAt).toLocaleString('en-US')}</td></tr>
            <tr><td className="label">Processed By</td><td className="value">{r.processedByName}</td></tr>
          </tbody>
        </table>

        <h2>Guest</h2>
        <table>
          <tbody>
            <tr><td className="label">Name</td><td className="value">{r.guest.firstName} {r.guest.lastName}</td></tr>
            <tr><td className="label">Email</td><td className="value">{r.guest.email}</td></tr>
          </tbody>
        </table>

        <h2>Stay</h2>
        <table>
          <tbody>
            <tr><td className="label">Check-in</td><td className="value">{new Date(firstBooking.checkIn).toLocaleDateString('en-US', { dateStyle: 'medium' })}</td></tr>
            <tr><td className="label">Check-out</td><td className="value">{new Date(firstBooking.checkOut).toLocaleDateString('en-US', { dateStyle: 'medium' })}</td></tr>
            <tr><td className="label">Guests</td><td className="value">{data.adults} adult{data.adults !== 1 ? 's' : ''}</td></tr>
          </tbody>
        </table>

        <h2>Room{r.bookings.length > 1 ? 's' : ''}</h2>
        {r.bookings.map(b => (
          <div key={b.id} className="room-row">
            <div>
              <strong>Room {b.room.number}</strong> · Floor {b.room.floor} — {b.roomType.name}<br />
              <span style={{ fontSize: 11, color: '#555' }}>
                Ref {b.bookingRef} · {b.adults} adult{b.adults !== 1 ? 's' : ''}
              </span>
            </div>
            <div style={{ fontWeight: 700 }}>{formatNaira(b.totalAmount)}</div>
          </div>
        ))}

        <h2>Payment</h2>
        <table>
          <tbody>
            <tr><td className="label">Method</td><td className="value">{methodLabel}</td></tr>
            {data.receiptRef && (
              <tr><td className="label">Receipt #</td><td className="value">{data.receiptRef}</td></tr>
            )}
            <tr><td className="label">Total Due</td><td className="value">{formatNaira(r.payment.groupTotal)}</td></tr>
            <tr><td className="label">Amount Received</td><td className="value">{formatNaira(r.payment.amountReceived)}</td></tr>
            {r.payment.underpayment && r.payment.shortfall ? (
              <tr><td className="label">Shortfall (to resolve)</td><td className="value">{formatNaira(r.payment.shortfall)}</td></tr>
            ) : null}
            <tr className="total-row">
              <td className="label">Balance</td>
              <td className="value">
                {r.payment.underpayment && r.payment.shortfall
                  ? formatNaira(r.payment.shortfall)
                  : '₦0'}
              </td>
            </tr>
          </tbody>
        </table>

        <div className="footer">
          Thank you for choosing StayHaven.<br />
          Please keep this receipt for your records.
        </div>
      </div>
    </>,
    document.body
  )
}

export default PrintableReceipt
