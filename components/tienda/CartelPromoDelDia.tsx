'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { X, ArrowRight } from 'lucide-react'
import { usarConfiguracionTienda } from '@/contexto/ConfiguracionTiendaContexto'
import { scrollHaciaCategoria } from '@/lib/tienda-helpers'
import { PROMO_POPUP_DEFAULT } from '@/tipos/promo'

export default function CartelPromoDelDia() {
  const [abierto, setAbierto] = useState(false)
  const { configuracion } = usarConfiguracionTienda()

  const configPromo = configuracion?.promo_popup || PROMO_POPUP_DEFAULT
  const promoActiva = configPromo.activo !== false

  // Sanitización de textos para evitar mayúsculas agresivas o textos desactualizados de caché
  const rawTitulo = configPromo.titulo?.trim() || ''
  const tituloLimpio = (!rawTitulo || rawTitulo.toUpperCase() === 'PROMO DE HOY')
    ? 'Promo del día'
    : rawTitulo

  const rawDesc = configPromo.descripcion?.trim() || ''
  const esDescDesactualizada =
    rawDesc.includes('Burger Especial') ||
    rawDesc.includes('Lomito de Pollo') ||
    rawDesc.includes('Coca-Cola')
  const descripcionLimpia = esDescDesactualizada || !rawDesc
    ? 'Elegí cualquier burger, lomo o milanesa individual de la carta y sumás una Fanta o Sprite de 375cc de regalo.'
    : rawDesc

  // Abrir cartel al ingresar
  useEffect(() => {
    if (typeof window === 'undefined' || !promoActiva) return

    const params = new URLSearchParams(window.location.search)
    const tieneParamPromo = params.has('promo') || params.get('p') === 'promo'

    // Si viene con link de promo explícito (?promo), abrir siempre
    if (tieneParamPromo) {
      const timer = setTimeout(() => setAbierto(true), 300)
      return () => clearTimeout(timer)
    }

    // Si ya vio el popup en esta versión de la promo, no volver a interrumpir
    try {
      const yaVisto = sessionStorage.getItem('chefsy_promo_popup_vista_v2')
      if (!yaVisto) {
        const timer = setTimeout(() => setAbierto(true), 450)
        return () => clearTimeout(timer)
      }
    } catch (_) {
      const timer = setTimeout(() => setAbierto(true), 450)
      return () => clearTimeout(timer)
    }
  }, [promoActiva])

  // Escuchar evento global por si tocan un banner o botón "Ver Promo"
  useEffect(() => {
    const handleAbrir = () => setAbierto(true)
    window.addEventListener('chefsy:abrir-promo', handleAbrir)
    ;(window as any).abrirCartelPromo = handleAbrir
    return () => {
      window.removeEventListener('chefsy:abrir-promo', handleAbrir)
      delete (window as any).abrirCartelPromo
    }
  }, [])

  const cerrarModal = useCallback(() => {
    setAbierto(false)
    try {
      sessionStorage.setItem('chefsy_promo_popup_vista_v2', '1')
    } catch (_) {}
  }, [])

  const handleElegirCategoria = (categoriaId: string) => {
    cerrarModal()
    setTimeout(() => {
      scrollHaciaCategoria(categoriaId)
    }, 120)
  }

  if (!abierto || !promoActiva) return null

  // Fotos oficiales de referencia de las categorías
  const fotoBurger = 'https://res.cloudinary.com/dmncddle8/image/upload/f_auto,q_auto,w_800/v1782009810/btwjx7btqxu4i28p0rzc.jpg'
  const fotoLomo = 'https://bdwgglizirgyuxfwssvc.supabase.co/storage/v1/object/public/images/upload_1783992908572_cd157k.jpeg'
  const fotoMila = 'https://bdwgglizirgyuxfwssvc.supabase.co/storage/v1/object/public/images/upload_1782346979850_ojawu.jpeg'

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/85 animate-in fade-in duration-200 select-none overflow-y-auto"
      onClick={cerrarModal}
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="relative w-full max-w-xl sm:max-w-2xl md:max-w-3xl bg-[#161616] border border-[#2a2a2a] rounded-2xl sm:rounded-3xl p-5 sm:p-7 shadow-[0_24px_70px_rgba(0,0,0,0.95)] overflow-hidden my-auto text-center animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botón cerrar X */}
        <button
          type="button"
          onClick={cerrarModal}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 w-8 h-8 rounded-full bg-[#222222] hover:bg-[#2e2e2e] text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer z-20 border border-[#333333] active:scale-95"
          aria-label="Cerrar cartel de promo"
        >
          <X size={16} />
        </button>

        {/* Encabezado del Cartel */}
        <div className="flex flex-col items-center space-y-2 max-w-lg mx-auto">
          {/* Título Principal */}
          <h2 className="font-bebas text-3xl sm:text-4xl md:text-5xl text-white tracking-wide leading-tight">
            {tituloLimpio}
          </h2>

          {/* Subtítulo / Descripción */}
          <p className="text-xs sm:text-sm text-slate-300 font-normal leading-relaxed max-w-md pt-0.5">
            {descripcionLimpia}
          </p>
        </div>

        {/* CONTENEDOR DE CATEGORÍAS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-6 text-left">
          
          {/* CATEGORÍA 1: BURGERS */}
          <div 
            onClick={() => handleElegirCategoria('patys')}
            className="group relative bg-[#121212] hover:bg-[#1a1a1a] border border-[#262626] hover:border-emerald-500/50 rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between transition-colors duration-150 cursor-pointer shadow-md active:scale-[0.99]"
          >
            <div className="flex sm:flex-col items-start gap-3">
              {/* Imagen de la categoría */}
              <div className="relative w-16 h-16 sm:w-full sm:h-28 rounded-xl overflow-hidden bg-black/60 border border-[#262626] shrink-0">
                <Image
                  src={fotoBurger}
                  alt="Burgers individuales"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-200"
                  sizes="(max-width: 640px) 64px, 240px"
                  priority
                />
              </div>

              {/* Textos */}
              <div className="flex-1 min-w-0 sm:pt-1">
                <div className="flex items-baseline justify-between gap-1.5">
                  <h3 className="font-bebas text-xl sm:text-2xl text-white tracking-wide leading-none group-hover:text-emerald-300 transition-colors">
                    Burgers
                  </h3>
                  <span className="text-[11px] text-emerald-400/90 font-medium sm:hidden">
                    Bebida gratis
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-snug">
                  Común, Especial, Chefsy, American y 4 Quesos.
                </p>
                <p className="text-[11px] text-emerald-400/90 font-medium mt-1 leading-tight hidden sm:block">
                  Con Fanta o Sprite gratis
                </p>
              </div>
            </div>

            {/* Botón Acción */}
            <div className="mt-3.5 pt-2.5 border-t border-[#222222] flex items-center justify-between text-xs font-semibold text-slate-300 group-hover:text-emerald-400 transition-colors">
              <span className="text-[11px] font-medium">Ver opciones</span>
              <div className="w-6 h-6 rounded-full bg-emerald-500/15 group-hover:bg-emerald-500 group-hover:text-black text-emerald-400 flex items-center justify-center transition-colors">
                <ArrowRight size={13} />
              </div>
            </div>
          </div>

          {/* CATEGORÍA 2: LOMOS */}
          <div 
            onClick={() => handleElegirCategoria('lomos')}
            className="group relative bg-[#121212] hover:bg-[#1a1a1a] border border-[#262626] hover:border-emerald-500/50 rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between transition-colors duration-150 cursor-pointer shadow-md active:scale-[0.99]"
          >
            <div className="flex sm:flex-col items-start gap-3">
              {/* Imagen de la categoría */}
              <div className="relative w-16 h-16 sm:w-full sm:h-28 rounded-xl overflow-hidden bg-black/60 border border-[#262626] shrink-0">
                <Image
                  src={fotoLomo}
                  alt="Lomos individuales"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-200"
                  sizes="(max-width: 640px) 64px, 240px"
                  priority
                />
              </div>

              {/* Textos */}
              <div className="flex-1 min-w-0 sm:pt-1">
                <div className="flex items-baseline justify-between gap-1.5">
                  <h3 className="font-bebas text-xl sm:text-2xl text-white tracking-wide leading-none group-hover:text-emerald-300 transition-colors">
                    Lomos
                  </h3>
                  <span className="text-[11px] text-emerald-400/90 font-medium sm:hidden">
                    Bebida gratis
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-snug">
                  Lomito de pollo, Especial, Chefsy, American y más.
                </p>
                <p className="text-[11px] text-emerald-400/90 font-medium mt-1 leading-tight hidden sm:block">
                  Con Fanta o Sprite gratis
                </p>
              </div>
            </div>

            {/* Botón Acción */}
            <div className="mt-3.5 pt-2.5 border-t border-[#222222] flex items-center justify-between text-xs font-semibold text-slate-300 group-hover:text-emerald-400 transition-colors">
              <span className="text-[11px] font-medium">Ver opciones</span>
              <div className="w-6 h-6 rounded-full bg-emerald-500/15 group-hover:bg-emerald-500 group-hover:text-black text-emerald-400 flex items-center justify-center transition-colors">
                <ArrowRight size={13} />
              </div>
            </div>
          </div>

          {/* CATEGORÍA 3: MILAS */}
          <div 
            onClick={() => handleElegirCategoria('lomos-y-milas')}
            className="group relative bg-[#121212] hover:bg-[#1a1a1a] border border-[#262626] hover:border-emerald-500/50 rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between transition-colors duration-150 cursor-pointer shadow-md active:scale-[0.99]"
          >
            <div className="flex sm:flex-col items-start gap-3">
              {/* Imagen de la categoría */}
              <div className="relative w-16 h-16 sm:w-full sm:h-28 rounded-xl overflow-hidden bg-black/60 border border-[#262626] shrink-0">
                <Image
                  src={fotoMila}
                  alt="Milas en sándwich"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-200"
                  sizes="(max-width: 640px) 64px, 240px"
                  priority
                />
              </div>

              {/* Textos */}
              <div className="flex-1 min-w-0 sm:pt-1">
                <div className="flex items-baseline justify-between gap-1.5">
                  <h3 className="font-bebas text-xl sm:text-2xl text-white tracking-wide leading-none group-hover:text-emerald-300 transition-colors">
                    Milas
                  </h3>
                  <span className="text-[11px] text-emerald-400/90 font-medium sm:hidden">
                    Bebida gratis
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-snug">
                  En sándwich: Común, Especial, Chefsy y 4 Quesos.
                </p>
                <p className="text-[11px] text-emerald-400/90 font-medium mt-1 leading-tight hidden sm:block">
                  Con Fanta o Sprite gratis
                </p>
              </div>
            </div>

            {/* Botón Acción */}
            <div className="mt-3.5 pt-2.5 border-t border-[#222222] flex items-center justify-between text-xs font-semibold text-slate-300 group-hover:text-emerald-400 transition-colors">
              <span className="text-[11px] font-medium">Ver opciones</span>
              <div className="w-6 h-6 rounded-full bg-emerald-500/15 group-hover:bg-emerald-500 group-hover:text-black text-emerald-400 flex items-center justify-center transition-colors">
                <ArrowRight size={13} />
              </div>
            </div>
          </div>

        </div>

        {/* Footer del Popup */}
        <div className="mt-6 pt-4 border-t border-[#242424] flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <p className="text-[11px] text-slate-400">
            * Aplica a variedades individuales en sándwich. No incluye combos ni milanesas al plato.
          </p>
          <button
            type="button"
            onClick={cerrarModal}
            className="text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
          >
            Explorar toda la carta
          </button>
        </div>

      </div>
    </div>
  )
}
