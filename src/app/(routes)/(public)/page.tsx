import AboutUs from '@/component/landingPage/AboutUs'
import Facilities from '@/component/landingPage/Facilities'
import Hero from '@/component/landingPage/Hero'
import Services from '@/component/landingPage/Services'
import Testimonials from '@/component/landingPage/Testimonials'
import Promos from '@/component/landingPage/Promos'
import Footer from '@/component/landingPage/Footer'
import Navbar from '@/component/ui/Navbar'


const LandingPage = () => {
  return (
    <div className='bg-foreground-inverse'>
        <div className="px-4 vsm:px-6 pb-10">
            <Hero />
            <div className="md:px-4">
              <AboutUs /> 
              <Facilities />
              <Services />
              <Testimonials />
              <Promos />
              
            </div>
        </div>
        <Footer />
    </div>
  )
}

export default LandingPage