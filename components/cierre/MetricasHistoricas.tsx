import React, { useEffect, useState, useMemo } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, LabelList, Cell
} from 'recharts'
import { formatearPrecio } from '@/lib/utils'
import {
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  CalendarDays,
  DollarSign,
  Receipt,
  Filter,
  Minus
} from 'lucide-react'

type TipoRango = '7d' | '30d' | 'este_mes' | 'mes_anterior' | 'todo'

interface CierreItem {
  id: string
  fecha: string
  fechaCortada: string
  ingresos: number
  pedidos: number
  caja_inicial: number
  efectivo_rendir: number
  total_envios_delivery: number
  facturacion_neta: number
  total_pedidos: number
  [key: string]: any
}

export default function MetricasHistoricas() {
  const [todosDatos, setTodosDatos] = useState<CierreItem[]>([])
  const [cargando, setCargando] = useState(true)
  const [rango, setRango] = useState<TipoRango>('30d')

  useEffect(() => {
    async function cargar() {
      try {
        const res = await fetch('/api/admin/cierres')
        const data = await res.json()
        if (Array.isArray(data)) {
          // Formatear las fechas para gráficos y tablas
          const formateados = data.map(item => {
            const date = new Date(item.fecha + 'T00:00:00')
            let diaStr = date.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })
            diaStr = diaStr.charAt(0).toUpperCase() + diaStr.slice(1).replace(/\./g, '')

            return {
              ...item,
              fechaCortada: diaStr,
              ingresos: Number(item.facturacion_neta || 0),
              pedidos: Number(item.total_pedidos || 0)
            }
          })
          setTodosDatos(formateados)
        }
      } catch (error) {
        console.error('Error cargando historial de cierres:', error)
      } finally {
        setCargando(false)
      }
    }
    cargar()
  }, [])

  // ── Filtrado por Rango Seleccionado y Cálculo de Período Previo ─────────────
  const { datosActuales, datosPrevios, etiquetaComparacion } = useMemo(() => {
    if (todosDatos.length === 0) {
      return { datosActuales: [], datosPrevios: [], etiquetaComparacion: '' }
    }

    const n = todosDatos.length

    if (rango === '7d') {
      const actuales = todosDatos.slice(Math.max(0, n - 7))
      const previos = todosDatos.slice(Math.max(0, n - 14), Math.max(0, n - 7))
      return {
        datosActuales: actuales,
        datosPrevios: previos,
        etiquetaComparacion: 'vs 7 días anteriores'
      }
    }

    if (rango === '30d') {
      const actuales = todosDatos.slice(Math.max(0, n - 30))
      const previos = todosDatos.slice(Math.max(0, n - 60), Math.max(0, n - 30))
      return {
        datosActuales: actuales,
        datosPrevios: previos,
        etiquetaComparacion: 'vs 30 días anteriores'
      }
    }

    const hoy = new Date()
    const anioActual = hoy.getFullYear()
    const mesActual = hoy.getMonth() // 0-11

    if (rango === 'este_mes') {
      const prefixMesActual = `${anioActual}-${String(mesActual + 1).padStart(2, '0')}`
      const mesPrevioNum = mesActual === 0 ? 12 : mesActual
      const anioPrevioNum = mesActual === 0 ? anioActual - 1 : anioActual
      const prefixMesPrevio = `${anioPrevioNum}-${String(mesPrevioNum).padStart(2, '0')}`

      const actuales = todosDatos.filter(d => d.fecha.startsWith(prefixMesActual))
      const previos = todosDatos.filter(d => d.fecha.startsWith(prefixMesPrevio))

      return {
        datosActuales: actuales,
        datosPrevios: previos,
        etiquetaComparacion: 'vs mes anterior'
      }
    }

    if (rango === 'mes_anterior') {
      const mesPrevioNum = mesActual === 0 ? 12 : mesActual
      const anioPrevioNum = mesActual === 0 ? anioActual - 1 : anioActual
      const prefixMesPrevio = `${anioPrevioNum}-${String(mesPrevioNum).padStart(2, '0')}`

      const mesPrevPrevioNum = mesPrevioNum === 1 ? 12 : mesPrevioNum - 1
      const anioPrevPrevioNum = mesPrevioNum === 1 ? anioPrevioNum - 1 : anioPrevioNum
      const prefixMesPrevPrevio = `${anioPrevPrevioNum}-${String(mesPrevPrevioNum).padStart(2, '0')}`

      const actuales = todosDatos.filter(d => d.fecha.startsWith(prefixMesPrevio))
      const previos = todosDatos.filter(d => d.fecha.startsWith(prefixMesPrevPrevio))

      return {
        datosActuales: actuales,
        datosPrevios: previos,
        etiquetaComparacion: 'vs mes previo'
      }
    }

    // Rango 'todo'
    return {
      datosActuales: todosDatos,
      datosPrevios: [],
      etiquetaComparacion: 'histórico completo'
    }
  }, [todosDatos, rango])

  // ── Cálculo de KPIs Actuales ───────────────────────────────────────────────
  const kpisActuales = useMemo(() => {
    const totalIngresos = datosActuales.reduce((acc, curr) => acc + curr.ingresos, 0)
    const totalPedidos = datosActuales.reduce((acc, curr) => acc + curr.pedidos, 0)
    const ticketPromedio = totalPedidos > 0 ? totalIngresos / totalPedidos : 0
    const promedioDiario = datosActuales.length > 0 ? totalIngresos / datosActuales.length : 0

    return { totalIngresos, totalPedidos, ticketPromedio, promedioDiario, dias: datosActuales.length }
  }, [datosActuales])

  const maxPedidos = useMemo(() => {
    if (datosActuales.length === 0) return 0
    return Math.max(...datosActuales.map((d) => d.pedidos), 0)
  }, [datosActuales])

  // ── Cálculo de KPIs Previos y Porcentajes de Crecimiento ──────────────────
  const comparativas = useMemo(() => {
    if (datosPrevios.length === 0) {
      return { ingresosPct: null, pedidosPct: null, ticketPct: null, promedioPct: null }
    }

    const prevIngresos = datosPrevios.reduce((acc, curr) => acc + curr.ingresos, 0)
    const prevPedidos = datosPrevios.reduce((acc, curr) => acc + curr.pedidos, 0)
    const prevTicket = prevPedidos > 0 ? prevIngresos / prevPedidos : 0
    const prevPromedio = datosPrevios.length > 0 ? prevIngresos / datosPrevios.length : 0

    const calcPct = (act: number, prev: number) => {
      if (prev === 0) return null
      return ((act - prev) / prev) * 100
    }

    return {
      ingresosPct: calcPct(kpisActuales.totalIngresos, prevIngresos),
      pedidosPct: calcPct(kpisActuales.totalPedidos, prevPedidos),
      ticketPct: calcPct(kpisActuales.ticketPromedio, prevTicket),
      promedioPct: calcPct(kpisActuales.promedioDiario, prevPromedio)
    }
  }, [datosPrevios, kpisActuales])

  // Helper para renderizar badge de porcentaje de crecimiento
  const renderTrendBadge = (pct: number | null) => {
    if (pct === null || rango === 'todo') return null

    const esPositivo = pct > 0
    const esNeutro = Math.abs(pct) < 0.1

    if (esNeutro) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
          <Minus size={12} />
          0.0%
        </span>
      )
    }

    return (
      <span
        className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
          esPositivo
            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60'
            : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800/60'
        }`}
      >
        {esPositivo ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
        {esPositivo ? '+' : ''}
        {pct.toFixed(1)}%
      </span>
    )
  }

  if (cargando) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (todosDatos.length === 0) {
    return (
      <div className="bg-white dark:bg-[#252525] p-10 rounded-2xl border border-slate-100 dark:border-[#3d3d3d] text-center shadow-sm">
        <p className="text-slate-500 dark:text-slate-400">Aún no hay cierres históricos guardados en la base de datos.</p>
        <p className="text-sm mt-2 text-slate-400">Finalizá un turno para generar tu primer registro inmutable.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
      
      {/* ── BARRA DE FILTROS RÁPIDOS SUPERIORES ───────────────────────────────── */}
      <div className="bg-white dark:bg-[#252525] p-3 sm:p-4 rounded-2xl border border-slate-100 dark:border-[#3d3d3d] shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-bold text-sm">
          <Filter size={18} className="text-emerald-500" />
          <span>Filtro de Rango Temporal:</span>
        </div>

        <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
          {[
            { id: '7d', label: 'Últimos 7 días' },
            { id: '30d', label: 'Últimos 30 días' },
            { id: 'este_mes', label: 'Este Mes' },
            { id: 'mes_anterior', label: 'Mes Anterior' },
            { id: 'todo', label: 'Todo el Histórico' },
          ].map(f => {
            const activo = rango === f.id
            return (
              <button
                key={f.id}
                onClick={() => setRango(f.id as TipoRango)}
                className={`px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-xl transition-all duration-150 ${
                  activo
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20 scale-[1.02]'
                    : 'bg-slate-100 dark:bg-[#2f2f2f] text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#3d3d3d]'
                }`}
              >
                {f.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── TARJETAS DE RESUMEN (KPIs CON TENDENCIAS) ───────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Generado */}
        <div className="bg-white dark:bg-[#252525] p-5 rounded-2xl border border-slate-100 dark:border-[#3d3d3d] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500">
                <DollarSign size={18} />
              </div>
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Generado</h3>
            </div>
            {renderTrendBadge(comparativas.ingresosPct)}
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-slate-100">{formatearPrecio(kpisActuales.totalIngresos)}</p>
            {etiquetaComparacion && (
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 font-medium">{etiquetaComparacion}</p>
            )}
          </div>
        </div>

        {/* Ticket Promedio */}
        <div className="bg-white dark:bg-[#252525] p-5 rounded-2xl border border-slate-100 dark:border-[#3d3d3d] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-500">
                <Receipt size={18} />
              </div>
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Ticket Promedio</h3>
            </div>
            {renderTrendBadge(comparativas.ticketPct)}
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-slate-100">{formatearPrecio(kpisActuales.ticketPromedio)}</p>
            {etiquetaComparacion && (
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 font-medium">{etiquetaComparacion}</p>
            )}
          </div>
        </div>

        {/* Total Pedidos */}
        <div className="bg-white dark:bg-[#252525] p-5 rounded-2xl border border-slate-100 dark:border-[#3d3d3d] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-500">
                <ShoppingBag size={18} />
              </div>
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Pedidos</h3>
            </div>
            {renderTrendBadge(comparativas.pedidosPct)}
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-slate-100">{kpisActuales.totalPedidos}</p>
            {etiquetaComparacion && (
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 font-medium">{etiquetaComparacion}</p>
            )}
          </div>
        </div>

        {/* Promedio Diario */}
        <div className="bg-white dark:bg-[#252525] p-5 rounded-2xl border border-slate-100 dark:border-[#3d3d3d] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-500">
                <CalendarDays size={18} />
              </div>
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Promedio Diario</h3>
            </div>
            {renderTrendBadge(comparativas.promedioPct)}
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-slate-100">{formatearPrecio(kpisActuales.promedioDiario)}</p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 font-medium">{kpisActuales.dias} turnos analizados</p>
          </div>
        </div>

      </div>

      {/* ── GRÁFICOS ANALÍTICOS (EN CUADRÍCULA DE 2 COLUMNAS) ────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── GRÁFICO 1: EVOLUCIÓN DE INGRESOS (AREA) ──────────────────────────── */}
        <div className="bg-white dark:bg-[#252525] p-5 sm:p-6 rounded-2xl border border-slate-100 dark:border-[#3d3d3d] shadow-sm flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-[#e6e6e6] flex items-center gap-2">
                📈 Crecimiento de Ingresos
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Facturación neta acumulada por turno</p>
            </div>
            <span className="self-start sm:self-auto text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
              {formatearPrecio(kpisActuales.totalIngresos)}
            </span>
          </div>

          <div className="h-[270px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={datosActuales} margin={{ top: 15, right: 15, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3d3d3d" opacity={0.15} />
                <XAxis 
                  dataKey="fechaCortada" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: '#888' }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: '#888' }}
                  tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white/95 dark:bg-[#1e1e1e]/95 backdrop-blur-md p-3 rounded-xl border border-slate-200 dark:border-[#383838] shadow-xl text-xs">
                          <p className="font-bold text-slate-700 dark:text-slate-200 mb-1">{label}</p>
                          <p className="text-emerald-600 dark:text-emerald-400 font-extrabold text-sm">
                            {formatearPrecio(Number(payload[0].value))}
                          </p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="ingresos" 
                  stroke="#10b981" 
                  strokeWidth={2.5}
                  fillOpacity={1} 
                  fill="url(#colorIngresos)" 
                  dot={{ r: 3, fill: '#10b981', strokeWidth: 1.5, stroke: '#fff' }}
                  activeDot={{ r: 5, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── GRÁFICO 2: VOLUMEN DE PEDIDOS (BARRAS) ────────────────────────────── */}
        <div className="bg-white dark:bg-[#252525] p-5 sm:p-6 rounded-2xl border border-slate-100 dark:border-[#3d3d3d] shadow-sm flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-[#e6e6e6] flex items-center gap-2">
                📊 Volumen de Pedidos por Turno
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Cantidad de comandas despachadas</p>
            </div>
            <span className="self-start sm:self-auto text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60">
              {kpisActuales.totalPedidos} pedidos
            </span>
          </div>

          <div className="h-[270px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={datosActuales} margin={{ top: 25, right: 15, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorBarPedidos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.95}/>
                    <stop offset="100%" stopColor="#2563eb" stopOpacity={0.65}/>
                  </linearGradient>
                  <linearGradient id="colorBarMax" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.8}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3d3d3d" opacity={0.15} />
                <XAxis 
                  dataKey="fechaCortada" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: '#888' }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#888' }}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(59, 130, 246, 0.05)', radius: 8 }}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white/95 dark:bg-[#1e1e1e]/95 backdrop-blur-md p-3 rounded-xl border border-slate-200 dark:border-[#383838] shadow-xl text-xs">
                          <p className="font-bold text-slate-700 dark:text-slate-200 mb-1">{label}</p>
                          <p className="text-blue-600 dark:text-blue-400 font-extrabold text-sm">
                            {payload[0].value} {Number(payload[0].value) === 1 ? 'pedido' : 'pedidos'}
                          </p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Bar 
                  dataKey="pedidos" 
                  radius={[8, 8, 4, 4]} 
                  maxBarSize={38}
                >
                  {datosActuales.map((entry, index) => {
                    const esPico = maxPedidos > 0 && entry.pedidos === maxPedidos
                    return (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={esPico ? 'url(#colorBarMax)' : 'url(#colorBarPedidos)'} 
                      />
                    )
                  })}
                  <LabelList 
                    dataKey="pedidos" 
                    position="top" 
                    fill="#64748b" 
                    fontSize={11} 
                    fontWeight={700} 
                    offset={8} 
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* ── TABLA DE HISTORIAL DE SNAPSHOTS INMUTABLES ────────────────────────── */}
      <div className="bg-white dark:bg-[#252525] rounded-2xl border border-slate-100 dark:border-[#3d3d3d] shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-[#3d3d3d] flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-800 dark:text-[#e6e6e6]">📜 Historial de Snapshots ({datosActuales.length} registros)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-[#2f2f2f] text-slate-600 dark:text-slate-300">
              <tr>
                <th className="px-4 py-3 font-semibold">Fecha</th>
                <th className="px-4 py-3 font-semibold">Turno</th>
                <th className="px-4 py-3 font-semibold">Pedidos</th>
                <th className="px-4 py-3 font-semibold">Facturación Neta</th>
                <th className="px-4 py-3 font-semibold">Caja Inicial</th>
                <th className="px-4 py-3 font-semibold">Efectivo Rendir</th>
                <th className="px-4 py-3 font-semibold">Delivery</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#3d3d3d]">
              {[...datosActuales].reverse().map((row) => {
                const esMediodia = row.turno_tipo
                  ? row.turno_tipo === 'mediodia'
                  : (() => {
                      const ts = row.creado_el || row.created_at
                      if (!ts) return false
                      const d = new Date(ts)
                      const hora = d.getHours()
                      return hora >= 10 && hora < 17
                    })()
                return (
                  <tr key={row.id || `${row.fecha}_${row.turno_tipo || (esMediodia ? 'mediodia' : 'noche')}`} className="hover:bg-slate-50 dark:hover:bg-[#2a2a2a] transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{row.fecha}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
                        esMediodia
                          ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                          : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                      }`}>
                        {esMediodia ? '☀️ Mediodía' : '🌙 Noche'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{row.pedidos}</td>
                    <td className="px-4 py-3 text-emerald-600 dark:text-emerald-500 font-semibold">{formatearPrecio(row.ingresos)}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{formatearPrecio(row.caja_inicial || 0)}</td>
                    <td className="px-4 py-3 text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50/50 dark:bg-emerald-900/10">
                      {formatearPrecio(row.efectivo_rendir || 0)}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{row.total_envios_delivery || 0} envíos</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
