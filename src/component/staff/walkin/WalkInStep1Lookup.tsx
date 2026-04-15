'use client'
import React, { useEffect, useRef, useState } from 'react'
import { HiOutlineSearch, HiOutlineUserAdd, HiOutlineUser } from 'react-icons/hi'
import { api } from '@/lib/api'
import LoyaltyTierBadge from '@/component/guest/LoyaltyTierBadge'
import { WalkInFormData } from './types'

interface GuestResult {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  guestProfile: { loyaltyTier: string; totalStays: number; totalPoints: number } | null
}

interface Props {
  data: WalkInFormData
  update: (patch: Partial<WalkInFormData>) => void
}

const WalkInStep1Lookup = ({ update }: Props) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GuestResult[]>([])
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounced search
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      setSearched(false)
      return
    }
    setSearching(true)
    timerRef.current = setTimeout(async () => {
      try {
        const res = await api.get(`/staff/guests/search?q=${encodeURIComponent(q)}`)
        setResults(res.data.data || [])
        setSearched(true)
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 350)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [query])

  const selectGuest = (g: GuestResult) => {
    update({
      step: 2,
      guestId: g.id,
      isExistingGuest: true,
      firstName: g.firstName,
      lastName: g.lastName,
      email: g.email,
      phone: g.phone || '',
      loyaltyTier: g.guestProfile?.loyaltyTier,
    })
  }

  const newGuest = () => {
    update({
      step: 2,
      guestId: undefined,
      isExistingGuest: false,
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      loyaltyTier: undefined,
    })
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-foreground-tertiary text-[11px] uppercase tracking-wider font-semibold">
          Search Existing Guest
        </label>
        <div className="relative mt-2">
          <HiOutlineSearch size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-tertiary" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Name, email, phone, or booking ref…"
            className="w-full pl-10 pr-3 py-2.5 bg-foreground-inverse border border-border rounded-lg text-sm text-foreground placeholder:text-foreground-tertiary outline-none focus:border-foreground"
          />
        </div>
      </div>

      <div className="min-h-[200px]">
        {searching && (
          <div className="py-8 text-center text-foreground-tertiary text-sm">Searching…</div>
        )}

        {!searching && query.trim().length >= 2 && searched && results.length === 0 && (
          <div className="py-8 text-center">
            <p className="text-foreground-tertiary text-sm mb-4">No matching guests found.</p>
            <button
              onClick={newGuest}
              className="inline-flex items-center gap-2 bg-foreground text-foreground-inverse px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90"
            >
              <HiOutlineUserAdd size={16} />
              Register as New Guest
            </button>
          </div>
        )}

        {!searching && results.length > 0 && (
          <ul className="space-y-2">
            {results.map(g => (
              <li key={g.id}>
                <button
                  onClick={() => selectGuest(g)}
                  className="w-full text-left border border-border rounded-xl p-3 hover:border-foreground/50 transition-colors flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-full bg-foreground-disabled/10 flex items-center justify-center flex-shrink-0">
                    <HiOutlineUser size={18} className="text-foreground-tertiary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-foreground font-semibold text-sm truncate">
                        {g.firstName} {g.lastName}
                      </p>
                      {g.guestProfile?.loyaltyTier && (
                        <LoyaltyTierBadge tier={g.guestProfile.loyaltyTier} />
                      )}
                    </div>
                    <p className="text-foreground-tertiary text-xs truncate">{g.email}</p>
                    {g.phone && <p className="text-foreground-tertiary text-xs">{g.phone}</p>}
                  </div>
                  <span className="text-foreground text-xs font-semibold px-3 py-1.5 bg-foreground-disabled/10 rounded-lg">
                    Select
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {query.trim().length < 2 && (
          <div className="text-center py-8">
            <p className="text-foreground-tertiary text-sm mb-4">
              Type at least 2 characters to search, or continue as a new guest.
            </p>
            <button
              onClick={newGuest}
              className="inline-flex items-center gap-2 bg-foreground text-foreground-inverse px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90"
            >
              <HiOutlineUserAdd size={16} />
              New Guest
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default WalkInStep1Lookup
