'use client'

import { useEffect, useRef, useState } from 'react'
import { Pedido } from '@/tipos'
import { UBICACION_LOCAL, calcularDistanciaKm } from '@/lib/ubicacion'
import 'leaflet/dist/leaflet.css'

interface Props {
  pedido: Pedido
}

export default function MapaSeguimiento({ pedido }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const leafletMapRef = useRef<any>(null)
  const markersRef = useRef<{ local?: any; cliente?: any; cadete?: any }>({})
  const [mapaListo, setMapaListo] = useState(false)
  const [etaText, setEtaText] = useState<string | null>(null)

  // ── 1. Calcular ETA en tiempo real ──────────────────────────────────────────
  useEffect(() => {
    if (pedido.cadete_coordenadas && pedido.coordenadas && ['listo', 'en_camino'].includes(pedido.estado)) {
      const distDirecta = calcularDistanciaKm(pedido.cadete_coordenadas, pedido.coordenadas)
      const distRuta = distDirecta * 1.3 // Factor de aproximación de calles

      if (distRuta < 0.15) {
        setEtaText('¡Llegando! (a metros)')
      } else {
        const minEstimados = Math.round(distRuta * 3 + 1)
        const kmMostrados = distRuta.toFixed(1)

        if (minEstimados <= 1) {
          setEtaText(`Llegando en < 1 min (${kmMostrados} km)`)
        } else {
          setEtaText(`Llegando en ~${minEstimados} min (${kmMostrados} km)`)
        }
      }
    } else {
      setEtaText(null)
    }
  }, [pedido.cadete_coordenadas?.latitud, pedido.cadete_coordenadas?.longitud, pedido.coordenadas?.latitud, pedido.coordenadas?.longitud, pedido.estado])

  // ── 2. Inicializar el mapa Leaflet SOLO UNA VEZ al montar ───────────────────
  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current) return

    const L = require('leaflet')

    // Evitar colisión de inicialización previa en el DOM
    if ((mapRef.current as any)._leaflet_id) {
      delete (mapRef.current as any)._leaflet_id
    }

    if (!leafletMapRef.current) {
      const mapa = L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false,
      }).setView([UBICACION_LOCAL.latitud, UBICACION_LOCAL.longitud], 14)

      L.tileLayer('https://mt1.google.com/vt/lyrs=r&x={x}&y={y}&z={z}', {
        attribution: '&copy; Google Maps',
        maxZoom: 20,
      }).addTo(mapa)

      L.control.zoom({ position: 'bottomright' }).addTo(mapa)

      // Marcador del Local Chefsy
      const localIcon = L.divIcon({
        html: `<div style="font-size: 20px; text-shadow: 0 2px 4px rgba(0,0,0,0.3); background: white; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border-radius: 50%; border: 2px solid #ccc; box-shadow: 0 4px 6px rgba(0,0,0,0.15);">🏪</div>`,
        className: 'custom-emoji-icon',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      })

      markersRef.current.local = L.marker([UBICACION_LOCAL.latitud, UBICACION_LOCAL.longitud], {
        icon: localIcon,
        zIndexOffset: 100,
      }).addTo(mapa).bindPopup('Chefsy (Local)')

      leafletMapRef.current = mapa
      setMapaListo(true)
    }

    // ResizeObserver para adaptar el mapa en tiempo real a cualquier resolución sin márgenes
    let resizeObserver: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined' && mapRef.current) {
      resizeObserver = new ResizeObserver(() => {
        if (leafletMapRef.current) {
          leafletMapRef.current.invalidateSize({ pan: false })
        }
      })
      resizeObserver.observe(mapRef.current)
    }

    const timer1 = setTimeout(() => {
      if (leafletMapRef.current) leafletMapRef.current.invalidateSize()
    }, 100)

    const timer2 = setTimeout(() => {
      if (leafletMapRef.current) leafletMapRef.current.invalidateSize()
    }, 400)

    const handleResize = () => {
      if (leafletMapRef.current) leafletMapRef.current.invalidateSize()
    }
    window.addEventListener('resize', handleResize)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
      window.removeEventListener('resize', handleResize)
      if (resizeObserver) {
        resizeObserver.disconnect()
      }
      if (leafletMapRef.current) {
        leafletMapRef.current.remove()
        leafletMapRef.current = null
        markersRef.current = {}
        setMapaListo(false)
      }
      if (mapRef.current && (mapRef.current as any)._leaflet_id) {
        delete (mapRef.current as any)._leaflet_id
      }
    }
  }, [])

  // ── 3. Actualizar / Crear marcador del Cliente y encuadrar mapa ─────────────
  useEffect(() => {
    if (!mapaListo || !leafletMapRef.current || !pedido.coordenadas) return

    const L = require('leaflet')
    const { latitud, longitud } = pedido.coordenadas

    if (markersRef.current.cliente) {
      markersRef.current.cliente.setLatLng([latitud, longitud])
    } else {
      const clienteIcon = L.divIcon({
        html: `
          <div style="display:flex;flex-direction:column;align-items:center;user-select:none;">
            <div style="font-size:20px;background:#2563EB;color:#fff;width:38px;height:38px;display:flex;align-items:center;justify-content:center;border-radius:50%;border:2.5px solid #fff;box-shadow:0 4px 10px rgba(37,99,235,0.4);">
              🏠
            </div>
            <div style="margin-top:2px;background:#1e40af;color:#ffffff;font-size:11px;font-weight:800;padding:2px 8px;border-radius:10px;box-shadow:0 2px 6px rgba(0,0,0,0.25);white-space:nowrap;max-width:120px;overflow:hidden;text-overflow:ellipsis;border:1.5px solid #ffffff;letter-spacing:0.2px;">
              ${pedido.cliente || 'Destino'}
            </div>
          </div>
        `,
        className: 'custom-cliente-tracking-icon',
        iconSize: [120, 68],
        iconAnchor: [60, 19],
        popupAnchor: [0, -22],
      })

      markersRef.current.cliente = L.marker([latitud, longitud], {
        icon: clienteIcon,
        zIndexOffset: 200,
      }).addTo(leafletMapRef.current).bindPopup(`Entrega: ${pedido.cliente}`)
    }

    // Auto-encuadre entre Local y Cliente con padding seguro
    const bounds = L.latLngBounds([
      [UBICACION_LOCAL.latitud, UBICACION_LOCAL.longitud],
      [latitud, longitud],
    ])
    if (pedido.cadete_coordenadas) {
      bounds.extend([pedido.cadete_coordenadas.latitud, pedido.cadete_coordenadas.longitud])
    }
    leafletMapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 })
    leafletMapRef.current.invalidateSize()
  }, [mapaListo, pedido.coordenadas?.latitud, pedido.coordenadas?.longitud, pedido.cliente])

  // ── 4. Actualizar / Crear marcador del Cadete reactivamente ──────────────────
  useEffect(() => {
    if (!mapaListo || !leafletMapRef.current || !pedido.cadete_coordenadas) return

    const L = require('leaflet')
    const { latitud, longitud } = pedido.cadete_coordenadas

    if (markersRef.current.cadete) {
      markersRef.current.cadete.setLatLng([latitud, longitud])
    } else {
      const cadeteIcon = L.divIcon({
        html: `<div style="font-size: 22px; background: #E11D48; color: white; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; border-radius: 50%; border: 2.5px solid white; box-shadow: 0 4px 10px rgba(225,29,72,0.4); cursor:pointer;">🛵</div>`,
        className: 'cadete-marker animated-marker',
        iconSize: [38, 38],
        iconAnchor: [19, 19],
      })

      markersRef.current.cadete = L.marker([latitud, longitud], {
        icon: cadeteIcon,
        zIndexOffset: 300,
      }).addTo(leafletMapRef.current).bindPopup('🛵 Cadete en camino')

      // Re-encuadrar para incluir al cadete
      const bounds = L.latLngBounds([
        [UBICACION_LOCAL.latitud, UBICACION_LOCAL.longitud],
      ])
      if (pedido.coordenadas) {
        bounds.extend([pedido.coordenadas.latitud, pedido.coordenadas.longitud])
      }
      bounds.extend([latitud, longitud])
      leafletMapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 })
    }
  }, [mapaListo, pedido.cadete_coordenadas?.latitud, pedido.cadete_coordenadas?.longitud])

  const esperandoGps = !pedido.cadete_coordenadas

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden z-0 bg-slate-100">
      <style dangerouslySetInnerHTML={{
        __html: `
        .animated-marker {
          transition: transform 0.8s cubic-bezier(0.25, 1, 0.5, 1);
        }
        .leaflet-container {
          width: 100% !important;
          height: 100% !important;
          background-color: #e2e8f0;
        }
      `,
      }} />

      {/* Contenedor del Mapa Leaflet (ocupa el 100% absoluto) */}
      <div ref={mapRef} className="w-full h-full" style={{ width: '100%', height: '100%' }} />

      {/* HUD Superior con ETA */}
      {etaText && !esperandoGps && (
        <div className="absolute top-3.5 left-0 right-0 z-[400] flex justify-center pointer-events-none px-3">
          <div className="bg-emerald-600/95 backdrop-blur-md text-white px-4 py-1.5 rounded-full shadow-xl flex items-center gap-2.5 animate-in slide-in-from-top-4 border border-emerald-400/40">
            <span className="text-lg">🛵</span>
            <span className="text-xs sm:text-sm font-black tracking-wide">{etaText}</span>
          </div>
        </div>
      )}

      {/* Badge flotante inferior cuando aún no hay señal de GPS del cadete */}
      {esperandoGps && pedido.estado === 'en_camino' && (
        <div className="absolute inset-x-0 bottom-4 z-[400] flex justify-center pointer-events-none px-3">
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 px-4 py-2 rounded-full shadow-xl flex items-center gap-2.5 animate-bounce">
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-chefsy-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-chefsy-500"></span>
            </div>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Conectando señal en vivo con el repartidor...</span>
          </div>
        </div>
      )}
    </div>
  )
}
