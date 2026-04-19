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
  HiOutlineCheck,
  HiOutlineX,
} from 'react-icons/hi'
import {
  MdOutlineSpa,
  MdOutlineLocalLaundryService,
  MdOutlineRestaurant,
  MdOutlineMiscellaneousServices,
} from 'react-icons/md'
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

const CATEGORY_META: Record<string, { icon: React.ReactNode; label: string; color: string; bg: string }> = {
  SPA: { icon: <MdOutlineSpa size={20} />, label: 'Spa & Wellness', color: 'text-[#7C3AED]', bg: 'bg-[#F4E8FF]' },
  LAUNDRY: { icon: <MdOutlineLocalLaundryService size={20} />, label: 'Laundry', color: 'text-[#8A6A20]', bg: 'bg-[#FAEEDA]' },
  TRANSPORT: { icon: <TbCar size={20} />, label: 'Transport', color: 'text-[#0369A1]', bg: 'bg-[#E0F2FE]' },
  FOOD: { icon: <MdOutlineRestaurant size={20} />, label: 'Food & Dining', color: 'text-[#4A6B2E]', bg: 'bg-[#EAF3DE]' },
  BEVERAGE: { icon: <IoWineOutline size={20} />, label: 'Beverages', color: 'text-[#991B1B]', bg: 'bg-[#FEE2E2]' },
  OTHER: { icon: <MdOutlineMiscellaneousServices size={20} />, label: 'Other', color: 'text-foreground-secondary', bg: 'bg-foreground-disabled/10' },
}

const formatNaira = (v: number | string) =>
  `₦${new Intl.NumberFormat('en-NG', { maximumFractionDigits: 0 }).format(Number(v))}`

const STATUS_CONFIG: Record<string, { bg: string; text: string; icon: React.ReactNode; label: string }> = {
  PENDING: {
    bg: 'bg-warning-bg',
    text: 'text-warning',
    icon: <HiOutlineClock size={14} />,
    label: 'Pending Review',
  },
  APPROVED: {
    bg: 'bg-success-bg',
    text: 'text-success',
    icon: <HiOutlineCheck size={14} />,
    label: 'Confirmed',
  },
  REJECTED: {
    bg: 'bg-danger-bg',
    text: 'text-danger',
    icon: <HiOutlineX size={14} />,
    label: 'Unavailable',
  },
}

// ── Component ──

export default function GuestServicesPage() {
  const [grouped, setGrouped] = useState<Record<string, HotelService[]>>({})
  const [myBookings, setMyBookings] = useState<ServiceBooking[]>([])
  const [activeBookings, setActiveBookings] = useState<ActiveBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'browse' | 'mine'>('browse')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

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
        <div className="grid grid-cols-2 vsm:grid-cols-3 gap-3">
          {[0, 1, 2, 3, 4, 5].map(i => <div key={i} className="h-14 bg-foreground-disabled/10 rounded-xl animate-pulse" />)}
        </div>
        <div className="grid grid-cols-1 vsm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {[0, 1, 2].map(i => <div key={i} className="h-56 bg-foreground-disabled/10 rounded-2xl animate-pulse" />)}
        </div>
      </div>
    )
  }

  const categories = Object.keys(grouped)
  const pendingCount = myBookings.filter(b => b.status === 'PENDING').length
  const approvedCount = myBookings.filter(b => b.status === 'APPROVED').length

  // Filter services by selected category
  const displayedServices = selectedCategory
    ? grouped[selectedCategory] || []
    : categories.flatMap(cat => grouped[cat])

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-foreground font-heading text-2xl vsm:text-3xl font-bold mb-1">
          Hotel Services
        </h1>
        <p className="text-foreground-tertiary text-sm">
          Request services during your stay — spa, laundry, transport, and more.
        </p>
      </div>

      {/* Quick stats strip */}
      {myBookings.length > 0 && (
        <div className="flex gap-3 mb-6">
          {pendingCount > 0 && (
            <button
              onClick={() => setTab('mine')}
              className="flex items-center gap-2 bg-warning-bg border border-warning/20 rounded-xl px-4 py-2.5 hover:border-warning/40 transition-colors"
            >
              <HiOutlineClock size={16} className="text-warning" />
              <div className="text-left">
                <p className="text-foreground text-sm font-semibold">{pendingCount} pending</p>
                <p className="text-foreground-tertiary text-[10px]">Awaiting review</p>
              </div>
            </button>
          )}
          {approvedCount > 0 && (
            <button
              onClick={() => setTab('mine')}
              className="flex items-center gap-2 bg-success-bg border border-success/20 rounded-xl px-4 py-2.5 hover:border-success/40 transition-colors"
            >
              <HiOutlineCheck size={16} className="text-success" />
              <div className="text-left">
                <p className="text-foreground text-sm font-semibold">{approvedCount} confirmed</p>
                <p className="text-foreground-tertiary text-[10px]">Upcoming services</p>
              </div>
            </button>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-foreground-disabled/10 p-1 rounded-xl w-max mb-6">
        {(['browse', 'mine'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t
                ? 'bg-foreground text-foreground-inverse shadow-sm'
                : 'text-foreground-secondary hover:text-foreground'
            }`}
          >
            {t === 'browse' ? 'Browse' : `My Requests${myBookings.length > 0 ? ` (${myBookings.length})` : ''}`}
          </button>
        ))}
      </div>

      {/* ═══ Browse Tab ═══ */}
      {tab === 'browse' && (
        <>
          {activeBookings.length === 0 && (
            <div className="bg-warning-bg/30 border border-warning/30 rounded-2xl p-5 mb-6 flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center shrink-0">
                <HiOutlineExclamation size={20} className="text-warning" />
              </div>
              <div>
                <p className="text-foreground font-semibold text-sm">No active booking</p>
                <p className="text-foreground-secondary text-xs mt-0.5">
                  You need a confirmed or checked-in booking to request hotel services.
                </p>
              </div>
            </div>
          )}

          {/* Category filter chips */}
          {categories.length > 0 && (
            <div className="flex gap-2 mb-6 overflow-x-auto pb-1 -mx-5 vsm:-mx-8 px-5 vsm:px-8">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`shrink-0 px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  !selectedCategory
                    ? 'border-foreground bg-foreground text-foreground-inverse'
                    : 'border-border text-foreground-secondary hover:border-foreground/30'
                }`}
              >
                All ({displayedServices.length})
              </button>
              {categories.map(cat => {
                const meta = CATEGORY_META[cat] || CATEGORY_META.OTHER
                const isActive = selectedCategory === cat
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(isActive ? null : cat)}
                    className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      isActive
                        ? `${meta.bg} ${meta.color} border-current`
                        : 'border-border text-foreground-secondary hover:border-foreground/30'
                    }`}
                  >
                    {meta.icon}
                    {meta.label}
                    <span className="text-foreground-tertiary ml-0.5">({grouped[cat].length})</span>
                  </button>
                )
              })}
            </div>
          )}

          {/* Services grid */}
          {displayedServices.length === 0 ? (
            <div className="text-center py-16">
              <MdOutlineMiscellaneousServices size={32} className="text-foreground-disabled mx-auto mb-3" />
              <p className="text-foreground-tertiary text-sm">No services available at the moment.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 vsm:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayedServices.map(svc => {
                const meta = CATEGORY_META[svc.category] || CATEGORY_META.OTHER
                return (
                  <article
                    key={svc.id}
                    className="group border border-border rounded-2xl overflow-hidden bg-foreground-inverse hover:shadow-md hover:border-foreground-disabled/50 transition-all"
                  >
                    {/* Image */}
                    <div className="relative h-40 overflow-hidden">
                      {svc.image ? (
                        <Image
                          src={svc.image}
                          alt={svc.name}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className={`w-full h-full ${meta.bg} flex items-center justify-center`}>
                          <span className={`${meta.color} opacity-40 [&>svg]:w-12 [&>svg]:h-12`}>
                            {meta.icon}
                          </span>
                        </div>
                      )}
                      {/* Category chip overlay */}
                      <div className="absolute top-3 left-3">
                        <span className={`${meta.bg} ${meta.color} text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider backdrop-blur-sm`}>
                          {meta.label}
                        </span>
                      </div>
                      {/* Price overlay */}
                      <div className="absolute bottom-3 right-3">
                        <span className="bg-foreground/80 text-foreground-inverse text-xs font-bold px-3 py-1.5 rounded-lg backdrop-blur-sm">
                          {formatNaira(svc.price)}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <h3 className="text-foreground font-semibold text-base mb-1">{svc.name}</h3>
                      <p className="text-foreground-tertiary text-xs leading-relaxed line-clamp-2 mb-4">
                        {svc.description}
                      </p>
                      <button
                        onClick={() => setBookService(svc)}
                        disabled={activeBookings.length === 0}
                        className="w-full bg-foreground text-foreground-inverse text-sm font-semibold py-2.5 rounded-xl hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                      >
                        Request Service
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ═══ My Requests Tab ═══ */}
      {tab === 'mine' && (
        <div>
          {myBookings.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-full bg-foreground-disabled/10 flex items-center justify-center mx-auto mb-4">
                <MdOutlineMiscellaneousServices size={28} className="text-foreground-tertiary" />
              </div>
              <h3 className="text-foreground font-semibold text-lg mb-1">No requests yet</h3>
              <p className="text-foreground-tertiary text-sm mb-5 max-w-xs mx-auto">
                Browse our available services and request what you need for your stay.
              </p>
              <button
                onClick={() => setTab('browse')}
                className="bg-foreground text-foreground-inverse text-sm font-semibold px-6 py-2.5 rounded-xl hover:opacity-90"
              >
                Browse Services
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {myBookings.map(sb => {
                const config = STATUS_CONFIG[sb.status] || STATUS_CONFIG.PENDING
                const meta = CATEGORY_META[sb.service.category] || CATEGORY_META.OTHER
                const canCancel =
                  sb.status === 'PENDING' &&
                  (new Date(sb.scheduledAt).getTime() - Date.now()) > 24 * 60 * 60 * 1000
                const isPast = new Date(sb.scheduledAt) < new Date()

                return (
                  <div
                    key={sb.id}
                    className={`border rounded-2xl overflow-hidden bg-foreground-inverse transition-colors ${
                      sb.status === 'APPROVED'
                        ? 'border-success/20'
                        : sb.status === 'REJECTED'
                          ? 'border-danger/20'
                          : 'border-border'
                    }`}
                  >
                    <div className="flex gap-4 p-4">
                      {/* Service image / icon */}
                      <div className={`w-14 h-14 rounded-xl overflow-hidden shrink-0 flex items-center justify-center ${meta.bg}`}>
                        {sb.service.image ? (
                          <Image src={sb.service.image} alt={sb.service.name} width={56} height={56} className="object-cover w-full h-full" />
                        ) : (
                          <span className={meta.color}>{meta.icon}</span>
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="min-w-0">
                            <h4 className="text-foreground font-semibold text-sm">{sb.service.name}</h4>
                            <p className="text-foreground-tertiary text-xs">
                              Room {sb.booking.room.number} · {sb.booking.bookingRef}
                            </p>
                          </div>
                          <span className={`${config.bg} ${config.text} text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shrink-0`}>
                            {config.icon}
                            {config.label}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 mt-2 text-xs">
                          <span className="flex items-center gap-1 text-foreground-secondary">
                            <HiOutlineCalendar size={13} />
                            {new Date(sb.scheduledAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                          </span>
                          <span className="flex items-center gap-1 text-foreground-secondary">
                            <HiOutlineClock size={13} />
                            {new Date(sb.scheduledAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          </span>
                          <span className="text-foreground font-semibold">{formatNaira(sb.amount)}</span>
                        </div>

                        {sb.notes && (
                          <p className="text-foreground-tertiary text-xs italic mt-2 line-clamp-1">
                            &ldquo;{sb.notes}&rdquo;
                          </p>
                        )}

                        {/* Action row */}
                        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-foreground/5">
                          <p className="text-foreground-tertiary text-[10px]">
                            {isPast ? 'Past service' : `In ${Math.ceil((new Date(sb.scheduledAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} day(s)`}
                          </p>
                          {canCancel && (
                            <button
                              onClick={() => handleCancel(sb.id)}
                              className="flex items-center gap-1 text-danger text-xs font-medium hover:underline"
                            >
                              <HiOutlineTrash size={12} />
                              Cancel Request
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
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
