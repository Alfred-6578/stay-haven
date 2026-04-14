'use client'
import React, { useEffect } from 'react'
import { HiOutlineExclamation, HiOutlineQuestionMarkCircle } from 'react-icons/hi'

interface Props {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'default' | 'danger'
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

const ConfirmModal = ({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  loading = false,
  onConfirm,
  onCancel,
}: Props) => {
  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onCancel()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, loading, onCancel])

  // Lock body scroll
  useEffect(() => {
    if (!open) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = original }
  }, [open])

  if (!open) return null

  const isDanger = variant === 'danger'

  const Icon = isDanger ? HiOutlineExclamation : HiOutlineQuestionMarkCircle

  const iconRingClasses = isDanger
    ? 'bg-danger-bg text-danger'
    : 'bg-foreground-disabled/15 text-foreground'

  const confirmBtnClasses = isDanger
    ? 'bg-danger text-foreground-inverse hover:bg-danger/90 shadow-sm shadow-danger/30'
    : 'bg-foreground text-foreground-inverse hover:bg-foreground/90 shadow-sm shadow-foreground/20'

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-foreground/50 backdrop-blur-sm animate-modal-backdrop"
        onClick={loading ? undefined : onCancel}
      />

      {/* Content */}
      <div className="relative w-full max-w-[420px] bg-foreground-inverse rounded-2xl shadow-2xl overflow-hidden animate-modal-content">
        <div className="px-6 pt-7 pb-5 flex flex-col items-center text-center">
          {/* Icon */}
          <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${iconRingClasses}`}>
            <Icon size={26} />
          </div>

          {/* Title */}
          <h2
            id="confirm-modal-title"
            className="text-foreground font-heading font-bold text-xl tracking-tight mb-2"
          >
            {title}
          </h2>

          {/* Message */}
          <p className="text-foreground-secondary text-sm leading-relaxed max-w-[320px]">
            {message}
          </p>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2 px-5 pb-5">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="border border-border rounded-xl py-2.5 text-sm font-medium text-foreground hover:bg-foreground-disabled/5 transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`rounded-xl py-2.5 text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${confirmBtnClasses}`}
          >
            {loading && (
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            )}
            {loading ? 'Please wait' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmModal
