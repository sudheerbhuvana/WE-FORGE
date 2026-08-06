'use client';

import { useEffect } from 'react';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { HelmetProvider } from 'react-helmet-async';
import Navbar from '../src/components/Navbar';
import PixelSnow from '../src/components/PixelSnow';
import AuthProvider from '../src/components/AuthProvider';
import './globals.css';

gsap.registerPlugin(ScrollTrigger);

export default function RootLayout({ children }) {
  useEffect(() => {
    const isMobile = window.innerWidth < 768;

    // Skip Lenis on mobile — native scroll is faster and lighter
    if (isMobile) return;

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    // Expose globally so pages can call scrollTo
    window.__lenis = lenis;

    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(lenis.raf);
      lenis.destroy();
      window.__lenis = null;
    };
  }, []);

  return (
    <html lang="en">
      <body>
        <div style={{ position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none', opacity: 0.55 }}>
          <PixelSnow 
            variant="round" 
            color="#71C4FF"
            flakeSize={0.003}
            minFlakeSize={0.8}
            pixelResolution={800}
            speed={0.2}
            density={0.03}
            brightness={0.4}
          />
        </div>
        <AuthProvider>
          <HelmetProvider>
            <Navbar />
            {children}
          </HelmetProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
