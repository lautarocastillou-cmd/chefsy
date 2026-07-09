'use client'

import { useEffect } from 'react'

interface PropsAtajo {
  modalAbierto?: boolean
  onAbrirModal?: () => void
}

/**
 * Hook universal para escuchar Ctrl + K y Ctrl + < / > en el panel de administración.
 * Si el modal de nuevo pedido no está abierto, lo abre y solicita abrir el buscador automáticamente.
 */
export function useAtajoNuevoPedido({ modalAbierto = false, onAbrirModal }: PropsAtajo = {}) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Detectar teclas < y > por todos sus caracteres, códigos físicos y keyCode en Windows/Mac/Linux
      const esTeclaMenorMayor = 
        e.key === '<' || 
        e.key === '>' || 
        e.code === 'IntlBackslash' || 
        e.code === 'Backslash' || 
        e.code === 'Backquote' ||
        e.code === 'Comma' ||
        e.code === 'Period' ||
        e.keyCode === 226 ||
        e.keyCode === 188 ||
        e.keyCode === 190 ||
        e.keyCode === 60 ||
        e.keyCode === 62;

      // Acceso directo universal Ctrl + K
      const esBuscarAlternativo = e.key.toLowerCase() === 'k' || e.code === 'KeyK' || e.keyCode === 75;

      if ((e.ctrlKey || e.metaKey) && (esTeclaMenorMayor || esBuscarAlternativo)) {
        if (!modalAbierto && onAbrirModal) {
          e.preventDefault()
          e.stopPropagation()
          ;(window as any).__chefsyAbrirBuscadorAlMontar = true
          onAbrirModal()
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('chefsy:abrir-buscador-productos'))
          }, 80)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [modalAbierto, onAbrirModal])
}
