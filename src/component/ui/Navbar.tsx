'use client'
import Image from 'next/image'
import React from 'react'
import logo from '@/assets/logo.png'
import Link from 'next/link'
import { IoIosMenu } from 'react-icons/io'
import { HiXMark } from 'react-icons/hi2'
import Button from './Button'

const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/rooms', label: 'Rooms' },
    { href: '/about', label: 'About Us' },
    { href: '/services', label: 'Services' },
]

const Navbar = () => {
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };
  return (
    <div className="px-4 py-4 vsm:px-6 vsm:py-6 bg-foreground-inverse">
        <div className=' flex items-center justify-between'>
            {/* Logo */}
            <div className="flex items-center gap-2 animate-hero-fade-in hero-delay-1">
                <Image src={logo} alt="Logo" className='w-8 h-8 rounded-sm' />
                <b className="text-foreground text-xl">StayHaven</b>
            </div>

            {/* Desktop nav links */}
            <nav className="flex gap-5 text-foreground max-lg:hidden">
                {navLinks.map((link, i) => (
                    <Link
                        key={link.href}
                        href={link.href}
                        className="hover:underline transition animate-hero-fade-up"
                        style={{ animationDelay: `${0.15 + i * 0.07}s` }}
                    >
                        {link.label}
                    </Link>
                ))}
            </nav>

            {/* CTA buttons */}
            <div className="flex gap-3">
                <div className="animate-hero-fade-in hero-delay-3 max-lg:hidden">
                    <Button href="/login" variant="outline">
                        Login
                    </Button>
                </div>
                <div className="animate-hero-scale-in hero-delay-3 max-vsm:hidden">
                    <Button href="/rooms" withArrow>
                        Book Now
                    </Button>
                </div>
                <div className="animate-hero-fade-in hero-delay-2 border-none">
                    <button onClick={toggleMenu} className="border border-foreground lg:hidden text-foreground px-3 py-[5px] cursor-pointer rounded-3xl">
                        {isMenuOpen ?
                            <HiXMark className='text-xl'/>
                            :
                            <IoIosMenu className='text-xl'/>
                        }
                    </button>
                </div>
            </div>

        </div>
        <nav className={`flex flex-col gap-4 bg-foreground-inverse text-foreground lg:hidden overflow-hidden transition-all duration-300 ${isMenuOpen ? 'max-h-70 mt-5':'max-h-0'}`}>
            {navLinks.map((link) => (
                <Link key={link.href} className='hover:underline transition vsm:text-[17px]' href={link.href}>{link.label}</Link>
            ))}
            <div className="grid grid-cols-1 gap-3">
                <Button href="/login" variant="outline" fullWidth>
                    Login
                </Button>
                <Button href="/rooms" withArrow fullWidth className="vsm:hidden">
                    Book Now
                </Button>
            </div>
        </nav>

    </div>
  )
}

export default Navbar
