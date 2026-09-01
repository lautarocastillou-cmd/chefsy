'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { UBICACION_LOCAL, calcularDistanciaKm, generarSvgMotoCenital } from '@/lib/ubicacion'
import { formatearPrecio } from '@/lib/utils'
import { Compass, Bike, Store, Maximize2, Layers } from 'lucide-react'
import 'leaflet/dist/leaflet.css'

// Coordenadas del local Chefsy
const LOCAL_LAT = UBICACION_LOCAL.latitud
const LOCAL_LNG = UBICACION_LOCAL.longitud

export interface CadeteData {
  id: string
  nombre: string
  lat: number | null
  lng: number | null
  gps_activo: boolean
  bateria?: number | null
  updated_at: string | null
  segundos_offline?: number | null
  pedidoActivo?: {
    id: string
    cliente: string
    direccion?: string | null
    coordenadas?: { latitud: number; longitud: number } | null
    estado: string
    total?: number | null
  } | null
}

interface MapaGlobalProps {
  cadetes: CadeteData[]
  focusedId?: string | null
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

// Helper: Camino angular más corto (-180° a +180°)
function calcularRumboMasCorto(inicio: number, destino: number): number {
  return ((destino - inicio + 540) % 360) - 180
}

// Helper: Curva de aceleración sinusoidal
function easeInOutSine(x: number): number {
  return -(Math.cos(Math.PI * x) - 1) / 2
}

interface CadeteAnimState {
  latActual: number
  lngActual: number
  rumboActual: number
  latInicio: number
  lngInicio: number
  rumboInicio: number
  latDestino: number
  lngDestino: number
  rumboDestino: number
  startTime: number
  duracion: number
}

export default function MapaGlobal({ cadetes, focusedId }: MapaGlobalProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<{
    local?: any
    cadetes: Record<string, any>
    clientes: Record<string, any>
    rutasBase: Record<string, any>
    rutasDash: Record<string, any>
  }>({ cadetes: {}, clientes: {}, rutasBase: {}, rutasDash: {} })

  // ── Referencias del Motor de Interpolación Multi-Cadete ─────────────────────
  const animStatesRef = useRef<Record<string, CadeteAnimState>>({})
  const ultimosUpdatesRef = useRef<Record<string, number>>({})
  const animFrameRef = useRef<number | null>(null)
  const cadetesDataRef = useRef<CadeteData[]>([])
  const focusedIdRef = useRef<string | null | undefined>(focusedId)
  const [modoCamara, setModoCamara] = useState<'todo' | 'cadete' | 'manual'>('todo')
  const modoCamaraRef = useRef<'todo' | 'cadete' | 'manual'>('todo')

  useEffect(() => {
    cadetesDataRef.current = cadetes
  }, [cadetes])

  useEffect(() => {
    focusedIdRef.current = focusedId
    if (focusedId) {
      setModoCamara('cadete')
    }
  }, [focusedId])

  useEffect(() => {
    modoCamaraRef.current = modoCamara
  }, [modoCamara])

  // Helper para rotar elementos del marcador en CSS sin recrear el DOM
  const aplicarRotacionCadete = useCallback((cadeteId: string, rumbo: number) => {
    const marker = markersRef.current.cadetes[cadeteId]
    if (!marker) return
    const el = marker.getElement()
    if (!el) return
    const rotatables = el.querySelectorAll('.cadete-rotatable')
    rotatables.forEach((item: any) => {
      if (item.classList.contains('cadete-direction-arrow')) {
        item.style.transform = `rotate(${rumbo}deg) translateY(-24px)`
      } else {
        item.style.transform = `rotate(${rumbo}deg)`
      }
    })
  }, [])

  // ── 1. Inicializar Mapa Leaflet (1 sola vez al montar) ───────────────────────
  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current || mapInstanceRef.current) return

    const L = require('leaflet')

    if ((mapContainerRef.current as any)._leaflet_id) {
      delete (mapContainerRef.current as any)._leaflet_id
    }

    const map = L.map(mapContainerRef.current, {
      center: [LOCAL_LAT, LOCAL_LNG],
      zoom: 14,
      zoomControl: false,
      attributionControl: false,
    })

    // Google Maps HD
    L.tileLayer('https://mt1.google.com/vt/lyrs=r&x={x}&y={y}&z={z}', {
      attribution: '&copy; Google Maps',
      maxZoom: 20,
    }).addTo(map)

    L.control.zoom({ position: 'bottomright' }).addTo(map)

    map.on('dragstart', () => {
      setModoCamara('manual')
    })

    mapInstanceRef.current = map

    // Marcador del Local Chefsy
    const localIcon = L.divIcon({
      html: `
        <div style="display:flex;flex-direction:column;align-items:center;user-select:none;">
          <div style="width:40px;height:40px;background:#2A6348;border:2.5px solid #fff;border-radius:50%;box-shadow:0 4px 12px rgba(42,99,72,0.45);font-size:20px;display:flex;align-items:center;justify-content:center;">
            🏪
          </div>
          <div style="margin-top:2px;background:#2A6348;color:#ffffff;font-size:10px;font-weight:900;padding:1px 6px;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.25);white-space:nowrap;border:1px solid #ffffff;">
            Local Chefsy
          </div>
        </div>
      `,
      className: 'custom-local-icon',
      iconSize: [80, 56],
      iconAnchor: [40, 20],
      popupAnchor: [0, -22],
    })

    markersRef.current.local = L.marker([LOCAL_LAT, LOCAL_LNG], { icon: localIcon, zIndexOffset: 500 })
      .addTo(map)
      .bindPopup(`
        <div style="text-align:center;padding:4px;font-family:sans-serif;">
          <b style="font-size:14px;color:#2A6348;">🏪 Local Chefsy</b>
          <p style="margin:4px 0 0;font-size:11px;color:#64748b;">Punto de partida y cocina central</p>
        </div>
      `)

    let resizeObserver: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined' && mapContainerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        map.invalidateSize({ pan: false })
      })
      resizeObserver.observe(mapContainerRef.current)
    }

    const t1 = setTimeout(() => map.invalidateSize(), 100)
    const t2 = setTimeout(() => map.invalidateSize(), 400)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      if (resizeObserver) resizeObserver.disconnect()
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
        markersRef.current = { cadetes: {}, clientes: {}, rutasBase: {}, rutasDash: {} }
      }
    }
  }, [])


  // ── 2. Bucle Global de Animación a 60 FPS (Gliding Multi-Cadete) ────────────
  useEffect(() => {
    const loopAnimacion = (timestamp: number) => {
      const states = animStatesRef.current
      const cadetesList = cadetesDataRef.current
      const focused = focusedIdRef.current
      const map = mapInstanceRef.current

      Object.keys(states).forEach((id) => {
        const s = states[id]
        const marker = markersRef.current.cadetes[id]
        if (!s || !marker) return

        const tiempoPasado = timestamp - s.startTime
        const progresoCrudo = Math.min(tiempoPasado / s.duracion, 1)
        const progreso = easeInOutSine(progresoCrudo)

        // 1. Coordenadas interpoladas
        const lat = s.latInicio + (s.latDestino - s.latInicio) * progreso
        const lng = s.lngInicio + (s.lngDestino - s.lngInicio) * progreso

        // 2. Rumbo interpolado
        const deltaRumbo = calcularRumboMasCorto(s.rumboInicio, s.rumboDestino)
        const rumbo = (s.rumboInicio + deltaRumbo * progreso + 360) % 360

        s.latActual = lat
        s.lngActual = lng
        s.rumboActual = rumbo

        // Mover marcador
        marker.setLatLng([lat, lng])

        // Rotar faro y moto
        aplicarRotacionCadete(id, rumbo)

        // 3. Acortar polilínea de entrega en tiempo real si tiene pedido activo
        const cadeteInfo = cadetesList.find((c) => c.id === id)
        const coordsCliente = cadeteInfo?.pedidoActivo?.coordenadas
        const rutaKey = `ruta_${id}`

        if (coordsCliente && coordsCliente.latitud != null && coordsCliente.longitud != null) {
          const puntosRuta = [
            [lat, lng],
            [coordsCliente.latitud, coordsCliente.longitud]
          ]
          if (markersRef.current.rutasBase[rutaKey]) {
            markersRef.current.rutasBase[rutaKey].setLatLngs(puntosRuta)
          }
          if (markersRef.current.rutasDash[rutaKey]) {
            markersRef.current.rutasDash[rutaKey].setLatLngs(puntosRuta)
          }
        }

        // 4. Si es el cadete enfocado y la cámara está en modo cadete, acompañar suavemente
        if (focused === id && modoCamaraRef.current === 'cadete' && map) {
          map.panTo([lat, lng], { animate: false })
        }
      })

      animFrameRef.current = requestAnimationFrame(loopAnimacion)
    }

    animFrameRef.current = requestAnimationFrame(loopAnimacion)

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [aplicarRotacionCadete])

  // ── 3. Sincronización de Marcadores, Destinos y Rutas ─────────────────────────
  useEffect(() => {
    if (!mapInstanceRef.current) return
    const L = require('leaflet')
    const map = mapInstanceRef.current
    const ahora = performance.now()

    const cadetesConUbicacion = cadetes.filter((c) => c.lat != null && c.lng != null && c.gps_activo)
    const currentCadeteIds = new Set(cadetesConUbicacion.map((c) => c.id))

    // Limpiar marcadores de cadetes que ya no están activos
    Object.keys(markersRef.current.cadetes).forEach((id) => {
      if (!currentCadeteIds.has(id)) {
        markersRef.current.cadetes[id].remove()
        delete markersRef.current.cadetes[id]
        delete animStatesRef.current[id]
        delete ultimosUpdatesRef.current[id]

        const rutaKey = `ruta_${id}`
        if (markersRef.current.rutasBase[rutaKey]) {
          markersRef.current.rutasBase[rutaKey].remove()
          delete markersRef.current.rutasBase[rutaKey]
        }
        if (markersRef.current.rutasDash[rutaKey]) {
          markersRef.current.rutasDash[rutaKey].remove()
          delete markersRef.current.rutasDash[rutaKey]
        }
      }
    })

    const activeClientOrderIds = new Set<string>()

    cadetes.forEach((cadete) => {
      const tieneGps = cadete.lat != null && cadete.lng != null && cadete.gps_activo
      if (!tieneGps || cadete.lat == null || cadete.lng == null) return

      const targetLat = cadete.lat
      const targetLng = cadete.lng
      const esEnViaje = !!cadete.pedidoActivo

      const colorBg = esEnViaje ? '#E11D48' : '#10B981'
      const sombraColor = esEnViaje ? 'rgba(225,29,72,0.5)' : 'rgba(16,185,129,0.5)'

      // Medir lapso entre updates para suavizado dinámico
      const ultimoT = ultimosUpdatesRef.current[cadete.id] || 0
      const lapsoReal = ultimoT > 0 ? ahora - ultimoT : 4000
      ultimosUpdatesRef.current[cadete.id] = ahora
      const duracionAnim = Math.min(Math.max(lapsoReal * 1.05, 2500), 6000)

      // Inicializar o actualizar estado de animación del cadete
      const estadoActual = animStatesRef.current[cadete.id]
      if (!estadoActual) {
        animStatesRef.current[cadete.id] = {
          latActual: targetLat,
          lngActual: targetLng,
          rumboActual: 0,
          latInicio: targetLat,
          lngInicio: targetLng,
          rumboInicio: 0,
          latDestino: targetLat,
          lngDestino: targetLng,
          rumboDestino: 0,
          startTime: ahora,
          duracion: duracionAnim,
        }
      } else {
        const distDelta = Math.sqrt(
          Math.pow(targetLat - estadoActual.latActual, 2) +
          Math.pow(targetLng - estadoActual.lngActual, 2)
        )
        if (distDelta > 0.00001) {
          const targetHeading = Math.round(
            calcularRumbo(estadoActual.latActual, estadoActual.lngActual, targetLat, targetLng)
          )
          estadoActual.latInicio = estadoActual.latActual
          estadoActual.lngInicio = estadoActual.lngActual
          estadoActual.rumboInicio = estadoActual.rumboActual
          estadoActual.latDestino = targetLat
          estadoActual.lngDestino = targetLng
          estadoActual.rumboDestino = targetHeading
          estadoActual.startTime = ahora
          estadoActual.duracion = duracionAnim
        }
      }

      const rumbo = animStatesRef.current[cadete.id]?.rumboActual || 0

      const batBadge =
        cadete.bateria != null
          ? `<div style="position:absolute;top:-6px;right:-8px;background:${
              cadete.bateria > 20 ? '#10B981' : '#EF4444'
            };color:#fff;font-size:9px;font-weight:900;padding:1px 4px;border-radius:10px;border:1.5px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,0.25);">${Math.round(
              cadete.bateria
            )}%</div>`
          : ''

      // A) Marcador del Cadete con Haz de Luz y Moto Cenital (Vista Superior GPS)
      const cadeteHtml = `
        <div class="cadete-marker-outer" style="position:relative; width:54px; height:54px; display:flex; flex-direction:column; align-items:center; justify-content:center; cursor:pointer; user-select:none;">
          <!-- Haz de luz delantero -->
          <div class="cadete-headlight-cone cadete-rotatable" style="transform: rotate(${rumbo}deg);"></div>
          <!-- Onda de radar -->
          <div class="cadete-radar-pulse" style="border-color:${colorBg};"></div>
          <!-- Badge 3D de la moto con vista cenital que rota 360° fluidamente -->
          <div class="cadete-moto-badge cadete-rotatable" style="transform: rotate(${rumbo}deg); position:relative; width:42px; height:42px; background:rgba(15,23,42,0.92); border:2.5px solid #fff; border-radius:50%; box-shadow:0 4px 14px ${sombraColor}; display:flex; align-items:center; justify-content:center;">
            ${generarSvgMotoCenital(colorBg)}
          </div>
          <!-- Badge de batería siempre derecho y legible -->
          ${batBadge}
          <!-- Flecha direccional -->
          <div class="cadete-direction-arrow cadete-rotatable" style="position:absolute; top:2px; transform: rotate(${rumbo}deg) translateY(-24px); font-size:11px; color:${colorBg}; font-weight:900; text-shadow:0 1px 2px #fff;">
            ▲
          </div>
          <!-- Etiqueta de Nombre del Cadete -->
          <div style="margin-top:2px; background:rgba(15,23,42,0.92); color:#ffffff; font-size:10px; font-weight:900; padding:1px 7px; border-radius:8px; box-shadow:0 2px 6px rgba(0,0,0,0.35); white-space:nowrap; max-width:110px; overflow:hidden; text-overflow:ellipsis; border:1px solid rgba(255,255,255,0.8); letter-spacing:0.2px;">
            ${cadete.nombre}
          </div>
        </div>
      `

      const cadeteIcon = L.divIcon({
        html: cadeteHtml,
        className: 'custom-cadete-animated-marker',
        iconSize: [110, 74],
        iconAnchor: [55, 27],
        popupAnchor: [0, -27],
      })

      const popupContent = `
        <div style="min-width:190px;padding:4px;font-family:sans-serif;">
          <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e2e8f0;padding-bottom:6px;margin-bottom:6px;">
            <b style="font-size:14px;color:#0f172a;">🛵 ${cadete.nombre}</b>
            ${
              cadete.bateria != null
                ? `<span style="font-size:11px;font-weight:bold;color:${
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
                ? `<span style="color:#e11d48;font-weight:bold;">📦 EN REPARTO</span>
                   <div style="color:#334155;font-size:12px;margin-top:2px;">Cliente: <b>${cadete.pedidoActivo.cliente}</b></div>
                   ${cadete.pedidoActivo.direccion ? `<div style="color:#64748b;font-size:11px;margin-top:1px;">📍 ${cadete.pedidoActivo.direccion}</div>` : ''}`
                : `<span style="color:#16a34a;font-weight:bold;">🟢 DISPONIBLE</span>
                   <div style="color:#64748b;font-size:11px;margin-top:2px;">En espera / Libre</div>`
            }
          </div>
          <div style="font-size:10px;color:#94a3b8;border-top:1px solid #f1f5f9;padding-top:4px;">
            Última señal: ${cadete.updated_at ? new Date(cadete.updated_at).toLocaleTimeString() : 'Hace instantes'}
          </div>
        </div>
      `

      if (markersRef.current.cadetes[cadete.id]) {
        markersRef.current.cadetes[cadete.id].setIcon(cadeteIcon)
        markersRef.current.cadetes[cadete.id].setPopupContent(popupContent)
      } else {
        markersRef.current.cadetes[cadete.id] = L.marker([targetLat, targetLng], {
          icon: cadeteIcon,
          zIndexOffset: 300,
        })
          .addTo(map)
          .bindPopup(popupContent)
      }

      // B) Marcador del Cliente de Entrega
      const coords = cadete.pedidoActivo?.coordenadas
      if (cadete.pedidoActivo && coords && coords.latitud != null && coords.longitud != null) {
        const pedido = cadete.pedidoActivo
        const clientKey = `cliente_${pedido.id}`
        activeClientOrderIds.add(clientKey)

        const clientLat = coords.latitud
        const clientLng = coords.longitud

        const clienteIcon = L.divIcon({
          html: `
            <div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;user-select:none;">
              <div style="position:relative;display:flex;align-items:center;justify-content:center;width:38px;height:38px;background:#2563EB;border:2.5px solid #fff;border-radius:50%;box-shadow:0 4px 10px rgba(37,99,235,0.4);font-size:18px;">
                🏠
              </div>
              <div style="margin-top:2px;background:#1e40af;color:#ffffff;font-size:10px;font-weight:900;padding:1px 6px;border-radius:8px;box-shadow:0 2px 6px rgba(0,0,0,0.3);white-space:nowrap;max-width:110px;overflow:hidden;text-overflow:ellipsis;border:1px solid #ffffff;letter-spacing:0.2px;">
                ${pedido.cliente}
              </div>
            </div>
          `,
          className: 'custom-cliente-icon',
          iconSize: [110, 64],
          iconAnchor: [55, 19],
          popupAnchor: [0, -22],
        })

        const clientPopup = `
          <div style="min-width:180px;padding:4px;font-family:sans-serif;">
            <div style="border-bottom:1px solid #e2e8f0;padding-bottom:4px;margin-bottom:6px;">
              <b style="font-size:13px;color:#1e40af;">🏠 Entrega: ${pedido.cliente}</b>
            </div>
            ${pedido.direccion ? `<div style="font-size:12px;color:#334155;margin-bottom:4px;">📍 ${pedido.direccion}</div>` : ''}
            <div style="font-size:11px;color:#64748b;">Cadete asignado: <b>🛵 ${cadete.nombre}</b></div>
            ${pedido.total ? `<div style="font-size:11px;font-weight:bold;color:#0f172a;margin-top:2px;">Total: ${formatearPrecio(pedido.total)}</div>` : ''}
          </div>
        `

        if (markersRef.current.clientes[clientKey]) {
          markersRef.current.clientes[clientKey].setLatLng([clientLat, clientLng])
          markersRef.current.clientes[clientKey].setPopupContent(clientPopup)
        } else {
          markersRef.current.clientes[clientKey] = L.marker([clientLat, clientLng], {
            icon: clienteIcon,
            zIndexOffset: 200,
          })
            .addTo(map)
            .bindPopup(clientPopup)
        }

        // C) Polilínea Dinámica Dual (Base resplandor + Trazo punteado animado)
        const rutaKey = `ruta_${cadete.id}`
        const startPoint: [number, number] = [estadoActual?.latActual || targetLat, estadoActual?.lngActual || targetLng]
        const endPoint: [number, number] = [clientLat, clientLng]
        const rutaCoords: [number, number][] = [startPoint, endPoint]

        if (!markersRef.current.rutasBase[rutaKey]) {
          markersRef.current.rutasBase[rutaKey] = L.polyline(rutaCoords, {
            color: '#059669',
            weight: 5,
            opacity: 0.45,
            lineCap: 'round',
            lineJoin: 'round',
          }).addTo(map)

          markersRef.current.rutasDash[rutaKey] = L.polyline(rutaCoords, {
            color: '#10B981',
            weight: 3,
            dashArray: '8, 12',
            className: 'animated-polyline-dash',
            lineCap: 'round',
            lineJoin: 'round',
          }).addTo(map)
        }
      }
    })

    // Limpiar clientes que ya no tienen pedido activo
    Object.keys(markersRef.current.clientes).forEach((key) => {
      if (!activeClientOrderIds.has(key)) {
        markersRef.current.clientes[key].remove()
        delete markersRef.current.clientes[key]
      }
    })
  }, [cadetes])

  // ── 4. Control de Enfoque desde la barra lateral ────────────────────────────
  useEffect(() => {
    if (!focusedId || !mapInstanceRef.current) return
    const map = mapInstanceRef.current

    const cadeteMarker = markersRef.current.cadetes[focusedId]
    if (cadeteMarker) {
      setModoCamara('cadete')
      map.flyTo(cadeteMarker.getLatLng(), 16, { animate: true, duration: 0.8 })
      cadeteMarker.openPopup()
      return
    }

    const clientKey = `cliente_${focusedId}`
    const clientMarker = markersRef.current.clientes[clientKey]
    if (clientMarker) {
      map.flyTo(clientMarker.getLatLng(), 16, { animate: true, duration: 0.8 })
      clientMarker.openPopup()
    }
  }, [focusedId])

  // ── Acciones de Cámara HUD ──────────────────────────────────────────────────
  const encuadrarTodaLaFlota = () => {
    if (!mapInstanceRef.current) return
    const L = require('leaflet')
    setModoCamara('todo')
    const bounds = L.latLngBounds([[LOCAL_LAT, LOCAL_LNG]])

    cadetes.forEach((c) => {
      if (c.lat != null && c.lng != null && c.gps_activo) {
        bounds.extend([c.lat, c.lng])
      }
      if (c.pedidoActivo?.coordenadas?.latitud && c.pedidoActivo?.coordenadas?.longitud) {
        bounds.extend([c.pedidoActivo.coordenadas.latitud, c.pedidoActivo.coordenadas.longitud])
      }
    })

    mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 16, animate: true, duration: 0.8 })
  }

  const centrarEnLocal = () => {
    if (!mapInstanceRef.current) return
    setModoCamara('manual')
    mapInstanceRef.current.flyTo([LOCAL_LAT, LOCAL_LNG], 15, { duration: 0.8 })
  }

  return (
    <div className="relative w-full h-full min-h-[400px] overflow-hidden z-0 bg-slate-100">
      <style dangerouslySetInnerHTML={{
        __html: `
        .cadete-headlight-cone {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 54px;
          height: 64px;
          margin-left: -27px;
          margin-top: -64px;
          background: radial-gradient(ellipse at 50% 100%, rgba(254, 240, 138, 0.6) 0%, rgba(253, 224, 71, 0.3) 45%, rgba(253, 224, 71, 0) 80%);
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

      {/* Contenedor del Mapa Leaflet */}
      <div
        ref={mapContainerRef}
        className="w-full h-full min-h-[400px]"
        style={{ width: '100%', height: '100%', minHeight: '400px' }}
      />

      {/* HUD de Botones de Cámara Inteligente en Torre de Control */}
      <div className="absolute top-3.5 right-3.5 z-[400] flex flex-col gap-1.5 bg-white/95 dark:bg-slate-900/95 p-1 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800">
        {/* Ver toda la flota */}
        <button
          type="button"
          onClick={encuadrarTodaLaFlota}
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
            modoCamara === 'todo'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title="Ver toda la flota en vivo"
        >
          <Compass size={18} />
        </button>

        {/* Local Chefsy */}
        <button
          type="button"
          onClick={centrarEnLocal}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
          title="Centrar en Local Chefsy"
        >
          <Store size={18} />
        </button>
      </div>
    </div>
  )
}


