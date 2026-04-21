import LoginForm from '@/component/auth/LoginForm'
import SideContent from '@/component/auth/SideContent'
import React, { Suspense } from 'react'

const LoginPage = () => {
  return (
    <div className='grid lg:grid-cols-2 min-h-screen'>
        <SideContent>
            <div className="flex flex-col gap-6">
                <h1 className="font-heading font-semibold italic leading-16 text-5xl">
                    Where every stay becomes a memory worth keeping.
                </h1>
                <p className="">
                    — Trusted by 12,000+ guests across Nigeria
                </p>
                <div className="grid grid-cols-2 gap-4">
                    <div className="h-45 rounded-3xl overflow-hidden">
                        <div className="bg-[#1e2a1e] h-[60%] p-3 flex items-end">
                            <span className="bg-black/50 text-[10px] p-1 px-2 rounded">Standard</span>
                        </div>
                        <div className="bg-accent-hover/30 h-[40%] p-3 flex flex-col justify-center">
                            <h6 className="text-sm font-semibold">
                                Classic Room
                            </h6>
                            <p className="text-[12px]">
                                From ₦65,000 / night
                            </p>
                        </div>
                    </div>
                     <div className="h-45 rounded-3xl overflow-hidden">
                        <div className="bg-[#1a1e2a] h-[60%] p-3 flex items-end">
                            <span className="bg-black/50 text-[10px] p-1 px-2 rounded">Deluxe</span>
                        </div>
                        <div className="bg-accent-hover/30 h-[40%] p-3 flex flex-col justify-center">
                            <h6 className="text-sm font-semibold">
                                Deluxe Suite
                            </h6>
                            <p className="text-[12px]">
                                From ₦115,000 / night
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </SideContent>
        <div className="bg-background p-4 tny:p-6 sm:p-10 lg:p-12 flex items-center">
            <Suspense fallback={<div className="w-full text-center text-foreground-secondary text-sm">Loading...</div>}>
                <LoginForm />
            </Suspense>
        </div>
    </div>
  )
}

export default LoginPage