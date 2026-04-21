'use client'
import { useSearchParams, useRouter } from 'next/navigation'
import React, { useState } from 'react'
import { CiLock } from 'react-icons/ci'
import { IoEyeOffOutline, IoEyeOutline } from 'react-icons/io5'
import { api } from '@/lib/api'

const ResetPasswordForm = () => {
    const searchParams = useSearchParams()
    const router = useRouter()
    const token = searchParams.get('token')
    const isActivation = searchParams.get('activate') === '1'

    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const calculatePasswordStrength = (pw: string) => {
        let score = 0
        if (pw.length >= 8) score += 25
        if (/[A-Z]/.test(pw)) score += 15
        if (/[0-9]/.test(pw)) score += 15
        if (/[^A-Za-z0-9]/.test(pw)) score += 25
        if (/[!@#$%^&*()-+]/.test(pw)) score += 10
        if (pw.length >= 12) score += 10
        return score
    }

    const strength = calculatePasswordStrength(password)
    const passwordsMatch = password && confirmPassword && password === confirmPassword
    const disabled = !passwordsMatch || strength < 50 || loading

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (!token) {
            setError('Invalid reset link. Please request a new one.')
            return
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match')
            return
        }

        setLoading(true)

        try {
            await api.post('/auth/reset-password', { token, newPassword: password })
            const msg = isActivation
              ? 'Account activated — sign in to view your booking'
              : 'Password updated successfully'
            router.push(`/login?message=${encodeURIComponent(msg)}`)
        } catch (err: unknown) {
            const message =
                (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                'Failed to reset password. The link may have expired.'
            setError(message)
        } finally {
            setLoading(false)
        }
    }

    if (!token) {
        return (
            <div className="w-full">
                <div className="text-center">
                    <h1 className="font-heading text-accent text-xl tny:text-2xl sm:text-3xl mb-2">Invalid Reset Link</h1>
                    <p className="text-foreground-secondary text-sm mb-6">
                        This password reset link is invalid or has expired. Please request a new one.
                    </p>
                    <a href="/forgot-password" className="text-foreground font-medium hover:underline text-sm">
                        Request new reset link
                    </a>
                </div>
            </div>
        )
    }

    return (
        <div className="w-full">
            <div>
                <h5 className="text-foreground-tertiary text-[12px] sm:text-sm font-semibold uppercase">
                    {isActivation ? 'Activate account' : 'Almost there'}
                </h5>
                <h1 className="font-heading mt-2 mb-1 text-accent text-xl tny:text-2xl sm:text-3xl">
                    {isActivation ? 'Set your password' : 'Set a new password'}
                </h1>
                <p className="text-foreground-secondary text-sm mb-6">
                    {isActivation
                      ? "We created an account for you when you checked in. Pick a password to start managing your booking."
                      : "Your new password must be at least 8 characters with one uppercase letter and one number."}
                </p>
            </div>
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md p-3 mb-4">
                    {error}
                </div>
            )}
            <form onSubmit={handleSubmit}>
                <div className="flex flex-col gap-2 mb-4">
                    <label htmlFor="password" className="text-foreground text-sm font-medium">
                        New Password
                    </label>
                    <div className="flex items-center w-full gap-2 border border-border rounded-md p-2.5 focus-within:ring focus-within:ring-foreground">
                        <CiLock size={22} className="text-border-strong" />
                        <input
                            type={showPassword ? 'text' : 'password'}
                            id="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="border-none text-foreground text-sm w-full outline-none placeholder:text-sm placeholder:text-border-strong"
                        />
                        <button type="button" onClick={() => setShowPassword(prev => !prev)} className="text-xl text-border-strong">
                            {showPassword ? <IoEyeOutline /> : <IoEyeOffOutline />}
                        </button>
                    </div>
                    <div className="mt-1">
                        <div className="h-1.5 w-full rounded-full overflow-hidden bg-foreground-disabled/30">
                            <div className="h-full rounded-full bg-foreground" style={{ width: `${strength}%` }}></div>
                        </div>
                        <p className="text-[11px] text-foreground-tertiary mt-1">
                            Password strength: {strength < 50 ? 'Weak' : strength < 75 ? 'Moderate' : 'Strong'}
                        </p>
                    </div>
                </div>
                <div className="flex flex-col gap-2 mb-6">
                    <label htmlFor="confirmPassword" className="text-foreground text-sm font-medium">
                        Confirm Password
                    </label>
                    <div className="flex items-center w-full gap-2 border border-border rounded-md p-2.5 focus-within:ring focus-within:ring-foreground">
                        <CiLock size={22} className="text-border-strong" />
                        <input
                            type={showConfirm ? 'text' : 'password'}
                            id="confirmPassword"
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            className="border-none text-foreground text-sm w-full outline-none placeholder:text-sm placeholder:text-border-strong"
                        />
                        <button type="button" onClick={() => setShowConfirm(prev => !prev)} className="text-xl text-border-strong">
                            {showConfirm ? <IoEyeOutline /> : <IoEyeOffOutline />}
                        </button>
                    </div>
                    {confirmPassword && !passwordsMatch && (
                        <p className="text-red-500 text-xs">Passwords do not match</p>
                    )}
                </div>
                <button
                    type="submit"
                    disabled={disabled}
                    className={`bg-foreground w-full rounded-md py-3 font-medium ${disabled ? 'opacity-20 cursor-not-allowed' : 'text-background'}`}
                >
                    {loading
                      ? (isActivation ? 'Activating...' : 'Resetting...')
                      : (isActivation ? 'Activate Account' : 'Reset Password')}
                </button>
            </form>
        </div>
    )
}

export default ResetPasswordForm
