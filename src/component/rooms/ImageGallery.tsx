'use client'
import React from 'react'
import Image from 'next/image'
import { MdOutlineKingBed } from 'react-icons/md'

interface Props {
  images: string[]
  name: string
  tag: string | null
  onImageClick: (index: number) => void
  visible: boolean
}

const ImageGallery = ({ images, name, tag, onImageClick, visible }: Props) => {
  if (images.length === 0) {
    return (
      <div className="h-64 vsm:h-80 bg-foreground-disabled/10 rounded-2xl flex items-center justify-center">
        <MdOutlineKingBed className="text-foreground-disabled text-6xl" />
      </div>
    )
  }

  if (images.length < 3) {
    return (
      <div
        className={`relative h-64 vsm:h-80 sm:h-96 lg:h-[460px] rounded-2xl overflow-hidden cursor-pointer group transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
        onClick={() => onImageClick(0)}
      >
        <Image src={images[0]} alt={name} fill priority className="object-cover transition-transform duration-500 group-hover:scale-105" />
      </div>
    )
  }

  return (
    <div className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 vsm:gap-3 h-auto lg:h-[460px]">
        {/* Main large image */}
        <div
          className="lg:col-span-2 lg:row-span-2 relative h-64 vsm:h-80 lg:h-full rounded-xl vsm:rounded-2xl overflow-hidden cursor-pointer group"
          onClick={() => onImageClick(0)}
        >
          <Image src={images[0]} alt={name} fill priority className="object-cover transition-transform duration-500 group-hover:scale-105" />
          <div className="absolute inset-0 bg-foreground/5 group-hover:bg-foreground/10 transition-colors" />
          {tag && (
            <div className="absolute top-4 left-4 bg-foreground-inverse/90 backdrop-blur-sm text-foreground text-xs font-medium px-3 py-1 rounded-full">
              {tag}
            </div>
          )}
        </div>
        {/* Top right */}
        <div
          className="hidden lg:block relative rounded-2xl overflow-hidden cursor-pointer group"
          onClick={() => onImageClick(1)}
        >
          <Image src={images[1]} alt={`${name} 2`} fill className="object-cover transition-transform duration-500 group-hover:scale-105" />
          <div className="absolute inset-0 bg-foreground/5 group-hover:bg-foreground/10 transition-colors" />
        </div>
        {/* Bottom right */}
        <div
          className="hidden lg:block relative rounded-2xl overflow-hidden cursor-pointer group"
          onClick={() => onImageClick(2)}
        >
          <Image src={images[2 % images.length]} alt={`${name} 3`} fill className="object-cover transition-transform duration-500 group-hover:scale-105" />
          <div className="absolute inset-0 bg-foreground/5 group-hover:bg-foreground/10 transition-colors" />
          {images.length > 3 && (
            <div className="absolute inset-0 bg-foreground/40 flex items-center justify-center">
              <span className="text-foreground-inverse text-sm font-medium">+{images.length - 3} more</span>
            </div>
          )}
        </div>
        {/* Mobile: scrollable thumbnails */}
        <div className="lg:hidden flex gap-2 overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
          {images.slice(1).map((img, idx) => (
            <div
              key={idx}
              className="relative w-28 h-20 vsm:w-36 vsm:h-24 flex-shrink-0 rounded-xl overflow-hidden cursor-pointer"
              onClick={() => onImageClick(idx + 1)}
            >
              <Image src={img} alt={`${name} ${idx + 2}`} fill className="object-cover" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ImageGallery
