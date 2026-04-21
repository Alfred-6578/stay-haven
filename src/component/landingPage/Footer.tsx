'use client'
import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import logo from '@/assets/logo-inverted.png'
import { FaXTwitter, FaInstagram, FaFacebookF } from 'react-icons/fa6'
import { GoArrowUpRight } from 'react-icons/go'

const footerLinks = [
  {
    title: 'About us',
    links: [
      { label: 'Our Story', href: '/about' },
      { label: 'Careers', href: '/about' },
      { label: 'Press', href: '/about' },
    ],
  },
  {
    title: 'FAQ',
    links: [
      { label: 'Booking', href: '/rooms' },
      { label: 'Cancellation', href: '/rooms' },
      { label: 'Payments', href: '/rooms' },
    ],
  },
  {
    title: 'Contact us',
    links: [
      { label: 'Support', href: '/about' },
      { label: 'Partnerships', href: '/about' },
      { label: 'Feedback', href: '/about' },
    ],
  },
]

const socials = [
  { icon: FaFacebookF, href: '#', label: 'Facebook' },
  { icon: FaXTwitter, href: '#', label: 'Twitter' },
  { icon: FaInstagram, href: '#', label: 'Instagram' },
]

const galleryImages = [
  '/room_3.jpeg', '/room_5.jpeg', '/room_8.jpeg', '/room_10.jpeg',
]

const Footer = () => {
  const footerRef = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = footerRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect() } },
      { threshold: 0.1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <footer ref={footerRef} className="bg-foreground text-foreground-inverse mt-20 vsm:mt-28 rounded-t-3xl overflow-hidden">
      {/* Big brand text */}
      <div className={`relative overflow-hidden transition-all duration-1000 ${visible ? 'opacity-100' : 'opacity-0'}`}>
        {/* Gallery images scattered behind text */}
        <div className="absolute inset-0 flex items-center justify-between px-8 opacity-20">
          {galleryImages.map((img, i) => (
            <div
              key={img}
              className={`rounded-xl overflow-hidden w-24 vsm:w-32 sm:w-40 ${i % 2 === 0 ? 'h-28 vsm:h-36 -rotate-6' : 'h-24 vsm:h-32 rotate-6 mt-8'}`}
              style={{
                opacity: visible ? 1 : 0,
                transition: `opacity 1s ease-out ${0.3 + i * 0.15}s`,
              }}
            >
              <Image src={img} alt="" width={200} height={160} sizes="(max-width: 640px) 96px, (max-width: 1024px) 128px, 160px" loading="lazy" className="w-full h-full object-cover" />
            </div>
          ))}
        </div>

        <div className="relative z-1 py-12 vsm:py-16 sm:py-20 px-6 text-center">
          <h2
            className={`font-heading font-bold text-4xl vsm:text-6xl sm:text-7xl lg:text-8xl xl:text-9xl uppercase tracking-tight leading-none text-foreground-inverse/10 transition-all duration-1000 delay-200 ${visible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}
          >
            Stay<span className="text-foreground-inverse/30">Haven</span>
          </h2>
        </div>
      </div>

      {/* Links row */}
      <div className="border-t border-foreground-inverse/10 px-6 vsm:px-8 lg:px-12 py-10 vsm:py-12">
        <div className={`flex flex-col sm:flex-row justify-center gap-10 sm:gap-16 lg:gap-24 transition-all duration-700 delay-400 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          {footerLinks.map((group) => (
            <div key={group.title}>
              <button className="flex items-center gap-1 text-sm font-semibold text-foreground-inverse mb-4 group">
                {group.title}
                <GoArrowUpRight className="text-xs group-hover:rotate-90 transition-transform" />
              </button>
              <ul className="flex flex-col gap-2.5">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-foreground-inverse/50 text-sm hover:text-foreground-inverse transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Quote */}
        <div className={`max-w-lg mx-auto text-center mt-10 vsm:mt-12 transition-all duration-700 delay-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <p className="text-foreground-inverse/50 text-xs vsm:text-sm leading-relaxed italic">
            &ldquo;With our dedication and expertise in hospitality, we strive to offer stays that go beyond just a room, providing a comforting journey toward relaxation and unforgettable experiences.&rdquo;
          </p>
        </div>
      </div>

      {/* Bottom bar */}
      <div className={`border-t border-foreground-inverse/10 px-6 vsm:px-8 lg:px-12 py-5 vsm:py-6 transition-all duration-700 delay-600 ${visible ? 'opacity-100' : 'opacity-0'}`}>
        <div className="flex flex-col vsm:flex-row items-center justify-between gap-4">
          {/* Left: logo + phone */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Image src={logo} alt="StayHaven" className="w-6 h-6 rounded-sm" />
              <span className="text-foreground-inverse text-sm font-semibold">StayHaven</span>
            </div>
            <span className="text-foreground-inverse/40 text-xs hidden sm:inline">|</span>
            <span className="text-foreground-inverse/40 text-xs hidden sm:inline">Helpline: +234 800 STAYHAVEN</span>
          </div>

          {/* Center: socials */}
          <div className="flex items-center gap-3">
            {socials.map((social) => (
              <Link
                key={social.label}
                href={social.href}
                aria-label={social.label}
                className="w-8 h-8 rounded-full border border-foreground-inverse/20 flex items-center justify-center text-foreground-inverse/50 hover:text-foreground-inverse hover:border-foreground-inverse/50 transition-colors"
              >
                <social.icon className="text-sm" />
              </Link>
            ))}
          </div>

          {/* Right: copyright */}
          <p className="text-foreground-inverse/30 text-xs">
            &copy; {new Date().getFullYear()} StayHaven. All Rights Reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
