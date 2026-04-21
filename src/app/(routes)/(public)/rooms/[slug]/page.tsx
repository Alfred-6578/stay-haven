'use client'
import React, { useCallback, useState, useEffect, useRef, Suspense } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import Footer from '@/component/landingPage/Footer'
import ImageGallery from '@/component/rooms/ImageGallery'
import Lightbox from '@/component/rooms/Lightbox'
import RoomInfo from '@/component/rooms/RoomInfo'
import BookingCard from '@/component/rooms/BookingCard'
import EmptyState from '@/component/ui/EmptyState'
import ErrorState from '@/component/ui/ErrorState'
import { SkeletonBar } from '@/component/ui/PageSkeleton'
import { MdOutlineKingBed } from 'react-icons/md'
import { IoChevronForward } from 'react-icons/io5'

interface RoomType {
  id: string
  name: string
  slug: string
  tag: string | null
  image: string | null
  images: string[]
  description: string
  basePrice: string | number
  weekendMultiplier: string | number
  capacity: number
  amenities: string[]
  rooms: Array<{ id: string; number: string; floor: number; status: string }>
}

interface AvailabilityResult {
  room: { id: string; number: string; floor: number; roomType: RoomType }
  baseAmount: number
  taxAmount: number
  totalAmount: number
  totalNights: number
}

function RoomDetailContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuth()
  const slug = params.slug as string

  const [roomType, setRoomType] = useState<RoomType | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [loadError, setLoadError] = useState(false)

  const [checkIn, setCheckIn] = useState(searchParams.get('checkIn') || '')
  const [checkOut, setCheckOut] = useState(searchParams.get('checkOut') || '')
  const [guests, setGuests] = useState(searchParams.get('adults') || '1')
  const [availability, setAvailability] = useState<AvailabilityResult[]>([])
  const [availLoading, setAvailLoading] = useState(false)
  const [selectedRooms, setSelectedRooms] = useState<string[]>([])

  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIdx, setLightboxIdx] = useState(0)

  const galleryRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [vis, setVis] = useState({ gallery: false, content: false })

  useEffect(() => {
    const observers: IntersectionObserver[] = []
    const pairs: [string, React.RefObject<HTMLDivElement | null>][] = [
      ['gallery', galleryRef],
      ['content', contentRef],
    ]
    for (const [key, ref] of pairs) {
      const el = ref.current
      if (!el) continue
      const obs = new IntersectionObserver(
        ([e]) => { if (e.isIntersecting) { setVis(p => ({ ...p, [key]: true })); obs.disconnect() } },
        { threshold: 0.08 }
      )
      obs.observe(el)
      observers.push(obs)
    }
    return () => observers.forEach(o => o.disconnect())
  }, [loading])

  const loadRoomType = useCallback(async () => {
    setLoading(true)
    setLoadError(false)
    setNotFound(false)
    try {
      const res = await api.get(`/rooms/types/${slug}`)
      setRoomType(res.data.data)
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 404) setNotFound(true)
      else setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => { loadRoomType() }, [loadRoomType])

  useEffect(() => {
    if (!checkIn || !checkOut || !roomType) return
    setAvailLoading(true)
    setSelectedRooms([])
    ;(async () => {
      try {
        const p = new URLSearchParams({ checkIn, checkOut, adults: guests, typeId: roomType.id })
        const res = await api.get(`/rooms/available?${p}`)
        setAvailability(res.data.data)
      } catch {
        setAvailability([])
      } finally {
        setAvailLoading(false)
      }
    })()
  }, [checkIn, checkOut, guests, roomType])

  const allImages = roomType ? [roomType.image, ...roomType.images].filter(Boolean) as string[] : []
  const availableCount = roomType?.rooms.filter(r => r.status === 'AVAILABLE').length || 0

  const handleBook = () => {
    // Use `roomIds` (comma-separated) so the /book page can handle 1 or N
    const idsParam = selectedRooms.join(',')
    const bookParams = `roomIds=${idsParam}&checkIn=${checkIn}&checkOut=${checkOut}&adults=${guests}`
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(`/book?${bookParams}`)}`)
      return
    }
    router.push(`/book?${bookParams}`)
  }

  const toggleRoom = (roomId: string) => {
    setSelectedRooms(prev =>
      prev.includes(roomId) ? prev.filter(id => id !== roomId) : [...prev, roomId]
    )
  }

  if (loading) {
    return (
      <div className="bg-foreground-inverse min-h-screen">
        <div className="px-4 vsm:px-8 pt-6">
          <SkeletonBar className="h-4 w-40 mb-6" />
          <div className="grid lg:grid-cols-3 gap-3 mb-8">
            <SkeletonBar className="lg:col-span-2 h-72 vsm:h-96 rounded-2xl" />
            <div className="hidden lg:grid grid-rows-2 gap-3">
              <SkeletonBar className="rounded-2xl" />
              <SkeletonBar className="rounded-2xl" />
            </div>
          </div>
          <div className="grid lg:grid-cols-3 gap-8 lg:gap-10">
            <div className="lg:col-span-2 flex flex-col gap-3">
              <SkeletonBar className="h-8 w-2/3" />
              <SkeletonBar className="h-4 w-1/3" />
              <SkeletonBar className="h-24 mt-3" />
              <SkeletonBar className="h-20 mt-3" />
            </div>
            <SkeletonBar className="h-96 rounded-2xl" />
          </div>
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="bg-foreground-inverse min-h-screen flex items-center justify-center px-5">
        <ErrorState
          title="Couldn't load this room"
          description="We had trouble fetching this room type. Please try again."
          onRetry={loadRoomType}
          homeHref="/rooms"
        />
      </div>
    )
  }

  if (notFound || !roomType) {
    return (
      <div className="bg-foreground-inverse min-h-screen flex items-center justify-center px-5">
        <EmptyState
          icon={<MdOutlineKingBed />}
          title="Room not found"
          description="This room type doesn't exist or has been removed. Browse our available rooms to find your perfect stay."
          actionLabel="Back to Rooms"
          actionHref="/rooms"
        />
      </div>
    )
  }

  return (
    <div className="bg-foreground-inverse">
      {/* Breadcrumb */}
      <div className="px-4 vsm:px-8 py-4">
        <div className="flex items-center gap-1.5 text-sm">
          <Link href="/" className="text-foreground-tertiary hover:text-foreground transition-colors">Home</Link>
          <IoChevronForward className="text-foreground-disabled text-xs" />
          <Link href="/rooms" className="text-foreground-tertiary hover:text-foreground transition-colors">Rooms</Link>
          <IoChevronForward className="text-foreground-disabled text-xs" />
          <span className="text-foreground font-medium">{roomType.name}</span>
        </div>
      </div>

      {/* Gallery */}
      <div ref={galleryRef} className="px-4 vsm:px-8 pb-8">
        <ImageGallery
          images={allImages}
          name={roomType.name}
          tag={roomType.tag}
          onImageClick={(idx) => { setLightboxIdx(idx); setLightboxOpen(true) }}
          visible={vis.gallery}
        />
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <Lightbox
          images={allImages}
          activeIndex={lightboxIdx}
          onClose={() => setLightboxOpen(false)}
          onPrev={() => setLightboxIdx(p => (p - 1 + allImages.length) % allImages.length)}
          onNext={() => setLightboxIdx(p => (p + 1) % allImages.length)}
          onDotClick={setLightboxIdx}
          alt={roomType.name}
        />
      )}

      {/* Content: Info + Booking */}
      <div ref={contentRef} className="px-4 vsm:px-8 pb-16">
        <div className="grid lg:grid-cols-3 gap-8 lg:gap-10">
          <RoomInfo
            name={roomType.name}
            tag={roomType.tag}
            description={roomType.description}
            capacity={roomType.capacity}
            amenities={roomType.amenities}
            basePrice={Number(roomType.basePrice)}
            weekendMultiplier={Number(roomType.weekendMultiplier)}
            rooms={roomType.rooms}
            availableCount={availableCount}
            selectedRoom={selectedRooms[0] || null}
            visible={vis.content}
          />
          <BookingCard
            basePrice={Number(roomType.basePrice)}
            weekendMultiplier={Number(roomType.weekendMultiplier)}
            capacity={roomType.capacity}
            checkIn={checkIn}
            checkOut={checkOut}
            guests={guests}
            onCheckInChange={setCheckIn}
            onCheckOutChange={setCheckOut}
            onGuestsChange={setGuests}
            availability={availability}
            availLoading={availLoading}
            selectedRooms={selectedRooms}
            onRoomToggle={toggleRoom}
            onBook={handleBook}
            visible={vis.content}
          />
        </div>
      </div>

      <Footer />
    </div>
  )
}

export default function RoomDetailPage() {
  return (
    <Suspense fallback={
      <div className="bg-foreground-inverse min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <RoomDetailContent />
    </Suspense>
  )
}
