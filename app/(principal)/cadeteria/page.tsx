'use client'

import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import dynamic from 'next/dynamic'
import { CadeteData } from '@/components/torre-control/MapaGlobal'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { RefreshCw, MapPin, Zap, Navigation, PowerOff, Bike, Plus, DollarSign, Radio, ClipboardList, Activity, ChevronDown, Download, ArrowUp, ArrowDown, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { usarPedidos } from '@/contexto/PedidosContexto'
import { esPedidoDelivery } from '@/lib/entrega'
import { UBICACION_LOCAL, calcularDistanciaKm } from '@/lib/ubicacion'
import { ordenarPedidosPorCercaniaOManual } from '@/components/cadeteria/ModalOrganizarRecorridoCadete'
import { notificarError } from '@/lib/notificaciones'

// Cargar el mapa dinámicamente para evitar errores de SSR
const MapaGlobal = dynamic(
  () => import('@/components/torre-control/MapaGlobal'),
  { ssr: false, loading: () => <div className="w-full h-full bg-gray-100 flex items-center justify-center text-sm text-gray-500 font-medium">Cargando mapa en vivo...</div> }
)
const MapaGlobalMemo = memo(MapaGlobal)

const PanelDiagnosticoGPS = dynamic(() => import('@/components/cadeteria/PanelDiagnosticoGPS'), { ssr: false })
const InformeRendimientoCadetes = dynamic(() => import('@/components/cadeteria/InformeRendimientoCadetes'), { ssr: false })
const ModalCompartirUbicacion = dynamic(() => import('@/components/cadeteria/ModalCompartirUbicacion'), { ssr: false })
const ModalPagoExtraCadete = dynamic(() => import('@/components/cadeteria/ModalPagoExtraCadete'), { ssr: false })
const TarjetaPedidoCadete = dynamic(() => import('@/components/cadeteria/TarjetaPedidoCadete'), { ssr: false })

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

function firmarCadetes(cadetes: CadeteData[]) {
  return cadetes.map((cadete) => [
    cadete.id,
    cadete.lat,
    cadete.lng,
    cadete.speed,
    cadete.heading,
    cadete.gps_activo,
    cadete.bateria,
    cadete.updated_at,
    cadete.pedidoActivo?.id,
    cadete.pedidosActivos?.map((pedido) => `${pedido.id}:${pedido.parada_num ?? ''}:${pedido.orden_entrega ?? ''}`).join(','),
  ].join(':')).join('|')
}

export default function TorreControlPage() {
  const [cadetes, setCadetes] = useState<CadeteData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const [apagandoId, setApagandoId] = useState<string | null>(null)
  const [pedidoParaBreadcrumb, setPedidoParaBreadcrumb] = useState<any | null>(null)
  const [modalPagoExtraAbierto, setModalPagoExtraAbierto] = useState(false)
  const [cadeteParaPagoExtra, setCadeteParaPagoExtra] = useState<string | null>(null)
  const [modalCompartirUbicacionAbierto, setModalCompartirUbicacionAbierto] = useState(false)
  const [vistaMobile, setVistaMobile] = useState<'mapa' | 'cadetes'>('mapa')

  // Tabs de la Cadetería unificada.
  const [tabSuperior, setTabSuperior] = useState<'mapa' | 'repartos' | 'gps' | 'rendimiento'>('mapa')
  const [pedidoArrastrado, setPedidoArrastrado] = useState<{ cadeteId: string; pedidoId: string } | null>(null)
  const [guardandoOrdenCadete, setGuardandoOrdenCadete] = useState<string | null>(null)
  const [modoBajoConsumo, setModoBajoConsumo] = useState(false)
  const firmaCadetesRef = useRef('')
  const consultaEnCursoRef = useRef(false)
  const { pedidos, cambiarEstado, reordenarPedidosCadete } = usarPedidos()

  // Estado GPS derivado de los datos que ya trae la torre (sin fetch extra)
  useEffect(() => {
    const parametros = new URLSearchParams(window.location.search)
    const memoria = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
    const lento = parametros.get('rendimiento') === 'extremo' ||
      navigator.hardwareConcurrency <= 2 ||
      (memoria != null && memoria <= 2) ||
      Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData)
    setModoBajoConsumo(lento)
  }, [])

  const estadoGps = useMemo(() => cadetes.map((c) => {
    const updatedAt = c.updated_at ? new Date(c.updated_at).getTime() : 0
    const segundos = Math.floor((Date.now() - updatedAt) / 1000)
    const hace = segundos < 60 ? `${segundos}s` : segundos < 3600 ? `${Math.floor(segundos / 60)}min` : '+1h'
    return { id: c.id, nombre: c.nombre, activo: c.gps_activo, hace }
  }), [cadetes])
  const gpsActivosCount = useMemo(() => estadoGps.filter((e) => e.activo).length, [estadoGps])
  // Mismo formato que /cadeteria le pasaba al informe (sin fetch extra)
  const estadoGpsRecord: Record<string, { activo: boolean; hace: string }> = useMemo(
    () => Object.fromEntries(estadoGps.map((e) => [e.id, { activo: e.activo, hace: e.hace }])),
    [estadoGps]
  )

  // Agrupar pedidos delivery activos por cadete (base para Repartos y Recorridos)
  const pedidosDeliveryActivos = useMemo(() => pedidos.filter(
    (p) => esPedidoDelivery(p) && (p.estado === 'en_cocina' || p.estado === 'listo' || p.estado === 'en_camino')
  ), [pedidos])
  const pedidosPorCadete = useMemo(() => {
    const mapa = new Map<string, { id: string; nombre: string; pedidos: typeof pedidosDeliveryActivos }>()
    for (const p of pedidosDeliveryActivos) {
      if (!p.cadete_id) continue
      const cid = p.cadete_id.toLowerCase()
      const actual = mapa.get(cid) || { id: p.cadete_id, nombre: p.cadete_nombre || p.cadete_id, pedidos: [] as typeof pedidosDeliveryActivos }
      actual.pedidos.push(p)
      mapa.set(cid, actual)
    }
    return Array.from(mapa.values())
  }, [pedidosDeliveryActivos])
  // Recorridos multi-pedido (2+ simultáneos)
  const recorridosMulti = useMemo(() => pedidosPorCadete.filter((c) => c.pedidos.length >= 2), [pedidosPorCadete])
  const pedidosOrdenadosPorCadete = useMemo(
    () => new Map(pedidosPorCadete.map((grupo) => [grupo.id.toLowerCase(), ordenarPedidosPorCercaniaOManual(grupo.pedidos)])),
    [pedidosPorCadete]
  )

  // Disparar resize para que Leaflet recalcule tiles al alternar a la pestaña Mapa
  useEffect(() => {
    if (vistaMobile === 'mapa') {
      const timer = setTimeout(() => {
        window.dispatchEvent(new Event('resize'))
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [vistaMobile])

  const cadetesActivosConGpsCount = useMemo(
    () => cadetes.filter((c) => c.gps_activo && c.lat != null && c.lng != null).length,
    [cadetes]
  )

  const fetchTorreData = useCallback(async (mostrarCarga = false) => {
    if (consultaEnCursoRef.current) return
    consultaEnCursoRef.current = true
    if (mostrarCarga) setIsRefreshing(true)
    try {
      const res = await fetch('/api/admin/torre-control', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json() as CadeteData[]
        const firma = firmarCadetes(data)
        if (firma !== firmaCadetesRef.current) {
          firmaCadetesRef.current = firma
          setCadetes(data)
        }
      }
    } catch (error) {
      console.error('Error fetching torre control data:', error)
    } finally {
      consultaEnCursoRef.current = false
      setIsLoading(false)
      if (mostrarCarga) setIsRefreshing(false)
    }
  }, [])

  // Polling cada 6 segundos con suspensión inteligente en segundo plano
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null

      const iniciarPolling = () => {
        if (intervalId) clearInterval(intervalId)
        void fetchTorreData()
        intervalId = setInterval(() => void fetchTorreData(), modoBajoConsumo ? 15000 : 6000)
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
  }, [fetchTorreData, modoBajoConsumo])

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

  const guardarOrden = async (cadeteId: string, pedidosOrdenados: typeof pedidosDeliveryActivos) => {
    setGuardandoOrdenCadete(cadeteId)
    try {
      await reordenarPedidosCadete(cadeteId, pedidosOrdenados.map((pedido, indice) => ({
        id: pedido.id,
        orden_entrega: indice + 1,
      })))
    } finally {
      setGuardandoOrdenCadete(null)
    }
  }

  const moverPedidoEnRuta = (cadeteId: string, pedidosRuta: typeof pedidosDeliveryActivos, indice: number, destino: number) => {
    if (destino < 0 || destino >= pedidosRuta.length) return
    const nuevaLista = [...pedidosRuta]
    const [movido] = nuevaLista.splice(indice, 1)
    nuevaLista.splice(destino, 0, movido)
    void guardarOrden(cadeteId, nuevaLista)
  }

  const soltarPedidoEnRuta = (cadeteId: string, pedidosRuta: typeof pedidosDeliveryActivos, pedidoDestinoId: string) => {
    if (!pedidoArrastrado || pedidoArrastrado.cadeteId !== cadeteId || pedidoArrastrado.pedidoId === pedidoDestinoId) return
    const origen = pedidosRuta.findIndex((pedido) => pedido.id === pedidoArrastrado.pedidoId)
    const destino = pedidosRuta.findIndex((pedido) => pedido.id === pedidoDestinoId)
    if (origen >= 0 && destino >= 0) moverPedidoEnRuta(cadeteId, pedidosRuta, origen, destino)
    setPedidoArrastrado(null)
  }

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-slate-100 dark:bg-slate-950">
      {/* ── Tabs superiores de Cadetería ── */}
      <div className={cn(
        'z-30 flex items-end justify-center gap-1 overflow-x-auto scrollbar-none',
        tabSuperior === 'mapa'
          ? 'absolute left-1/2 top-3 max-w-[calc(100%-1.5rem)] -translate-x-1/2 rounded-xl border border-slate-200/80 bg-white/95 px-1 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/95'
          : 'relative w-full shrink-0 border-b border-gray-200 bg-white/90 px-1 dark:border-slate-800 dark:bg-slate-950/90'
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
        <div className={`${vistaMobile === 'cadetes' ? 'flex' : 'hidden'} pointer-events-auto absolute bottom-3 left-3 top-[4.5rem] z-20 w-[min(22rem,calc(100%-1.5rem))] flex-col overflow-hidden rounded-2xl border border-gray-200/80 bg-gray-50/95 shadow-xl backdrop-blur md:left-24 md:flex dark:border-slate-700 dark:bg-slate-900/95`}>
          <div className="border-b border-slate-200 bg-white px-3 py-3 shrink-0 dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h1 className="flex items-center gap-1.5 text-base font-black text-slate-900 dark:text-slate-100">
                  <Zap className="h-4 w-4 shrink-0 text-emerald-500" />
                  Cadetería
                </h1>
                <p className="mt-0.5 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                  {cadetes.length} cadetes · {pedidosDeliveryActivos.length} pedidos activos
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setCadeteParaPagoExtra(null)
                  setModalPagoExtraAbierto(true)
                }}
                className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2 py-1.5 text-[10px] font-extrabold text-white shadow-sm transition-all hover:bg-emerald-500 active:scale-95 cursor-pointer"
                title="Registrar viaje a la carnicería, insumos o pago extra"
              >
                <Plus size={14} />
                <span>Pago extra</span>
              </button>
              <button
                type="button"
                onClick={() => setModalCompartirUbicacionAbierto(true)}
                className="rounded-lg p-1.5 text-sky-600 transition-colors hover:bg-sky-50 hover:text-sky-700"
                title="Compartir ubicación en vivo de un cadete sin necesidad de login"
              >
                <Radio size={16} className="animate-pulse" />
              </button>
              <a
                href="/api/cadeteria/descargar-apk"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                title="Descargar última versión APK de Cadetería"
              >
                <Download size={16} />
              </a>
              <button
                onClick={() => void fetchTorreData(true)}
                disabled={isRefreshing}
                className={`rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 ${
                  isRefreshing ? 'animate-spin' : ''
                }`}
                title="Actualizar ahora"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
              </div>
            </div>
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
                const pedidosRuta = pedidosOrdenadosPorCadete.get(cadete.id.toLowerCase()) ?? []
                const puedeEditarRuta = pedidosRuta.length > 1
                return (
                  <Card
                    key={cadete.id}
                    onClick={() => {
                      setFocusedId(cadete.id)
                      if (typeof window !== 'undefined' && window.innerWidth < 768) setVistaMobile('mapa')
                    }}
                    className={cn(
                      'overflow-hidden rounded-xl border bg-white shadow-sm transition-all hover:shadow-md dark:bg-slate-950',
                      isSelected ? 'border-blue-400 ring-2 ring-blue-100 dark:ring-blue-950' : 'border-slate-200 dark:border-slate-800'
                    )}
                  >
                    <div className={cn('h-1', pedidosRuta.length > 0 ? 'bg-orange-500' : 'bg-emerald-500')} />
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <Bike className="h-4 w-4 shrink-0 text-slate-500" />
                          <span className="truncate text-sm font-extrabold text-slate-900 dark:text-slate-100">{cadete.nombre}</span>
                        </div>
                        <Badge variant="secondary" className={cn('shrink-0 px-1.5 py-0 text-[9px] font-black uppercase tracking-wide', cadete.gps_activo ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400')}>
                          {cadete.gps_activo ? 'Online' : 'Offline'}
                        </Badge>
                      </div>

                      {pedidosRuta.length > 0 ? (
                        <div className="mt-2 rounded-lg border border-orange-200 bg-orange-50/70 p-2 dark:border-orange-900/50 dark:bg-orange-950/20">
                          <div className="mb-1.5 flex items-center justify-between gap-2">
                            <span className="text-[10px] font-black uppercase tracking-wide text-orange-700 dark:text-orange-300">
                              {pedidosRuta.length} {pedidosRuta.length === 1 ? 'entrega' : 'entregas'} en ruta
                            </span>
                            {puedeEditarRuta && guardandoOrdenCadete === cadete.id && (
                              <span className="text-[10px] font-bold text-orange-700 dark:text-orange-300">Guardando…</span>
                            )}
                          </div>
                          <div className="space-y-1">
                            {pedidosRuta.map((pedido, idx) => (
                              <div
                                key={pedido.id}
                                draggable={puedeEditarRuta}
                                onDragStart={() => setPedidoArrastrado({ cadeteId: cadete.id, pedidoId: pedido.id })}
                                onDragEnd={() => setPedidoArrastrado(null)}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={() => soltarPedidoEnRuta(cadete.id, pedidosRuta, pedido.id)}
                                className={cn(
                                  'group flex items-center gap-1 text-[11px] text-slate-700 dark:text-slate-200',
                                  puedeEditarRuta && 'cursor-grab active:cursor-grabbing',
                                  pedidoArrastrado?.pedidoId === pedido.id && 'opacity-40'
                                )}
                              >
                                <GripVertical className="h-3.5 w-3.5 shrink-0 text-orange-300 opacity-0 transition-opacity group-hover:opacity-100" />
                                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white font-black text-orange-700 shadow-sm dark:bg-slate-900 dark:text-orange-300">{idx + 1}</span>
                                <span className="min-w-0 flex-1 truncate font-semibold">{pedido.cliente}</span>
                                {puedeEditarRuta && (
                                  <span className="flex shrink-0 items-center gap-0.5 opacity-70">
                                    <button
                                      type="button"
                                      aria-label={`Subir ${pedido.cliente}`}
                                      disabled={idx === 0 || guardandoOrdenCadete === cadete.id}
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        moverPedidoEnRuta(cadete.id, pedidosRuta, idx, idx - 1)
                                      }}
                                      className="rounded p-0.5 text-orange-700 hover:bg-orange-200 disabled:opacity-20 dark:text-orange-300 dark:hover:bg-orange-900/50"
                                    >
                                      <ArrowUp className="h-3 w-3" />
                                    </button>
                                    <button
                                      type="button"
                                      aria-label={`Bajar ${pedido.cliente}`}
                                      disabled={idx === pedidosRuta.length - 1 || guardandoOrdenCadete === cadete.id}
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        moverPedidoEnRuta(cadete.id, pedidosRuta, idx, idx + 1)
                                      }}
                                      className="rounded p-0.5 text-orange-700 hover:bg-orange-200 disabled:opacity-20 dark:text-orange-300 dark:hover:bg-orange-900/50"
                                    >
                                      <ArrowDown className="h-3 w-3" />
                                    </button>
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2 flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50/70 px-2.5 py-2 text-[10px] dark:border-emerald-900/50 dark:bg-emerald-950/20">
                          <span className="font-black uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Disponible</span>
                          <span className="text-slate-500 dark:text-slate-400">Sin entregas</span>
                        </div>
                      )}

                      <div className="mt-2 flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setFocusedId(cadete.id)
                            setVistaMobile('mapa')
                          }}
                          className="flex-1 rounded-lg border border-blue-200 bg-blue-50 px-2 py-1.5 text-[10px] font-extrabold text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300"
                        >
                          <Navigation className="mr-1 inline h-3 w-3" /> Ver mapa
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setCadeteParaPagoExtra(cadete.id)
                            setModalPagoExtraAbierto(true)
                          }}
                          className="flex-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-[10px] font-extrabold text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300"
                        >
                          <DollarSign className="mr-1 inline h-3 w-3" /> Extra
                        </button>
                        {cadete.gps_activo && (
                          <button
                            type="button"
                            disabled={apagandoId === cadete.id}
                            onClick={(e) => handleApagarGps(e, cadete.id, cadete.nombre)}
                            className="rounded-lg border border-red-200 bg-red-50 px-2 py-1.5 text-[10px] font-extrabold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300"
                            title="Apagar GPS"
                          >
                            <PowerOff className={cn('h-3 w-3', apagandoId === cadete.id && 'animate-spin')} />
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
        <MapaGlobalMemo
          cadetes={cadetes}
          focusedId={focusedId}
          onSelectCadete={setFocusedId}
          bajoConsumo={modoBajoConsumo}
        />

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
                const ordenadosCadete = infoCadete ? pedidosOrdenadosPorCadete.get(infoCadete.id.toLowerCase()) ?? [] : []
                const pos = ordenadosCadete.findIndex(p => p.id === pedido.id) + 1
                const dist = pedido.coordenadas ? calcularDistanciaKm(UBICACION_LOCAL, pedido.coordenadas) : null
                const distTxt = dist !== null ? (dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`) : undefined

                return (
                  <TarjetaPedidoCadete
                    key={pedido.id}
                    pedido={pedido}
                    cambiarEstado={cambiarEstado}
                    posicionParada={pos > 0 ? pos : undefined}
                    totalParadas={ordenadosCadete.length > 1 ? ordenadosCadete.length : undefined}
                    distanciaLocalTexto={distTxt}
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
