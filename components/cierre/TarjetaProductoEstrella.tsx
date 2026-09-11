'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { Crown, Trophy, Award, ShoppingBag, DollarSign, Sparkles, Sun, Moon, Utensils } from 'lucide-react'
import { formatearPrecio } from '@/lib/utils'
import { OBTENER_DETALLES_COMPLEMENTARIOS } from '@/lib/tienda-helpers'

export interface ProductoEstrellaItem {
  id: string
  nombre: string
  categoria: string
  categoriaId: string
  unidades: number
  facturacion: number
  comandas: number
  porcentajeComandas: number
  porcentajeVentas: number
}

interface TarjetaProductoEstrellaProps {
  estrellaGeneral: ProductoEstrellaItem | null
  estrellaMediodia: ProductoEstrellaItem | null
  estrellaNoche: ProductoEstrellaItem | null
  topProductos: ProductoEstrellaItem[]
  totalComandas: number
}

export default function TarjetaProductoEstrella({
  estrellaGeneral,
  estrellaMediodia,
  estrellaNoche,
  topProductos,
  totalComandas
}: TarjetaProductoEstrellaProps) {
  const [tabTurno, setTabTurno] = useState<'general' | 'mediodia' | 'noche'>('general')

  // Determinar qué producto estrella mostrar según el tab activo
  const estrellaActiva = 
    tabTurno === 'mediodia' 
      ? (estrellaMediodia || estrellaGeneral)
      : tabTurno === 'noche' 
        ? (estrellaNoche || estrellaGeneral)
        : estrellaGeneral

  // Resolver imagen complementaria del producto
  const detalles = estrellaActiva
    ? OBTENER_DETALLES_COMPLEMENTARIOS(estrellaActiva.categoriaId, estrellaActiva.nombre, estrellaActiva.id)
    : null

  const maxUnidades = topProductos.length > 0 ? topProductos[0].unidades : 1

  if (!estrellaGeneral && topProductos.length === 0) {
    return (
      <div className="bg-white dark:bg-[#252525] p-6 rounded-2xl border border-slate-100 dark:border-[#3d3d3d] shadow-sm text-center">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 mx-auto flex items-center justify-center mb-3">
          <Trophy size={24} />
        </div>
        <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">Sin datos de productos vendidos</h3>
        <p className="text-xs text-slate-400 mt-1">Aún no hay comandas registradas en el período seleccionado.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* ── SECCIÓN SUPERIOR: HERO CARD DEL PRODUCTO ESTRELLA ───────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1c1810] via-[#161412] to-[#0f0e0d] border border-amber-500/30 p-6 sm:p-7 shadow-2xl text-white">
        
        {/* Adorno de fondo brillante */}
        <div className="absolute -right-10 -top-10 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-6 top-6 opacity-10 pointer-events-none hidden sm:block">
          <Trophy size={160} className="text-amber-400" />
        </div>

        {/* Cabecera del Cartel con Selector de Turno */}
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-500/20 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-black flex items-center justify-center shadow-lg shadow-amber-500/30 shrink-0">
              <Crown size={24} className="stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 flex items-center gap-1">
                  <Sparkles size={11} />
                  Producto Estrella
                </span>
                <span className="text-xs text-slate-400 font-medium">El plato más vendido</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-amber-100 tracking-tight mt-0.5">
                Favorito de los Clientes
              </h2>
            </div>
          </div>

          {/* Selector de Turno de la Estrella */}
          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10 text-xs self-start sm:self-auto">
            <button
              onClick={() => setTabTurno('general')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                tabTurno === 'general'
                  ? 'bg-amber-500 text-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              General
            </button>
            <button
              onClick={() => setTabTurno('mediodia')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1 ${
                tabTurno === 'mediodia'
                  ? 'bg-amber-400 text-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sun size={13} />
              Mediodía
            </button>
            <button
              onClick={() => setTabTurno('noche')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1 ${
                tabTurno === 'noche'
                  ? 'bg-indigo-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Moon size={13} />
              Noche
            </button>
          </div>
        </div>

        {/* Cuerpo del Producto Estrella */}
        {estrellaActiva ? (
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center pt-6">
            
            {/* Foto e Identificación */}
            <div className="lg:col-span-6 flex items-center gap-4 sm:gap-5">
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-black/60 border-2 border-amber-400/40 shadow-xl shrink-0 flex items-center justify-center">
                {detalles?.img ? (
                  <img
                    src={detalles.img}
                    alt={estrellaActiva.nombre}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Utensils size={36} className="text-amber-500/60" />
                )}
                <div className="absolute top-1.5 left-1.5 bg-black/80 px-2 py-0.5 rounded-md text-[10px] font-black text-amber-400 border border-amber-400/30">
                  #1
                </div>
              </div>

              <div className="space-y-1.5 min-w-0">
                <span className="text-[11px] font-bold text-amber-400/90 uppercase tracking-wider block">
                  {estrellaActiva.categoria}
                </span>
                <h3 className="font-bebas text-3xl sm:text-4xl text-white tracking-wide leading-none truncate">
                  {estrellaActiva.nombre}
                </h3>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="inline-flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <DollarSign size={12} />
                    {formatearPrecio(estrellaActiva.facturacion)} recaudados
                  </span>
                </div>
              </div>
            </div>

            {/* Tarjetas de Métricas del Ítem */}
            <div className="lg:col-span-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
              
              {/* Unidades Vendidas */}
              <div className="bg-black/40 border border-amber-500/20 p-3.5 rounded-2xl">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Volumen Vendido
                </span>
                <p className="text-2xl sm:text-3xl font-black text-amber-300 mt-0.5">
                  {estrellaActiva.unidades}
                </p>
                <span className="text-[10px] text-slate-400 block">unidades despachadas</span>
              </div>

              {/* Presencia en Comandas */}
              <div className="bg-black/40 border border-amber-500/20 p-3.5 rounded-2xl">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Presencia en Pedidos
                </span>
                <p className="text-2xl sm:text-3xl font-black text-white mt-0.5">
                  {estrellaActiva.porcentajeComandas}%
                </p>
                <span className="text-[10px] text-slate-400 block">
                  en {estrellaActiva.comandas} de {totalComandas} comandas
                </span>
              </div>

              {/* % de Facturación del Menú */}
              <div className="col-span-2 sm:col-span-1 bg-black/40 border border-amber-500/20 p-3.5 rounded-2xl">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Aporte al Total
                </span>
                <p className="text-2xl sm:text-3xl font-black text-emerald-400 mt-0.5">
                  {estrellaActiva.porcentajeVentas}%
                </p>
                <span className="text-[10px] text-slate-400 block">de las ventas del local</span>
              </div>

            </div>

          </div>
        ) : (
          <p className="text-xs text-slate-400 pt-4">No hay datos para este turno específico.</p>
        )}

      </div>

      {/* ── SECCIÓN INFERIOR: PODIO TOP 5 DEL MENÚ ───────────────────────────── */}
      {topProductos.length > 0 && (
        <div className="bg-white dark:bg-[#252525] p-5 sm:p-6 rounded-3xl border border-slate-100 dark:border-[#3d3d3d] shadow-sm space-y-4">
          
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#333] pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-amber-500/10 text-amber-500">
                <Award size={18} />
              </div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">
                Podio: Top 5 Platos Más Pedidos
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-medium hidden sm:inline">
              Ranking por volumen de comandas
            </span>
          </div>

          <div className="space-y-3">
            {topProductos.map((prod, index) => {
              const porcentajeBarra = Math.round((prod.unidades / maxUnidades) * 100)
              const insignia = `#${index + 1}`

              return (
                <div 
                  key={prod.id} 
                  className="bg-slate-50 dark:bg-[#2c2c2c] p-3.5 rounded-2xl border border-slate-100 dark:border-[#383838] transition-all hover:border-amber-500/30"
                >
                  <div className="flex items-center justify-between gap-3 text-xs mb-1.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-sm font-bold w-6 text-center shrink-0">{insignia}</span>
                      <span className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate">
                        {prod.nombre}
                      </span>
                      <span className="hidden sm:inline text-[11px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-[#383838] text-slate-600 dark:text-slate-300 font-medium">
                        {prod.categoria}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-black text-amber-600 dark:text-amber-400 text-sm">
                        {prod.unidades} <span className="text-xs font-normal text-slate-500">u.</span>
                      </span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300 w-24 text-right">
                        {formatearPrecio(prod.facturacion)}
                      </span>
                    </div>
                  </div>

                  {/* Barra de progreso de volumen */}
                  <div className="w-full h-2 bg-slate-200 dark:bg-black/40 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        index === 0
                          ? 'bg-gradient-to-r from-amber-400 to-amber-500'
                          : index === 1
                            ? 'bg-slate-400 dark:bg-slate-300'
                            : index === 2
                              ? 'bg-amber-700 dark:bg-amber-600'
                              : 'bg-emerald-500'
                      }`}
                      style={{ width: `${porcentajeBarra}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

        </div>
      )}

    </div>
  )
}
