'use client'

import React, { useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList
} from 'recharts'
import { formatearPrecio } from '@/lib/utils'
import { Sparkles, Trophy, Calendar, TrendingUp, Info } from 'lucide-react'

interface CierreMinimo {
  fecha: string
  ingresos: number
  pedidos: number
  turno_tipo?: 'mediodia' | 'noche'
  [key: string]: any
}

interface GraficoRendimientoSemanalProps {
  datos: CierreMinimo[]
}

const DIAS_SEMANA = [
  { num: 1, id: 'Lunes', corto: 'Lun' },
  { num: 2, id: 'Martes', corto: 'Mar' },
  { num: 3, id: 'Miércoles', corto: 'Mié' },
  { num: 4, id: 'Jueves', corto: 'Jue' },
  { num: 5, id: 'Viernes', corto: 'Vie' },
  { num: 6, id: 'Sábado', corto: 'Sáb' },
  { num: 0, id: 'Domingo', corto: 'Dom' },
]

export default function GraficoRendimientoSemanal({ datos }: GraficoRendimientoSemanalProps) {
  const [metricaActiva, setMetricaActiva] = useState<'facturacion' | 'pedidos'>('facturacion')

  const { statsPorDia, diaDeOro, diaMenor, promedioGeneral } = useMemo(() => {
    if (!datos || datos.length === 0) {
      return { statsPorDia: [], diaDeOro: null, diaMenor: null, promedioGeneral: 0 }
    }

    // 1. Agrupar por fecha primero para sumar ambos turnos si existieron
    const fechasMap = new Map<string, { fecha: string; totalDia: number; pedidosDia: number; diaNum: number }>()

    datos.forEach(item => {
      if (!fechasMap.has(item.fecha)) {
        // En JavaScript, new Date('YYYY-MM-DDT00:00:00') evita desfases de zona horaria
        const d = new Date(item.fecha + 'T00:00:00')
        fechasMap.set(item.fecha, {
          fecha: item.fecha,
          totalDia: 0,
          pedidosDia: 0,
          diaNum: d.getDay() // 0 = Domingo, 1 = Lunes, ...
        })
      }
      const f = fechasMap.get(item.fecha)!
      f.totalDia += item.ingresos || 0
      f.pedidosDia += item.pedidos || 0
    })

    // 2. Agrupar por día de la semana (Lunes a Domingo)
    const acumuladores = new Map<number, {
      totalFacturacion: number
      totalPedidos: number
      ocurrencias: number
    }>()

    DIAS_SEMANA.forEach(d => {
      acumuladores.set(d.num, { totalFacturacion: 0, totalPedidos: 0, ocurrencias: 0 })
    })

    fechasMap.forEach(f => {
      if (acumuladores.has(f.diaNum)) {
        const ac = acumuladores.get(f.diaNum)!
        ac.totalFacturacion += f.totalDia
        ac.totalPedidos += f.pedidosDia
        ac.ocurrencias += 1
      }
    })

    // 3. Calcular promedios por día
    const resultado = DIAS_SEMANA.map(d => {
      const ac = acumuladores.get(d.num)!
      const promFacturacion = ac.ocurrencias > 0 ? Math.round(ac.totalFacturacion / ac.ocurrencias) : 0
      const promPedidos = ac.ocurrencias > 0 ? Number((ac.totalPedidos / ac.ocurrencias).toFixed(1)) : 0

      return {
        dia: d.id,
        diaCorto: d.corto,
        diaNum: d.num,
        promedioFacturacion: promFacturacion,
        promedioPedidos: promPedidos,
        totalFacturacion: ac.totalFacturacion,
        totalPedidos: ac.totalPedidos,
        jornadas: ac.ocurrencias
      }
    })

    // Días activos con registros
    const diasConDatos = resultado.filter(r => r.jornadas > 0)
    const sumaPromedios = diasConDatos.reduce((acc, r) => acc + r.promedioFacturacion, 0)
    const promGeneral = diasConDatos.length > 0 ? Math.round(sumaPromedios / diasConDatos.length) : 0

    // Identificar Día de Oro (máxima facturación promedio) y Día Menor
    let oro = diasConDatos.length > 0 ? diasConDatos[0] : null
    let menor = diasConDatos.length > 0 ? diasConDatos[0] : null

    diasConDatos.forEach(d => {
      if (!oro || d.promedioFacturacion > oro.promedioFacturacion) {
        oro = d
      }
      if (!menor || d.promedioFacturacion < menor.promedioFacturacion) {
        menor = d
      }
    })

    const porcentajeSobrePromedio = oro && promGeneral > 0
      ? Math.round(((oro.promedioFacturacion - promGeneral) / promGeneral) * 100)
      : 0

    return {
      statsPorDia: resultado,
      diaDeOro: oro ? { ...oro, porcentajeSobrePromedio } : null,
      diaMenor: menor,
      promedioGeneral: promGeneral
    }
  }, [datos])

  if (!diaDeOro) return null

  return (
    <div className="bg-white dark:bg-[#252525] p-5 sm:p-6 rounded-3xl border border-slate-100 dark:border-[#3d3d3d] shadow-sm space-y-5">
      
      {/* ── CABECERA Y TARJETA DESTACADA DEL DÍA DE ORO ──────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-[#333] pb-4">
        
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <Trophy size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
                  <Sparkles size={11} />
                  Día de Oro
                </span>
                <span className="text-xs text-slate-400 font-medium">Patrón Semanal</span>
              </div>
              <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight mt-0.5">
                Rendimiento de Ventas por Día de la Semana
              </h3>
            </div>
          </div>
        </div>

        {/* Toggle de Métrica */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#2f2f2f] p-1 rounded-xl text-xs self-start lg:self-auto border border-slate-200 dark:border-[#3d3d3d]">
          <button
            onClick={() => setMetricaActiva('facturacion')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              metricaActiva === 'facturacion'
                ? 'bg-white dark:bg-[#3d3d3d] text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            Facturación Promedio
          </button>
          <button
            onClick={() => setMetricaActiva('pedidos')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              metricaActiva === 'pedidos'
                ? 'bg-white dark:bg-[#3d3d3d] text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            Pedidos Promedio
          </button>
        </div>

      </div>

      {/* ── BANNER EXPLICATIVO DEL DÍA DE ORO ────────────────────────────────── */}
      {diaDeOro && (
        <div className="rounded-2xl p-4 bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-amber-500 shrink-0" />
            <div>
              <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                Tu mejor jornada es el <strong className="text-amber-500 font-black uppercase">{diaDeOro.dia}</strong>
              </p>
              <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                Factura en promedio <strong className="text-slate-700 dark:text-slate-200">{formatearPrecio(diaDeOro.promedioFacturacion)}</strong> ({diaDeOro.promedioPedidos} pedidos) por jornada.
                {diaDeOro.porcentajeSobrePromedio > 0 && (
                  <span className="text-emerald-600 dark:text-emerald-400 font-extrabold ml-1">
                    +{diaDeOro.porcentajeSobrePromedio}% que la media semanal.
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 text-[11px] text-slate-500 bg-white/50 dark:bg-black/20 px-3 py-2 rounded-xl border border-white/20">
            <Info size={14} className="text-amber-500 shrink-0" />
            <span>Reforzar cocineros y cadetes los {diaDeOro.dia}s.</span>
          </div>
        </div>
      )}

      {/* ── GRÁFICO DE BARRAS: LUNES A DOMINGO ───────────────────────────────── */}
      <div className="h-[270px] w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={statsPorDia} margin={{ top: 25, right: 15, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3d3d3d" opacity={0.15} />
            <XAxis 
              dataKey="diaCorto" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 11, fill: '#888', fontWeight: 600 }}
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 11, fill: '#888' }}
              tickFormatter={(val) => metricaActiva === 'facturacion' ? `$${(val / 1000).toFixed(0)}k` : `${val}`}
            />
            <Tooltip
              cursor={{ fill: 'rgba(255, 255, 255, 0.05)', radius: 8 }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0]?.payload
                  const esOro = item?.dia === diaDeOro?.dia
                  return (
                    <div className="bg-white dark:bg-[#1e1e1e] p-3.5 rounded-2xl border border-slate-200 dark:border-[#383838] shadow-xl text-xs space-y-2">
                      <div className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-1.5">
                        <span className="font-black text-slate-800 dark:text-slate-100 text-sm">
                          {item?.dia}
                        </span>
                        {esOro && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500 text-black">
                            DÍA DESTACADO
                          </span>
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-4 font-semibold text-slate-600 dark:text-slate-300">
                          <span>Facturación Promedio:</span>
                          <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                            {formatearPrecio(item?.promedioFacturacion)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4 font-semibold text-slate-600 dark:text-slate-300">
                          <span>Pedidos Promedio:</span>
                          <span className="font-extrabold text-blue-600 dark:text-blue-400">
                            {item?.promedioPedidos} pedidos
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4 text-[10px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                          <span>Jornadas analizadas:</span>
                          <span className="font-bold">{item?.jornadas} veces</span>
                        </div>
                      </div>
                    </div>
                  )
                }
                return null
              }}
            />
            <Bar 
              dataKey={metricaActiva === 'facturacion' ? 'promedioFacturacion' : 'promedioPedidos'} 
              radius={[8, 8, 3, 3]}
              maxBarSize={45}
            >
              {statsPorDia.map((entry) => {
                const esOro = entry.dia === diaDeOro?.dia
                return (
                  <Cell 
                    key={entry.dia} 
                    fill={esOro ? '#f59e0b' : metricaActiva === 'facturacion' ? '#10b981' : '#3b82f6'} 
                    opacity={esOro ? 1 : 0.65}
                  />
                )
              })}
              <LabelList 
                dataKey={metricaActiva === 'facturacion' ? 'promedioFacturacion' : 'promedioPedidos'} 
                position="top" 
                formatter={(val: any) => metricaActiva === 'facturacion' ? `$${(Number(val) / 1000).toFixed(0)}k` : `${val}`}
                fill="#888" 
                fontSize={10} 
                fontWeight={700} 
                offset={8} 
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

    </div>
  )
}
