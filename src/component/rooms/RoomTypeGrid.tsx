'use client'
import React, { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { api } from '@/lib/api'
import { HiOutlineUsers, HiOutlineArrowRight } from 'react-icons/hi'
import { MdOutlineKingBed } from 'react-icons/md'
import { GoHeartFill } from 'react-icons/go'
import Pill from '../ui/Pill'

interface RoomType {
  id: string
  name: string
  slug: string
  tag: string | null
  image: string | null
  description: string
  basePrice: string | number
  weekendMultiplier: string | number
  capacity: number
  amenities: string[]
  roomCount: number
  availableCount: number
}

interface AvailabilityResult {
  room: {
    id: string
    roomType: RoomType
  }
  baseAmount: number
  taxAmount: number
  totalAmount: number
  totalNights: number
}

// When dates are set, we group availability results by room type
interface RoomTypeWithPricing extends RoomType {
  totalAmount?: number
  baseAmount?: number
  taxAmount?: number
  totalNights?: number
  availableForDates?: number
}

interface Props {
  selectedType: string
  checkIn: string
  checkOut: string
  guests: string
  sortBy: string
}

const RoomTypeGrid = ({ selectedType, checkIn, checkOut, guests, sortBy }: Props) => {
  const [roomTypes, setRoomTypes] = useState<RoomTypeWithPricing[]>([])
  const [loading, setLoading] = useState(true)
  const [hasDates, setHasDates] = useState(false)
  const gridRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = gridRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect() } },
      { threshold: 0.05 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    (async () => {
      setLoading(true)

      try {
        if (checkIn && checkOut) {
          // Use availability API — returns per-room results with pricing
          setHasDates(true)
          const params = new URLSearchParams({ checkIn, checkOut })
          if (guests) params.set('adults', guests)
          if (selectedType) params.set('typeId', selectedType)

          const res = await api.get(`/rooms/available?${params}`)
          const results: AvailabilityResult[] = res.data.data

          // Group by room type — show cheapest price per type, count available rooms
          const typeMap = new Map<string, RoomTypeWithPricing>()
          for (const r of results) {
            const rt = r.room.roomType
            const existing = typeMap.get(rt.id)
            const prevCount = existing?.availableForDates || 0

            if (!existing || r.totalAmount < (existing.totalAmount || Infinity)) {
              typeMap.set(rt.id, {
                ...rt,
                totalAmount: r.totalAmount,
                baseAmount: r.baseAmount,
                taxAmount: r.taxAmount,
                totalNights: r.totalNights,
                availableForDates: prevCount + 1,
              })
            } else {
              existing.availableForDates = prevCount + 1
            }
          }

          setRoomTypes(Array.from(typeMap.values()))
        } else {
          // No dates — show catalog from room types API
          setHasDates(false)
          const res = await api.get('/rooms/types')
          setRoomTypes(res.data.data)
        }
      } catch (err) {
        console.error('Failed to fetch rooms:', err)
      } finally {
        setLoading(false)
      }
    })()
  }, [checkIn, checkOut, guests, selectedType])

  // Filter and sort
  let filtered = [...roomTypes]
  if (selectedType && !hasDates) {
    filtered = filtered.filter(rt => rt.slug === selectedType)
  }
  if (guests && !hasDates) {
    filtered = filtered.filter(rt => rt.capacity >= parseInt(guests, 10))
  }

  if (sortBy === 'price-asc') filtered.sort((a, b) => Number(a.totalAmount || a.basePrice) - Number(b.totalAmount || b.basePrice))
  else if (sortBy === 'price-desc') filtered.sort((a, b) => Number(b.totalAmount || b.basePrice) - Number(a.totalAmount || a.basePrice))
  else if (sortBy === 'capacity') filtered.sort((a, b) => b.capacity - a.capacity)
  else if (sortBy === 'availability') filtered.sort((a, b) => (b.availableForDates || b.availableCount) - (a.availableForDates || a.availableCount))

  const buildRoomLink = (slug: string) => {
    const params = new URLSearchParams()
    if (checkIn) params.set('checkIn', checkIn)
    if (checkOut) params.set('checkOut', checkOut)
    if (guests) params.set('adults', guests)
    const qs = params.toString()
    return `/rooms/${slug}${qs ? `?${qs}` : ''}`
  }

  if (loading) {
    return (
      <div ref={gridRef} className="grid grid-cols-1 vsm:grid-cols-2 lg:grid-cols-3 gap-5 vsm:gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className={`${i >= 2 ? 'max-vsm:hidden' : ''} ${i >= 4 ? 'max-lg:hidden' : ''} rounded-2xl bg-foreground-disabled/20 animate-pulse h-[420px]`} />
        ))}
      </div>
    )
  }

  if (filtered.length === 0) {
    return (
      <div ref={gridRef} className="flex flex-col items-center justify-center py-20">
        <MdOutlineKingBed className="text-foreground-disabled text-5xl mb-4" />
        <h3 className="text-foreground text-xl font-heading font-semibold mb-2">
          {hasDates ? 'No rooms available for these dates' : 'No rooms found'}
        </h3>
        <p className="text-foreground-tertiary text-sm">
          {hasDates ? 'Try different dates or adjust your guest count.' : 'Try adjusting your filters or search criteria.'}
        </p>
      </div>
    )
  }

  return (
    <div ref={gridRef}>
      {/* Results count */}
      <div className="flex items-center justify-between mb-5">
        <p className="text-foreground-secondary text-sm">
          <span className="text-foreground font-semibold">{filtered.length}</span> room {filtered.length === 1 ? 'type' : 'types'} {hasDates ? 'available' : 'found'}
          {hasDates && ` for ${roomTypes[0]?.totalNights || 0} night${(roomTypes[0]?.totalNights || 0) !== 1 ? 's' : ''}`}
        </p>
      </div>

      <div className="grid grid-cols-1 vsm:grid-cols-2 lg:grid-cols-3 gap-5 vsm:gap-6">
        {filtered.map((rt, i) => (
          <Link
            key={rt.id}
            href={buildRoomLink(rt.slug)}
            className="group block rounded-2xl overflow-hidden bg-foreground-inverse border border-border hover:border-foreground-disabled/50 transition-all duration-300 hover:shadow-lg"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(24px)',
              transition: `opacity 0.6s ease-out ${0.1 + i * 0.06}s, transform 0.6s ease-out ${0.1 + i * 0.06}s`,
            }}
          >
            {/* Image */}
            <div className="relative h-52 vsm:h-56 overflow-hidden">
              <Image
                src={rt.image || '/room_2.jpeg'}
                alt={rt.name}
                fill
                sizes="(max-width: 550px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              {/* Tag */}
              {rt.tag && (
                <div className="absolute top-3 left-3">
                  <Pill className="bg-foreground-inverse/90 backdrop-blur-sm text-foreground text-xs! px-3!">
                    {rt.tag}
                  </Pill>
                </div>
              )}

              {/* Favorite */}
              <div className="absolute top-3 right-3 p-2.5 rounded-full bg-foreground-inverse/10 backdrop-blur-sm text-foreground-inverse opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <GoHeartFill className="text-sm" />
              </div>

              {/* Availability badge */}
              <div className="absolute bottom-3 left-3">
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                  (hasDates ? rt.availableForDates : rt.availableCount) && (hasDates ? rt.availableForDates! > 0 : rt.availableCount > 0)
                    ? 'bg-success-bg text-success'
                    : 'bg-danger-bg text-danger'
                }`}>
                  {hasDates
                    ? `${rt.availableForDates} room${rt.availableForDates !== 1 ? 's' : ''} available`
                    : rt.availableCount > 0 ? `${rt.availableCount} available` : 'Fully booked'
                  }
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 vsm:p-5">
              {/* Name + Price row */}
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-foreground font-heading text-lg vsm:text-xl font-semibold leading-tight">{rt.name}</h3>
                <div className="text-right flex-shrink-0 ml-3">
                  {hasDates && rt.totalAmount ? (
                    <>
                      <p className="text-foreground font-bold text-lg">${rt.totalAmount.toFixed(0)}</p>
                      <p className="text-foreground-tertiary text-xs">total / {rt.totalNights} night{rt.totalNights !== 1 ? 's' : ''}</p>
                    </>
                  ) : (
                    <>
                      <p className="text-foreground font-bold text-lg">${Number(rt.basePrice).toFixed(0)}</p>
                      <p className="text-foreground-tertiary text-xs">/ night</p>
                    </>
                  )}
                </div>
              </div>

              {/* Per-night breakdown when dates are set */}
              {hasDates && rt.baseAmount && rt.taxAmount && (
                <div className="flex gap-3 text-[11px] text-foreground-tertiary mb-3">
                  <span>${rt.baseAmount.toFixed(0)} base</span>
                  <span>+</span>
                  <span>${rt.taxAmount.toFixed(0)} tax</span>
                  {Number(rt.weekendMultiplier) > 1 && (
                    <>
                      <span className="text-warning">incl. weekend rates</span>
                    </>
                  )}
                </div>
              )}

              {/* Description */}
              <p className="text-foreground-secondary text-sm leading-relaxed mb-4 line-clamp-2">
                {rt.description}
              </p>

              {/* Meta row */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center gap-1.5 text-foreground-tertiary">
                  <HiOutlineUsers size={15} />
                  <span className="text-xs">Up to {rt.capacity} guests</span>
                </div>
                <div className="w-px h-3.5 bg-border" />
                <div className="flex items-center gap-1.5 text-foreground-tertiary">
                  <MdOutlineKingBed size={15} />
                  <span className="text-xs">{rt.roomCount} rooms</span>
                </div>
              </div>

              {/* Amenities preview */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {rt.amenities.slice(0, 4).map(a => (
                  <span key={a} className="text-[11px] text-foreground-tertiary bg-foreground-disabled/15 px-2 py-0.5 rounded-full">
                    {a}
                  </span>
                ))}
                {rt.amenities.length > 4 && (
                  <span className="text-[11px] text-foreground-tertiary bg-foreground-disabled/15 px-2 py-0.5 rounded-full">
                    +{rt.amenities.length - 4} more
                  </span>
                )}
              </div>

              {/* CTA */}
              <div className="flex items-center justify-between">
                {!hasDates && Number(rt.weekendMultiplier) > 1 && (
                  <span className="text-[11px] text-warning bg-warning-bg px-2 py-0.5 rounded-full">
                    {((Number(rt.weekendMultiplier) - 1) * 100).toFixed(0)}% weekend surcharge
                  </span>
                )}
                <div className="ml-auto flex items-center gap-1.5 text-foreground text-sm font-medium group-hover:gap-2.5 transition-all">
                  {hasDates ? 'Book Now' : 'View Details'}
                  <HiOutlineArrowRight size={14} />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default RoomTypeGrid
