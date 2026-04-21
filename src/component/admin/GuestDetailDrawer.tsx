'use client'
import React, { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import {
  HiOutlineX,
  HiOutlineMail,
  HiOutlinePhone,
  HiOutlineStar,
  HiOutlineGift,
  HiOutlineCalendar,
} from 'react-icons/hi'
import LoyaltyTierBadge from '@/component/guest/LoyaltyTierBadge'

interface GuestDetail {
  user: {
    id: string
    firstName: string
    lastName: string
    email: string
    phone: string | null
    avatar: string | null
    createdAt: string
  }
  guestProfile: {
    idType: string | null
    idNumber: string | null
    nationality: string | null
    dateOfBirth: string | null
    address: string | null
    preferences: Record<string, boolean>
    loyaltyTier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM'
    totalStays: number
    totalSpend: number | string
  } | null
  bookings: Array<{
    id: string
    bookingRef: string
    status: string
    checkIn: string
    checkOut: string
    totalAmount: number | string
    room: { number: string; roomType: { name: string } }
  }>
  loyalty: {
    tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM'
    totalPoints: number
    lifetimePoints: number
    tierProgress: number
    nextTier: { name: string; pointsAway: number; isMax: boolean }
  }
}

interface Props {
  guestId: string | null
  onClose: () => void
  onChanged: () => void
}

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: 'bg-success-bg text-success',
  CHECKED_IN: 'bg-[#EAF3DE] text-[#4A6B2E]',
  CHECKED_OUT: 'bg-foreground-disabled/15 text-foreground-secondary',
  PENDING: 'bg-warning-bg text-warning',
  CANCELLED: 'bg-danger-bg text-danger',
  NO_SHOW: 'bg-danger-bg text-danger',
}

const formatNaira = (v: number | string) =>
  `₦${new Intl.NumberFormat('en-NG', { maximumFractionDigits: 0 }).format(Number(v))}`

const GuestDetailDrawer = ({ guestId, onClose, onChanged }: Props) => {
  const [detail, setDetail] = useState<GuestDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [awardOpen, setAwardOpen] = useState(false)

  useEffect(() => {
    if (!guestId) { setDetail(null); return }
    setLoading(true)
    api.get(`/admin/guests/${guestId}`)
      .then(res => setDetail(res.data.data))
      .catch(() => toast.error('Failed to load guest'))
      .finally(() => setLoading(false))
  }, [guestId])

  useEffect(() => {
    if (!guestId) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    const orig = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = orig
    }
  }, [guestId, onClose])

  if (!guestId) return null

  const preferences = detail?.guestProfile?.preferences || {}
  const activePrefs = Object.entries(preferences).filter(([, v]) => v).map(([k]) => k)

  return (
    <>
      <div className="fixed inset-0 z-[55] flex" role="dialog" aria-modal="true">
        <div className="absolute inset-0 bg-foreground/40 animate-modal-backdrop" onClick={onClose} />
        <div className="relative ml-auto w-full max-w-xl bg-foreground-inverse h-full shadow-2xl flex flex-col animate-modal-content">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
            <div>
              <p className="text-foreground-tertiary text-xs">Guest Profile</p>
              <h2 className="text-foreground font-heading font-bold text-lg">
                {detail ? `${detail.user.firstName} ${detail.user.lastName}` : '...'}
              </h2>
            </div>
            <button onClick={onClose} className="p-2 text-foreground-tertiary hover:text-foreground">
              <HiOutlineX size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading || !detail ? (
              <div className="p-6 space-y-4">
                {[0, 1, 2, 3].map(i => <div key={i} className="h-24 bg-foreground-disabled/10 rounded-xl animate-pulse" />)}
              </div>
            ) : (
              <div className="p-6 space-y-6">
                {/* Profile Info */}
                <section>
                  <h3 className="text-foreground font-semibold text-sm mb-2">Profile</h3>
                  <div className="border border-border rounded-xl p-4 space-y-2 text-sm">
                    <p className="text-foreground-secondary flex items-center gap-2">
                      <HiOutlineMail size={14} className="text-foreground-tertiary" /> {detail.user.email}
                    </p>
                    {detail.user.phone && (
                      <p className="text-foreground-secondary flex items-center gap-2">
                        <HiOutlinePhone size={14} className="text-foreground-tertiary" /> {detail.user.phone}
                      </p>
                    )}
                    <p className="text-foreground-tertiary text-xs">
                      Joined {new Date(detail.user.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                    {detail.guestProfile && (
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border mt-2">
                        <div>
                          <p className="text-foreground-tertiary text-[10px] uppercase tracking-wider">Nationality</p>
                          <p className="text-foreground text-sm">{detail.guestProfile.nationality || '—'}</p>
                        </div>
                        <div>
                          <p className="text-foreground-tertiary text-[10px] uppercase tracking-wider">ID</p>
                          <p className="text-foreground text-sm">
                            {detail.guestProfile.idNumber ? `${detail.guestProfile.idType || 'ID'} · ${detail.guestProfile.idNumber}` : '—'}
                          </p>
                        </div>
                        {detail.guestProfile.address && (
                          <div className="col-span-2">
                            <p className="text-foreground-tertiary text-[10px] uppercase tracking-wider">Address</p>
                            <p className="text-foreground text-sm">{detail.guestProfile.address}</p>
                          </div>
                        )}
                        {activePrefs.length > 0 && (
                          <div className="col-span-2">
                            <p className="text-foreground-tertiary text-[10px] uppercase tracking-wider mb-1">Preferences</p>
                            <div className="flex flex-wrap gap-1">
                              {activePrefs.map(p => (
                                <span key={p} className="bg-foreground-disabled/10 text-foreground text-[11px] px-2 py-0.5 rounded-full">
                                  {p.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </section>

                {/* Loyalty Summary */}
                <section>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-foreground font-semibold text-sm flex items-center gap-1.5">
                      <HiOutlineStar size={14} /> Loyalty
                    </h3>
                    <button
                      onClick={() => setAwardOpen(true)}
                      className="flex items-center gap-1.5 bg-[#D97706] text-white rounded-lg px-3 py-1.5 text-xs font-semibold hover:opacity-90"
                    >
                      <HiOutlineGift size={12} />
                      Award Points
                    </button>
                  </div>
                  <div className="border border-border rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <LoyaltyTierBadge tier={detail.loyalty.tier} size="md" />
                      <div className="text-right">
                        <p className="text-foreground text-2xl font-bold leading-none">{detail.loyalty.totalPoints.toLocaleString()}</p>
                        <p className="text-foreground-tertiary text-[10px] uppercase tracking-wider">Points</p>
                      </div>
                    </div>
                    <div className="h-2 w-full rounded-full bg-foreground-disabled/15 overflow-hidden mb-1.5">
                      <div
                        className="h-full rounded-full bg-[#D97706] transition-all duration-500"
                        style={{ width: `${Math.min(100, detail.loyalty.tierProgress)}%` }}
                      />
                    </div>
                    <p className="text-foreground-tertiary text-xs">
                      {detail.loyalty.nextTier.isMax
                        ? 'Highest tier reached'
                        : `${detail.loyalty.nextTier.pointsAway.toLocaleString()} points to ${detail.loyalty.nextTier.name}`}
                    </p>
                  </div>
                </section>

                {/* Total Stats */}
                <section className="grid grid-cols-2 gap-3">
                  <div className="border border-border rounded-xl p-4">
                    <p className="text-foreground-tertiary text-[10px] uppercase tracking-wider font-semibold">Total Stays</p>
                    <p className="text-foreground text-2xl font-bold mt-1">{detail.guestProfile?.totalStays ?? 0}</p>
                  </div>
                  <div className="border border-border rounded-xl p-4">
                    <p className="text-foreground-tertiary text-[10px] uppercase tracking-wider font-semibold">Total Spend</p>
                    <p className="text-foreground text-2xl font-bold mt-1">{formatNaira(detail.guestProfile?.totalSpend ?? 0)}</p>
                  </div>
                </section>

                {/* Booking History */}
                <section>
                  <h3 className="text-foreground font-semibold text-sm flex items-center gap-1.5 mb-2">
                    <HiOutlineCalendar size={14} /> Recent Bookings ({detail.bookings.length})
                  </h3>
                  {detail.bookings.length === 0 ? (
                    <p className="text-foreground-tertiary text-sm border border-border rounded-xl p-4 text-center">No bookings yet</p>
                  ) : (
                    <div className="space-y-2">
                      {detail.bookings.slice(0, 5).map(b => (
                        <div key={b.id} className="border border-border rounded-xl p-3 flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-foreground text-sm font-medium truncate">
                              {b.room.roomType.name} · Room {b.room.number}
                            </p>
                            <p className="text-foreground-tertiary text-xs">
                              {new Date(b.checkIn).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {new Date(b.checkOut).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            <span className={`${STATUS_COLORS[b.status] || 'bg-foreground-disabled/15 text-foreground-secondary'} text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider`}>
                              {b.status.replace('_', ' ')}
                            </span>
                            <p className="text-foreground text-xs font-semibold">{formatNaira(b.totalAmount)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            )}
          </div>
        </div>
      </div>

      {detail && (
        <AwardPointsModal
          open={awardOpen}
          guestName={`${detail.user.firstName} ${detail.user.lastName}`}
          guestId={detail.user.id}
          onClose={() => setAwardOpen(false)}
          onAwarded={() => {
            setAwardOpen(false)
            // Reload detail
            if (guestId) {
              api.get(`/admin/guests/${guestId}`)
                .then(res => setDetail(res.data.data))
                .catch(() => {})
            }
            onChanged()
          }}
        />
      )}
    </>
  )
}

function AwardPointsModal({
  open,
  guestId,
  guestName,
  onClose,
  onAwarded,
}: {
  open: boolean
  guestId: string
  guestName: string
  onClose: () => void
  onAwarded: () => void
}) {
  const [points, setPoints] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setPoints(''); setDescription('')
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && !loading) onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, loading, onClose])

  if (!open) return null

  const parsed = Number(points)
  const isValid = !isNaN(parsed) && parsed !== 0 && description.trim().length > 0

  const handleSubmit = async () => {
    if (!isValid) return
    setLoading(true)
    try {
      await api.post('/admin/loyalty/award', {
        guestId,
        points: parsed,
        description: description.trim(),
      })
      toast.success(`${Math.abs(parsed)} points ${parsed > 0 ? 'awarded' : 'deducted'}`)
      onAwarded()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Award failed'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-foreground/50 backdrop-blur-sm animate-modal-backdrop" onClick={loading ? undefined : onClose} />
      <div className="relative w-full max-w-md bg-foreground-inverse rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-modal-content">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-foreground font-heading font-bold text-lg">Award Points</h2>
            <p className="text-foreground-tertiary text-xs">{guestName}</p>
          </div>
          <button onClick={onClose} disabled={loading} className="p-2 text-foreground-tertiary hover:text-foreground">
            <HiOutlineX size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="text-foreground-tertiary text-[11px] uppercase tracking-wider font-semibold mb-1.5 block">Points</label>
            <input
              type="number"
              value={points}
              onChange={e => setPoints(e.target.value)}
              placeholder="e.g. 500 (or -100 to deduct)"
              className="w-full border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none bg-transparent focus:ring-2 focus:ring-foreground/20"
            />
            <p className="text-foreground-tertiary text-xs mt-1">Positive numbers add, negative numbers deduct.</p>
          </div>
          <div>
            <label className="text-foreground-tertiary text-[11px] uppercase tracking-wider font-semibold mb-1.5 block">Reason</label>
            <input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g. Compensation for service delay"
              maxLength={200}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none bg-transparent focus:ring-2 focus:ring-foreground/20"
            />
          </div>
        </div>

        <div className="flex gap-2 px-6 py-4 border-t border-border bg-background-secondary">
          <button onClick={onClose} disabled={loading} className="flex-1 border border-border rounded-lg py-2 text-sm text-foreground hover:bg-foreground-disabled/5">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !isValid}
            className="flex-1 bg-[#D97706] text-white rounded-lg py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
            {loading ? 'Saving' : parsed < 0 ? 'Deduct Points' : 'Award Points'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default GuestDetailDrawer
