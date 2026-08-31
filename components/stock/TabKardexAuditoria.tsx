'use client'

import { useState, useEffect, useMemo } from 'react'
import { Insumo, MovimientoStock, TipoMovimientoStock } from '@/tipos/stock'
import { obtenerMovimientosStockGenerales } from '@/servicios/supabase/stock'
import {
  History,
  Search,
  Download,
  Calendar,
  RotateCcw,
  TrendingUp,
  AlertTriangle,
  ShoppingBag,
  User,
  ShieldCheck,
  ArrowRight,
  Clock,
  Loader2,
  Package,
  Layers,
  Sparkles
} from 'lucide-react'

// Helper estático de tipos fuera del ciclo de render
const TIPO_INFO_MAP: Record<TipoMovimientoStock, { label: string; bg: string; dot: string; icon: any }> = {
  ingreso_mercaderia: {
    label: 'Ingreso / Compra',
    bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    dot: 'bg-emerald-400',
    icon: TrendingUp,
  },
  venta_automatica: {
    label: 'Venta Comanda',
    bg: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
    dot: 'bg-sky-400',
    icon: ShoppingBag,
  },
  consumo_personal: {
    label: 'Consumo Personal',
    bg: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
    dot: 'bg-purple-400',
    icon: User,
  },
  merma_vencimiento: {
    label: 'Merma Vencimiento',
    bg: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    dot: 'bg-rose-400',
    icon: AlertTriangle,
  },
  merma_rotura: {
    label: 'Merma Rotura',
    bg: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    dot: 'bg-rose-400',
    icon: AlertTriangle,
  },
  merma_cocina: {
    label: 'Merma Cocina',
    bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    dot: 'bg-amber-400',
    icon: AlertTriangle,
  },
  ajuste_inventario: {
    label: 'Conteo Físico',
    bg: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
    dot: 'bg-cyan-400',
    icon: ShieldCheck,
  },
  ajuste_manual: {
    label: 'Ajuste Manual',
    bg: 'bg-slate-800/90 text-slate-300 border-slate-700',
    dot: 'bg-slate-400',
    icon: RotateCcw,
  },
}

function getTipoInfo(tipo: TipoMovimientoStock) {
  return (
    TIPO_INFO_MAP[tipo] || {
      label: 'Ajuste Manual',
      bg: 'bg-slate-800 text-slate-300 border-slate-700',
      dot: 'bg-slate-400',
      icon: RotateCcw,
    }
  )
}

// Badge de Fecha y Hora moderno en 1 sola línea sin cortes
function BadgeFechaHora({ fechaStr }: { fechaStr: string }) {
  try {
    const d = new Date(fechaStr)
    if (isNaN(d.getTime())) {
      return <span className="font-mono text-xs text-slate-400 whitespace-nowrap">{fechaStr}</span>
    }

    const dia = d.getDate().toString().padStart(2, '0')
    const mes = d.toLocaleDateString('es-AR', { month: 'short' }).replace('.', '').toUpperCase()
    const hora = d.getHours().toString().padStart(2, '0')
    const min = d.getMinutes().toString().padStart(2, '0')

    return (
      <div className="inline-flex items-center gap-2 whitespace-nowrap select-none">
        <div className="inline-flex items-center gap-1 bg-slate-950/80 border border-slate-800/90 px-2.5 py-1 rounded-lg shadow-xs">
          <Calendar size={12} className="text-indigo-400 shrink-0" />
          <span className="font-extrabold text-slate-200 text-xs tracking-tight">{dia} {mes}</span>
        </div>
        <div className="inline-flex items-center gap-1 bg-slate-900/60 border border-slate-800/60 px-2 py-1 rounded-lg text-slate-300 font-mono text-xs">
          <Clock size={11} className="text-slate-400 shrink-0" />
          <span className="font-bold">{hora}:{min}</span>
        </div>
      </div>
    )
  } catch {
    return <span className="font-mono text-xs text-slate-400 whitespace-nowrap">{fechaStr}</span>
  }
}

export function TabKardexAuditoria({
  insumos = [],
}: {
  insumos: Insumo[]
}) {
  const [movimientos, setMovimientos] = useState<MovimientoStock[]>([])
  const [cargando, setCargando] = useState(true)

  // Filtros
  const [busqueda, setBusqueda] = useState('')
  const [filtroInsumoId, setFiltroInsumoId] = useState('todos')
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [filtroPeriodo, setFiltroPeriodo] = useState<'hoy' | '7dias' | 'mes' | 'todos'>('mes')

  // Cargar datos
  const cargarMovimientos = async () => {
    setCargando(true)
    try {
      let desde: string | undefined = undefined

      const ahora = new Date()
      if (filtroPeriodo === 'hoy') {
        const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate())
        desde = inicioHoy.toISOString()
      } else if (filtroPeriodo === '7dias') {
        const hace7Dias = new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000)
        desde = hace7Dias.toISOString()
      } else if (filtroPeriodo === 'mes') {
        const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
        desde = inicioMes.toISOString()
      }

      const datos = await obtenerMovimientosStockGenerales({
        insumoId: filtroInsumoId,
        tipo: filtroTipo,
        desde,
        limite: 300,
      })
      setMovimientos(datos)
    } catch (err) {
      console.error('Error cargando movimientos generales:', err)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarMovimientos()
  }, [filtroInsumoId, filtroTipo, filtroPeriodo])

  // Filtrado reactivo en el cliente por búsqueda de texto normalizada
  const movimientosFiltrados = useMemo(() => {
    if (!busqueda.trim()) return movimientos
    const q = busqueda
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()

    return movimientos.filter(m => {
      const insumo = (m.insumo_nombre || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
      const motivo = (m.motivo || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
      const usuario = (m.usuario_nombre || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
      return insumo.includes(q) || motivo.includes(q) || usuario.includes(q)
    })
  }, [movimientos, busqueda])

  // Métricas memoizadas
  const metricas = useMemo(() => {
    let entradas = 0
    let salidas = 0
    let mermas = 0
    let personal = 0

    movimientos.forEach(m => {
      if (m.cantidad_delta > 0) {
        entradas += Number(m.cantidad_delta)
      } else if (m.tipo_movimiento === 'venta_automatica') {
        salidas += Math.abs(Number(m.cantidad_delta))
      } else if (m.tipo_movimiento.startsWith('merma_')) {
        mermas += Math.abs(Number(m.cantidad_delta))
      } else if (m.tipo_movimiento === 'consumo_personal') {
        personal += Math.abs(Number(m.cantidad_delta))
      }
    })

    return { total: movimientos.length, entradas, salidas, mermas, personal }
  }, [movimientos])

  // Exportar a CSV
  const exportarCSV = () => {
    if (movimientosFiltrados.length === 0) return

    const encabezados = [
      'Fecha',
      'Insumo',
      'Tipo de Movimiento',
      'Variacion Delta',
      'Stock Anterior',
      'Stock Resultante',
      'Unidad de Medida',
      'Motivo / Comprobante',
      'Responsable',
    ]

    const filas = movimientosFiltrados.map(m => [
      `"${new Date(m.created_at).toLocaleString('es-AR')}"`,
      `"${m.insumo_nombre.replace(/"/g, '""')}"`,
      `"${getTipoInfo(m.tipo_movimiento).label}"`,
      m.cantidad_delta > 0 ? `+${m.cantidad_delta}` : `${m.cantidad_delta}`,
      m.stock_anterior,
      m.stock_nuevo,
      `"${m.unidad_medida}"`,
      `"${(m.motivo || '').replace(/"/g, '""')}"`,
      `"${m.usuario_nombre.replace(/"/g, '""')}"`,
    ])

    const csvContenido = '\uFEFF' + [encabezados.join(','), ...filas.map(f => f.join(','))].join('\n')
    const blob = new Blob([csvContenido], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `kardex_stock_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      
      {/* ── KPIs Modernos con Glow y Gradiente ─────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Total Movimientos */}
        <div className="bg-gradient-to-br from-slate-900/90 to-slate-950 border border-slate-800/80 p-4 rounded-2xl shadow-sm relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Total Registros</p>
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl">
              <History size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-white mt-1 font-mono">{metricas.total}</p>
          <span className="text-[10px] text-slate-500 font-semibold mt-0.5 block">Asientos auditados</span>
        </div>

        {/* Entradas */}
        <div className="bg-gradient-to-br from-slate-900/90 to-slate-950 border border-emerald-500/30 p-4 rounded-2xl shadow-sm relative overflow-hidden group hover:border-emerald-500/50 transition-all">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-widest">Compras / Entradas</p>
            <div className="p-2 bg-emerald-500/15 text-emerald-400 rounded-xl">
              <TrendingUp size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-300 mt-1 font-mono">+{metricas.entradas}</p>
          <span className="text-[10px] text-emerald-400/70 font-semibold mt-0.5 block">Ingresos al stock</span>
        </div>

        {/* Salidas Ventas */}
        <div className="bg-gradient-to-br from-slate-900/90 to-slate-950 border border-sky-500/30 p-4 rounded-2xl shadow-sm relative overflow-hidden group hover:border-sky-500/50 transition-all">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-extrabold text-sky-400 uppercase tracking-widest">Ventas Comanda</p>
            <div className="p-2 bg-sky-500/15 text-sky-400 rounded-xl">
              <ShoppingBag size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-sky-300 mt-1 font-mono">-{metricas.salidas}</p>
          <span className="text-[10px] text-sky-400/70 font-semibold mt-0.5 block">Descontados por recetas</span>
        </div>

        {/* Mermas */}
        <div className="bg-gradient-to-br from-slate-900/90 to-slate-950 border border-rose-500/30 p-4 rounded-2xl shadow-sm relative overflow-hidden group hover:border-rose-500/50 transition-all">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-extrabold text-rose-400 uppercase tracking-widest">Mermas / Roturas</p>
            <div className="p-2 bg-rose-500/15 text-rose-400 rounded-xl">
              <AlertTriangle size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-rose-400 mt-1 font-mono">-{metricas.mermas}</p>
          <span className="text-[10px] text-rose-400/70 font-semibold mt-0.5 block">Pérdidas justificadas</span>
        </div>

        {/* Consumo Personal */}
        <div className="bg-gradient-to-br from-slate-900/90 to-slate-950 border border-purple-500/30 p-4 rounded-2xl shadow-sm relative overflow-hidden group hover:border-purple-500/50 transition-all col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-extrabold text-purple-400 uppercase tracking-widest">Consumo Personal</p>
            <div className="p-2 bg-purple-500/15 text-purple-400 rounded-xl">
              <User size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-purple-300 mt-1 font-mono">-{metricas.personal}</p>
          <span className="text-[10px] text-purple-400/70 font-semibold mt-0.5 block">Gastos de staff</span>
        </div>
      </div>

      {/* ── Barra de Filtros Inteligentes ────────────────────────── */}
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 p-3.5 rounded-2xl backdrop-blur-md shadow-xs">
        
        {/* Buscador */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
          <input
            type="text"
            placeholder="Buscar por insumo, comanda, motivo o responsable..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-950/90 border border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none text-xs text-white placeholder:text-slate-500 transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Selector de Insumo */}
          <select
            value={filtroInsumoId}
            onChange={e => setFiltroInsumoId(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-200 text-xs font-bold rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer max-w-[200px]"
          >
            <option value="todos">Todos los Insumos</option>
            {insumos.map(i => (
              <option key={i.id} value={i.id}>
                {i.nombre}
              </option>
            ))}
          </select>

          {/* Selector de Tipo */}
          <select
            value={filtroTipo}
            onChange={e => setFiltroTipo(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-200 text-xs font-bold rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer"
          >
            <option value="todos">Todos los Tipos</option>
            <option value="ingreso_mercaderia">🟢 Compras / Ingresos</option>
            <option value="venta_automatica">🔵 Ventas Automáticas</option>
            <option value="consumo_personal">🟣 Consumo Personal</option>
            <option value="merma_rotura">🔴 Merma: Roturas</option>
            <option value="merma_vencimiento">🔴 Merma: Vencimiento</option>
            <option value="merma_cocina">🟠 Merma: Cocina</option>
            <option value="ajuste_inventario">🔵 Conteo Físico</option>
            <option value="ajuste_manual">⚪ Ajustes Manuales</option>
          </select>

          {/* Periodo Pills */}
          <div className="flex bg-slate-950 border border-slate-800 p-1 rounded-xl">
            {(['hoy', '7dias', 'mes', 'todos'] as const).map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setFiltroPeriodo(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filtroPeriodo === p ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                {p === 'hoy' ? 'Hoy' : p === '7dias' ? '7 días' : p === 'mes' ? 'Este Mes' : 'Todo'}
              </button>
            ))}
          </div>

          {/* Exportar CSV */}
          <button
            type="button"
            onClick={exportarCSV}
            disabled={movimientosFiltrados.length === 0}
            className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-40"
            title="Exportar movimientos a Excel / CSV"
          >
            <Download size={14} />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* ── Tabla de Movimientos del Kardex ──────────────────────── */}
      <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl overflow-hidden shadow-xl">
        {/* ── DESKTOP TABLE ── */}
        <div className="hidden md:block overflow-x-auto scrollbar-thin">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-extrabold uppercase tracking-wider text-[10px]">
                <th className="py-4 px-5 min-w-[210px]">Fecha y Hora</th>
                <th className="py-4 px-5 min-w-[200px]">Insumo</th>
                <th className="py-4 px-5 min-w-[170px]">Tipo de Evento</th>
                <th className="py-4 px-5 min-w-[120px] text-right">Variación Delta</th>
                <th className="py-4 px-5 min-w-[180px] text-center">Stock (Antes ➔ Después)</th>
                <th className="py-4 px-5 min-w-[260px]">Motivo / Comprobante</th>
                <th className="py-4 px-5 min-w-[150px]">Responsable</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {cargando ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center">
                    <Loader2 className="animate-spin text-indigo-400 mx-auto" size={32} />
                    <p className="text-xs text-slate-400 font-bold mt-2.5">Cargando libro de auditoría...</p>
                  </td>
                </tr>
              ) : movimientosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center">
                    <div className="max-w-sm mx-auto space-y-2">
                      <History className="text-slate-600 mx-auto" size={40} />
                      <p className="text-sm font-bold text-slate-200">No se encontraron movimientos</p>
                      <p className="text-xs text-slate-500">
                        Probá cambiando los filtros de período, insumo o tipo de evento.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                movimientosFiltrados.map(m => {
                  const info = getTipoInfo(m.tipo_movimiento)
                  const Icono = info.icon
                  const esPositivo = m.cantidad_delta > 0

                  return (
                    <tr key={m.id} className="hover:bg-slate-800/30 transition-colors group">
                      
                      {/* Fecha y Hora en Badge Horizontal */}
                      <td className="py-3.5 px-5">
                        <BadgeFechaHora fechaStr={m.created_at} />
                      </td>

                      {/* Insumo */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                          <span className="font-extrabold text-white text-xs sm:text-sm tracking-tight">{m.insumo_nombre}</span>
                        </div>
                      </td>

                      {/* Tipo de Evento */}
                      <td className="py-3.5 px-5">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold border uppercase tracking-wider inline-flex items-center gap-1.5 ${info.bg}`}>
                          <Icono size={12} className="shrink-0" />
                          <span>{info.label}</span>
                        </span>
                      </td>

                      {/* Delta */}
                      <td className="py-3.5 px-5 text-right">
                        <span className={`font-mono font-black text-xs px-2.5 py-1 rounded-lg border whitespace-nowrap ${
                          esPositivo 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        }`}>
                          {esPositivo ? `+${m.cantidad_delta}` : m.cantidad_delta} <span className="text-[10px] opacity-75 font-normal">{m.unidad_medida}</span>
                        </span>
                      </td>

                      {/* Stock Antes -> Después */}
                      <td className="py-3.5 px-5 text-center">
                        <div className="inline-flex items-center gap-2 text-xs bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800/80 whitespace-nowrap">
                          <span className="text-slate-400 font-mono font-medium">{m.stock_anterior}</span>
                          <ArrowRight size={11} className="text-slate-600 shrink-0" />
                          <strong className="text-white font-mono font-black text-xs">{m.stock_nuevo}</strong>
                          <span className="text-[9px] text-slate-500 uppercase">{m.unidad_medida}</span>
                        </div>
                      </td>

                      {/* Motivo / Comprobante */}
                      <td className="py-3.5 px-5">
                        <span className="text-xs text-slate-300 block font-medium max-w-[320px] truncate" title={m.motivo || ''}>
                          {m.motivo || '—'}
                        </span>
                      </td>

                      {/* Responsable */}
                      <td className="py-3.5 px-5 text-xs text-slate-400 font-medium">
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                          <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-300 uppercase shrink-0">
                            {(m.usuario_nombre || 'S')[0]}
                          </div>
                          <span className="truncate max-w-[120px]">{m.usuario_nombre}</span>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── MOBILE CARDS VIEW (SIN SCROLL HORIZONTAL) ── */}
        <div className="block md:hidden divide-y divide-slate-800/70">
          {cargando ? (
            <div className="py-12 text-center">
              <Loader2 className="animate-spin text-indigo-400 mx-auto" size={28} />
              <p className="text-xs text-slate-400 font-bold mt-2">Cargando movimientos...</p>
            </div>
          ) : movimientosFiltrados.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <History className="text-slate-600 mx-auto" size={32} />
              <p className="text-xs font-bold text-slate-200">No se encontraron movimientos</p>
            </div>
          ) : (
            movimientosFiltrados.map((m) => {
              const info = getTipoInfo(m.tipo_movimiento)
              const Icono = info.icon
              const esPositivo = m.cantidad_delta > 0

              return (
                <div key={m.id} className="p-3.5 space-y-2.5 hover:bg-slate-800/20 transition-colors">
                  {/* Cabecera Insumo y Delta */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                        <h4 className="font-extrabold text-white text-xs truncate">{m.insumo_nombre}</h4>
                      </div>
                      <div className="mt-1">
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black border uppercase tracking-wider inline-flex items-center gap-1 ${info.bg}`}>
                          <Icono size={10} className="shrink-0" />
                          <span>{info.label}</span>
                        </span>
                      </div>
                    </div>

                    <span className={`font-mono font-black text-xs px-2.5 py-1 rounded-lg border whitespace-nowrap shrink-0 ${
                      esPositivo 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    }`}>
                      {esPositivo ? `+${m.cantidad_delta}` : m.cantidad_delta} <span className="text-[9px] opacity-75 font-normal">{m.unidad_medida}</span>
                    </span>
                  </div>

                  {/* Transición de Stock y Responsable */}
                  <div className="flex items-center justify-between text-[11px] bg-slate-950/60 p-2 rounded-xl border border-slate-800/80">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500 text-[10px]">Stock:</span>
                      <span className="text-slate-400 font-mono">{m.stock_anterior}</span>
                      <ArrowRight size={10} className="text-slate-600 shrink-0" />
                      <strong className="text-white font-mono font-black">{m.stock_nuevo}</strong>
                      <span className="text-[9px] text-slate-500 uppercase">{m.unidad_medida}</span>
                    </div>

                    <div className="flex items-center gap-1 text-slate-400">
                      <User size={10} />
                      <span className="truncate max-w-[90px]">{m.usuario_nombre}</span>
                    </div>
                  </div>

                  {/* Fecha y Motivo */}
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                    <BadgeFechaHora fechaStr={m.created_at} />
                    {m.motivo && (
                      <span className="text-slate-300 truncate max-w-[180px]" title={m.motivo}>
                        {m.motivo}
                      </span>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
