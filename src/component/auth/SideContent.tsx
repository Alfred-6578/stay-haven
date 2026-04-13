'use client'
import React from 'react'
import Image from 'next/image'
import Link from 'next/link'

const SideContent = ({
    children
}:{
    children: React.ReactNode
}) => {
  return (
    <div className='flex flex-col justify-between bg-accent h-full p-12 max-lg:hidden'>
        <Link href={'/'} className="flex gap-3 items-center ">
            <Image src={require('@/assets/logo-inverted.png')} alt='logo' className='w-13 h-13' />
            <p className='font-body font-bold text-[26px]'>StayHaven</p>
        </Link>
        <div className="">
            {children}
        </div>
        <div className="">
            {new Date().getFullYear()} &copy; StayHaven. All rights reserved.
        </div>
    </div>
  )
}

export default SideContent