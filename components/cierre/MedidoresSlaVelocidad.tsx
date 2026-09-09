'use client'

import React from 'react'
import {
  Timer,
  Bike,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Zap,
  TrendingDown
} from 'lucide-react'

export interface SlaData {
  cocina: {
    promedioMinutos: number
    totalMuestras: number
    rapidoMenor18: { count: number; pct: number }
    optimo18a30: { count: number; pct: number }
    alertaMayor30: { count: number; pct: number }
    estadoGeneral: 'optimo' | 'normal' | 'critico'
  }
  cadete: {
    promedioMinutos: number
    totalMuestras: number
    expressMenor15: { count: number; pct: number }
    normal15a25: { count: number; pct: number }
    demoradoMayor25: { count: number; pct: number }
    estadoGeneral: 'optimo' | 'normal' | 'critico'
  }
  totalLeadTime: {
    promedioMinutos: number
    totalMuestras: number
    cumplimientoMenor40: { count: number; pct: number }
    excedidoMayor40: { count: number; pct: number }
  }
}

interface Props {
  sla: SlaData
}

/**
 * Medidor estilo tacómetro semicircular SVG con aguja y zonas de color
 */
function TacometroSemicircular({
  valor,
  maximo = 60,
  unidad = 'min',
  zonas,
  subtitulo
}: {
  valor: number
  maximo?: number
  unidad?: string
  zonas: { inicio: number; fin: number; color: string }[]
  subtitulo?: string
}) {
  // Angulo de -90deg a +90deg (180deg totales)
  const pct = Math.min(1, Math.max(0, valor / maximo))
  const angulo = -90 + pct * 180 // de -90 a +90

  // Coordenadas SVG
  const r = 70
  const cx = 100
  const cy = 85

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative w-48 h-28 flex items-center justify-center">
        <svg viewBox="0 0 200 110" className="w-full h-full overflow-visible">
          {/* Arco base gris */}
          <path
            d="M 30 85 A 70 70 0 0 1 170 85"
            fill="none"
            stroke="currentColor"
            strokeWidth="14"
            strokeLinecap="round"
            className="text-slate-100 dark:text-[#333]"
          />

          {/* Arcos de zonas */}
          {zonas.map((z, i) => {
            const startPct = z.inicio / maximo
            const endPct = Math.min(1, z.fin / maximo)
            const startAngle = (-180 + startPct * 180) * (Math.PI / 180)
            const endAngle = (-180 + endPct * 180) * (Math.PI / 180)

            const x1 = cx + r * Math.cos(startAngle)
            const y1 = cy + r * Math.sin(startAngle)
            const x2 = cx + r * Math.cos(endAngle)
            const y2 = cy + r * Math.sin(endAngle)

            return (
              <path
                key={i}
                d={`M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`}
                fill="none"
                stroke={z.color}
                strokeWidth="14"
                strokeLinecap="round"
                className="opacity-85"
              />
            )
          })}

          {/* Aguja indicadora */}
          <g
            transform={`rotate(${angulo} ${cx} ${cy})`}
            className="transition-transform duration-700 ease-out"
          >
            <line
              x1={cx}
              y1={cy}
              x2={cx}
              y2={cy - 60}
              stroke="currentColor"
              strokeWidth="3.5"
              strokeLinecap="round"
              className="text-slate-800 dark:text-white"
            />
            <circle cx={cx} cy={cy} r="6" className="fill-slate-900 dark:fill-white" />
          </g>
        </svg>

        {/* Cifra Digital Central */}
        <div className="absolute bottom-0 text-center">
          <span className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white tracking-tight">
            {valor > 0 ? valor : '--'}
          </span>
          <span className="text-xs font-bold text-slate-400 ml-1">{unidad}</span>
        </div>
      </div>

      {subtitulo && (
        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 text-center font-medium">
          {subtitulo}
        </p>
      )}
    </div>
  )
}

export default function MedidoresSlaVelocidad({ sla }: Props) {
  const { cocina, cadete, totalLeadTime } = sla

  return (
    <div className="bg-white dark:bg-[#252525] rounded-3xl border border-slate-100 dark:border-[#3d3d3d] p-5 sm:p-7 shadow-sm space-y-6">
      
      {/* ── ENCABEZADO ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-[#383838] pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-2xl border border-amber-100 dark:border-amber-900/40">
            <Timer size={22} />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight">
              Tacómetros Operativos & Tiempos de Entrega (SLA)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Cronometraje real en cocina, despacho y tiempo en tránsito
            </p>
          </div>
        </div>

        {/* Badge de Eficiencia Global */}
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#1e1e1e] px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-[#383838] text-xs self-start sm:self-auto">
          <span className="text-slate-500 font-medium">Cumplimiento Lead Time (&lt;40m):</span>
          <strong className={`font-black ${
            totalLeadTime.cumplimientoMenor40.pct >= 70
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-amber-600 dark:text-amber-400'
          }`}>
            {totalLeadTime.cumplimientoMenor40.pct}%
          </strong>
        </div>
      </div>

      {/* ── TARJETAS CON TACÓMETROS (3 COLUMNAS) ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* 1. TACÓMETRO COCINA: TIEMPO HASTA "LISTO" */}
        <div className="bg-slate-50/60 dark:bg-[#1e1e1e] p-5 rounded-2xl border border-slate-200/80 dark:border-[#383838] flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-orange-500/10 text-orange-500 rounded-xl">
                <Flame size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Cocina & Elaboración</h3>
                <p className="text-[11px] text-slate-400">Ingreso comanda ➔ &quot;Listo&quot;</p>
              </div>
            </div>

            <span className={`text-xs font-black px-2.5 py-0.5 rounded-full border ${
              cocina.estadoGeneral === 'optimo'
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60'
                : cocina.estadoGeneral === 'normal'
                ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-800/60'
                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200 dark:border-rose-800/60'
            }`}>
              {cocina.estadoGeneral === 'optimo' ? 'Excelente' : cocina.estadoGeneral === 'normal' ? 'Estable' : 'Alerta'}
            </span>
          </div>

          {/* Gráfico Tacómetro */}
          <TacometroSemicircular
            valor={cocina.promedioMinutos}
            maximo={50}
            zonas={[
              { inicio: 0, fin: 20, color: '#10b981' }, // Verde (< 20m)
              { inicio: 20, fin: 32, color: '#f59e0b' }, // Ámbar (20-32m)
              { inicio: 32, fin: 50, color: '#f43f5e' }, // Rojo (> 32m)
            ]}
            subtitulo={`${cocina.totalMuestras} comandas cronometradas`}
          />

          {/* Barras de Segmentación */}
          <div className="space-y-1.5 pt-2 border-t border-slate-200/60 dark:border-[#2d2d2d] text-xs">
            <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Rápido (&lt; 18 min)
              </span>
              <span className="font-bold">{cocina.rapidoMenor18.pct}% <span className="text-[10px] text-slate-400">({cocina.rapidoMenor18.count})</span></span>
            </div>
            <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                Óptimo (18 a 30 min)
              </span>
              <span className="font-bold">{cocina.optimo18a30.pct}% <span className="text-[10px] text-slate-400">({cocina.optimo18a30.count})</span></span>
            </div>
            <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                Demorado (&gt; 30 min)
              </span>
              <span className="font-bold text-rose-600 dark:text-rose-400">{cocina.alertaMayor30.pct}% <span className="text-[10px] text-slate-400">({cocina.alertaMayor30.count})</span></span>
            </div>
          </div>
        </div>

        {/* 2. TACÓMETRO CADETERÍA: TIEMPO EN CALLE */}
        <div className="bg-slate-50/60 dark:bg-[#1e1e1e] p-5 rounded-2xl border border-slate-200/80 dark:border-[#383838] flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-500/10 text-blue-500 rounded-xl">
                <Bike size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Cadetería en Calle</h3>
                <p className="text-[11px] text-slate-400">Despacho ➔ &quot;Entregado&quot;</p>
              </div>
            </div>

            <span className={`text-xs font-black px-2.5 py-0.5 rounded-full border ${
              cadete.estadoGeneral === 'optimo'
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60'
                : cadete.estadoGeneral === 'normal'
                ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-800/60'
                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200 dark:border-rose-800/60'
            }`}>
              {cadete.estadoGeneral === 'optimo' ? 'Veloz' : cadete.estadoGeneral === 'normal' ? 'Estable' : 'Lento'}
            </span>
          </div>

          {/* Gráfico Tacómetro */}
          <TacometroSemicircular
            valor={cadete.promedioMinutos}
            maximo={35}
            zonas={[
              { inicio: 0, fin: 15, color: '#10b981' }, // Verde (< 15m)
              { inicio: 15, fin: 25, color: '#f59e0b' }, // Ámbar (15-25m)
              { inicio: 25, fin: 35, color: '#f43f5e' }, // Rojo (> 25m)
            ]}
            subtitulo={`${cadete.totalMuestras} viajes en tránsito`}
          />

          {/* Barras de Segmentación */}
          <div className="space-y-1.5 pt-2 border-t border-slate-200/60 dark:border-[#2d2d2d] text-xs">
            <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Express (&lt; 15 min)
              </span>
              <span className="font-bold">{cadete.expressMenor15.pct}% <span className="text-[10px] text-slate-400">({cadete.expressMenor15.count})</span></span>
            </div>
            <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                Normal (15 a 25 min)
              </span>
              <span className="font-bold">{cadete.normal15a25.pct}% <span className="text-[10px] text-slate-400">({cadete.normal15a25.count})</span></span>
            </div>
            <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                Demorado (&gt; 25 min)
              </span>
              <span className="font-bold text-rose-600 dark:text-rose-400">{cadete.demoradoMayor25.pct}% <span className="text-[10px] text-slate-400">({cadete.demoradoMayor25.count})</span></span>
            </div>
          </div>
        </div>

        {/* 3. TACÓMETRO EXPERIENCIA CLIENTE: LEAD TIME TOTAL */}
        <div className="bg-slate-50/60 dark:bg-[#1e1e1e] p-5 rounded-2xl border border-slate-200/80 dark:border-[#383838] flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-500/10 text-indigo-500 rounded-xl">
                <Clock size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Lead Time al Cliente</h3>
                <p className="text-[11px] text-slate-400">Comanda ➔ En manos del cliente</p>
              </div>
            </div>

            <span className={`text-xs font-black px-2.5 py-0.5 rounded-full border ${
              totalLeadTime.promedioMinutos <= 40
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60'
                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-800/60'
            }`}>
              {totalLeadTime.promedioMinutos <= 40 ? 'En Objetivo' : 'A Mejorar'}
            </span>
          </div>

          {/* Gráfico Tacómetro */}
          <TacometroSemicircular
            valor={totalLeadTime.promedioMinutos}
            maximo={65}
            zonas={[
              { inicio: 0, fin: 35, color: '#10b981' }, // Verde (< 35m)
              { inicio: 35, fin: 45, color: '#f59e0b' }, // Ámbar (35-45m)
              { inicio: 45, fin: 65, color: '#f43f5e' }, // Rojo (> 45m)
            ]}
            subtitulo={`${totalLeadTime.totalMuestras} pedidos entregados`}
          />

          {/* Barras de Cumplimiento */}
          <div className="space-y-1.5 pt-2 border-t border-slate-200/60 dark:border-[#2d2d2d] text-xs">
            <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Dentro del límite (&lt; 40 min)
              </span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">{totalLeadTime.cumplimientoMenor40.pct}%</span>
            </div>
            <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                Excedido (&gt; 40 min)
              </span>
              <span className="font-bold text-rose-600 dark:text-rose-400">{totalLeadTime.excedidoMayor40.pct}%</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  )
}
