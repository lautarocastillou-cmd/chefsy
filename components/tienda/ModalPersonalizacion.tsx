'use client'

import React from 'react'
import { Plus, Minus, X } from 'lucide-react'
import { ProductoCatalogo, ModificadorCatalogo } from '@/tipos/catalogo'
import { formatearPrecio } from '@/lib/utils'

interface ModalPersonalizacionProps {
  producto: ProductoCatalogo
  modificadoresDisponibles: ModificadorCatalogo[]
  modsSeleccionados: ModificadorCatalogo[]
  cantidadModal: number
  notaPersonalizacion: string
  precioUnitarioTotal: number
  onCerrar: () => void
  onAlternarModificador: (mod: ModificadorCatalogo) => void
  onSetCantidad: (cantidad: number) => void
  onSetNota: (nota: string) => void
  onAgregar: () => void
}

export default function ModalPersonalizacion({
  producto,
  modificadoresDisponibles,
  modsSeleccionados,
  cantidadModal,
  notaPersonalizacion,
  precioUnitarioTotal,
  onCerrar,
  onAlternarModificador,
  onSetCantidad,
  onSetNota,
  onAgregar,
}: ModalPersonalizacionProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-md transition-opacity"
        onClick={onCerrar}
      />

      {/* Modal Panel */}
      <div className="relative w-full sm:max-w-md bg-gradient-to-b from-[#1a1f2e] to-[#0d1117] backdrop-blur-xl shadow-2xl rounded-t-[2rem] sm:rounded-[2rem] overflow-hidden border border-white/10 z-10 flex flex-col max-h-[92vh] animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300">
        
        {/* Barra decorativa superior (solo mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Cabecera */}
        <div className="px-6 pt-4 pb-5 border-b border-white/8 flex items-start justify-between gap-3 text-left relative overflow-hidden">
          {/* Fondo decorativo */}
          <div className="absolute inset-0 bg-gradient-to-br from-chefsy-500/10 via-transparent to-transparent pointer-events-none" />
          
          <div className="relative z-10">
            <p className="text-[10px] font-semibold text-chefsy-400 uppercase tracking-[0.2em] mb-1">Estás pidiendo</p>
            <h3 className="font-bebas text-3xl text-white leading-none tracking-wide">
              Personalizá tu {producto.nombre}
            </h3>
          </div>

          <button
            onClick={onCerrar}
            className="relative z-10 mt-1 w-8 h-8 flex items-center justify-center rounded-full bg-white/8 hover:bg-white/15 text-slate-400 hover:text-white transition-all shrink-0 focus:outline-none"
          >
            <X size={15} />
          </button>
        </div>

        {/* Cuerpo del Modal */}
        <div className="p-5 overflow-y-auto scrollbar-hide space-y-5 flex-1 text-left">
          
          {/* Precio base */}
          <div className="flex items-center justify-between bg-white/5 border border-white/8 rounded-2xl px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-chefsy-400 animate-pulse" />
              <span className="text-xs font-semibold text-slate-300">Precio base</span>
            </div>
            <span className="font-bebas text-xl text-white tracking-wider">{formatearPrecio(producto.precio)}</span>
          </div>

          {/* Nota libre */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-slate-300 leading-snug">
              ¿Querés cambiarle algo a tu <span className="text-chefsy-400">{producto.nombre}</span>?
            </h4>
            <div className="relative">
              <textarea
                value={notaPersonalizacion}
                onChange={(e) => onSetNota(e.target.value)}
                placeholder="Ej: Sin cebolla, con extra mayonesa..."
                className="w-full border border-white/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-chefsy-500/60 focus:border-chefsy-500/50 bg-black/30 text-white placeholder:text-slate-600 resize-none transition-all"
                rows={3}
              />
            </div>
          </div>

          {/* Modificadores disponibles */}
          {modificadoresDisponibles.length > 0 && (
            <div className="space-y-2.5">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Extras disponibles</h4>
              <div className="space-y-2">
                {modificadoresDisponibles.map(modObj => {
                  const seleccionado = modsSeleccionados.some(m => m.id === modObj.id)
                  return (
                    <button
                      key={modObj.id}
                      onClick={() => onAlternarModificador(modObj)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border text-sm font-semibold transition-all cursor-pointer ${
                        seleccionado
                          ? 'bg-chefsy-500/20 text-chefsy-300 border-chefsy-500/60 shadow-[inset_0_0_12px_rgba(255,100,0,0.08)]'
                          : 'border-white/8 bg-white/4 text-slate-400 hover:border-white/20 hover:bg-white/8'
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                          seleccionado ? 'bg-chefsy-500 border-transparent' : 'border-slate-600 bg-transparent'
                        }`}>
                          {seleccionado && <span className="text-[7px] text-white font-black">✓</span>}
                        </span>
                        {modObj.nombre}
                      </span>
                      <span className={`text-xs font-bold ${seleccionado ? 'text-chefsy-400' : 'text-slate-500'}`}>
                        + {formatearPrecio(modObj.precioExtra)}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer del Modal */}
        <div className="px-5 py-4 border-t border-white/8 bg-black/20 flex items-center gap-3">
          {/* Selector de cantidad */}
          <div className="flex items-center bg-white/8 border border-white/10 rounded-xl overflow-hidden shrink-0">
            <button
              onClick={() => onSetCantidad(Math.max(1, cantidadModal - 1))}
              className="w-14 h-14 flex items-center justify-center hover:bg-white/10 transition-colors text-slate-300 focus:outline-none"
            >
              <Minus size={22} />
            </button>
            <span className="w-12 text-center text-lg font-black text-white">
              {cantidadModal}
            </span>
            <button
              onClick={() => onSetCantidad(cantidadModal + 1)}
              className="w-14 h-14 flex items-center justify-center hover:bg-white/10 transition-colors text-slate-300 focus:outline-none"
            >
              <Plus size={22} />
            </button>
          </div>

          {/* Botón agregar */}
          <button
            onClick={onAgregar}
            className="flex-1 bg-gradient-to-r from-chefsy-500 to-chefsy-600 hover:from-chefsy-400 hover:to-chefsy-500 text-white font-bebas text-xl tracking-wider py-2.5 px-4 rounded-xl shadow-lg shadow-chefsy-500/20 transition-all active:scale-[0.98] cursor-pointer text-center leading-none"
          >
            Agregar · {formatearPrecio(precioUnitarioTotal * cantidadModal)}
          </button>
        </div>
      </div>
    </div>
  )
}
