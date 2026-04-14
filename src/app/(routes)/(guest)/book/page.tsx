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

interface RoomData {
  id: string
  number: string
  floor: number
  roomType: {
    name: string
    slug: string
    image: string | null
    basePrice: string | number
    weekendMultiplier: string | number
    capacity: number
  }
}

interface PricingData {
  baseAmount: number
  taxAmount: number
  totalAmount: number
  totalNights: number
  nightBreakdown: Array<{ date: string; isWeekend: boolean; price: number }>
}

function BookPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuth()

  const roomId = searchParams.get('roomId') || ''
  const checkIn = searchParams.get('checkIn') || ''
  const checkOut = searchParams.get('checkOut') || ''
  const adults = parseInt(searchParams.get('adults') || '1', 10)

  const [step, setStep] = useState(1)
  const [room, setRoom] = useState<RoomData | null>(null)
  const [pricing, setPricing] = useState<PricingData | null>(null)
  const [guestPoints, setGuestPoints] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Loyalty
  const [pointsUsed, setPointsUsed] = useState(0)
  const [discount, setDiscount] = useState(0)

  useEffect(() => {
    if (!roomId || !checkIn || !checkOut) {
      setError('Missing booking parameters')
      setLoading(false)
      return
    }

    (async () => {
      try {
        // Fetch room details
        const roomRes = await api.get(`/rooms/${roomId}`)
        const roomData = roomRes.data.data
        setRoom(roomData)

        // Fetch availability to get pricing
        const params = new URLSearchParams({
          roomId,
          checkIn,
          checkOut,
          adults: String(adults),
          typeId: roomData.roomType?.id || roomData.roomTypeId,
        })
        const availRes = await api.get(`/rooms/available?${params}`)
        const available = availRes.data.data
        const match = available.find((a: { room: { id: string } }) => a.room.id === roomId)

        if (!match) {
          setError('This room is no longer available for the selected dates')
          setLoading(false)
          return
        }

        setPricing({
          baseAmount: match.baseAmount,
          taxAmount: match.taxAmount,
          totalAmount: match.totalAmount,
          totalNights: match.totalNights,
          nightBreakdown: [], // We'll calculate this client-side
        })

        // Calculate night breakdown client-side
        const basePrice = Number(roomData.roomType.basePrice)
        const weekendMult = Number(roomData.roomType.weekendMultiplier)
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
        setPricing(prev => prev ? { ...prev, nightBreakdown: breakdown } : prev)

        // Fetch guest loyalty points
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
  }, [roomId, checkIn, checkOut, adults, user])

  if (loading) {
    return (
      <div className="min-h-screen bg-foreground-inverse flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !room || !pricing) {
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
      {/* Header */}
      <div className="border-b border-border px-5 vsm:px-8 sm:px-12 py-4">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <Link href={`/rooms/${room.roomType.slug}`} className="text-foreground-tertiary text-sm hover:text-foreground flex items-center gap-1.5 transition-colors">
            <HiOutlineArrowLeft size={14} />
            Back
          </Link>
          <BookingStepIndicator currentStep={step} />
          <div className="w-16" /> {/* Spacer */}
        </div>
      </div>

      {/* Content */}
      <div className="px-5 vsm:px-8 sm:px-12 py-10">
        {step === 1 && (
          <BookingStepReview
            roomImage={room.roomType.image || '/room_2.jpeg'}
            roomTypeName={room.roomType.name}
            roomNumber={room.number}
            floor={room.floor}
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
            roomId={roomId}
            checkIn={checkIn}
            checkOut={checkOut}
            adults={adults}
            pointsUsed={pointsUsed}
            discount={discount}
            totalAmount={pricing.totalAmount}
            onSuccess={(bookingId) => {
              router.push(`/book/confirmed?bookingId=${bookingId}`)
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
