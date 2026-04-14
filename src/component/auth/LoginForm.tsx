'use client'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import React, { useState } from 'react'
import { CiLock } from 'react-icons/ci'
import { HiOutlineMail } from 'react-icons/hi'
import { IoEyeOffOutline, IoEyeOutline } from 'react-icons/io5'
import { useAuth } from '@/context/AuthContext'
import { useGoogleLogin } from '@react-oauth/google'
import { FcGoogle } from 'react-icons/fc'

const LoginForm = () => {
    const [showPassword, setShowPassword] = useState(false)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [googleLoading, setGoogleLoading] = useState(false)
    const { login, googleLogin } = useAuth()
    const router = useRouter()
    const searchParams = useSearchParams()
    const redirect = searchParams.get('redirect')

    const navigateAfterAuth = (role: string) => {
        if (redirect) {
            router.push(redirect)
        } else if (role === 'ADMIN') {
            router.push('/admin/dashboard')
        } else if (role === 'MANAGER' || role === 'STAFF') {
            router.push('/staff/dashboard')
        } else {
            router.push('/dashboard')
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const user = await login(email, password)
            navigateAfterAuth(user.role)
        } catch (err: unknown) {
            const message =
                (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                'Invalid email or password'
            setError(message)
        } finally {
            setLoading(false)
        }
    }

    const handleGoogleLogin = useGoogleLogin({
        onSuccess: async (response) => {
            setError('')
            setGoogleLoading(true)
            try {
                const user = await googleLogin({ accessToken: response.access_token })
                navigateAfterAuth(user.role)
            } catch (err: unknown) {
                const message =
                    (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                    'Google sign-in failed'
                setError(message)
            } finally {
                setGoogleLoading(false)
            }
        },
        onError: () => {
            setError('Google sign-in was cancelled')
        },
    })

    return (
        <div className='w-full'>
            <div className="">
                <h5 className="text-foreground-tertiary text-[12px] sm:text-sm font-semibold uppercase">Welcome back</h5>
                <h1 className="font-heading mt-2 mb-1 text-accent text-xl tny:text-2xl sm:text-3xl">Sign in to your account</h1>
                <p className="text-foreground-secondary text-sm mb-6">
                    Enter your credentials to continue your stay journey
                </p>
            </div>
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md p-3 mb-4">
                    {error}
                </div>
            )}

            {/* Google Sign-In */}
            <button
                type="button"
                onClick={() => handleGoogleLogin()}
                disabled={googleLoading || loading}
                className="flex items-center justify-center gap-3 w-full border border-border rounded-md py-3 font-medium text-sm text-foreground hover:bg-foreground-disabled/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {googleLoading ? (
                    <div className="w-5 h-5 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
                ) : (
                    <FcGoogle size={20} />
                )}
                {googleLoading ? 'Signing in...' : 'Continue with Google'}
            </button>

            <div className="w-full flex items-center my-6 gap-3">
                <div className="h-[0.5px] w-[49%] bg-border"></div>
                <p className="text-border-strong text-sm">or</p>
                <div className="h-[0.5px] w-[49%] bg-border"></div>
            </div>

            <form onSubmit={handleSubmit} className="">
                <div className="flex flex-col gap-2 mb-4">
                    <label htmlFor="email" className="text-foreground text-sm font-medium">
                        Email Address
                    </label>
                    <div className="flex items-center w-full gap-2 border border-border rounded-md p-2.5 focus-within:ring focus-within:ring-foreground">
                        <HiOutlineMail size={22} className='text-border-strong'/>
                        <input
                            type="email"
                            id='email'
                            placeholder='you@example.com'
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className='border-none text-foreground text-sm w-full outline-none placeholder:text-sm placeholder:text-border-strong'
                        />
                    </div>
                </div>
                <div className="flex flex-col gap-2 mb-4">
                    <label htmlFor="password" className="text-foreground text-sm font-medium">
                        Password
                    </label>
                    <div className="flex items-center w-full gap-2 border border-border rounded-md p-2.5 focus-within:ring focus-within:ring-foreground">
                        <CiLock size={22} className='text-border-strong'/>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            id='password'
                            placeholder='••••••••'
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className='border-none text-foreground w-full text-sm outline-none placeholder:text-sm placeholder:text-border-strong'
                        />
                        <button type='button' onClick={() => setShowPassword(prev => !prev)} className='text-xl text-border-strong'>
                            {showPassword ? <IoEyeOutline /> : <IoEyeOffOutline />}
                        </button>
                    </div>
                </div>
                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        <input type="checkbox" id='remember' className='border border-border rounded text-foreground focus:ring-foreground'/>
                        <label htmlFor="remember" className="text-foreground text-sm font-medium ml-2">
                            Remember me
                        </label>
                    </div>
                    <Link href="/forgot-password" className="text-foreground text-sm font-medium hover:underline">
                        Forgot password?
                    </Link>
                </div>
                <button
                    type="submit"
                    disabled={loading || googleLoading}
                    className="bg-foreground text-background w-full rounded-md py-3 mt-6 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? 'Signing in...' : 'Sign In'}
                </button>
            </form>
            <div className="">
                <p className="text-foreground-secondary text-sm mt-6 text-center">
                    Don&apos;t have an account? <Link href="/register" className="text-foreground font-medium hover:underline">Sign up</Link>
                </p>
            </div>
        </div>
    )
}

export default LoginForm
