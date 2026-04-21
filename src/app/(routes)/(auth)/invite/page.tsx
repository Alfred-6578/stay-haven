import InviteAcceptForm from '@/component/auth/InviteAcceptForm'
import SideContent from '@/component/auth/SideContent'
import React, { Suspense } from 'react'

const InvitePage = () => {
  return (
    <div className='grid lg:grid-cols-2 min-h-screen'>
        <SideContent>
            <div className="flex flex-col gap-6">
                <h1 className="font-heading font-semibold italic leading-16 text-5xl">
                    Welcome to the team. We&apos;ve been expecting you.
                </h1>
                <p>
                    Join the StayHaven staff and help us create unforgettable experiences.
                </p>
            </div>
        </SideContent>
        <div className="bg-background p-6 sm:p-10 lg:p-12 flex items-center">
            <Suspense fallback={<div className="w-full text-center text-foreground-secondary text-sm">Loading...</div>}>
                <InviteAcceptForm />
            </Suspense>
        </div>
    </div>
  )
}

export default InvitePage
