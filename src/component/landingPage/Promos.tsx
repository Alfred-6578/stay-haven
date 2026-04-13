'use client'
import React, { useState, useEffect, useRef } from 'react'
import Pill from '../ui/Pill'
import Button from '../ui/Button'
import { FaArrowRight } from 'react-icons/fa'

const promos = [
  {
    badge: 'Limited Time',
    title: 'First Stay Discount',
    discount: '25%',
    description: 'New to StayHaven? Enjoy 25% off your first booking on any room type. No minimum stay required.',
    terms: 'Valid for new accounts only. Cannot be combined with other offers.',
    gradient: 'from-[#0B1B3A] to-[#1a3060]',
    accent: 'bg-amber-400 text-foreground',
  },
  {
    badge: 'Weekend Special',
    title: 'Weekend Getaway Deal',
    discount: '30%',
    description: 'Book a Friday–Sunday stay and save 30% on Deluxe rooms and above. Breakfast included.',
    terms: 'Valid on weekends through Dec 2026. Subject to availability.',
    gradient: 'from-[#1a1a2e] to-[#16213e]',
    accent: 'bg-emerald-400 text-foreground',
  },
  {
    badge: 'Loyalty Exclusive',
    title: 'Gold & Platinum Perk',
    discount: '40%',
    description: 'Our most loyal guests deserve the best. Unlock 40% off suite upgrades with your Gold or Platinum membership.',
    terms: 'Gold & Platinum members only. Upgrade subject to availability.',
    gradient: 'from-[#2d1b00] to-[#4a2c00]',
    accent: 'bg-yellow-400 text-foreground',
  },
]

const Promos = () => {
  const sectionRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect() } },
      { threshold: 0.15 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={sectionRef} className="mt-20 vsm:mt-28">
      {/* Header */}
      <div className="flex flex-col justify-between items-center mb-8">
        <div className='flex flex-col items-center'>
          <div className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <Pill icon={<FaArrowRight />} animated visible={visible}>
              Promotions
            </Pill>
          </div>
          <h2 className={`text-3xl vsm:text-4xl sm:text-5xl text-center font-heading font-bold text-foreground-disabled mt-3 transition-all duration-700 delay-150 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            Get promo for a cheaper price
          </h2>
          <p className={`text-foreground-tertiary mt-3 text-sm vsm:text-base text-center max-w-md transition-all duration-700 delay-200  ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            Discover exclusive deals and limited-time offers designed to help you save on your next getaway
          </p>
        </div>
        <div className={`transition-all duration-700 delay-200 mt-4 max-sm:hidden ${visible ? 'opacity-100' : 'opacity-0'}`}>
          <Button href="/rooms" withArrow >See All</Button>
        </div>
      </div>

      {/* Promo cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 vsm:gap-5">
        {promos.map((promo, i) => (
          <div
            key={promo.title}
            className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${promo.gradient} p-5 vsm:p-7 flex flex-col justify-between min-h-[240px] vsm:min-h-[260px] group`}
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.97)',
              transition: `all 0.7s ease-out ${0.3 + i * 0.12}s`,
            }}
          >
            {/* Background decorative circles */}
            <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/5" />
            <div className="absolute -right-4 -bottom-10 w-24 h-24 rounded-full bg-white/5" />

            {/* Top row */}
            <div className="flex justify-between items-start relative z-1">
              <span className={`${promo.accent} text-xs font-bold px-3 py-1 rounded-full`}>
                {promo.badge}
              </span>
              <div className="flex flex-col items-end">
                <span className="text-white/50 text-xs">Save up to</span>
                <span className="text-white text-4xl vsm:text-5xl font-bold leading-none">{promo.discount}</span>
                <span className="text-white/60 text-xs">OFF</span>
              </div>
            </div>

            {/* Content */}
            <div className="relative z-1 mt-4">
              <h3 className="text-white text-lg vsm:text-xl font-bold mb-1.5">{promo.title}</h3>
              <p className="text-white/70 text-xs vsm:text-sm leading-relaxed mb-3">
                {promo.description}
              </p>
              <p className="text-white/40 text-[10px] vsm:text-xs">
                *{promo.terms}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Mobile see all */}
      <div className={`sm:hidden flex justify-center mt-6 transition-all duration-700 delay-700 ${visible ? 'opacity-100' : 'opacity-0'}`}>
        <Button href="/rooms" withArrow>See All Promos</Button>
      </div>
    </div>
  )
}

export default Promos
