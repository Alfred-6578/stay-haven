'use client'
import React, { useEffect, useMemo, useState } from 'react'
import { HiOutlineX, HiOutlineDocumentText, HiOutlineDownload } from 'react-icons/hi'
import { PiFileXlsBold } from 'react-icons/pi'
import { toast } from 'sonner'

interface Stats {
  overview: {
    totalRevenue: number
    totalBookings: number
    totalGuests: number
    totalRooms: number
  }
  today: {
    todayRevenue: number
    todayCheckIns: number
    todayCheckOuts: number
    newBookingsToday: number
  }
  thisMonth: {
    monthRevenue: number
    monthBookings: number
    currentOccupancyRate: number
    occupiedRooms: number
    totalRooms: number
  }
  recent: {
    recentBookings: Array<{
      id: string
      bookingRef: string
      guestName: string
      roomNumber: string
      roomType: string
      amount: number
      status: string
      createdAt: string
    }>
    recentGuests: Array<{
      id: string
      firstName: string
      lastName: string
      email: string
      createdAt: string
    }>
  }
}

interface Props {
  open: boolean
  stats: Stats | null
  onClose: () => void
}

type Format = 'pdf' | 'excel'

const SECTIONS = [
  { key: 'overview', label: 'Overview' },
  { key: 'today', label: "Today's Activity" },
  { key: 'thisMonth', label: 'This Month' },
  { key: 'recentBookings', label: 'Recent Bookings' },
  { key: 'recentGuests', label: 'Recent Guests' },
] as const

type SectionKey = typeof SECTIONS[number]['key']

const formatNaira = (v: number) =>
  `NGN ${new Intl.NumberFormat('en-NG', { maximumFractionDigits: 0 }).format(v)}`

const formatDate = (d: Date) =>
  d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

const ExportDashboardModal = ({ open, stats, onClose }: Props) => {
  const [format, setFormat] = useState<Format>('pdf')
  const [enabled, setEnabled] = useState<Record<SectionKey, boolean>>({
    overview: true,
    today: true,
    thisMonth: true,
    recentBookings: true,
    recentGuests: true,
  })
  const [busy, setBusy] = useState(false)

  // Esc to close + body scroll lock
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose() }
    window.addEventListener('keydown', handler)
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = original
    }
  }, [open, busy, onClose])

  const toggle = (key: SectionKey) =>
    setEnabled(prev => ({ ...prev, [key]: !prev[key] }))

  const selectedCount = useMemo(
    () => Object.values(enabled).filter(Boolean).length,
    [enabled]
  )

  const buildFilename = (ext: string) =>
    `stayhaven-dashboard-${new Date().toISOString().slice(0, 10)}.${ext}`

  const exportPdf = async () => {
    if (!stats) return
    const { jsPDF } = await import('jspdf')
    const autoTable = (await import('jspdf-autotable')).default

    const doc = new jsPDF()
    const now = new Date()

    // Header
    doc.setFillColor(11, 27, 58) // #0B1B3A
    doc.rect(0, 0, 210, 30, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('StayHaven Dashboard Report', 14, 14)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(formatDate(now), 14, 22)

    let y = 40
    doc.setTextColor(30, 30, 30)

    const addSection = (title: string, rows: (string | number)[][]) => {
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text(title, 14, y)
      y += 2
      autoTable(doc, {
        startY: y + 2,
        head: [['Metric', 'Value']],
        body: rows.map(r => [String(r[0]), String(r[1])]),
        theme: 'grid',
        headStyles: { fillColor: [217, 119, 6], textColor: 255, fontSize: 10 },
        bodyStyles: { fontSize: 9 },
        margin: { left: 14, right: 14 },
      })
      const lastTable = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable
      y = (lastTable?.finalY || y) + 10
    }

    if (enabled.overview) {
      addSection('Overview', [
        ['Total Revenue', formatNaira(stats.overview.totalRevenue)],
        ['Total Bookings', stats.overview.totalBookings.toLocaleString()],
        ['Registered Guests', stats.overview.totalGuests.toLocaleString()],
        ['Active Rooms', stats.overview.totalRooms.toLocaleString()],
      ])
    }

    if (enabled.today) {
      addSection("Today's Activity", [
        ['Revenue Today', formatNaira(stats.today.todayRevenue)],
        ['Check-ins Today', stats.today.todayCheckIns],
        ['Check-outs Today', stats.today.todayCheckOuts],
        ['New Bookings Today', stats.today.newBookingsToday],
      ])
    }

    if (enabled.thisMonth) {
      addSection('This Month', [
        ['Revenue (Month)', formatNaira(stats.thisMonth.monthRevenue)],
        ['Bookings (Month)', stats.thisMonth.monthBookings.toLocaleString()],
        ['Current Occupancy', `${stats.thisMonth.currentOccupancyRate}%`],
        ['Occupied / Total', `${stats.thisMonth.occupiedRooms} / ${stats.thisMonth.totalRooms}`],
      ])
    }

    if (enabled.recentBookings && stats.recent.recentBookings.length > 0) {
      if (y > 250) { doc.addPage(); y = 20 }
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('Recent Bookings', 14, y)
      autoTable(doc, {
        startY: y + 2,
        head: [['Ref', 'Guest', 'Room', 'Type', 'Amount', 'Status']],
        body: stats.recent.recentBookings.map(b => [
          b.bookingRef,
          b.guestName,
          b.roomNumber,
          b.roomType,
          formatNaira(b.amount),
          b.status.replace('_', ' '),
        ]),
        theme: 'grid',
        headStyles: { fillColor: [217, 119, 6], textColor: 255, fontSize: 10 },
        bodyStyles: { fontSize: 8 },
        margin: { left: 14, right: 14 },
      })
      const lastTable = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable
      y = (lastTable?.finalY || y) + 10
    }

    if (enabled.recentGuests && stats.recent.recentGuests.length > 0) {
      if (y > 250) { doc.addPage(); y = 20 }
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('Recent Guests', 14, y)
      autoTable(doc, {
        startY: y + 2,
        head: [['Name', 'Email', 'Joined']],
        body: stats.recent.recentGuests.map(g => [
          `${g.firstName} ${g.lastName}`,
          g.email,
          new Date(g.createdAt).toLocaleDateString('en-US'),
        ]),
        theme: 'grid',
        headStyles: { fillColor: [217, 119, 6], textColor: 255, fontSize: 10 },
        bodyStyles: { fontSize: 8 },
        margin: { left: 14, right: 14 },
      })
    }

    // Footer page numbers
    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(150, 150, 150)
      doc.text(`Page ${i} of ${pageCount} · StayHaven`, 14, 290)
    }

    doc.save(buildFilename('pdf'))
  }

  const exportExcel = async () => {
    if (!stats) return
    const XLSX = await import('xlsx')
    const wb = XLSX.utils.book_new()

    if (enabled.overview) {
      const ws = XLSX.utils.aoa_to_sheet([
        ['Metric', 'Value'],
        ['Total Revenue', stats.overview.totalRevenue],
        ['Total Bookings', stats.overview.totalBookings],
        ['Registered Guests', stats.overview.totalGuests],
        ['Active Rooms', stats.overview.totalRooms],
      ])
      XLSX.utils.book_append_sheet(wb, ws, 'Overview')
    }

    if (enabled.today) {
      const ws = XLSX.utils.aoa_to_sheet([
        ['Metric', 'Value'],
        ['Revenue Today', stats.today.todayRevenue],
        ['Check-ins Today', stats.today.todayCheckIns],
        ['Check-outs Today', stats.today.todayCheckOuts],
        ['New Bookings Today', stats.today.newBookingsToday],
      ])
      XLSX.utils.book_append_sheet(wb, ws, 'Today')
    }

    if (enabled.thisMonth) {
      const ws = XLSX.utils.aoa_to_sheet([
        ['Metric', 'Value'],
        ['Revenue (Month)', stats.thisMonth.monthRevenue],
        ['Bookings (Month)', stats.thisMonth.monthBookings],
        ['Occupancy Rate (%)', stats.thisMonth.currentOccupancyRate],
        ['Occupied Rooms', stats.thisMonth.occupiedRooms],
        ['Total Rooms', stats.thisMonth.totalRooms],
      ])
      XLSX.utils.book_append_sheet(wb, ws, 'This Month')
    }

    if (enabled.recentBookings) {
      const ws = XLSX.utils.json_to_sheet(
        stats.recent.recentBookings.map(b => ({
          'Booking Ref': b.bookingRef,
          Guest: b.guestName,
          Room: b.roomNumber,
          Type: b.roomType,
          Amount: b.amount,
          Status: b.status.replace('_', ' '),
          Created: new Date(b.createdAt).toISOString().slice(0, 10),
        }))
      )
      XLSX.utils.book_append_sheet(wb, ws, 'Recent Bookings')
    }

    if (enabled.recentGuests) {
      const ws = XLSX.utils.json_to_sheet(
        stats.recent.recentGuests.map(g => ({
          Name: `${g.firstName} ${g.lastName}`,
          Email: g.email,
          Joined: new Date(g.createdAt).toISOString().slice(0, 10),
        }))
      )
      XLSX.utils.book_append_sheet(wb, ws, 'Recent Guests')
    }

    XLSX.writeFile(wb, buildFilename('xlsx'))
  }

  const handleExport = async () => {
    if (!stats) return
    if (selectedCount === 0) {
      toast.error('Select at least one section to export')
      return
    }
    setBusy(true)
    try {
      if (format === 'pdf') await exportPdf()
      else await exportExcel()
      toast.success(`Dashboard exported as ${format.toUpperCase()}`)
      onClose()
    } catch (err) {
      console.error(err)
      toast.error('Export failed. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  if (!open || !stats) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-foreground/50 backdrop-blur-sm animate-modal-backdrop" onClick={busy ? undefined : onClose} />

      <div className="relative w-full max-w-4xl bg-foreground-inverse rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-modal-content">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-foreground font-heading font-bold text-lg">Export Dashboard</h2>
            <p className="text-foreground-tertiary text-xs">Choose a format, select sections, and preview your report</p>
          </div>
          <button onClick={onClose} disabled={busy} className="p-2 text-foreground-tertiary hover:text-foreground">
            <HiOutlineX size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="grid md:grid-cols-[280px_1fr]">
            {/* Controls */}
            <div className="p-5 border-r border-border bg-foreground-disabled/[0.02] space-y-5">
              <div>
                <p className="text-foreground-tertiary text-[11px] uppercase tracking-wider font-semibold mb-2">Format</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setFormat('pdf')}
                    disabled={busy}
                    className={`flex flex-col items-center gap-1 py-3 rounded-lg border text-xs font-medium transition-colors ${
                      format === 'pdf'
                        ? 'border-[#0B1B3A] bg-[#0B1B3A] text-white'
                        : 'border-border text-foreground hover:bg-foreground-disabled/5'
                    }`}
                  >
                    <HiOutlineDocumentText size={22} />
                    PDF
                  </button>
                  <button
                    onClick={() => setFormat('excel')}
                    disabled={busy}
                    className={`flex flex-col items-center gap-1 py-3 rounded-lg border text-xs font-medium transition-colors ${
                      format === 'excel'
                        ? 'border-[#0B1B3A] bg-[#0B1B3A] text-white'
                        : 'border-border text-foreground hover:bg-foreground-disabled/5'
                    }`}
                  >
                    <PiFileXlsBold size={22} />
                    Excel
                  </button>
                </div>
              </div>

              <div>
                <p className="text-foreground-tertiary text-[11px] uppercase tracking-wider font-semibold mb-2">Sections</p>
                <div className="flex flex-col gap-2">
                  {SECTIONS.map(s => (
                    <label key={s.key} className="flex items-center gap-2.5 cursor-pointer text-sm text-foreground">
                      <input
                        type="checkbox"
                        checked={enabled[s.key]}
                        onChange={() => toggle(s.key)}
                        disabled={busy}
                        className="w-4 h-4 rounded border-border accent-[#0B1B3A]"
                      />
                      {s.label}
                    </label>
                  ))}
                </div>
              </div>

              <p className="text-foreground-tertiary text-xs">
                {selectedCount} section{selectedCount !== 1 ? 's' : ''} selected
              </p>
            </div>

            {/* Preview */}
            <div className="p-5 bg-background-secondary overflow-y-auto">
              <p className="text-foreground-tertiary text-[11px] uppercase tracking-wider font-semibold mb-3">Preview</p>

              <div className="bg-foreground-inverse rounded-xl border border-border p-5 space-y-5">
                {/* Report header */}
                <div className="pb-3 border-b border-border">
                  <h3 className="text-foreground font-bold text-base">StayHaven Dashboard Report</h3>
                  <p className="text-foreground-tertiary text-xs">{formatDate(new Date())}</p>
                </div>

                {enabled.overview && (
                  <PreviewSection title="Overview" rows={[
                    ['Total Revenue', formatNaira(stats.overview.totalRevenue)],
                    ['Total Bookings', stats.overview.totalBookings.toLocaleString()],
                    ['Registered Guests', stats.overview.totalGuests.toLocaleString()],
                    ['Active Rooms', stats.overview.totalRooms.toLocaleString()],
                  ]} />
                )}
                {enabled.today && (
                  <PreviewSection title="Today's Activity" rows={[
                    ['Revenue Today', formatNaira(stats.today.todayRevenue)],
                    ['Check-ins Today', String(stats.today.todayCheckIns)],
                    ['Check-outs Today', String(stats.today.todayCheckOuts)],
                    ['New Bookings Today', String(stats.today.newBookingsToday)],
                  ]} />
                )}
                {enabled.thisMonth && (
                  <PreviewSection title="This Month" rows={[
                    ['Revenue (Month)', formatNaira(stats.thisMonth.monthRevenue)],
                    ['Bookings (Month)', stats.thisMonth.monthBookings.toLocaleString()],
                    ['Current Occupancy', `${stats.thisMonth.currentOccupancyRate}%`],
                    ['Occupied / Total', `${stats.thisMonth.occupiedRooms} / ${stats.thisMonth.totalRooms}`],
                  ]} />
                )}
                {enabled.recentBookings && (
                  <div>
                    <h4 className="text-foreground font-semibold text-sm mb-2">Recent Bookings</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-left text-foreground-tertiary text-[10px] uppercase tracking-wider border-b border-border">
                            <th className="py-1.5 pr-3 font-semibold">Ref</th>
                            <th className="py-1.5 pr-3 font-semibold">Guest</th>
                            <th className="py-1.5 pr-3 font-semibold">Room</th>
                            <th className="py-1.5 pr-3 font-semibold">Amount</th>
                            <th className="py-1.5 pr-3 font-semibold">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.recent.recentBookings.map(b => (
                            <tr key={b.id} className="border-b border-border last:border-0">
                              <td className="py-1.5 pr-3 font-mono text-[10px] text-foreground">{b.bookingRef}</td>
                              <td className="py-1.5 pr-3 text-foreground">{b.guestName}</td>
                              <td className="py-1.5 pr-3 text-foreground-secondary">{b.roomNumber}</td>
                              <td className="py-1.5 pr-3 text-foreground">{formatNaira(b.amount)}</td>
                              <td className="py-1.5 pr-3 text-foreground-secondary">{b.status.replace('_', ' ')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                {enabled.recentGuests && (
                  <div>
                    <h4 className="text-foreground font-semibold text-sm mb-2">Recent Guests</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-left text-foreground-tertiary text-[10px] uppercase tracking-wider border-b border-border">
                            <th className="py-1.5 pr-3 font-semibold">Name</th>
                            <th className="py-1.5 pr-3 font-semibold">Email</th>
                            <th className="py-1.5 pr-3 font-semibold">Joined</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.recent.recentGuests.map(g => (
                            <tr key={g.id} className="border-b border-border last:border-0">
                              <td className="py-1.5 pr-3 text-foreground">{g.firstName} {g.lastName}</td>
                              <td className="py-1.5 pr-3 text-foreground-secondary">{g.email}</td>
                              <td className="py-1.5 pr-3 text-foreground-secondary">{new Date(g.createdAt).toLocaleDateString('en-US')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {selectedCount === 0 && (
                  <p className="text-foreground-tertiary text-sm text-center py-10">
                    Select at least one section to preview
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-border">
          <p className="text-foreground-tertiary text-xs">
            Exported as <span className="font-semibold text-foreground">{format.toUpperCase()}</span>
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={busy}
              className="border border-border rounded-lg px-4 py-2 text-sm text-foreground hover:bg-foreground-disabled/5"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={busy || selectedCount === 0}
              className="bg-[#0B1B3A] text-white rounded-lg px-5 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
            >
              {busy ? (
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <HiOutlineDownload size={16} />
              )}
              {busy ? 'Exporting...' : 'Export'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function PreviewSection({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div>
      <h4 className="text-foreground font-semibold text-sm mb-2">{title}</h4>
      <table className="w-full text-xs">
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label} className="border-b border-border last:border-0">
              <td className="py-1.5 pr-3 text-foreground-secondary w-1/2">{label}</td>
              <td className="py-1.5 pr-3 text-foreground font-medium text-right">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default ExportDashboardModal
