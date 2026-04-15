'use client'
import React, { useCallback, useEffect, useState } from 'react'
import { HiOutlineX, HiOutlineCheck } from 'react-icons/hi'
import { useAuth } from '@/context/AuthContext'
import { WalkInFormData, initialFormData } from './types'
import WalkInStep1Lookup from './WalkInStep1Lookup'
import WalkInStep2GuestDetails from './WalkInStep2GuestDetails'
import WalkInStep3RoomSelection from './WalkInStep3RoomSelection'
import WalkInStep4Payment from './WalkInStep4Payment'
import WalkInSuccessScreen from './WalkInSuccessScreen'

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

const STEP_LABELS = ['Guest', 'Details', 'Room & Dates', 'Payment']

const WalkInBookingModal = ({ open, onClose, onSuccess }: Props) => {
  const { user } = useAuth()
  const [data, setData] = useState<WalkInFormData>(() => initialFormData())

  // Reset state whenever modal opens fresh
  useEffect(() => {
    if (open) setData(initialFormData())
  }, [open])

  // Escape to close (disabled while on success to avoid losing receipt)
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && data.step !== 'success') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose, data.step])

  // Body scroll lock
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  const update = useCallback((patch: Partial<WalkInFormData>) => {
    setData(prev => ({ ...prev, ...patch }))
  }, [])

  const goto = useCallback((step: WalkInFormData['step']) => {
    setData(prev => ({ ...prev, step }))
  }, [])

  const handleFinalClose = () => {
    onSuccess()
    onClose()
  }

  if (!open) return null

  const currentStepNum = typeof data.step === 'number' ? data.step : 4
  const processedByName = user ? `${user.firstName} ${user.lastName}` : 'Staff'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:hidden">
      <div
        className="absolute inset-0 bg-foreground/50"
        onClick={data.step === 'success' ? undefined : onClose}
      />
      <div className="relative w-full max-w-2xl bg-foreground-inverse rounded-2xl shadow-xl max-h-[92vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <p className="text-foreground-tertiary text-xs uppercase tracking-wider">Walk-in Booking</p>
            <h2 className="text-foreground font-bold text-lg">
              {data.step === 'success' ? 'Booking Created' : `Step ${currentStepNum} — ${STEP_LABELS[currentStepNum - 1]}`}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-foreground-tertiary hover:text-foreground"
            aria-label="Close"
          >
            <HiOutlineX size={20} />
          </button>
        </div>

        {/* Step indicator */}
        {data.step !== 'success' && (
          <div className="px-5 pt-4">
            <div className="flex items-center gap-2">
              {STEP_LABELS.map((label, i) => {
                const stepNum = i + 1
                const completed = stepNum < currentStepNum
                const active = stepNum === currentStepNum
                return (
                  <React.Fragment key={label}>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                          completed
                            ? 'bg-success text-foreground-inverse'
                            : active
                              ? 'bg-foreground text-foreground-inverse'
                              : 'bg-foreground-disabled/20 text-foreground-tertiary'
                        }`}
                      >
                        {completed ? <HiOutlineCheck size={12} /> : stepNum}
                      </div>
                      <span
                        className={`text-[11px] font-semibold ${
                          active ? 'text-foreground' : 'text-foreground-tertiary'
                        } max-md:hidden`}
                      >
                        {label}
                      </span>
                    </div>
                    {i < STEP_LABELS.length - 1 && (
                      <div
                        className={`flex-1 h-px ${
                          completed ? 'bg-success' : 'bg-foreground-disabled/20'
                        }`}
                      />
                    )}
                  </React.Fragment>
                )
              })}
            </div>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {data.step === 1 && <WalkInStep1Lookup data={data} update={update} />}
          {data.step === 2 && (
            <WalkInStep2GuestDetails
              data={data}
              update={update}
              onNext={() => goto(3)}
              onBack={() => goto(1)}
            />
          )}
          {data.step === 3 && (
            <WalkInStep3RoomSelection
              data={data}
              update={update}
              onNext={() => goto(4)}
              onBack={() => goto(2)}
            />
          )}
          {data.step === 4 && (
            <WalkInStep4Payment
              data={data}
              update={update}
              onSuccess={() => goto('success')}
              onBack={() => goto(3)}
              processedByName={processedByName}
            />
          )}
          {data.step === 'success' && (
            <WalkInSuccessScreen data={data} onClose={handleFinalClose} />
          )}
        </div>
      </div>
    </div>
  )
}

export default WalkInBookingModal
