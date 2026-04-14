'use client'
import React, { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Pill from '@/component/ui/Pill'
import Button from '@/component/ui/Button'
import Footer from '@/component/landingPage/Footer'
import { FaArrowRight } from 'react-icons/fa'
import { BsShieldCheck } from 'react-icons/bs'
import { HiOutlineUsers, HiOutlineStar, HiOutlineClock, HiOutlineGlobe } from 'react-icons/hi'

const stats = [
  { value: '12,000+', label: 'Guests Served', icon: <HiOutlineUsers size={22} /> },
  { value: '4.9', label: 'Average Rating', icon: <HiOutlineStar size={22} /> },
  { value: '24/7', label: 'Concierge Service', icon: <HiOutlineClock size={22} /> },
  { value: '3+', label: 'Years of Excellence', icon: <HiOutlineGlobe size={22} /> },
]

const values = [
  {
    title: 'Luxury Without Compromise',
    description: 'Every room, every amenity, and every interaction is designed to exceed expectations. We believe luxury should feel effortless.',
  },
  {
    title: 'Guest-First Philosophy',
    description: 'Your comfort drives every decision we make — from the thread count on our sheets to the warmth of our welcome.',
  },
  {
    title: 'Attention to Detail',
    description: 'We obsess over the small things so you don\'t have to. Fresh flowers, perfectly timed turndowns, your favourite drink remembered.',
  },
  {
    title: 'Community & Culture',
    description: 'We celebrate local art, cuisine, and craft. Every StayHaven property reflects the soul of its surroundings.',
  },
]

const team = [
  { name: 'Adaobi Eze', role: 'General Manager', image: 'https://i.pravatar.cc/150?img=32' },
  { name: 'Emeka Okafor', role: 'Head of Operations', image: 'https://i.pravatar.cc/150?img=12' },
  { name: 'Fatima Bello', role: 'Guest Relations', image: 'https://i.pravatar.cc/150?img=5' },
  { name: 'David Adeyemi', role: 'Executive Chef', image: 'https://i.pravatar.cc/150?img=7' },
]

export default function AboutPage() {
  const heroRef = useRef<HTMLDivElement>(null)
  const storyRef = useRef<HTMLDivElement>(null)
  const valuesRef = useRef<HTMLDivElement>(null)
  const teamRef = useRef<HTMLDivElement>(null)

  const [vis, setVis] = useState({ hero: false, story: false, values: false, team: false })

  useEffect(() => {
    const observers: IntersectionObserver[] = []
    const pairs: [string, React.RefObject<HTMLDivElement | null>][] = [
      ['hero', heroRef], ['story', storyRef], ['values', valuesRef], ['team', teamRef],
    ]
    for (const [key, ref] of pairs) {
      const el = ref.current
      if (!el) continue
      const obs = new IntersectionObserver(
        ([e]) => { if (e.isIntersecting) { setVis(p => ({ ...p, [key]: true })); obs.disconnect() } },
        { threshold: 0.1 }
      )
      obs.observe(el)
      observers.push(obs)
    }
    return () => observers.forEach(o => o.disconnect())
  }, [])

  return (
    <div className="bg-foreground-inverse">
      {/* Hero */}
      <div ref={heroRef} className="relative h-140 bg-foreground rounded-b-3xl">
        <div className="absolute inset-0">
          <Image src="/room_8.jpeg" alt="StayHaven" fill className="object-cover opacity-30" />
        </div>
        <div className="relative z-10 px-5 vsm:px-8 sm:px-12 lg:px-16 pt-16 vsm:pt-24 pb-20 vsm:pb-28">
          <div className={`flex items-start transition-all duration-700 ${vis.hero ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <Pill icon={<FaArrowRight />} className="border-foreground-inverse/20! text-foreground-inverse/80!">
              About StayHaven
            </Pill>
          </div>
          <h1 className={`font-heading font-bold text-foreground-inverse text-3xl vsm:text-4xl sm:text-5xl lg:text-6xl leading-tight mt-5 max-w-3xl transition-all duration-700 delay-150 ${vis.hero ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            Where every stay becomes a memory worth keeping.
          </h1>
          <p className={`text-foreground-inverse/60 text-sm vsm:text-base sm:text-lg mt-4 max-w-xl leading-relaxed transition-all duration-700 delay-300 ${vis.hero ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            Since our founding, StayHaven has redefined hospitality in Nigeria — blending modern luxury with genuine warmth to create experiences that last a lifetime.
          </p>
        </div>

        {/* Stats bar */}
        <div className={`relative z-10 -mb-14 mx-5 vsm:mx-8 sm:mx-12 lg:mx-16 transition-all duration-700 delay-500 ${vis.hero ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="bg-foreground-inverse rounded-2xl shadow-xl border border-border p-5 vsm:p-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map((stat, i) => (
                <div key={stat.label} className="flex items-center gap-3" style={{ opacity: vis.hero ? 1 : 0, transition: `opacity 0.5s ease-out ${0.6 + i * 0.1}s` }}>
                  <div className="w-11 h-11 rounded-xl bg-foreground-disabled/10 flex items-center justify-center text-foreground flex-shrink-0">
                    {stat.icon}
                  </div>
                  <div>
                    <p className="text-foreground text-lg vsm:text-xl font-bold leading-tight">{stat.value}</p>
                    <p className="text-foreground-tertiary text-xs">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Our Story */}
      <div ref={storyRef} className="px-5 vsm:px-8 sm:px-12 lg:px-16 pt-24 vsm:pt-28 pb-16">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center max-w-6xl mx-auto">
          <div className={` transition-all duration-700 ${vis.story ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-6'}`}>
            <Pill animated visible={vis.story} className='inline'>Our Story</Pill>
            <h2 className="font-heading text-2xl vsm:text-3xl sm:text-4xl font-bold text-foreground mt-4 mb-5">
              Built on a passion for exceptional hospitality
            </h2>
            <div className="flex flex-col gap-4 text-foreground-secondary text-sm vsm:text-base leading-relaxed">
              <p>
                StayHaven was born from a simple belief: that every traveller deserves more than just a place to sleep. They deserve an experience — one that feels personal, luxurious, and effortless.
              </p>
              <p>
                What started as a single boutique property in Lagos has grown into a curated collection of premium accommodations, each reflecting our commitment to design, comfort, and heartfelt service.
              </p>
              <p>
                Today, we serve over 12,000 guests annually, and every stay reminds us why we started — to create moments that matter.
              </p>
            </div>
            <div className="mt-8">
              <Button href="/rooms" withArrow>Explore Our Rooms</Button>
            </div>
          </div>
          <div className={`transition-all duration-700 delay-200 ${vis.story ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-6'}`}>
            <div className="grid grid-cols-2 gap-3">
              <div className="relative h-48 vsm:h-56 rounded-2xl overflow-hidden">
                <Image src="/room_5.jpeg" alt="Interior" fill className="object-cover" />
              </div>
              <div className="relative h-48 vsm:h-56 rounded-2xl overflow-hidden mt-6">
                <Image src="/room_7.jpeg" alt="Lounge" fill className="object-cover" />
              </div>
              <div className="relative h-48 vsm:h-56 rounded-2xl overflow-hidden col-span-2">
                <Image src="/room_9.jpeg" alt="Suite" fill className="object-cover" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Our Values */}
      <div ref={valuesRef} className="px-5 vsm:px-8 sm:px-12 lg:px-16 py-16 bg-foreground-disabled/[0.06] border-y border-border">
        <div className="max-w-6xl mx-auto">
          <div className={`text-center mb-10 transition-all duration-700 ${vis.values ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <Pill className='inline' animated visible={vis.values}>What We Stand For</Pill>
            <h2 className="font-heading text-2xl vsm:text-3xl sm:text-4xl font-bold text-foreground mt-4">Our Values</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-5 vsm:gap-6">
            {values.map((v, i) => (
              <div
                key={v.title}
                className="bg-foreground-inverse rounded-2xl border border-border p-6 vsm:p-8 hover:shadow-md transition-shadow"
                style={{
                  opacity: vis.values ? 1 : 0,
                  transform: vis.values ? 'translateY(0)' : 'translateY(20px)',
                  transition: `all 0.6s ease-out ${0.2 + i * 0.1}s`,
                }}
              >
                <div className="w-10 h-10 rounded-xl bg-foreground-disabled/10 flex items-center justify-center text-foreground mb-4">
                  <BsShieldCheck size={20} />
                </div>
                <h3 className="font-heading text-lg font-bold text-foreground mb-2">{v.title}</h3>
                <p className="text-foreground-secondary text-sm leading-relaxed">{v.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Team */}
      <div ref={teamRef} className="px-5 vsm:px-8 sm:px-12 lg:px-16 py-16">
        <div className="max-w-6xl mx-auto">
          <div className={`text-center mb-10 transition-all duration-700 ${vis.team ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <Pill className='inline' animated visible={vis.team}>The People Behind StayHaven</Pill>
            <h2 className="font-heading text-2xl vsm:text-3xl sm:text-4xl font-bold text-foreground mt-4">Meet Our Team</h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 vsm:gap-6">
            {team.map((member, i) => (
              <div
                key={member.name}
                className="text-center"
                style={{
                  opacity: vis.team ? 1 : 0,
                  transform: vis.team ? 'translateY(0)' : 'translateY(20px)',
                  transition: `all 0.6s ease-out ${0.2 + i * 0.1}s`,
                }}
              >
                <div className="relative w-24 h-24 vsm:w-28 vsm:h-28 mx-auto rounded-full overflow-hidden mb-4 ring-2 ring-border ring-offset-2">
                  <Image src={member.image} alt={member.name} fill className="object-cover" />
                </div>
                <h4 className="text-foreground font-semibold text-sm vsm:text-base">{member.name}</h4>
                <p className="text-foreground-tertiary text-xs vsm:text-sm">{member.role}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="px-5 vsm:px-8 sm:px-12 lg:px-16 pb-16">
        <div className="max-w-6xl mx-auto bg-foreground rounded-2xl p-8 vsm:p-10 sm:p-12 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="font-heading text-xl vsm:text-2xl font-bold text-foreground-inverse mb-2">Ready to experience StayHaven?</h3>
            <p className="text-foreground-inverse/60 text-sm">Book your stay today and discover why thousands choose us.</p>
          </div>
          <Button href="/rooms" withArrow variant="outline" className="border-foreground-inverse/30! text-foreground-inverse! hover:bg-foreground-inverse/10!">
            Browse Rooms
          </Button>
        </div>
      </div>

      <Footer />
    </div>
  )
}
