'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { CadeteData } from '@/components/torre-control/MapaGlobal'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { RefreshCw, Battery, MapPin, Zap } from 'lucide-react'

// Cargar el mapa dinámicamente para evitar errores de SSR
const MapaGlobal = dynamic(
  () => import('@/components/torre-control/MapaGlobal'),
  { ssr: false, loading: () => <div className="w-full h-full bg-gray-100 flex items-center justify-center">Cargando mapa...</div> }
)

export default function TorreControlPage() {
  const [cadetes, setCadetes] = useState<CadeteData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [isRefreshing, setIsRefreshing] = useState(false)

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

  // Polling cada 10 segundos
  useEffect(() => {
    fetchTorreData()
    const intervalId = setInterval(fetchTorreData, 10000)
    return () => clearInterval(intervalId)
  }, [])

  return (
    <div className="flex h-[calc(100vh-4rem)] md:h-screen w-full flex-col md:flex-row overflow-hidden bg-white">
      {/* Sidebar: Lista de Cadetes */}
      <div className="w-full md:w-80 border-r border-gray-200 flex flex-col bg-gray-50/30">
        <div className="p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Zap className="h-5 w-5 text-emerald-500" />
              Torre de Control
            </h1>
            <button
              onClick={fetchTorreData}
              disabled={isRefreshing}
              className={`p-2 text-gray-500 hover:text-gray-900 rounded-full hover:bg-gray-100 transition-colors ${
                isRefreshing ? 'animate-spin' : ''
              }`}
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-gray-500">
            Monitoreo en vivo de cadetes. Actualizado:{' '}
            <span className="font-medium">{lastUpdate.toLocaleTimeString()}</span>
          </p>
        </div>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {isLoading && cadetes.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm animate-pulse">
                Cargando cadetes...
              </div>
            ) : cadetes.length === 0 ? (
              <div className="text-center py-8">
                <MapPin className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">No hay cadetes activos en el mapa.</p>
              </div>
            ) : (
              cadetes.map((cadete) => (
                <Card key={cadete.id} className="overflow-hidden shadow-sm hover:shadow transition-shadow">
                  <div className={`h-1.5 w-full ${cadete.pedidoActivo ? 'bg-orange-500' : 'bg-emerald-500'}`} />
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-semibold text-gray-900 line-clamp-1 flex-1 pr-2">
                        {cadete.nombre}
                      </div>
                      {cadete.bateria !== undefined && (
                        <Badge 
                          variant="secondary" 
                          className={`flex items-center gap-1 text-[10px] px-1.5 py-0 ${
                            cadete.bateria > 20 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}
                        >
                          <Battery className="h-3 w-3" />
                          {Math.round(cadete.bateria)}%
                        </Badge>
                      )}
                    </div>
                    
                    <div className="text-sm">
                      {cadete.pedidoActivo ? (
                        <div>
                          <div className="text-orange-600 font-medium text-xs mb-1">
                            EN VIAJE
                          </div>
                          <p className="text-gray-600 text-xs line-clamp-1">
                            Hacia: <span className="font-medium text-gray-900">{cadete.pedidoActivo.cliente}</span>
                          </p>
                        </div>
                      ) : (
                        <div>
                          <div className="text-emerald-600 font-medium text-xs mb-1">
                            LIBRE
                          </div>
                          <p className="text-gray-500 text-xs">
                            Buscando pedidos...
                          </p>
                        </div>
                      )}
                    </div>

                    <Separator className="my-3" />

                    <div className="flex justify-between items-center text-[10px] text-gray-400">
                      <span>GPS: {cadete.gps_activo ? 'ON' : 'OFF'}</span>
                      <span>Upd: {new Date(cadete.updated_at).toLocaleTimeString()}</span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main Area: Mapa */}
      <div className="flex-1 h-[50vh] md:h-full relative border-t md:border-t-0 md:border-l border-gray-200">
        <MapaGlobal cadetes={cadetes} />
        
        {/* Overlay Legend */}
        <div className="absolute bottom-6 right-6 z-[1000] bg-white/90 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-gray-100 text-xs space-y-2 pointer-events-none">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
            <span className="text-gray-700 font-medium">Cadete Libre</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
            <span className="text-gray-700 font-medium">Cadete en Viaje</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-600"></div>
            <span className="text-gray-700 font-medium">Local Chefsy</span>
          </div>
        </div>
      </div>
    </div>
  )
}
