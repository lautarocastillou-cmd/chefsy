'use client'

import React, { useRef, useState } from 'react'
import { LogOut, X } from 'lucide-react'

interface ModalLogoutProps {
  onConfirm: () => Promise<void> | void
  onCancel: () => void
}

export default function ModalLogout({ onConfirm, onCancel }: ModalLogoutProps) {
  const [cargando, setCargando] = useState(false)
  const [translateY, setTranslateY] = useState(0)
  const touchStartY = useRef<number | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return
    const diff = e.touches[0].clientY - touchStartY.current
    if (diff > 0) {
      setTranslateY(diff)
    }
  }

  const handleTouchEnd = () => {
    if (translateY > 70) {
      onCancel()
    } else {
      setTranslateY(0)
    }
    touchStartY.current = null
  }

  const confirmar = async () => {
    setCargando(true)
    await onConfirm()
    setCargando(false)
  }

  return (
    <div className="fixed inset-0 z-[1100] flex items-end sm:items-center justify-center sm:p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onCancel}
      />

      {/* Modal */}
      <div 
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ transform: translateY > 0 ? `translateY(${translateY}px)` : undefined }}
        className="bg-[#101010] border border-white/8 w-full sm:max-w-[360px] rounded-t-3xl sm:rounded-3xl shadow-2xl relative z-10 animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-250 overflow-hidden transition-transform"
      >
        {/* Drag pill para mobile (gesto iPhone) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden cursor-grab active:cursor-grabbing">
          <div className="w-12 h-1.5 bg-white/20 rounded-full" />
        </div>

        {/* Botón cerrar */}
        <button
          onClick={onCancel}
          type="button"
          aria-label="Cerrar"
          className="absolute top-4 right-4 z-20 w-8 h-8 flex items-center justify-center text-slate-500 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-all"
        >
          <X size={16} />
        </button>

        <div className="p-6 text-center space-y-4">
          {/* Icono */}
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500/20 to-red-600/10 border border-red-500/30 flex items-center justify-center text-red-400 mx-auto shadow-xl shadow-red-500/10">
            <LogOut size={24} className="ml-0.5" />
          </div>

          <div className="space-y-1">
            <h3 className="text-white font-bebas text-2xl tracking-wide">¿Cerrar Sesión?</h3>
            <p className="text-slate-400 text-xs leading-relaxed max-w-[240px] mx-auto">
              Tendrás que volver a ingresar para acumular y canjear tus puntos Chefsitos.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={cargando}
              className="w-full bg-white/5 hover:bg-white/10 text-slate-300 font-bold py-3 px-4 rounded-xl text-xs transition-all active:scale-[0.98]"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={confirmar}
              disabled={cargando}
              className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-4 rounded-xl text-xs transition-all active:scale-[0.98] shadow-lg shadow-red-600/20 flex items-center justify-center gap-1.5"
            >
              {cargando ? (
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                'Sí, salir'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
