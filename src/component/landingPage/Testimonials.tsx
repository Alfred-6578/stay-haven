'use client'
import React, { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { GoArrowLeft, GoArrowRight } from 'react-icons/go'
import { RiDoubleQuotesL } from 'react-icons/ri'
import Pill from '../ui/Pill'

const testimonials = [
  {
    name: 'Aitan Mohammed',
    role: 'Product Manager at Y5 Studio',
    avatar: 'https://i.pravatar.cc/150?img=11',
    quote: 'With our dedication and expertise in hospitality, we strive to provide stays that are not just accommodations, but a comforting journey toward relaxation and memorable experiences.',
  },
  {
    name: 'Chioma Okafor',
    role: 'Travel Blogger & Content Creator',
    avatar: 'https://i.pravatar.cc/150?img=5',
    quote: 'StayHaven exceeded every expectation. From the seamless check-in to the impeccable room service, every detail was thoughtfully curated. This is hospitality at its finest.',
  },
  {
    name: 'David Adeyemi',
    role: 'CEO at NovaTech Solutions',
    avatar: 'https://i.pravatar.cc/150?img=12',
    quote: 'I travel frequently for business, and StayHaven has become my go-to. The executive suites are perfect for working remotely, and the concierge team is phenomenal.',
  },
  {
    name: 'Fatima Bello',
    role: 'Interior Designer',
    avatar: 'https://i.pravatar.cc/150?img=9',
    quote: "As a designer, I notice every detail — and StayHaven's interiors are stunning. The blend of modern luxury with warm, welcoming spaces is truly world-class.",
  },
  {
    name: 'James Okonkwo',
    role: 'Frequent Guest & Platinum Member',
    avatar: 'https://i.pravatar.cc/150?img=7',
    quote: "Three years and counting. The loyalty program is genuinely rewarding, and the staff remember your preferences. It feels like coming home every time.",
  },
]

const galleryImages = [
  '/room_2.jpeg', '/room_5.jpeg', '/room_7.jpeg', '/room_9.jpeg',
  '/room_3.jpeg', '/room_6.jpeg', '/room_8.jpeg', '/room_10.jpeg',
]

const Testimonials = () => {
  const [active, setActive] = useState(0)
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

  // Auto-rotate
  useEffect(() => {
    const interval = setInterval(() => {
      setActive(prev => (prev + 1) % testimonials.length)
    }, 6000)
    return () => clearInterval(interval)
  }, [])

  const prev = () => setActive(p => (p - 1 + testimonials.length) % testimonials.length)
  const next = () => setActive(p => (p + 1) % testimonials.length)

  const current = testimonials[active]

  return (
    <div ref={sectionRef} className="mt-20 vsm:mt-28">
      {/* Scattered gallery images */}
      <div className="relative">
        {/* Gallery grid behind the testimonial */}
        <div className={`hidden md:grid grid-cols-4 gap-3 transition-all duration-1000 ${visible ? 'opacity-100' : 'opacity-0'}`}>
          {galleryImages.map((img, i) => (
            <div
              key={img}
              className={`rounded-xl overflow-hidden ${
                i % 3 === 0 ? 'h-32' : i % 3 === 1 ? 'h-40' : 'h-36'
              } ${i >= 4 ? 'mt-[-20px]' : ''}`}
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.9)',
                transition: `all 0.7s ease-out ${0.1 + i * 0.08}s`,
              }}
            >
              <Image
                src={img}
                alt={`Gallery ${i + 1}`}
                width={300}
                height={200}
                sizes="(max-width: 768px) 50vw, 25vw"
                loading="lazy"
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>

        {/* Testimonial card — centered over the gallery */}
        <div className={`md:absolute md:inset-0 flex items-center justify-center md:mt-0 transition-all duration-800 delay-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="bg-foreground-inverse rounded-full w-[90vw] max-w-lg aspect-square flex flex-col items-center justify-center px-8 vsm:px-12 text-center shadow-2xl border border-border">
            {/* Pill */}
            <div className="flex items-center gap-1.5 mb-5">
              <Pill animated visible={visible}>
                Testimonial
              </Pill>
            </div>

            {/* Quote */}
            <div className="relative mb-6">
              <RiDoubleQuotesL className="text-foreground-disabled text-2xl mb-2 mx-auto" />
              <p className="text-foreground text-xs vsm:text-sm leading-relaxed max-w-xs transition-opacity duration-500" key={active}>
                {current.quote}
              </p>
            </div>

            {/* Author */}
            <div className="flex flex-col items-center gap-2" key={`author-${active}`}>
              <Image
                src={current.avatar}
                alt={current.name}
                width={40}
                height={40}
                className="rounded-full"
              />
              <div>
                <p className="text-foreground text-sm font-semibold">{current.name}</p>
                <p className="text-foreground-tertiary text-xs">{current.role}</p>
              </div>
            </div>

            {/* Dots */}
            <div className="flex gap-1.5 mt-4">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${i === active ? 'w-5 bg-foreground' : 'w-1.5 bg-foreground-disabled'}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation arrows */}
      <div className={`flex justify-center gap-3 mt-6 transition-all duration-700 delay-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <button
          onClick={prev}
          className="border border-foreground rounded-full p-2.5 hover:bg-foreground hover:text-foreground-inverse transition-colors cursor-pointer"
        >
          <GoArrowLeft className="text-current font-black text-lg" />
        </button>
        <button
          onClick={next}
          className="bg-foreground text-foreground-inverse rounded-full p-2.5 hover:bg-foreground/80 transition-colors cursor-pointer"
        >
          <GoArrowRight className="font-black text-lg" />
        </button>
      </div>
    </div>
  )
}

export default Testimonials
