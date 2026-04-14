'use client'
import Image from 'next/image'
import React from 'react'
import Link from 'next/link'
import logo from '@/assets/logo.png'
import { IoIosMenu } from 'react-icons/io'
import { HiXMark } from 'react-icons/hi2'
import { HiOutlineViewGrid, HiOutlineCalendar, HiOutlineStar, HiOutlineUser, HiOutlineLogout } from 'react-icons/hi'
import Button from './Button'
import { useAuth } from '@/context/AuthContext'
import LoyaltyTierBadge from '@/component/guest/LoyaltyTierBadge'
import NotificationBell from '@/component/guest/NotificationBell'

const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/rooms', label: 'Rooms' },
    { href: '/about', label: 'About Us' },
    { href: '/services', label: 'Services' },
]

const guestLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: HiOutlineViewGrid },
    { href: '/bookings', label: 'Bookings', icon: HiOutlineCalendar },
    { href: '/loyalty', label: 'Loyalty', icon: HiOutlineStar },
    { href: '/profile', label: 'Profile', icon: HiOutlineUser },
]

const Navbar = () => {
    const [isMenuOpen, setIsMenuOpen] = React.useState(false)
    const { user, loading, logout } = useAuth()

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen)

    const isLoggedIn = !loading && !!user

    return (
        <div className="px-4 py-4 vsm:px-6 vsm:py-6 bg-foreground-inverse relative z-50">
            <div className="flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 animate-hero-fade-in hero-delay-1">
                    <Image src={logo} alt="Logo" className='w-8 h-8 rounded-sm' />
                    <b className="text-foreground text-xl">StayHaven</b>
                </Link>

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

                {/* Right side */}
                <div className="flex items-center gap-3">
                    {isLoggedIn ? (
                        <>
                            {/* Desktop: logged-in state */}
                            <div className="max-lg:hidden flex items-center gap-3 animate-hero-fade-in hero-delay-3">
                                <NotificationBell />
                                <Link
                                    href="/dashboard"
                                    className="flex items-center gap-2.5 px-1.5 py-1.5 rounded-full border border-border hover:border-foreground-disabled/50 transition-colors"
                                >
                                    <div className="w-7 h-7 rounded-full bg-foreground flex items-center justify-center text-foreground-inverse text-xs font-semibold">
                                        {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                                    </div>
                                    {/* <div className="flex flex-col">
                                        <span className="text-foreground text-sm font-medium leading-tight">{user.firstName}</span>
                                        <LoyaltyTierBadge tier={user.guestProfile?.loyaltyTier || 'BRONZE'} />
                                    </div> */}
                                </Link>
                            </div>
                            <div className="animate-hero-scale-in hero-delay-3 max-vsm:hidden">
                                <Button href="/rooms" withArrow>
                                    Book Now
                                </Button>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Desktop: logged-out state */}
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
                        </>
                    )}

                    {/* Mobile hamburger */}
                    <div className="animate-hero-fade-in hero-delay-2 lg:hidden">
                        <button onClick={toggleMenu} className="border border-foreground text-foreground px-3 py-[5px] cursor-pointer rounded-3xl">
                            {isMenuOpen ? <HiXMark className='text-xl'/> : <IoIosMenu className='text-xl'/>}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile nav */}
            <nav className={`flex flex-col gap-4 bg-foreground-inverse text-foreground lg:hidden overflow-hidden transition-all duration-300 ${isMenuOpen ? 'max-h-[500px] mt-5' : 'max-h-0'}`}>
                {navLinks.map((link) => (
                    <Link key={link.href} onClick={() => setIsMenuOpen(false)} className='hover:underline transition vsm:text-[17px]' href={link.href}>{link.label}</Link>
                ))}

                {isLoggedIn ? (
                    <>
                        <div className="border-t border-border pt-4">
                            {/* User info */}
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-9 h-9 rounded-full bg-foreground flex items-center justify-center text-foreground-inverse text-sm font-semibold">
                                    {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                                </div>
                                <div>
                                    <p className="text-foreground text-sm font-medium">{user.firstName} {user.lastName}</p>
                                    <LoyaltyTierBadge tier={user.guestProfile?.loyaltyTier || 'BRONZE'} />
                                </div>
                            </div>

                            {/* Guest quick links */}
                            <div className="flex flex-col gap-1 mb-4">
                                {guestLinks.map(link => (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        onClick={() => setIsMenuOpen(false)}
                                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground-secondary hover:bg-foreground-disabled/10 hover:text-foreground transition-colors"
                                    >
                                        <link.icon size={18} />
                                        {link.label}
                                    </Link>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            <Button href="/rooms" withArrow fullWidth className="vsm:hidden">
                                Book Now
                            </Button>
                            <button
                                onClick={() => { logout(); setIsMenuOpen(false) }}
                                className="flex items-center justify-center gap-2 px-5 py-2 rounded-full border border-danger/30 text-danger text-sm font-medium hover:bg-danger-bg transition-colors"
                            >
                                <HiOutlineLogout size={16} />
                                Sign Out
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="grid grid-cols-1 gap-3">
                        <Button href="/login" variant="outline" fullWidth>
                            Login
                        </Button>
                        <Button href="/rooms" withArrow fullWidth className="vsm:hidden">
                            Book Now
                        </Button>
                    </div>
                )}
            </nav>
        </div>
    )
}

export default Navbar
