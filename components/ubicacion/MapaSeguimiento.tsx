'use client'

import { useEffect, useRef, useState } from 'react'
import { Pedido } from '@/tipos'
import { UBICACION_LOCAL, calcularDistanciaKm } from '@/lib/ubicacion'
import { Navigation, Compass, Home, Bike, CheckCircle2, Layers } from 'lucide-react'
import 'leaflet/dist/leaflet.css'

interface Props {
  pedido: Pedido
}

type ModoCamara = 'cadete' | 'todo' | 'cliente' | 'manual'

// Helper: Calcular ángulo de rumbo geográfico (0° a 360°)
function calcularRumbo(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const toDeg = (rad: number) => (rad * 180) / Math.PI
  const dLng = toRad(lon2 - lon1)
  const phi1 = toRad(lat1)
  const phi2 = toRad(lat2)
  const y = Math.sin(dLng) * Math.cos(phi2)
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLng)
  const brng = toDeg(Math.atan2(y, x))
  return (brng + 360) % 360
}

export default function MapaSeguimiento({ pedido }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const leafletMapRef = useRef<any>(null)
  const markersRef = useRef<{ local?: any; cliente?: any; cadete?: any }>({})
  const polylineRef = useRef<{ base?: any; dash?: any }>({})
  
  const posicionAnteriorRef = useRef<{ latitud: number; longitud: number } | null>(null)
  const rumboActualRef = useRef<number>(0)

  const [mapaListo, setMapaListo] = useState(false)
  const [etaText, setEtaText] = useState<string | null>(null)
  const [distanciaRestanteKm, setDistanciaRestanteKm] = useState<number | null>(null)
  const [modoCamara, setModoCamara] = useState<ModoCamara>('todo')

  // ── 1. Calcular ETA y Distancia en tiempo real ───────────────────────────────
  useEffect(() => {
    if (pedido.cadete_coordenadas && pedido.coordenadas && ['listo', 'en_camino'].includes(pedido.estado)) {
      const distDirecta = calcularDistanciaKm(pedido.cadete_coordenadas, pedido.coordenadas)
      const distRuta = distDirecta * 1.3 // Factor de aproximación de calles
      setDistanciaRestanteKm(distRuta)

      if (distRuta < 0.1) {
        setEtaText('¡Llegando! (en la puerta)')
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
      setDistanciaRestanteKm(null)
    }
  }, [pedido.cadete_coordenadas?.latitud, pedido.cadete_coordenadas?.longitud, pedido.coordenadas?.latitud, pedido.coordenadas?.longitud, pedido.estado])

  // ── 2. Inicializar el mapa Leaflet SOLO UNA VEZ al montar ───────────────────
  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current) return

    const L = require('leaflet')

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

      // Listener: Si el usuario mueve el mapa manualmente con el dedo, cambiar a modo manual
      mapa.on('dragstart', () => {
        setModoCamara('manual')
      })

      // Marcador del Local Chefsy
      const localIcon = L.divIcon({
        html: `
          <div style="display:flex;flex-direction:column;align-items:center;user-select:none;">
            <div style="font-size: 20px; text-shadow: 0 2px 4px rgba(0,0,0,0.3); background: white; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border-radius: 50%; border: 2.5px solid #2A6348; box-shadow: 0 4px 8px rgba(0,0,0,0.2);">
              🏪
            </div>
            <div style="margin-top:2px;background:#2A6348;color:#ffffff;font-size:10px;font-weight:900;padding:1px 6px;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.25);white-space:nowrap;border:1px solid #ffffff;">
              Chefsy Local
            </div>
          </div>
        `,
        className: 'custom-local-tracking-icon',
        iconSize: [80, 56],
        iconAnchor: [40, 18],
      })

      markersRef.current.local = L.marker([UBICACION_LOCAL.latitud, UBICACION_LOCAL.longitud], {
        icon: localIcon,
        zIndexOffset: 100,
      }).addTo(mapa).bindPopup('Chefsy (Local)')

      leafletMapRef.current = mapa
      setMapaListo(true)
    }

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

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
      if (resizeObserver) resizeObserver.disconnect()
      if (leafletMapRef.current) {
        leafletMapRef.current.remove()
        leafletMapRef.current = null
        markersRef.current = {}
        polylineRef.current = {}
        setMapaListo(false)
      }
      if (mapRef.current && (mapRef.current as any)._leaflet_id) {
        delete (mapRef.current as any)._leaflet_id
      }
    }
  }, [])

  // ── 3. Actualizar marcador del Cliente ──────────────────────────────────────
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
              ${pedido.cliente || 'Tu Domicilio'}
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
      }).addTo(leafletMapRef.current).bindPopup(`Destino de entrega: ${pedido.cliente}`)
    }
  }, [mapaListo, pedido.coordenadas?.latitud, pedido.coordenadas?.longitud, pedido.cliente])

  // ── 4. Actualizar / Crear marcador del Cadete con Rumbo & Interpolación ─────
  useEffect(() => {
    if (!mapaListo || !leafletMapRef.current || !pedido.cadete_coordenadas) return

    const L = require('leaflet')
    const { latitud, longitud } = pedido.cadete_coordenadas

    // Calcular rumbo si hubo movimiento anterior
    if (posicionAnteriorRef.current) {
      const { latitud: prevLat, longitud: prevLng } = posicionAnteriorRef.current
      const dist = Math.sqrt(Math.pow(latitud - prevLat, 2) + Math.pow(longitud - prevLng, 2))
      if (dist > 0.00005) { // Movimiento real > 5 metros
        rumboActualRef.current = Math.round(calcularRumbo(prevLat, prevLng, latitud, longitud))
      }
    }
    posicionAnteriorRef.current = { latitud, longitud }

    const rumbo = rumboActualRef.current

    const cadeteHtml = `
      <div class="cadete-marker-outer" style="position:relative; width:48px; height:48px; display:flex; align-items:center; justify-content:center;">
        <div class="cadete-radar-pulse"></div>
        <div class="cadete-moto-badge" style="transform: rotate(${rumbo}deg); transition: transform 0.5s ease-out; width:38px; height:38px; background:#E11D48; border:2.5px solid white; border-radius:50%; box-shadow:0 4px 12px rgba(225,29,72,0.45); display:flex; align-items:center; justify-content:center; font-size:20px; cursor:pointer;">
          🛵
        </div>
        <div class="cadete-direction-arrow" style="position:absolute; top:-2px; transform: rotate(${rumbo}deg); transition: transform 0.5s ease-out; font-size:10px; color:#E11D48; font-weight:900; text-shadow:0 1px 2px #fff;">
          ▲
        </div>
      </div>
    `

    const cadeteIcon = L.divIcon({
      html: cadeteHtml,
      className: 'cadete-marker animated-cadete-marker',
      iconSize: [48, 48],
      iconAnchor: [24, 24],
    })

    if (markersRef.current.cadete) {
      markersRef.current.cadete.setLatLng([latitud, longitud])
      markersRef.current.cadete.setIcon(cadeteIcon)
    } else {
      markersRef.current.cadete = L.marker([latitud, longitud], {
        icon: cadeteIcon,
        zIndexOffset: 300,
      }).addTo(leafletMapRef.current).bindPopup(`🛵 Repartidor: ${pedido.cadete_nombre || 'En camino'}`)
    }

    // Si la cámara está en modo "cadete", seguir suavemente al cadete
    if (modoCamara === 'cadete') {
      leafletMapRef.current.panTo([latitud, longitud], { animate: true, duration: 0.8 })
    }
  }, [mapaListo, pedido.cadete_coordenadas?.latitud, pedido.cadete_coordenadas?.longitud, modoCamara])

  // ── 5. Trazado de Ruta Dinámica (Polilínea con Pulso/Dash) ───────────────────
  useEffect(() => {
    if (!mapaListo || !leafletMapRef.current) return
    const L = require('leaflet')

    let puntosRuta: [number, number][] = []

    if (pedido.cadete_coordenadas && pedido.coordenadas) {
      // Cadete en camino hacia la casa
      puntosRuta = [
        [pedido.cadete_coordenadas.latitud, pedido.cadete_coordenadas.longitud],
        [pedido.coordenadas.latitud, pedido.coordenadas.longitud]
      ]
    } else if (pedido.coordenadas) {
      // Desde el local hacia la casa
      puntosRuta = [
        [UBICACION_LOCAL.latitud, UBICACION_LOCAL.longitud],
        [pedido.coordenadas.latitud, pedido.coordenadas.longitud]
      ]
    }

    if (puntosRuta.length >= 2) {
      if (polylineRef.current.base) {
        polylineRef.current.base.setLatLngs(puntosRuta)
        polylineRef.current.dash.setLatLngs(puntosRuta)
      } else {
        // Línea base con resplandor
        polylineRef.current.base = L.polyline(puntosRuta, {
          color: '#059669',
          weight: 6,
          opacity: 0.5,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(leafletMapRef.current)

        // Línea superior con animación de pulso y trazo punteado
        polylineRef.current.dash = L.polyline(puntosRuta, {
          color: '#34D399',
          weight: 3.5,
          dashArray: '8, 14',
          className: 'animated-polyline-dash',
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(leafletMapRef.current)
      }
    } else {
      if (polylineRef.current.base) {
        polylineRef.current.base.remove()
        polylineRef.current.dash.remove()
        polylineRef.current = {}
      }
    }
  }, [mapaListo, pedido.cadete_coordenadas?.latitud, pedido.cadete_coordenadas?.longitud, pedido.coordenadas?.latitud, pedido.coordenadas?.longitud])

  // ── 6. Auto-encuadre inicial cuando cambia pedido ────────────────────────────
  useEffect(() => {
    if (!mapaListo || !leafletMapRef.current || modoCamara !== 'todo') return
    const L = require('leaflet')

    const bounds = L.latLngBounds([[UBICACION_LOCAL.latitud, UBICACION_LOCAL.longitud]])
    if (pedido.coordenadas) {
      bounds.extend([pedido.coordenadas.latitud, pedido.coordenadas.longitud])
    }
    if (pedido.cadete_coordenadas) {
      bounds.extend([pedido.cadete_coordenadas.latitud, pedido.cadete_coordenadas.longitud])
    }
    leafletMapRef.current.fitBounds(bounds, { padding: [45, 45], maxZoom: 16, animate: true })
  }, [mapaListo, pedido.coordenadas?.latitud, pedido.coordenadas?.longitud, pedido.cadete_coordenadas?.latitud])

  // ── Acciones de Cámara HUD ──────────────────────────────────────────────────
  const enfocarCadete = () => {
    if (!leafletMapRef.current || !pedido.cadete_coordenadas) return
    setModoCamara('cadete')
    leafletMapRef.current.flyTo(
      [pedido.cadete_coordenadas.latitud, pedido.cadete_coordenadas.longitud],
      16,
      { duration: 0.8 }
    )
  }

  const enfocarRutaCompleta = () => {
    if (!leafletMapRef.current) return
    const L = require('leaflet')
    setModoCamara('todo')
    const bounds = L.latLngBounds([[UBICACION_LOCAL.latitud, UBICACION_LOCAL.longitud]])
    if (pedido.coordenadas) {
      bounds.extend([pedido.coordenadas.latitud, pedido.coordenadas.longitud])
    }
    if (pedido.cadete_coordenadas) {
      bounds.extend([pedido.cadete_coordenadas.latitud, pedido.cadete_coordenadas.longitud])
    }
    leafletMapRef.current.fitBounds(bounds, { padding: [45, 45], maxZoom: 16, animate: true, duration: 0.8 })
  }

  const enfocarCliente = () => {
    if (!leafletMapRef.current || !pedido.coordenadas) return
    setModoCamara('cliente')
    leafletMapRef.current.flyTo(
      [pedido.coordenadas.latitud, pedido.coordenadas.longitud],
      16,
      { duration: 0.8 }
    )
  }

  const esperandoGps = !pedido.cadete_coordenadas
  const enLaPuerta = distanciaRestanteKm !== null && distanciaRestanteKm < 0.09 && ['listo', 'en_camino'].includes(pedido.estado)

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden z-0 bg-slate-100">
      <style dangerouslySetInnerHTML={{
        __html: `
        .animated-cadete-marker {
          transition: transform 0.9s cubic-bezier(0.25, 1, 0.5, 1) !important;
        }
        .cadete-radar-pulse {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 2px solid rgba(225, 29, 72, 0.6);
          animation: cadete-pulse 1.8s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
          pointer-events: none;
        }
        @keyframes cadete-pulse {
          0% { transform: scale(0.6); opacity: 0.9; }
          80%, 100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes polyline-dash {
          to { stroke-dashoffset: -44; }
        }
        .animated-polyline-dash {
          animation: polyline-dash 1.8s linear infinite;
        }
        .leaflet-container {
          width: 100% !important;
          height: 100% !important;
          background-color: #e2e8f0;
        }
      `,
      }} />

      {/* Contenedor del Mapa Leaflet (100% absoluto) */}
      <div ref={mapRef} className="w-full h-full" style={{ width: '100%', height: '100%' }} />

      {/* HUD Superior con ETA / Aviso de "En la puerta" */}
      {enLaPuerta ? (
        <div className="absolute top-3.5 left-0 right-0 z-[400] flex justify-center pointer-events-none px-3">
          <div className="bg-emerald-500 text-slate-950 px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-2.5 animate-bounce border-2 border-white">
            <span className="text-xl">🎉</span>
            <div className="text-left">
              <span className="text-xs font-black uppercase tracking-wider block">¡El repartidor está en tu puerta!</span>
              <span className="text-[11px] font-bold text-slate-900">Por favor salí a recibir tu pedido</span>
            </div>
          </div>
        </div>
      ) : (
        etaText && !esperandoGps && (
          <div className="absolute top-3.5 left-0 right-0 z-[400] flex justify-center pointer-events-none px-3">
            <div className="bg-emerald-600 text-white px-4 py-1.5 rounded-full shadow-xl flex items-center gap-2 animate-in slide-in-from-top-4 border border-emerald-400/40">
              <span className="text-base">🛵</span>
              <span className="text-xs sm:text-sm font-black tracking-wide">{etaText}</span>
            </div>
          </div>
        )
      )}

      {/* HUD de Botones de Cámara Inteligente */}
      <div className="absolute top-3.5 right-3.5 z-[400] flex flex-col gap-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-none p-1 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800">
        {/* Seguir al Cadete */}
        <button
          type="button"
          onClick={enfocarCadete}
          disabled={!pedido.cadete_coordenadas}
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
            modoCamara === 'cadete'
              ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40'
          }`}
          title="Seguir al repartidor en vivo"
        >
          <Bike size={18} />
        </button>

        {/* Ver Ruta Completa */}
        <button
          type="button"
          onClick={enfocarRutaCompleta}
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
            modoCamara === 'todo'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title="Ver ruta completa (Local, Repartidor y Casa)"
        >
          <Compass size={18} />
        </button>

        {/* Mi Domicilio */}
        <button
          type="button"
          onClick={enfocarCliente}
          disabled={!pedido.coordenadas}
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
            modoCamara === 'cliente'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40'
          }`}
          title="Centrar en mi domicilio"
        >
          <Home size={18} />
        </button>
      </div>

      {/* Badge flotante inferior cuando aún no hay señal de GPS del cadete */}
      {esperandoGps && pedido.estado === 'en_camino' && (
        <div className="absolute inset-x-0 bottom-4 z-[400] flex justify-center pointer-events-none px-3">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-2 rounded-full shadow-xl flex items-center gap-2.5 animate-bounce">
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </div>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Conectando señal en vivo con el repartidor...</span>
          </div>
        </div>
      )}
    </div>
  )
}

