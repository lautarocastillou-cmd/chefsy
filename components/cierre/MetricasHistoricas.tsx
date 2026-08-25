'use client'

import React, { useEffect, useState, useMemo } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, LabelList, Cell, Legend
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
  Minus,
  Sun,
  Moon,
  Bike,
  Store,
  Sparkles,
  Percent,
  Layers,
  ArrowUpRight
} from 'lucide-react'

type TipoRango = '7d' | '30d' | 'este_mes' | 'mes_anterior' | 'todo'
type FiltroTurnoMetricas = 'todos' | 'mediodia' | 'noche'

interface CierreItem {
  id: string
  fecha: string
  fechaCortada: string
  fechaCortaNum: string
  fechaCompleta: string
  turno_tipo: 'mediodia' | 'noche'
  ingresos: number
  pedidos: number
  caja_inicial: number
  efectivo_ventas: number
  efectivo_rendir: number
  tarjeta_total: number
  transferencia_total: number
  total_envios_delivery: number
  costo_envios_cadetes: number
  total_retiros: number
  total_consumo_local: number
  ticket_promedio: number
  pedidos_cancelados: number
  monto_cancelados: number
  [key: string]: any
}

export default function MetricasHistoricas() {
  const [todosDatos, setTodosDatos] = useState<CierreItem[]>([])
  const [cargando, setCargando] = useState(true)
  const [rango, setRango] = useState<TipoRango>('30d')
  const [filtroTurno, setFiltroTurno] = useState<FiltroTurnoMetricas>('todos')

  useEffect(() => {
    async function cargar() {
      try {
        const res = await fetch('/api/admin/cierres')
        const data = await res.json()
        if (Array.isArray(data)) {
          const formateados: CierreItem[] = data.map(item => {
            const date = new Date(item.fecha + 'T00:00:00')
            let diaSemana = date.toLocaleDateString('es-AR', { weekday: 'short' }).replace(/\./g, '')
            diaSemana = diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1)

            const diaSemanaLargo = date.toLocaleDateString('es-AR', { weekday: 'long' })
            const diaSemanaLargoCap = diaSemanaLargo.charAt(0).toUpperCase() + diaSemanaLargo.slice(1)

            const diaNum = date.getDate()
            const mes = date.toLocaleDateString('es-AR', { month: 'short' }).replace(/\./g, '')
            const mesCap = mes.charAt(0).toUpperCase() + mes.slice(1)

            const fechaCompleta = date.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
            const fechaCompletaCap = fechaCompleta.charAt(0).toUpperCase() + fechaCompleta.slice(1)

            // Detección precisa de turno (prioriza campo turno_tipo de Supabase, fallback a timestamp)
            const esMediodia = item.turno_tipo
              ? item.turno_tipo === 'mediodia'
              : (() => {
                  const ts = item.creado_el || item.created_at
                  if (!ts) return false
                  const d = new Date(ts)
                  const hora = d.getHours()
                  return hora >= 10 && hora < 17
                })()

            return {
              ...item,
              id: item.id || `${item.fecha}_${esMediodia ? 'mediodia' : 'noche'}`,
              turno_tipo: esMediodia ? 'mediodia' : 'noche',
              fechaCompleta: fechaCompletaCap,
              fechaConDia: `${diaSemanaLargoCap}, ${diaNum} ${mesCap}`,
              fechaCortada: `${diaSemana}, ${diaNum} ${mes}`,
              fechaCortaNum: `${diaNum} ${mes}`,
              ingresos: Number(item.facturacion_neta || 0),
              pedidos: Number(item.total_pedidos || 0),
              caja_inicial: Number(item.caja_inicial || 0),
              efectivo_ventas: Number(item.efectivo_ventas || 0),
              efectivo_rendir: Number(item.efectivo_rendir || 0),
              tarjeta_total: Number(item.tarjeta_total || 0),
              transferencia_total: Number(item.transferencia_total || 0),
              total_envios_delivery: Number(item.total_envios_delivery || 0),
              costo_envios_cadetes: Number(item.costo_envios_cadetes || 0),
              total_retiros: Number(item.total_retiros || 0),
              total_consumo_local: Number(item.total_consumo_local || 0),
              ticket_promedio: Number(item.ticket_promedio || 0),
              pedidos_cancelados: Number(item.pedidos_cancelados || 0),
              monto_cancelados: Number(item.monto_cancelados || 0),
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

  // ── Filtrado por Rango Temporal ─────────────────────────────────────────────
  const { registrosRangoActual, registrosRangoPrevio, etiquetaComparacion } = useMemo(() => {
    if (todosDatos.length === 0) {
      return { registrosRangoActual: [], registrosRangoPrevio: [], etiquetaComparacion: '' }
    }

    const n = todosDatos.length

    if (rango === '7d') {
      const actuales = todosDatos.slice(Math.max(0, n - 14))
      const splitPoint = Math.max(0, actuales.length - 7)
      return {
        registrosRangoActual: actuales.slice(splitPoint),
        registrosRangoPrevio: actuales.slice(0, splitPoint),
        etiquetaComparacion: 'vs 7 días anteriores'
      }
    }

    if (rango === '30d') {
      const actuales = todosDatos.slice(Math.max(0, n - 60))
      const splitPoint = Math.max(0, actuales.length - 30)
      return {
        registrosRangoActual: actuales.slice(splitPoint),
        registrosRangoPrevio: actuales.slice(0, splitPoint),
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
        registrosRangoActual: actuales,
        registrosRangoPrevio: previos,
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
        registrosRangoActual: actuales,
        registrosRangoPrevio: previos,
        etiquetaComparacion: 'vs mes previo'
      }
    }

    // Rango 'todo'
    return {
      registrosRangoActual: todosDatos,
      registrosRangoPrevio: [],
      etiquetaComparacion: 'histórico completo'
    }
  }, [todosDatos, rango])

  // ── Aplicar Filtro de Turno a los Registros Filtrados ───────────────────────
  const datosActuales = useMemo(() => {
    if (filtroTurno === 'todos') return registrosRangoActual
    return registrosRangoActual.filter(d => d.turno_tipo === filtroTurno)
  }, [registrosRangoActual, filtroTurno])

  const datosPrevios = useMemo(() => {
    if (filtroTurno === 'todos') return registrosRangoPrevio
    return registrosRangoPrevio.filter(d => d.turno_tipo === filtroTurno)
  }, [registrosRangoPrevio, filtroTurno])

  // ── Estadísticas Específicas por Turno (Mediodía vs Noche) ──────────────────
  const statsTurnos = useMemo(() => {
    const mediodiaRegistros = registrosRangoActual.filter(d => d.turno_tipo === 'mediodia')
    const nocheRegistros = registrosRangoActual.filter(d => d.turno_tipo === 'noche')

    const calcularStats = (regs: CierreItem[]) => {
      const facturacion = regs.reduce((acc, r) => acc + r.ingresos, 0)
      const pedidos = regs.reduce((acc, r) => acc + r.pedidos, 0)
      const ticketPromedio = pedidos > 0 ? facturacion / pedidos : 0
      const efectivo = regs.reduce((acc, r) => acc + r.efectivo_ventas, 0)
      const digital = regs.reduce((acc, r) => acc + r.tarjeta_total + r.transferencia_total, 0)
      const delivery = regs.reduce((acc, r) => acc + r.total_envios_delivery, 0)
      const retiro = regs.reduce((acc, r) => acc + r.total_retiros, 0)
      const local = regs.reduce((acc, r) => acc + r.total_consumo_local, 0)
      const cantTurnos = regs.length
      const promedioPorTurno = cantTurnos > 0 ? facturacion / cantTurnos : 0

      return {
        facturacion,
        pedidos,
        ticketPromedio,
        efectivo,
        digital,
        delivery,
        retiro,
        local,
        cantTurnos,
        promedioPorTurno
      }
    }

    const mediodia = calcularStats(mediodiaRegistros)
    const noche = calcularStats(nocheRegistros)
    const facturacionTotalAmbos = mediodia.facturacion + noche.facturacion
    const pedidosTotalAmbos = mediodia.pedidos + noche.pedidos

    const pctFacturacionMediodia = facturacionTotalAmbos > 0 ? (mediodia.facturacion / facturacionTotalAmbos) * 100 : 0
    const pctFacturacionNoche = facturacionTotalAmbos > 0 ? (noche.facturacion / facturacionTotalAmbos) * 100 : 0

    return {
      mediodia,
      noche,
      facturacionTotalAmbos,
      pedidosTotalAmbos,
      pctFacturacionMediodia,
      pctFacturacionNoche
    }
  }, [registrosRangoActual])

  // ── Cálculo de KPIs Principales ─────────────────────────────────────────────
  const kpisActuales = useMemo(() => {
    const totalIngresos = datosActuales.reduce((acc, curr) => acc + curr.ingresos, 0)
    const totalPedidos = datosActuales.reduce((acc, curr) => acc + curr.pedidos, 0)
    const ticketPromedio = totalPedidos > 0 ? totalIngresos / totalPedidos : 0
    const promedioDiario = datosActuales.length > 0 ? totalIngresos / datosActuales.length : 0

    return { totalIngresos, totalPedidos, ticketPromedio, promedioDiario, turnos: datosActuales.length }
  }, [datosActuales])

  // ── Cálculo de Crecimiento vs Período Anterior ──────────────────────────────
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

  // ── Datos Preparados para Gráfico Comparativo Día por Día ───────────────────
  const datosGraficoComparativo = useMemo(() => {
    const mapaFechas = new Map<string, {
      fecha: string
      fechaCortada: string
      fechaCortaNum: string
      fechaCompleta: string
      ingresosMediodia: number
      ingresosNoche: number
      pedidosMediodia: number
      pedidosNoche: number
      totalDia: number
      pedidosTotalDia: number
    }>()

    registrosRangoActual.forEach(item => {
      if (!mapaFechas.has(item.fecha)) {
        mapaFechas.set(item.fecha, {
          fecha: item.fecha,
          fechaCortada: item.fechaCortada,
          fechaCortaNum: item.fechaCortaNum,
          fechaCompleta: item.fechaCompleta,
          ingresosMediodia: 0,
          ingresosNoche: 0,
          pedidosMediodia: 0,
          pedidosNoche: 0,
          totalDia: 0,
          pedidosTotalDia: 0,
        })
      }

      const dia = mapaFechas.get(item.fecha)!
      if (item.turno_tipo === 'mediodia') {
        dia.ingresosMediodia += item.ingresos
        dia.pedidosMediodia += item.pedidos
      } else {
        dia.ingresosNoche += item.ingresos
        dia.pedidosNoche += item.pedidos
      }
      dia.totalDia += item.ingresos
      dia.pedidosTotalDia += item.pedidos
    })

    return Array.from(mapaFechas.values())
  }, [registrosRangoActual])

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
      
      {/* ── BARRA DE CONTROLES: FILTROS DE RANGO Y FILTRO DE TURNO ────────────── */}
      <div className="bg-white dark:bg-[#252525] p-4 rounded-2xl border border-slate-100 dark:border-[#3d3d3d] shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        
        {/* Filtro Rápido de Rango */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 w-full lg:w-auto">
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-bold text-xs uppercase tracking-wider shrink-0">
            <Filter size={15} className="text-emerald-500" />
            <span>Período:</span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {[
              { id: '7d', label: '7 días' },
              { id: '30d', label: '30 días' },
              { id: 'este_mes', label: 'Este Mes' },
              { id: 'mes_anterior', label: 'Mes Anterior' },
              { id: 'todo', label: 'Todo' },
            ].map(f => {
              const activo = rango === f.id
              return (
                <button
                  key={f.id}
                  onClick={() => setRango(f.id as TipoRango)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all duration-150 ${
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

        {/* Filtro de Turno */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-[#2f2f2f] p-1 rounded-xl border border-slate-200 dark:border-[#3d3d3d] text-xs self-start lg:self-auto">
          <button
            onClick={() => setFiltroTurno('todos')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              filtroTurno === 'todos'
                ? 'bg-white dark:bg-[#3d3d3d] text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-800'
            }`}
          >
            ☀️/🌙 Ambos Turnos
          </button>
          <button
            onClick={() => setFiltroTurno('mediodia')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
              filtroTurno === 'mediodia'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-800'
            }`}
          >
            <Sun size={14} />
            <span>Mediodía ({statsTurnos.mediodia.cantTurnos})</span>
          </button>
          <button
            onClick={() => setFiltroTurno('noche')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
              filtroTurno === 'noche'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-800'
            }`}
          >
            <Moon size={14} />
            <span>Noche ({statsTurnos.noche.cantTurnos})</span>
          </button>
        </div>

      </div>

      {/* ── SECCIÓN CARA A CARA: MEDIODÍA VS NOCHE (COMPARATIVA EN VIVO) ──────── */}
      {filtroTurno === 'todos' && statsTurnos.facturacionTotalAmbos > 0 && (
        <div className="bg-gradient-to-br from-slate-900 via-[#181a20] to-[#12141a] text-white p-5 sm:p-6 rounded-3xl border border-slate-800 shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
                <Sparkles size={20} />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black tracking-tight">Comparativa Cara a Cara: Mediodía vs Noche</h2>
                <p className="text-xs text-slate-400">Distribución de ventas y comportamiento del cliente por turno</p>
              </div>
            </div>

            {/* Barra de Distribución Porcentual */}
            <div className="flex flex-col sm:items-end gap-1">
              <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Participación de Facturación</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-amber-400">{statsTurnos.pctFacturacionMediodia.toFixed(1)}% ☀️</span>
                <div className="w-32 sm:w-44 h-3 bg-slate-800 rounded-full overflow-hidden flex border border-white/10">
                  <div 
                    className="bg-amber-500 h-full transition-all duration-500" 
                    style={{ width: `${statsTurnos.pctFacturacionMediodia}%` }} 
                  />
                  <div 
                    className="bg-indigo-500 h-full transition-all duration-500" 
                    style={{ width: `${statsTurnos.pctFacturacionNoche}%` }} 
                  />
                </div>
                <span className="text-xs font-extrabold text-indigo-400">🌙 {statsTurnos.pctFacturacionNoche.toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {/* Tarjetas Comparativas de los 2 Turnos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* ☀️ Tarjeta Turno Mediodía */}
            <div className="bg-white/5 border border-amber-500/30 hover:border-amber-500/50 transition-all rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
                    <Sun size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-amber-300">Turno Mediodía</h3>
                    <p className="text-[11px] text-slate-400">{statsTurnos.mediodia.cantTurnos} turnos registrados (11:30 - 14:00)</p>
                  </div>
                </div>
                <span className="text-xs font-extrabold px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {statsTurnos.pctFacturacionMediodia.toFixed(0)}% del total
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Facturación Total</p>
                  <p className="text-lg font-black text-amber-400">{formatearPrecio(statsTurnos.mediodia.facturacion)}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Promedio: {formatearPrecio(statsTurnos.mediodia.promedioPorTurno)}/turno</p>
                </div>
                <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Ticket Promedio</p>
                  <p className="text-lg font-black text-white">{formatearPrecio(statsTurnos.mediodia.ticketPromedio)}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{statsTurnos.mediodia.pedidos} pedidos totales</p>
                </div>
              </div>

              {/* Canales y Métodos */}
              <div className="pt-2 border-t border-white/10 grid grid-cols-2 gap-2 text-xs text-slate-300">
                <div className="flex items-center justify-between bg-white/[0.03] px-2.5 py-1.5 rounded-lg">
                  <span className="flex items-center gap-1 text-slate-400"><Bike size={13} /> Delivery:</span>
                  <span className="font-bold">{statsTurnos.mediodia.delivery}</span>
                </div>
                <div className="flex items-center justify-between bg-white/[0.03] px-2.5 py-1.5 rounded-lg">
                  <span className="flex items-center gap-1 text-slate-400"><Store size={13} /> Retiro/Local:</span>
                  <span className="font-bold">{statsTurnos.mediodia.retiro + statsTurnos.mediodia.local}</span>
                </div>
              </div>
            </div>

            {/* 🌙 Tarjeta Turno Noche */}
            <div className="bg-white/5 border border-indigo-500/30 hover:border-indigo-500/50 transition-all rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl">
                    <Moon size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-indigo-300">Turno Noche</h3>
                    <p className="text-[11px] text-slate-400">{statsTurnos.noche.cantTurnos} turnos registrados (20:30 - 01:00)</p>
                  </div>
                </div>
                <span className="text-xs font-extrabold px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {statsTurnos.pctFacturacionNoche.toFixed(0)}% del total
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Facturación Total</p>
                  <p className="text-lg font-black text-indigo-400">{formatearPrecio(statsTurnos.noche.facturacion)}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Promedio: {formatearPrecio(statsTurnos.noche.promedioPorTurno)}/turno</p>
                </div>
                <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Ticket Promedio</p>
                  <p className="text-lg font-black text-white">{formatearPrecio(statsTurnos.noche.ticketPromedio)}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{statsTurnos.noche.pedidos} pedidos totales</p>
                </div>
              </div>

              {/* Canales y Métodos */}
              <div className="pt-2 border-t border-white/10 grid grid-cols-2 gap-2 text-xs text-slate-300">
                <div className="flex items-center justify-between bg-white/[0.03] px-2.5 py-1.5 rounded-lg">
                  <span className="flex items-center gap-1 text-slate-400"><Bike size={13} /> Delivery:</span>
                  <span className="font-bold">{statsTurnos.noche.delivery}</span>
                </div>
                <div className="flex items-center justify-between bg-white/[0.03] px-2.5 py-1.5 rounded-lg">
                  <span className="flex items-center gap-1 text-slate-400"><Store size={13} /> Retiro/Local:</span>
                  <span className="font-bold">{statsTurnos.noche.retiro + statsTurnos.noche.local}</span>
                </div>
              </div>
            </div>

          </div>

          {/* Insights Inteligentes */}
          <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <span className="text-amber-400 font-bold">💡 Conclusión:</span>
              <span>
                {statsTurnos.noche.facturacion >= statsTurnos.mediodia.facturacion
                  ? `El Turno Noche lidera las ventas con un ${statsTurnos.pctFacturacionNoche.toFixed(0)}% del volumen total.`
                  : `El Turno Mediodía aporta un fuerte ${statsTurnos.pctFacturacionMediodia.toFixed(0)}% de los ingresos.`}
              </span>
            </div>
            <div className="text-slate-400">
              Diferencia de ticket: <strong className="text-white">{formatearPrecio(Math.abs(statsTurnos.noche.ticketPromedio - statsTurnos.mediodia.ticketPromedio))}</strong> a favor {statsTurnos.noche.ticketPromedio >= statsTurnos.mediodia.ticketPromedio ? 'de la Noche' : 'del Mediodía'}
            </div>
          </div>

        </div>
      )}

      {/* ── TARJETAS DE RESUMEN (KPIs CON TENDENCIAS) ───────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Generado */}
        <div className="bg-white dark:bg-[#252525] p-5 rounded-2xl border border-slate-100 dark:border-[#3d3d3d] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500">
                <DollarSign size={18} />
              </div>
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {filtroTurno === 'todos' ? 'Total Generado' : filtroTurno === 'mediodia' ? 'Facturación Mediodía' : 'Facturación Noche'}
              </h3>
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
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Promedio por Turno</h3>
            </div>
            {renderTrendBadge(comparativas.promedioPct)}
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-slate-100">{formatearPrecio(kpisActuales.promedioDiario)}</p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 font-medium">{kpisActuales.turnos} turnos analizados</p>
          </div>
        </div>

      </div>

      {/* ── GRÁFICOS ANALÍTICOS (EN CUADRÍCULA DE 2 COLUMNAS) ────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── GRÁFICO 1: EVOLUCIÓN DE FACTURACIÓN (COMPARATIVO O ACUMULADO) ────── */}
        <div className="bg-white dark:bg-[#252525] p-5 sm:p-6 rounded-2xl border border-slate-100 dark:border-[#3d3d3d] shadow-sm flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-[#e6e6e6] flex items-center gap-2">
                📈 {filtroTurno === 'todos' ? 'Comparativa de Ingresos por Turno' : 'Evolución de Ingresos'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {filtroTurno === 'todos' ? '☀️ Mediodía (Ámbar) vs 🌙 Noche (Índigo)' : `Facturación neta en turno ${filtroTurno}`}
              </p>
            </div>

            {filtroTurno === 'todos' && (
              <div className="flex items-center gap-2 text-xs font-bold">
                <span className="flex items-center gap-1 text-amber-500">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Mediodía
                </span>
                <span className="flex items-center gap-1 text-indigo-500">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span> Noche
                </span>
              </div>
            )}
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {filtroTurno === 'todos' ? (
                /* Gráfico de barras apiladas o comparativas para ambos turnos */
                <BarChart data={datosGraficoComparativo} margin={{ top: 15, right: 15, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3d3d3d" opacity={0.15} />
                  <XAxis 
                    dataKey={rango === '7d' ? 'fechaCortada' : 'fechaCortaNum'} 
                    axisLine={false} 
                    tickLine={false} 
                    interval={0}
                    tick={{ fontSize: datosGraficoComparativo.length > 20 ? 9 : 11, fill: '#888' }} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 11, fill: '#888' }}
                    tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255, 255, 255, 0.05)', radius: 8 }}
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0]?.payload
                        return (
                          <div className="bg-white/95 dark:bg-[#1e1e1e]/95 backdrop-blur-md p-3.5 rounded-2xl border border-slate-200 dark:border-[#383838] shadow-xl text-xs space-y-2">
                            <p className="font-bold text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800 pb-1.5">
                              {item?.fechaCompleta || label}
                            </p>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between gap-4 text-amber-600 dark:text-amber-400 font-semibold">
                                <span>☀️ Mediodía:</span>
                                <span>{formatearPrecio(item?.ingresosMediodia || 0)}</span>
                              </div>
                              <div className="flex items-center justify-between gap-4 text-indigo-600 dark:text-indigo-400 font-semibold">
                                <span>🌙 Noche:</span>
                                <span>{formatearPrecio(item?.ingresosNoche || 0)}</span>
                              </div>
                            </div>
                            <div className="pt-1.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between font-black text-slate-900 dark:text-white">
                              <span>Total Día:</span>
                              <span className="text-emerald-600 dark:text-emerald-400">{formatearPrecio(item?.totalDia || 0)}</span>
                            </div>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Bar dataKey="ingresosMediodia" fill="#f59e0b" name="Mediodía" stackId="ingresos" radius={[0, 0, 4, 4]} />
                  <Bar dataKey="ingresosNoche" fill="#6366f1" name="Noche" stackId="ingresos" radius={[6, 6, 0, 0]} />
                </BarChart>
              ) : (
                /* Gráfico de Área para un solo turno */
                <AreaChart data={datosActuales} margin={{ top: 15, right: 15, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorIngresosFiltro" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={filtroTurno === 'mediodia' ? '#f59e0b' : '#6366f1'} stopOpacity={0.4}/>
                      <stop offset="95%" stopColor={filtroTurno === 'mediodia' ? '#f59e0b' : '#6366f1'} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3d3d3d" opacity={0.15} />
                  <XAxis 
                    dataKey={rango === '7d' ? 'fechaCortada' : 'fechaCortaNum'} 
                    axisLine={false} 
                    tickLine={false} 
                    interval={0}
                    tick={{ fontSize: datosActuales.length > 20 ? 9 : 11, fill: '#888' }} 
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
                        const item = payload[0]?.payload
                        return (
                          <div className="bg-white/95 dark:bg-[#1e1e1e]/95 backdrop-blur-md p-3 rounded-xl border border-slate-200 dark:border-[#383838] shadow-xl text-xs">
                            <p className="font-bold text-slate-700 dark:text-slate-200 mb-1">
                              {item?.fechaCompleta || label}
                            </p>
                            <p className={`font-extrabold text-sm ${filtroTurno === 'mediodia' ? 'text-amber-500' : 'text-indigo-400'}`}>
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
                    stroke={filtroTurno === 'mediodia' ? '#f59e0b' : '#6366f1'} 
                    strokeWidth={2.5}
                    fillOpacity={1} 
                    fill="url(#colorIngresosFiltro)" 
                    dot={{ r: 3, fill: filtroTurno === 'mediodia' ? '#f59e0b' : '#6366f1', strokeWidth: 1.5, stroke: '#fff' }}
                  />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── GRÁFICO 2: VOLUMEN DE PEDIDOS POR TURNO ──────────────────────────── */}
        <div className="bg-white dark:bg-[#252525] p-5 sm:p-6 rounded-2xl border border-slate-100 dark:border-[#3d3d3d] shadow-sm flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-[#e6e6e6] flex items-center gap-2">
                📊 Volumen de Comandas por Día
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {filtroTurno === 'todos' ? 'Pedidos repartidos entre Mediodía y Noche' : `Comandas despachadas en turno ${filtroTurno}`}
              </p>
            </div>
            <span className="self-start sm:self-auto text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60">
              {kpisActuales.totalPedidos} pedidos
            </span>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {filtroTurno === 'todos' ? (
                <BarChart data={datosGraficoComparativo} margin={{ top: 25, right: 15, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3d3d3d" opacity={0.15} />
                  <XAxis 
                    dataKey={rango === '7d' ? 'fechaCortada' : 'fechaCortaNum'} 
                    axisLine={false} 
                    tickLine={false} 
                    interval={0}
                    tick={{ fontSize: datosGraficoComparativo.length > 20 ? 9 : 11, fill: '#888' }} 
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
                        const item = payload[0]?.payload
                        return (
                          <div className="bg-white/95 dark:bg-[#1e1e1e]/95 backdrop-blur-md p-3.5 rounded-2xl border border-slate-200 dark:border-[#383838] shadow-xl text-xs space-y-2">
                            <p className="font-bold text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800 pb-1.5">
                              {item?.fechaCompleta || label}
                            </p>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between gap-4 text-amber-500 font-bold">
                                <span>☀️ Mediodía:</span>
                                <span>{item?.pedidosMediodia || 0} ped.</span>
                              </div>
                              <div className="flex items-center justify-between gap-4 text-indigo-400 font-bold">
                                <span>🌙 Noche:</span>
                                <span>{item?.pedidosNoche || 0} ped.</span>
                              </div>
                            </div>
                            <div className="pt-1.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between font-black text-slate-900 dark:text-white">
                              <span>Total Día:</span>
                              <span className="text-blue-500">{item?.pedidosTotalDia || 0} pedidos</span>
                            </div>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Bar dataKey="pedidosMediodia" fill="#f59e0b" name="Mediodía" stackId="pedidos" radius={[0, 0, 4, 4]} />
                  <Bar dataKey="pedidosNoche" fill="#6366f1" name="Noche" stackId="pedidos" radius={[6, 6, 0, 0]}>
                    <LabelList 
                      dataKey="pedidosTotalDia" 
                      position="top" 
                      fill="#64748b" 
                      fontSize={11} 
                      fontWeight={700} 
                      offset={8} 
                    />
                  </Bar>
                </BarChart>
              ) : (
                <BarChart data={datosActuales} margin={{ top: 25, right: 15, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3d3d3d" opacity={0.15} />
                  <XAxis 
                    dataKey={rango === '7d' ? 'fechaCortada' : 'fechaCortaNum'} 
                    axisLine={false} 
                    tickLine={false} 
                    interval={0}
                    tick={{ fontSize: datosActuales.length > 20 ? 9 : 11, fill: '#888' }} 
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
                        const item = payload[0]?.payload
                        return (
                          <div className="bg-white/95 dark:bg-[#1e1e1e]/95 backdrop-blur-md p-3 rounded-xl border border-slate-200 dark:border-[#383838] shadow-xl text-xs">
                            <p className="font-bold text-slate-700 dark:text-slate-200 mb-1">
                              {item?.fechaCompleta || label}
                            </p>
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
                    fill={filtroTurno === 'mediodia' ? '#f59e0b' : '#6366f1'} 
                    radius={[8, 8, 4, 4]} 
                    maxBarSize={38}
                  >
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
              )}
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* ── TABLA DE HISTORIAL DE SNAPSHOTS INMUTABLES ────────────────────────── */}
      <div className="bg-white dark:bg-[#252525] rounded-2xl border border-slate-100 dark:border-[#3d3d3d] shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-[#3d3d3d] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-[#e6e6e6]">
              📜 Historial de Snapshots ({datosActuales.length} registros)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {filtroTurno === 'todos' ? 'Listado de todos los cierres de Mediodía y Noche' : `Cierres correspondientes a turno ${filtroTurno}`}
            </p>
          </div>

          <span className="text-xs font-semibold px-3 py-1 bg-slate-100 dark:bg-[#333] text-slate-600 dark:text-slate-300 rounded-lg self-start sm:self-auto">
            {rango === 'todo' ? 'Todo el histórico' : `Filtrado por: ${rango}`}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-[#2f2f2f] text-slate-600 dark:text-slate-300">
              <tr>
                <th className="px-4 py-3 font-semibold">Fecha</th>
                <th className="px-4 py-3 font-semibold">Turno</th>
                <th className="px-4 py-3 font-semibold">Pedidos</th>
                <th className="px-4 py-3 font-semibold">Facturación Neta</th>
                <th className="px-4 py-3 font-semibold">Ticket Promedio</th>
                <th className="px-4 py-3 font-semibold">Caja Inicial</th>
                <th className="px-4 py-3 font-semibold">Físico a Rendir</th>
                <th className="px-4 py-3 font-semibold">Modalidades</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#3d3d3d]">
              {[...datosActuales].reverse().map((row) => {
                const esMediodia = row.turno_tipo === 'mediodia'
                return (
                  <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-[#2a2a2a] transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800 dark:text-slate-100">
                          {row.fechaConDia || row.fechaCortada}
                        </span>
                        <span className="text-[11px] text-slate-400 font-normal">
                          {row.fecha}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
                        esMediodia
                          ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                          : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                      }`}>
                        {esMediodia ? '☀️ Mediodía' : '🌙 Noche'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300 font-semibold">{row.pedidos}</td>
                    <td className="px-4 py-3 text-emerald-600 dark:text-emerald-500 font-bold">{formatearPrecio(row.ingresos)}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 font-medium">
                      {formatearPrecio(row.ticket_promedio || (row.pedidos > 0 ? row.ingresos / row.pedidos : 0))}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{formatearPrecio(row.caja_inicial || 0)}</td>
                    <td className="px-4 py-3 text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50/50 dark:bg-emerald-900/10">
                      {formatearPrecio(row.efectivo_rendir || 0)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                      <span className="inline-flex items-center gap-2">
                        <span>🛵 {row.total_envios_delivery || 0}</span>
                        <span>🏪 {row.total_retiros || 0}</span>
                        <span>🍽️ {row.total_consumo_local || 0}</span>
                      </span>
                    </td>
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

