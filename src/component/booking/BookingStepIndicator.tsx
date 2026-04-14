'use client'
import React from 'react'
import { HiOutlineCheck } from 'react-icons/hi'

interface Props {
  currentStep: number
}

const steps = [
  { number: 1, label: 'Review' },
  { number: 2, label: 'Loyalty' },
  { number: 3, label: 'Payment' },
]

const BookingStepIndicator = ({ currentStep }: Props) => {
  return (
    <div className="flex items-center justify-center gap-0 vsm:gap-1">
      {steps.map((step, i) => {
        const isCompleted = currentStep > step.number
        const isCurrent = currentStep === step.number
        return (
          <React.Fragment key={step.number}>
            <div className="flex items-center gap-2 vsm:gap-2.5">
              <div className={`w-8 h-8 vsm:w-9 vsm:h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                isCompleted
                  ? 'bg-foreground text-foreground-inverse'
                  : isCurrent
                  ? 'bg-foreground text-foreground-inverse ring-4 ring-foreground/10'
                  : 'bg-foreground-disabled/15 text-foreground-tertiary'
              }`}>
                {isCompleted ? <HiOutlineCheck size={16} /> : step.number}
              </div>
              <span className={`text-sm font-medium hidden vsm:inline ${
                isCurrent ? 'text-foreground' : isCompleted ? 'text-foreground' : 'text-foreground-tertiary'
              }`}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`w-8 vsm:w-12 sm:w-16 h-px mx-2 ${
                currentStep > step.number ? 'bg-foreground' : 'bg-foreground-disabled/30'
              }`} />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

export default BookingStepIndicator
