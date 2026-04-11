'use client'
import { useSearchParams, useRouter } from 'next/navigation'
import React, { useState, useEffect } from 'react'
import { CiLock } from 'react-icons/ci'
import { HiOutlineMail } from 'react-icons/hi'
import { IoEyeOffOutline, IoEyeOutline } from 'react-icons/io5'
import { api } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'

interface InviteData {
    valid: boolean
    email?: string
    role?: string
    firstName?: string
    reason?: string
}

const InviteAcceptForm = () => {
    const searchParams = useSearchParams()
    const router = useRouter()
    const { setUser } = useAuth()
    const token = searchParams.get('token')

    const [inviteData, setInviteData] = useState<InviteData | null>(null)
    const [validating, setValidating] = useState(true)

    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [phone, setPhone] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        if (!token) {
            setInviteData({ valid: false, reason: 'not_found' })
            setValidating(false)
            return
        }

        (async () => {
            try {
                const res = await api.post('/auth/invite/validate', { token })
                setInviteData(res.data.data)
                if (res.data.data.firstName) {
                    setFirstName(res.data.data.firstName)
                }
            } catch {
                setInviteData({ valid: false, reason: 'not_found' })
            } finally {
                setValidating(false)
            }
        })()
    }, [token])

    const passwordValid = password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password)
    const disabled = !firstName || !lastName || !passwordValid || loading

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const res = await api.post('/auth/invite/accept', {
                token,
                firstName,
                lastName,
                phone: phone || undefined,
                password,
            })
            setUser(res.data.data.user)

            const role = res.data.data.user.role
            if (role === 'ADMIN') router.push('/dashboard')
            else router.push('/dashboard')
        } catch (err: unknown) {
            const message =
                (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                'Failed to accept invitation'
            setError(message)
        } finally {
            setLoading(false)
        }
    }

    if (validating) {
        return (
            <div className="w-full flex items-center justify-center py-20">
                <div className="text-center">
                    <div className="w-8 h-8 border-2 border-foreground border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-foreground-secondary text-sm">Validating your invitation...</p>
                </div>
            </div>
        )
    }

    if (!inviteData?.valid) {
        const messages: Record<string, { title: string; description: string }> = {
            expired: {
                title: 'Invitation Expired',
                description: 'This invitation has expired. Please contact your administrator to request a new one.',
            },
            already_used: {
                title: 'Already Accepted',
                description: 'This invitation has already been used. Try signing in instead.',
            },
            not_found: {
                title: 'Invalid Invitation',
                description: 'This invitation link is invalid. Please check the link or contact your administrator.',
            },
        }

        const reason = inviteData?.reason || 'not_found'
        const { title, description } = messages[reason] || messages.not_found

        return (
            <div className="w-full">
                <div className="text-center">
                    <h1 className="font-heading text-accent text-xl tny:text-2xl sm:text-3xl mb-2">{title}</h1>
                    <p className="text-foreground-secondary text-sm mb-6">{description}</p>
                    {reason === 'already_used' && (
                        <a href="/login" className="text-foreground font-medium hover:underline text-sm">
                            Go to sign in
                        </a>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className="w-full">
            <div>
                <h5 className="text-foreground-tertiary text-[12px] sm:text-sm font-semibold uppercase">Staff onboarding</h5>
                <h1 className="font-heading mt-2 mb-1 text-accent text-xl tny:text-2xl sm:text-3xl">Accept your invitation</h1>
                <p className="text-foreground-secondary text-sm mb-6">
                    You&apos;ve been invited to join StayHaven as <strong className="text-foreground capitalize">{inviteData.role?.toLowerCase()}</strong>. Complete your profile below.
                </p>
            </div>
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md p-3 mb-4">
                    {error}
                </div>
            )}
            <form onSubmit={handleSubmit}>
                <div className="flex flex-col gap-2 mb-4">
                    <label htmlFor="invite-email" className="text-foreground text-sm font-medium">
                        Email Address
                    </label>
                    <div className="flex items-center w-full gap-2 border border-border rounded-md p-2.5 bg-foreground-disabled/10">
                        <HiOutlineMail size={22} className="text-border-strong" />
                        <input
                            type="email"
                            id="invite-email"
                            value={inviteData.email || ''}
                            readOnly
                            className="border-none text-foreground-secondary text-sm w-full outline-none bg-transparent"
                        />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="flex flex-col gap-2">
                        <label htmlFor="invite-firstname" className="text-foreground text-sm font-medium">
                            First Name
                        </label>
                        <div className="flex items-center w-full gap-2 border border-border rounded-md p-2.5 focus-within:ring focus-within:ring-foreground">
                            <input
                                type="text"
                                id="invite-firstname"
                                placeholder="John"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                required
                                className="border-none text-foreground text-sm w-full outline-none placeholder:text-sm placeholder:text-border-strong"
                            />
                        </div>
                    </div>
                    <div className="flex flex-col gap-2">
                        <label htmlFor="invite-lastname" className="text-foreground text-sm font-medium">
                            Last Name
                        </label>
                        <div className="flex items-center w-full gap-2 border border-border rounded-md p-2.5 focus-within:ring focus-within:ring-foreground">
                            <input
                                type="text"
                                id="invite-lastname"
                                placeholder="Doe"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                required
                                className="border-none text-foreground text-sm w-full outline-none placeholder:text-sm placeholder:text-border-strong"
                            />
                        </div>
                    </div>
                </div>
                <div className="flex flex-col gap-2 mb-4">
                    <label htmlFor="invite-phone" className="text-foreground text-sm font-medium">
                        Phone <span className="text-foreground-tertiary">(optional)</span>
                    </label>
                    <div className="flex items-center w-full gap-2 border border-border rounded-md p-2.5 focus-within:ring focus-within:ring-foreground">
                        <input
                            type="tel"
                            id="invite-phone"
                            placeholder="+234 800 000 0000"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="border-none text-foreground text-sm w-full outline-none placeholder:text-sm placeholder:text-border-strong"
                        />
                    </div>
                </div>
                <div className="flex flex-col gap-2 mb-6">
                    <label htmlFor="invite-password" className="text-foreground text-sm font-medium">
                        Password
                    </label>
                    <div className="flex items-center w-full gap-2 border border-border rounded-md p-2.5 focus-within:ring focus-within:ring-foreground">
                        <CiLock size={22} className="text-border-strong" />
                        <input
                            type={showPassword ? 'text' : 'password'}
                            id="invite-password"
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
                    <p className="text-foreground-tertiary text-xs">
                        Min 8 characters, one uppercase letter, one number
                    </p>
                </div>
                <button
                    type="submit"
                    disabled={disabled}
                    className={`bg-foreground w-full rounded-md py-3 font-medium ${disabled ? 'opacity-20 cursor-not-allowed' : 'text-background'}`}
                >
                    {loading ? 'Setting up your account...' : 'Accept & Join StayHaven'}
                </button>
            </form>
        </div>
    )
}

export default InviteAcceptForm
