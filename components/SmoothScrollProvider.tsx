'use client'

import React, { useEffect } from 'react'
import Lenis from 'lenis'
import { usePathname } from 'next/navigation'

export default function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  useEffect(() => {
    const esPaginaAdmin = pathname?.startsWith('/dashboard') || 
                          pathname?.startsWith('/pedidos') || 
                          pathname?.startsWith('/cadeteria') || 
                          pathname?.startsWith('/cierre') || 
                          pathname?.startsWith('/productos') || 
                          pathname?.startsWith('/stock') || 
                          pathname?.startsWith('/clientes') || 
                          pathname?.startsWith('/caceria') || 
                          pathname?.startsWith('/configuracion') || 
                          pathname?.startsWith('/dev-tools')

    if (esPaginaAdmin) return

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.5,
    })

    function raf(time: number) {
      lenis.raf(time)
      requestAnimationFrame(raf)
    }

    const rafId = requestAnimationFrame(raf)

    return () => {
      cancelAnimationFrame(rafId)
      lenis.destroy()
    }
  }, [pathname])

  return <>{children}</>
}
