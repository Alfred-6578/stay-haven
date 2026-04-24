import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { GoHeartFill } from 'react-icons/go'
import Pill from '../ui/Pill'
import ArrowIcon from '../ui/ArrowIcon'

interface Props {
    image: string
    tag: string
    title: string
    price: number
    slug: string
}

const RoomTypeCard = ({ image, tag, title, price, slug }: Props) => {
  return (
    <Link href={`/rooms/${slug}`} className='block w-full h-85 rounded-2xl overflow-hidden relative group'>
        <Image
          src={image}
          alt={title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          className='object-cover transition-transform duration-500 group-hover:scale-105'
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/50 via-transparent to-transparent" />
        <div className='flex justify-between h-full flex-col relative top-0 p-4'>
          <div className="flex justify-between items-start">
            <div className="p-3 rounded-full bg-foreground-inverse/10 text-foreground-inverse backdrop-blur-2xl">
              <GoHeartFill />
            </div>
            <Pill className="px-3! text-foreground-inverse">
              ₦{price.toLocaleString()} / night
            </Pill>
          </div>
          <div className="flex items-start justify-between bg-foreground-inverse/30 backdrop-blur rounded-2xl p-3">
            <div className="flex flex-col gap-2 items-start">
              <Pill className="px-3! py-1! text-foreground-inverse">
                {tag}
              </Pill>
              <h3 className='text-xl text-foreground-inverse mb-5'>{title}</h3>
            </div>
            <ArrowIcon variant='inverse' className='p-3!'/>
          </div>
        </div>
    </Link>
  )
}

export default RoomTypeCard
