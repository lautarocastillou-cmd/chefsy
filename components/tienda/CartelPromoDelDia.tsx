'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import { X, ArrowRight, ShoppingBag } from 'lucide-react'
import { usarConfiguracionTienda } from '@/contexto/ConfiguracionTiendaContexto'
import { usarCarrito } from '@/contexto/CarritoContexto'
import { usePromoFlash } from '@/hooks/usePromoFlash'
import { construirProductoPromoFlash } from '@/lib/promo-flash'
import { scrollHaciaCategoria } from '@/lib/tienda-helpers'
import { formatearPrecio } from '@/lib/utils'
import { notificarExito } from '@/lib/notificaciones'
import { PROMO_POPUP_DEFAULT } from '@/tipos/promo'

export default function CartelPromoDelDia() {
  const [abierto, setAbierto] = useState(false)
  const dialogRef = useRef<HTMLDialogElement | null>(null)
  const { configuracion } = usarConfiguracionTienda()
  const { agregarProductoDirecto } = usarCarrito()
  const { estado: estadoPromoFlash } = usePromoFlash()

  const configPromo = configuracion?.promo_popup || PROMO_POPUP_DEFAULT
  const promoBebidaActiva = configPromo.activo !== false
  const promoCheeseActiva = Boolean(estadoPromoFlash?.disponible)
  const hayAlgunaPromo = promoBebidaActiva || promoCheeseActiva

  const rawTitulo = configPromo.titulo?.trim() || ''
  const tituloLimpio = (!rawTitulo || rawTitulo.toUpperCase() === 'PROMO DE HOY')
    ? 'Promos del día'
    : rawTitulo

  const rawDesc = configPromo.descripcion?.trim() || ''
  const esDescDesactualizada =
    rawDesc.includes('Burger Especial') ||
    rawDesc.includes('Lomito de Pollo') ||
    rawDesc.includes('Coca-Cola')
  const descripcionLimpia = esDescDesactualizada || !rawDesc
    ? 'Elegí cualquier burger, lomo o milanesa individual de la carta y sumás una Fanta o Sprite de 375cc de regalo.'
    : rawDesc

  // Abrir cartel al ingresar si hay alguna promo activa
  useEffect(() => {
    if (typeof window === 'undefined' || !hayAlgunaPromo) return

    const params = new URLSearchParams(window.location.search)
    const tieneParamPromo = params.has('promo') || params.get('p') === 'promo'

    if (tieneParamPromo) {
      const timer = setTimeout(() => setAbierto(true), 300)
      return () => clearTimeout(timer)
    }

    try {
      const yaVisto = sessionStorage.getItem('chefsy_promo_popup_vista_v3')
      if (!yaVisto) {
        const timer = setTimeout(() => setAbierto(true), 450)
        return () => clearTimeout(timer)
      }
    } catch (_) {
      const timer = setTimeout(() => setAbierto(true), 450)
      return () => clearTimeout(timer)
    }
  }, [hayAlgunaPromo])

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
      sessionStorage.setItem('chefsy_promo_popup_vista_v3', '1')
    } catch (_) {}
  }, [])

  // Sincronizar visibilidad con el elemento nativo <dialog> (top-layer, Esc y gestión de foco nativos)
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (abierto && hayAlgunaPromo) {
      if (!dialog.open) {
        try {
          dialog.showModal()
        } catch {
          // Si ya estaba abierto en otro estado
        }
      }
    } else if (dialog.open) {
      dialog.close()
    }
  }, [abierto, hayAlgunaPromo])

  // Sincronizar cierre nativo (Esc, gesto atrás o closedby="any") + fallback light-dismiss para Safari
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    const onClose = () => {
      dialog.returnValue = ''
      cerrarModal()
    }
    dialog.addEventListener('close', onClose)

    if (typeof HTMLDialogElement === 'undefined' || 'closedBy' in HTMLDialogElement.prototype) {
      return () => dialog.removeEventListener('close', onClose)
    }

    const estaAfuera = (e: PointerEvent) => {
      const r = dialog.getBoundingClientRect()
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom
    }

    let presionoAfuera = false
    const onPointerDown = (e: PointerEvent) => {
      presionoAfuera = estaAfuera(e)
    }
    const onPointerUp = (e: PointerEvent) => {
      if (presionoAfuera && estaAfuera(e)) {
        dialog.close()
      }
      presionoAfuera = false
    }

    dialog.addEventListener('pointerdown', onPointerDown)
    dialog.addEventListener('pointerup', onPointerUp)
    return () => {
      dialog.removeEventListener('close', onClose)
      dialog.removeEventListener('pointerdown', onPointerDown)
      dialog.removeEventListener('pointerup', onPointerUp)
    }
  }, [cerrarModal])

  const handleElegirCategoria = (categoriaId: string) => {
    cerrarModal()
    window.dispatchEvent(new CustomEvent('chefsy:seleccionar-categoria', { detail: categoriaId }))
    setTimeout(() => {
      scrollHaciaCategoria(categoriaId)
    }, 120)
  }

  const handleSumarCheesePromo = () => {
    if (!estadoPromoFlash?.disponible) return
    const { config, restantes } = estadoPromoFlash
    const maxPermitido = Math.min(config.maxPorPedido, restantes)
    const ok = agregarProductoDirecto(construirProductoPromoFlash(config), 1, maxPermitido)
    if (ok) {
      notificarExito(`¡Adentro! Sumaste 1 ${config.nombreProducto} a tu pedido 🍔🧀`)
      cerrarModal()
    }
  }

  if (!hayAlgunaPromo) return null

  const fotoBurger = 'https://bdwgglizirgyuxfwssvc.supabase.co/storage/v1/object/public/images/upload_1795646129425_09humj.webp'
  const fotoBurgerTabla = 'https://bdwgglizirgyuxfwssvc.supabase.co/storage/v1/object/public/images/upload_1795646193386_nhmed9q.webp'
  const fotoLomo = 'https://bdwgglizirgyuxfwssvc.supabase.co/storage/v1/object/public/images/upload_1783992908572_cd157k.jpeg'
  const fotoMila = 'https://bdwgglizirgyuxfwssvc.supabase.co/storage/v1/object/public/images/upload_1782346979850_ojawu.jpeg'

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="promo-dia-titulo"
      aria-describedby="promo-dia-descripcion"
      {...({ closedby: 'any' } as any)}
      data-lenis-prevent="true"
      className="chefsy-modal-dialog m-auto p-0 bg-transparent w-[calc(100%-1.5rem)] max-w-xl sm:max-w-2xl md:max-w-3xl max-h-[92dvh] overflow-y-auto rounded-2xl sm:rounded-3xl select-none"
    >
      <div className="relative w-full bg-[#161616] border border-[#2a2a2a] rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-[0_24px_70px_rgba(0,0,0,0.95)] overflow-hidden text-center">
        {/* Botón cerrar X */}
        <button
          type="button"
          onClick={cerrarModal}
          className="absolute top-3.5 right-3.5 sm:top-5 sm:right-5 w-8 h-8 rounded-full bg-[#222222] hover:bg-[#2e2e2e] text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer z-20 border border-[#333333] active:scale-95"
          aria-label="Cerrar cartel de promo"
        >
          <X size={16} />
        </button>

        {/* ── BLOQUE ESTRELLA: BURGER CHEESE $5.000 (SOLO POR HOY) ── */}
        {promoCheeseActiva && estadoPromoFlash && (
          <div className="mb-5 relative overflow-hidden rounded-2xl border-2 border-amber-400/60 bg-gradient-to-br from-[#241809] via-[#17130d] to-[#231407] p-4 sm:p-5 text-left shadow-[0_10px_30px_rgba(245,158,11,0.2)]">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="relative w-28 h-28 sm:w-32 sm:h-32 shrink-0 rounded-2xl overflow-hidden border-2 border-amber-400/55 shadow-[0_10px_24px_rgba(0,0,0,0.75)] bg-stone-900">
                <img
                  src={
                    estadoPromoFlash.config.imagenUrl &&
                    estadoPromoFlash.config.imagenUrl !== '/burger-loca.webp'
                      ? estadoPromoFlash.config.imagenUrl
                      : fotoBurgerTabla
                  }
                  alt={estadoPromoFlash.config.nombreProducto}
                  width={140}
                  height={140}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-1 min-w-0 space-y-2 text-center sm:text-left">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-2.5 gap-y-0.5 text-[10px] font-black uppercase tracking-[0.14em]">
                  <span className="text-amber-400">{estadoPromoFlash.config.badge}</span>
                  <span aria-hidden="true" className="text-stone-600">·</span>
                  <span className="text-stone-300">
                    Quedan {estadoPromoFlash.restantes} de {estadoPromoFlash.config.limiteTotal}
                  </span>
                </div>

                <div className="flex flex-wrap items-baseline justify-center sm:justify-start gap-2.5">
                  <h1
                    id="promo-dia-titulo"
                    className="font-bebas text-3xl sm:text-4xl text-white tracking-wide leading-none"
                  >
                    BURGER <span className="text-amber-400">CHEESE</span>{' '}
                    <span className="text-amber-400">
                      {formatearPrecio(estadoPromoFlash.config.precioPromo)}
                    </span>
                  </h1>
                  {estadoPromoFlash.config.precioRegular > estadoPromoFlash.config.precioPromo && (
                    <span className="text-xs font-semibold text-stone-500 line-through">
                      {formatearPrecio(estadoPromoFlash.config.precioRegular)}
                    </span>
                  )}
                </div>

                <p
                  id="promo-dia-descripcion"
                  className="text-xs text-stone-300 leading-snug"
                >
                  {estadoPromoFlash.config.subtitulo}
                </p>

                <div className="pt-1 flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                  <button
                    type="button"
                    autoFocus
                    onClick={handleSumarCheesePromo}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 text-xs font-black tracking-wide transition-colors cursor-pointer active:scale-95"
                  >
                    <ShoppingBag size={14} strokeWidth={2.5} />
                    <span>Agregar por {formatearPrecio(estadoPromoFlash.config.precioPromo)}</span>
                  </button>
                  <span className="text-[10px] text-stone-400 font-medium">
                    Máx. {estadoPromoFlash.config.maxPorPedido} por pedido
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── BLOQUE PROMO BEBIDA GRATIS ── */}
        {promoBebidaActiva && (
          <>
            <div className="flex flex-col items-center space-y-1.5 max-w-lg mx-auto">
              {promoCheeseActiva ? (
                <h2 className="font-bebas text-2xl sm:text-3xl text-emerald-300 tracking-wide leading-tight">
                  Y además: {tituloLimpio} (Fanta o Sprite gratis)
                </h2>
              ) : (
                <h1
                  id="promo-dia-titulo"
                  className="font-bebas text-3xl sm:text-4xl md:text-5xl text-white tracking-wide leading-tight"
                >
                  {tituloLimpio}
                </h1>
              )}

              <p
                id={promoCheeseActiva ? undefined : 'promo-dia-descripcion'}
                className="text-xs sm:text-sm text-slate-300 font-normal leading-relaxed max-w-md pt-0.5"
              >
                {descripcionLimpia}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-5 text-left">
              {/* CATEGORÍA 1: BURGERS */}
              <div
                onClick={() => handleElegirCategoria('patys')}
                className="group relative bg-[#121212] hover:bg-[#1a1a1a] border border-[#262626] hover:border-emerald-500/50 rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between transition-colors duration-150 cursor-pointer shadow-md active:scale-[0.99]"
              >
                <div className="flex sm:flex-col items-start gap-3">
                  <div className="relative w-16 h-16 sm:w-full sm:h-24 rounded-xl overflow-hidden bg-black/60 border border-[#262626] shrink-0">
                    <Image
                      src={fotoBurger}
                      alt="Burgers individuales"
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-200"
                      sizes="(max-width: 640px) 64px, 240px"
                      loading="lazy"
                    />
                  </div>
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
                <div className="mt-3 pt-2.5 border-t border-[#222222] flex items-center justify-between text-xs font-semibold text-slate-300 group-hover:text-emerald-400 transition-colors">
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
                  <div className="relative w-16 h-16 sm:w-full sm:h-24 rounded-xl overflow-hidden bg-black/60 border border-[#262626] shrink-0">
                    <Image
                      src={fotoLomo}
                      alt="Lomos individuales"
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-200"
                      sizes="(max-width: 640px) 64px, 240px"
                      loading="lazy"
                    />
                  </div>
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
                <div className="mt-3 pt-2.5 border-t border-[#222222] flex items-center justify-between text-xs font-semibold text-slate-300 group-hover:text-emerald-400 transition-colors">
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
                  <div className="relative w-16 h-16 sm:w-full sm:h-24 rounded-xl overflow-hidden bg-black/60 border border-[#262626] shrink-0">
                    <Image
                      src={fotoMila}
                      alt="Milas en sándwich"
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-200"
                      sizes="(max-width: 640px) 64px, 240px"
                      loading="lazy"
                    />
                  </div>
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
                <div className="mt-3 pt-2.5 border-t border-[#222222] flex items-center justify-between text-xs font-semibold text-slate-300 group-hover:text-emerald-400 transition-colors">
                  <span className="text-[11px] font-medium">Ver opciones</span>
                  <div className="w-6 h-6 rounded-full bg-emerald-500/15 group-hover:bg-emerald-500 group-hover:text-black text-emerald-400 flex items-center justify-center transition-colors">
                    <ArrowRight size={13} />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Footer del Popup */}
        <div className="mt-5 pt-4 border-t border-[#242424] flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <p className="text-[11px] text-slate-400">
            * Promos no acumulables entre sí. La bebida gratis aplica a variedades individuales en sándwich.
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
    </dialog>
  )
}
