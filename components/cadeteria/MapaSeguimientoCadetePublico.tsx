'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { UBICACION_LOCAL } from '@/lib/ubicacion'
import { Bike, Navigation, Compass, Layers, LocateFixed, Store } from 'lucide-react'
import 'leaflet/dist/leaflet.css'

export interface CadeteCoords {
  lat: number
  lng: number
  speed?: number | null
  heading?: number | null
  accuracy?: number | null
  updated_at?: string | null
}

interface Props {
  cadeteNombre: string
  posicion: CadeteCoords | null
  historialPuntos?: Array<{ lat: number; lng: number }>
}

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

function calcularRumboMasCorto(inicio: number, destino: number): number {
  return ((destino - inicio + 540) % 360) - 180
}

export default function MapaSeguimientoCadetePublico({
  cadeteNombre,
  posicion,
  historialPuntos = []
}: Props) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const motoMarkerRef = useRef<any>(null)
  const localMarkerRef = useRef<any>(null)
  const polylineRef = useRef<any>(null)

  const [seguirMoto, setSeguirMoto] = useState<boolean>(true)
  const seguirMotoRef = useRef<boolean>(true)

  // Interpolación de movimiento a 60 FPS
  const animFrameRef = useRef<number | null>(null)
  const posActualRef = useRef<{ lat: number; lng: number; rumbo: number } | null>(null)
  const posInicioRef = useRef<{ lat: number; lng: number; rumbo: number } | null>(null)
  const posDestinoRef = useRef<{ lat: number; lng: number; rumbo: number } | null>(null)
  const animStartTimeRef = useRef<number>(0)
  const duracionAnimacionRef = useRef<number>(3000)

  useEffect(() => {
    seguirMotoRef.current = seguirMoto
  }, [seguirMoto])

  // ── Inicializar Mapa Leaflet ────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return

    const L = require('leaflet')

    if ((mapContainerRef.current as any)._leaflet_id) {
      delete (mapContainerRef.current as any)._leaflet_id
    }

    const centroInicial = posicion && posicion.lat && posicion.lng
      ? [posicion.lat, posicion.lng]
      : [UBICACION_LOCAL.latitud, UBICACION_LOCAL.longitud]

    const map = L.map(mapContainerRef.current, {
      center: centroInicial,
      zoom: 16,
      zoomControl: false,
      attributionControl: false,
    })

    // Capa HD de CARTO Voyager
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; CARTO &copy; OpenStreetMap',
      subdomains: 'abcd',
      maxZoom: 20,
    }).addTo(map)

    L.control.zoom({ position: 'bottomright' }).addTo(map)

    mapInstanceRef.current = map

    // Pausar auto-seguimiento si el usuario arrastra manualmente el mapa
    map.on('dragstart', () => {
      setSeguirMoto(false)
    })

    // 1. Marcador del Local Chefsy (Referencia)
    const localIcon = L.divIcon({
      html: `
        <div style="display:flex;flex-direction:column;align-items:center;user-select:none;">
          <div style="width:34px;height:34px;background:#2A6348;border:2.5px solid #fff;border-radius:50%;box-shadow:0 3px 8px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/></svg>
          </div>
          <div style="margin-top:2px;background:#2A6348;color:#fff;font-size:9px;font-weight:900;padding:1px 5px;border-radius:6px;border:1px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.2);">
            Chefsy
          </div>
        </div>
      `,
      className: 'custom-local-icon',
      iconSize: [54, 50],
      iconAnchor: [27, 17],
    })
    localMarkerRef.current = L.marker([UBICACION_LOCAL.latitud, UBICACION_LOCAL.longitud], { icon: localIcon, zIndexOffset: 100 })
      .addTo(map)
      .bindPopup('<b>Chefsy</b><br/><span style="font-size:11px;color:#555;">Punto de partida</span>')

    // 2. Polilínea de Recorrido Reciente
    polylineRef.current = L.polyline([], {
      color: '#10B981',
      weight: 5,
      opacity: 0.75,
      lineCap: 'round',
      lineJoin: 'round',
      dashArray: '6, 8',
    }).addTo(map)

    // 3. Marcador de la Moto con Faro y Radar
    const motoIcon = L.divIcon({
      html: `
        <div class="cadete-marker-outer" style="position:relative; width:54px; height:54px; display:flex; align-items:center; justify-content:center;">
          <div class="cadete-headlight-cone cadete-rotatable" style="transform: rotate(0deg);"></div>
          <div class="cadete-radar-pulse"></div>
          <div class="cadete-moto-badge" style="width:44px; height:44px; background:#E11D48; border:2.5px solid white; border-radius:50%; box-shadow:0 4px 14px rgba(225,29,72,0.6); display:flex; align-items:center; justify-content:center; cursor:pointer;">
            <span class="cadete-moto-flip" style="display:flex; align-items:center; justify-content:center; transition:transform 0.15s ease-out; transform: scaleX(1);">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/></svg>
            </span>
          </div>
          <div class="cadete-direction-arrow cadete-rotatable" style="position:absolute; top:2px; transform: rotate(0deg) translateY(-25px); font-size:12px; color:#E11D48; font-weight:900; text-shadow:0 1px 2px #fff;">
            ▲
          </div>
        </div>
      `,
      className: 'custom-moto-animated-icon',
      iconSize: [54, 54],
      iconAnchor: [27, 27],
    })

    const initialLat = posicion?.lat ?? UBICACION_LOCAL.latitud
    const initialLng = posicion?.lng ?? UBICACION_LOCAL.longitud

    motoMarkerRef.current = L.marker([initialLat, initialLng], {
      icon: motoIcon,
      zIndexOffset: 1000,
    }).addTo(map)

    posActualRef.current = { lat: initialLat, lng: initialLng, rumbo: posicion?.heading ?? 0 }

    // InvalidateSize continuo
    const invalidate = () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize({ pan: false })
      }
    }

    let ro: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined' && mapContainerRef.current) {
      ro = new ResizeObserver(invalidate)
      ro.observe(mapContainerRef.current)
    }

    const t1 = setTimeout(invalidate, 100)
    const t2 = setTimeout(invalidate, 400)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      if (ro) ro.disconnect()
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  // ── Actualizar Trayectoria Reciente ─────────────────────────────────────────
  useEffect(() => {
    if (!polylineRef.current) return

    if (historialPuntos && historialPuntos.length >= 2) {
      polylineRef.current.setLatLngs(historialPuntos.map(p => [p.lat, p.lng]))
    } else if (posicion?.lat && posicion?.lng) {
      // Al menos el local y la posición actual
      polylineRef.current.setLatLngs([
        [UBICACION_LOCAL.latitud, UBICACION_LOCAL.longitud],
        [posicion.lat, posicion.lng]
      ])
    }
  }, [historialPuntos, posicion?.lat, posicion?.lng])

  // ── Renderizar Marcador de Moto (Rotación y Flip) ───────────────────────────
  const actualizarMarcadorEnMapa = useCallback((lat: number, lng: number, rumbo: number) => {
    if (!motoMarkerRef.current) return

    motoMarkerRef.current.setLatLng([lat, lng])

    const markerEl = motoMarkerRef.current.getElement()
    if (markerEl) {
      const rotatables = markerEl.querySelectorAll('.cadete-rotatable')
      rotatables.forEach((el: any) => {
        if (el.classList.contains('cadete-direction-arrow')) {
          el.style.transform = `rotate(${rumbo}deg) translateY(-25px)`
        } else {
          el.style.transform = `rotate(${rumbo}deg)`
        }
      })

      const motoIcon = markerEl.querySelector('.cadete-moto-flip') as HTMLElement
      if (motoIcon) {
        const esOeste = rumbo > 180 && rumbo < 360
        motoIcon.style.transform = esOeste ? 'scaleX(-1)' : 'scaleX(1)'
      }
    }

    if (seguirMotoRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.panTo([lat, lng], { animate: false })
    }
  }, [])

  // ── Motor de Animación Suave al Recibir Nuevas Coordenadas ──────────────────
  useEffect(() => {
    if (!posicion || !posicion.lat || !posicion.lng) return

    const destinoLat = posicion.lat
    const destinoLng = posicion.lng

    const actual = posActualRef.current || {
      lat: destinoLat,
      lng: destinoLng,
      rumbo: posicion.heading ?? 0
    }

    // Calcular rumbo si no viene del hardware
    let rumboDestino = posicion.heading ?? 0
    const deltaLat = destinoLat - actual.lat
    const deltaLng = destinoLng - actual.lng

    if (Math.abs(deltaLat) > 0.00002 || Math.abs(deltaLng) > 0.00002) {
      rumboDestino = Math.round(calcularRumbo(actual.lat, actual.lng, destinoLat, destinoLng))
    }

    posInicioRef.current = { ...actual }
    posDestinoRef.current = { lat: destinoLat, lng: destinoLng, rumbo: rumboDestino }
    animStartTimeRef.current = performance.now()
    duracionAnimacionRef.current = 2800

    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)

    const pasoAnimacion = (timestamp: number) => {
      if (!posInicioRef.current || !posDestinoRef.current) return

      const transcurrido = timestamp - animStartTimeRef.current
      const progreso = Math.min(1, Math.max(0, transcurrido / duracionAnimacionRef.current))

      // Curva de aceleración sinusoidal suave
      const ease = -(Math.cos(Math.PI * progreso) - 1) / 2

      const curLat = posInicioRef.current.lat + (posDestinoRef.current.lat - posInicioRef.current.lat) * ease
      const curLng = posInicioRef.current.lng + (posDestinoRef.current.lng - posInicioRef.current.lng) * ease

      const deltaRumbo = calcularRumboMasCorto(posInicioRef.current.rumbo, posDestinoRef.current.rumbo)
      const curRumbo = (posInicioRef.current.rumbo + deltaRumbo * ease + 360) % 360

      posActualRef.current = { lat: curLat, lng: curLng, rumbo: curRumbo }
      actualizarMarcadorEnMapa(curLat, curLng, curRumbo)

      if (progreso < 1) {
        animFrameRef.current = requestAnimationFrame(pasoAnimacion)
      } else {
        posActualRef.current = { lat: destinoLat, lng: destinoLng, rumbo: rumboDestino }
        actualizarMarcadorEnMapa(destinoLat, destinoLng, rumboDestino)
      }
    }

    animFrameRef.current = requestAnimationFrame(pasoAnimacion)

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [posicion?.lat, posicion?.lng, posicion?.heading, actualizarMarcadorEnMapa])

  // ── Botón para Re-centrar en la Moto ───────────────────────────────────────
  const centrarEnMoto = () => {
    if (!mapInstanceRef.current || !posActualRef.current) return
    setSeguirMoto(true)
    mapInstanceRef.current.flyTo([posActualRef.current.lat, posActualRef.current.lng], 16, {
      duration: 0.6,
    })
  }

  // ── Botón para Ver Todo (Local + Moto) ──────────────────────────────────────
  const verRutaCompleta = () => {
    if (!mapInstanceRef.current || !posActualRef.current) return
    setSeguirMoto(false)
    const L = require('leaflet')
    const bounds = L.latLngBounds([
      [UBICACION_LOCAL.latitud, UBICACION_LOCAL.longitud],
      [posActualRef.current.lat, posActualRef.current.lng]
    ])
    mapInstanceRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 16, animate: true })
  }

  return (
    <div className="relative w-full h-full min-h-[350px] bg-slate-900 overflow-hidden">
      <style dangerouslySetInnerHTML={{
        __html: `
        .leaflet-container {
          width: 100% !important;
          height: 100% !important;
          background-color: #0f172a !important;
          z-index: 1;
        }
        .cadete-headlight-cone {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 54px;
          height: 64px;
          margin-left: -27px;
          margin-top: -64px;
          background: radial-gradient(ellipse at 50% 100%, rgba(254, 240, 138, 0.65) 0%, rgba(253, 224, 71, 0.3) 45%, rgba(253, 224, 71, 0) 80%);
          clip-path: polygon(50% 100%, 12% 0%, 88% 0%);
          transform-origin: 50% 100%;
          pointer-events: none;
          filter: blur(1px);
          z-index: 1;
        }
        .cadete-moto-badge {
          position: relative;
          z-index: 2;
          transform-origin: center center;
        }
        .cadete-direction-arrow {
          position: absolute;
          z-index: 3;
          transform-origin: 50% 27px;
        }
        .cadete-radar-pulse {
          position: absolute;
          inset: 4px;
          border-radius: 50%;
          border: 2px solid rgba(225, 29, 72, 0.6);
          animation: cadete-pulse 1.8s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
          pointer-events: none;
          z-index: 0;
        }
        @keyframes cadete-pulse {
          0% { transform: scale(0.7); opacity: 0.9; }
          80%, 100% { transform: scale(1.6); opacity: 0; }
        }
      `
      }} />

      {/* Contenedor del Mapa */}
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

      {/* Botones Flotantes de Control de Cámara */}
      <div className="absolute top-4 right-4 z-[500] flex flex-col gap-2">
        <button
          type="button"
          onClick={centrarEnMoto}
          className={`p-3 rounded-2xl shadow-xl transition-all cursor-pointer flex items-center justify-center ${
            seguirMoto
              ? 'bg-rose-600 text-white shadow-rose-600/30 ring-2 ring-rose-400'
              : 'bg-white/95 dark:bg-slate-900/95 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800'
          }`}
          title="Seguir ubicación del cadete"
        >
          <LocateFixed size={20} className={seguirMoto ? 'animate-pulse' : ''} />
        </button>

        <button
          type="button"
          onClick={verRutaCompleta}
          className="p-3 rounded-2xl bg-white/95 dark:bg-slate-900/95 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 shadow-xl transition-all cursor-pointer flex items-center justify-center"
          title="Ver local y posición actual"
        >
          <Compass size={20} />
        </button>
      </div>
    </div>
  )
}
