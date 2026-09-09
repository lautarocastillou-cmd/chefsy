'use client'

import React, { useState, useMemo } from 'react'
import { formatearPrecio } from '@/lib/utils'
import {
  Star,
  Zap,
  Target,
  Archive,
  Search,
  ArrowUpDown,
  Filter,
  Info,
  ChevronRight,
  TrendingUp,
  Sparkles
} from 'lucide-react'

export interface PlatoBCG {
  id: string
  nombre: string
  categoria: string
  categoriaId: string
  unidades: number
  precioPromedio: number
  facturacionTotal: number
  porcentajeComandas: number
  cuadrante: 'estrella' | 'caballo' | 'rompecabezas' | 'lastre'
  diagnostico: string
  accionSugerida: string
}

interface Props {
  resumen: {
    totalPlatosAnalizados: number
    umbralVolumenMedio: number
    umbralPrecioMedio: number
    cantEstrellas: number
    cantCaballos: number
    cantRompecabezas: number
    cantLastres: number
  }
  platos: PlatoBCG[]
}

type CuadranteFiltro = 'todos' | 'estrella' | 'caballo' | 'rompecabezas' | 'lastre'

export default function MatrizIngenieriaMenu({ resumen, platos }: Props) {
  const [filtroCuadrante, setFiltroCuadrante] = useState<CuadranteFiltro>('todos')
  const [busqueda, setBusqueda] = useState('')
  const [orden, setOrden] = useState<'facturacion' | 'unidades' | 'precio'>('facturacion')

  // Totales por cuadrante
  const metricasCuadrantes = useMemo(() => {
    const r = {
      estrella: { count: 0, facturacion: 0, unidades: 0 },
      caballo: { count: 0, facturacion: 0, unidades: 0 },
      rompecabezas: { count: 0, facturacion: 0, unidades: 0 },
      lastre: { count: 0, facturacion: 0, unidades: 0 },
    }
    platos.forEach(p => {
      if (r[p.cuadrante]) {
        r[p.cuadrante].count++
        r[p.cuadrante].facturacion += p.facturacionTotal
        r[p.cuadrante].unidades += p.unidades
      }
    })
    return r
  }, [platos])

  // Filtrado y ordenamiento de platos
  const platosFiltrados = useMemo(() => {
    return platos
      .filter(p => {
        if (filtroCuadrante !== 'todos' && p.cuadrante !== filtroCuadrante) return false
        if (busqueda.trim()) {
          const q = busqueda.toLowerCase()
          return p.nombre.toLowerCase().includes(q) || p.categoria.toLowerCase().includes(q)
        }
        return true
      })
      .sort((a, b) => {
        if (orden === 'facturacion') return b.facturacionTotal - a.facturacionTotal
        if (orden === 'unidades') return b.unidades - a.unidades
        return b.precioPromedio - a.precioPromedio
      })
  }, [platos, filtroCuadrante, busqueda, orden])

  return (
    <div className="bg-white dark:bg-[#252525] rounded-3xl border border-slate-100 dark:border-[#3d3d3d] p-5 sm:p-7 shadow-sm space-y-6">
      
      {/* ── ENCABEZADO Y EXPLICACIÓN DE INGENIERÍA DE MENÚ ─────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-[#383838] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-2xl border border-indigo-100 dark:border-indigo-900/40">
              <Sparkles size={22} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight">
                Matriz de Ingeniería de Menú (BCG Gastronómica)
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-400 mt-0.5">
                Auditoría estratégica cruzando volumen de ventas vs aporte al ticket
              </p>
            </div>
          </div>
        </div>

        {/* Umbrales de Corte Calculados */}
        <div className="flex items-center gap-2 text-xs bg-slate-50 dark:bg-[#1e1e1e] p-2.5 rounded-2xl border border-slate-200/70 dark:border-[#383838]">
          <Info size={16} className="text-slate-400 shrink-0" />
          <div className="flex flex-wrap items-center gap-x-3 text-slate-600 dark:text-slate-300 font-medium">
            <span>Corte de volumen: <strong className="text-slate-900 dark:text-white font-bold">{resumen.umbralVolumenMedio} u.</strong></span>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <span>Corte de ticket: <strong className="text-slate-900 dark:text-white font-bold">{formatearPrecio(resumen.umbralPrecioMedio)}</strong></span>
          </div>
        </div>
      </div>

      {/* ── TARJETAS DE LOS 4 CUADRANTES ESTRATÉGICOS ─────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* 🌟 1. PLATOS ESTRELLA */}
        <button
          onClick={() => setFiltroCuadrante(filtroCuadrante === 'estrella' ? 'todos' : 'estrella')}
          className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
            filtroCuadrante === 'estrella'
              ? 'bg-amber-500/10 border-amber-500 shadow-md ring-2 ring-amber-500/20'
              : 'bg-slate-50/70 dark:bg-[#1f1f1f] border-slate-200/80 dark:border-[#383838] hover:border-amber-400/50'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-amber-500/20 text-amber-500">
                <Star size={16} className="fill-amber-500" />
              </div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Platos Estrella</span>
            </div>
            <span className="text-xs font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400">
              {metricasCuadrantes.estrella.count}
            </span>
          </div>
          <div>
            <p className="text-xl font-black text-slate-900 dark:text-white">
              {formatearPrecio(metricasCuadrantes.estrella.facturacion)}
            </p>
            <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
              Alta venta + Alto ticket. Máxima ganancia y preferencia del cliente.
            </p>
          </div>
        </button>

        {/* ⚡ 2. CABALLOS DE BATALLA */}
        <button
          onClick={() => setFiltroCuadrante(filtroCuadrante === 'caballo' ? 'todos' : 'caballo')}
          className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
            filtroCuadrante === 'caballo'
              ? 'bg-blue-500/10 border-blue-500 shadow-md ring-2 ring-blue-500/20'
              : 'bg-slate-50/70 dark:bg-[#1f1f1f] border-slate-200/80 dark:border-[#383838] hover:border-blue-400/50'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-blue-500/20 text-blue-500">
                <Zap size={16} />
              </div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Caballos de Batalla</span>
            </div>
            <span className="text-xs font-black px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400">
              {metricasCuadrantes.caballo.count}
            </span>
          </div>
          <div>
            <p className="text-xl font-black text-slate-900 dark:text-white">
              {formatearPrecio(metricasCuadrantes.caballo.facturacion)}
            </p>
            <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
              Alta venta + Menor ticket. Mucho volumen; ideal para combos con bebida.
            </p>
          </div>
        </button>

        {/* 🎯 3. ROMPECABEZAS / OPORTUNIDAD */}
        <button
          onClick={() => setFiltroCuadrante(filtroCuadrante === 'rompecabezas' ? 'todos' : 'rompecabezas')}
          className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
            filtroCuadrante === 'rompecabezas'
              ? 'bg-purple-500/10 border-purple-500 shadow-md ring-2 ring-purple-500/20'
              : 'bg-slate-50/70 dark:bg-[#1f1f1f] border-slate-200/80 dark:border-[#383838] hover:border-purple-400/50'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-purple-500/20 text-purple-500">
                <Target size={16} />
              </div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Rompecabezas</span>
            </div>
            <span className="text-xs font-black px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-600 dark:text-purple-400">
              {metricasCuadrantes.rompecabezas.count}
            </span>
          </div>
          <div>
            <p className="text-xl font-black text-slate-900 dark:text-white">
              {formatearPrecio(metricasCuadrantes.rompecabezas.facturacion)}
            </p>
            <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
              Baja venta + Alto ticket. Platos rentables que necesitan más visibilidad.
            </p>
          </div>
        </button>

        {/* 📦 4. PLATOS LASTRE / PERROS */}
        <button
          onClick={() => setFiltroCuadrante(filtroCuadrante === 'lastre' ? 'todos' : 'lastre')}
          className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
            filtroCuadrante === 'lastre'
              ? 'bg-rose-500/10 border-rose-500 shadow-md ring-2 ring-rose-500/20'
              : 'bg-slate-50/70 dark:bg-[#1f1f1f] border-slate-200/80 dark:border-[#383838] hover:border-rose-400/50'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-rose-500/20 text-rose-500">
                <Archive size={16} />
              </div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Lastre / A Revisar</span>
            </div>
            <span className="text-xs font-black px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-400">
              {metricasCuadrantes.lastre.count}
            </span>
          </div>
          <div>
            <p className="text-xl font-black text-slate-900 dark:text-white">
              {formatearPrecio(metricasCuadrantes.lastre.facturacion)}
            </p>
            <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
              Baja venta + Bajo ticket. Evaluar discontinuar para simplificar cocina.
            </p>
          </div>
        </button>

      </div>

      {/* ── BARRA DE BÚSQUEDA Y FILTRADO ──────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar plato o categoría..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-[#1f1f1f] rounded-xl border border-slate-200 dark:border-[#383838] text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 font-medium">Ordenar por:</span>
          <div className="flex bg-slate-100 dark:bg-[#1e1e1e] p-1 rounded-xl border border-slate-200 dark:border-[#383838]">
            <button
              onClick={() => setOrden('facturacion')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                orden === 'facturacion'
                  ? 'bg-white dark:bg-[#2d2d2d] text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Facturación
            </button>
            <button
              onClick={() => setOrden('unidades')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                orden === 'unidades'
                  ? 'bg-white dark:bg-[#2d2d2d] text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Unidades
            </button>
            <button
              onClick={() => setOrden('precio')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                orden === 'precio'
                  ? 'bg-white dark:bg-[#2d2d2d] text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Precio
            </button>
          </div>
        </div>
      </div>

      {/* ── TABLA AUDITORÍA DE PRODUCTOS ──────────────────────────────────────── */}
      <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-[#383838]">
        <table className="w-full text-left text-xs whitespace-nowrap">
          <thead className="bg-slate-50/80 dark:bg-[#1e1e1e] text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-[#383838]">
            <tr>
              <th className="px-4 py-3">Plato & Categoría</th>
              <th className="px-4 py-3">Clasificación BCG</th>
              <th className="px-4 py-3 text-right">Unidades</th>
              <th className="px-4 py-3 text-right">Presencia</th>
              <th className="px-4 py-3 text-right">Precio Promedio</th>
              <th className="px-4 py-3 text-right">Total Facturado</th>
              <th className="px-4 py-3">Estrategia Recomendada</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-[#333]">
            {platosFiltrados.slice(0, 25).map((p, idx) => {
              const esEstrella = p.cuadrante === 'estrella'
              const esCaballo = p.cuadrante === 'caballo'
              const esRompecabezas = p.cuadrante === 'rompecabezas'

              return (
                <tr key={p.id || idx} className="hover:bg-slate-50/60 dark:hover:bg-[#202020] transition-colors">
                  
                  {/* Plato y Categoría */}
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                        {p.nombre}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {p.categoria}
                      </span>
                    </div>
                  </td>

                  {/* Cuadrante BCG */}
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold border ${
                      esEstrella
                        ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60'
                        : esCaballo
                        ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/60'
                        : esRompecabezas
                        ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800/60'
                        : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800/60'
                    }`}>
                      {esEstrella && <Star size={12} className="fill-amber-500 text-amber-500" />}
                      {esCaballo && <Zap size={12} />}
                      {esRompecabezas && <Target size={12} />}
                      {!esEstrella && !esCaballo && !esRompecabezas && <Archive size={12} />}
                      {esEstrella ? 'Estrella' : esCaballo ? 'Caballo de Batalla' : esRompecabezas ? 'Rompecabezas' : 'Lastre'}
                    </span>
                  </td>

                  {/* Unidades */}
                  <td className="px-4 py-3 text-right font-bold text-slate-700 dark:text-slate-200 text-sm">
                    {p.unidades} u.
                  </td>

                  {/* Presencia en comandas */}
                  <td className="px-4 py-3 text-right">
                    <span className="font-semibold text-slate-600 dark:text-slate-300">
                      {p.porcentajeComandas}%
                    </span>
                  </td>

                  {/* Precio Unitario */}
                  <td className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-300">
                    {formatearPrecio(p.precioPromedio)}
                  </td>

                  {/* Facturación */}
                  <td className="px-4 py-3 text-right font-black text-emerald-600 dark:text-emerald-400 text-sm">
                    {formatearPrecio(p.facturacionTotal)}
                  </td>

                  {/* Estrategia / Recomendación Culinaria */}
                  <td className="px-4 py-3 max-w-xs truncate text-[11px] text-slate-500 dark:text-slate-400">
                    <span title={p.accionSugerida} className="block truncate">
                      {p.accionSugerida}
                    </span>
                  </td>

                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

    </div>
  )
}
