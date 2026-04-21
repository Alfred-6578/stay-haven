'use client'
import React, { useState, useEffect, useRef } from 'react'
import { FaArrowRight } from 'react-icons/fa'
import Pill from '../ui/Pill'
import roomImage from '@/assets/room_1.jpeg'
import gateImage from '@/assets/gate.jpeg'
import Image, { StaticImageData } from 'next/image'
import { SlLocationPin } from 'react-icons/sl'
import { GoArrowUpRight, GoArrowRight, GoArrowLeft } from 'react-icons/go'
import Button from '../ui/Button'

interface CardData {
  image: StaticImageData
  tag: string
  title: string
  description: string
  location: string
}

const cardA: CardData = {
  image: roomImage,
  tag: 'Premium Rooms',
  title: "Experience luxury with StayHaven's premium rooms designed for unforgettable stays.",
  description: "Spacious interiors, plush bedding, and curated amenities — everything you need for a perfect getaway.",
  location: 'Lagos, Nigeria',
}

const cardB: CardData = {
  image: gateImage,
  tag: 'Deluxe',
  title: "Elegant spaces that blend modern comfort with timeless sophistication.",
  description: "Experience the epitome of comfort and style with StayHaven's deluxe accommodations, where every detail is designed to elevate your stay.",
  location: 'Abuja, Nigeria',
}

const AboutUs = () => {
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

  const [activeCard, setActiveCard] = useState<'left' | 'right'>('right')

  const leftIsNormal = activeCard === 'right'
  const rightIsNormal = activeCard === 'left'

  const swap = (direction: 'prev' | 'next') => {
    setActiveCard(prev => prev === 'left' ? 'right' : 'left')
    void direction
  }

  const renderCard = (card: CardData, isNormal: boolean) => (
    <div className={`transition-all duration-500 ease-in-out ${isNormal ? 'sm:w-[55%] xl:w-110' : 'sm:w-[45%] xl:w-90 pt-0 sm:pt-8'}`}>
      <div className={`relative overflow-hidden rounded-lg transition-all duration-500 ease-in-out ${
        isNormal ? 'w-full h-64 vsm:h-72' : 'w-full h-44 vsm:h-52'
      }`}>
        <Image
          src={card.image}
          alt={card.tag}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 440px"
          placeholder="blur"
          className='object-cover'
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/50 to-transparent" />
        <div className="flex flex-col justify-between h-full relative z-2 p-3">
          <div className="border w-fit border-foreground-inverse/60 px-3 py-0.5 rounded-full text-foreground-inverse/80 text-[13px]">
            {card.tag}
          </div>

          {/* Title — only visible on normal (large) card */}
          <div className={`flex justify-end pt-12 transition-all duration-500 ${
            isNormal ? 'opacity-100 max-h-40' : 'opacity-0 max-h-0 overflow-hidden'
          }`}>
            <h3 className="text-foreground-inverse text-base vsm:text-lg max-w-68 leading-5 vsm:leading-6">
              {card.title}
            </h3>
          </div>

          <div className="flex justify-between items-end">
            <div className="flex gap-1 items-center bg-foreground-disabled h-9 px-1.5 rounded-full text-sm text-foreground">
              <div className="p-1.5 rounded-full bg-foreground-inverse/60 text-foreground">
                <SlLocationPin className='text-xs' />
              </div>
              <p className="text-xs pr-2">{card.location}</p>
            </div>
            <div className="bg-foreground-inverse rounded-full p-2.5 hover:rotate-90 transition-transform duration-300 cursor-pointer">
              <GoArrowUpRight className="text-foreground font-black text-xl vsm:text-2xl" />
            </div>
          </div>
        </div>
      </div>

      {/* Description — only visible on active (small) card */}
      <div className={`transition-all duration-500 overflow-hidden ${
        isNormal ? 'max-h-0 opacity-0' : 'max-h-40 opacity-100 mt-4'
      }`}>
        <p className="max-w-65 text-sm text-foreground/70">
          {card.description}
        </p>
      </div>
    </div>
  )

  return (
    <div ref={sectionRef} className='w-full pt-6 pb-10'>
      <div className="flex flex-col items-center">
        <Pill icon={<FaArrowRight />} animated visible={visible}>
          Let&apos;s Know Us
        </Pill>
        <h1 className={`text-3xl vsm:text-4xl sm:text-5xl text-foreground-disabled leading-10 vsm:leading-13 font-bold font-heading text-center mt-4 max-w-3xl transition-all duration-700 delay-150 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          Explore Premium Comfort, Your Stay - Our Priority
        </h1>
      </div>

      <div className="flex flex-col lg:flex-row lg:justify-between gap-6 lg:gap-4 mt-10 lg:mt-17">
        {/* Left: About text */}
        <div className="flex-auto lg:max-w-sm">
          <div className={`flex gap-4 justify-center items-center w-22 border border-foreground-disabled text-sm py-1.5 text-foreground rounded-full transition-all duration-700 delay-300 ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-6'}`}>
            About Us
          </div>
          <h3 className={`text-xl vsm:text-2xl max-w-lg lg:max-w-md text-foreground mt-4 transition-all duration-700 delay-400 ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-6'}`}>
            StayHaven offers diverse accommodations with user-friendly booking and personalized recommendations.
          </h3>
          <div className={`transition-all duration-700 delay-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <Button href='/about' withArrow className='mt-9'>
              Explore More
            </Button>
          </div>
        </div>

        {/* Right: Cards + Controls */}
        <div className="flex flex-col gap-4 min-w-0">
          {/* Two cards side by side */}
          <div className={`flex flex-col sm:flex-row gap-4 flex-shrink-1 transition-all duration-800 delay-500 ${visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'}`}>
            {renderCard(cardA, leftIsNormal)}
            {renderCard(cardB, rightIsNormal)}
          </div>

          {/* Controller */}
          <div className={`flex justify-end gap-3 transition-all duration-700 delay-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <button
              onClick={() => swap('prev')}
              className={`${activeCard  === 'left' ? 'bg-foreground text-foreground-inverse':'text-foreground'} border border-foreground rounded-full p-2.5 vsm:p-3 hover:bg-foreground hover:text-foreground-inverse transition-colors cursor-pointer`}
            >
              <GoArrowLeft className="text-current font-black text-xl vsm:text-2xl" />
            </button>
            <button
              onClick={() => swap('next')}
             className={`${activeCard  === 'right' ? 'bg-foreground text-foreground-inverse':'text-foreground'} border border-foreground rounded-full p-2.5 vsm:p-3 hover:bg-foreground hover:text-foreground-inverse transition-colors cursor-pointer`}
            >
              <GoArrowRight className="font-black text-xl vsm:text-2xl" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AboutUs
