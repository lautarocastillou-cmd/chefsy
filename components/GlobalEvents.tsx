'use client'

import { useEffect } from 'react'

export default function GlobalEvents() {
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement
      
      // Si el usuario scrollea mientras tiene enfocado un input numérico,
      // le sacamos el foco (blur) automáticamente.
      // Esto evita que cambien accidentalmente precios o cantidades.
      if (
        document.activeElement === target &&
        target.tagName === 'INPUT' &&
        (target as HTMLInputElement).type === 'number'
      ) {
        (target as HTMLInputElement).blur()
      }
    }

    window.addEventListener('wheel', handleWheel, { passive: true })
    
    return () => {
      window.removeEventListener('wheel', handleWheel)
    }
  }, [])

  return null
}
