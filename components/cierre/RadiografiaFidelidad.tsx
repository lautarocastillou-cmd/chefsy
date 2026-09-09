'use client'

import React from 'react'
import { formatearPrecio } from '@/lib/utils'
import {
  Users,
  UserCheck,
  UserPlus,
  Crown,
  Calendar,
  Phone,
  MessageCircle,
  AlertCircle,
  Repeat,
  ArrowUpRight,
  TrendingUp,
  DollarSign,
  HeartHandshake,
  AlertTriangle,
  Flame,
  Utensils,
  ShoppingBag
} from 'lucide-react'

export interface ClienteVip {
  telefono: string
  nombre: string
  pedidos: number
  gastoTotal: number
  ticketPromedio: number
  ultimoPedido: string
  diasDesdeUltimo: number
  segmento?: 'nuevo' | 'ocasional' | 'habitual' | 'vip' | 'superVip'
}

export interface ClienteEnRiesgo {
  telefono: string
  nombre: string
  pedidosHistoricos: number
  gastoHistorico: number
  ultimoPedido: string
  diasInactivo: number
  cicloCompraDias?: number
  ratioAtraso?: number
  nivelRiesgo?: 'critico' | 'alto' | 'moderado'
  scoreRiesgo?: number
  mensajeWhatsapp: string
}

export interface EtapaEmbudo {
  id: string
  nombre: string
  descripcion: string
  cantidad: number
  porcentaje: number
  tasaConversionSiguiente?: number
}

export interface EmbudoData {
  etapas: EtapaEmbudo[]
  segmentacionNiveles: {
    nuevo: { cantidad: number; pct: number }
    ocasional: { cantidad: number; pct: number }
    habitual: { cantidad: number; pct: number }
    vip: { cantidad: number; pct: number }
    superVip: { cantidad: number; pct: number }
  }
}

export interface ProductoFidelidad {
  id: string
  nombre: string
  categoria: string
  imagenUrl?: string
  totalClientesCompraron: number
  clientesVolvieron: number
  tasaRecompraPct: number
}

export interface FidelidadData {
  totalClientesUnicos: number
  nuevos: {
    clientes: number
    pedidos: number
    facturacion: number
    pctFacturacion: number
    ticketPromedio?: number
  }
  recurrentes: {
    clientes: number
    pedidos: number
    facturacion: number
    pctFacturacion: number
    ticketPromedio?: number
    frecuenciaPromedioDias: number
  }
  metricasGlobales?: {
    ltvPromedio: number
    tasaSegundaCompraGlobalPct: number
  }
  embudo?: EmbudoData
  topVip: ClienteVip[]
  riesgoAbandono?: {
    totalClientesEnRiesgo: number
    valorEnRiesgoTotal: number
    clientesEnRiesgo: ClienteEnRiesgo[]
  }
  clientesDormidos: ClienteEnRiesgo[]
  fidelizacionPorProducto?: ProductoFidelidad[]
}

interface Props {
  fidelidad: FidelidadData
}

export default function RadiografiaFidelidad({ fidelidad }: Props) {
  const {
    totalClientesUnicos,
    nuevos,
    recurrentes,
    metricasGlobales,
    embudo,
    topVip,
    riesgoAbandono,
    clientesDormidos,
    fidelizacionPorProducto
  } = fidelidad

  const listaEnRiesgo = riesgoAbandono?.clientesEnRiesgo || clientesDormidos || []
  const totalRiesgo = riesgoAbandono?.totalClientesEnRiesgo ?? listaEnRiesgo.length
  const valorRiesgo = riesgoAbandono?.valorEnRiesgoTotal ?? listaEnRiesgo.reduce((a, b) => a + b.gastoHistorico, 0)

  return (
    <div className="bg-white dark:bg-[#252525] rounded-3xl border border-slate-100 dark:border-[#3d3d3d] p-5 sm:p-7 shadow-sm space-y-7">
      
      {/* ── 1. ENCABEZADO ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-[#383838] pb-5">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 rounded-2xl border border-violet-100 dark:border-violet-900/40">
            <HeartHandshake size={22} />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight">
              Clientes & Fidelización
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Quién vuelve, quién está por irse y dónde recuperar ventas.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto text-xs">
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-[#1e1e1e] px-3 py-1.5 rounded-2xl border border-slate-200/80 dark:border-[#383838]">
            <Repeat size={14} className="text-violet-500" />
            <span className="text-slate-500">Ciclo recompra:</span>
            <strong className="text-slate-900 dark:text-white font-black">
              Cada {recurrentes.frecuenciaPromedioDias} días
            </strong>
          </div>

          <div className="flex items-center gap-1.5 bg-violet-50/60 dark:bg-violet-950/30 px-3 py-1.5 rounded-2xl border border-violet-200/60 dark:border-violet-900/40">
            <TrendingUp size={14} className="text-violet-600 dark:text-violet-400" />
            <span className="text-violet-700 dark:text-violet-300 font-bold">
              {metricasGlobales?.tasaSegundaCompraGlobalPct || 0}% tasa recompra
            </span>
          </div>
        </div>
      </div>

      {/* ── 2. MÉTRICAS SUPERIORES COMPACTAS ──────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* Tarjeta 1: Recurrentes */}
        <div className="p-4 rounded-2xl bg-violet-50/50 dark:bg-violet-950/20 border border-violet-200/60 dark:border-violet-900/40 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-violet-900 dark:text-violet-300 uppercase tracking-wider flex items-center gap-1.5">
              <UserCheck size={14} />
              Recurrentes
            </span>
            <span className="text-xs font-black text-violet-700 dark:text-violet-300 bg-violet-200/50 dark:bg-violet-900/50 px-2 py-0.5 rounded-full">
              {recurrentes.pctFacturacion}% caja
            </span>
          </div>
          <div>
            <p className="text-xl font-black text-slate-900 dark:text-white">
              {formatearPrecio(recurrentes.facturacion)}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {recurrentes.clientes} clientes • {recurrentes.pedidos} pedidos
            </p>
          </div>
          <div className="pt-2 border-t border-violet-200/40 dark:border-violet-900/30 flex justify-between text-xs">
            <span className="text-slate-500">Ticket prom:</span>
            <span className="font-black text-slate-800 dark:text-slate-200">
              {formatearPrecio(recurrentes.ticketPromedio || 0)}
            </span>
          </div>
        </div>

        {/* Tarjeta 2: Nuevos / Primerizos */}
        <div className="p-4 rounded-2xl bg-sky-50/50 dark:bg-sky-950/20 border border-sky-200/60 dark:border-sky-900/40 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-sky-900 dark:text-sky-300 uppercase tracking-wider flex items-center gap-1.5">
              <UserPlus size={14} />
              Nuevos
            </span>
            <span className="text-xs font-black text-sky-700 dark:text-sky-300 bg-sky-200/50 dark:bg-sky-900/50 px-2 py-0.5 rounded-full">
              {nuevos.pctFacturacion}% caja
            </span>
          </div>
          <div>
            <p className="text-xl font-black text-slate-900 dark:text-white">
              {formatearPrecio(nuevos.facturacion)}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {nuevos.clientes} clientes • {nuevos.pedidos} pedidos
            </p>
          </div>
          <div className="pt-2 border-t border-sky-200/40 dark:border-sky-900/30 flex justify-between text-xs">
            <span className="text-slate-500">Ticket prom:</span>
            <span className="font-black text-slate-800 dark:text-slate-200">
              {formatearPrecio(nuevos.ticketPromedio || 0)}
            </span>
          </div>
        </div>

        {/* Tarjeta 3: LTV (Valor Promedio Histórico por Cliente) */}
        <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-[#1f1f1f] border border-slate-200/70 dark:border-[#383838] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign size={14} />
              LTV Promedio
            </span>
            <span className="text-[10px] font-extrabold text-slate-500 bg-slate-200/60 dark:bg-slate-800 px-1.5 py-0.5 rounded">
              Histórico
            </span>
          </div>
          <div>
            <p className="text-xl font-black text-slate-900 dark:text-white">
              {formatearPrecio(metricasGlobales?.ltvPromedio || 0)}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Gasto total acumulado por cliente
            </p>
          </div>
          <div className="pt-2 border-t border-slate-200/50 dark:border-[#333] flex justify-between text-xs">
            <span className="text-slate-500">Base activa:</span>
            <span className="font-bold text-slate-700 dark:text-slate-300">
              {totalClientesUnicos} clientes
            </span>
          </div>
        </div>

        {/* Tarjeta 4: Tasa de 2da Compra */}
        <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
              <Repeat size={14} />
              Tasa 2da Compra
            </span>
            <span className="text-xs font-black text-emerald-700 dark:text-emerald-300 bg-emerald-200/50 dark:bg-emerald-900/50 px-2 py-0.5 rounded-full">
              Fidelización
            </span>
          </div>
          <div>
            <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">
              {metricasGlobales?.tasaSegundaCompraGlobalPct || 0}%
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Clientes que pasaron de 1ra a 2da compra
            </p>
          </div>
          <div className="pt-2 border-t border-emerald-200/40 dark:border-emerald-900/30 flex justify-between text-xs">
            <span className="text-slate-500">Conversión:</span>
            <span className="font-bold text-emerald-700 dark:text-emerald-300">
              Alta tracción
            </span>
          </div>
        </div>

      </div>

      {/* ── 3. EMBUDO DE FIDELIZACIÓN (FUNNEL DEL CLIENTE) ────────────────────── */}
      {embudo && (
        <div className="p-5 rounded-2xl bg-slate-50/60 dark:bg-[#1d1d1d] border border-slate-200/80 dark:border-[#383838] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-violet-500/10 text-violet-600 dark:text-violet-400 rounded-xl">
                <TrendingUp size={16} />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Embudo de Recorrido & Conversión de Clientes
                </h3>
                <p className="text-[11px] text-slate-400">
                  Evolución real desde primerizos hasta clientes VIP en Chefsy
                </p>
              </div>
            </div>

            {/* Chips de Clasificación en 5 Niveles */}
            <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
              <span className="px-2 py-0.5 rounded-md bg-sky-100/70 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 font-bold border border-sky-200/60 dark:border-sky-800/40">
                Nuevo (1): {embudo.segmentacionNiveles.nuevo.cantidad}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-blue-100/70 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold border border-blue-200/60 dark:border-blue-800/40">
                Ocasional (2): {embudo.segmentacionNiveles.ocasional.cantidad}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-violet-100/70 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 font-bold border border-violet-200/60 dark:border-violet-800/40">
                Habitual (3-5): {embudo.segmentacionNiveles.habitual.cantidad}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-amber-100/70 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold border border-amber-200/60 dark:border-amber-800/40">
                VIP (6-9): {embudo.segmentacionNiveles.vip.cantidad}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-100/70 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200/60 dark:border-emerald-800/40">
                Súper VIP (10+): {embudo.segmentacionNiveles.superVip.cantidad}
              </span>
            </div>
          </div>

          {/* Gráfico Visual del Embudo (5 Pasos) */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 pt-1">
            {embudo.etapas.map((etapa, idx) => (
              <div
                key={etapa.id}
                className={`p-3 rounded-xl border relative flex flex-col justify-between ${
                  idx === 0
                    ? 'bg-slate-100/80 dark:bg-[#282828] border-slate-300 dark:border-[#444]'
                    : idx === 1
                    ? 'bg-sky-50/70 dark:bg-sky-950/30 border-sky-200 dark:border-sky-900/50'
                    : idx === 2
                    ? 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/50'
                    : idx === 3
                    ? 'bg-violet-50/70 dark:bg-violet-950/30 border-violet-200 dark:border-violet-900/50'
                    : 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {idx + 1}. {etapa.nombre}
                    </span>
                    <span className="font-extrabold text-slate-500">
                      {etapa.porcentaje}%
                    </span>
                  </div>
                  <p className="text-xl font-black text-slate-900 dark:text-white mt-1.5">
                    {etapa.cantidad} <span className="text-xs font-semibold text-slate-400">clientes</span>
                  </p>
                  <p className="text-[10px] text-slate-400 leading-tight mt-1 line-clamp-2">
                    {etapa.descripcion}
                  </p>
                </div>

                {etapa.tasaConversionSiguiente !== undefined && (
                  <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-[#383838] flex items-center justify-between text-[10px]">
                    <span className="text-slate-500 font-medium">Conversión a sig:</span>
                    <span className="font-extrabold text-violet-600 dark:text-violet-400">
                      {etapa.tasaConversionSiguiente}%
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 4. CUADRÍCULA: TOP 5 VIPS & CLIENTES EN RIESGO (CON VALOR EN RIESGO) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* TABLA: TOP 5 CLIENTES VIP */}
        <div className="rounded-2xl border border-slate-100 dark:border-[#383838] p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-500/10 text-amber-500 rounded-xl">
                  <Crown size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">Top 5 Clientes VIP</h3>
                  <p className="text-[11px] text-slate-400">Mayor volumen y facturación acumulada</p>
                </div>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 rounded-full border border-amber-200 dark:border-amber-800/60">
                Pilar de ventas
              </span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-[#333]">
              {topVip.map((c, idx) => (
                <div key={c.telefono || idx} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-[#1e1e1e] flex items-center justify-center font-black text-slate-600 dark:text-slate-300 text-[11px]">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold text-slate-800 dark:text-slate-200">
                          {c.nombre}
                        </p>
                        {c.segmento === 'superVip' ? (
                          <span className="text-[9px] font-black px-1.5 py-0.2 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded">
                            SÚPER VIP
                          </span>
                        ) : (
                          <span className="text-[9px] font-black px-1.5 py-0.2 bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 rounded">
                            VIP
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {c.telefono} • {c.pedidos} pedidos en período
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                      {formatearPrecio(c.gastoTotal)}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Ticket: {formatearPrecio(c.ticketPromedio)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* LISTADO: CLIENTES EN RIESGO / DORMIDOS (CON VALOR EN RIESGO) */}
        <div className="rounded-2xl border border-rose-200/70 dark:border-rose-900/40 p-4 sm:p-5 flex flex-col justify-between bg-rose-50/20 dark:bg-rose-950/10">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-2 border-b border-rose-100 dark:border-rose-900/30">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-rose-500/10 text-rose-500 rounded-xl">
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">
                    Clientes en Riesgo de Abandono
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Retraso severo respecto a su ciclo habitual de compra
                  </p>
                </div>
              </div>

              {/* VALOR EN RIESGO TOTAL DESTACADO */}
              <div className="text-left sm:text-right">
                <span className="text-xs font-black text-rose-600 dark:text-rose-400">
                  {totalRiesgo} clientes en riesgo
                </span>
                <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  {formatearPrecio(valorRiesgo)} de valor histórico
                </p>
              </div>
            </div>

            <div className="divide-y divide-rose-100/70 dark:divide-[#333]">
              {listaEnRiesgo.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">
                  ¡Excelente! No se detectaron clientes habituales en riesgo de abandono.
                </p>
              ) : (
                listaEnRiesgo.slice(0, 6).map((c, idx) => (
                  <div key={c.telefono || idx} className="py-2.5 flex items-center justify-between text-xs gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-bold text-slate-800 dark:text-slate-200 truncate">
                          {c.nombre}
                        </p>
                        {c.nivelRiesgo === 'critico' ? (
                          <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                            Atraso Crítico
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                            En Riesgo
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {c.pedidosHistoricos} pedidos • <strong className="text-rose-600 dark:text-rose-400">{c.diasInactivo} días inactivo</strong>
                        {c.ratioAtraso ? ` (${c.ratioAtraso}x su ciclo)` : ''}
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <div className="text-right hidden sm:block">
                        <span className="font-bold text-slate-700 dark:text-slate-300 text-xs block">
                          {formatearPrecio(c.gastoHistorico)}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          acumulado
                        </span>
                      </div>

                      {/* Botón Reactivar WhatsApp */}
                      <a
                        href={c.mensajeWhatsapp}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[11px] transition-all shadow-sm"
                        title="Enviar WhatsApp personalizado de reactivación"
                      >
                        <MessageCircle size={13} />
                        <span>Reactivar</span>
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>

      {/* ── 5. ANÁLISIS DE FIDELIZACIÓN POR PRODUCTO ───────────────────────────── */}
      {fidelizacionPorProducto && fidelizacionPorProducto.length > 0 && (
        <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-[#383838]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
                <Flame size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">
                  Análisis de Fidelización por Producto
                </h3>
                <p className="text-[11px] text-slate-400">
                  Platos del menú que provocan mayor tasa de recompra posterior en los clientes
                </p>
              </div>
            </div>
            <span className="text-xs text-slate-400 font-medium">
              Ordenado por tasa de segunda compra real
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {fidelizacionPorProducto.slice(0, 8).map((prod, idx) => (
              <div
                key={prod.id || idx}
                className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-[#1f1f1f] border border-slate-200/70 dark:border-[#383838] flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-start gap-2.5">
                    {prod.imagenUrl ? (
                      <img
                        src={prod.imagenUrl}
                        alt={prod.nombre}
                        className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-[#333] shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-[#282828] flex items-center justify-center text-slate-400 shrink-0">
                        <Utensils size={20} />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                        {prod.categoria}
                      </span>
                      <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 line-clamp-2 mt-0.5 leading-snug">
                        {prod.nombre}
                      </h4>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">
                      {prod.totalClientesCompraron} clientes
                    </span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {prod.clientesVolvieron} volvieron
                    </span>
                  </div>

                  {/* Barra de Retención de Segunda Compra */}
                  <div className="w-full h-2 bg-slate-200 dark:bg-[#2e2e2e] rounded-full overflow-hidden mt-1.5 flex">
                    <div
                      style={{ width: `${Math.min(100, prod.tasaRecompraPct)}%` }}
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/50 dark:border-[#333] flex items-center justify-between text-xs">
                  <span className="text-slate-500 text-[11px]">Tasa 2da compra:</span>
                  <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                    {prod.tasaRecompraPct}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
