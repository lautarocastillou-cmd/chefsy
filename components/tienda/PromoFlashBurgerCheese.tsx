'use client'

import React, { useState } from 'react'
import { Flame, Minus, Plus, ShoppingBag, Sparkles, Check } from 'lucide-react'
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
  const ahorroPorcentaje =
    config.precioRegular > config.precioPromo
      ? Math.round(((config.precioRegular - config.precioPromo) / config.precioRegular) * 100)
      : 0

  const quedanPocas = restantes <= Math.max(5, Math.ceil(config.limiteTotal * 0.25))
  const cantidadSegura = Math.min(cantidad, Math.max(1, maxPermitido))

  const manejarAgregar = () => {
    const producto = construirProductoPromoFlash(config)
    const ok = agregarProductoDirecto(producto, cantidadSegura, maxPermitido)
    if (!ok) return

    setRecienAgregada(true)
    notificarExito(
      cantidadSegura === 1
        ? `¡Adentro! Sumaste 1 ${config.nombreProducto} a tu pedido 🍔🧀`
        : `¡Adentro! Sumaste ${cantidadSegura} ${config.nombreProducto} a tu pedido 🍔🧀`
    )
    window.setTimeout(() => setRecienAgregada(false), 1800)
  }

  return (
    <section
      aria-labelledby="promo-flash-cheese-titulo"
      className={`relative overflow-hidden rounded-3xl border-2 border-amber-400/55 bg-gradient-to-br from-[#1d150c] via-[#15120f] to-[#1f1308] shadow-[0_14px_45px_rgba(245,158,11,0.18),0_10px_30px_rgba(0,0,0,0.65)] ${className}`}
    >
      {/* Onda superior decorativa estilo cheddar fundido */}
      <svg
        aria-hidden="true"
        viewBox="0 0 1200 44"
        preserveAspectRatio="none"
        className="w-full h-4 sm:h-5 block text-amber-400/90"
      >
        <path
          fill="currentColor"
          d="M0,0 L1200,0 L1200,12 C1150,12 1135,34 1090,34 C1045,34 1030,10 980,10 C930,10 915,40 865,40 C815,40 800,14 745,14 C690,14 670,32 620,32 C570,32 555,10 500,10 C445,10 430,38 380,38 C330,38 310,12 255,12 C200,12 185,30 135,30 C85,30 60,12 0,18 Z"
        />
      </svg>

      {/* Halo cálido de fondo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-16 -right-12 w-64 h-64 rounded-full bg-amber-500/15 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-16 -left-10 w-56 h-56 rounded-full bg-orange-500/10 blur-3xl"
      />

      <div className="relative z-10 px-4 pb-5 pt-2 sm:px-7 sm:pb-7 sm:pt-3 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-5 items-center">
        {/* Columna principal: Copy divertido + Barra de cupos + CTA */}
        <div className="space-y-3.5 text-left">
          {/* Badges superiores */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400 text-stone-950 text-[11px] font-black uppercase tracking-wider shadow-sm -rotate-1">
              <Flame size={13} className="fill-orange-600 text-orange-700" />
              {config.badge}
            </span>

            {ahorroPorcentaje > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-500/20 border border-orange-400/40 text-amber-300 text-[11px] font-extrabold">
                <Sparkles size={11} />
                {ahorroPorcentaje}% OFF
              </span>
            )}

            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                quedanPocas
                  ? 'bg-red-500/20 border-red-400/50 text-red-200'
                  : 'bg-white/5 border-white/15 text-amber-200'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  quedanPocas ? 'bg-red-400' : 'bg-amber-400'
                }`}
              />
              {quedanPocas
                ? `¡Últimas ${restantes} de ${config.limiteTotal}!`
                : `Quedan ${restantes} de ${config.limiteTotal}`}
            </span>
          </div>

          {/* Título + Precio gigante */}
          <div className="flex flex-wrap items-end gap-x-4 gap-y-1">
            <h2
              id="promo-flash-cheese-titulo"
              className="font-bebas text-4xl sm:text-5xl md:text-[54px] leading-[0.95] tracking-wide text-white"
            >
              BURGER <span className="text-amber-400">CHEESE</span>
            </h2>

            <div className="inline-flex items-baseline gap-2 bg-amber-400/15 border border-amber-400/45 rounded-2xl px-3.5 py-1.5 rotate-1">
              <span className="font-bebas text-3xl sm:text-4xl text-amber-300 leading-none tracking-wide">
                {formatearPrecio(config.precioPromo)}
              </span>
              {config.precioRegular > config.precioPromo && (
                <span className="text-xs sm:text-sm font-semibold text-stone-400 line-through">
                  {formatearPrecio(config.precioRegular)}
                </span>
              )}
            </div>
          </div>

          {/* Descripción tentadora */}
          <p className="text-xs sm:text-sm text-stone-200/90 leading-relaxed max-w-xl">
            {config.subtitulo}
          </p>

          {/* Barra de cupo en vivo */}
          <div className="max-w-md space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className={quedanPocas ? 'text-orange-300' : 'text-amber-200/90'}>
                {quedanPocas
                  ? `🔥 ¡Volando! Solo quedan ${restantes} disponibles`
                  : `🧀 Cupo limitado de hoy · ${vendidas} ya salieron`}
              </span>
              <span className="tabular-nums text-stone-400">
                {restantes}/{config.limiteTotal}
              </span>
            </div>
            <progress
              value={vendidas}
              max={config.limiteTotal}
              aria-label={`Vendidas ${vendidas} de ${config.limiteTotal} hamburguesas de la promo`}
              className="sr-only"
            />
            <div className="h-2.5 w-full rounded-full bg-black/55 border border-white/10 overflow-hidden p-[1px]">
              <div
                style={{ width: `${Math.max(8, porcentajeConsumido)}%` }}
                className={`h-full rounded-full transition-all duration-500 ${
                  quedanPocas
                    ? 'bg-gradient-to-r from-amber-400 via-orange-500 to-red-500'
                    : 'bg-gradient-to-r from-amber-300 via-amber-400 to-orange-500'
                }`}
              />
            </div>
          </div>

          {/* Controles de cantidad y botón CTA */}
          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            {maxPermitido > 1 && (
              <div className="inline-flex items-center rounded-2xl bg-black/50 border border-amber-400/35 p-1">
                <button
                  type="button"
                  onClick={() => setCantidad((c) => Math.max(1, c - 1))}
                  disabled={cantidadSegura <= 1}
                  aria-label="Restar cantidad"
                  className="w-9 h-9 rounded-xl text-amber-300 hover:bg-amber-400/15 disabled:opacity-30 flex items-center justify-center transition-colors cursor-pointer"
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
                  className="w-9 h-9 rounded-xl text-amber-300 hover:bg-amber-400/15 disabled:opacity-30 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <Plus size={15} />
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={manejarAgregar}
              className={`inline-flex items-center justify-center gap-2 px-5 sm:px-6 h-11 rounded-2xl font-extrabold text-xs sm:text-sm tracking-wide transition-all cursor-pointer active:scale-[0.98] shadow-[0_6px_22px_rgba(245,158,11,0.35)] ${
                recienAgregada
                  ? 'bg-emerald-500 text-stone-950'
                  : 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-stone-950'
              }`}
            >
              {recienAgregada ? (
                <>
                  <Check size={17} strokeWidth={3} />
                  <span>¡Sumada al carrito!</span>
                </>
              ) : (
                <>
                  <ShoppingBag size={16} strokeWidth={2.5} />
                  <span>
                    {cantidadSegura === 1
                      ? `¡Quiero mi Cheese · ${formatearPrecio(config.precioPromo)}!`
                      : `¡Sumar ${cantidadSegura} · ${formatearPrecio(config.precioPromo * cantidadSegura)}!`}
                  </span>
                </>
              )}
            </button>

            {enCarrito > 0 && (
              <button
                type="button"
                onClick={() => setCartAbierto(true)}
                className="inline-flex items-center gap-1.5 px-3.5 h-11 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-bold text-amber-200 transition-colors cursor-pointer"
              >
                <span>Tenés {enCarrito} en el carrito · Ver</span>
              </button>
            )}
          </div>

          <p className="text-[11px] text-stone-400">
            Máx. {config.maxPorPedido} por pedido · Hasta agotar {config.limiteTotal} unidades (no combinable con bebida gratis).
          </p>
        </div>

        {/* Columna derecha: Imagen vistosa de la burger */}
        <div className="relative flex items-center justify-center md:pr-2">
          <div className="relative w-36 h-36 sm:w-44 sm:h-44 md:w-52 md:h-52 flex items-center justify-center">
            <div
              aria-hidden="true"
              className="absolute inset-3 rounded-full bg-gradient-to-tr from-amber-500/35 via-yellow-400/20 to-orange-500/30 blur-xl"
            />
            <img
              src={config.imagenUrl || '/burger-loca.webp'}
              alt={config.nombreProducto}
              width={220}
              height={220}
              loading="eager"
              decoding="async"
              className="promo-cheese-float relative z-10 w-full h-full object-contain drop-shadow-[0_18px_28px_rgba(0,0,0,0.75)] select-none pointer-events-none"
            />
            {/* Sticker redondo divertido */}
            <div className="absolute -bottom-1 -right-1 z-20 px-2.5 py-1 rounded-full bg-stone-950/90 border border-amber-400/60 text-amber-300 text-[10px] font-black uppercase tracking-wider shadow-lg rotate-3">
              🧀 Doble Cheddar
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
