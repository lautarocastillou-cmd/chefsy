import { useEffect } from 'react'

/**
 * Hook para ejecutar una función cuando se presiona la tecla Escape.
 * Útil para cerrar modales, menús y cajones de forma accesible.
 */
export function useEscapeKey(onEscape: () => void, isActive: boolean = true) {
  useEffect(() => {
    if (!isActive) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onEscape()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onEscape, isActive])
}
