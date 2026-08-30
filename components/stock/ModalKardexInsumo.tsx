'use client'

import { useState, useEffect } from 'react'
import { Insumo, MovimientoStock, TipoMovimientoStock } from '@/tipos/stock'
import { obtenerMovimientosPorInsumo } from '@/servicios/supabase/stock'
import {
  X,
  History,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ShoppingBag,
  User,
  Clock,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  Loader2,
} from 'lucide-react'

export function ModalKardexInsumo({
  insumo,
  onCerrar,
}: {
  insumo: Insumo
  onCerrar: () => void
}) {
  const [movimientos, setMovimientos] = useState<MovimientoStock[]>([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    async function cargar() {
      setCargando(true)
      try {
        const datos = await obtenerMovimientosPorInsumo(insumo.id, 100)
        setMovimientos(datos)
      } catch (err) {
        console.error('Error cargando movimientos de Kardex:', err)
      } finally {
        setCargando(false)
      }
    }
    cargar()
  }, [insumo.id])

  // Estadísticas del insumo
  const stats = {
    totalIngresado: movimientos
      .filter(m => m.cantidad_delta > 0)
      .reduce((acc, m) => acc + Number(m.cantidad_delta), 0),
    totalVendido: Math.abs(
      movimientos
        .filter(m => m.tipo_movimiento === 'venta_automatica')
        .reduce((acc, m) => acc + Number(m.cantidad_delta), 0)
    ),
    totalMermas: Math.abs(
      movimientos
        .filter(m => m.tipo_movimiento.startsWith('merma_'))
        .reduce((acc, m) => acc + Number(m.cantidad_delta), 0)
    ),
    totalPersonal: Math.abs(
      movimientos
        .filter(m => m.tipo_movimiento === 'consumo_personal')
        .reduce((acc, m) => acc + Number(m.cantidad_delta), 0)
    ),
  }

  const getTipoInfo = (tipo: TipoMovimientoStock) => {
    switch (tipo) {
      case 'ingreso_mercaderia':
        return {
          label: 'Ingreso / Compra',
          bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          icon: TrendingUp,
          signo: '+',
        }
      case 'venta_automatica':
        return {
          label: 'Venta Automática',
          bg: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
          icon: ShoppingBag,
          signo: '',
        }
      case 'consumo_personal':
        return {
          label: 'Consumo Personal',
          bg: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
          icon: User,
          signo: '',
        }
      case 'merma_vencimiento':
        return {
          label: 'Merma: Vencimiento',
          bg: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
          icon: AlertTriangle,
          signo: '',
        }
      case 'merma_rotura':
        return {
          label: 'Merma: Rotura / Caída',
          bg: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
          icon: AlertTriangle,
          signo: '',
        }
      case 'merma_cocina':
        return {
          label: 'Merma: Error Cocina',
          bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
          icon: AlertTriangle,
          signo: '',
        }
      case 'ajuste_inventario':
        return {
          label: 'Conteo de Auditoría',
          bg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
          icon: ShieldCheck,
          signo: '',
        }
      default:
        return {
          label: 'Ajuste Manual',
          bg: 'bg-slate-700/50 text-slate-300 border-slate-600',
          icon: RotateCcw,
          signo: '',
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

  const formatearRelativo = (fechaStr: string) => {
    const diff = (Date.now() - new Date(fechaStr).getTime()) / 1000
    if (diff < 60) return 'Hace instantes'
    if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`
    if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`
    if (diff < 604800) return `Hace ${Math.floor(diff / 86400)} días`
    return 'Hace más de una semana'
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-2xl w-full max-w-4xl overflow-hidden my-auto flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <History size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white">{insumo.nombre}</h2>
                <span className="bg-slate-800 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-lg border border-slate-700">
                  Kardex Inmutable
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Stock actual: <strong className="text-white">{insumo.stock_actual} {insumo.unidad_medida}</strong> • Trazabilidad completa
              </p>
            </div>
          </div>

          <button
            onClick={onCerrar}
            className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Resumen Métrico del Insumo */}
        <div className="p-5 bg-slate-950/60 border-b border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-900/80 border border-emerald-500/20 p-3 rounded-2xl">
            <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Total Ingresado</p>
            <p className="text-lg font-black text-white mt-0.5">+{stats.totalIngresado} <span className="text-xs text-slate-400 font-normal">{insumo.unidad_medida}</span></p>
          </div>

          <div className="bg-slate-900/80 border border-blue-500/20 p-3 rounded-2xl">
            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Vendido / Comandas</p>
            <p className="text-lg font-black text-white mt-0.5">-{stats.totalVendido} <span className="text-xs text-slate-400 font-normal">{insumo.unidad_medida}</span></p>
          </div>

          <div className="bg-slate-900/80 border border-rose-500/20 p-3 rounded-2xl">
            <p className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">Mermas / Bajas</p>
            <p className="text-lg font-black text-white mt-0.5">-{stats.totalMermas} <span className="text-xs text-slate-400 font-normal">{insumo.unidad_medida}</span></p>
          </div>

          <div className="bg-slate-900/80 border border-purple-500/20 p-3 rounded-2xl">
            <p className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Consumo Personal</p>
            <p className="text-lg font-black text-white mt-0.5">-{stats.totalPersonal} <span className="text-xs text-slate-400 font-normal">{insumo.unidad_medida}</span></p>
          </div>
        </div>

        {/* Contenido / Timeline de Movimientos */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {cargando ? (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="animate-spin text-indigo-400 mx-auto" size={32} />
              <p className="text-xs text-slate-400 font-bold">Cargando libro de movimientos...</p>
            </div>
          ) : movimientos.length === 0 ? (
            <div className="py-16 text-center space-y-3 bg-slate-950/40 rounded-3xl border border-slate-800">
              <History className="text-slate-600 mx-auto" size={40} />
              <h3 className="text-sm font-bold text-slate-300">Sin movimientos registrados</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Los movimientos de compras, ventas automáticas y ajustes se registrarán aquí automáticamente a partir de ahora.
              </p>
            </div>
          ) : (
            <div className="relative border-l-2 border-slate-800 ml-4 pl-6 space-y-5">
              {movimientos.map(m => {
                const info = getTipoInfo(m.tipo_movimiento)
                const Icono = info.icon
                const esPositivo = m.cantidad_delta > 0

                return (
                  <div key={m.id} className="relative group">
                    {/* Punto en la línea de tiempo */}
                    <div className={`absolute -left-[35px] top-1.5 w-6 h-6 rounded-full flex items-center justify-center border shadow-md ${
                      esPositivo ? 'bg-emerald-950 border-emerald-500 text-emerald-400' : 'bg-slate-900 border-slate-700 text-slate-300'
                    }`}>
                      <Icono size={12} />
                    </div>

                    {/* Tarjeta del Movimiento */}
                    <div className="bg-slate-950/80 border border-slate-800 hover:border-slate-700 p-4 rounded-2xl transition-all shadow-md space-y-2.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black border uppercase tracking-wider ${info.bg}`}>
                            {info.label}
                          </span>
                          <span className="text-xs font-bold text-slate-400">
                            {formatearRelativo(m.created_at)}
                          </span>
                        </div>

                        {/* Delta numérico */}
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-black px-2 py-0.5 rounded-lg ${
                            esPositivo
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}>
                            {esPositivo ? `+${m.cantidad_delta}` : m.cantidad_delta} {m.unidad_medida}
                          </span>

                          <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800">
                            <span>{m.stock_anterior}</span>
                            <ArrowRight size={11} className="text-slate-600" />
                            <strong className="text-white">{m.stock_nuevo}</strong>
                          </div>
                        </div>
                      </div>

                      {/* Motivo y Notas */}
                      <p className="text-xs font-medium text-slate-200 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/60">
                        {m.motivo || 'Sin detalle de motivo especificado.'}
                      </p>

                      {/* Footer: Responsable y Fecha Exacta */}
                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-900">
                        <div className="flex items-center gap-1">
                          <User size={12} className="text-slate-500" />
                          <span>Responsable: <strong className="text-slate-300">{m.usuario_nombre}</strong></span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock size={12} className="text-slate-500" />
                          <span>{formatearFecha(m.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900 flex justify-end">
          <button
            onClick={onCerrar}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-black rounded-xl transition-all cursor-pointer"
          >
            Cerrar Kardex
          </button>
        </div>
      </div>
    </div>
  )
}
