import { useEffect, useRef } from 'react'

/**
 * Hook para ejecutar una función cuando se presiona la tecla Escape.
 * Útil para cerrar modales, menús y cajones de forma accesible.
 */
export function useEscapeKey(onEscape: () => void, isActive: boolean = true) {
  const onEscapeRef = useRef(onEscape)
  onEscapeRef.current = onEscape

  useEffect(() => {
    if (!isActive) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onEscapeRef.current()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isActive])
}
