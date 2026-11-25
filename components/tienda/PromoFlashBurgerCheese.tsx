'use client'

import React, { useState } from 'react'
import { Check, Minus, Plus, ShoppingBag } from 'lucide-react'
import { usarCarrito } from '@/contexto/CarritoContexto'
import { usePromoFlash } from '@/hooks/usePromoFlash'
import { construirProductoPromoFlash, PROMO_FLASH_PRODUCTO_ID } from '@/lib/promo-flash'
import { formatearPrecio } from '@/lib/utils'
import { notificarExito } from '@/lib/notificaciones'

export default function PromoFlashBurgerCheese({ className = '' }: { className?: string }) {
  const { estado } = usePromoFlash()
  const { carrito, agregarProductoDirecto, setCartAbierto } = usarCarrito()
  const [cantidad, setCantidad] = useState(1)
  const [recienAgregada, setRecienAgregada] = useState(false)

  if (!estado || !estado.disponible) return null

  const { config, vendidas, restantes, porcentajeConsumido } = estado
  const enCarrito = carrito
    .filter((i) => i.producto.id === PROMO_FLASH_PRODUCTO_ID)
    .reduce((acc, i) => acc + i.cantidad, 0)

  const maxPermitido = Math.min(config.maxPorPedido, restantes)
  const quedanPocas = restantes <= Math.max(5, Math.ceil(config.limiteTotal * 0.25))
  const cantidadSegura = Math.min(cantidad, Math.max(1, maxPermitido))

  const manejarAgregar = () => {
    const producto = construirProductoPromoFlash(config)
    const ok = agregarProductoDirecto(producto, cantidadSegura, maxPermitido)
    if (!ok) return

    setRecienAgregada(true)
    notificarExito(
      cantidadSegura === 1
        ? `Sumaste 1 ${config.nombreProducto} a tu pedido.`
        : `Sumaste ${cantidadSegura} ${config.nombreProducto} a tu pedido.`
    )
    window.setTimeout(() => setRecienAgregada(false), 1800)
  }

  return (
    <section
      aria-labelledby="promo-flash-cheese-titulo"
      className={`relative overflow-hidden rounded-2xl border border-amber-400/40 bg-[#17130e] shadow-[0_12px_36px_rgba(0,0,0,0.55)] ${className}`}
    >
      {/* Franja superior cheddar */}
      <div aria-hidden="true" className="h-1.5 w-full bg-amber-400" />

      <div className="px-4 py-4 sm:px-7 sm:py-6 grid grid-cols-1 md:grid-cols-[1fr_200px] gap-5 items-center">
        {/* Contenido principal */}
        <div className="space-y-3 text-left">
          {/* Kicker editorial limpio (sin pill soup) */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-black uppercase tracking-[0.14em]">
            <span className="text-amber-400">{config.badge}</span>
            <span aria-hidden="true" className="text-stone-600">·</span>
            <span className={quedanPocas ? 'text-orange-400' : 'text-stone-300'}>
              {quedanPocas
                ? `Últimas ${restantes} unidades`
                : `Quedan ${restantes} de ${config.limiteTotal}`}
            </span>
          </div>

          {/* Título + Precio directo */}
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <h2
              id="promo-flash-cheese-titulo"
              className="font-bebas text-4xl sm:text-5xl md:text-[56px] leading-[0.92] tracking-wide text-white"
            >
              BURGER <span className="text-amber-400">CHEESE</span>
            </h2>

            <div className="inline-flex items-baseline gap-2">
              <span className="font-bebas text-4xl sm:text-5xl text-amber-400 leading-none tracking-wide">
                {formatearPrecio(config.precioPromo)}
              </span>
              {config.precioRegular > config.precioPromo && (
                <span className="text-sm font-semibold text-stone-500 line-through">
                  {formatearPrecio(config.precioRegular)}
                </span>
              )}
            </div>
          </div>

          <p className="text-xs sm:text-sm text-stone-300 leading-relaxed max-w-xl">
            {config.subtitulo}
          </p>

          {/* Barra de cupo sobria */}
          <div className="max-w-sm space-y-1">
            <progress
              value={vendidas}
              max={config.limiteTotal}
              aria-label={`Vendidas ${vendidas} de ${config.limiteTotal} hamburguesas de la promo`}
              className="sr-only"
            />
            <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
              <div
                style={{ width: `${Math.max(4, porcentajeConsumido)}%` }}
                className={`h-full rounded-full transition-all duration-500 ${
                  quedanPocas ? 'bg-orange-500' : 'bg-amber-400'
                }`}
              />
            </div>
          </div>

          {/* Controles de cantidad y CTA */}
          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            {maxPermitido > 1 && (
              <div className="inline-flex items-center rounded-xl bg-black/50 border border-white/15 p-0.5">
                <button
                  type="button"
                  onClick={() => setCantidad((c) => Math.max(1, c - 1))}
                  disabled={cantidadSegura <= 1}
                  aria-label="Restar cantidad"
                  className="w-9 h-9 rounded-lg text-stone-200 hover:bg-white/10 disabled:opacity-30 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <Minus size={15} />
                </button>
                <span className="w-8 text-center text-sm font-black text-white tabular-nums">
                  {cantidadSegura}
                </span>
                <button
                  type="button"
                  onClick={() => setCantidad((c) => Math.min(maxPermitido, c + 1))}
                  disabled={cantidadSegura >= maxPermitido}
                  aria-label="Sumar cantidad"
                  className="w-9 h-9 rounded-lg text-stone-200 hover:bg-white/10 disabled:opacity-30 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <Plus size={15} />
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={manejarAgregar}
              className={`inline-flex items-center justify-center gap-2 px-5 h-10 rounded-xl font-extrabold text-xs sm:text-sm tracking-wide transition-colors cursor-pointer active:scale-[0.98] ${
                recienAgregada
                  ? 'bg-emerald-500 text-stone-950'
                  : 'bg-amber-400 hover:bg-amber-300 text-stone-950'
              }`}
            >
              {recienAgregada ? (
                <>
                  <Check size={16} strokeWidth={3} />
                  <span>Sumada al carrito</span>
                </>
              ) : (
                <>
                  <ShoppingBag size={15} strokeWidth={2.5} />
                  <span>
                    {cantidadSegura === 1
                      ? `Pedir por ${formatearPrecio(config.precioPromo)}`
                      : `Sumar ${cantidadSegura} (${formatearPrecio(config.precioPromo * cantidadSegura)})`}
                  </span>
                </>
              )}
            </button>

            {enCarrito > 0 && (
              <button
                type="button"
                onClick={() => setCartAbierto(true)}
                className="inline-flex items-center px-3 h-10 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-stone-200 transition-colors cursor-pointer"
              >
                Ver carrito ({enCarrito})
              </button>
            )}
          </div>

          <p className="text-[11px] text-stone-500">
            Máx. {config.maxPorPedido} por pedido · Hasta agotar {config.limiteTotal} unidades · No acumulable con bebida gratis.
          </p>
        </div>

        {/* Imagen limpia de la burger */}
        <div className="flex items-center justify-center">
          <img
            src={config.imagenUrl || '/burger-loca.webp'}
            alt={config.nombreProducto}
            width={200}
            height={200}
            loading="eager"
            decoding="async"
            className="promo-cheese-float w-36 h-36 sm:w-44 sm:h-44 object-contain drop-shadow-[0_14px_24px_rgba(0,0,0,0.75)] select-none pointer-events-none"
          />
        </div>
      </div>
    </section>
  )
}
