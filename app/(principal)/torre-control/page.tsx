'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { CadeteData } from '@/components/torre-control/MapaGlobal'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { RefreshCw, Battery, MapPin, Zap, Navigation, PowerOff, Bike, Plus, Gauge, DollarSign } from 'lucide-react'
import { formatearPrecio } from '@/lib/utils'
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
  const [vistaMobile, setVistaMobile] = useState<'mapa' | 'cadetes'>('mapa')
  const [mostrarReferenciasMobile, setMostrarReferenciasMobile] = useState(false)

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

  // Polling cada 6 segundos para actualización fluida
  useEffect(() => {
    fetchTorreData()
    const intervalId = setInterval(fetchTorreData, 6000)
    return () => clearInterval(intervalId)
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
    <div className="flex flex-col w-full h-[calc(100dvh-9.5rem)] md:h-[calc(100vh-7rem)] min-h-[460px]">
      {/* Selector de Pestañas Móvil */}
      <div className="md:hidden flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200 mb-2 shrink-0">
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
      <div className="flex-1 flex flex-col md:flex-row w-full bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden min-h-0">
        {/* Sidebar: Lista de Cadetes */}
        <div className={`${vistaMobile === 'cadetes' ? 'flex' : 'hidden'} md:flex w-full md:w-80 lg:w-96 shrink-0 border-r border-gray-200 flex-col bg-gray-50/40 h-full min-h-0`}>
          <div className="p-4 border-b border-gray-200 bg-white shrink-0">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
                <Zap className="h-5 w-5 text-emerald-500" />
              Torre de Control
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
                        {cadete.pedidoActivo ? (
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
      <div className={`${vistaMobile === 'mapa' ? 'flex' : 'hidden'} md:flex flex-1 h-full min-h-0 relative border-t md:border-t-0 md:border-l border-gray-200 flex-col`}>
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
