'use client'

import React from 'react'
import { formatearPrecio } from '@/lib/utils'
import {
  Bike,
  Store,
  UtensilsCrossed,
  DollarSign,
  TrendingUp,
  Percent,
  Receipt,
  Info
} from 'lucide-react'

export interface CanalModalidad {
  pedidos: number
  facturacion: number
  ventaNetaComida?: number
  ticketPromedio: number
  ticketComidaPromedio?: number
  participacionPct: number
  fleteTotal?: number
  incidenciaFletePct?: number
}

export interface ModalidadesData {
  resumen: {
    facturacionTotal: number
    ventaNetaCocinaTotal?: number
    pedidosTotal: number
    costoEnvioTotal: number
    fletesRecaudadosTotal?: number
    incidenciaFleteGlobal: number
  }
  canales: {
    delivery: CanalModalidad
    retiro: CanalModalidad
    consumo_local: CanalModalidad
  }
}

interface Props {
  modalidades: ModalidadesData
}

export default function RendimientoModalidades({ modalidades }: Props) {
  const { resumen, canales } = modalidades
  const { delivery, retiro, consumo_local } = canales

  return (
    <div className="bg-white dark:bg-[#252525] rounded-3xl border border-slate-100 dark:border-[#3d3d3d] p-5 sm:p-7 shadow-sm space-y-6">
      
      {/* ── ENCABEZADO ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-[#383838] pb-5">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 rounded-2xl border border-sky-100 dark:border-sky-900/40">
            <Bike size={22} />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight">
              Ventas por Canal: Delivery vs Mostrador vs Salón
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Plata neta de comida vs. lo recaudado en envíos para los cadetes
            </p>
          </div>
        </div>

        {/* Resumen Fletes Recaudados */}
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#1e1e1e] px-3.5 py-2 rounded-2xl border border-slate-200/80 dark:border-[#383838] text-xs self-start sm:self-auto">
          <Bike size={15} className="text-sky-500 shrink-0" />
          <div className="text-slate-600 dark:text-slate-300">
            <span>Fletes recaudados: </span>
            <strong className="text-sky-600 dark:text-sky-400 font-black">
              {formatearPrecio(delivery.fleteTotal || 0)}
            </strong>
            <span className="text-[10px] text-slate-400 ml-1">(abonados por clientes)</span>
          </div>
        </div>
      </div>

      {/* ── BARRA DE PARTICIPACIÓN ECONÓMICA POR CANAL ───────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
          <span className="flex items-center gap-1.5 text-sky-600 dark:text-sky-400">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
            Delivery ({delivery.participacionPct}%)
          </span>
          <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            Retiro ({retiro.participacionPct}%)
          </span>
          <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            Salón / Local ({consumo_local.participacionPct}%)
          </span>
        </div>

        <div className="w-full h-3.5 bg-slate-100 dark:bg-[#1f1f1f] rounded-full overflow-hidden flex border border-slate-200/70 dark:border-[#383838]">
          <div
            style={{ width: `${delivery.participacionPct}%` }}
            className="bg-sky-500 h-full transition-all duration-500"
            title={`Delivery: ${delivery.participacionPct}%`}
          />
          <div
            style={{ width: `${retiro.participacionPct}%` }}
            className="bg-emerald-500 h-full transition-all duration-500"
            title={`Retiro: ${retiro.participacionPct}%`}
          />
          <div
            style={{ width: `${consumo_local.participacionPct}%` }}
            className="bg-amber-500 h-full transition-all duration-500"
            title={`Salón: ${consumo_local.participacionPct}%`}
          />
        </div>
      </div>

      {/* ── TARJETAS DE CANALES (3 COLUMNAS) ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 pt-1">
        
        {/* 1. DELIVERY A DOMICILIO */}
        <div className="p-5 rounded-2xl bg-sky-50/40 dark:bg-sky-950/20 border border-sky-200/60 dark:border-sky-900/40 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-sky-500/20 text-sky-600 dark:text-sky-400 rounded-xl">
                <Bike size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Delivery a Domicilio</h3>
                <p className="text-[11px] text-slate-400">{delivery.pedidos} pedidos despachados</p>
              </div>
            </div>
            <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-700 dark:text-sky-300">
              {delivery.participacionPct}%
            </span>
          </div>

          <div className="space-y-2 pt-2 border-t border-sky-200/40 dark:border-sky-900/30 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-400 font-medium">Venta Neta de Cocina:</span>
              <span className="text-base font-black text-slate-900 dark:text-white">
                {formatearPrecio(delivery.ventaNetaComida ?? Math.max(0, delivery.facturacion - (delivery.fleteTotal || 0)))}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Ticket Prom. Cocina:</span>
              <span className="font-bold text-slate-700 dark:text-slate-200">
                {formatearPrecio(delivery.ticketComidaPromedio ?? (delivery.pedidos > 0 ? Math.round(Math.max(0, delivery.facturacion - (delivery.fleteTotal || 0)) / delivery.pedidos) : 0))}
              </span>
            </div>
            <div className="flex justify-between items-center text-sky-700 dark:text-sky-300 pt-1.5 border-t border-dashed border-sky-200/60 dark:border-sky-800/40">
              <span className="flex items-center gap-1">
                <span>Fletes Recaudados:</span>
                <span className="text-[10px] text-sky-600/70 dark:text-sky-400/70">(pagó cliente)</span>
              </span>
              <span className="font-bold">{formatearPrecio(delivery.fleteTotal || 0)}</span>
            </div>
            <div className="flex justify-between items-center pt-1.5 border-t border-sky-200/60 dark:border-sky-800/50">
              <span className="font-bold text-slate-700 dark:text-slate-200">Total Cobrado:</span>
              <span className="font-extrabold text-sky-600 dark:text-sky-400 text-sm">
                {formatearPrecio(delivery.facturacion)}
              </span>
            </div>
          </div>
        </div>

        {/* 2. RETIRO EN MOSTRADOR (TAKEAWAY) */}
        <div className="p-5 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl">
                <Store size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Retiro en Mostrador</h3>
                <p className="text-[11px] text-slate-400">{retiro.pedidos} pedidos retirados</p>
              </div>
            </div>
            <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
              {retiro.participacionPct}%
            </span>
          </div>

          <div className="space-y-2 pt-2 border-t border-emerald-200/40 dark:border-emerald-900/30 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-400 font-medium">Venta Neta de Cocina:</span>
              <span className="text-base font-black text-slate-900 dark:text-white">{formatearPrecio(retiro.facturacion)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Ticket Prom. Cocina:</span>
              <span className="font-bold text-slate-700 dark:text-slate-200">{formatearPrecio(retiro.ticketPromedio)}</span>
            </div>
            <div className="flex justify-between items-center text-emerald-700 dark:text-emerald-300 pt-1.5 border-t border-dashed border-emerald-200/60 dark:border-emerald-800/40">
              <span className="flex items-center gap-1">
                <span>Fletes Recaudados:</span>
                <span className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70">(sin costo)</span>
              </span>
              <span className="font-bold">$0</span>
            </div>
            <div className="flex justify-between items-center pt-1.5 border-t border-emerald-200/60 dark:border-emerald-800/50">
              <span className="font-bold text-slate-700 dark:text-slate-200">Total Cobrado:</span>
              <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                {formatearPrecio(retiro.facturacion)}
              </span>
            </div>
          </div>
        </div>

        {/* 3. CONSUMO LOCAL (SALÓN) */}
        <div className="p-5 rounded-2xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl">
                <UtensilsCrossed size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Consumo Local (Salón)</h3>
                <p className="text-[11px] text-slate-400">{consumo_local.pedidos} mesas / comandas</p>
              </div>
            </div>
            <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300">
              {consumo_local.participacionPct}%
            </span>
          </div>

          <div className="space-y-2 pt-2 border-t border-amber-200/40 dark:border-amber-900/30 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-400 font-medium">Venta Neta de Cocina:</span>
              <span className="text-base font-black text-slate-900 dark:text-white">{formatearPrecio(consumo_local.facturacion)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Ticket Prom. Cocina:</span>
              <span className="font-bold text-slate-700 dark:text-slate-200">{formatearPrecio(consumo_local.ticketPromedio)}</span>
            </div>
            <div className="flex justify-between items-center text-amber-700 dark:text-amber-300 pt-1.5 border-t border-dashed border-amber-200/60 dark:border-amber-800/40">
              <span className="flex items-center gap-1">
                <span>Fletes Recaudados:</span>
                <span className="text-[10px] text-amber-600/70 dark:text-amber-400/70">(consumo in-situ)</span>
              </span>
              <span className="font-bold">$0</span>
            </div>
            <div className="flex justify-between items-center pt-1.5 border-t border-amber-200/60 dark:border-amber-800/50">
              <span className="font-bold text-slate-700 dark:text-slate-200">Total Cobrado:</span>
              <span className="font-extrabold text-amber-600 dark:text-amber-400 text-sm">
                {formatearPrecio(consumo_local.facturacion)}
              </span>
            </div>
          </div>
        </div>

      </div>

    </div>
  )
}
