'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import { UBICACION_LOCAL } from '@/lib/ubicacion'

// Coordenadas del local Chefsy
const LOCAL_LAT = UBICACION_LOCAL.latitud
const LOCAL_LNG = UBICACION_LOCAL.longitud

// Icono del Local
const storeIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

// Icono del Cadete Ocupado
const cadeteOcupadoIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

// Icono del Cadete Libre
const cadeteLibreIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

export interface CadeteData {
  id: string
  nombre: string
  lat: number
  lng: number
  gps_activo: boolean
  bateria?: number
  updated_at: string
  pedidoActivo?: {
    id: string
    cliente: string
    estado: string
  } | null
}

interface MapaGlobalProps {
  cadetes: CadeteData[]
}

export default function MapaGlobal({ cadetes }: MapaGlobalProps) {
  const [mounted, setMounted] = useState(false)

  // Arreglo para el error de iconos de Leaflet en SSR
  useEffect(() => {
    delete (L.Icon.Default.prototype as any)._getIconUrl
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    })
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50/50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    )
  }

  // Filtrar cadetes que tienen coordenadas válidas
  const cadetesConUbicacion = cadetes.filter((c) => c.lat != null && c.lng != null && c.gps_activo)

  return (
    <MapContainer
      center={[LOCAL_LAT, LOCAL_LNG]}
      zoom={14}
      scrollWheelZoom={true}
      className="w-full h-full z-0"
      style={{ height: '100%', width: '100%', minHeight: '400px' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Marcador del Local */}
      <Marker position={[LOCAL_LAT, LOCAL_LNG]} icon={storeIcon}>
        <Popup>
          <div className="font-semibold text-gray-900">🏪 Local Chefsy</div>
        </Popup>
      </Marker>

      {/* Marcadores de los Cadetes */}
      {cadetesConUbicacion.map((cadete) => (
        <Marker
          key={cadete.id}
          position={[cadete.lat, cadete.lng]}
          icon={cadete.pedidoActivo ? cadeteOcupadoIcon : cadeteLibreIcon}
        >
          <Popup>
            <div className="p-1 min-w-[150px]">
              <div className="font-bold text-gray-900 flex items-center justify-between">
                <span>🛵 {cadete.nombre}</span>
                {cadete.bateria !== undefined && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                    cadete.bateria > 20 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {Math.round(cadete.bateria)}%
                  </span>
                )}
              </div>
              
              <div className="mt-2 text-sm">
                {cadete.pedidoActivo ? (
                  <div className="text-orange-600 font-medium">
                    En viaje 📦
                    <div className="text-gray-500 text-xs mt-0.5 font-normal">
                      Hacia: {cadete.pedidoActivo.cliente}
                    </div>
                  </div>
                ) : (
                  <div className="text-emerald-600 font-medium">
                    Libre ✨
                    <div className="text-gray-500 text-xs mt-0.5 font-normal">
                      Buscando pedidos
                    </div>
                  </div>
                )}
              </div>
              
              <div className="mt-2 pt-2 border-t border-gray-100 text-[10px] text-gray-400">
                GPS: {new Date(cadete.updated_at).toLocaleTimeString()}
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
