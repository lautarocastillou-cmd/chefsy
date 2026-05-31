'use client'

import { useEffect, useRef } from 'react'
import { Pedido } from '@/tipos'
import { UBICACION_LOCAL } from '@/lib/ubicacion'
import 'leaflet/dist/leaflet.css'

interface Props {
  pedido: Pedido
}

export default function MapaSeguimiento({ pedido }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const leafletMapRef = useRef<any>(null)
  const markersRef = useRef<{ local?: any, cliente?: any, cadete?: any }>({})

  // 1. Inicializar el mapa (Solo 1 vez)
  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current || leafletMapRef.current) return

    const L = require('leaflet')
    
    leafletMapRef.current = L.map(mapRef.current).setView([UBICACION_LOCAL.latitud, UBICACION_LOCAL.longitud], 14)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO'
    }).addTo(leafletMapRef.current)

    const crearIcono = (emoji: string) => L.divIcon({
      html: `<div style="font-size: 24px; text-shadow: 0 2px 4px rgba(0,0,0,0.3); background: white; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border-radius: 50%; border: 2px solid #ccc; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">${emoji}</div>`,
      className: 'custom-emoji-icon',
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    })

    // Local
    markersRef.current.local = L.marker([UBICACION_LOCAL.latitud, UBICACION_LOCAL.longitud], { 
      icon: crearIcono('🏪'),
      zIndexOffset: 100
    }).addTo(leafletMapRef.current).bindPopup('Chefsy (Local)')

    // Cliente
    if (pedido.coordenadas) {
      markersRef.current.cliente = L.marker([pedido.coordenadas.latitud, pedido.coordenadas.longitud], {
        icon: crearIcono('🏠'),
        zIndexOffset: 200
      }).addTo(leafletMapRef.current).bindPopup(`Cliente: ${pedido.cliente}`)
    }

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove()
        leafletMapRef.current = null
        markersRef.current = {}
      }
    }
  }, [pedido.coordenadas?.latitud, pedido.coordenadas?.longitud, pedido.cliente])

  // 2. Actualizar posición del cadete (Reactivo)
  useEffect(() => {
    if (!leafletMapRef.current || !pedido.cadete_coordenadas) return

    const L = require('leaflet')
    const { latitud, longitud } = pedido.cadete_coordenadas

    if (markersRef.current.cadete) {
      markersRef.current.cadete.setLatLng([latitud, longitud])
    } else {
       const crearIcono = (emoji: string) => L.divIcon({
        html: `<div style="font-size: 24px; background: white; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border-radius: 50%; border: 2px solid #ccc; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">${emoji}</div>`,
        className: 'custom-emoji-icon',
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      })
      markersRef.current.cadete = L.marker([latitud, longitud], {
        icon: crearIcono('🛵'),
        zIndexOffset: 300
      }).addTo(leafletMapRef.current).bindPopup('Cadete')

      // Ajustar zoom para mostrar todo solo la primera vez
      const bounds = L.latLngBounds([
        [UBICACION_LOCAL.latitud, UBICACION_LOCAL.longitud]
      ])
      if (pedido.coordenadas) bounds.extend([pedido.coordenadas.latitud, pedido.coordenadas.longitud])
      bounds.extend([latitud, longitud])
      
      leafletMapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 })
    }
  }, [pedido.cadete_coordenadas?.latitud, pedido.cadete_coordenadas?.longitud, pedido.coordenadas?.latitud, pedido.coordenadas?.longitud])

  return (
    <div className="w-full h-[400px] sm:h-[500px] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-inner relative z-0">
      <div ref={mapRef} className="w-full h-full absolute inset-0" />
    </div>
  )
}
