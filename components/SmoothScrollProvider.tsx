'use client'

import React, { useEffect } from 'react'
import Lenis from 'lenis'
import { usePathname } from 'next/navigation'

export default function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  useEffect(() => {
    const esPaginaPublica = pathname === '/' || 
                            pathname?.startsWith('/sobre-nosotros') || 
                            pathname?.startsWith('/privacidad') || 
                            pathname?.startsWith('/terminos')

    if (!esPaginaPublica) return

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.5,
    })

    if (typeof window !== 'undefined') {
      ;(window as any).__lenis = lenis
    }

    function raf(time: number) {
      lenis.raf(time)
      requestAnimationFrame(raf)
    }

    const rafId = requestAnimationFrame(raf)

    return () => {
      cancelAnimationFrame(rafId)
      if (typeof window !== 'undefined' && (window as any).__lenis === lenis) {
        ;(window as any).__lenis = null
      }
      lenis.destroy()
    }
  }, [pathname])

  return <>{children}</>
}
