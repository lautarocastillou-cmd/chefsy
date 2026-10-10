'use client'

import { useEffect, useState, type ReactNode } from 'react'
import dynamic from 'next/dynamic'
import { CadeteData } from '@/components/torre-control/MapaGlobal'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { RefreshCw, Battery, MapPin, Zap, Navigation, PowerOff, Bike, Plus, Gauge, DollarSign, Radio, ListOrdered, ClipboardList, Activity, ChevronDown, Download } from 'lucide-react'
import { formatearPrecio, cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { usarPedidos } from '@/contexto/PedidosContexto'
import { usarAuth } from '@/contexto/AuthContexto'
import { esPedidoDelivery } from '@/lib/entrega'
import { UBICACION_LOCAL, calcularDistanciaKm } from '@/lib/ubicacion'
import PanelDiagnosticoGPS from '@/components/cadeteria/PanelDiagnosticoGPS'
import TarjetaPedidoCadete from '@/components/cadeteria/TarjetaPedidoCadete'
import InformeRendimientoCadetes from '@/components/cadeteria/InformeRendimientoCadetes'
import ModalCompartirUbicacion from '@/components/cadeteria/ModalCompartirUbicacion'
import ModalOrganizarRecorridoCadete, { ordenarPedidosPorCercaniaOManual } from '@/components/cadeteria/ModalOrganizarRecorridoCadete'
import { calcularVelocidadEnVivoKmH } from '@/lib/telemetriaCadetes'
import ModalPagoExtraCadete from '@/components/cadeteria/ModalPagoExtraCadete'
import { notificarError } from '@/lib/notificaciones'

// Cargar el mapa dinámicamente para evitar errores de SSR
const MapaGlobal = dynamic(
  () => import('@/components/torre-control/MapaGlobal'),
  { ssr: false, loading: () => <div className="w-full h-full bg-gray-100 flex items-center justify-center text-sm text-gray-500 font-medium">Cargando mapa en vivo...</div> }
)

const ModalBreadcrumbTrail = dynamic(
  () => import('@/components/cadeteria/ModalBreadcrumbTrail'),
  { ssr: false }
)

// ─────────────────────────────────────────────────────
// SeccionDesplegable: bloque colapsable para la info operativa
// migrada desde /cadeteria (GPS, recorridos, diagnóstico).
// ─────────────────────────────────────────────────────
function SeccionDesplegable({
  titulo,
  icono,
  insignia,
  abiertoPorDefecto = false,
  children,
}: {
  titulo: string
  icono: ReactNode
  insignia?: ReactNode
  abiertoPorDefecto?: boolean
  children: ReactNode
}) {
  const [abierto, setAbierto] = useState(false)
  useEffect(() => {
    setAbierto(abiertoPorDefecto)
  }, [abiertoPorDefecto])

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <Button
        type="button"
        variant="ghost"
        onClick={() => setAbierto((v) => !v)}
        className="w-full h-auto p-4 flex items-center justify-between gap-2 rounded-none hover:bg-gray-50 dark:hover:bg-slate-800/60"
        aria-expanded={abierto}
      >
        <span className="flex items-center gap-2 min-w-0">
          <span className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            {icono}
          </span>
          <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider truncate">
            {titulo}
          </span>
          {insignia}
        </span>
        <ChevronDown
          size={16}
          className={cn(
            "shrink-0 text-slate-400 transition-transform duration-300",
            abierto && "rotate-180"
          )}
        />
      </Button>
      <div
        className={cn(
          "grid transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
          abierto ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <div className="p-4 pt-0">{children}</div>
        </div>
      </div>
    </div>
  )
}

export default function TorreControlPage() {
  const [cadetes, setCadetes] = useState<CadeteData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const [apagandoId, setApagandoId] = useState<string | null>(null)
  const [pedidoParaBreadcrumb, setPedidoParaBreadcrumb] = useState<any | null>(null)
  const [modalPagoExtraAbierto, setModalPagoExtraAbierto] = useState(false)
  const [cadeteParaPagoExtra, setCadeteParaPagoExtra] = useState<string | null>(null)
  const [modalCompartirUbicacionAbierto, setModalCompartirUbicacionAbierto] = useState(false)
  const [vistaMobile, setVistaMobile] = useState<'mapa' | 'cadetes'>('mapa')
  const [mostrarReferenciasMobile, setMostrarReferenciasMobile] = useState(false)

  // Tabs de la Cadetería unificada.
  const [tabSuperior, setTabSuperior] = useState<'mapa' | 'repartos' | 'gps' | 'rendimiento'>('mapa')
  const [modalOrganizarAbierto, setModalOrganizarAbierto] = useState(false)
  const [cadeteParaOrganizar, setCadeteParaOrganizar] = useState<{ id: string; nombre: string; pedidos: any[] } | null>(null)
  const { pedidos, cambiarEstado } = usarPedidos()
  const { usuarioActivo } = usarAuth()
  const esAdmin = usuarioActivo?.rol === 'admin'

  // Estado GPS derivado de los datos que ya trae la torre (sin fetch extra)
  const estadoGps = cadetes.map((c) => {
    const updatedAt = c.updated_at ? new Date(c.updated_at).getTime() : 0
    const segundos = Math.floor((Date.now() - updatedAt) / 1000)
    const hace = segundos < 60 ? `${segundos}s` : segundos < 3600 ? `${Math.floor(segundos / 60)}min` : '+1h'
    return { id: c.id, nombre: c.nombre, activo: c.gps_activo, hace }
  })
  const gpsActivosCount = estadoGps.filter((e) => e.activo).length
  // Mismo formato que /cadeteria le pasaba al informe (sin fetch extra)
  const estadoGpsRecord: Record<string, { activo: boolean; hace: string }> = Object.fromEntries(
    estadoGps.map((e) => [e.id, { activo: e.activo, hace: e.hace }])
  )

  // Agrupar pedidos delivery activos por cadete (base para Repartos y Recorridos)
  const pedidosDeliveryActivos = pedidos.filter(
    (p) =>
      esPedidoDelivery(p) &&
      (p.estado === 'en_cocina' || p.estado === 'listo' || p.estado === 'en_camino')
  )
  const pedidosPorCadete = (() => {
    const mapa = new Map<string, { id: string; nombre: string; pedidos: typeof pedidosDeliveryActivos }>()
    for (const p of pedidosDeliveryActivos) {
      if (!p.cadete_id) continue
      const cid = p.cadete_id.toLowerCase()
      const actual = mapa.get(cid) || { id: p.cadete_id, nombre: p.cadete_nombre || p.cadete_id, pedidos: [] as typeof pedidosDeliveryActivos }
      actual.pedidos.push(p)
      mapa.set(cid, actual)
    }
    return Array.from(mapa.values())
  })()
  // Recorridos multi-pedido (2+ simultáneos)
  const recorridosMulti = pedidosPorCadete.filter((c) => c.pedidos.length >= 2)

  // Disparar resize para que Leaflet recalcule tiles al alternar a la pestaña Mapa
  useEffect(() => {
    if (vistaMobile === 'mapa') {
      const timer = setTimeout(() => {
        window.dispatchEvent(new Event('resize'))
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [vistaMobile])

  const cadetesActivosConGpsCount = cadetes.filter(
    (c) => c.gps_activo && c.lat != null && c.lng != null
  ).length

  const fetchTorreData = async () => {
    setIsRefreshing(true)
    try {
      const res = await fetch('/api/admin/torre-control')
      if (res.ok) {
        const data = await res.json()
        setCadetes(data)
        setLastUpdate(new Date())
      }
    } catch (error) {
      console.error('Error fetching torre control data:', error)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  // Polling cada 6 segundos con suspensión inteligente en segundo plano
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null

    const iniciarPolling = () => {
      if (intervalId) clearInterval(intervalId)
      fetchTorreData()
      intervalId = setInterval(fetchTorreData, 6000)
    }

    const detenerPolling = () => {
      if (intervalId) {
        clearInterval(intervalId)
        intervalId = null
      }
    }

    const handleVisibilidad = () => {
      if (document.hidden) {
        detenerPolling()
      } else {
        iniciarPolling()
      }
    }

    if (typeof document !== 'undefined') {
      if (!document.hidden) {
        iniciarPolling()
      }
      document.addEventListener('visibilitychange', handleVisibilidad)
    }

    return () => {
      detenerPolling()
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilidad)
      }
    }
  }, [])

  const handleApagarGps = async (e: React.MouseEvent, cadeteId: string, cadeteNombre: string) => {
    e.stopPropagation()
    const confirmar = window.confirm(`¿Estás seguro de que querés apagarle el GPS a ${cadeteNombre}? El cadete figurará desconectado de inmediato.`)
    if (!confirmar) return

    setApagandoId(cadeteId)
    try {
      const res = await fetch('/api/admin/torre-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cadeteId, accion: 'apagar_gps' })
      })
      if (res.ok) {
        setCadetes(prev => prev.map(c => c.id === cadeteId ? { ...c, gps_activo: false } : c))
        await fetchTorreData()
      } else {
        const err = await res.json().catch(() => ({}))
        notificarError(err.error || 'No se pudo apagar el GPS.')
      }
    } catch (error) {
      console.error('Error apagando GPS:', error)
      notificarError('Error de red al intentar apagar el GPS')
    } finally {
      setApagandoId(null)
    }
  }

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-slate-100 dark:bg-slate-950">
      {/* ── Tabs superiores de Cadetería ── */}
      <div className={cn(
        'z-30 flex items-end gap-1 overflow-x-auto scrollbar-none',
        tabSuperior === 'mapa'
          ? 'absolute left-1/2 top-3 max-w-[calc(100%-1.5rem)] -translate-x-1/2 rounded-xl border border-slate-200/80 bg-white/95 px-1 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/95'
          : 'relative shrink-0 border-b border-gray-200 bg-white/90 px-1 dark:border-slate-800 dark:bg-slate-950/90'
      )}>
        {(
          [
            { valor: 'mapa', etiqueta: 'Mapa en Vivo', icono: <Navigation className="w-3.5 h-3.5 text-emerald-600" /> },
            { valor: 'repartos', etiqueta: 'Repartos', icono: <ClipboardList className="w-3.5 h-3.5 text-slate-500" /> },
            { valor: 'gps', etiqueta: 'GPS y Recorridos', icono: <Radio className="w-3.5 h-3.5 text-slate-500" /> },
            { valor: 'rendimiento', etiqueta: 'Rendimiento', icono: <Activity className="w-3.5 h-3.5 text-slate-500" /> },
          ] as const
        ).map((tab) => (
          <Button
            key={tab.valor}
            type="button"
            variant="ghost"
            onClick={() => setTabSuperior(tab.valor)}
            className={cn(
              "h-auto p-0 px-4 pt-2 pb-1.5 mb-[-1px] font-semibold text-sm transition-all border-b-2 rounded-none inline-flex items-center gap-1.5 leading-none shrink-0",
              tabSuperior === tab.valor
                ? "border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-transparent hover:bg-transparent"
                : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-slate-200"
            )}
          >
            {tab.icono} {tab.etiqueta}
            {tab.valor === 'repartos' && pedidosDeliveryActivos.length > 0 && (
              <span className="text-[10px] font-black px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                {pedidosDeliveryActivos.length}
              </span>
            )}
            {tab.valor === 'gps' && estadoGps.length > 0 && (
              <span className="text-[10px] font-black px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                {gpsActivosCount}/{estadoGps.length}
              </span>
            )}
            {tab.valor === 'gps' && recorridosMulti.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title={`${recorridosMulti.length} recorrido(s) multi-pedido`} />
            )}
          </Button>
        ))}
      </div>

      {tabSuperior === 'mapa' && (
        <>
      {/* Selector de Pestañas Móvil */}
      <div className="absolute left-1/2 top-[3.7rem] z-30 flex w-[calc(100%-1.5rem)] -translate-x-1/2 items-center rounded-xl border border-gray-200 bg-white/95 p-1 shadow-lg backdrop-blur md:hidden dark:border-slate-700 dark:bg-slate-900/95">
        <button
          type="button"
          onClick={() => setVistaMobile('mapa')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            vistaMobile === 'mapa'
              ? 'bg-white text-gray-900 shadow-xs'
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          <Navigation className="w-3.5 h-3.5 text-emerald-600" />
          <span>Mapa en Vivo</span>
          {cadetesActivosConGpsCount > 0 && (
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          )}
        </button>
        <button
          type="button"
          onClick={() => setVistaMobile('cadetes')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            vistaMobile === 'cadetes'
              ? 'bg-white text-gray-900 shadow-xs'
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          <Bike className="w-3.5 h-3.5 text-slate-600" />
          <span>Cadetes</span>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-bold ml-1">
            {cadetes.length}
          </Badge>
        </button>
      </div>

      {/* Contenedor Principal (Lado a lado en Desktop, Pestaña activa en Móvil) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Sidebar: Lista de Cadetes */}
        <div className={`${vistaMobile === 'cadetes' ? 'flex' : 'hidden'} pointer-events-auto absolute bottom-3 left-3 top-[4.5rem] z-20 w-[min(22rem,calc(100%-1.5rem))] flex-col overflow-hidden rounded-2xl border border-gray-200/80 bg-gray-50/95 shadow-xl backdrop-blur md:flex dark:border-slate-700 dark:bg-slate-900/95`}>
          <div className="p-4 border-b border-gray-200 bg-white shrink-0">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
                <Zap className="h-5 w-5 text-emerald-500" />
              Cadetería
            </h1>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setCadeteParaPagoExtra(null)
                  setModalPagoExtraAbierto(true)
                }}
                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm transition-all active:scale-95 cursor-pointer"
                title="Registrar viaje a la carnicería, insumos o pago extra"
              >
                <Plus size={14} />
                <span>+ Pago Extra</span>
              </button>
              <button
                type="button"
                onClick={() => setModalCompartirUbicacionAbierto(true)}
                className="p-2 text-sky-600 hover:text-sky-700 rounded-full hover:bg-sky-50 transition-colors"
                title="Compartir ubicación en vivo de un cadete sin necesidad de login"
              >
                <Radio size={16} className="animate-pulse" />
              </button>
              <a
                href="/api/cadeteria/descargar-apk"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-gray-500 hover:text-gray-900 rounded-full hover:bg-gray-100 transition-colors"
                title="Descargar última versión APK de Cadetería"
              >
                <Download size={16} />
              </a>
              <button
                onClick={fetchTorreData}
                disabled={isRefreshing}
                className={`p-2 text-gray-500 hover:text-gray-900 rounded-full hover:bg-gray-100 transition-colors ${
                  isRefreshing ? 'animate-spin' : ''
                }`}
                title="Actualizar ahora"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-500">
            Monitoreo en vivo de cadetes y entregas. Actualizado:{' '}
            <span className="font-semibold text-gray-700">{lastUpdate.toLocaleTimeString()}</span>
          </p>
        </div>

        <ScrollArea className="flex-1 p-3 min-h-0">
          <div className="space-y-3">
            {isLoading && cadetes.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm animate-pulse">
                Cargando estado de cadetes...
              </div>
            ) : cadetes.length === 0 ? (
              <div className="text-center py-8">
                <MapPin className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">No hay cadetes registrados en el sistema.</p>
              </div>
            ) : (
              cadetes.map((cadete) => {
                const isSelected = focusedId === cadete.id
                const velKmH = cadete.gps_activo ? calcularVelocidadEnVivoKmH(cadete.speed) : 0
                return (
                  <Card
                    key={cadete.id}
                    onClick={() => {
                      setFocusedId(cadete.id)
                      if (typeof window !== 'undefined' && window.innerWidth < 768) {
                        setVistaMobile('mapa')
                      }
                    }}
                    className={`overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer border ${
                      isSelected ? 'border-blue-500 ring-2 ring-blue-200 bg-blue-50/20' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className={`h-1.5 w-full ${cadete.pedidoActivo ? 'bg-orange-500' : 'bg-emerald-500'}`} />
                    <CardContent className="p-3.5">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-bold text-gray-900 text-sm line-clamp-1 flex-1 pr-2 flex items-center gap-1.5">
                          <Bike className="w-4 h-4 text-slate-500 shrink-0" />
                          <span>{cadete.nombre}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                          {cadete.gps_activo && (
                            <Badge
                              variant="secondary"
                              className={`flex items-center gap-1 text-[10px] px-1.5 py-0 font-bold ${
                                velKmH >= 4
                                  ? velKmH > 60
                                    ? 'bg-red-100 text-red-800'
                                    : velKmH > 40
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              <Gauge className="h-3 w-3" />
                              {velKmH} km/h
                            </Badge>
                          )}
                          {cadete.bateria != null && (
                            <Badge
                              variant="secondary"
                              className={`flex items-center gap-1 text-[10px] px-1.5 py-0 font-bold ${
                                cadete.bateria > 20 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'
                              }`}
                            >
                              <Battery className="h-3 w-3" />
                              {Math.round(cadete.bateria)}%
                            </Badge>
                          )}
                          <Badge
                            variant="secondary"
                            className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0 ${
                              cadete.gps_activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            {cadete.gps_activo ? 'Online' : 'Offline'}
                          </Badge>
                        </div>
                      </div>

                      <div className="text-xs">
                        {(cadete.pedidosActivos && cadete.pedidosActivos.length > 0) ? (
                          <div className="bg-orange-50 border border-orange-200 rounded-lg p-2.5 space-y-2">
                            <div className="text-orange-700 font-black text-[11px] flex items-center justify-between">
                              <span>EN VIAJE ({cadete.pedidosActivos.length} {cadete.pedidosActivos.length === 1 ? 'PEDIDO' : 'PEDIDOS'})</span>
                              <span className="text-gray-900 font-black">
                                {formatearPrecio(cadete.pedidosActivos.reduce((acc, p) => acc + (p.total || 0), 0))}
                              </span>
                            </div>
                            <div className="space-y-1.5 divide-y divide-orange-100">
                              {cadete.pedidosActivos.map((p, idx) => (
                                <div key={p.id} className={idx > 0 ? 'pt-1.5' : ''}>
                                  <div className="flex items-center justify-between">
                                    <p className="text-gray-800 font-medium text-xs">
                                      <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-1.5 py-0.5 rounded-md mr-1">
                                        #{p.parada_num || idx + 1}
                                      </span>
                                      <span className="font-bold">{p.cliente}</span>
                                    </p>
                                    <span className="text-[10px] font-black uppercase text-orange-600">
                                      {p.estado}
                                    </span>
                                  </div>
                                  {p.direccion ? (
                                    <p className="text-gray-600 text-[11px] flex items-start gap-1 mt-0.5">
                                      <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                                      <span className="line-clamp-1">{p.direccion}</span>
                                    </p>
                                  ) : null}
                                </div>
                              ))}
                            </div>

                            {/* Botón de Breadcrumb Trail (Repetición de Ruta) */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setPedidoParaBreadcrumb({
                                  ...cadete.pedidosActivos![0],
                                  cadete_nombre: cadete.nombre,
                                  cadete_id: cadete.id,
                                })
                              }}
                              className="w-full mt-2 py-1.5 px-3 bg-purple-100/80 hover:bg-purple-200/90 active:bg-purple-300 text-purple-900 border border-purple-300 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                            >
                              <Bike className="h-3.5 w-3.5 text-purple-700" />
                              <span>Ver Trayectoria (Breadcrumb)</span>
                            </button>
                          </div>
                        ) : cadete.pedidoActivo ? (
                          <div className="bg-orange-50 border border-orange-200 rounded-lg p-2.5 space-y-1">
                            <div className="text-orange-700 font-black text-[11px] flex items-center justify-between">
                              <span>EN VIAJE ({cadete.pedidoActivo.estado.toUpperCase()})</span>
                              {cadete.pedidoActivo.total ? (
                                <span className="text-gray-900 font-black">{formatearPrecio(cadete.pedidoActivo.total)}</span>
                              ) : null}
                            </div>
                            <p className="text-gray-800 font-medium text-xs">
                              Cliente: <span className="font-bold">{cadete.pedidoActivo.cliente}</span>
                            </p>
                            {cadete.pedidoActivo.direccion ? (
                              <p className="text-gray-600 text-[11px] flex items-start gap-1">
                                <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                                <span className="line-clamp-2">{cadete.pedidoActivo.direccion}</span>
                              </p>
                            ) : null}

                            {/* Botón de Breadcrumb Trail (Repetición de Ruta) */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setPedidoParaBreadcrumb({
                                  ...cadete.pedidoActivo,
                                  cadete_nombre: cadete.nombre,
                                  cadete_id: cadete.id,
                                })
                              }}
                              className="w-full mt-2 py-1.5 px-3 bg-purple-100/80 hover:bg-purple-200/90 active:bg-purple-300 text-purple-900 border border-purple-300 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                            >
                              <Bike className="h-3.5 w-3.5 text-purple-700" />
                              <span>Ver Trayectoria (Breadcrumb)</span>
                            </button>
                          </div>
                        ) : (
                          <div className="bg-emerald-50/60 border border-emerald-100 rounded-lg p-2 flex items-center justify-between text-emerald-700">
                            <span className="font-bold text-[11px]">DISPONIBLE</span>
                            <span className="text-[11px] text-gray-500">En espera</span>
                          </div>
                        )}
                      </div>

                      <Separator className="my-2.5" />

                      <div className="flex justify-between items-center text-[10px] text-gray-400">
                        <span>Señal: {cadete.updated_at ? new Date(cadete.updated_at).toLocaleTimeString() : 'Sin señal'}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setFocusedId(cadete.id)
                            setVistaMobile('mapa')
                          }}
                          className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Navigation className="h-3 w-3" />
                          <span>Ver en mapa</span>
                        </button>
                      </div>

                      {/* Botones de acción del Cadete */}
                      <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setCadeteParaPagoExtra(cadete.id)
                            setModalPagoExtraAbierto(true)
                          }}
                          className="flex-1 py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-800 border border-emerald-200 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-xs"
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                          <span>Viaje Extra</span>
                        </button>

                        {cadete.gps_activo && (
                          <button
                            type="button"
                            disabled={apagandoId === cadete.id}
                            onClick={(e) => handleApagarGps(e, cadete.id, cadete.nombre)}
                            className="py-1.5 px-2.5 bg-red-50 hover:bg-red-100 active:bg-red-200 text-red-700 border border-red-200 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-colors disabled:opacity-50 cursor-pointer shadow-xs shrink-0"
                            title="Apagar GPS manualmente"
                          >
                            <PowerOff className={`h-3 w-3 ${apagandoId === cadete.id ? 'animate-spin' : ''}`} />
                            <span>{apagandoId === cadete.id ? 'Apagando...' : 'Apagar GPS'}</span>
                          </button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main Area: Mapa */}
      <div className={`${vistaMobile === 'mapa' ? 'flex' : 'hidden'} pointer-events-auto absolute inset-0 z-0 flex-col`}>
        <MapaGlobal cadetes={cadetes} focusedId={focusedId} onSelectCadete={setFocusedId} />

        {/* Botón flotante para alternar referencias en móvil */}
        <button
          type="button"
          onClick={() => setMostrarReferenciasMobile(!mostrarReferenciasMobile)}
          className="sm:hidden absolute bottom-4 left-4 z-[500] px-2.5 py-1.5 bg-white dark:bg-slate-900 rounded-xl shadow-md border border-gray-200 dark:border-slate-800 text-[11px] font-bold text-gray-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer"
        >
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>{mostrarReferenciasMobile ? 'Ocultar Referencias' : 'Referencias'}</span>
        </button>

        {/* Overlay Legend */}
        <div className={`${mostrarReferenciasMobile ? 'block' : 'hidden sm:block'} absolute bottom-14 left-4 sm:left-auto sm:bottom-6 sm:right-6 z-[500] bg-white dark:bg-slate-900 p-3 rounded-xl shadow-xl border border-gray-200 dark:border-slate-800 text-xs space-y-2 pointer-events-auto sm:pointer-events-none transition-all`}>
          <div className="font-bold text-gray-800 text-[11px] uppercase tracking-wider mb-1 border-b pb-1">
            Referencias en Mapa
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm"></div>
            <span className="text-gray-700 font-medium text-[11px]">Cadete Disponible</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-sm"></div>
            <span className="text-gray-700 font-medium text-[11px]">Cadete en Viaje</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-600 shadow-sm"></div>
            <span className="text-gray-700 font-medium text-[11px]">Destino Cliente</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-600 shadow-sm"></div>
            <span className="text-gray-700 font-medium text-[11px]">Local Chefsy</span>
          </div>
        </div>
      </div>
    </div>
        </>
      )}

      {/* ── Tab GPS y Recorridos: info migrada desde /cadeteria (Fase 1) ── */}
      {tabSuperior === 'gps' && (
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="max-w-3xl mx-auto w-full space-y-3 p-1">
            <SeccionDesplegable
              titulo="Estado GPS Cadetes"
              icono={<Radio size={15} />}
              abiertoPorDefecto
              insignia={
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                  {gpsActivosCount}/{estadoGps.length} activos
                </span>
              }
            >
              {estadoGps.length === 0 ? (
                <p className="text-xs text-gray-500">No hay cadetes registrados en el sistema.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {estadoGps.map((e) => (
                    <div
                      key={e.id}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                        e.activo
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30"
                          : "bg-red-50 text-red-600 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30"
                      )}
                    >
                      <span className={cn(
                        "h-2 w-2 rounded-full shrink-0",
                        e.activo ? "bg-emerald-500 animate-pulse" : "bg-red-500"
                      )} />
                      <span>{e.nombre}</span>
                      <span className="opacity-60 text-[10px]">
                        {e.activo ? `hace ${e.hace}` : `Sin señal (${e.hace})`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </SeccionDesplegable>

            <SeccionDesplegable
              titulo="Recorridos Activos (Multi-Pedidos)"
              icono={<ListOrdered size={15} />}
              abiertoPorDefecto={recorridosMulti.length > 0}
              insignia={
                recorridosMulti.length > 0 ? (
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                    {recorridosMulti.length} cadete(s)
                  </span>
                ) : undefined
              }
            >
              {recorridosMulti.length === 0 ? (
                <p className="text-xs text-gray-500">Ningún cadete lleva 2 o más pedidos simultáneos ahora mismo.</p>
              ) : (
                <div className="space-y-2">
                  {recorridosMulti.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between gap-2 p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Bike size={16} className="text-emerald-600 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                            {c.nombre}
                          </p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">
                            {c.pedidos.length} pedidos simultáneos en curso
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          setCadeteParaOrganizar(c)
                          setModalOrganizarAbierto(true)
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs shrink-0"
                      >
                        <ListOrdered size={13} />
                        <span>Acomodar turno</span>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </SeccionDesplegable>

            <SeccionDesplegable
              titulo="Diagnóstico GPS Detallado"
              icono={<Activity size={15} />}
            >
              <PanelDiagnosticoGPS />
            </SeccionDesplegable>
          </div>
        </div>
      )}

      {/* ── Tab Repartos: lista migrada desde /cadeteria (Fase 2) ── */}
      {tabSuperior === 'repartos' && (
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="max-w-xl mx-auto w-full space-y-4 p-1">
            <div className="flex items-center gap-2.5 px-1">
              <div className="p-2 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl shrink-0">
                <Bike size={18} />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-800 dark:text-slate-100 leading-tight">
                  Repartos Activos ({pedidosDeliveryActivos.length})
                </h2>
                <p className="text-[11px] text-gray-400 dark:text-slate-400">
                  Pedidos delivery asignados y listos para reparto
                </p>
              </div>
            </div>
            {pedidosDeliveryActivos.length === 0 ? (
              <div className="text-center py-20 text-gray-400 text-sm">
                No hay pedidos delivery para repartir en este momento.
              </div>
            ) : (
              pedidosDeliveryActivos.map((pedido) => {
                const infoCadete = pedido.cadete_id
                  ? pedidosPorCadete.find(c => c.id.toLowerCase() === pedido.cadete_id?.toLowerCase())
                  : null
                const ordenadosCadete = infoCadete ? ordenarPedidosPorCercaniaOManual(infoCadete.pedidos) : []
                const pos = ordenadosCadete.findIndex(p => p.id === pedido.id) + 1
                const dist = pedido.coordenadas ? calcularDistanciaKm(UBICACION_LOCAL, pedido.coordenadas) : null
                const distTxt = dist !== null ? (dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`) : undefined

                return (
                  <TarjetaPedidoCadete
                    key={pedido.id}
                    pedido={pedido}
                    cambiarEstado={cambiarEstado}
                    esAdmin={esAdmin}
                    posicionParada={pos > 0 ? pos : undefined}
                    totalParadas={ordenadosCadete.length > 1 ? ordenadosCadete.length : undefined}
                    distanciaLocalTexto={distTxt}
                    onAbrirOrganizar={() => {
                      if (infoCadete) {
                        setCadeteParaOrganizar(infoCadete)
                        setModalOrganizarAbierto(true)
                      }
                    }}
                  />
                )
              })
            )}
          </div>
        </div>
      )}

      {/* ── Tab Rendimiento: informe migrado desde /cadeteria (Fase 3) ── */}
      {tabSuperior === 'rendimiento' && (
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="max-w-5xl mx-auto w-full space-y-4 p-1 sm:px-3">
            <InformeRendimientoCadetes
              pedidosEnVivo={pedidos}
              estadoGpsCadetes={estadoGpsRecord}
            />
          </div>
        </div>
      )}

      {/* Modal Compartir Ubicación en Vivo (migrado desde /cadeteria) */}
      <ModalCompartirUbicacion
        abierto={modalCompartirUbicacionAbierto}
        onClose={() => setModalCompartirUbicacionAbierto(false)}
      />

      {/* Modal Organizar / Acomodar Recorrido de Cadete (migrado desde /cadeteria) */}
      {cadeteParaOrganizar && (
        <ModalOrganizarRecorridoCadete
          abierto={modalOrganizarAbierto}
          onCerrar={() => {
            setModalOrganizarAbierto(false)
            setCadeteParaOrganizar(null)
          }}
          cadeteId={cadeteParaOrganizar.id}
          cadeteNombre={cadeteParaOrganizar.nombre}
          pedidos={cadeteParaOrganizar.pedidos}
        />
      )}

      {/* Modal Interactivo de Repetición de Ruta (Breadcrumb Trail) */}
      {pedidoParaBreadcrumb && (
        <ModalBreadcrumbTrail
          pedido={pedidoParaBreadcrumb}
          onCerrar={() => setPedidoParaBreadcrumb(null)}
        />
      )}

      {/* Modal Sumar Dinero / Viaje Extra al Cadete */}
      <ModalPagoExtraCadete
        abierto={modalPagoExtraAbierto}
        onCerrar={() => {
          setModalPagoExtraAbierto(false)
          setCadeteParaPagoExtra(null)
        }}
        cadetesDisponibles={cadetes.map(c => ({ id: c.id, nombre: c.nombre }))}
        cadetePreseleccionadoId={cadeteParaPagoExtra}
        onGuardado={() => {
          fetchTorreData()
        }}
      />
    </div>
  )
}
