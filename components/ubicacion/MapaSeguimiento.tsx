'use client'

import { useEffect, useRef, useState } from 'react'
import { Pedido, Coordenadas } from '@/tipos'
import { UBICACION_LOCAL, calcularDistanciaKm } from '@/lib/ubicacion'
import 'leaflet/dist/leaflet.css'

interface Props {
  pedido: Pedido
}

export default function MapaSeguimiento({ pedido }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const leafletMapRef = useRef<any>(null)
  const markersRef = useRef<{ local?: any, cliente?: any, cadete?: any }>({})
  const [etaText, setEtaText] = useState<string | null>(null)

  // Calcular ETA basado en distancia en cada render
  useEffect(() => {
    if (pedido.cadete_coordenadas && pedido.coordenadas && pedido.estado === 'listo') {
      const dist = calcularDistanciaKm(pedido.cadete_coordenadas, pedido.coordenadas)
      // Asumimos velocidad promedio en ciudad de ~25 km/h -> 2.4 min por km + 2 min extra
      const minEstimados = Math.ceil((dist * 2.4) + 2)
      setEtaText(`Llegando en ~${minEstimados} min (${dist.toFixed(1)} km)`)
    } else {
      setEtaText(null)
    }
  }, [pedido.cadete_coordenadas, pedido.coordenadas, pedido.estado])

  // 1. Inicializar el mapa (Solo 1 vez)
  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current || leafletMapRef.current) return

    const L = require('leaflet')
    
    leafletMapRef.current = L.map(mapRef.current).setView([UBICACION_LOCAL.latitud, UBICACION_LOCAL.longitud], 14)
    L.tileLayer('https://mt1.google.com/vt/lyrs=r&x={x}&y={y}&z={z}', {
      attribution: '&copy; Google Maps',
      maxZoom: 20
    }).addTo(leafletMapRef.current)

    const crearIcono = (emoji: string) => L.divIcon({
      html: `<div style="font-size: 24px; text-shadow: 0 2px 4px rgba(0,0,0,0.3); background: white; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border-radius: 50%; border: 2px solid #ccc; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">${emoji}</div>`,
      className: 'custom-emoji-icon animated-marker',
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
        className: 'custom-emoji-icon animated-marker',
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

  const esperandoGps = !pedido.cadete_coordenadas

  return (
    <div className="w-full h-[400px] sm:h-[500px] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-inner relative z-0">
      <style dangerouslySetInnerHTML={{__html: `
        .animated-marker {
          transition: transform 3s linear;
        }
      `}} />
      <div ref={mapRef} className="w-full h-full absolute inset-0" />
      
      {/* HUD Superior con ETA */}
      {etaText && !esperandoGps && (
        <div className="absolute top-4 left-0 right-0 z-[400] flex justify-center pointer-events-none">
           <div className="bg-emerald-500 text-white px-4 py-2 rounded-full shadow-xl flex items-center gap-2.5 animate-in slide-in-from-top-4">
             <span className="text-xl">🛵</span>
             <span className="text-sm font-extrabold tracking-wide">{etaText}</span>
           </div>
        </div>
      )}

      {esperandoGps && (
        <div className="absolute inset-x-0 bottom-4 z-[400] flex justify-center pointer-events-none">
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 px-4 py-2 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex items-center gap-2.5 animate-bounce">
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-chefsy-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-chefsy-500"></span>
            </div>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Esperando señal en vivo...</span>
          </div>
        </div>
      )}
    </div>
  )
}
