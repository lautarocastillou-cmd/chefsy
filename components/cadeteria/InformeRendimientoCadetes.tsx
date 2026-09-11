'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { Pedido, PuntoRutaBreadcrumb } from '@/tipos'
import { usarPedidos } from '@/contexto/PedidosContexto'
import { obtenerFechaNegocio } from '@/lib/tiempo'
import {
  consolidarMetricasCadetes,
  calcularTelemetriaRuta,
  ResumenFlotaCadetes,
  MetricasCadeteConsolidadas
} from '@/lib/telemetriaCadetes'
import {
  Bike,
  Gauge,
  Clock,
  Navigation,
  AlertTriangle,
  Zap,
  Award,
  ChevronDown,
  ChevronUp,
  MapPin,
  Calendar,
  RefreshCw,
  Eye,
  CheckCircle2,
  TrendingUp,
  Activity
} from 'lucide-react'
import ModalBreadcrumbTrail from './ModalBreadcrumbTrail'

interface InformeRendimientoCadetesProps {
  pedidosEnVivo: Pedido[]
  estadoGpsCadetes?: Record<string, { activo: boolean; hace: string }>
}

export default function InformeRendimientoCadetes({
  pedidosEnVivo,
  estadoGpsCadetes = {}
}: InformeRendimientoCadetesProps) {
  const { cadetes, obtenerPedidosPorFecha } = usarPedidos()
  
  const [modoFecha, setModoFecha] = useState<'hoy' | 'historico'>('hoy')
  const [fechaInput, setFechaInput] = useState(() => obtenerFechaNegocio())
  const [pedidosHistoricos, setPedidosHistoricos] = useState<Pedido[]>([])
  const [cargandoHistorico, setCargandoHistorico] = useState(false)
  const [cadeteExpandido, setCadeteExpandido] = useState<string | null>(null)
  const [pedidoParaModal, setPedidoParaModal] = useState<Pedido | null>(null)

  // Cargar pedidos históricos si cambia la fecha y estamos en modo histórico
  const cargarHistorico = async (fecha: string) => {
    setCargandoHistorico(true)
    try {
      const data = await obtenerPedidosPorFecha(fecha)
      setPedidosHistoricos(data || [])
    } catch (e) {
      console.error('Error cargando historial para reporte de cadetes:', e)
      setPedidosHistoricos([])
    } finally {
      setCargandoHistorico(false)
    }
  }

  useEffect(() => {
    if (modoFecha === 'historico') {
      cargarHistorico(fechaInput)
    }
  }, [modoFecha, fechaInput])

  // Pedidos a evaluar según el modo
  const pedidosEvaluados = useMemo(() => {
    const fuente = modoFecha === 'hoy' ? pedidosEnVivo : pedidosHistoricos
    const fechaFiltro = modoFecha === 'hoy' ? obtenerFechaNegocio() : fechaInput
    return fuente.filter(p => p.tipoEntrega === 'delivery' && (p.fecha === fechaFiltro || modoFecha === 'hoy'))
  }, [modoFecha, pedidosEnVivo, pedidosHistoricos, fechaInput])

  // Lista de cadetes formateada
  const cadetesFormateados = useMemo(() => {
    return (cadetes || []).map(c => ({
      id: c.id,
      nombre: c.nombre,
      activo: (c as any).activo ?? c.online ?? true
    }))
  }, [cadetes])

  // Métricas consolidadas
  const resumenFlota: ResumenFlotaCadetes = useMemo(() => {
    return consolidarMetricasCadetes(pedidosEvaluados, cadetesFormateados)
  }, [pedidosEvaluados, cadetesFormateados])

  return (
    <div className="space-y-6">
      {/* Barra de Filtros y Modo */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <Activity size={20} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
              Rendimiento y Telemetría de Cadetes
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Cálculo físico de velocidad en movimiento, tiempos y rutas
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="inline-flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setModoFecha('hoy')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                modoFecha === 'hoy'
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm font-bold'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Turno de Hoy
            </button>
            <button
              type="button"
              onClick={() => setModoFecha('historico')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                modoFecha === 'historico'
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm font-bold'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Por Fecha
            </button>
          </div>

          {modoFecha === 'historico' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={fechaInput}
                onChange={(e) => setFechaInput(e.target.value)}
                className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={() => cargarHistorico(fechaInput)}
                disabled={cargandoHistorico}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-colors cursor-pointer"
                title="Recargar fecha"
              >
                <RefreshCw size={14} className={cargandoHistorico ? 'animate-spin' : ''} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tarjetas KPI de la Flota */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {/* Velocidad en Marcha */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Vel. Media Rodando
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Gauge size={16} />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {resumenFlota.velocidadMediaFlotaMovimiento}
              </span>
              <span className="text-xs font-bold text-slate-400">km/h</span>
            </div>
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">
              Solo tiempo en marcha (&ge;4 km/h)
            </p>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[10px] text-slate-400 flex justify-between">
            <span>Comercial puerta a puerta:</span>
            <strong className="text-slate-600 dark:text-slate-300">{resumenFlota.velocidadComercialFlota} km/h</strong>
          </div>
        </div>

        {/* Tiempo Promedio por Pedido */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Tiempo Prom. Entrega
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Clock size={16} />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {resumenFlota.tiempoPromedioEntregaMinutos}
              </span>
              <span className="text-xs font-bold text-slate-400">min</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Desde salida de cocina hasta entrega
            </p>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[10px] text-slate-400 flex justify-between">
            <span>Entregas completadas:</span>
            <strong className="text-slate-600 dark:text-slate-300">{resumenFlota.totalPedidosEntregados} pedidos</strong>
          </div>
        </div>

        {/* Distancia Total Recorrida */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Distancia Recorrida
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Navigation size={16} />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {resumenFlota.totalKmRecorridos}
              </span>
              <span className="text-xs font-bold text-slate-400">km</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Acumulado total de la flota
            </p>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[10px] text-slate-400 flex justify-between">
            <span>Cadetes computados:</span>
            <strong className="text-slate-600 dark:text-slate-300">{resumenFlota.cadetes.length}</strong>
          </div>
        </div>

        {/* Destacados / Alertas */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Líderes & Alertas
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Award size={16} />
            </div>
          </div>
          <div className="mt-2 space-y-1">
            {resumenFlota.cadeteMasRapido ? (
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 text-[11px] flex items-center gap-1">
                  <Zap size={11} className="text-amber-500" /> Más rápido:
                </span>
                <strong className="text-slate-800 dark:text-slate-200 font-bold truncate max-w-[110px]">
                  {resumenFlota.cadeteMasRapido.nombre} ({resumenFlota.cadeteMasRapido.velocidad} km/h)
                </strong>
              </div>
            ) : null}

            {resumenFlota.cadeteMasActivo ? (
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 text-[11px] flex items-center gap-1">
                  <Bike size={11} className="text-emerald-500" /> Más entregas:
                </span>
                <strong className="text-slate-800 dark:text-slate-200 font-bold truncate max-w-[110px]">
                  {resumenFlota.cadeteMasActivo.nombre} ({resumenFlota.cadeteMasActivo.pedidos})
                </strong>
              </div>
            ) : null}
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[10px] text-slate-400 flex justify-between items-center">
            <span>Alertas &gt; 60 km/h:</span>
            <span className={`font-black px-1.5 py-0.2 rounded ${
              resumenFlota.totalAlertasVelocidad > 0
                ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
                : 'text-slate-500'
            }`}>
              {resumenFlota.totalAlertasVelocidad}
            </span>
          </div>
        </div>
      </div>

      {/* Detalle por Cadete */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Bike size={16} className="text-emerald-500" />
            <span>Métricas Individuales de Cadetes ({resumenFlota.cadetes.length})</span>
          </h3>
          <span className="text-[11px] text-slate-400">
            Tocá una tarjeta para ver pedidos y mapa
          </span>
        </div>

        {resumenFlota.cadetes.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center text-slate-400">
            <Bike size={36} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm font-semibold">No hay repartos registrados en este período</p>
            <p className="text-xs mt-1">Los pedidos de delivery entregados aparecerán calculados aquí automáticamente.</p>
          </div>
        ) : (
          resumenFlota.cadetes.map((cadete) => {
            const esExpandido = cadeteExpandido === cadete.cadeteId
            const gpsInfo = estadoGpsCadetes[cadete.cadeteId]
            const pedidosDelCadete = pedidosEvaluados.filter(
              p => (p.cadete_id || '').toLowerCase() === cadete.cadeteId.toLowerCase() ||
                   (p.cadete_nombre || '').toLowerCase() === cadete.cadeteNombre.toLowerCase()
            )

            return (
              <div
                key={cadete.cadeteId}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-700"
              >
                {/* Cabecera del Cadete */}
                <div
                  onClick={() => setCadeteExpandido(esExpandido ? null : cadete.cadeteId)}
                  className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 font-black shadow-inner">
                      <Bike className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                          {cadete.cadeteNombre}
                        </h4>
                        {gpsInfo && (
                          <span className={`inline-flex items-center gap-1 text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${
                            gpsInfo.activo
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-950/20 dark:border-emerald-800 dark:text-emerald-400'
                              : 'bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${gpsInfo.activo ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                            {gpsInfo.activo ? `GPS Activo (${gpsInfo.hace})` : `Inactivo (${gpsInfo.hace})`}
                          </span>
                        )}
                        {cadete.alertasExcesoVelocidad > 0 && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-600 dark:bg-rose-950/30 dark:border-rose-900/40 dark:text-rose-400">
                            <AlertTriangle size={10} />
                            {cadete.alertasExcesoVelocidad} aviso(s) &gt;60 km/h
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {cadete.pedidosEntregados} entregas realizadas • {cadete.distanciaTotalKm} km recorridos
                      </p>
                    </div>
                  </div>

                  {/* Badges de Métricas Rápidas */}
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 shrink-0">
                    <div className="bg-slate-50 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700/60 rounded-xl px-3 py-1.5 text-center min-w-[90px]">
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                        Vel. Rodando
                      </span>
                      <div className="text-sm font-black text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-0.5">
                        <span>{cadete.velocidadMediaMovimiento}</span>
                        <span className="text-[10px] font-normal text-slate-400">km/h</span>
                      </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700/60 rounded-xl px-3 py-1.5 text-center min-w-[85px]">
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                        Vel. Máx
                      </span>
                      <div className="text-sm font-black text-slate-800 dark:text-slate-200 flex items-center justify-center gap-0.5">
                        <span>{cadete.velocidadMaximaPico}</span>
                        <span className="text-[10px] font-normal text-slate-400">km/h</span>
                      </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700/60 rounded-xl px-3 py-1.5 text-center min-w-[85px]">
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                        Prom. Viaje
                      </span>
                      <div className="text-sm font-black text-blue-600 dark:text-blue-400 flex items-center justify-center gap-0.5">
                        <span>{cadete.tiempoPromedioPorPedidoMinutos}</span>
                        <span className="text-[10px] font-normal text-slate-400">min</span>
                      </div>
                    </div>

                    <div className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                      {esExpandido ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </div>
                </div>

                {/* Sección Expandida con Gráfico de Tiempo y Pedidos */}
                {esExpandido && (
                  <div className="p-4 pt-0 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-4">
                    {/* Barra de Distribución: Rodando vs Esperando */}
                    <div className="bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 rounded-xl p-3.5 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          Distribución de Tiempo en Ruta:
                        </span>
                        <div className="flex items-center gap-3 text-[11px]">
                          <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            {cadete.ratioMovimientoPorcentaje}% en marcha
                          </span>
                          <span className="flex items-center gap-1.5 text-amber-500 dark:text-amber-400 font-bold">
                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                            {100 - cadete.ratioMovimientoPorcentaje}% en espera/puerta
                          </span>
                        </div>
                      </div>

                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden flex">
                        <div
                          className="bg-emerald-500 h-full transition-all duration-300"
                          style={{ width: `${cadete.ratioMovimientoPorcentaje}%` }}
                          title={`En marcha: ${cadete.ratioMovimientoPorcentaje}%`}
                        />
                        <div
                          className="bg-amber-400 h-full transition-all duration-300"
                          style={{ width: `${100 - cadete.ratioMovimientoPorcentaje}%` }}
                          title={`Detenido / Semáforos / Puerta: ${100 - cadete.ratioMovimientoPorcentaje}%`}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                        <span>Velocidad comercial total: <strong>{cadete.velocidadComercial} km/h</strong></span>
                        <span>Detenciones &gt; 3 min: <strong>{cadete.paradasLargasTotal}</strong></span>
                      </div>
                    </div>

                    {/* Lista de Pedidos Entregados por este Cadete */}
                    <div className="space-y-2">
                      <h5 className="text-xs font-black uppercase tracking-wider text-slate-400">
                        Historial de Viajes del Período ({pedidosDelCadete.length})
                      </h5>

                      {pedidosDelCadete.length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-2">
                          Sin pedidos individuales disponibles.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {pedidosDelCadete.map((p) => {
                            const tieneHistorial = Boolean(p.ruta_historial && Array.isArray(p.ruta_historial) && p.ruta_historial.length >= 2)
                            const telemetriaPedido = tieneHistorial && p.ruta_historial ? calcularTelemetriaRuta(p.ruta_historial, p) : null

                            return (
                              <div
                                key={p.id}
                                className="bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 rounded-xl p-3 flex items-center justify-between gap-2 shadow-2xs"
                              >
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                      #{p.id.slice(-5).toUpperCase()}
                                    </span>
                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                      {p.cliente}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                    {p.direccion}
                                  </p>
                                  {telemetriaPedido && (
                                    <div className="flex items-center gap-2.5 mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                                      <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                                        <Zap size={11} /> {telemetriaPedido.velocidadMediaMovimiento} km/h
                                      </span>
                                      <span className="flex items-center gap-1"><Navigation size={11} /> {telemetriaPedido.distanciaTotalKm} km</span>
                                      <span className="flex items-center gap-1"><Clock size={11} /> {Math.round(telemetriaPedido.duracionTotalSegundos / 60)} min</span>
                                    </div>
                                  )}
                                </div>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setPedidoParaModal(p)
                                  }}
                                  className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/40 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60 transition-colors cursor-pointer shrink-0"
                                  title="Ver recorrido y telemetría en mapa"
                                >
                                  <Eye size={13} />
                                  <span>Ver Ruta</span>
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Modal de Telemetría y Mapa de Ruta */}
      {pedidoParaModal && (
        <ModalBreadcrumbTrail
          pedido={pedidoParaModal}
          onCerrar={() => setPedidoParaModal(null)}
        />
      )}
    </div>
  )
}
