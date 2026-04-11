'use client'
import { useAuth } from '@/context/AuthContext'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React from 'react'
import { CiLock } from 'react-icons/ci'
import { HiOutlineMail } from 'react-icons/hi'
import { IoEyeOffOutline, IoEyeOutline } from 'react-icons/io5'

const RegisterForm = () => {
    const [password, setPassword] = React.useState('')
    const [firstName, setFirstName] = React.useState('')
    const [lastName, setLastName] = React.useState('')
    const [email, setEmail] = React.useState('')
    const [showPassword, setShowPassword] = React.useState(false)
    const [loading, setLoading] = React.useState(false)
    const [agreement, setAgreement] = React.useState(false)
    const [error, setError] = React.useState('')
    const { register } = useAuth()
    const router = useRouter()

    const calculatePasswordStrength = (password: string) => {
        let score = 0

        if (password.length >= 8) score+=25
        if (/[A-Z]/.test(password)) score+=15
        if (/[0-9]/.test(password)) score+=15
        if (/[^A-Za-z0-9]/.test(password)) score+=25
        if (/[!@#$%^&*()-+]/.test(password)) score+=10
        if (password.length >= 12) score+=10

        return score
    }

    const strength = calculatePasswordStrength(password)
    const disabled = !firstName || !lastName || !email || !password || !agreement || strength < 50

    const handleSubmit = async(e: React.FormEvent)=>{
        e.preventDefault()
        setError('')
        setLoading(true)
        try {
            const user = await register({firstName, lastName, email, password})
            router.push('/dashboard')
        } catch (err: unknown) {
             const message =
                (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                'Invalid email or password'
            setError(message)
        }finally{
            setLoading(false)
        }
    }
  return (
    <div className='w-full'>
        <div className="">
            <h5 className="text-foreground-tertiary text-[12px] sm:text-sm font-semibold uppercase">Get started</h5>
            <h1 className="font-heading mt-2 mb-1 text-accent text-xl tny:text-2xl sm:text-3xl">Create your account</h1>
            <p className="text-foreground-secondary text-sm mb-6">
                Takes less than a minute. No credit card required.
            </p>
        </div>
        {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md p-3 mb-4">
                    {error}
                </div>
            )}
        <form onSubmit={handleSubmit} className="">
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="flex flex-col gap-2">
                    <label htmlFor="firstname" className="text-foreground text-sm font-medium">
                        First Name
                    </label>
                    <div className="flex items-center w-full gap-2 border border-border rounded-md p-2.5 focus-within:ring focus-within:ring-foreground">
                        <input 
                            type="text" 
                            id='firstname' 
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            placeholder='John' 
                            className='border-none text-foreground text-sm w-full outline-none placeholder:text-sm placeholder:text-border-strong'
                        />
                    </div>
                </div>
                <div className="flex flex-col gap-2">
                    <label htmlFor="lastname" className="text-foreground text-sm font-medium">
                        Last Name
                    </label>
                    <div className="flex items-center w-full gap-2 border border-border rounded-md p-2.5 focus-within:ring focus-within:ring-foreground">
                        <input 
                            type="text" 
                            id='lastname' 
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            placeholder='Doe' 
                            className='border-none text-foreground text-sm w-full outline-none placeholder:text-sm placeholder:text-border-strong'
                        />
                    </div>
                </div>
            </div>
            <div className="flex flex-col gap-2 mb-4">
                <label htmlFor="email" className="text-foreground text-sm font-medium">
                    Email Address
                </label>
                <div className="flex items-center w-full gap-2 border border-border rounded-md p-2.5 focus-within:ring focus-within:ring-foreground">
                    <HiOutlineMail size={22} className='text-border-strong'/>
                    <input 
                        type="email" 
                        id='email' 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder='you@example.com' 
                        className='border-none text-foreground text-sm w-full outline-none placeholder:text-sm placeholder:text-border-strong'
                    />

                </div>
            </div>
            <div className="flex flex-col gap-2 mb-4">
                <label htmlFor="email" className="text-foreground text-sm font-medium">
                    Password
                </label>
                <div className="flex items-center w-full gap-2 border border-border rounded-md p-2.5 focus-within:ring focus-within:ring-foreground">
                    <CiLock size={22} className='text-border-strong'/>
                    <input 
                        type={showPassword ? 'text' : 'password'} 
                        value={password}
                        onChange={(e)=>setPassword(e.target.value)}
                        id='email' 
                        placeholder='••••••••' 
                        className='border-none text-foreground text-sm w-full outline-none placeholder:text-sm placeholder:text-border-strong'
                    />
                    <button type='button' onClick={() => setShowPassword(prev => !prev)} className='text-xl text-border-strong'>
                        {showPassword ? <IoEyeOutline /> : <IoEyeOffOutline />}
                    </button>
                </div>
                <div className="mt-1">
                    <div className="h-1.5 w-full rounded-full overflow-hidden bg-foreground-disabled/30">
                        <div className="h-full rounded-full bg-foreground" style={{width: `${strength}%`}}></div>
                    </div>
                    <p className="text-[11px] text-foreground-tertiary mt-1">
                        Password strength: {strength < 50 ? 'Weak' : strength < 75 ? 'Moderate' : 'Strong'}
                    </p>
                </div>
            </div>
            <div className="flex items-center justify-between">
                <div className="flex items-center">
                    <input 
                        type="checkbox" 
                        id='remember' 
                        checked={agreement}
                        onChange={() => setAgreement(prev => !prev)}
                        className='border border-border rounded text-foreground focus:ring-foreground'
                    />
                    <label htmlFor="remember" className="text-foreground-tertiary text-sm font-medium ml-2">
                        I agree to StayHaven's <u className='text-foreground'> Terms of Service</u> and <u className='text-foreground'> Privacy Policy</u>
                    </label>
                </div>
                
            </div>
            <button 
                type='submit'
                disabled={disabled || loading} 
                className={`bg-foreground w-full rounded-md py-3 mt-6 ${disabled || loading ? 'opacity-20 cursor-not-allowed' : 'text-background'} font-medium`}
            >
                {loading ? "Creating Account..." : "Create Account"}
            </button>
        </form>
        <div className="">
            <p className="text-foreground-secondary text-sm mt-6 text-center">
                Already have an account? <Link href="login" className="text-foreground font-medium hover:underline">Sign in</Link>
            </p>
        </div>
    </div>
  )
}

export default RegisterForm