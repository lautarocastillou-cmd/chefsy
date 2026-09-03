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
      // Detectar exclusivamente teclas < y >
      const esTeclaMenorMayor = 
        e.key === '<' || 
        e.key === '>' || 
        e.code === 'IntlBackslash'

      // Acceso directo oficial universal Ctrl + K
      const esBuscarAlternativo = e.key.toLowerCase() === 'k' || e.code === 'KeyK' || e.keyCode === 75

      if ((e.ctrlKey || e.metaKey) && (esTeclaMenorMayor || esBuscarAlternativo)) {
        // Si el formulario de pedido ya está abierto en pantalla (creando o editando), no hacer nada
        if (typeof document !== 'undefined' && document.querySelector('[data-formulario-pedido="true"]')) {
          return
        }

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
