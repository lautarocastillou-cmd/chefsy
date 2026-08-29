'use client'

import { useState, useEffect, useMemo } from 'react'
import { Insumo, MovimientoStock, TipoMovimientoStock } from '@/tipos/stock'
import { obtenerMovimientosStockGenerales } from '@/servicios/supabase/stock'
import {
  History,
  Search,
  Filter,
  Download,
  Calendar,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ShoppingBag,
  User,
  ShieldCheck,
  ArrowRight,
  Clock,
  Loader2,
  FileSpreadsheet,
  CheckCircle2,
} from 'lucide-react'

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
        limite: 200,
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

  // Filtrado reactivo en el cliente por búsqueda de texto
  const movimientosFiltrados = useMemo(() => {
    if (!busqueda.trim()) return movimientos
    const q = busqueda.toLowerCase().trim()
    return movimientos.filter(
      m =>
        m.insumo_nombre.toLowerCase().includes(q) ||
        (m.motivo || '').toLowerCase().includes(q) ||
        m.usuario_nombre.toLowerCase().includes(q)
    )
  }, [movimientos, busqueda])

  // Métricas
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

  const getTipoInfo = (tipo: TipoMovimientoStock) => {
    switch (tipo) {
      case 'ingreso_mercaderia':
        return {
          label: 'Ingreso / Compra',
          bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          icon: TrendingUp,
        }
      case 'venta_automatica':
        return {
          label: 'Venta Comanda',
          bg: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
          icon: ShoppingBag,
        }
      case 'consumo_personal':
        return {
          label: 'Consumo Personal',
          bg: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
          icon: User,
        }
      case 'merma_vencimiento':
        return {
          label: 'Merma Vencimiento',
          bg: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
          icon: AlertTriangle,
        }
      case 'merma_rotura':
        return {
          label: 'Merma Rotura',
          bg: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
          icon: AlertTriangle,
        }
      case 'merma_cocina':
        return {
          label: 'Merma Cocina',
          bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
          icon: AlertTriangle,
        }
      case 'ajuste_inventario':
        return {
          label: 'Conteo Físico',
          bg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
          icon: ShieldCheck,
        }
      default:
        return {
          label: 'Ajuste Manual',
          bg: 'bg-slate-800 text-slate-300 border-slate-700',
          icon: RotateCcw,
        }
    }
  }

  const formatearFecha = (fechaStr: string) => {
    const fecha = new Date(fechaStr)
    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(fecha)
  }

  // Exportar a CSV
  const exportarCSV = () => {
    if (movimientosFiltrados.length === 0) return

    const encabezados = [
      'Fecha',
      'Insumo',
      'Tipo de Movimiento',
      'Cantidad Delta',
      'Unidad',
      'Stock Anterior',
      'Stock Nuevo',
      'Motivo / Comprobante',
      'Usuario Responsable',
    ]

    const filas = movimientosFiltrados.map(m => [
      `"${formatearFecha(m.created_at)}"`,
      `"${m.insumo_nombre.replace(/"/g, '""')}"`,
      `"${m.tipo_movimiento}"`,
      m.cantidad_delta,
      `"${m.unidad_medida}"`,
      m.stock_anterior,
      m.stock_nuevo,
      `"${(m.motivo || '').replace(/"/g, '""')}"`,
      `"${m.usuario_nombre.replace(/"/g, '""')}"`,
    ])

    const contenidoCSV = '\uFEFF' + [encabezados.join(','), ...filas.map(f => f.join(','))].join('\n')
    const blob = new Blob([contenidoCSV], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `kardex_stock_chefsy_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      {/* Banner Superior & Métricas */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-3xl">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Movimientos</p>
          <p className="text-xl font-black text-white mt-0.5">{metricas.total}</p>
        </div>

        <div className="bg-slate-900/80 border border-emerald-500/30 p-4 rounded-3xl">
          <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Entradas (Compras)</p>
          <p className="text-xl font-black text-emerald-300 mt-0.5">+{metricas.entradas}</p>
        </div>

        <div className="bg-slate-900/80 border border-blue-500/30 p-4 rounded-3xl">
          <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Salidas (Ventas)</p>
          <p className="text-xl font-black text-blue-300 mt-0.5">-{metricas.salidas}</p>
        </div>

        <div className="bg-slate-900/80 border border-rose-500/30 p-4 rounded-3xl">
          <p className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">Mermas / Bajas</p>
          <p className="text-xl font-black text-rose-400 mt-0.5">-{metricas.mermas}</p>
        </div>

        <div className="bg-slate-900/80 border border-purple-500/30 p-4 rounded-3xl col-span-2 sm:col-span-1">
          <p className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Consumo Personal</p>
          <p className="text-xl font-black text-purple-300 mt-0.5">-{metricas.personal}</p>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 p-4 rounded-3xl">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input
            type="text"
            placeholder="Buscar por insumo, factura, motivo o usuario..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-xs sm:text-sm text-white placeholder:text-slate-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Selector de Insumo */}
          <select
            value={filtroInsumoId}
            onChange={e => setFiltroInsumoId(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-200 text-xs font-bold rounded-2xl px-3 py-3 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
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
            className="bg-slate-950 border border-slate-800 text-slate-200 text-xs font-bold rounded-2xl px-3 py-3 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
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

          {/* Periodo */}
          <div className="flex bg-slate-950 border border-slate-800 p-1 rounded-2xl">
            {(['hoy', '7dias', 'mes', 'todos'] as const).map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setFiltroPeriodo(p)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  filtroPeriodo === p ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                {p === 'hoy' ? 'Hoy' : p === '7dias' ? '7 días' : p === 'mes' ? 'Este Mes' : 'Todo'}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={exportarCSV}
            disabled={movimientosFiltrados.length === 0}
            className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-black rounded-2xl transition-all flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-40"
            title="Exportar movimientos a Excel / CSV"
          >
            <Download size={15} />
            <span className="hidden sm:inline">Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Tabla de Movimientos del Kardex */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px] sm:text-[11px]">
                <th className="py-3.5 px-4 w-36">Fecha y Hora</th>
                <th className="py-3.5 px-4 min-w-[180px]">Insumo</th>
                <th className="py-3.5 px-4 w-40">Tipo de Evento</th>
                <th className="py-3.5 px-4 w-28 text-right">Delta</th>
                <th className="py-3.5 px-4 w-36 text-center">Stock (Antes ➔ Después)</th>
                <th className="py-3.5 px-4 min-w-[220px]">Motivo / Comprobante</th>
                <th className="py-3.5 px-4 w-36">Responsable</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {cargando ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <Loader2 className="animate-spin text-indigo-400 mx-auto" size={28} />
                    <p className="text-xs text-slate-400 font-bold mt-2">Cargando libro de auditoría...</p>
                  </td>
                </tr>
              ) : movimientosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="max-w-sm mx-auto space-y-2">
                      <History className="text-slate-600 mx-auto" size={36} />
                      <p className="text-sm font-bold text-slate-300">No se encontraron movimientos</p>
                      <p className="text-xs text-slate-500">
                        Probá cambiando los filtros de período, insumo o tipo de evento.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                movimientosFiltrados.map(m => {
                  const info = getTipoInfo(m.tipo_movimiento)
                  const esPositivo = m.cantidad_delta > 0

                  return (
                    <tr key={m.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* Fecha y Hora */}
                      <td className="py-3.5 px-4 text-xs font-mono text-slate-400">
                        {formatearFecha(m.created_at)}
                      </td>

                      {/* Insumo */}
                      <td className="py-3.5 px-4 font-bold text-white">
                        {m.insumo_nombre}
                      </td>

                      {/* Tipo de Evento */}
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-black border uppercase tracking-wider inline-flex items-center gap-1 ${info.bg}`}>
                          {info.label}
                        </span>
                      </td>

                      {/* Delta */}
                      <td className="py-3.5 px-4 text-right">
                        <span className={`font-mono font-black text-xs px-2 py-0.5 rounded-md ${
                          esPositivo ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                        }`}>
                          {esPositivo ? `+${m.cantidad_delta}` : m.cantidad_delta} {m.unidad_medida}
                        </span>
                      </td>

                      {/* Stock Antes -> Después */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5 text-xs text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                          <span>{m.stock_anterior}</span>
                          <ArrowRight size={10} className="text-slate-600" />
                          <strong className="text-white">{m.stock_nuevo}</strong>
                        </div>
                      </td>

                      {/* Motivo */}
                      <td className="py-3.5 px-4 text-xs text-slate-300 italic">
                        {m.motivo || '—'}
                      </td>

                      {/* Responsable */}
                      <td className="py-3.5 px-4 text-xs text-slate-400 font-medium">
                        <div className="flex items-center gap-1.5">
                          <User size={12} className="text-slate-500" />
                          <span>{m.usuario_nombre}</span>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
