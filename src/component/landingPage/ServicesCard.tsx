'use client'
import React from 'react'
import Image from 'next/image'

interface Props {
  tag: string
  title: string
  description: string
  image: string
  isActive: boolean
  onHover: () => void
  onLeave: () => void
}

const ServicesCard = ({ tag, title, description, image, isActive, onHover, onLeave }: Props) => {
  return (
    <div
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      className={`relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-500 ease-in-out h-[400px] vsm:h-[450px] sm:h-[500px] ${
        isActive ? 'flex-[2.5]' : 'flex-[1]'
      }`}
    >
      <Image
        src={image}
        alt={title}
        fill
        sizes="(max-width: 640px) 100vw, 33vw"
        className="object-cover transition-transform duration-500"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-foreground/20 to-transparent" />

      {/* Collapsed: rotated text */}
      <div className={`absolute inset-0 left-3 top-0 h-full flex items-end p-4 transition-opacity duration-400 ${isActive ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <div className="rotate-180 [writing-mode:vertical-rl]">
          <p className="text-xs text-foreground-inverse/70 mb-1">{tag}</p>
          <h3 className="text-lg text-foreground-inverse font-semibold leading-tight">{title}</h3>
        </div>
      </div>

      {/* Expanded: full content */}
      <div className={`absolute inset-0 flex flex-col justify-end p-5 vsm:p-6 transition-opacity duration-400 ${isActive ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <p className="text-xs text-foreground-inverse/70 font-medium uppercase tracking-wider mb-1">{tag}</p>
        <h3 className="text-xl vsm:text-2xl text-foreground-inverse font-bold mb-2">{title}</h3>
        <p className="text-sm text-foreground-inverse/80 leading-relaxed max-w-md">{description}</p>
      </div>
    </div>
  )
}

export default ServicesCard
