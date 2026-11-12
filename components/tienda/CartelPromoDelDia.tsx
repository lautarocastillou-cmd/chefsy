'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { X, ArrowRight } from 'lucide-react'
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

  // Buscar los productos oficiales de referencia en el catálogo
  const productoBurger = productos.find(
    (p) => p.id === 'patys-especial' || (p.nombre.toLowerCase().includes('burger especial') && !p.esCombo && !p.nombre.includes('+'))
  )
  const productoLomo = productos.find(
    (p) => p.id === 'prod-1780506120462-538' || (p.nombre.toLowerCase().includes('lomo especial') && !p.esCombo && !p.nombre.includes('+'))
  ) || productos.find(
    (p) => p.id === 'prod-1779840756425-936' || (p.nombre.toLowerCase().includes('lomito de pollo') && !p.esCombo && !p.nombre.includes('+'))
  )
  const productoMila = productos.find(
    (p) => p.id === 'lomos-y-milas-especial' || (p.nombre.toLowerCase().includes('mila especial') && !p.esCombo && !p.nombre.includes('+'))
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

  // Fotos de referencia de los productos
  const fotoBurger = 'https://res.cloudinary.com/dmncddle8/image/upload/f_auto,q_auto,w_800/v1782009810/btwjx7btqxu4i28p0rzc.jpg'
  const fotoLomo = 'https://bdwgglizirgyuxfwssvc.supabase.co/storage/v1/object/public/images/upload_1782346931837_5lgxt.jpeg'
  const fotoMila = 'https://bdwgglizirgyuxfwssvc.supabase.co/storage/v1/object/public/images/upload_1782346979850_ojawu.jpeg'

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/85 animate-in fade-in duration-200 select-none overflow-y-auto"
      onClick={cerrarModal}
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="relative w-full max-w-xl sm:max-w-2xl md:max-w-4xl bg-[#181818] border border-[#2e2e2e] rounded-2xl sm:rounded-3xl p-5 sm:p-7 shadow-[0_20px_60px_rgba(0,0,0,0.95)] overflow-hidden my-auto text-center animate-in zoom-in-95 duration-150"
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
        <div className="flex flex-col items-center space-y-1.5 max-w-lg mx-auto">
          {/* Título Principal de Impacto */}
          <h2 className="font-bebas text-4xl sm:text-5xl md:text-6xl text-white tracking-wide leading-none uppercase">
            {configPromo.titulo || 'PROMO DE HOY'}
          </h2>

          {/* Subtítulo / Descripción */}
          <p className="text-xs sm:text-sm text-slate-300 font-normal leading-relaxed max-w-md pt-0.5">
            {configPromo.descripcion || 'Comprando cualquier Burger, Lomo o Mila individual de la carta, sumás una Fanta o Sprite de 375cc de regalo (no incluye combos ni promos).'}
          </p>
        </div>

        {/* CONTENEDOR DE PRODUCTOS (Cards alineadas a la estética Chefsy) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-3.5 mt-5 text-left">
          
          {/* TARJETA 1: BURGER ESPECIAL */}
          <div 
            onClick={() => handleElegirProducto(productoBurger, 'patys-especial', 'Burger Especial', 7500)}
            className="group relative bg-[#131313] hover:bg-[#1a1a1a] border border-[#2a2a2a] hover:border-emerald-500/50 rounded-2xl p-3.5 flex flex-col justify-between transition-colors duration-150 cursor-pointer shadow-md active:scale-[0.99]"
          >
            <div className="flex items-start gap-3">
              {/* Imagen del plato */}
              <div className="relative w-16 h-16 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-black/60 border border-[#282828] shrink-0">
                <Image
                  src={fotoBurger}
                  alt="Burger Especial"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-200"
                  sizes="64px"
                  priority
                />
              </div>

              {/* Textos */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-1.5">
                  <h3 className="font-bebas text-xl sm:text-2xl text-white tracking-wide leading-none group-hover:text-emerald-300 transition-colors truncate">
                    Burger Especial
                  </h3>
                  <span className="font-bebas text-base sm:text-lg text-emerald-400 shrink-0">
                    {productoBurger ? formatearPrecio(productoBurger.precio) : '$7.500'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-snug">
                  Medallón de carne, jamón, queso, huevo, lechuga, tomate y mayo casera. Con papas fritas.
                </p>
                <p className="text-[11px] text-emerald-400/90 font-medium mt-1 leading-tight">
                  Sale con Fanta o Sprite 375cc de regalo.
                </p>
              </div>
            </div>

            {/* Botón Acción Card */}
            <div className="mt-3 pt-2 border-t border-[#242424] flex items-center justify-between text-xs font-bold text-emerald-400 group-hover:text-emerald-300">
              <span className="uppercase tracking-wider text-[11px] font-bebas text-sm">Pedir con promo</span>
              <div className="w-6 h-6 rounded-full bg-emerald-500/15 group-hover:bg-emerald-500 group-hover:text-black text-emerald-400 flex items-center justify-center transition-colors">
                <ArrowRight size={13} />
              </div>
            </div>
          </div>

          {/* TARJETA 2: LOMO ESPECIAL */}
          <div 
            onClick={() => handleElegirProducto(productoLomo, 'prod-1780506120462-538', 'Lomo Especial', 11500)}
            className="group relative bg-[#131313] hover:bg-[#1a1a1a] border border-[#2a2a2a] hover:border-emerald-500/50 rounded-2xl p-3.5 flex flex-col justify-between transition-colors duration-150 cursor-pointer shadow-md active:scale-[0.99]"
          >
            <div className="flex items-start gap-3">
              {/* Imagen del plato */}
              <div className="relative w-16 h-16 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-black/60 border border-[#282828] shrink-0">
                <Image
                  src={fotoLomo}
                  alt="Lomo Especial"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-200"
                  sizes="64px"
                  priority
                />
              </div>

              {/* Textos */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-1.5">
                  <h3 className="font-bebas text-xl sm:text-2xl text-white tracking-wide leading-none group-hover:text-emerald-300 transition-colors truncate">
                    Lomo Especial
                  </h3>
                  <span className="font-bebas text-base sm:text-lg text-emerald-400 shrink-0">
                    {productoLomo ? formatearPrecio(productoLomo.precio) : '$11.500'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-snug">
                  Bife de lomo, jamón, queso, huevo, lechuga, tomate y mayo casera. Con papas fritas.
                </p>
                <p className="text-[11px] text-emerald-400/90 font-medium mt-1 leading-tight">
                  Sale con Fanta o Sprite 375cc de regalo.
                </p>
              </div>
            </div>

            {/* Botón Acción Card */}
            <div className="mt-3 pt-2 border-t border-[#242424] flex items-center justify-between text-xs font-bold text-emerald-400 group-hover:text-emerald-300">
              <span className="uppercase tracking-wider text-[11px] font-bebas text-sm">Pedir con promo</span>
              <div className="w-6 h-6 rounded-full bg-emerald-500/15 group-hover:bg-emerald-500 group-hover:text-black text-emerald-400 flex items-center justify-center transition-colors">
                <ArrowRight size={13} />
              </div>
            </div>
          </div>

          {/* TARJETA 3: MILA ESPECIAL */}
          <div 
            onClick={() => handleElegirProducto(productoMila, 'lomos-y-milas-especial', 'Mila Especial', 11500)}
            className="group relative bg-[#131313] hover:bg-[#1a1a1a] border border-[#2a2a2a] hover:border-emerald-500/50 rounded-2xl p-3.5 flex flex-col justify-between transition-colors duration-150 cursor-pointer shadow-md active:scale-[0.99]"
          >
            <div className="flex items-start gap-3">
              {/* Imagen del plato */}
              <div className="relative w-16 h-16 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-black/60 border border-[#282828] shrink-0">
                <Image
                  src={fotoMila}
                  alt="Mila Especial"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-200"
                  sizes="64px"
                  priority
                />
              </div>

              {/* Textos */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-1.5">
                  <h3 className="font-bebas text-xl sm:text-2xl text-white tracking-wide leading-none group-hover:text-emerald-300 transition-colors truncate">
                    Mila Especial
                  </h3>
                  <span className="font-bebas text-base sm:text-lg text-emerald-400 shrink-0">
                    {productoMila ? formatearPrecio(productoMila.precio) : '$11.500'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-snug">
                  Milanesa de carne, jamón, queso, huevo, lechuga, tomate y mayo casera. Con papas fritas.
                </p>
                <p className="text-[11px] text-emerald-400/90 font-medium mt-1 leading-tight">
                  Sale con Fanta o Sprite 375cc de regalo.
                </p>
              </div>
            </div>

            {/* Botón Acción Card */}
            <div className="mt-3 pt-2 border-t border-[#242424] flex items-center justify-between text-xs font-bold text-emerald-400 group-hover:text-emerald-300">
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
            * Aplica a cualquier Burger, Lomo o Mila individual de la carta. No incluye combos ni promos.
          </p>
          <button
            type="button"
            onClick={cerrarModal}
            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer shrink-0 underline underline-offset-2"
          >
            Ver toda la carta
          </button>
        </div>

      </div>
    </div>
  )
}
