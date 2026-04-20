import Link from 'next/link'
import Image from 'next/image'
import { HiOutlineHome, HiOutlineBookOpen, HiOutlineMail } from 'react-icons/hi'
import { MdOutlineKingBed } from 'react-icons/md'
import logo from '@/assets/logo.png'

const suggestions = [
  { href: '/', label: 'Home', description: 'Back to the landing page', icon: HiOutlineHome },
  { href: '/rooms', label: 'Browse rooms', description: 'Find your next stay', icon: MdOutlineKingBed },
  { href: '/bookings', label: 'My bookings', description: 'Check on your reservations', icon: HiOutlineBookOpen },
  { href: '/contact', label: 'Contact support', description: "We're here to help", icon: HiOutlineMail },
]

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background-secondary flex flex-col">
      {/* Header */}
      <header className="px-5 sm:px-8 py-4 border-b border-border bg-foreground-inverse">
        <Link href="/" className="inline-flex items-center gap-2">
          <Image src={logo} alt="StayHaven" className="w-7 h-7 rounded-sm" />
          <span className="text-foreground font-bold text-lg">StayHaven</span>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-5 sm:px-8 py-10 sm:py-16">
        <div className="w-full max-w-xl text-center">
          <p className="font-heading text-foreground-disabled text-[80px] sm:text-[120px] leading-none font-bold tracking-tight">
            404
          </p>
          <h1 className="font-heading text-foreground text-2xl sm:text-3xl font-bold mt-2 mb-3">
            This room is unavailable
          </h1>
          <p className="text-foreground-tertiary text-sm sm:text-base leading-relaxed max-w-md mx-auto mb-8">
            The page you&apos;re looking for may have moved, been renamed, or never existed. Let&apos;s get you back on track.
          </p>

          <Link
            href="/"
            className="inline-flex items-center justify-center bg-foreground text-foreground-inverse text-sm font-semibold px-6 py-3 rounded-full hover:opacity-90 transition-opacity mb-10"
          >
            Back to home
          </Link>

          {/* Suggestions */}
          <div className="text-left">
            <p className="text-foreground-tertiary text-xs uppercase tracking-wider font-semibold mb-3 text-center">
              Or try one of these
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {suggestions.map(s => {
                const Icon = s.icon
                return (
                  <Link
                    key={s.href}
                    href={s.href}
                    className="flex items-center gap-3 p-3 bg-foreground-inverse border border-border rounded-xl hover:border-foreground/30 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-lg bg-foreground-disabled/10 flex items-center justify-center text-foreground shrink-0">
                      <Icon size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-foreground text-sm font-semibold truncate">{s.label}</p>
                      <p className="text-foreground-tertiary text-xs truncate">{s.description}</p>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      </main>

      <footer className="px-5 sm:px-8 py-4 border-t border-border text-center">
        <p className="text-foreground-tertiary text-xs">
          &copy; {new Date().getFullYear()} StayHaven. All rights reserved.
        </p>
      </footer>
    </div>
  )
}
