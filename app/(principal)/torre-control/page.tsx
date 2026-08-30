'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { CadeteData } from '@/components/torre-control/MapaGlobal'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { RefreshCw, Battery, MapPin, Zap, Navigation, Home } from 'lucide-react'
import { formatearPrecio } from '@/lib/utils'

// Cargar el mapa dinámicamente para evitar errores de SSR
const MapaGlobal = dynamic(
  () => import('@/components/torre-control/MapaGlobal'),
  { ssr: false, loading: () => <div className="w-full h-full bg-gray-100 flex items-center justify-center text-sm text-gray-500 font-medium">Cargando mapa en vivo...</div> }
)

export default function TorreControlPage() {
  const [cadetes, setCadetes] = useState<CadeteData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [focusedId, setFocusedId] = useState<string | null>(null)

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

  return (
    <div className="flex flex-col md:flex-row w-full h-[calc(100vh-7rem)] min-h-[550px] bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Sidebar: Lista de Cadetes */}
      <div className="w-full md:w-80 lg:w-96 shrink-0 border-r border-gray-200 flex flex-col bg-gray-50/40">
        <div className="p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
              <Zap className="h-5 w-5 text-emerald-500" />
              Torre de Control
            </h1>
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
          <p className="text-xs text-gray-500">
            Monitoreo en vivo de cadetes y entregas. Actualizado:{' '}
            <span className="font-semibold text-gray-700">{lastUpdate.toLocaleTimeString()}</span>
          </p>
        </div>

        <ScrollArea className="flex-1 p-3">
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
                return (
                  <Card
                    key={cadete.id}
                    onClick={() => setFocusedId(cadete.id)}
                    className={`overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer border ${
                      isSelected ? 'border-blue-500 ring-2 ring-blue-200 bg-blue-50/20' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className={`h-1.5 w-full ${cadete.pedidoActivo ? 'bg-orange-500' : 'bg-emerald-500'}`} />
                    <CardContent className="p-3.5">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-bold text-gray-900 text-sm line-clamp-1 flex-1 pr-2 flex items-center gap-1.5">
                          <span>🛵</span>
                          <span>{cadete.nombre}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
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
                              <span>📦 EN VIAJE ({cadete.pedidoActivo.estado.toUpperCase()})</span>
                              {cadete.pedidoActivo.total ? (
                                <span className="text-gray-900 font-black">{formatearPrecio(cadete.pedidoActivo.total)}</span>
                              ) : null}
                            </div>
                            <p className="text-gray-800 font-medium text-xs">
                              Cliente: <span className="font-bold">{cadete.pedidoActivo.cliente}</span>
                            </p>
                            {cadete.pedidoActivo.direccion ? (
                              <p className="text-gray-600 text-[11px] flex items-start gap-1">
                                <span>📍</span>
                                <span className="line-clamp-2">{cadete.pedidoActivo.direccion}</span>
                              </p>
                            ) : null}
                          </div>
                        ) : (
                          <div className="bg-emerald-50/60 border border-emerald-100 rounded-lg p-2 flex items-center justify-between text-emerald-700">
                            <span className="font-bold text-[11px]">🟢 DISPONIBLE</span>
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
                          }}
                          className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1"
                        >
                          <Navigation className="h-3 w-3" />
                          <span>Ver en mapa</span>
                        </button>
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
      <div className="flex-1 h-[50vh] md:h-full min-h-[400px] relative border-t md:border-t-0 md:border-l border-gray-200">
        <MapaGlobal cadetes={cadetes} focusedId={focusedId} />

        {/* Overlay Legend */}
        <div className="absolute bottom-6 right-6 z-[1000] bg-white p-3.5 rounded-xl shadow-xl border border-gray-200 text-xs space-y-2 pointer-events-none">
          <div className="font-bold text-gray-800 text-[11px] uppercase tracking-wider mb-1 border-b pb-1">
            Referencias en Mapa
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm"></div>
            <span className="text-gray-700 font-medium">Cadete Disponible (🛵)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500 shadow-sm"></div>
            <span className="text-gray-700 font-medium">Cadete en Viaje (🛵)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-600 shadow-sm"></div>
            <span className="text-gray-700 font-medium">Destino Cliente (🏠)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-600 shadow-sm"></div>
            <span className="text-gray-700 font-medium">Local Chefsy (🏪)</span>
          </div>
        </div>
      </div>
    </div>
  )
}

