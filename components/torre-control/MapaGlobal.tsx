'use client'

import { useEffect, useRef } from 'react'
import { UBICACION_LOCAL } from '@/lib/ubicacion'
import 'leaflet/dist/leaflet.css'

// Coordenadas del local Chefsy
const LOCAL_LAT = UBICACION_LOCAL.latitud
const LOCAL_LNG = UBICACION_LOCAL.longitud

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
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<{ local?: any; cadetes: Record<string, any> }>({ cadetes: {} })

  // 1. Inicializar Mapa (1 sola vez al montar)
  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current || mapInstanceRef.current) return

    const L = require('leaflet')

    // Evitar errores de re-inicialización
    if ((mapContainerRef.current as any)._leaflet_id) {
      delete (mapContainerRef.current as any)._leaflet_id
    }

    const map = L.map(mapContainerRef.current, {
      center: [LOCAL_LAT, LOCAL_LNG],
      zoom: 14,
      zoomControl: true,
    })

    // Usar Google Maps tiles (alta disponibilidad, ultra rápido y sin bloqueos de tiles)
    L.tileLayer('https://mt1.google.com/vt/lyrs=r&x={x}&y={y}&z={z}', {
      attribution: '&copy; Google Maps',
      maxZoom: 20,
    }).addTo(map)

    mapInstanceRef.current = map

    // Marcador del Local Chefsy
    const localIcon = L.divIcon({
      html: `
        <div style="display:flex;align-items:center;justify-content:center;width:42px;height:42px;background:#DC2626;border:3px solid #fff;border-radius:50%;box-shadow:0 4px 10px rgba(0,0,0,0.35);font-size:22px;user-select:none;">
          🏪
        </div>
      `,
      className: 'custom-local-icon',
      iconSize: [42, 42],
      iconAnchor: [21, 21],
      popupAnchor: [0, -24],
    })

    markersRef.current.local = L.marker([LOCAL_LAT, LOCAL_LNG], { icon: localIcon })
      .addTo(map)
      .bindPopup(`
        <div style="text-align:center;padding:4px;font-family:sans-serif;">
          <b style="font-size:14px;color:#1e293b;">🏪 Local Chefsy</b>
          <p style="margin:4px 0 0;font-size:11px;color:#64748b;">Punto de retiro y cocina</p>
        </div>
      `)

    // Invalidate size para asegurar renderizado perfecto tras el montaje del DOM
    const timer = setTimeout(() => {
      map.invalidateSize()
    }, 150)

    const timer2 = setTimeout(() => {
      map.invalidateSize()
    }, 500)

    return () => {
      clearTimeout(timer)
      clearTimeout(timer2)
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
        markersRef.current = { cadetes: {} }
      }
    }
  }, [])

  // 2. Actualizar marcadores de cadetes reactivamente
  useEffect(() => {
    if (!mapInstanceRef.current) return
    const L = require('leaflet')
    const map = mapInstanceRef.current

    const cadetesConUbicacion = cadetes.filter((c) => c.lat != null && c.lng != null && c.gps_activo)
    const currentCadeteIds = new Set(cadetesConUbicacion.map((c) => c.id))

    // Remover marcadores de cadetes que ya no están activos o apagaron GPS
    Object.keys(markersRef.current.cadetes).forEach((id) => {
      if (!currentCadeteIds.has(id)) {
        markersRef.current.cadetes[id].remove()
        delete markersRef.current.cadetes[id]
      }
    })

    // Actualizar o crear marcadores
    cadetesConUbicacion.forEach((cadete) => {
      const esEnViaje = !!cadete.pedidoActivo
      const colorBg = esEnViaje ? '#F97316' : '#10B981'
      const sombraColor = esEnViaje ? 'rgba(249,115,22,0.45)' : 'rgba(16,185,129,0.45)'
      const batBadge =
        cadete.bateria != null
          ? `<div style="position:absolute;top:-6px;right:-8px;background:${
              cadete.bateria > 20 ? '#10B981' : '#EF4444'
            };color:#fff;font-size:9px;font-weight:900;padding:1px 4px;border-radius:10px;border:1.5px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,0.2);">${Math.round(
              cadete.bateria
            )}%</div>`
          : ''

      const cadeteIcon = L.divIcon({
        html: `
          <div style="position:relative;display:flex;align-items:center;justify-content:center;width:42px;height:42px;background:${colorBg};border:3px solid #fff;border-radius:50%;box-shadow:0 4px 12px ${sombraColor};font-size:22px;cursor:pointer;user-select:none;">
            🛵
            ${batBadge}
          </div>
        `,
        className: 'custom-cadete-icon',
        iconSize: [42, 42],
        iconAnchor: [21, 21],
        popupAnchor: [0, -24],
      })

      const popupContent = `
        <div style="min-width:170px;padding:4px;font-family:sans-serif;">
          <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e2e8f0;padding-bottom:6px;margin-bottom:6px;">
            <b style="font-size:13px;color:#0f172a;">🛵 ${cadete.nombre}</b>
            ${
              cadete.bateria != null
                ? `<span style="font-size:10px;font-weight:bold;color:${
                    cadete.bateria > 20 ? '#16a34a' : '#dc2626'
                  };background:${
                    cadete.bateria > 20 ? '#dcfce7' : '#fee2e2'
                  };padding:2px 6px;border-radius:6px;">${Math.round(cadete.bateria)}%</span>`
                : ''
            }
          </div>
          <div style="font-size:12px;margin-bottom:6px;">
            ${
              cadete.pedidoActivo
                ? `<span style="color:#ea580c;font-weight:bold;">📦 EN VIAJE</span><div style="color:#475569;font-size:11px;margin-top:2px;">Hacia: <b>${cadete.pedidoActivo.cliente}</b></div>`
                : `<span style="color:#16a34a;font-weight:bold;">✨ LIBRE</span><div style="color:#64748b;font-size:11px;margin-top:2px;">Buscando pedidos...</div>`
            }
          </div>
          <div style="font-size:10px;color:#94a3b8;border-top:1px solid #f1f5f9;padding-top:4px;">
            GPS: ${new Date(cadete.updated_at).toLocaleTimeString()}
          </div>
        </div>
      `

      if (markersRef.current.cadetes[cadete.id]) {
        // Actualizar posición y popup
        markersRef.current.cadetes[cadete.id].setLatLng([cadete.lat, cadete.lng])
        markersRef.current.cadetes[cadete.id].setIcon(cadeteIcon)
        markersRef.current.cadetes[cadete.id].setPopupContent(popupContent)
      } else {
        // Crear nuevo marcador
        markersRef.current.cadetes[cadete.id] = L.marker([cadete.lat, cadete.lng], { icon: cadeteIcon })
          .addTo(map)
          .bindPopup(popupContent)
      }
    })
  }, [cadetes])

  return (
    <div
      ref={mapContainerRef}
      className="w-full h-full min-h-[400px] z-0"
      style={{ width: '100%', height: '100%', minHeight: '400px' }}
    />
  )
}
