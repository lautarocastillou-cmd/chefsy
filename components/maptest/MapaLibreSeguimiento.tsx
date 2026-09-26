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

export type EstiloMapa = 'cyber-dark' | 'vector-liberty' | 'vector-positron' | 'google-calles' | 'google-hibrido'
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

// Estilo Cyber Dark rasterizado en spec MapLibre
const ESTILO_CYBER_DARK: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    'carto-dark': {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png',
        'https://b.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png',
        'https://c.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution: '&copy; OpenStreetMap &copy; CARTO',
    },
  },
  layers: [
    {
      id: 'carto-dark-layer',
      type: 'raster',
      source: 'carto-dark',
      minzoom: 0,
      maxzoom: 20,
    },
  ],
}

// Estilo Google Maps Calles HD (el mismo de la app estándar)
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
      maxzoom: 20,
    },
  ],
}

// URLs y especificaciones de estilos
const ESTILOS_VECTOR: Record<EstiloMapa, string | maplibregl.StyleSpecification> = {
  'cyber-dark': ESTILO_CYBER_DARK,
  'vector-liberty': 'https://tiles.openfreemap.org/styles/liberty',
  'vector-positron': 'https://tiles.openfreemap.org/styles/positron',
  'google-calles': ESTILO_GOOGLE_CALLES,
  'google-hibrido': ESTILO_GOOGLE_HIBRIDO,
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

  // Marcadores
  const cadeteMarkerRef = useRef<maplibregl.Marker | null>(null)
  const clienteMarkerRef = useRef<maplibregl.Marker | null>(null)
  const localMarkerRef = useRef<maplibregl.Marker | null>(null)

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
      style: (ESTILOS_VECTOR[estilo] || ESTILO_CYBER_DARK) as any,
      center: initialCenter,
      zoom: 16,
      pitch: pitchPersonalizado || 55,
      bearing: 0,
      maxPitch: 75,
    })

    // Controles de navegación MapLibre
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right')

    map.on('error', (e) => {
      console.warn('[MapLibre Warning/Error]:', e)
    })

    map.on('load', () => {
      setMapaCargado(true)
      map.resize()
      agregarCapasRuta(map)
      actualizarCapaEdificios3D(map, mostrarEdificios3D)
    })

    // Observer de tamaño para asegurar que el canvas WebGL siempre se dimensione
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

  // ── 2. Cambio de Estilo Dinámico ─────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapaCargado) return

    const nuevoEstilo = ESTILOS_VECTOR[estilo] || ESTILO_CYBER_DARK
    map.setStyle(nuevoEstilo as any)

    map.once('styledata', () => {
      map.resize()
      agregarCapasRuta(map)
      actualizarCapaEdificios3D(map, mostrarEdificios3D)
      actualizarGeoJsonRuta(map)
    })
  }, [estilo])

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
    map.easeTo({ pitch: pitchPersonalizado, duration: 400 })
  }, [pitchPersonalizado])

  // ── Helper: Configurar Capas WebGL de Ruta ───────────────────────────────────
  const agregarCapasRuta = (map: maplibregl.Map) => {
    if (map.getSource('osrm-route-source')) return

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

  // ── 5. Cargar Geometría OSRM de Calles ────────────────────────────────────────
  useEffect(() => {
    if (!mapaCargado || !cadeteCoords || !destinoCoords) return

    let cancelado = false
    const cargarRuta = async () => {
      try {
        const ruta = await obtenerRutaConduccion(cadeteCoords, destinoCoords)
        if (cancelado || !ruta || !mapRef.current) return

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

  // ── 7. MOTOR DE INTERPOLACIÓN CONTINUO A 60-120 FPS CON DEAD RECKONING ────────
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
          transition:transform 0.08s linear;
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
          transition:transform 0.15s ease-out;
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
          transition:transform 0.08s linear;
        ">▲</div>
      `
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

    // Bucle continuo a 60-120 FPS por GPU
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

      // 3. Mover marcador MapLibre GL
      marker.setLngLat([lngActual, latActual])

      // 4. Actualizar rotación y faro en el DOM del marcador
      const markerEl = marker.getElement()
      if (markerEl) {
        const headlight = markerEl.querySelector('.moto-headlight-cone') as HTMLElement
        const arrow = markerEl.querySelector('.moto-dir-arrow') as HTMLElement
        const badge = markerEl.querySelector('.moto-badge-inner') as HTMLElement

        if (headlight) headlight.style.transform = `rotate(${rumboActual}deg)`
        if (arrow) arrow.style.transform = `rotate(${rumboActual}deg) translateY(-26px)`

        // Inclinación peraltada dinámica (Banking effect)
        const velocidadGiro = deltaRumbo * (1 - progreso)
        const peralte = Math.min(Math.max(velocidadGiro * 0.4, -18), 18)
        ultimoPerlteRef.current = peralte
        const esOeste = rumboActual > 180 && rumboActual < 360
        if (badge) {
          badge.style.transform = `rotate(${peralte}deg) ${esOeste ? 'scaleX(-1)' : 'scaleX(1)'}`
        }
      }

      // 5. Modos de Cámara Cinemática Dinámica
      if (map) {
        if (modoCamara === 'piloto') {
          // Cámara piloto: persigue a la moto y rota suavemente con las calles
          map.easeTo({
            center: [lngActual, latActual],
            bearing: rumboActual,
            pitch: 60,
            zoom: 17,
            duration: 120,
          })
        } else if (modoCamara === 'dron') {
          // Cámara dron: vista isométrica a 45° sin rotación
          map.easeTo({
            center: [lngActual, latActual],
            pitch: 45,
            duration: 120,
          })
        } else if (modoCamara === 'cenital') {
          map.easeTo({
            center: [lngActual, latActual],
            pitch: 0,
            bearing: 0,
            duration: 120,
          })
        }
      }

      // Continuar loop hasta que termine el trayecto
      if (progresoCrudo < 1) {
        animFrameRef.current = requestAnimationFrame(pasoGliding)
      }
    }

    animFrameRef.current = requestAnimationFrame(pasoGliding)
  }, [mapaCargado, cadeteCoords?.latitud, cadeteCoords?.longitud, cadete?.heading, modoCamara])

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
    </div>
  )
}
