'use client'
import React, { useState, useEffect, useRef } from 'react'
import Pill from '../ui/Pill'
import { FaArrowRight } from 'react-icons/fa'
import Button from '../ui/Button'
import ServicesCard from './ServicesCard'

const services = [
  {
    tag: 'Gym',
    title: 'Where Wellness Meets Excellence',
    description: 'Stay on top of your fitness goals with our fully equipped gym featuring modern cardio and strength training equipment.',
    image: '/gym.jpeg',
  },
  {
    tag: 'Swimming Pool',
    title: 'Jump In & Refresh Your Senses',
    description: 'Take a dip in our temperature-controlled pool surrounded by lush greenery — perfect for relaxation or a morning swim.',
    image: '/swimming_pool.jpeg',
  },
  {
    tag: 'Restaurant',
    title: 'The Restaurant Hub',
    description: 'Savor culinary excellence at our restaurant, where every dish is crafted with passion and precision. Indulge in a symphony of flavors that will delight your senses.',
    image: '/restaurant.jpeg',
  },
  {
    tag: 'Pick Up & Transfers',
    title: 'Luxury Transfers, Effortless Travel',
    description: 'Arrive in style with our premium airport pickup and transfer service. Professional drivers, luxury vehicles, seamless comfort.',
    image: '/pickup.jpeg',
  },
  {
    tag: 'Parking Space',
    title: 'Safe, Spacious, & Always Available',
    description: 'Secure, well-lit parking with 24/7 surveillance and valet service — one less thing to worry about during your stay.',
    image: '/parking_space.jpeg',
  },
]

const Services = () => {
  const [activeIndex, setActiveIndex] = useState(2)
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

  // Mobile: swipe carousel
  const [mobileIndex, setMobileIndex] = useState(0)
  const touchStartX = useRef(0)
  const touchEndX = useRef(0)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }
  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX
  }
  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current
    if (Math.abs(diff) < 50) return
    if (diff > 0 && mobileIndex < services.length - 1) setMobileIndex(prev => prev + 1)
    if (diff < 0 && mobileIndex > 0) setMobileIndex(prev => prev - 1)
  }

  return (
    <div ref={sectionRef} className="mt-26">
      <div className="flex flex-col items-center">
        <div className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <Pill icon={<FaArrowRight />} animated visible={visible}>
            Our Services
          </Pill>
        </div>
        <h1 className={`text-3xl vsm:text-4xl sm:text-5xl text-foreground-disabled leading-10 vsm:leading-13 font-bold font-heading text-center mt-4 max-w-3xl transition-all duration-700 delay-150 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          Quality Service, Unforgettable Stays
        </h1>
        <p className={`text-foreground-disabled/80 text-center mt-4 mb-4 max-w-2xl text-sm vsm:text-base transition-all duration-700 delay-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          We provide exceptional service to ensure your stay is memorable and enjoyable.
        </p>
        <div className={`max-sm:hidden transition-all duration-700 delay-400 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <Button href='/services' withArrow>
            Explore More
          </Button>
        </div>
      </div>

      {/* Desktop: flex accordion grid */}
      <div className={`hidden sm:flex gap-3 mt-10 transition-all duration-800 delay-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        {services.map((service, i) => (
          <ServicesCard
            key={service.tag}
            {...service}
            isActive={activeIndex === i}
            onHover={() => setActiveIndex(i)}
            onLeave={() => {}}
          />
        ))}
      </div>

      {/* Mobile: swipeable card with dots */}
      <div className={`sm:hidden mt-8 transition-all duration-800 delay-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <div
          className="overflow-hidden rounded-2xl touch-pan-y"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <ServicesCard
            {...services[mobileIndex]}
            isActive={true}
            onHover={() => {}}
            onLeave={() => {}}
          />
        </div>
        <div className="flex justify-center gap-2 mt-4">
          {services.map((_, i) => (
            <button
              key={i}
              onClick={() => setMobileIndex(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${i === mobileIndex ? 'w-6 bg-foreground' : 'w-1.5 bg-foreground-disabled'}`}
            />
          ))}
        </div>
        <div className={`sm:hidden flex justify-center mt-6 transition-all duration-700 delay-700 ${visible ? 'opacity-100' : 'opacity-0'}`}>
            <Button href="/rooms" withArrow>Explore More</Button>
        </div>
      </div>
    </div>
  )
}

export default Services
