import React, { useEffect } from 'react';
import Navbar from '../components/landing/Navbar';
import HeroSection from '../components/landing/HeroSection';
import FeaturesSection from '../components/landing/FeaturesSection';
import HowItWorksSection from '../components/landing/HowItWorksSection';
import CTASection from '../components/landing/CTASection';
import Footer from '../components/landing/Footer';

const Landing = () => {
  useEffect(() => {
    // Allow scrolling on the landing page
    document.body.style.overflow = 'auto';
    window.scrollTo(0, 0);
    return () => {
      // Restore overflow hidden for other pages (IDE etc.)
      document.body.style.overflow = 'hidden';
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#030303] animated-mesh-bg overflow-x-hidden selection:bg-cyan-500/30 selection:text-cyan-200">
      <Navbar />

      <main>
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <CTASection />
      </main>

      <Footer />
    </div>
  );
};

export default Landing;
