'use client'

import React, { useEffect } from 'react'
import Image from 'next/image'
import { Plus, Minus, X } from 'lucide-react'
import { ProductoCatalogo, ModificadorCatalogo } from '@/tipos/catalogo'
import { formatearPrecio } from '@/lib/utils'

interface ModalPersonalizacionProps {
  producto: ProductoCatalogo
  imagenFinal: string
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
  imagenFinal,
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
  useEffect(() => {
    // Deshabilitar scroll del body al montar
    document.body.style.overflow = 'hidden'
    return () => {
      // Restaurar scroll al desmontar
      document.body.style.overflow = ''
    }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-md transition-opacity animate-in fade-in duration-500 ease-out"
        onClick={onCerrar}
      />

      {/* Modal Panel */}
      <div className="relative w-full sm:max-w-md bg-[#1c1c1c] shadow-2xl rounded-t-[2rem] sm:rounded-[2rem] overflow-hidden border border-[#3d3d3d] z-10 flex flex-col max-h-[92vh] animate-in slide-in-from-bottom-12 sm:zoom-in-90 fade-in duration-500 ease-out">
        
        {/* Barra decorativa superior (solo mobile) */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 sm:hidden pointer-events-none">
          <div className="w-10 h-1 rounded-full bg-slate-600/80 backdrop-blur-md shadow-sm" />
        </div>

        {/* Galería de Imágenes */}
        {imagenFinal && (
          <div className="relative w-full h-40 sm:h-56 flex overflow-x-auto overflow-y-hidden snap-x snap-mandatory scrollbar-hide">
            {(imagenFinal.includes(' | ') ? imagenFinal.split(' | ') : [imagenFinal]).map((imgUrl, i) => (
              <div key={i} className="relative w-full h-full shrink-0 snap-center">
                <Image 
                  src={imgUrl.trim()} 
                  alt={`${producto.nombre} - Foto ${i+1}`} 
                  fill
                  unoptimized={true}
                  priority={true}
                  className="object-cover" 
                />
                <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#1c1c1c] to-transparent pointer-events-none" />
              </div>
            ))}
            {/* Botón de cerrar superpuesto a la imagen */}
            <button
              onClick={onCerrar}
              className="absolute top-4 right-4 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-black/60 transition-all shrink-0 focus:outline-none"
            >
              <X size={16} />
            </button>
            {(imagenFinal.includes(' | ') ? imagenFinal.split(' | ') : [imagenFinal]).length > 1 && (
              <div className="absolute bottom-4 right-4 z-20 px-2 py-1 rounded-lg bg-black/40 backdrop-blur-md text-[10px] font-bold text-white tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-chefsy-400 animate-pulse" />
                Deslizá para ver más
              </div>
            )}
          </div>
        )}

        {/* Cabecera */}
        <div className="px-5 pt-3 pb-3 border-b border-[#3d3d3d] flex items-start justify-between gap-3 text-left relative overflow-hidden shrink-0">
          {/* Fondo decorativo */}
          <div className="absolute inset-0 bg-gradient-to-br from-chefsy-500/5 via-transparent to-transparent pointer-events-none" />
          
          <div className="relative z-10">
            <p className="text-[9px] font-semibold text-chefsy-400 uppercase tracking-[0.2em] mb-0.5">Estás pidiendo</p>
            <h3 className="font-bebas text-2xl sm:text-3xl text-white leading-none tracking-wide">
              {producto.nombre}
            </h3>
          </div>
        </div>

        {/* Cuerpo del Modal */}
        <div className="p-4 sm:p-5 overflow-y-auto scrollbar-hide space-y-4 flex-1 text-left">
          
          {/* Precio base */}
          <div className="flex items-center justify-between bg-[#252525] border border-[#3d3d3d] rounded-xl px-4 py-2.5">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-chefsy-400 animate-pulse" />
              <span className="text-xs font-semibold text-slate-300">Precio base</span>
            </div>
            <span className="font-bebas text-lg sm:text-xl text-white tracking-wider">{formatearPrecio(producto.precio)}</span>
          </div>

          {/* Nota libre */}
          <div className="space-y-1.5">
            <h4 className="text-xs font-bold text-slate-300 leading-snug">
              ¿Querés cambiarle algo a tu <span className="text-chefsy-400">{producto.nombre}</span>?
            </h4>
            <div className="relative">
              <textarea
                value={notaPersonalizacion}
                onChange={(e) => onSetNota(e.target.value)}
                placeholder="Ej: Sin cebolla, con extra mayonesa..."
                className="w-full border border-[#3d3d3d] rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-chefsy-500/60 focus:border-chefsy-500/50 bg-[#1a1a1a] text-white placeholder:text-slate-500 resize-none transition-all"
                rows={2}
              />
            </div>
          </div>

          {/* Modificadores disponibles */}
          {modificadoresDisponibles.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Extras disponibles</h4>
              <div className="space-y-1.5">
                {modificadoresDisponibles.map(modObj => {
                  const seleccionado = modsSeleccionados.some(m => m.id === modObj.id)
                  return (
                    <button
                      key={modObj.id}
                      onClick={() => onAlternarModificador(modObj)}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                        seleccionado
                          ? 'bg-chefsy-500/20 text-chefsy-300 border-chefsy-500/60 shadow-[inset_0_0_12px_rgba(42,99,72,0.08)]'
                          : 'border-[#3d3d3d] bg-[#252525] text-slate-400 hover:border-[#4d4d4d]'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center transition-all ${
                          seleccionado ? 'bg-chefsy-500 border-transparent' : 'border-slate-600 bg-transparent'
                        }`}>
                          {seleccionado && <span className="text-[6px] text-white font-black">✓</span>}
                        </span>
                        {modObj.nombre}
                      </span>
                      <span className={`text-[11px] font-bold ${seleccionado ? 'text-chefsy-400' : 'text-slate-500'}`}>
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
        <div className="px-4 py-3 border-t border-[#3d3d3d] bg-[#1a1a1a] flex items-center gap-2.5 shrink-0">
          {/* Selector de cantidad */}
          <div className="flex items-center bg-[#252525] border border-[#3d3d3d] rounded-xl overflow-hidden shrink-0">
            <button
              onClick={() => onSetCantidad(Math.max(1, cantidadModal - 1))}
              className="w-10 h-10 flex items-center justify-center hover:bg-[#3d3d3d] transition-colors text-slate-300 focus:outline-none"
            >
              <Minus size={18} />
            </button>
            <span className="w-8 text-center text-sm font-black text-white">
              {cantidadModal}
            </span>
            <button
              onClick={() => onSetCantidad(cantidadModal + 1)}
              className="w-10 h-10 flex items-center justify-center hover:bg-[#3d3d3d] transition-colors text-slate-300 focus:outline-none"
            >
              <Plus size={18} />
            </button>
          </div>

          {/* Botón agregar */}
          <button
            onClick={onAgregar}
            className="flex-1 bg-gradient-to-r from-chefsy-500 to-chefsy-600 hover:from-chefsy-400 hover:to-chefsy-500 text-white font-bebas text-lg tracking-wider py-2.5 px-3 rounded-xl shadow-lg shadow-chefsy-500/20 transition-all active:scale-[0.98] cursor-pointer text-center leading-none"
          >
            Agregar · {formatearPrecio(precioUnitarioTotal * cantidadModal)}
          </button>
        </div>
      </div>
    </div>
  )
}
