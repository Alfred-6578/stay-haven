'use client'
import React from 'react'
import Image from 'next/image'
import { GoArrowLeft, GoArrowRight } from 'react-icons/go'

interface Props {
  images: string[]
  activeIndex: number
  onClose: () => void
  onPrev: () => void
  onNext: () => void
  onDotClick: (index: number) => void
  alt: string
}

const Lightbox = ({ images, activeIndex, onClose, onPrev, onNext, onDotClick, alt }: Props) => {
  return (
    <div className="fixed inset-0 z-50 bg-foreground/95 flex items-center justify-center" onClick={onClose}>
      <button className="absolute top-5 right-5 text-foreground-inverse/70 hover:text-foreground-inverse text-2xl font-light">
        &#10005;
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onPrev() }}
        className="absolute left-4 vsm:left-8 bg-foreground-inverse/10 backdrop-blur rounded-full p-3 text-foreground-inverse hover:bg-foreground-inverse/20 transition-colors"
      >
        <GoArrowLeft size={20} />
      </button>
      <div className="relative w-[90vw] h-[70vh] max-w-5xl" onClick={(e) => e.stopPropagation()}>
        <Image src={images[activeIndex]} alt={alt} fill className="object-contain" />
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onNext() }}
        className="absolute right-4 vsm:right-8 bg-foreground-inverse/10 backdrop-blur rounded-full p-3 text-foreground-inverse hover:bg-foreground-inverse/20 transition-colors"
      >
        <GoArrowRight size={20} />
      </button>
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5">
        {images.map((_, idx) => (
          <button
            key={idx}
            onClick={(e) => { e.stopPropagation(); onDotClick(idx) }}
            className={`h-1.5 rounded-full transition-all ${idx === activeIndex ? 'w-5 bg-foreground-inverse' : 'w-1.5 bg-foreground-inverse/40'}`}
          />
        ))}
      </div>
    </div>
  )
}

export default Lightbox
