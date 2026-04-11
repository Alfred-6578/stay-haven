import RegisterForm from '@/component/auth/RegisterForm'
import SideContent from '@/component/auth/SideContent'


const RegisterPage = () => {
  return (
    <div className='grid lg:grid-cols-2 min-h-screen'>
        <SideContent>
            <div className="flex flex-col gap-6">
                <h1 className="font-heading font-semibold italic leading-16 text-5xl">
                    Your journey to exceptional stays begins here.
                </h1>
                <p className="">
                    — Join 12,000+ guests already enjoying the experience
                </p>
                <div className="flex flex-col gap-4 mt-4">
                  <div className="flex gap-4">
                    <div className="flex items-center justify-center rounded-full h-6 w-6 border border-foreground-inverse/50 mb-2">
                        <div className="bg-foreground-inverse rounded-full h-2.5 w-2.5 ">
                                
                        </div>
                    </div>
                    <p className="text-foreground-tertiary">
                        <b className="text-foreground-inverse">Instant booking confirmation </b>
                         — no waiting, no uncertainty
                    </p>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex items-center justify-center rounded-full h-6 w-6 border border-foreground-inverse/50 mb-2">
                        <div className="bg-foreground-inverse rounded-full h-2.5 w-2.5 ">
                                
                        </div>
                    </div>
                    <p className="text-foreground-tertiary">
                        <b className="text-foreground-inverse">Earn loyalty points </b>
                         on every stay — redeem for free nights
                    </p>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex items-center justify-center rounded-full h-6 w-6 border border-foreground-inverse/50 mb-2">
                        <div className="bg-foreground-inverse rounded-full h-2.5 w-2.5 ">
                                
                        </div>
                    </div>
                    <p className="text-foreground-tertiary">
                        <b className="text-foreground-inverse">Room service on demand  </b>
                        — order from your phone, anytime
                    </p>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex items-center justify-center rounded-full h-6 w-6 border border-foreground-inverse/50 mb-2">
                        <div className="bg-foreground-inverse rounded-full h-2.5 w-2.5 ">
                                
                        </div>
                    </div>
                    <p className="text-foreground-tertiary">
                        <b className="text-foreground-inverse">Manage your entire stay </b>
                         — extend, upgrade, request services
                    </p>
                  </div>
                </div>
            </div>
        </SideContent>
        <div className="bg-background p-4 tny:p-6 sm:p-10 lg:p-12 flex items-center">
            <RegisterForm />
        </div>
    </div>
  )
}

export default RegisterPage