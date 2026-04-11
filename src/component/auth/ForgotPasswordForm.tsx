'use client'
import Link from 'next/link'
import React, { useState } from 'react'
import { HiOutlineMail } from 'react-icons/hi'
import { api } from '@/lib/api'

const ForgotPasswordForm = () => {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            await api.post('/auth/forgot-password', { email })
            setSubmitted(true)
        } catch {
            setSubmitted(true)
        } finally {
            setLoading(false)
        }
    }

    if (submitted) {
        return (
            <div className="w-full">
                <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mb-6">
                        <HiOutlineMail size={28} className="text-accent" />
                    </div>
                    <h1 className="font-heading text-accent text-xl tny:text-2xl sm:text-3xl mb-2">Check your email</h1>
                    <p className="text-foreground-secondary text-sm mb-8">
                        If an account exists for <strong className="text-foreground">{email}</strong>, we&apos;ve sent a password reset link. Please check your inbox and spam folder.
                    </p>
                    <Link
                        href="/login"
                        className="text-foreground text-sm font-medium hover:underline"
                    >
                        Back to sign in
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="w-full">
            <div>
                <h5 className="text-foreground-tertiary text-[12px] sm:text-sm font-semibold uppercase">Account recovery</h5>
                <h1 className="font-heading mt-2 mb-1 text-accent text-xl tny:text-2xl sm:text-3xl">Forgot your password?</h1>
                <p className="text-foreground-secondary text-sm mb-6">
                    Enter the email address associated with your account and we&apos;ll send you a reset link.
                </p>
            </div>
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md p-3 mb-4">
                    {error}
                </div>
            )}
            <form onSubmit={handleSubmit}>
                <div className="flex flex-col gap-2 mb-6">
                    <label htmlFor="email" className="text-foreground text-sm font-medium">
                        Email Address
                    </label>
                    <div className="flex items-center w-full gap-2 border border-border rounded-md p-2.5 focus-within:ring focus-within:ring-foreground">
                        <HiOutlineMail size={22} className="text-border-strong" />
                        <input
                            type="email"
                            id="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="border-none text-foreground text-sm w-full outline-none placeholder:text-sm placeholder:text-border-strong"
                        />
                    </div>
                </div>
                <button
                    type="submit"
                    disabled={loading || !email}
                    className={`bg-foreground w-full rounded-md py-3 font-medium ${loading || !email ? 'opacity-20 cursor-not-allowed' : 'text-background'}`}
                >
                    {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
            </form>
            <p className="text-foreground-secondary text-sm mt-6 text-center">
                Remember your password? <Link href="/login" className="text-foreground font-medium hover:underline">Sign in</Link>
            </p>
        </div>
    )
}

export default ForgotPasswordForm
