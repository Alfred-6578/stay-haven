import ForgotPasswordForm from '@/component/auth/ForgotPasswordForm'
import SideContent from '@/component/auth/SideContent'
import React from 'react'

const ForgotPasswordPage = () => {
  return (
    <div className='grid lg:grid-cols-2 min-h-screen'>
        <SideContent>
            <div className="flex flex-col gap-6">
                <h1 className="font-heading font-semibold italic leading-16 text-5xl">
                    Don&apos;t worry, it happens to the best of us.
                </h1>
                <p>
                    We&apos;ll have you back in your account in no time.
                </p>
            </div>
        </SideContent>
        <div className="bg-background p-6 sm:p-10 lg:p-12 flex items-center">
            <ForgotPasswordForm />
        </div>
    </div>
  )
}

export default ForgotPasswordPage
