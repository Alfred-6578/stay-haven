'use client'
import React, { useState, useEffect, useRef, Suspense } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import Button from '@/component/ui/Button'
import Footer from '@/component/landingPage/Footer'
import ImageGallery from '@/component/rooms/ImageGallery'
import Lightbox from '@/component/rooms/Lightbox'
import RoomInfo from '@/component/rooms/RoomInfo'
import BookingCard from '@/component/rooms/BookingCard'
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
  const [error, setError] = useState('')

  const [checkIn, setCheckIn] = useState(searchParams.get('checkIn') || '')
  const [checkOut, setCheckOut] = useState(searchParams.get('checkOut') || '')
  const [guests, setGuests] = useState(searchParams.get('adults') || '1')
  const [availability, setAvailability] = useState<AvailabilityResult[]>([])
  const [availLoading, setAvailLoading] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null)

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

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get(`/rooms/types/${slug}`)
        setRoomType(res.data.data)
      } catch {
        setError('Room type not found')
      } finally {
        setLoading(false)
      }
    })()
  }, [slug])

  useEffect(() => {
    if (!checkIn || !checkOut || !roomType) return
    setAvailLoading(true)
    setSelectedRoom(null)
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
    const bookParams = `roomId=${selectedRoom}&checkIn=${checkIn}&checkOut=${checkOut}&adults=${guests}`
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(`/book?${bookParams}`)}`)
      return
    }
    router.push(`/book?${bookParams}`)
  }

  if (loading) {
    return (
      <div className="bg-foreground-inverse min-h-screen">
        <div className="px-4 vsm:px-8 pt-6 animate-pulse">
          <div className="h-4 w-40 bg-foreground-disabled/20 rounded mb-6" />
          <div className="grid lg:grid-cols-3 gap-3 mb-8">
            <div className="lg:col-span-2 h-72 vsm:h-96 bg-foreground-disabled/15 rounded-2xl" />
            <div className="hidden lg:grid grid-rows-2 gap-3">
              <div className="bg-foreground-disabled/15 rounded-2xl" />
              <div className="bg-foreground-disabled/15 rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !roomType) {
    return (
      <div className="bg-foreground-inverse min-h-screen flex flex-col items-center justify-center px-5">
        <MdOutlineKingBed className="text-foreground-disabled text-6xl mb-4" />
        <h2 className="text-foreground text-2xl font-heading font-semibold mb-2">Room Not Found</h2>
        <p className="text-foreground-tertiary text-sm mb-6">This room type doesn&apos;t exist or has been removed.</p>
        <Button href="/rooms" variant="outline">Back to Rooms</Button>
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
            selectedRoom={selectedRoom}
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
            selectedRoom={selectedRoom}
            onRoomSelect={setSelectedRoom}
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
