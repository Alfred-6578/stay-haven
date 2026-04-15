import ResetPasswordForm from '@/component/auth/ResetPasswordForm'
import SideContent from '@/component/auth/SideContent'
import React, { Suspense } from 'react'

interface PageProps {
  searchParams: Promise<{ activate?: string }>
}

const ResetPasswordPage = async ({ searchParams }: PageProps) => {
  const { activate } = await searchParams
  const isActivation = activate === '1'

  return (
    <div className='grid lg:grid-cols-2 min-h-screen'>
        <SideContent>
            <div className="flex flex-col gap-6">
                <h1 className="font-heading font-semibold italic leading-16 text-5xl">
                    {isActivation
                      ? "Welcome — let's activate your account."
                      : "A fresh start is just one step away."}
                </h1>
                <p>
                    {isActivation
                      ? "Set a password to access your booking, earn loyalty points, and manage your stay."
                      : "Choose a strong password to keep your account secure."}
                </p>
            </div>
        </SideContent>
        <div className="bg-background p-6 sm:p-10 lg:p-12 flex items-center">
            <Suspense fallback={<div className="w-full text-center text-foreground-secondary text-sm">Loading...</div>}>
                <ResetPasswordForm />
            </Suspense>
        </div>
    </div>
  )
}

export default ResetPasswordPage
