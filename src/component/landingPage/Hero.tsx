'use client'
import React, { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import heroImage from '@/assets/hero-image.jpg'
import { HiOutlineCalendar, HiOutlineUsers, HiOutlineArrowRight } from 'react-icons/hi'
import { MdOutlineKingBed } from 'react-icons/md'

const Hero = () => {
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [guests, setGuests] = useState('1')
  const [roomType, setRoomType] = useState('')
  const [expanded, setExpanded] = useState(false)

  const searchUrl = `/rooms${checkIn && checkOut ? `?checkIn=${checkIn}&checkOut=${checkOut}&adults=${guests}${roomType ? `&type=${roomType}` : ''}` : ''}`

  return (
    <div className="pb-12">
      <div className="rounded-2xl overflow-hidden min-h-[85vh] relative flex items-center">
        {/* Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 animate-hero-ken-burns">
            <Image
              src={heroImage}
              alt="StayHaven luxury hotel"
              className="w-full h-full object-cover"
              priority
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-foreground/60 via-foreground/40 to-foreground/70 animate-hero-fade-in" />
        </div>

        {/* Content */}
        <div className="relative z-10 w-full px-5 py-12 vsm:px-6 sm:px-10 lg:px-16 vsm:py-16">
          <div className="max-w-3xl">
            {/* Badge */}
            <div className="animate-hero-scale-in hero-delay-1 inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-1.5 mb-6">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-white/90 text-[10px] xsm:text-xs sm:text-sm font-medium tracking-wide">
                12,000+ guests served across Nigeria
              </span>
            </div>

            {/* Heading */}
            <h1 className="animate-hero-fade-up hero-delay-2 font-heading font-bold italic text-white text-4xl sm:text-5xl lg:text-6xl leading-tight lg:leading-[1.15] mb-5">
              Your perfect stay
              <br />
              is one click away.
            </h1>

            {/* Subtext */}
            <p className="animate-hero-fade-up hero-delay-3 text-white/75 text-base sm:text-lg max-w-lg mb-6 vsm:mb-10 leading-relaxed">
              Premium rooms, exceptional service, and unforgettable experiences — all in one place. Discover why StayHaven is Nigeria&apos;s most trusted hotel.
            </p>

            {/* Quick stats */}
            <div className="flex items-center gap-3.5 tny:gap-6 sm:gap-8 mb-7 vsm:mb-10">
              <div className="animate-hero-fade-up hero-delay-4">
                <p className="text-white text-2xl sm:text-3xl font-bold">4.9</p>
                <p className="text-white/60 text-xs sm:text-sm">Guest Rating</p>
              </div>
              <div className="animate-hero-fade-in hero-delay-5 w-px h-10 bg-white/20" />
              <div className="animate-hero-fade-up hero-delay-5">
                <p className="text-white text-2xl sm:text-3xl font-bold">3</p>
                <p className="text-white/60 text-xs sm:text-sm">Room Types</p>
              </div>
              <div className="animate-hero-fade-in hero-delay-6 w-px h-10 bg-white/20" />
              <div className="animate-hero-fade-up hero-delay-6">
                <p className="text-white text-2xl sm:text-3xl font-bold">24/7</p>
                <p className="text-white/60 text-xs sm:text-sm">Concierge</p>
              </div>
            </div>
          </div>

          {/* Search / Booking Bar */}
          <div className="animate-hero-scale-in hero-delay-7 bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-4xl overflow-hidden">
            {/* Mobile: tap to expand */}
            <button
              onClick={() => setExpanded(!expanded)}
              className="sm:hidden w-full flex items-center justify-between px-4 py-3.5"
            >
              <div className="flex items-center gap-2.5 text-foreground-secondary">
                <HiOutlineCalendar size={18} />
                <span className="text-sm font-medium">
                  {checkIn && checkOut ? `${checkIn} — ${checkOut}` : 'When are you staying?'}
                </span>
              </div>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={`text-foreground-tertiary transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>
                <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {/* Mobile: expandable fields */}
            <div className={`sm:hidden transition-all duration-300 ease-in-out overflow-hidden ${expanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="px-4 pb-4 flex flex-col gap-3 border-t border-border pt-3">
                <div className="grid grid-cols-1 tny:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-foreground-tertiary text-xs font-semibold uppercase tracking-wider">Check In</label>
                    <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-2.5 focus-within:ring-2 focus-within:ring-foreground/20">
                      <input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} min={new Date().toISOString().split('T')[0]} className="w-full text-sm text-foreground outline-none bg-transparent" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-foreground-tertiary text-xs font-semibold uppercase tracking-wider">Check Out</label>
                    <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-2.5 focus-within:ring-2 focus-within:ring-foreground/20">
                      <input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} min={checkIn || new Date().toISOString().split('T')[0]} className="w-full text-sm text-foreground outline-none bg-transparent" />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 tny:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-foreground-tertiary text-xs font-semibold uppercase tracking-wider">Room Type</label>
                    <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-2.5 focus-within:ring-2 focus-within:ring-foreground/20">
                      <MdOutlineKingBed className="text-foreground-tertiary shrink-0" size={18} />
                      <select value={roomType} onChange={(e) => setRoomType(e.target.value)} className="w-full text-sm text-foreground outline-none bg-transparent appearance-none cursor-pointer">
                        <option value="">All Types</option>
                        <option value="standard">Standard</option>
                        <option value="deluxe">Deluxe</option>
                        <option value="presidential-suite">Suite</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-foreground-tertiary text-xs font-semibold uppercase tracking-wider">Guests</label>
                    <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-2.5 focus-within:ring-2 focus-within:ring-foreground/20">
                      <HiOutlineUsers className="text-foreground-tertiary shrink-0" size={18} />
                      <select value={guests} onChange={(e) => setGuests(e.target.value)} className="w-full text-sm text-foreground outline-none bg-transparent appearance-none cursor-pointer">
                        {[1, 2, 3, 4].map(n => (
                          <option key={n} value={n}>{n} {n === 1 ? 'Guest' : 'Guests'}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                <Link href={searchUrl} className="flex items-center justify-center gap-2 bg-foreground text-foreground-inverse py-2.5 rounded-lg font-medium text-sm hover:bg-foreground/90 transition-colors">
                  Search Rooms
                  <HiOutlineArrowRight size={16} />
                </Link>
              </div>
            </div>

            {/* Desktop: always visible */}
            <div className="hidden sm:block p-6">
              <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-foreground-tertiary text-xs font-semibold uppercase tracking-wider">Check In</label>
                  <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-2.5 focus-within:ring-2 focus-within:ring-foreground/20">
                    <HiOutlineCalendar className="text-foreground-tertiary" size={18} />
                    <input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} min={new Date().toISOString().split('T')[0]} className="w-full text-sm text-foreground outline-none bg-transparent" />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-foreground-tertiary text-xs font-semibold uppercase tracking-wider">Check Out</label>
                  <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-2.5 focus-within:ring-2 focus-within:ring-foreground/20">
                    <HiOutlineCalendar className="text-foreground-tertiary" size={18} />
                    <input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} min={checkIn || new Date().toISOString().split('T')[0]} className="w-full text-sm text-foreground outline-none bg-transparent" />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-foreground-tertiary text-xs font-semibold uppercase tracking-wider">Room Type</label>
                  <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-2.5 focus-within:ring-2 focus-within:ring-foreground/20">
                    <MdOutlineKingBed className="text-foreground-tertiary" size={18} />
                    <select value={roomType} onChange={(e) => setRoomType(e.target.value)} className="w-full text-sm text-foreground outline-none bg-transparent appearance-none cursor-pointer">
                      <option value="">All Types</option>
                      <option value="standard">Standard</option>
                      <option value="deluxe">Deluxe</option>
                      <option value="presidential-suite">Presidential Suite</option>
                    </select>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-foreground-tertiary text-xs font-semibold uppercase tracking-wider">Guests</label>
                  <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-2.5 focus-within:ring-2 focus-within:ring-foreground/20">
                    <HiOutlineUsers className="text-foreground-tertiary" size={18} />
                    <select value={guests} onChange={(e) => setGuests(e.target.value)} className="w-full text-sm text-foreground outline-none bg-transparent appearance-none cursor-pointer">
                      {[1, 2, 3, 4].map(n => (
                        <option key={n} value={n}>{n} {n === 1 ? 'Guest' : 'Guests'}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex flex-col justify-end">
                  <Link href={searchUrl} className="flex items-center justify-center gap-2 bg-foreground text-foreground-inverse px-6 py-2.5 rounded-lg font-medium text-sm hover:bg-foreground/90 transition-colors h-[42px]">
                    Search
                    <HiOutlineArrowRight size={16} />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Hero
