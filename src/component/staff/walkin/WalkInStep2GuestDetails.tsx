'use client'
import React, { useState } from 'react'
import { HiOutlineLockClosed } from 'react-icons/hi'
import LoyaltyTierBadge from '@/component/guest/LoyaltyTierBadge'
import { WalkInFormData } from './types'

interface Props {
  data: WalkInFormData
  update: (patch: Partial<WalkInFormData>) => void
  onNext: () => void
  onBack: () => void
}

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const WalkInStep2GuestDetails = ({ data, update, onNext, onBack }: Props) => {
  const [error, setError] = useState<string | null>(null)
  const locked = data.isExistingGuest

  const validate = (): string | null => {
    if (!data.firstName.trim()) return 'First name is required'
    if (!data.lastName.trim()) return 'Last name is required'
    if (!data.email.trim() || !emailRe.test(data.email.trim())) return 'A valid email is required'
    if (data.phone.trim() && data.phone.trim().length < 7) return 'Phone number looks too short'
    return null
  }

  const handleContinue = () => {
    const err = validate()
    if (err) {
      setError(err)
      return
    }
    setError(null)
    onNext()
  }

  const fieldClass = `w-full px-3 py-2.5 bg-foreground-inverse border border-border rounded-lg text-sm text-foreground placeholder:text-foreground-tertiary outline-none focus:border-foreground disabled:bg-foreground-disabled/5 disabled:text-foreground-tertiary`

  return (
    <div className="space-y-4">
      {locked && (
        <div className="bg-foreground-disabled/5 border border-border rounded-lg p-3 flex items-start gap-2">
          <HiOutlineLockClosed size={16} className="text-foreground-tertiary flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="text-foreground text-xs font-semibold">Editing locked — existing guest</p>
              {data.loyaltyTier && <LoyaltyTierBadge tier={data.loyaltyTier} />}
            </div>
            <p className="text-foreground-tertiary text-xs mt-0.5">
              Changes must be made via the guest profile page.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-foreground-tertiary text-[11px] uppercase tracking-wider font-semibold">
            First Name
          </label>
          <input
            className={`mt-1.5 ${fieldClass}`}
            value={data.firstName}
            onChange={e => update({ firstName: e.target.value })}
            disabled={locked}
            placeholder="Ada"
          />
        </div>
        <div>
          <label className="text-foreground-tertiary text-[11px] uppercase tracking-wider font-semibold">
            Last Name
          </label>
          <input
            className={`mt-1.5 ${fieldClass}`}
            value={data.lastName}
            onChange={e => update({ lastName: e.target.value })}
            disabled={locked}
            placeholder="Okonkwo"
          />
        </div>
      </div>

      <div>
        <label className="text-foreground-tertiary text-[11px] uppercase tracking-wider font-semibold">
          Email
        </label>
        <input
          type="email"
          className={`mt-1.5 ${fieldClass}`}
          value={data.email}
          onChange={e => update({ email: e.target.value })}
          disabled={locked}
          placeholder="ada@example.com"
        />
      </div>

      <div>
        <label className="text-foreground-tertiary text-[11px] uppercase tracking-wider font-semibold">
          Phone <span className="normal-case text-foreground-tertiary">(optional)</span>
        </label>
        <input
          type="tel"
          className={`mt-1.5 ${fieldClass}`}
          value={data.phone}
          onChange={e => update({ phone: e.target.value })}
          disabled={locked}
          placeholder="+234 801 234 5678"
        />
      </div>

      {!data.isExistingGuest && (
        <div className="bg-warning-bg/30 border border-warning/30 rounded-lg p-3">
          <p className="text-foreground text-xs">
            A guest account will be created automatically. An activation email with a password-setup link will be sent to this address (valid for 72 hours).
          </p>
        </div>
      )}

      {error && (
        <p className="text-danger text-xs">{error}</p>
      )}

      <div className="flex gap-2 pt-2">
        <button
          onClick={onBack}
          className="flex-1 border border-border rounded-lg py-2.5 text-sm text-foreground hover:bg-foreground-disabled/5"
        >
          Back
        </button>
        <button
          onClick={handleContinue}
          className="flex-1 bg-foreground text-foreground-inverse rounded-lg py-2.5 text-sm font-medium hover:opacity-90"
        >
          Continue
        </button>
      </div>
    </div>
  )
}

export default WalkInStep2GuestDetails
