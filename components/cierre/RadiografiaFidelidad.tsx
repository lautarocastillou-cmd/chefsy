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
  ArrowUpRight
} from 'lucide-react'

export interface ClienteVip {
  telefono: string
  nombre: string
  pedidos: number
  gastoTotal: number
  ticketPromedio: number
  ultimoPedido: string
  diasDesdeUltimo: number
}

export interface ClienteDormido {
  telefono: string
  nombre: string
  pedidosHistoricos: number
  gastoHistorico: number
  ultimoPedido: string
  diasInactivo: number
  mensajeWhatsapp: string
}

export interface FidelidadData {
  totalClientesUnicos: number
  nuevos: {
    clientes: number
    pedidos: number
    facturacion: number
    pctFacturacion: number
  }
  recurrentes: {
    clientes: number
    pedidos: number
    facturacion: number
    pctFacturacion: number
    frecuenciaPromedioDias: number
  }
  topVip: ClienteVip[]
  clientesDormidos: ClienteDormido[]
}

interface Props {
  fidelidad: FidelidadData
}

export default function RadiografiaFidelidad({ fidelidad }: Props) {
  const { totalClientesUnicos, nuevos, recurrentes, topVip, clientesDormidos } = fidelidad

  return (
    <div className="bg-white dark:bg-[#252525] rounded-3xl border border-slate-100 dark:border-[#3d3d3d] p-5 sm:p-7 shadow-sm space-y-6">
      
      {/* ── ENCABEZADO ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-[#383838] pb-5">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 rounded-2xl border border-violet-100 dark:border-violet-900/40">
            <Users size={22} />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight">
              Radiografía de Fidelidad & Retención de Clientes
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Comportamiento de clientes habituales, captación de nuevos y reactivación
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#1e1e1e] px-3.5 py-1.5 rounded-2xl border border-slate-200/80 dark:border-[#383838] text-xs self-start sm:self-auto">
          <Repeat size={15} className="text-violet-500" />
          <span className="text-slate-500">Frecuencia de recompra:</span>
          <strong className="text-slate-900 dark:text-white font-black">
            Cada {recurrentes.frecuenciaPromedioDias} días
          </strong>
        </div>
      </div>

      {/* ── RATIO NUEVOS VS RECURRENTES (BARRA Y TARJETAS) ─────────────────────── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-200">
              <span className="w-2.5 h-2.5 rounded-full bg-violet-500"></span>
              Clientes Habituales ({recurrentes.clientes})
            </span>
            <span className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-200">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span>
              Primerizos / Nuevos ({nuevos.clientes})
            </span>
          </div>

          <span className="text-slate-400 font-medium">
            {totalClientesUnicos} clientes activos en el período analizado
          </span>
        </div>

        {/* Barra de Distribución Porcentual */}
        <div className="w-full h-4 bg-slate-100 dark:bg-[#1f1f1f] rounded-full overflow-hidden flex border border-slate-200/70 dark:border-[#383838]">
          <div
            style={{ width: `${recurrentes.pctFacturacion}%` }}
            className="bg-violet-600 h-full transition-all duration-500 relative group"
            title={`Habituales: ${recurrentes.pctFacturacion}% de las ventas`}
          />
          <div
            style={{ width: `${nuevos.pctFacturacion}%` }}
            className="bg-sky-400 h-full transition-all duration-500 relative group"
            title={`Nuevos: ${nuevos.pctFacturacion}% de las ventas`}
          />
        </div>

        {/* 2 Tarjetas Comparativas de Clientes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* Tarjeta Habituales */}
          <div className="p-4 rounded-2xl bg-violet-50/50 dark:bg-violet-950/20 border border-violet-200/60 dark:border-violet-900/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-violet-500/20 text-violet-600 dark:text-violet-400 rounded-xl">
                <UserCheck size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-violet-900 dark:text-violet-300 uppercase tracking-wide">
                  Clientes Recurrentes ({recurrentes.pctFacturacion}% de la caja)
                </p>
                <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                  {formatearPrecio(recurrentes.facturacion)}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {recurrentes.pedidos} pedidos generados
                </p>
              </div>
            </div>
          </div>

          {/* Tarjeta Nuevos */}
          <div className="p-4 rounded-2xl bg-sky-50/50 dark:bg-sky-950/20 border border-sky-200/60 dark:border-sky-900/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-sky-500/20 text-sky-600 dark:text-sky-400 rounded-xl">
                <UserPlus size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-sky-900 dark:text-sky-300 uppercase tracking-wide">
                  Clientes Nuevos ({nuevos.pctFacturacion}% de la caja)
                </p>
                <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                  {formatearPrecio(nuevos.facturacion)}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {nuevos.pedidos} pedidos de primera vez
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── CUADRÍCULA: TOP 5 VIPS & CLIENTES EN RIESGO (DORMIDOS) ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
        
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
                      <p className="font-bold text-slate-800 dark:text-slate-200">
                        {c.nombre}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {c.telefono} • {c.pedidos} pedidos
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                      {formatearPrecio(c.gastoTotal)}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Ticket prom: {formatearPrecio(c.ticketPromedio)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* LISTADO: CLIENTES EN RIESGO / DORMIDOS CON ACCIÓN WHATSAPP */}
        <div className="rounded-2xl border border-slate-100 dark:border-[#383838] p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-rose-500/10 text-rose-500 rounded-xl">
                  <AlertCircle size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">Clientes en Riesgo (Dormidos)</h3>
                  <p className="text-[11px] text-slate-400">&gt;25 días sin pedir con historial de compras</p>
                </div>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 rounded-full border border-rose-200 dark:border-rose-800/60">
                Oportunidad
              </span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-[#333]">
              {clientesDormidos.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">
                  No hay clientes habituales inactivos por más de 25 días.
                </p>
              ) : (
                clientesDormidos.slice(0, 5).map((c, idx) => (
                  <div key={c.telefono || idx} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-200">
                        {c.nombre}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {c.pedidosHistoricos} compras previas • <strong className="text-rose-500 font-bold">{c.diasInactivo} días inactivo</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-600 dark:text-slate-300 text-xs hidden sm:inline">
                        {formatearPrecio(c.gastoHistorico)}
                      </span>
                      <a
                        href={c.mensajeWhatsapp}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[11px] transition-all shadow-sm"
                        title="Enviar WhatsApp de reactivación"
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

    </div>
  )
}
