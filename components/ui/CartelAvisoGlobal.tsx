'use client'

import React, { useState, useEffect } from 'react'
import { Clock, AlertTriangle, AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { CartelOpciones } from '@/lib/notificaciones'

export default function CartelAvisoGlobal() {
  const [cartel, setCartel] = useState<CartelOpciones | null>(null)

  const cerrar = React.useCallback((aceptado: boolean) => {
    setCartel((actual) => {
      if (!actual) return null
      if (aceptado) {
        actual.onAceptar?.()
      } else {
        actual.onCancelar?.()
      }
      return null
    })
  }, [])

  useEffect(() => {
    const handleCartel = (e: Event) => {
      const customEvent = e as CustomEvent<CartelOpciones>
      if (customEvent.detail) {
        setCartel(customEvent.detail)
      }
    }

    window.addEventListener('chefsy-cartel', handleCartel)
    return () => {
      window.removeEventListener('chefsy-cartel', handleCartel)
    }
  }, [])

  useEffect(() => {
    if (!cartel) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cerrar(false)
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => {
      window.removeEventListener('keydown', handleEscape)
    }
  }, [cartel, cerrar])

  if (!cartel) return null

  const tipo = cartel.tipo || 'aviso'
  const titulo = cartel.titulo || (tipo === 'cerrado' ? 'Local Cerrado' : tipo === 'error' ? 'Error' : 'Aviso')

  return (
    <div
      className="fixed inset-0 z-[9999999] flex items-center justify-center p-4 bg-black/80 animate-in fade-in duration-150 select-none"
      onClick={() => cerrar(false)}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-sm sm:max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl text-center flex flex-col items-center animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botón Cerrar (X) */}
        <button
          type="button"
          onClick={() => cerrar(false)}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors cursor-pointer"
          aria-label="Cerrar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icono temático */}
        <div
          className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 shadow-inner ${
            tipo === 'cerrado' || tipo === 'aviso'
              ? 'bg-amber-500/10 border border-amber-500/25 text-amber-400'
              : tipo === 'error'
              ? 'bg-red-500/10 border border-red-500/25 text-red-400'
              : tipo === 'exito'
              ? 'bg-emerald-500/10 border border-emerald-500/25 text-emerald-400'
              : 'bg-sky-500/10 border border-sky-500/25 text-sky-400'
          }`}
        >
          {tipo === 'cerrado' && <Clock className="w-7 h-7 stroke-[2.2]" />}
          {tipo === 'aviso' && <AlertTriangle className="w-7 h-7 stroke-[2.2]" />}
          {tipo === 'error' && <AlertCircle className="w-7 h-7 stroke-[2.2]" />}
          {tipo === 'exito' && <CheckCircle2 className="w-7 h-7 stroke-[2.2]" />}
          {tipo === 'info' && <Info className="w-7 h-7 stroke-[2.2]" />}
        </div>

        {/* Título */}
        <h3 className="text-xl font-bold text-white tracking-tight leading-snug">
          {titulo}
        </h3>

        {/* Mensaje descriptivo */}
        <p className="text-sm sm:text-[15px] text-slate-300 font-normal leading-relaxed mt-2 mb-6 max-w-xs sm:max-w-sm whitespace-pre-line">
          {cartel.mensaje}
        </p>

        {/* Botones de acción */}
        <div className="w-full flex items-center gap-3">
          {cartel.mostrarCancelar && (
            <button
              type="button"
              onClick={() => cerrar(false)}
              className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700/80 text-slate-300 font-bold text-sm transition-all border border-slate-700/60 active:scale-[0.98] cursor-pointer"
            >
              {cartel.botonCancelarTexto || 'Cancelar'}
            </button>
          )}
          <button
            type="button"
            onClick={() => cerrar(true)}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm tracking-wide transition-all shadow-lg active:scale-[0.98] cursor-pointer ${
              tipo === 'error'
                ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/20'
                : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold shadow-amber-500/20'
            }`}
          >
            {cartel.botonTexto || (tipo === 'cerrado' ? 'Entendido' : 'Aceptar')}
          </button>
        </div>
      </div>
    </div>
  )
}
