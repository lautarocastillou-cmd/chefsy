'use client'

import { useEffect, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { UBICACION_LOCAL, calcularDistanciaKm, obtenerRutaConduccion } from '@/lib/ubicacion'
import { Bike, Navigation, Compass, Layers, ShieldCheck, Eye, Sparkles } from 'lucide-react'

// Configuración obligatoria del Web Worker autohospedado en /public/lib/maplibre
// Esto resuelve el error "Worker failed to load" en Next.js Turbopack
if (typeof window !== 'undefined' && typeof (maplibregl as any).setWorkerUrl === 'function') {
  (maplibregl as any).setWorkerUrl('/lib/maplibre/maplibre-gl-worker.mjs')
}

export type EstiloMapa = 'google-calles' | 'cyber-dark' | 'google-hibrido' | 'vector-liberty' | 'vector-positron'
export type ModoCamara = 'piloto' | 'dron' | 'cenital' | 'todo' | 'libre'

interface Props {
  pedido?: any
  cadete?: any
  estilo: EstiloMapa
  modoCamara: ModoCamara
  pitchPersonalizado: number
  mostrarEdificios3D: boolean
  onTelemetriaUpdate?: (data: {
    fps: number
    speed: number | null
    heading: number | null
    lat: number | null
    lng: number | null
    bateria: number | null
    ultimoReporteMs: number
  }) => void
}

// ── 1. DEFINICIÓN DE ESTILOS DE ULTRA ALTO RENDIMIENTO (60-120 FPS) ───────────

// Estilo Google Maps Calles HD (Ultra Rápido - Cacheado en edge Argentina < 15ms)
const ESTILO_GOOGLE_CALLES: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    'google-calles': {
      type: 'raster',
      tiles: [
        'https://mt0.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
        'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
        'https://mt2.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
        'https://mt3.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
      ],
      tileSize: 256,
      attribution: '&copy; Google Maps',
    },
  },
  layers: [
    {
      id: 'google-calles-layer',
      type: 'raster',
      source: 'google-calles',
      minzoom: 0,
      maxzoom: 21,
    },
  ],
}

// Estilo Cyber Dark Raster (ESRI Dark Gray Canvas - Sin marcas de agua, carga en 50ms)
const ESTILO_CYBER_DARK: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    'esri-dark': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      attribution: '&copy; Esri, HERE',
    },
    'esri-dark-ref': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
    },
  },
  layers: [
    {
      id: 'esri-dark-base',
      type: 'raster',
      source: 'esri-dark',
      minzoom: 0,
      maxzoom: 20,
    },
    {
      id: 'esri-dark-labels',
      type: 'raster',
      source: 'esri-dark-ref',
      minzoom: 0,
      maxzoom: 20,
    },
  ],
}

// Estilo Google Maps Satélite Híbrido HD
const ESTILO_GOOGLE_HIBRIDO: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    'google-hybrid': {
      type: 'raster',
      tiles: [
        'https://mt0.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
        'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
        'https://mt2.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
        'https://mt3.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
      ],
      tileSize: 256,
      attribution: '&copy; Google Maps',
    },
  },
  layers: [
    {
      id: 'google-hybrid-layer',
      type: 'raster',
      source: 'google-hybrid',
      minzoom: 0,
      maxzoom: 21,
    },
  ],
}

// Generador de especificaciones limpias (sin mutaciones en memoria)
function obtenerEspecificacionEstilo(tipo: EstiloMapa): string | maplibregl.StyleSpecification {
  switch (tipo) {
    case 'google-calles':
      return JSON.parse(JSON.stringify(ESTILO_GOOGLE_CALLES))
    case 'cyber-dark':
      return JSON.parse(JSON.stringify(ESTILO_CYBER_DARK))
    case 'google-hibrido':
      return JSON.parse(JSON.stringify(ESTILO_GOOGLE_HIBRIDO))
    case 'vector-liberty':
      return 'https://tiles.openfreemap.org/styles/liberty'
    case 'vector-positron':
      return 'https://tiles.openfreemap.org/styles/positron'
    default:
      return JSON.parse(JSON.stringify(ESTILO_GOOGLE_CALLES))
  }
}

// Helper: Calcular ángulo de rumbo geográfico (0° a 360°)
function calcularRumbo(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const toDeg = (rad: number) => (rad * 180) / Math.PI
  const dLon = toRad(lon2 - lon1)
  const y = Math.sin(dLon) * Math.cos(toRad(lat2))
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon)
  const brng = toDeg(Math.atan2(y, x))
  return (brng + 360) % 360
}

function calcularRumboMasCorto(actual: number, destino: number): number {
  let diff = (destino - actual) % 360
  if (diff > 180) diff -= 360
  if (diff < -180) diff += 360
  return diff
}

function easeInOutSine(x: number): number {
  return -(Math.cos(Math.PI * x) - 1) / 2
}

export default function MapaLibreSeguimiento({
  pedido,
  cadete,
  estilo,
  modoCamara,
  pitchPersonalizado,
  mostrarEdificios3D,
  onTelemetriaUpdate,
}: Props) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const [mapaCargado, setMapaCargado] = useState(false)
  const [cargandoEstilo, setCargandoEstilo] = useState(false)

  // Referencia al estilo actualmente aplicado para evitar bucles o reinicios innecesarios
  const estiloAplicadoRef = useRef<EstiloMapa>(estilo)

  // Marcadores
  const cadeteMarkerRef = useRef<maplibregl.Marker | null>(null)
  const clienteMarkerRef = useRef<maplibregl.Marker | null>(null)
  const localMarkerRef = useRef<maplibregl.Marker | null>(null)

  // Cache de elementos DOM del marcador para evitar querySelector en 60 FPS
  const markerHeadlightRef = useRef<HTMLElement | null>(null)
  const markerArrowRef = useRef<HTMLElement | null>(null)
  const markerBadgeRef = useRef<HTMLElement | null>(null)

  // Animación suave de la moto
  const animFrameRef = useRef<number | null>(null)
  const posicionAnimadaRef = useRef<{ latitud: number; longitud: number; rumbo: number } | null>(null)
  const posicionInicioRef = useRef<{ latitud: number; longitud: number; rumbo: number } | null>(null)
  const posicionDestinoRef = useRef<{ latitud: number; longitud: number; rumbo: number } | null>(null)
  const animStartTimeRef = useRef<number>(0)
  const duracionAnimacionRef = useRef<number>(3500)
  const tiempoUltimoUpdateRef = useRef<number>(0)
  const ultimoPerlteRef = useRef<number>(0)

  // Telemetría & Medidor de FPS en tiempo real
  const frameCountRef = useRef<number>(0)
  const lastFpsUpdateRef = useRef<number>(performance.now())
  const currentFpsRef = useRef<number>(60)

  // Geometría OSRM en caché
  const rutaGeoJsonRef = useRef<any>({
    type: 'FeatureCollection',
    features: [],
  })
  const ultimaPosicionRutaRef = useRef<{ latitud: number; longitud: number } | null>(null)

  // Obtener coordenadas destino (cliente o local)
  const destinoCoords = pedido?.coordenadas || (cadete ? null : UBICACION_LOCAL)
  const cadeteCoords = cadete?.lat && cadete?.lng
    ? { latitud: cadete.lat, longitud: cadete.lng }
    : pedido?.cadete_coordenadas || null

  // ── 1. Inicialización de MapLibre GL ─────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    // Asegurar Worker URL antes de crear instancia
    if (typeof (maplibregl as any).setWorkerUrl === 'function') {
      (maplibregl as any).setWorkerUrl('/lib/maplibre/maplibre-gl-worker.mjs')
    }

    const initialCenter: [number, number] = cadeteCoords
      ? [cadeteCoords.longitud, cadeteCoords.latitud]
      : [UBICACION_LOCAL.longitud, UBICACION_LOCAL.latitud]

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: obtenerEspecificacionEstilo(estilo) as any,
      center: initialCenter,
      zoom: 16,
      pitch: pitchPersonalizado || 55,
      bearing: 0,
      maxPitch: 75,
    })

    // Exponer para diagnóstico interno
    if (typeof window !== 'undefined') {
      ;(window as any).__maplibreInstance = map
    }

    // Controles de navegación MapLibre
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right')

    map.on('error', (e) => {
      console.warn('[MapLibre Warning/Error]:', e)
    })

    map.on('load', () => {
      setMapaCargado(true)
      estiloAplicadoRef.current = estilo
      map.resize()
      agregarCapasRuta(map)
      actualizarCapaEdificios3D(map, mostrarEdificios3D)
    })

    // Observer de tamaño para asegurar que el canvas WebGL siempre se redimensione
    const resizeObserver = new ResizeObserver(() => {
      map.resize()
    })
    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current)
    }

    const timerResize = setTimeout(() => {
      map.resize()
    }, 150)

    mapRef.current = map

    return () => {
      clearTimeout(timerResize)
      resizeObserver.disconnect()
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      map.remove()
      mapRef.current = null
      setMapaCargado(false)
    }
  }, [])

  // ── 2. Cambio de Estilo Dinámico Robusto (style.load) ─────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapaCargado) return
    if (estiloAplicadoRef.current === estilo) return // Evitar recarga redundante

    estiloAplicadoRef.current = estilo
    setCargandoEstilo(true)

    const nuevoEstilo = obtenerEspecificacionEstilo(estilo)

    // Escuchador garantizado que se registra ANTES de setStyle
    const onStyleReady = () => {
      map.resize()
      agregarCapasRuta(map)
      actualizarCapaEdificios3D(map, mostrarEdificios3D)
      actualizarGeoJsonRuta(map)
      setCargandoEstilo(false)
    }

    map.once('style.load', onStyleReady)

    try {
      map.setStyle(nuevoEstilo as any)
    } catch (err) {
      console.warn('Error al aplicar nuevo estilo en MapLibre:', err)
      setCargandoEstilo(false)
    }
  }, [estilo, mapaCargado])

  // ── 3. Toggle de Edificios 3D ────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapaCargado) return
    actualizarCapaEdificios3D(map, mostrarEdificios3D)
  }, [mostrarEdificios3D, mapaCargado])

  // ── 4. Actualizar Pitch Personalizado ────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapaCargado || modoCamara === 'libre') return
    map.easeTo({ pitch: pitchPersonalizado, duration: 250 })
  }, [pitchPersonalizado])

  // ── Helper: Configurar Capas WebGL de Ruta ───────────────────────────────────
  const agregarCapasRuta = (map: maplibregl.Map) => {
    if (map.getSource('osrm-route-source')) {
      actualizarGeoJsonRuta(map)
      return
    }

    try {
      map.addSource('osrm-route-source', {
        type: 'geojson',
        data: rutaGeoJsonRef.current,
      })

      // Capa A: Resplandor Neón suave (Glow shader)
      map.addLayer({
        id: 'osrm-route-glow',
        type: 'line',
        source: 'osrm-route-source',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#059669',
          'line-width': 12,
          'line-opacity': 0.38,
          'line-blur': 3,
        },
      })

      // Capa B: Borde de contraste alto
      map.addLayer({
        id: 'osrm-route-casing',
        type: 'line',
        source: 'osrm-route-source',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#022c22',
          'line-width': 6.5,
          'line-opacity': 0.85,
        },
      })

      // Capa C: Núcleo esmeralda vibrante
      map.addLayer({
        id: 'osrm-route-core',
        type: 'line',
        source: 'osrm-route-source',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#10b981',
          'line-width': 4,
          'line-opacity': 0.95,
        },
      })

      // Capa D: Estela animada discontinua
      map.addLayer({
        id: 'osrm-route-dash',
        type: 'line',
        source: 'osrm-route-source',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#a7f3d0',
          'line-width': 2.5,
          'line-dasharray': [2, 4],
          'line-opacity': 0.9,
        },
      })
    } catch (e) {
      console.warn('Error configurando capas de ruta:', e)
    }
  }

  // ── Helper: Configurar Capa de Edificios 3D ──────────────────────────────────
  const actualizarCapaEdificios3D = (map: maplibregl.Map, activo: boolean) => {
    // 1. Si el estilo vectorial ya tiene capa nativa de edificios 3D (ej. OpenFreeMap Liberty)
    if (map.getLayer('building-3d')) {
      map.setLayoutProperty('building-3d', 'visibility', activo ? 'visible' : 'none')
      return
    }

    const layerId = '3d-buildings-extrusion'
    const source = map.getSource('openmaptiles')

    if (!source) return // Solo disponible en fuentes vectoriales OpenMapTiles

    if (!activo) {
      if (map.getLayer(layerId)) map.removeLayer(layerId)
      return
    }

    if (map.getLayer(layerId)) return

    // Buscar primera capa de etiquetas para insertar los edificios debajo
    const layers = map.getStyle().layers || []
    let labelLayerId: string | undefined
    for (let i = 0; i < layers.length; i++) {
      if (layers[i].type === 'symbol' && layers[i].layout && (layers[i].layout as any)['text-field']) {
        labelLayerId = layers[i].id
        break
      }
    }

    try {
      map.addLayer(
        {
          id: layerId,
          source: 'openmaptiles',
          'source-layer': 'building',
          type: 'fill-extrusion',
          minzoom: 14,
          paint: {
            'fill-extrusion-color': [
              'interpolate',
              ['linear'],
              ['get', 'render_height'],
              0, '#1e293b',
              20, '#0f172a',
              50, '#020617',
            ],
            'fill-extrusion-height': [
              'interpolate',
              ['linear'],
              ['zoom'],
              14, 0,
              15, ['coalesce', ['get', 'render_height'], ['get', 'height'], 8],
            ],
            'fill-extrusion-base': [
              'interpolate',
              ['linear'],
              ['zoom'],
              14, 0,
              15, ['coalesce', ['get', 'render_min_height'], 0],
            ],
            'fill-extrusion-opacity': 0.88,
          },
        },
        labelLayerId
      )
    } catch (e) {
      console.warn('No se pudo añadir capa 3D personalizada:', e)
    }
  }

  // ── 5. Cargar Geometría OSRM con Throttle de Distancia (> 40m) ───────────────
  useEffect(() => {
    if (!mapaCargado || !cadeteCoords || !destinoCoords) return

    // Evitar llamadas de red repetitivas si el cadete se movió menos de 40 metros
    if (ultimaPosicionRutaRef.current) {
      const distMetros = calcularDistanciaKm(ultimaPosicionRutaRef.current, cadeteCoords) * 1000
      if (distMetros < 40) return
    }

    let cancelado = false
    const cargarRuta = async () => {
      try {
        const ruta = await obtenerRutaConduccion(cadeteCoords, destinoCoords)
        if (cancelado || !ruta || !mapRef.current) return

        ultimaPosicionRutaRef.current = cadeteCoords

        // Convertir [lat, lon] de Leaflet a GeoJSON estándar [lon, lat] de MapLibre
        const coordenadasGeoJson = ruta.puntos.map(([lat, lon]) => [lon, lat])

        rutaGeoJsonRef.current = {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: coordenadasGeoJson,
              },
              properties: {},
            },
          ],
        }

        actualizarGeoJsonRuta(mapRef.current)
      } catch (_) {}
    }

    cargarRuta()
    return () => { cancelado = true }
  }, [mapaCargado, cadeteCoords?.latitud, cadeteCoords?.longitud, destinoCoords?.latitud, destinoCoords?.longitud])

  const actualizarGeoJsonRuta = (map: maplibregl.Map) => {
    const source: any = map.getSource('osrm-route-source')
    if (source && source.setData) {
      source.setData(rutaGeoJsonRef.current)
    }
  }

  // ── 6. Marcador del Local y Cliente ──────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapaCargado) return

    // 1. Marcador del Local Gastronómico
    if (!localMarkerRef.current) {
      const elLocal = document.createElement('div')
      elLocal.className = 'maplibre-marker-local'
      elLocal.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;">
          <div style="background:#0284c7;color:#fff;width:34px;height:34px;border-radius:50%;border:2.5px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(2,132,199,0.5);">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </div>
          <div style="margin-top:2px;background:#0369a1;color:#ffffff;font-size:10px;font-weight:900;padding:2px 7px;border-radius:8px;border:1px solid #7dd3fc;white-space:nowrap;letter-spacing:0.2px;">
            Local Central
          </div>
        </div>
      `
      localMarkerRef.current = new maplibregl.Marker({
        element: elLocal,
        anchor: 'bottom',
      })
        .setLngLat([UBICACION_LOCAL.longitud, UBICACION_LOCAL.latitud])
        .addTo(map)
    }

    // 2. Marcador del Cliente
    if (destinoCoords) {
      if (!clienteMarkerRef.current) {
        const elCliente = document.createElement('div')
        elCliente.className = 'maplibre-marker-cliente'
        elCliente.innerHTML = `
          <div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;">
            <div style="background:#2563eb;color:#fff;width:36px;height:36px;border-radius:50%;border:2.5px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(37,99,235,0.5);">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
            </div>
            <div style="margin-top:2px;background:#1e40af;color:#ffffff;font-size:10px;font-weight:900;padding:2px 8px;border-radius:8px;border:1.5px solid #ffffff;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.3);">
              ${pedido?.cliente || 'Destino de Entrega'}
            </div>
          </div>
        `
        clienteMarkerRef.current = new maplibregl.Marker({
          element: elCliente,
          anchor: 'bottom',
        })
          .setLngLat([destinoCoords.longitud, destinoCoords.latitud])
          .addTo(map)
      } else {
        clienteMarkerRef.current.setLngLat([destinoCoords.longitud, destinoCoords.latitud])
      }
    }
  }, [mapaCargado, destinoCoords?.latitud, destinoCoords?.longitud, pedido?.cliente])

  // ── 7. MOTOR ULTRA-FLUIDO A 60-120 FPS CON DEAD RECKONING Y CAMERA JUMPTO ─────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapaCargado || !cadeteCoords) return

    const { latitud: targetLat, longitud: targetLng } = cadeteCoords
    const ahora = performance.now()

    // Sincronizar dinámicamente la duración de interpolación con el intervalo del GPS
    if (tiempoUltimoUpdateRef.current > 0) {
      const lapsoReal = ahora - tiempoUltimoUpdateRef.current
      duracionAnimacionRef.current = Math.min(Math.max(lapsoReal * 1.05, 2000), 5000)
    }
    tiempoUltimoUpdateRef.current = ahora

    // Generar elemento HTML del repartidor con faro 3D y pulso
    const crearHtmlMoto = (rumboInicial: number) => {
      const el = document.createElement('div')
      el.className = 'cadete-maplibre-container'
      el.style.cssText = 'position:relative; width:56px; height:56px; display:flex; align-items:center; justify-content:center; pointer-events:auto; cursor:pointer;'
      el.innerHTML = `
        <!-- Faro delantero volumétrico que ilumina la calle -->
        <div class="moto-headlight-cone" style="
          position:absolute;
          top:50%;
          left:50%;
          width:56px;
          height:68px;
          margin-left:-28px;
          margin-top:-68px;
          background:radial-gradient(ellipse at 50% 100%, rgba(254,240,138,0.7) 0%, rgba(253,224,71,0.3) 45%, rgba(253,224,71,0) 80%);
          clip-path:polygon(50% 100%, 10% 0%, 90% 0%);
          transform-origin:50% 100%;
          transform:rotate(${rumboInicial}deg);
          pointer-events:none;
          filter:blur(1px);
          z-index:1;
        "></div>
        <!-- Onda de radar de presencia -->
        <div style="
          position:absolute;
          inset:3px;
          border-radius:50%;
          border:2px solid rgba(225,29,72,0.65);
          animation:moto-radar-ping 1.8s cubic-bezier(0.2, 0.6, 0.35, 1) infinite;
          pointer-events:none;
          z-index:0;
        "></div>
        <!-- Badge circular 3D de la moto -->
        <div class="moto-badge-inner" style="
          position:relative;
          z-index:2;
          width:44px;
          height:44px;
          background:#E11D48;
          border:2.5px solid #ffffff;
          border-radius:50%;
          box-shadow:0 4px 16px rgba(225,29,72,0.7), inset 0 2px 4px rgba(255,255,255,0.4);
          display:flex;
          align-items:center;
          justify-content:center;
          will-change:transform;
        ">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/>
          </svg>
        </div>
        <!-- Flecha direccional en 360° -->
        <div class="moto-dir-arrow" style="
          position:absolute;
          top:2px;
          transform-origin:50% 28px;
          transform:rotate(${rumboInicial}deg) translateY(-26px);
          font-size:12px;
          color:#E11D48;
          font-weight:900;
          text-shadow:0 1px 2px #fff;
          z-index:3;
        ">▲</div>
      `
      // Cachear nodos para evitar querySelector en cada frame
      markerHeadlightRef.current = el.querySelector('.moto-headlight-cone')
      markerArrowRef.current = el.querySelector('.moto-dir-arrow')
      markerBadgeRef.current = el.querySelector('.moto-badge-inner')

      return el
    }

    // Primera recepción de GPS
    if (!posicionAnimadaRef.current) {
      posicionAnimadaRef.current = { latitud: targetLat, longitud: targetLng, rumbo: cadete?.heading || 0 }
      posicionInicioRef.current = { latitud: targetLat, longitud: targetLng, rumbo: cadete?.heading || 0 }
      posicionDestinoRef.current = { latitud: targetLat, longitud: targetLng, rumbo: cadete?.heading || 0 }

      const el = crearHtmlMoto(cadete?.heading || 0)
      cadeteMarkerRef.current = new maplibregl.Marker({
        element: el,
        anchor: 'center',
        rotationAlignment: 'map',
        pitchAlignment: 'map',
      })
        .setLngLat([targetLng, targetLat])
        .addTo(map)

      return
    }

    const headingCalculado = Math.round(
      calcularRumbo(
        posicionAnimadaRef.current.latitud,
        posicionAnimadaRef.current.longitud,
        targetLat,
        targetLng
      )
    )
    const rumboFinal = cadete?.heading || headingCalculado

    posicionInicioRef.current = { ...posicionAnimadaRef.current }
    posicionDestinoRef.current = { latitud: targetLat, longitud: targetLng, rumbo: rumboFinal }
    animStartTimeRef.current = performance.now()

    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)

    // Bucle continuo a 60-120 FPS por GPU (cero llamadas a querySelector ni easeTo en cada frame)
    const pasoGliding = (timestamp: number) => {
      // 1. Contador de FPS para telemetría
      frameCountRef.current++
      if (timestamp - lastFpsUpdateRef.current >= 600) {
        const deltaSec = (timestamp - lastFpsUpdateRef.current) / 1000
        currentFpsRef.current = Math.round(frameCountRef.current / deltaSec)
        frameCountRef.current = 0
        lastFpsUpdateRef.current = timestamp

        if (onTelemetriaUpdate) {
          onTelemetriaUpdate({
            fps: currentFpsRef.current,
            speed: cadete?.speed ?? null,
            heading: posicionAnimadaRef.current?.rumbo ?? null,
            lat: posicionAnimadaRef.current?.latitud ?? null,
            lng: posicionAnimadaRef.current?.longitud ?? null,
            bateria: cadete?.bateria ?? null,
            ultimoReporteMs: Math.round(performance.now() - tiempoUltimoUpdateRef.current),
          })
        }
      }

      const inicio = posicionInicioRef.current
      const destino = posicionDestinoRef.current
      const marker = cadeteMarkerRef.current

      if (!inicio || !destino || !marker) return

      const elapsed = timestamp - animStartTimeRef.current
      const progresoCrudo = Math.min(elapsed / duracionAnimacionRef.current, 1)
      const progreso = easeInOutSine(progresoCrudo)

      // 2. Interpolación LERP suave de coordenadas y rumbo angular
      const latActual = inicio.latitud + (destino.latitud - inicio.latitud) * progreso
      const lngActual = inicio.longitud + (destino.longitud - inicio.longitud) * progreso
      const deltaRumbo = calcularRumboMasCorto(inicio.rumbo, destino.rumbo)
      const rumboActual = (inicio.rumbo + deltaRumbo * progreso + 360) % 360

      posicionAnimadaRef.current = {
        latitud: latActual,
        longitud: lngActual,
        rumbo: rumboActual,
      }

      // 3. Mover marcador WebGL en el mapa
      marker.setLngLat([lngActual, latActual])

      // 4. Actualizar rotación y faro directamente usando referencias en caché
      if (markerHeadlightRef.current) {
        markerHeadlightRef.current.style.transform = `rotate(${rumboActual}deg)`
      }
      if (markerArrowRef.current) {
        markerArrowRef.current.style.transform = `rotate(${rumboActual}deg) translateY(-26px)`
      }

      // Inclinación peraltada dinámica (Banking effect)
      const velocidadGiro = deltaRumbo * (1 - progreso)
      const peralte = Math.min(Math.max(velocidadGiro * 0.4, -18), 18)
      ultimoPerlteRef.current = peralte
      const esOeste = rumboActual > 180 && rumboActual < 360
      if (markerBadgeRef.current) {
        markerBadgeRef.current.style.transform = `rotate(${peralte}deg) ${esOeste ? 'scaleX(-1)' : 'scaleX(1)'}`
      }

      // 5. Cámara Cinemática con jumpTo (Instantáneo por WebGL matriz sin colisión de easeTo)
      if (map) {
        if (modoCamara === 'piloto') {
          map.jumpTo({
            center: [lngActual, latActual],
            bearing: rumboActual,
            pitch: pitchPersonalizado || 55,
          })
        } else if (modoCamara === 'dron') {
          map.jumpTo({
            center: [lngActual, latActual],
            pitch: 45,
          })
        } else if (modoCamara === 'cenital') {
          map.jumpTo({
            center: [lngActual, latActual],
            pitch: 0,
            bearing: 0,
          })
        }
      }

      // Continuar loop hasta que termine el trayecto
      if (progresoCrudo < 1) {
        animFrameRef.current = requestAnimationFrame(pasoGliding)
      }
    }

    animFrameRef.current = requestAnimationFrame(pasoGliding)
  }, [mapaCargado, cadeteCoords?.latitud, cadeteCoords?.longitud, cadete?.heading, modoCamara, pitchPersonalizado])

  // ── 8. Modo Auto-Encuadre (Todo en pantalla) ──────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapaCargado || modoCamara !== 'todo') return

    const bounds = new maplibregl.LngLatBounds()
    bounds.extend([UBICACION_LOCAL.longitud, UBICACION_LOCAL.latitud])

    if (cadeteCoords) {
      bounds.extend([cadeteCoords.longitud, cadeteCoords.latitud])
    }
    if (destinoCoords) {
      bounds.extend([destinoCoords.longitud, destinoCoords.latitud])
    }

    map.fitBounds(bounds, {
      padding: { top: 70, bottom: 70, left: 50, right: 50 },
      pitch: 35,
      bearing: 0,
      duration: 800,
    })
  }, [modoCamara, cadeteCoords?.latitud, destinoCoords?.latitud, mapaCargado])

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-950">
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes moto-radar-ping {
          0% { transform: scale(0.7); opacity: 0.9; }
          80%, 100% { transform: scale(1.7); opacity: 0; }
        }
        .maplibregl-canvas {
          outline: none;
        }
      `}} />

      {/* Contenedor del Canvas WebGL de MapLibre */}
      <div ref={mapContainerRef} className="w-full h-full" style={{ width: '100%', height: '100%' }} />

      {/* Indicador de cambio de estilo en curso */}
      {cargandoEstilo && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900/90 backdrop-blur-md border border-white/20 px-3 py-1.5 rounded-full flex items-center gap-2 shadow-2xl animate-fade-in pointer-events-none">
          <div className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-[11px] font-bold text-white tracking-wide">Cambiando tema...</span>
        </div>
      )}
    </div>
  )
}
