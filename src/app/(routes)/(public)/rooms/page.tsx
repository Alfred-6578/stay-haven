'use client'
import React, { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { api } from '@/lib/api'
import RoomsHero from '@/component/rooms/RoomsHero'
import SearchBar from '@/component/rooms/SearchBar'
import FilterPills from '@/component/rooms/FilterPills'
import RoomTypeGrid from '@/component/rooms/RoomTypeGrid'
import Footer from '@/component/landingPage/Footer'

interface RoomTypeOption {
  slug: string
  name: string
}

function RoomsContent() {
  const searchParams = useSearchParams()

  const [checkIn, setCheckIn] = useState(searchParams.get('checkIn') || '')
  const [checkOut, setCheckOut] = useState(searchParams.get('checkOut') || '')
  const [guests, setGuests] = useState(searchParams.get('adults') || '1')
  const [selectedType, setSelectedType] = useState(searchParams.get('type') || '')
  const [sortBy, setSortBy] = useState('price-asc')
  const [roomTypeOptions, setRoomTypeOptions] = useState<RoomTypeOption[]>([])

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/rooms/types')
        setRoomTypeOptions(res.data.data.map((rt: RoomTypeOption) => ({ slug: rt.slug, name: rt.name })))
      } catch {}
    })()
  }, [])

  const activeFilterCount = [selectedType, checkIn && checkOut ? 'dates' : '', guests !== '1' ? 'guests' : ''].filter(Boolean).length

  return (
    <div className="bg-foreground-inverse">
      {/* Hero */}
      <div className="relative">
        <RoomsHero />

        {/* Search bar overlapping hero */}
        <div className="absolute w-[90vw] vsm:w-[87vw] md:w-[90vw] z-20 -bottom-33 tny:-bottom-26 vsm:-bottom-10 sm:bottom-0 -mb-12 mx-5 vsm:mx-8 sm:mx-12 lg:mx-16">
          <SearchBar
            checkIn={checkIn}
            checkOut={checkOut}
            guests={guests}
            selectedType={selectedType}
            sortBy={sortBy}
            roomTypeOptions={roomTypeOptions}
            onCheckInChange={setCheckIn}
            onCheckOutChange={setCheckOut}
            onGuestsChange={setGuests}
            onTypeChange={setSelectedType}
            onSortChange={setSortBy}
          />
        </div>
      </div>

      {/* Filter pills */}
      <div className="vsm:pt-34 px-5 vsm:px-8 sm:px-12 lg:px-16 pt-48 tny:pt-43 sm:pt-20 pb-2">
        <FilterPills
          selectedType={selectedType}
          onTypeChange={setSelectedType}
          roomTypeOptions={roomTypeOptions}
          activeFilterCount={activeFilterCount}
        />
      </div>

      {/* Results */}
      <div className="px-5 vsm:px-8 sm:px-12 lg:px-16 py-8">
        <RoomTypeGrid
          selectedType={selectedType}
          checkIn={checkIn}
          checkOut={checkOut}
          guests={guests}
          sortBy={sortBy}
        />
      </div>

      <Footer />
    </div>
  )
}

export default function RoomsPage() {
  return (
    <Suspense fallback={
      <div className="bg-foreground-inverse min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <RoomsContent />
    </Suspense>
  )
}
