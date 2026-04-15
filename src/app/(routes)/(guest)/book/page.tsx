'use client'
import React, { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import BookingStepIndicator from '@/component/booking/BookingStepIndicator'
import BookingStepReview from '@/component/booking/BookingStepReview'
import BookingStepLoyalty from '@/component/booking/BookingStepLoyalty'
import BookingStepPayment from '@/component/booking/BookingStepPayment'
import { HiOutlineArrowLeft } from 'react-icons/hi'
import { MdOutlineKingBed } from 'react-icons/md'

interface RoomTypeSummary {
  id: string
  name: string
  slug: string
  image: string | null
  basePrice: string | number
  weekendMultiplier: string | number
  capacity: number
}

interface AvailableRow {
  room: { id: string; number: string; floor: number }
  baseAmount: number
  taxAmount: number
  totalAmount: number
  totalNights: number
}

interface PricingData {
  baseAmount: number    // combined across all selected rooms
  taxAmount: number
  totalAmount: number
  totalNights: number
  nightBreakdown: Array<{ date: string; isWeekend: boolean; price: number }>
}

function BookPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuth()

  // Accept either roomId (legacy single-room link) or roomIds (CSV, multi-room)
  const roomIdsParam =
    searchParams.get('roomIds') || searchParams.get('roomId') || ''
  const roomIds = roomIdsParam
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
  const checkIn = searchParams.get('checkIn') || ''
  const checkOut = searchParams.get('checkOut') || ''
  const adults = parseInt(searchParams.get('adults') || '1', 10)

  const [step, setStep] = useState(1)
  const [roomType, setRoomType] = useState<RoomTypeSummary | null>(null)
  const [selectedRoomsInfo, setSelectedRoomsInfo] = useState<AvailableRow[]>([])
  const [pricing, setPricing] = useState<PricingData | null>(null)
  const [guestPoints, setGuestPoints] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Loyalty
  const [pointsUsed, setPointsUsed] = useState(0)
  const [discount, setDiscount] = useState(0)

  useEffect(() => {
    if (roomIds.length === 0 || !checkIn || !checkOut) {
      setError('Missing booking parameters')
      setLoading(false)
      return
    }

    (async () => {
      try {
        // 1) Fetch the first room's type for hero/name (all rooms share a type
        //    since the room-detail flow only allows same-type multi-select)
        const firstRoomRes = await api.get(`/rooms/${roomIds[0]}`)
        const firstRoom = firstRoomRes.data.data
        const rt: RoomTypeSummary = {
          id: firstRoom.roomType?.id || firstRoom.roomTypeId,
          name: firstRoom.roomType.name,
          slug: firstRoom.roomType.slug,
          image: firstRoom.roomType.image,
          basePrice: firstRoom.roomType.basePrice,
          weekendMultiplier: firstRoom.roomType.weekendMultiplier,
          capacity: firstRoom.roomType.capacity,
        }
        setRoomType(rt)

        // 2) Fetch live availability for the selected type so we can verify
        //    every requested room is still bookable and grab per-room pricing.
        const params = new URLSearchParams({
          checkIn,
          checkOut,
          adults: String(adults),
          typeId: rt.id,
        })
        const availRes = await api.get(`/rooms/available?${params}`)
        const available = availRes.data.data as AvailableRow[]
        const matches = roomIds
          .map(id => available.find(a => a.room.id === id))
          .filter((a): a is AvailableRow => !!a)

        if (matches.length !== roomIds.length) {
          setError('One or more rooms are no longer available for these dates')
          setLoading(false)
          return
        }

        setSelectedRoomsInfo(matches)

        const combinedBase = matches.reduce((s, m) => s + m.baseAmount, 0)
        const combinedTax = matches.reduce((s, m) => s + m.taxAmount, 0)
        const combinedTotal = matches.reduce((s, m) => s + m.totalAmount, 0)
        const nights = matches[0].totalNights

        // Night breakdown — per-room (multiplier applied in review via × rooms)
        const basePrice = Number(rt.basePrice)
        const weekendMult = Number(rt.weekendMultiplier)
        const breakdown: PricingData['nightBreakdown'] = []
        const current = new Date(checkIn)
        const end = new Date(checkOut)
        while (current < end) {
          const day = current.getDay()
          const isWeekend = day === 0 || day === 6
          breakdown.push({
            date: current.toISOString().split('T')[0],
            isWeekend,
            price: isWeekend ? basePrice * weekendMult : basePrice,
          })
          current.setDate(current.getDate() + 1)
        }

        setPricing({
          baseAmount: combinedBase,
          taxAmount: combinedTax,
          totalAmount: combinedTotal,
          totalNights: nights,
          nightBreakdown: breakdown,
        })

        if (user) {
          try {
            const meRes = await api.get('/auth/me')
            setGuestPoints(meRes.data.data?.guestProfile?.totalPoints || 0)
          } catch {}
        }
      } catch (err: unknown) {
        const message =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to load booking details'
        setError(message)
      } finally {
        setLoading(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomIdsParam, checkIn, checkOut, adults, user])

  if (loading) {
    return (
      <div className="min-h-screen bg-foreground-inverse flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !roomType || !pricing || selectedRoomsInfo.length === 0) {
    return (
      <div className="min-h-screen bg-foreground-inverse flex flex-col items-center justify-center px-5">
        <MdOutlineKingBed className="text-foreground-disabled text-6xl mb-4" />
        <h2 className="text-foreground text-xl font-heading font-semibold mb-2">
          {error || 'Something went wrong'}
        </h2>
        <p className="text-foreground-tertiary text-sm mb-6">Please go back and try again.</p>
        <Link href="/rooms" className="text-foreground text-sm font-medium hover:underline flex items-center gap-1.5">
          <HiOutlineArrowLeft size={14} />
          Back to Rooms
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-foreground-inverse">
      <div className="border-b border-border px-5 vsm:px-8 sm:px-12 py-4">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <Link
            href={`/rooms/${roomType.slug}`}
            className="text-foreground-tertiary text-sm hover:text-foreground flex items-center gap-1.5 transition-colors"
          >
            <HiOutlineArrowLeft size={14} />
            Back
          </Link>
          <BookingStepIndicator currentStep={step} />
          <div className="w-16" />
        </div>
      </div>

      <div className="px-5 vsm:px-8 sm:px-12 py-10">
        {step === 1 && (
          <BookingStepReview
            roomImage={roomType.image || '/room_2.jpeg'}
            roomTypeName={roomType.name}
            rooms={selectedRoomsInfo.map(r => ({
              number: r.room.number,
              floor: r.room.floor,
              totalAmount: r.totalAmount,
            }))}
            checkIn={checkIn}
            checkOut={checkOut}
            adults={adults}
            totalNights={pricing.totalNights}
            nightBreakdown={pricing.nightBreakdown}
            baseAmount={pricing.baseAmount}
            taxAmount={pricing.taxAmount}
            totalAmount={pricing.totalAmount}
            onConfirm={() => setStep(2)}
          />
        )}

        {step === 2 && (
          <BookingStepLoyalty
            totalPoints={guestPoints}
            totalAmount={pricing.totalAmount}
            onApply={(pts, disc) => {
              setPointsUsed(pts)
              setDiscount(disc)
              setStep(3)
            }}
            onSkip={() => {
              setPointsUsed(0)
              setDiscount(0)
              setStep(3)
            }}
          />
        )}

        {step === 3 && (
          <BookingStepPayment
            roomIds={roomIds}
            checkIn={checkIn}
            checkOut={checkOut}
            adults={adults}
            pointsUsed={pointsUsed}
            discount={discount}
            totalAmount={pricing.totalAmount}
            onSuccess={(bookingId, groupRef) => {
              const qs = groupRef
                ? `groupRef=${groupRef}`
                : `bookingId=${bookingId}`
              router.push(`/book/confirmed?${qs}`)
            }}
          />
        )}
      </div>
    </div>
  )
}

export default function BookPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-foreground-inverse flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <BookPageContent />
    </Suspense>
  )
}
