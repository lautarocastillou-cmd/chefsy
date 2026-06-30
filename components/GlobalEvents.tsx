'use client'

import { useEffect } from 'react'

export default function GlobalEvents() {
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement
      if (
        document.activeElement === target &&
        target.tagName === 'INPUT' &&
        (target as HTMLInputElement).type === 'number'
      ) {
        (target as HTMLInputElement).blur()
      }
    }

    // Seleccionar automáticamente el "0" inicial al enfocar un input numérico
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLInputElement
      if (target && target.tagName === 'INPUT' && target.type === 'number') {
        if (target.value === '0') {
          setTimeout(() => {
            try { target.select() } catch {}
          }, 10)
        }
      }
    }

    // Quitar ceros a la izquierda (ej. "0500" -> "500") al escribir en inputs numéricos
    const handleInput = (e: Event) => {
      const target = e.target as HTMLInputElement
      if (target && target.tagName === 'INPUT' && target.type === 'number') {
        const val = target.value
        if (val && val.length > 1 && /^0+\d/.test(val)) {
          const clean = val.replace(/^0+(?=\d)/, '')
          if (val !== clean) {
            target.value = clean
            // Notificar al valueTracker de React para que actualice su estado controlado
            const tracker = (target as any)._valueTracker
            if (tracker) {
              tracker.setValue('')
            }
            target.dispatchEvent(new Event('input', { bubbles: true }))
          }
        }
      }
    }

    window.addEventListener('wheel', handleWheel, { passive: true })
    document.addEventListener('focusin', handleFocusIn, true)
    document.addEventListener('input', handleInput, true)
    
    return () => {
      window.removeEventListener('wheel', handleWheel)
      document.removeEventListener('focusin', handleFocusIn, true)
      document.removeEventListener('input', handleInput, true)
    }
  }, [])

  return null
}
