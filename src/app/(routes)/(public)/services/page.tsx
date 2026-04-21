'use client'
import React, { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Pill from '@/component/ui/Pill'
import Button from '@/component/ui/Button'
import Footer from '@/component/landingPage/Footer'
import { FaArrowRight } from 'react-icons/fa'
import { HiOutlineCheck } from 'react-icons/hi'
import { MdOutlinePool, MdOutlineRestaurant, MdOutlineFitnessCenter, MdOutlineLocalParking, MdOutlineSpa, MdOutlineLocalLaundryService } from 'react-icons/md'
import { TbCar } from 'react-icons/tb'
import { FiWifi } from 'react-icons/fi'

const services = [
  {
    icon: <MdOutlineFitnessCenter size={28} />,
    tag: 'Fitness',
    title: 'State-of-the-Art Gym',
    description: 'Stay on top of your fitness goals with our fully equipped gym featuring modern cardio and strength training equipment. Open 24/7 with personal trainers available on request.',
    image: '/gym.jpeg',
    highlights: ['Modern equipment', 'Personal trainers', '24/7 access', 'Yoga mats & towels'],
  },
  {
    icon: <MdOutlinePool size={28} />,
    tag: 'Leisure',
    title: 'Temperature-Controlled Pool',
    description: 'Take a dip in our pristine pool surrounded by lush greenery. Perfect for morning laps or an afternoon lounge with poolside cocktails and snacks.',
    image: '/swimming_pool.jpeg',
    highlights: ['Heated pool', 'Poolside bar', 'Sun loungers', 'Towel service'],
  },
  {
    icon: <MdOutlineRestaurant size={28} />,
    tag: 'Dining',
    title: 'The Restaurant Hub',
    description: 'Savor culinary excellence at our restaurant, where every dish is crafted with passion and precision. From local Nigerian cuisine to international favourites.',
    image: '/restaurant.jpeg',
    highlights: ['International menu', 'Local cuisine', 'Room service', 'Private dining'],
  },
  {
    icon: <TbCar size={28} />,
    tag: 'Transport',
    title: 'Airport Pickup & Transfers',
    description: 'Arrive in style with our premium airport pickup and transfer service. Professional drivers, luxury vehicles, and seamless coordination from landing to lobby.',
    image: '/pickup.jpeg',
    highlights: ['Luxury vehicles', 'Professional drivers', 'Flight tracking', 'City tours'],
  },
  {
    icon: <MdOutlineLocalParking size={28} />,
    tag: 'Convenience',
    title: 'Secure Parking',
    description: 'Secure, well-lit parking with 24/7 CCTV surveillance and optional valet service. One less thing to worry about during your stay.',
    image: '/parking_space.jpeg',
    highlights: ['24/7 surveillance', 'Valet available', 'EV charging', 'Covered parking'],
  },
  {
    icon: <MdOutlineSpa size={28} />,
    tag: 'Wellness',
    title: 'Spa & Relaxation',
    description: 'Unwind with our range of spa treatments — from deep tissue massages to aromatherapy sessions. Certified therapists, serene ambiance, complete rejuvenation.',
    image: '/room_12.jpeg',
    highlights: ['Certified therapists', 'Couples packages', 'Sauna & steam', 'Aromatherapy'],
  },
  {
    icon: <MdOutlineLocalLaundryService size={28} />,
    tag: 'Housekeeping',
    title: 'Laundry & Dry Cleaning',
    description: 'Professional laundry and dry cleaning services with same-day turnaround. Because looking your best should be effortless.',
    image: '/room_3.jpeg',
    highlights: ['Same-day service', 'Dry cleaning', 'Iron & press', 'Express available'],
  },
  {
    icon: <FiWifi size={28} />,
    tag: 'Connectivity',
    title: 'High-Speed WiFi',
    description: 'Stay connected with complimentary high-speed WiFi throughout the property. Stream, work, or video call — no buffering, no limits.',
    image: '/room_6.jpeg',
    highlights: ['Complimentary', 'Property-wide', 'High bandwidth', 'Business centre'],
  },
]

export default function ServicesPage() {
  const heroRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const [vis, setVis] = useState({ hero: false, grid: false })

  useEffect(() => {
    const observers: IntersectionObserver[] = []
    const pairs: [string, React.RefObject<HTMLDivElement | null>][] = [
      ['hero', heroRef], ['grid', gridRef],
    ]
    for (const [key, ref] of pairs) {
      const el = ref.current
      if (!el) continue
      const obs = new IntersectionObserver(
        ([e]) => { if (e.isIntersecting) { setVis(p => ({ ...p, [key]: true })); obs.disconnect() } },
        { threshold: 0.08 }
      )
      obs.observe(el)
      observers.push(obs)
    }
    return () => observers.forEach(o => o.disconnect())
  }, [])

  return (
    <div className="bg-foreground-inverse">
      {/* Hero */}
      <div ref={heroRef} className="relative overflow-hidden bg-foreground rounded-b-3xl">
        <div className="absolute inset-0">
          <Image src="/restaurant.jpeg" alt="Services" fill className="object-cover opacity-25" />
        </div>
        <div className="relative z-10 px-5 vsm:px-8 sm:px-12 lg:px-16 pt-16 vsm:pt-24 pb-20 vsm:pb-28 text-center">
          <div className={`flex justify-center transition-all duration-700 ${vis.hero ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <Pill icon={<FaArrowRight />} className="border-foreground-inverse/20! text-foreground-inverse/80!">
              Our Services
            </Pill>
          </div>
          <h1 className={`font-heading font-bold text-foreground-inverse text-3xl vsm:text-4xl sm:text-5xl lg:text-6xl leading-tight mt-5 max-w-3xl mx-auto transition-all duration-700 delay-150 ${vis.hero ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            Everything you need, nothing you don&apos;t
          </h1>
          <p className={`text-foreground-inverse/60 text-sm vsm:text-base sm:text-lg mt-4 max-w-xl mx-auto leading-relaxed transition-all duration-700 delay-300 ${vis.hero ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            From world-class dining to seamless transfers, every service at StayHaven is designed to make your stay effortless and extraordinary.
          </p>
        </div>
      </div>

      {/* Services Grid */}
      <div ref={gridRef} className="px-5 vsm:px-8 sm:px-12 lg:px-16 py-16 vsm:py-20">
        <div className="max-w-6xl mx-auto flex flex-col gap-16 vsm:gap-20">
          {services.map((service, i) => {
            const isEven = i % 2 === 0
            return (
              <div
                key={service.title}
                className={`grid lg:grid-cols-2 gap-8 lg:gap-12 items-center`}
                style={{
                  opacity: vis.grid ? 1 : 0,
                  transform: vis.grid ? 'translateY(0)' : 'translateY(30px)',
                  transition: `all 0.7s ease-out ${0.1 + i * 0.08}s`,
                }}
              >
                {/* Image */}
                <div className={`relative h-64 vsm:h-72 sm:h-80 rounded-2xl overflow-hidden group ${isEven ? 'lg:order-1' : 'lg:order-2'}`}>
                  <Image
                    src={service.image}
                    alt={service.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/30 to-transparent" />
                  <div className="absolute top-4 left-4 bg-foreground-inverse/90 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-1.5">
                    <span className="text-foreground">{service.icon}</span>
                    <span className="text-foreground text-xs font-medium">{service.tag}</span>
                  </div>
                </div>

                {/* Content */}
                <div className={`${isEven ? 'lg:order-2' : 'lg:order-1'}`}>
                  <h2 className="font-heading text-xl vsm:text-2xl sm:text-3xl font-bold text-foreground mb-3">
                    {service.title}
                  </h2>
                  <p className="text-foreground-secondary text-sm vsm:text-base leading-relaxed mb-6">
                    {service.description}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {service.highlights.map(h => (
                      <div key={h} className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-success/10 flex items-center justify-center shrink-0">
                          <HiOutlineCheck className="text-success text-xs" />
                        </div>
                        <span className="text-foreground text-sm">{h}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* CTA */}
      <div className="px-5 vsm:px-8 sm:px-12 lg:px-16 pb-16">
        <div className="max-w-6xl mx-auto bg-foreground rounded-2xl p-8 vsm:p-10 sm:p-12 text-center">
          <h3 className="font-heading text-xl vsm:text-2xl sm:text-3xl font-bold text-foreground-inverse mb-3">
            Ready to experience it all?
          </h3>
          <p className="text-foreground-inverse/60 text-sm vsm:text-base mb-6 max-w-lg mx-auto">
            Book your stay and unlock access to every service, every amenity, every unforgettable moment.
          </p>
          <Button href="/rooms" withArrow variant="outline" className="border-foreground-inverse/30! text-foreground-inverse! hover:bg-foreground-inverse/10!">
            Book Your Stay
          </Button>
        </div>
      </div>

      <Footer />
    </div>
  )
}
