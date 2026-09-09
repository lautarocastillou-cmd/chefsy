'use client'

import React, { useState } from 'react'
import { formatearPrecio } from '@/lib/utils'
import {
  Flame,
  Clock,
  Calendar,
  Zap,
  Info,
  ChevronRight
} from 'lucide-react'

export interface CeldaHora {
  hora: number
  comandas: number
  facturacion: number
  intensidad: number // 0 a 100
}

export interface FilaDiaHeatmap {
  diaIndex: number
  diaNombre: string
  horas: CeldaHora[]
}

export interface PicoMaximo {
  diaNombre: string
  hora: number
  franja: string
  comandas: number
  facturacion: number
  consejoOperativo: string
}

interface Props {
  matriz: FilaDiaHeatmap[]
  picoMaximo: PicoMaximo
  horasOperativas?: number[]
}

export default function MapaCalorHorario({ matriz, picoMaximo, horasOperativas }: Props) {
  const [vistaCompleta, setVistaCompleta] = useState(false)
  const [celdaSeleccionada, setCeldaSeleccionada] = useState<{
    dia: string
    hora: number
    comandas: number
    facturacion: number
  } | null>(null)

  // Horas a mostrar: filtradas o 24hs
  const horasActivas = vistaCompleta
    ? Array.from({ length: 24 }, (_, i) => i)
    : (horasOperativas || [11, 12, 13, 14, 15, 19, 20, 21, 22, 23, 0, 1])

  // Función para determinar el color según la intensidad (0 a 100)
  const obtenerColorCelda = (intensidad: number, comandas: number) => {
    if (comandas === 0) {
      return 'bg-slate-100/60 dark:bg-[#1f1f1f] text-slate-300 dark:text-slate-600 border border-transparent'
    }
    if (intensidad < 25) {
      return 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
    }
    if (intensidad < 50) {
      return 'bg-emerald-500/45 text-emerald-800 dark:text-emerald-200 border border-emerald-500/50'
    }
    if (intensidad < 75) {
      return 'bg-emerald-500/75 text-white font-bold border border-emerald-400/60'
    }
    // Ráfaga máxima (> 75%)
    return 'bg-emerald-500 text-white font-black shadow-sm ring-1 ring-emerald-300 dark:ring-emerald-400'
  }

  return (
    <div className="bg-white dark:bg-[#252525] rounded-3xl border border-slate-100 dark:border-[#3d3d3d] p-5 sm:p-7 shadow-sm space-y-6">
      
      {/* ── ENCABEZADO ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-[#383838] pb-5">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-2xl border border-rose-100 dark:border-rose-900/40">
            <Flame size={22} />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight">
              Mapa de Calor Horario (Heatmap de Ráfagas)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Concentración comanda a comanda para optimizar dotación y tiempos de cocina
            </p>
          </div>
        </div>

        {/* Selector de Horas de Servicio vs 24 Horas */}
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-[#1e1e1e] p-1 rounded-xl border border-slate-200 dark:border-[#383838] text-xs self-start sm:self-auto">
          <button
            onClick={() => setVistaCompleta(false)}
            className={`px-3 py-1 rounded-lg font-bold transition-all ${
              !vistaCompleta
                ? 'bg-white dark:bg-[#2d2d2d] text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Horarios de Turnos
          </button>
          <button
            onClick={() => setVistaCompleta(true)}
            className={`px-3 py-1 rounded-lg font-bold transition-all ${
              vistaCompleta
                ? 'bg-white dark:bg-[#2d2d2d] text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            24 Horas
          </button>
        </div>
      </div>

      {/* ── BANNER DESTACADO: PICO MÁXIMO DE RÁFAGA ──────────────────────────── */}
      {picoMaximo.comandas > 0 && (
        <div className="bg-gradient-to-r from-emerald-950/30 via-slate-900/40 to-slate-900/20 dark:from-emerald-950/40 dark:to-[#1e1e1e] border border-emerald-500/30 p-4 sm:p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
              <Zap size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-400">Pico Máximo de Demanda</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                  {picoMaximo.diaNombre} {picoMaximo.franja}
                </span>
              </div>
              <p className="text-base sm:text-lg font-black text-white mt-0.5">
                {picoMaximo.comandas} comandas procesadas <span className="text-slate-400 font-normal text-sm">({formatearPrecio(picoMaximo.facturacion)})</span>
              </p>
              <p className="text-xs text-slate-300 mt-1 font-medium">
                {picoMaximo.consejoOperativo}
              </p>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-2 text-xs font-bold text-emerald-400/90 bg-emerald-950/50 px-3 py-2 rounded-xl border border-emerald-800/40 shrink-0">
            <span>Momento crítico para cadetería</span>
            <ChevronRight size={14} />
          </div>
        </div>
      )}

      {/* ── MATRIZ HEATMAP ───────────────────────────────────────────────────── */}
      <div className="overflow-x-auto pb-2">
        <div className="min-w-[620px]">
          
          {/* Fila de Encabezados de Hora */}
          <div className="grid grid-cols-[90px_repeat(auto-fit,minmax(36px,1fr))] gap-1.5 mb-2 text-center text-[11px] font-bold text-slate-400">
            <div className="text-left pl-2">Día / Hora</div>
            {horasActivas.map(h => (
              <div key={h} className="py-1">
                {String(h).padStart(2, '0')}h
              </div>
            ))}
          </div>

          {/* Filas de los Días */}
          <div className="space-y-1.5">
            {matriz.map((fila) => (
              <div
                key={fila.diaIndex}
                className="grid grid-cols-[90px_repeat(auto-fit,minmax(36px,1fr))] gap-1.5 items-center"
              >
                {/* Etiqueta del Día */}
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300 pl-2 truncate">
                  {fila.diaNombre}
                </div>

                {/* Celdas Horarias */}
                {horasActivas.map(h => {
                  const celda = fila.horas[h] || { hora: h, comandas: 0, facturacion: 0, intensidad: 0 }
                  const esPico = picoMaximo.diaNombre === fila.diaNombre && picoMaximo.hora === h && celda.comandas > 0

                  return (
                    <button
                      key={h}
                      onClick={() => setCeldaSeleccionada({
                        dia: fila.diaNombre,
                        hora: h,
                        comandas: celda.comandas,
                        facturacion: celda.facturacion
                      })}
                      title={`${fila.diaNombre} ${String(h).padStart(2, '0')}:00 hs — ${celda.comandas} comandas (${formatearPrecio(celda.facturacion)})`}
                      className={`h-9 sm:h-10 rounded-xl flex items-center justify-center text-xs transition-all duration-150 relative ${obtenerColorCelda(
                        celda.intensidad,
                        celda.comandas
                      )} hover:scale-105 hover:z-10`}
                    >
                      {celda.comandas > 0 ? celda.comandas : ''}
                      {esPico && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-white dark:ring-slate-900 animate-pulse" />
                      )}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* ── BARRA DE LEYENDA Y DETALLE EN TIEMPO REAL ─────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-[#383838] text-xs text-slate-500 dark:text-slate-400">
        
        {/* Leyenda de Intensidad */}
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-600 dark:text-slate-300">Intensidad:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-md bg-slate-100 dark:bg-[#1f1f1f] border border-slate-200/50"></span>
            <span className="text-[10px]">Sin comanda</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-md bg-emerald-500/25 border border-emerald-500/30"></span>
            <span className="text-[10px]">Baja</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-md bg-emerald-500/60 border border-emerald-500/60"></span>
            <span className="text-[10px]">Media</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-md bg-emerald-500 border border-emerald-400 text-white flex items-center justify-center text-[8px] font-bold">★</span>
            <span className="text-[10px]">Ráfaga pico</span>
          </div>
        </div>

        {/* Detalle de celda clickeada */}
        {celdaSeleccionada && (
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#1e1e1e] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-[#383838]">
            <span className="font-bold text-slate-800 dark:text-white">
              {celdaSeleccionada.dia} {String(celdaSeleccionada.hora).padStart(2, '0')}:00 hs:
            </span>
            <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">
              {celdaSeleccionada.comandas} pedidos ({formatearPrecio(celdaSeleccionada.facturacion)})
            </span>
          </div>
        )}

      </div>

    </div>
  )
}
