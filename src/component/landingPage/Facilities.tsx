'use client'
import React, { useEffect, useState, useRef, useCallback } from 'react'
import Pill from '../ui/Pill'
import Button from '../ui/Button'
import RoomTypeCard from './RoomTypeCard'
import { GoArrowLeft, GoArrowRight } from 'react-icons/go'
import { api } from '@/lib/api'

interface RoomType {
  id: string
  name: string
  slug: string
  tag: string | null
  image: string | null
  basePrice: string | number
  capacity: number
  roomCount: number
  availableCount: number
}

function seededShuffle<T>(arr: T[]): T[] {
  // Seed from today's date — same order all day for all users
  const today = new Date().toISOString().split('T')[0]
  let seed = 0
  for (let i = 0; i < today.length; i++) seed = ((seed << 5) - seed + today.charCodeAt(i)) | 0

  const random = () => {
    seed = (seed * 16807 + 0) % 2147483647
    return (seed & 0x7fffffff) / 2147483647
  }

  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const Facilities = () => {
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([])
  const [loading, setLoading] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)
  const sectionRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect() } },
      { threshold: 0.1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/rooms/types')
        setRoomTypes(seededShuffle(res.data.data))
      } catch (err) {
        console.error('Failed to fetch room types:', err)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 0)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    updateScrollState()
    el.addEventListener('scroll', updateScrollState, { passive: true })
    window.addEventListener('resize', updateScrollState)
    return () => {
      el.removeEventListener('scroll', updateScrollState)
      window.removeEventListener('resize', updateScrollState)
    }
  }, [roomTypes, updateScrollState])

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current
    if (!el) return
    const cardWidth = el.querySelector(':scope > *')?.clientWidth || 300
    const gap = 24
    const distance = (cardWidth + gap) * 2
    el.scrollBy({ left: direction === 'left' ? -distance : distance, behavior: 'smooth' })
  }

  return (
    <div ref={sectionRef} className='bg-foreground-disabled/30 w-full rounded-2xl p-4 vsm:p-6 lg:p-8 mt-20'>
      <div className="flex justify-between items-start">
        <div className="flex flex-col items-start">
          <div className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <Pill animated visible={visible}>
              Facilities
            </Pill>
          </div>
          <h3 className={`text-foreground text-xl vsm:text-2xl mt-2 transition-all duration-700 delay-150 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            Checkout Premium Stays
          </h3>
        </div>
        <div className={`flex items-start max-vsm:hidden transition-all duration-700 delay-200 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <Button href="/rooms" withArrow>View More</Button>
        </div>
      </div>

      {/* Cards slider */}
      {loading ? (
        <div className="grid grid-cols-1 vsm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className={`${i >= 1 ? 'max-vsm:hidden':''} ${i >= 2 ? 'max-lg:hidden':''} ${i >= 3 ? 'max-xl:hidden':''} w-full h-85 rounded-2xl bg-foreground-disabled/40 animate-pulse`} />
          ))}
        </div>
      ) : (
        <div
          ref={scrollRef}
          className={`flex gap-6 mt-8 overflow-x-auto scrollbar-hide scroll-smooth transition-all duration-800 delay-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {roomTypes.map((rt, i) => (
            <div
              key={rt.id}
              className="min-w-[260px] vsm:min-w-[280px] sm:min-w-[300px] shrink-0"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(24px)',
                transition: `opacity 0.6s ease-out ${0.4 + i * 0.08}s, transform 0.6s ease-out ${0.4 + i * 0.08}s`,
              }}
            >
              <RoomTypeCard
                image={rt.image || '/room_2.jpeg'}
                tag={rt.tag || rt.name}
                title={rt.name}
                price={Number(rt.basePrice)}
                slug={rt.slug}
              />
            </div>
          ))}
        </div>
      )}

      <div className={`mt-8 vsm:mt-10 flex justify-between items-end transition-all duration-700 delay-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        {/* Controller */}
        <div className="flex gap-3">
          <button
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            className={`border border-foreground rounded-full p-2.5 vsm:p-3 transition-colors cursor-pointer ${
              canScrollLeft
                ? 'bg-foreground text-foreground-inverse'
                : 'text-foreground-disabled border-foreground-disabled cursor-not-allowed'
            }`}
          >
            <GoArrowLeft className="text-current font-black text-xl vsm:text-2xl" />
          </button>
          <button
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            className={`border border-foreground rounded-full p-2.5 vsm:p-3 transition-colors cursor-pointer ${
              canScrollRight
                ? 'bg-foreground text-foreground-inverse'
                : 'text-foreground-disabled border-foreground-disabled cursor-not-allowed'
            }`}
          >
            <GoArrowRight className="font-black text-xl vsm:text-2xl" />
          </button>
        </div>
        <p className="text-xs text-right text-foreground/80 max-w-70 max-vsm:hidden">
          Book your stay for a personalized experience. Explore our premium accommodations and enjoy a memorable stay with us.
        </p>
        <div className="vsm:hidden">
          <Button href="/rooms" withArrow size="sm">View More</Button>
        </div>
      </div>
    </div>
  )
}

export default Facilities
