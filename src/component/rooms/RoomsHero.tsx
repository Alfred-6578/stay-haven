'use client'
import React, { useEffect, useRef, useState } from 'react'
import Pill from '@/component/ui/Pill'

const RoomsHero = () => {
  const heroRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = heroRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold: 0.1 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div ref={heroRef} className="relative min-h-88 vsm:h-120 bg-foreground rounded-b-3xl overflow-hidden">
      <div className="absolute inset-0">
        <video src="/room_video.mp4" autoPlay loop muted playsInline className="w-full h-full object-cover" />
      </div>
      <div className="absolute inset-0 bg-foreground/70 z-10" />

      <div className="relative z-20 px-5 vsm:px-8 sm:px-12 lg:px-16 pt-12 vsm:pt-16 pb-20 vsm:pb-24">
        <div className={`flex items-center transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <Pill className="border-foreground-inverse/20! text-foreground-inverse/80!">
            Explore & Book
          </Pill>
        </div>
        <h1 className={`font-heading font-bold text-foreground-inverse text-3xl vsm:text-4xl sm:text-5xl leading-tight mt-4 max-w-2xl transition-all duration-700 delay-150 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          Find your perfect room
        </h1>
        <p className={`text-foreground-inverse/60 text-sm vsm:text-base mt-3 max-w-lg transition-all duration-700 delay-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          Browse our curated collection of rooms — from cozy standards to breathtaking penthouses. Enjoy personalized recommendations, flexible booking, and thoughtful amenities designed to make every stay memorable.
        </p>
      </div>
    </div>
  )
}

export default RoomsHero
