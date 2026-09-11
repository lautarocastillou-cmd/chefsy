'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PropsModalCoccionEmpanada {
  abierto: boolean
  nombreProducto?: string
  coccionActual?: 'fritas' | 'al_horno'
  onSeleccionar: (coccion: 'fritas' | 'al_horno') => void
  onCerrar: () => void
}

export default function ModalCoccionEmpanada({
  abierto,
  nombreProducto = 'Empanadas',
  coccionActual,
  onSeleccionar,
  onCerrar,
}: PropsModalCoccionEmpanada) {
  const [montado, setMontado] = useState(false)

  useEffect(() => {
    setMontado(true)
  }, [])

  // Atajos de teclado: F/1 para Fritas, H/2/O para Al Horno, Esc para cerrar
  useEffect(() => {
    if (!abierto) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar si el usuario está escribiendo en un input o textarea ajeno
      const target = e.target as HTMLElement
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        // Permitir solo Escape en inputs
        if (e.key === 'Escape') {
          e.preventDefault()
          e.stopPropagation()
          onCerrar()
        }
        return
      }

      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onCerrar()
        return
      }

      const key = e.key.toLowerCase()
      if (key === 'f' || key === '1') {
        e.preventDefault()
        e.stopPropagation()
        onSeleccionar('fritas')
      } else if (key === 'h' || key === 'o' || key === '2') {
        e.preventDefault()
        e.stopPropagation()
        onSeleccionar('al_horno')
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [abierto, onSeleccionar, onCerrar])

  if (!abierto || !montado || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 p-4 animate-in fade-in duration-150 select-none"
      onClick={onCerrar}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-coccion-titulo"
    >
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150 p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🥟</span>
              <h3
                id="modal-coccion-titulo"
                className="font-black text-lg text-slate-900 dark:text-white tracking-tight"
              >
                ¿Cómo las preparamos?
              </h3>
            </div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
              {nombreProducto}
            </p>
          </div>

          <button
            type="button"
            onClick={onCerrar}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            title="Cerrar (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Opciones Principales */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Opción FRITAS */}
          <button
            type="button"
            onClick={() => onSeleccionar('fritas')}
            className={cn(
              'group relative flex flex-col items-center justify-center p-5 rounded-2xl border-2 transition-all cursor-pointer text-center active:scale-95 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm',
              coccionActual === 'fritas'
                ? 'bg-amber-500/15 border-amber-500 dark:border-amber-400 shadow-amber-500/10'
                : 'bg-slate-50/70 hover:bg-amber-50/40 dark:bg-slate-800/60 dark:hover:bg-amber-950/20 border-slate-200 dark:border-slate-700/80 hover:border-amber-400 dark:hover:border-amber-500/70'
            )}
          >
            <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center text-3xl mb-3 group-hover:scale-110 transition-transform shadow-xs">
              🥟
            </div>

            <span className="font-black text-base text-slate-900 dark:text-white tracking-wide uppercase">
              Fritas
            </span>

            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1 leading-tight">
              Crujientes y doradas
            </span>

            <div className="mt-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-800 text-[10px] font-black text-amber-800 dark:text-amber-300">
              <span>Tecla</span>
              <kbd className="font-mono bg-white dark:bg-slate-900 px-1 rounded shadow-2xs">F</kbd>
              <span>o</span>
              <kbd className="font-mono bg-white dark:bg-slate-900 px-1 rounded shadow-2xs">1</kbd>
            </div>
          </button>

          {/* Opción AL HORNO */}
          <button
            type="button"
            onClick={() => onSeleccionar('al_horno')}
            className={cn(
              'group relative flex flex-col items-center justify-center p-5 rounded-2xl border-2 transition-all cursor-pointer text-center active:scale-95 focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-sm',
              coccionActual === 'al_horno'
                ? 'bg-orange-500/15 border-orange-500 dark:border-orange-400 shadow-orange-500/10'
                : 'bg-slate-50/70 hover:bg-orange-50/40 dark:bg-slate-800/60 dark:hover:bg-orange-950/20 border-slate-200 dark:border-slate-700/80 hover:border-orange-400 dark:hover:border-orange-500/70'
            )}
          >
            <div className="w-14 h-14 rounded-2xl bg-orange-100 dark:bg-orange-950/80 text-orange-600 dark:text-orange-400 flex items-center justify-center text-3xl mb-3 group-hover:scale-110 transition-transform shadow-xs">
              🔥
            </div>

            <span className="font-black text-base text-slate-900 dark:text-white tracking-wide uppercase">
              Al Horno
            </span>

            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1 leading-tight">
              Cocción tradicional
            </span>

            <div className="mt-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-100 dark:bg-orange-950/80 border border-orange-200 dark:border-orange-800 text-[10px] font-black text-orange-800 dark:text-orange-300">
              <span>Tecla</span>
              <kbd className="font-mono bg-white dark:bg-slate-900 px-1 rounded shadow-2xs">H</kbd>
              <span>o</span>
              <kbd className="font-mono bg-white dark:bg-slate-900 px-1 rounded shadow-2xs">2</kbd>
            </div>
          </button>
        </div>

        {/* Pie con atajo y botón cancelar */}
        <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 text-xs">
          <span className="text-slate-400 text-[11px]">
            Presioná <kbd className="font-mono font-bold text-slate-600 dark:text-slate-300">F</kbd> o <kbd className="font-mono font-bold text-slate-600 dark:text-slate-300">H</kbd> en el teclado
          </span>

          <button
            type="button"
            onClick={onCerrar}
            className="px-3 py-1.5 rounded-xl text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold transition-colors cursor-pointer text-xs"
          >
            Cerrar (Esc)
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
