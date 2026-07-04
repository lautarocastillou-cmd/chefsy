'use client'

import React, { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import { Plus, Minus, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { ProductoCatalogo, ModificadorCatalogo } from '@/tipos/catalogo'
import { formatearPrecio, optimizarUrlImagen, generarBlurUrl } from '@/lib/utils'


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
  onAgregar: (conPuntos: boolean) => void
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
  const [mostrarFotos, setMostrarFotos] = useState(false)
  const galeriaRef = useRef<HTMLDivElement>(null)
  const listaFotos = imagenFinal ? (imagenFinal.includes(' | ') ? imagenFinal.split(' | ') : [imagenFinal]).map(url => url.trim()).filter(Boolean) : []
  const cerradoPorAtrasRef = useRef(false)
  const onCerrarRef = useRef(onCerrar)

  useEffect(() => {
    onCerrarRef.current = onCerrar
  }, [onCerrar])

  useEffect(() => {
    // Interceptar gesto o botón Atrás (iPhone/Android)
    window.history.pushState({ modalProducto: true }, '', window.location.href)

    const handlePopState = () => {
      cerradoPorAtrasRef.current = true
      onCerrarRef.current()
    }

    window.addEventListener('popstate', handlePopState)

    // Deshabilitar scroll de html y body al montar para evitar que el fondo se mueva
    const origHtmlOverflow = document.documentElement.style.overflow
    const origBodyOverflow = document.body.style.overflow
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('popstate', handlePopState)
      document.documentElement.style.overflow = origHtmlOverflow
      document.body.style.overflow = origBodyOverflow
      if (!cerradoPorAtrasRef.current && window.history.state?.modalProducto) {
        window.history.back()
      }
    }
  }, [])

  return (
    <div 
      className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCerrar()
      }}
      onWheel={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      data-lenis-prevent="true"
    >
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/85 transition-opacity animate-in fade-in duration-250 ease-out pointer-events-auto will-change-opacity"
        onClick={onCerrar}
      />

      {/* Modal Panel */}
      <div 
        className="relative w-full h-[100dvh] sm:h-auto sm:max-w-md bg-[#1c1c1c] shadow-2xl rounded-none sm:rounded-[2rem] overflow-hidden sm:border border-[#3d3d3d] z-10 flex flex-col sm:max-h-[85vh] animate-in slide-in-from-bottom-6 sm:zoom-in-95 fade-in duration-250 ease-out pb-6 sm:pb-0 pointer-events-auto will-change-transform"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Barra decorativa superior (solo mobile) */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 sm:hidden pointer-events-none">
          <div className="w-10 h-1 rounded-full bg-slate-600/80 backdrop-blur-md shadow-sm" />
        </div>

        {/* Galería de Imágenes con Animación Fluida */}
        {listaFotos.length > 0 && (
          <div 
            className={`w-full shrink-0 overflow-hidden transition-[max-height,opacity] duration-700 ease-in-out ${
              mostrarFotos ? 'max-h-[350px] opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="relative w-full h-48 sm:h-64 group/gallery">
              <div 
                ref={galeriaRef}
                className="w-full h-full overflow-x-auto overflow-y-hidden snap-x snap-mandatory scrollbar-hide flex scroll-smooth"
              >
                {listaFotos.map((imgUrl, i) => {
                  const optimized = optimizarUrlImagen(imgUrl, 600)
                  const isCloud = imgUrl.includes('res.cloudinary.com')
                  return (
                    <div key={i} className="relative w-full h-full shrink-0 snap-center">
                      <Image 
                        src={optimized} 
                        alt={`${producto.nombre} - Foto ${i+1}`} 
                        fill
                        unoptimized={isCloud}
                        priority={i === 0}
                        placeholder="blur"
                        blurDataURL={generarBlurUrl(imgUrl)}
                        className="object-cover" 
                      />
                      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#1c1c1c] to-transparent pointer-events-none" />
                    </div>
                  )
                })}
              </div>

              {listaFotos.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => galeriaRef.current?.scrollBy({ left: -galeriaRef.current.clientWidth, behavior: 'smooth' })}
                    className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white flex items-center justify-center border border-white/10 transition-all active:scale-95 shadow-lg cursor-pointer"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    type="button"
                    onClick={() => galeriaRef.current?.scrollBy({ left: galeriaRef.current.clientWidth, behavior: 'smooth' })}
                    className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white flex items-center justify-center border border-white/10 transition-all active:scale-95 shadow-lg cursor-pointer"
                  >
                    <ChevronRight size={20} />
                  </button>
                  <div className="absolute bottom-3 right-3 z-20 px-2.5 py-1 rounded-lg bg-black/50 backdrop-blur-md text-[10px] font-bold text-white tracking-wider flex items-center gap-1.5 border border-white/10">
                    <span className="w-1.5 h-1.5 rounded-full bg-chefsy-400 animate-pulse" />
                    {listaFotos.length} fotos
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Cabecera */}
        <div className="px-5 pt-5 sm:pt-3 pb-3 border-b border-[#3d3d3d] flex items-start justify-between gap-3 text-left relative overflow-hidden shrink-0 mt-4 sm:mt-0">
          {/* Fondo decorativo */}
          <div className="absolute inset-0 bg-gradient-to-br from-chefsy-500/5 via-transparent to-transparent pointer-events-none" />
          
          <div className="relative z-10 flex-1">
            <p className="text-[9px] font-semibold text-chefsy-400 uppercase tracking-[0.2em] mb-0.5">Estás pidiendo</p>
            <div className="flex items-center justify-between">
              <h3 className="font-bebas text-2xl sm:text-3xl text-white leading-none tracking-wide">
                {producto.nombre}
              </h3>
              
              <div className="flex items-center gap-2">
                {listaFotos.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setMostrarFotos(!mostrarFotos)}
                    className="px-3 py-1.5 bg-[#252525] border border-[#3d3d3d] rounded-lg text-[10px] font-bold text-slate-300 hover:text-white transition-colors cursor-pointer"
                  >
                    {mostrarFotos ? 'Ocultar fotos' : 'Ver fotos'}
                  </button>
                )}
                <button
                  onClick={onCerrar}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-[#252525] border border-[#3d3d3d] text-slate-400 hover:text-white transition-colors focus:outline-none shrink-0"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
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
          <div className="flex-1 flex flex-col gap-2">
            <button
              onClick={() => onAgregar(false)}
              className="w-full bg-gradient-to-r from-chefsy-500 to-chefsy-600 hover:from-chefsy-400 hover:to-chefsy-500 text-white font-bebas text-lg tracking-wider py-2.5 px-3 rounded-xl shadow-lg shadow-chefsy-500/20 transition-all active:scale-[0.98] cursor-pointer text-center leading-none"
            >
              Agregar · {formatearPrecio(precioUnitarioTotal * cantidadModal)}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
