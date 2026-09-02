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

// Helper: Camino angular más corto (-180° a +180°) para giros naturales
function calcularRumboMasCorto(inicio: number, destino: number): number {
  return ((destino - inicio + 540) % 360) - 180
}

// Helper: Curva de aceleración sinusoidal para deslizamiento ultra fluido
function easeInOutSine(x: number): number {
  return -(Math.cos(Math.PI * x) - 1) / 2
}

export default function MapaSeguimiento({ pedido }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const leafletMapRef = useRef<any>(null)
  const markersRef = useRef<{ local?: any; cliente?: any; cadete?: any }>({})
  const polylineRef = useRef<{ base?: any; dash?: any }>({})
  
  // ── Referencias del Motor de Interpolación a 60 FPS ─────────────────────────
  const animFrameRef = useRef<number | null>(null)
  const posicionAnimadaRef = useRef<{ latitud: number; longitud: number; rumbo: number } | null>(null)
  const posicionInicioRef = useRef<{ latitud: number; longitud: number; rumbo: number } | null>(null)
  const posicionDestinoRef = useRef<{ latitud: number; longitud: number; rumbo: number } | null>(null)
  const animStartTimeRef = useRef<number>(0)
  const duracionAnimacionRef = useRef<number>(3500)
  const tiempoUltimoUpdateRef = useRef<number>(0)
  
  const [mapaListo, setMapaListo] = useState(false)
  const [distanciaRestanteKm, setDistanciaRestanteKm] = useState<number | null>(null)
  const [modoCamara, setModoCamara] = useState<ModoCamara>('todo')
  const modoCamaraRef = useRef<ModoCamara>('todo')

  // Datos de entrega conjunta / paradas múltiples
  const paradasPrevias = Number((pedido as any).paradas_previas ?? 0)
  const totalParadas = Number((pedido as any).total_paradas ?? 1)
  const paradaActual = Number((pedido as any).parada_actual ?? 1)
  const esProximaEntrega = (pedido as any).es_proxima_entrega !== undefined 
    ? Boolean((pedido as any).es_proxima_entrega) 
    : (paradasPrevias === 0)

  useEffect(() => {
    modoCamaraRef.current = modoCamara
  }, [modoCamara])

  // ── 1. Calcular distancia en tiempo real (sin ETA de minutos para no generar ansiedad) ──
  useEffect(() => {
    if (pedido.cadete_coordenadas && pedido.coordenadas && ['listo', 'en_camino'].includes(pedido.estado)) {
      const distDirecta = calcularDistanciaKm(pedido.cadete_coordenadas, pedido.coordenadas)
      const distRuta = distDirecta * 1.3 // Factor de aproximación de calles
      setDistanciaRestanteKm(distRuta)
    } else {
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

      // Listener: Si el usuario mueve el mapa con el dedo/mouse, cambiar a modo manual
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
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
      }
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

  // ── 4. MOTOR DE INTERPOLACIÓN CONTINUO A 60 FPS (GLIDING ENGINE) ─────────────
  useEffect(() => {
    if (!mapaListo || !leafletMapRef.current || !pedido.cadete_coordenadas) return

    const L = require('leaflet')
    const { latitud: targetLat, longitud: targetLng } = pedido.cadete_coordenadas
    const ahora = performance.now()

    // Medir dinámicamente el intervalo entre reportes GPS para sincronizar la duración
    if (tiempoUltimoUpdateRef.current > 0) {
      const lapsoReal = ahora - tiempoUltimoUpdateRef.current
      duracionAnimacionRef.current = Math.min(Math.max(lapsoReal * 1.05, 2200), 5500)
    }
    tiempoUltimoUpdateRef.current = ahora

    // Helper para actualizar la rotación en el DOM sin recrear elementos
    const aplicarRotacionAlElemento = (rumboGrados: number) => {
      const markerInst = markersRef.current.cadete
      if (!markerInst) return
      const iconElement = markerInst.getElement()
      if (!iconElement) return

      // 1. Rotar faro delantero y flecha en 360° siguiendo la calle
      const rotatables = iconElement.querySelectorAll('.cadete-rotatable')
      rotatables.forEach((el: any) => {
        if (el.classList.contains('cadete-direction-arrow')) {
          el.style.transform = `rotate(${rumboGrados}deg) translateY(-25px)`
        } else {
          el.style.transform = `rotate(${rumboGrados}deg)`
        }
      })

      // 2. Espejar la moto horizontalmente si va al Oeste (NUNCA patas para arriba)
      const motoIcon = iconElement.querySelector('.cadete-moto-flip') as HTMLElement
      if (motoIcon) {
        const esOeste = rumboGrados > 180 && rumboGrados < 360
        motoIcon.style.transform = esOeste ? 'scaleX(-1)' : 'scaleX(1)'
      }
    }

    // Constructor de HTML del marcador con faro delantero en 360° y moto siempre al derecho
    const generarHtmlCadete = (rumboInicial: number) => {
      const esOesteInicial = rumboInicial > 180 && rumboInicial < 360
      return `
        <div class="cadete-marker-outer" style="position:relative; width:54px; height:54px; display:flex; align-items:center; justify-content:center;">
          <!-- Haz de luz / Faro delantero que ilumina la calle hacia donde va en 360° -->
          <div class="cadete-headlight-cone cadete-rotatable" style="transform: rotate(${rumboInicial}deg);"></div>
          <!-- Onda de radar de presencia -->
          <div class="cadete-radar-pulse"></div>
          <!-- Badge circular 3D de la moto (permanece siempre derecho con ruedas al piso) -->
          <div class="cadete-moto-badge" style="width:44px; height:44px; background:#E11D48; border:2.5px solid white; border-radius:50%; box-shadow:0 4px 14px rgba(225,29,72,0.6); display:flex; align-items:center; justify-content:center; cursor:pointer;">
            <span class="cadete-moto-flip" style="display:inline-block; font-size:24px; line-height:1; transition:transform 0.15s ease-out; transform:${esOesteInicial ? 'scaleX(-1)' : 'scaleX(1)'};">
              🛵
            </span>
          </div>
          <!-- Flecha direccional de navegación en 360° -->
          <div class="cadete-direction-arrow cadete-rotatable" style="position:absolute; top:2px; transform: rotate(${rumboInicial}deg) translateY(-25px); font-size:12px; color:#E11D48; font-weight:900; text-shadow:0 1px 2px #fff;">
            ▲
          </div>
        </div>
      `
    }

    // Caso 1: Primera vez que recibimos posición
    if (!posicionAnimadaRef.current) {
      posicionAnimadaRef.current = { latitud: targetLat, longitud: targetLng, rumbo: 0 }
      posicionInicioRef.current = { latitud: targetLat, longitud: targetLng, rumbo: 0 }
      posicionDestinoRef.current = { latitud: targetLat, longitud: targetLng, rumbo: 0 }

      const cadeteIcon = L.divIcon({
        html: generarHtmlCadete(0),
        className: 'cadete-marker-leaflet-container',
        iconSize: [54, 54],
        iconAnchor: [27, 27],
      })

      markersRef.current.cadete = L.marker([targetLat, targetLng], {
        icon: cadeteIcon,
        zIndexOffset: 300,
      }).addTo(leafletMapRef.current).bindPopup(`🛵 Repartidor: ${pedido.cadete_nombre || 'En camino'}`)
      return
    }

    // Calcular distancia al nuevo punto
    const distDelta = Math.sqrt(
      Math.pow(targetLat - posicionAnimadaRef.current.latitud, 2) +
      Math.pow(targetLng - posicionAnimadaRef.current.longitud, 2)
    )

    // Si el cambio es microscópico (< 1 metro), no reiniciar bucle
    if (distDelta < 0.00001) return

    // Calcular nuevo rumbo hacia el nuevo destino
    const targetHeading = Math.round(
      calcularRumbo(
        posicionAnimadaRef.current.latitud,
        posicionAnimadaRef.current.longitud,
        targetLat,
        targetLng
      )
    )

    // El punto de partida de la nueva animación es EXACTAMENTE donde se encuentra actualmente la moto (cero saltos)
    posicionInicioRef.current = { ...posicionAnimadaRef.current }
    posicionDestinoRef.current = { latitud: targetLat, longitud: targetLng, rumbo: targetHeading }
    animStartTimeRef.current = performance.now()

    // Si había una animación previa en curso, cancelarla para empalmar sin tirones
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
    }

    // Bucle continuo a 60 fotogramas por segundo (RequestAnimationFrame)
    const pasoGliding = (timestamp: number) => {
      const inicio = posicionInicioRef.current
      const destino = posicionDestinoRef.current
      const cadeteMarker = markersRef.current.cadete

      if (!inicio || !destino || !cadeteMarker) return

      const tiempoTranscurrido = timestamp - animStartTimeRef.current
      const progresoCrudo = Math.min(tiempoTranscurrido / duracionAnimacionRef.current, 1)
      const progreso = easeInOutSine(progresoCrudo)

      // 1. Interpolación de Latitud y Longitud
      const latActual = inicio.latitud + (destino.latitud - inicio.latitud) * progreso
      const lngActual = inicio.longitud + (destino.longitud - inicio.longitud) * progreso

      // 2. Interpolación del Rumbo por el camino angular más corto
      const deltaRumbo = calcularRumboMasCorto(inicio.rumbo, destino.rumbo)
      const rumboActual = (inicio.rumbo + deltaRumbo * progreso + 360) % 360

      // Almacenar posición animada actual
      posicionAnimadaRef.current = {
        latitud: latActual,
        longitud: lngActual,
        rumbo: rumboActual
      }

      // Actualizar posición del marcador en Leaflet
      cadeteMarker.setLatLng([latActual, lngActual])

      // Actualizar rotación del faro y la moto en CSS
      aplicarRotacionAlElemento(rumboActual)

      // 3. Acortar la polilínea de la ruta en vivo milisegundo a milisegundo (solo si es próxima entrega directa)
      if (polylineRef.current.base && pedido.coordenadas && esProximaEntrega) {
        const rutaViva = [
          [latActual, lngActual],
          [pedido.coordenadas.latitud, pedido.coordenadas.longitud]
        ]
        polylineRef.current.base.setLatLngs(rutaViva)
        polylineRef.current.dash.setLatLngs(rutaViva)
      } else if (polylineRef.current.base && !esProximaEntrega) {
        polylineRef.current.base.setLatLngs([])
        polylineRef.current.dash.setLatLngs([])
      }

      // 4. Si la cámara está fijada en el cadete, acompañar suavemente a 60 FPS
      if (modoCamaraRef.current === 'cadete' && leafletMapRef.current) {
        leafletMapRef.current.panTo([latActual, lngActual], { animate: false })
      }

      // Continuar hasta completar el trayecto o hasta que llegue un nuevo punto
      if (progresoCrudo < 1) {
        animFrameRef.current = requestAnimationFrame(pasoGliding)
      }
    }

    animFrameRef.current = requestAnimationFrame(pasoGliding)
  }, [mapaListo, pedido.cadete_coordenadas?.latitud, pedido.cadete_coordenadas?.longitud, esProximaEntrega])

  // ── 5. Inicialización de Polilínea de Ruta ───────────────────────────────────
  useEffect(() => {
    if (!mapaListo || !leafletMapRef.current) return
    const L = require('leaflet')

    let puntosRuta: [number, number][] = []

    if (esProximaEntrega) {
      if (posicionAnimadaRef.current && pedido.coordenadas) {
        puntosRuta = [
          [posicionAnimadaRef.current.latitud, posicionAnimadaRef.current.longitud],
          [pedido.coordenadas.latitud, pedido.coordenadas.longitud]
        ]
      } else if (pedido.cadete_coordenadas && pedido.coordenadas) {
        puntosRuta = [
          [pedido.cadete_coordenadas.latitud, pedido.cadete_coordenadas.longitud],
          [pedido.coordenadas.latitud, pedido.coordenadas.longitud]
        ]
      } else if (pedido.coordenadas) {
        puntosRuta = [
          [UBICACION_LOCAL.latitud, UBICACION_LOCAL.longitud],
          [pedido.coordenadas.latitud, pedido.coordenadas.longitud]
        ]
      }
    }

    if (puntosRuta.length >= 2) {
      if (!polylineRef.current.base) {
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
    }
  }, [mapaListo, pedido.coordenadas?.latitud, pedido.coordenadas?.longitud])

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
    const pos = posicionAnimadaRef.current || pedido.cadete_coordenadas
    leafletMapRef.current.flyTo(
      [pos.latitud, pos.longitud],
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
    const pos = posicionAnimadaRef.current || pedido.cadete_coordenadas
    if (pos) {
      bounds.extend([pos.latitud, pos.longitud])
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
        /* Haz de luz / Faro delantero de la moto */
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
          transition: transform 0.08s linear;
        }
        .cadete-moto-badge {
          position: relative;
          z-index: 2;
          transform-origin: center center;
          transition: transform 0.08s linear;
        }
        .cadete-direction-arrow {
          position: absolute;
          z-index: 3;
          transform-origin: 50% 27px;
          transition: transform 0.08s linear;
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

      {/* Contenedor del Mapa Leaflet (100% absoluto) */}
      <div ref={mapRef} className="w-full h-full" style={{ width: '100%', height: '100%' }} />

      {/* HUD Superior con Estado Claro (Sin ETA numérico que genere ansiedad) */}
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
      ) : paradasPrevias > 0 && !esperandoGps ? (
        <div className="absolute top-3.5 left-0 right-0 z-[400] flex justify-center pointer-events-none px-3">
          <div className="bg-amber-600 text-white px-4 py-1.5 rounded-full shadow-xl flex items-center gap-2 animate-in slide-in-from-top-4 border border-amber-400/40">
            <span className="text-sm">🛵</span>
            <span className="text-xs sm:text-sm font-black tracking-wide">
              Entrega previa en curso • Tu turno: Parada {paradaActual} de {totalParadas}
            </span>
          </div>
        </div>
      ) : esProximaEntrega && pedido.cadete_coordenadas && ['listo', 'en_camino'].includes(pedido.estado) && !esperandoGps ? (
        <div className="absolute top-3.5 left-0 right-0 z-[400] flex justify-center pointer-events-none px-3">
          <div className="bg-emerald-600 text-white px-4 py-1.5 rounded-full shadow-xl flex items-center gap-2 animate-in slide-in-from-top-4 border border-emerald-400/40">
            <span className="text-sm">🛵</span>
            <span className="text-xs sm:text-sm font-black tracking-wide">
              {pedido.cadete_nombre ? `${pedido.cadete_nombre} va directo a tu domicilio` : 'Repartidor en camino directo a tu domicilio'}
            </span>
          </div>
        </div>
      ) : null}

      {/* HUD de Botones de Cámara Inteligente */}
      <div className="absolute top-3.5 right-3.5 z-[400] flex flex-col gap-1.5 bg-white/95 dark:bg-slate-900/95 p-1 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800">
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


