'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { X, Gift, ArrowRight } from 'lucide-react'
import { usarCatalogo } from '@/contexto/CatalogoContexto'
import { usarCarrito } from '@/contexto/CarritoContexto'
import { usarConfiguracionTienda } from '@/contexto/ConfiguracionTiendaContexto'
import { formatearPrecio, optimizarUrlImagen } from '@/lib/utils'
import { ProductoCatalogo } from '@/tipos/catalogo'
import { PROMO_POPUP_DEFAULT } from '@/tipos/promo'

export default function CartelPromoDelDia() {
  const [abierto, setAbierto] = useState(false)
  const { productos, estaListoCatalogo } = usarCatalogo()
  const { abrirModalPersonalizacion, turnoActivo, esDomingoCerrado } = usarCarrito()
  const { configuracion } = usarConfiguracionTienda()

  const configPromo = configuracion?.promo_popup || PROMO_POPUP_DEFAULT
  const promoActiva = configPromo.activo !== false

  // Buscar los productos oficiales en el catálogo
  const productoBurger = productos.find(
    (p) => p.id === 'patys-especial' || (p.nombre.toLowerCase().includes('burger especial') && !p.nombre.includes('+'))
  )
  const productoLomito = productos.find(
    (p) => p.id === 'prod-1779840756425-936' || (p.nombre.toLowerCase().includes('lomito de pollo') && !p.nombre.includes('+'))
  )

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

    // Si ya vio el popup en esta sesión, no volver a interrumpir
    try {
      const yaVisto = sessionStorage.getItem('chefsy_promo_popup_vista')
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
      sessionStorage.setItem('chefsy_promo_popup_vista', '1')
    } catch (_) {}
  }, [])

  const handleElegirProducto = (prod: ProductoCatalogo | undefined, fallbackId: string, fallbackNombre: string, fallbackPrecio: number) => {
    cerrarModal()
    const targetProd = prod || {
      id: fallbackId,
      nombre: fallbackNombre,
      precio: fallbackPrecio,
      categoriaId: 'patys',
      esCombo: false,
    } as ProductoCatalogo

    // Pequeño timeout para transición suave entre modal de promo y modal de producto
    setTimeout(() => {
      abrirModalPersonalizacion(targetProd, true)
    }, 150)
  }

  if (!abierto || !promoActiva) return null

  // Fotos de los productos
  const fotoBurger = 'https://res.cloudinary.com/dmncddle8/image/upload/f_auto,q_auto,w_800/v1782009810/btwjx7btqxu4i28p0rzc.jpg'
  const fotoLomito = 'https://res.cloudinary.com/dmncddle8/image/upload/f_auto,q_auto,w_800/v1783992909295_vxuwe.jpeg'

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/85 animate-in fade-in duration-200 select-none overflow-y-auto"
      onClick={cerrarModal}
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="relative w-full max-w-xl sm:max-w-2xl bg-[#181818] border border-[#2e2e2e] rounded-2xl sm:rounded-3xl p-5 sm:p-7 shadow-[0_20px_60px_rgba(0,0,0,0.95)] overflow-hidden my-auto text-center animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botón cerrar X */}
        <button
          type="button"
          onClick={cerrarModal}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 w-8 h-8 rounded-full bg-[#242424] hover:bg-[#303030] text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer z-20 border border-[#383838] active:scale-95"
          aria-label="Cerrar cartel de promo"
        >
          <X size={16} />
        </button>

        {/* Encabezado del Cartel */}
        <div className="flex flex-col items-center space-y-2 max-w-lg mx-auto">
          {/* Badge superior sobrio Chefsy */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-[10px] sm:text-[11px] font-bold tracking-widest text-emerald-400 uppercase">
              {configPromo.badge || 'PROMO EXCLUSIVA'}
            </span>
          </div>

          {/* Título Principal de Impacto */}
          <h2 className="font-bebas text-4xl sm:text-5xl md:text-6xl text-white tracking-wide leading-none uppercase mt-1">
            {configPromo.titulo || 'PROMO DE HOY'}
          </h2>

          {/* Subtítulo / Descripción */}
          <p className="text-xs sm:text-sm text-slate-300 font-normal leading-relaxed max-w-md pt-0.5">
            {configPromo.descripcion || 'Comprando una Burger Especial o un Lomito de Pollo, sumás una Coca-Cola o Sprite de 375cc de regalo.'}
          </p>
        </div>

        {/* CONTENEDOR DE PRODUCTOS (Cards alineadas a la estética Chefsy) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-5 text-left">
          
          {/* TARJETA 1: BURGER ESPECIAL */}
          <div 
            onClick={() => handleElegirProducto(productoBurger, 'patys-especial', 'Burger Especial', 8000)}
            className="group relative bg-[#131313] hover:bg-[#1a1a1a] border border-[#2a2a2a] hover:border-emerald-500/50 rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between transition-colors duration-150 cursor-pointer shadow-md active:scale-[0.99]"
          >
            {/* Badge de Regalo sobre la Card */}
            <div className="flex items-center justify-between gap-1 mb-2.5">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                <Gift size={11} className="text-emerald-400" />
                <span>+ BEBIDA 375cc DE REGALO</span>
              </span>
              <span className="font-bebas text-base sm:text-lg text-emerald-400">
                {productoBurger ? formatearPrecio(productoBurger.precio) : '$8.000'}
              </span>
            </div>

            <div className="flex items-start gap-3">
              {/* Imagen del plato */}
              <div className="relative w-18 h-18 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-black/60 border border-[#282828] shrink-0">
                <Image
                  src={fotoBurger}
                  alt="Burger Especial"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-200"
                  sizes="80px"
                  priority
                />
              </div>

              {/* Textos */}
              <div className="flex-1 min-w-0">
                <h3 className="font-bebas text-xl sm:text-2xl text-white tracking-wide leading-none group-hover:text-emerald-300 transition-colors">
                  Burger Especial
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-400 line-clamp-2 mt-1 leading-snug">
                  Medallón de carne, jamón, queso, huevo, lechuga, tomate y mayo casera. Con papas.
                </p>
                <p className="text-[10px] text-slate-400 mt-1.5 font-medium">
                  Incluye: <span className="text-white font-bold">Coca-Cola o Sprite 375cc</span>
                </p>
              </div>
            </div>

            {/* Botón Acción Card */}
            <div className="mt-3.5 pt-2.5 border-t border-[#242424] flex items-center justify-between text-xs font-bold text-emerald-400 group-hover:text-emerald-300">
              <span className="uppercase tracking-wider text-[11px] font-bebas text-sm">Pedir con promo</span>
              <div className="w-6 h-6 rounded-full bg-emerald-500/15 group-hover:bg-emerald-500 group-hover:text-black text-emerald-400 flex items-center justify-center transition-colors">
                <ArrowRight size={13} />
              </div>
            </div>
          </div>

          {/* TARJETA 2: LOMITO DE POLLO */}
          <div 
            onClick={() => handleElegirProducto(productoLomito, 'prod-1779840756425-936', 'Lomito de pollo', 11500)}
            className="group relative bg-[#131313] hover:bg-[#1a1a1a] border border-[#2a2a2a] hover:border-emerald-500/50 rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between transition-colors duration-150 cursor-pointer shadow-md active:scale-[0.99]"
          >
            {/* Badge de Regalo sobre la Card */}
            <div className="flex items-center justify-between gap-1 mb-2.5">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                <Gift size={11} className="text-emerald-400" />
                <span>+ BEBIDA 375cc DE REGALO</span>
              </span>
              <span className="font-bebas text-base sm:text-lg text-emerald-400">
                {productoLomito ? formatearPrecio(productoLomito.precio) : '$11.500'}
              </span>
            </div>

            <div className="flex items-start gap-3">
              {/* Imagen del plato */}
              <div className="relative w-18 h-18 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-black/60 border border-[#282828] shrink-0">
                <Image
                  src={fotoLomito}
                  alt="Lomito de pollo"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-200"
                  sizes="80px"
                  priority
                />
              </div>

              {/* Textos */}
              <div className="flex-1 min-w-0">
                <h3 className="font-bebas text-xl sm:text-2xl text-white tracking-wide leading-none group-hover:text-emerald-300 transition-colors">
                  Lomito de Pollo
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-400 line-clamp-2 mt-1 leading-snug">
                  Bife de pollo, jamón, queso, huevo, lechuga, tomate y mayo casera. Con papas.
                </p>
                <p className="text-[10px] text-slate-400 mt-1.5 font-medium">
                  Incluye: <span className="text-white font-bold">Coca-Cola o Sprite 375cc</span>
                </p>
              </div>
            </div>

            {/* Botón Acción Card */}
            <div className="mt-3.5 pt-2.5 border-t border-[#242424] flex items-center justify-between text-xs font-bold text-emerald-400 group-hover:text-emerald-300">
              <span className="uppercase tracking-wider text-[11px] font-bebas text-sm">Pedir con promo</span>
              <div className="w-6 h-6 rounded-full bg-emerald-500/15 group-hover:bg-emerald-500 group-hover:text-black text-emerald-400 flex items-center justify-center transition-colors">
                <ArrowRight size={13} />
              </div>
            </div>
          </div>

        </div>

        {/* Footer del Popup */}
        <div className="mt-5 pt-3.5 border-t border-[#262626] flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <p className="text-[11px] text-slate-400">
            * Promoción válida para pedidos online hasta agotar stock del turno.
          </p>
          <button
            type="button"
            onClick={cerrarModal}
            className="text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
          >
            Ver toda la carta
          </button>
        </div>

      </div>
    </div>
  )
}
