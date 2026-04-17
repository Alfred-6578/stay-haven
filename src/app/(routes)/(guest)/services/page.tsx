'use client'
import React, { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import {
  HiOutlineClock,
  HiOutlineCalendar,
  HiOutlineExclamation,
  HiOutlineTrash,
} from 'react-icons/hi'
import { MdOutlineSpa, MdOutlineLocalLaundryService, MdOutlineRestaurant, MdOutlineMiscellaneousServices } from 'react-icons/md'
import { TbCar } from 'react-icons/tb'
import { IoWineOutline } from 'react-icons/io5'
import ServiceBookingModal from '@/component/services/ServiceBookingModal'

// ── Types ──

interface HotelService {
  id: string
  name: string
  description: string
  price: number | string
  category: string
  image: string | null
  isAvailable: boolean
}

interface ActiveBooking {
  id: string
  bookingRef: string
  checkIn: string
  checkOut: string
  status: string
  room?: { number: string }
}

interface ServiceBooking {
  id: string
  scheduledAt: string
  amount: number | string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  notes: string | null
  createdAt: string
  service: { id: string; name: string; category: string; image: string | null }
  booking: { bookingRef: string; room: { number: string } }
}

// ── Helpers ──

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  SPA: <MdOutlineSpa size={18} />,
  LAUNDRY: <MdOutlineLocalLaundryService size={18} />,
  TRANSPORT: <TbCar size={18} />,
  FOOD: <MdOutlineRestaurant size={18} />,
  BEVERAGE: <IoWineOutline size={18} />,
  OTHER: <MdOutlineMiscellaneousServices size={18} />,
}

const formatNaira = (v: number | string) =>
  `₦${new Intl.NumberFormat('en-NG', { maximumFractionDigits: 0 }).format(Number(v))}`

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  PENDING: { bg: 'bg-warning-bg', text: 'text-warning' },
  APPROVED: { bg: 'bg-success-bg', text: 'text-success' },
  REJECTED: { bg: 'bg-danger-bg', text: 'text-danger' },
}

// ── Component ──

export default function GuestServicesPage() {
  const [grouped, setGrouped] = useState<Record<string, HotelService[]>>({})
  const [myBookings, setMyBookings] = useState<ServiceBooking[]>([])
  const [activeBookings, setActiveBookings] = useState<ActiveBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'browse' | 'mine'>('browse')

  // Modal
  const [bookService, setBookService] = useState<HotelService | null>(null)

  const fetchAll = useCallback(async () => {
    try {
      const [svcRes, myRes, bkRes] = await Promise.all([
        api.get('/services'),
        api.get('/services/bookings?limit=50'),
        api.get('/guest/bookings?status=CONFIRMED&limit=50'),
      ])
      const svcData = svcRes.data.data
      setGrouped(svcData.grouped || {})
      setMyBookings(myRes.data.data.bookings || [])
      const upcoming = bkRes.data.data.upcoming || []
      setActiveBookings(
        upcoming.filter((b: ActiveBooking) => ['CONFIRMED', 'CHECKED_IN'].includes(b.status))
      )
    } catch {
      toast.error('Failed to load services')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const handleCancel = async (id: string) => {
    try {
      await api.delete(`/services/bookings/${id}`)
      toast.success('Service request cancelled')
      fetchAll()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to cancel'
      toast.error(msg)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="h-10 w-48 bg-foreground-disabled/10 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 vsm:grid-cols-2 gap-3">
          {[0, 1, 2, 3].map(i => <div key={i} className="h-44 bg-foreground-disabled/10 rounded-2xl animate-pulse" />)}
        </div>
      </div>
    )
  }

  const categories = Object.keys(grouped)

  return (
    <div>
      <h1 className="text-foreground font-heading text-2xl vsm:text-3xl font-bold mb-1">Hotel Services</h1>
      <p className="text-foreground-tertiary text-sm mb-6">
        Request services during your stay — spa, laundry, transport, and more.
      </p>

      {/* Tabs */}
      <div className="flex gap-1 bg-foreground-disabled/10 p-1 rounded-lg w-max mb-6">
        {(['browse', 'mine'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === t ? 'bg-foreground text-foreground-inverse' : 'text-foreground-secondary hover:text-foreground'
            }`}
          >
            {t === 'browse' ? 'Browse Services' : `My Requests (${myBookings.length})`}
          </button>
        ))}
      </div>

      {/* ── Browse Tab ── */}
      {tab === 'browse' && (
        <>
          {activeBookings.length === 0 && (
            <div className="bg-warning-bg/30 border border-warning/30 rounded-xl p-4 mb-6 flex items-start gap-2">
              <HiOutlineExclamation size={16} className="text-warning mt-0.5 shrink-0" />
              <p className="text-foreground text-sm">
                You need an active (confirmed or checked-in) booking to request services.
              </p>
            </div>
          )}

          {categories.length === 0 ? (
            <p className="text-foreground-tertiary text-sm text-center py-10">No services available at the moment.</p>
          ) : (
            categories.map(cat => (
              <section key={cat} className="mb-8">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-foreground-tertiary">{CATEGORY_ICONS[cat] || CATEGORY_ICONS.OTHER}</span>
                  <h2 className="text-foreground font-semibold text-sm uppercase tracking-wider">
                    {cat.charAt(0) + cat.slice(1).toLowerCase()}
                  </h2>
                </div>
                <div className="grid grid-cols-1 vsm:grid-cols-2 gap-3">
                  {grouped[cat].map(svc => (
                    <article
                      key={svc.id}
                      className="border border-border rounded-2xl overflow-hidden bg-foreground-inverse hover:border-foreground-disabled/50 transition-colors"
                    >
                      {svc.image && (
                        <div className="relative h-32 vsm:h-36">
                          <Image src={svc.image} alt={svc.name} fill className="object-cover" />
                        </div>
                      )}
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="text-foreground font-semibold text-sm">{svc.name}</h3>
                          <span className="text-foreground font-bold text-sm whitespace-nowrap">
                            {formatNaira(svc.price)}
                          </span>
                        </div>
                        <p className="text-foreground-tertiary text-xs line-clamp-2 mb-3">{svc.description}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-foreground-tertiary text-[10px] uppercase tracking-wider font-semibold bg-foreground-disabled/10 px-2 py-0.5 rounded-full">
                            {cat}
                          </span>
                          <button
                            onClick={() => setBookService(svc)}
                            disabled={activeBookings.length === 0}
                            className="bg-foreground text-foreground-inverse text-xs font-semibold px-4 py-1.5 rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Book
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))
          )}
        </>
      )}

      {/* ── My Requests Tab ── */}
      {tab === 'mine' && (
        <div>
          {myBookings.length === 0 ? (
            <div className="text-center py-10">
              <HiOutlineClock size={28} className="text-foreground-disabled mx-auto mb-3" />
              <p className="text-foreground-tertiary text-sm mb-3">No service requests yet.</p>
              <button
                onClick={() => setTab('browse')}
                className="text-foreground text-xs font-semibold hover:underline"
              >
                Browse services
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-foreground-tertiary text-[11px] uppercase tracking-wider border-b border-border">
                    <th className="py-2 px-2 font-semibold">Service</th>
                    <th className="py-2 px-2 font-semibold">Scheduled</th>
                    <th className="py-2 px-2 font-semibold">Status</th>
                    <th className="py-2 px-2 font-semibold">Amount</th>
                    <th className="py-2 px-2 font-semibold max-md:hidden">Booking</th>
                    <th className="py-2 px-2 font-semibold text-right" />
                  </tr>
                </thead>
                <tbody>
                  {myBookings.map(sb => {
                    const colors = STATUS_COLORS[sb.status] || STATUS_COLORS.PENDING
                    const canCancel =
                      sb.status === 'PENDING' &&
                      (new Date(sb.scheduledAt).getTime() - Date.now()) > 24 * 60 * 60 * 1000
                    return (
                      <tr key={sb.id} className="border-b border-border last:border-0">
                        <td className="py-3 px-2">
                          <p className="text-foreground font-medium">{sb.service.name}</p>
                          {sb.notes && <p className="text-foreground-tertiary text-xs italic mt-0.5 line-clamp-1">{sb.notes}</p>}
                        </td>
                        <td className="py-3 px-2 whitespace-nowrap">
                          <div className="flex items-center gap-1 text-foreground-secondary text-xs">
                            <HiOutlineCalendar size={12} />
                            {new Date(sb.scheduledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </div>
                          <div className="flex items-center gap-1 text-foreground-tertiary text-xs">
                            <HiOutlineClock size={12} />
                            {new Date(sb.scheduledAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <span className={`${colors.bg} ${colors.text} text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider`}>
                            {sb.status}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-foreground font-medium">{formatNaira(sb.amount)}</td>
                        <td className="py-3 px-2 text-foreground-tertiary text-xs max-md:hidden">
                          Room {sb.booking.room.number} · {sb.booking.bookingRef}
                        </td>
                        <td className="py-3 px-2 text-right">
                          {canCancel && (
                            <button
                              onClick={() => handleCancel(sb.id)}
                              className="text-danger text-xs font-medium hover:underline flex items-center gap-1 ml-auto"
                            >
                              <HiOutlineTrash size={12} />
                              Cancel
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Booking Modal */}
      <ServiceBookingModal
        service={bookService}
        bookings={activeBookings}
        onClose={() => setBookService(null)}
        onSuccess={fetchAll}
      />
    </div>
  )
}
