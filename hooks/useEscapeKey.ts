import { useEffect, useRef } from 'react'

/**
 * Hook para ejecutar una función cuando se presiona la tecla Escape.
 * Útil para cerrar modales, menús y cajones de forma accesible.
 */
export function useEscapeKey(onEscape: () => void, isActive: boolean = true) {
  // Guardamos el callback en un ref para que el listener no se re-suscriba en
  // cada render. La asignación va en un efecto y no en el cuerpo del hook:
  // escribir en un ref durante el render es un efecto secundario, y con
  // renderizado concurrente podría quedar el valor de un render descartado.
  const onEscapeRef = useRef(onEscape)

  useEffect(() => {
    onEscapeRef.current = onEscape
  }, [onEscape])

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
