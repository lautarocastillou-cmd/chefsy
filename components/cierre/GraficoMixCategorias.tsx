'use client'

import React, { useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { formatearPrecio } from '@/lib/utils'
import { Layers, Sparkles, PieChart as PieIcon } from 'lucide-react'

export interface CategoriaMixItem {
  categoria: string
  unidades: number
  facturacion: number
  color: string
  porcentaje: number
  porcentajeUnidades: number
}

interface GraficoMixCategoriasProps {
  categorias: CategoriaMixItem[]
  totalFacturacion: number
  totalUnidades: number
}

export default function GraficoMixCategorias({
  categorias,
  totalFacturacion,
  totalUnidades
}: GraficoMixCategoriasProps) {
  const [categoriaHover, setCategoriaHover] = useState<string | null>(null)

  if (!categorias || categorias.length === 0) {
    return null
  }

  const categoriaLider = categorias.length > 0 ? categorias[0] : null

  return (
    <div className="bg-white dark:bg-[#252525] p-5 sm:p-6 rounded-3xl border border-slate-100 dark:border-[#3d3d3d] shadow-sm space-y-5">
      
      {/* ── CABECERA DE LA SECCIÓN ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#333] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500">
            <PieIcon size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/30 flex items-center gap-1">
                <Sparkles size={11} />
                Mix de Ventas
              </span>
              <span className="text-xs text-slate-400 font-medium">Salud del Menú</span>
            </div>
            <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight mt-0.5">
              Distribución por Categorías
            </h3>
          </div>
        </div>

        {categoriaLider && (
          <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hidden sm:inline-flex items-center gap-1.5">
            👑 Líder: {categoriaLider.categoria} ({categoriaLider.porcentaje}%)
          </span>
        )}
      </div>

      {/* ── CUERPO: DONUT CHART + LEYENDA DETALLADA ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        
        {/* Gráfico Donut Central con Total */}
        <div className="lg:col-span-5 relative flex items-center justify-center min-h-[260px]">
          <div className="w-full h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categorias}
                  dataKey="facturacion"
                  nameKey="categoria"
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={105}
                  paddingAngle={3}
                >
                  {categorias.map((entry) => (
                    <Cell
                      key={entry.categoria}
                      fill={entry.color}
                      stroke="#1e1e1e"
                      strokeWidth={categoriaHover === entry.categoria ? 3 : 1}
                      className="transition-all duration-200 cursor-pointer"
                      opacity={categoriaHover === null || categoriaHover === entry.categoria ? 1 : 0.4}
                      onMouseEnter={() => setCategoriaHover(entry.categoria)}
                      onMouseLeave={() => setCategoriaHover(null)}
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0]?.payload as CategoriaMixItem
                      return (
                        <div className="bg-white dark:bg-[#1e1e1e] p-3 rounded-2xl border border-slate-200 dark:border-[#383838] shadow-xl text-xs space-y-1.5">
                          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-1">
                            <span 
                              className="w-2.5 h-2.5 rounded-full" 
                              style={{ backgroundColor: item.color }} 
                            />
                            <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                              {item.categoria}
                            </span>
                          </div>
                          <p className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                            {formatearPrecio(item.facturacion)}
                          </p>
                          <div className="flex items-center justify-between gap-4 text-slate-500 dark:text-slate-400 text-[11px]">
                            <span>Participación:</span>
                            <span className="font-bold text-slate-700 dark:text-slate-200">{item.porcentaje}%</span>
                          </div>
                          <div className="flex items-center justify-between gap-4 text-slate-500 dark:text-slate-400 text-[11px]">
                            <span>Unidades:</span>
                            <span className="font-bold text-slate-700 dark:text-slate-200">{item.unidades} u.</span>
                          </div>
                        </div>
                      )
                    }
                    return null
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Círculo central con total */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Total Categorías
            </span>
            <p className="text-xl font-black text-slate-800 dark:text-slate-100 leading-tight mt-0.5">
              {formatearPrecio(totalFacturacion)}
            </p>
            <span className="text-[10px] text-slate-500 font-semibold">
              {totalUnidades} platos despachados
            </span>
          </div>
        </div>

        {/* Lista de Categorías con Barras de Porcentaje */}
        <div className="lg:col-span-7 space-y-2.5">
          {categorias.map((cat, i) => {
            const estaActivo = categoriaHover === cat.categoria
            const esTop1 = i === 0

            return (
              <div
                key={cat.categoria}
                onMouseEnter={() => setCategoriaHover(cat.categoria)}
                onMouseLeave={() => setCategoriaHover(null)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                  estaActivo
                    ? 'bg-slate-100 dark:bg-[#333] border-slate-300 dark:border-slate-600 scale-[1.01]'
                    : 'bg-slate-50 dark:bg-[#2a2a2a] border-slate-100 dark:border-[#383838] hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between gap-3 text-xs mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span 
                      className="w-3 h-3 rounded-full shrink-0 shadow-sm" 
                      style={{ backgroundColor: cat.color }} 
                    />
                    <span className="font-bold text-slate-800 dark:text-slate-100 truncate">
                      {cat.categoria}
                    </span>
                    {esTop1 && (
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-500 border border-amber-500/30">
                        TOP 1
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">
                      {cat.unidades} u.
                    </span>
                    <span className="font-extrabold text-slate-800 dark:text-slate-200">
                      {formatearPrecio(cat.facturacion)}
                    </span>
                    <span className="font-black text-emerald-600 dark:text-emerald-400 w-12 text-right">
                      {cat.porcentaje}%
                    </span>
                  </div>
                </div>

                {/* Barra de Progreso */}
                <div className="w-full h-1.5 bg-slate-200 dark:bg-black/40 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${cat.porcentaje}%`,
                      backgroundColor: cat.color
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>

      </div>

    </div>
  )
}
