'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import { Pedido } from '@/tipos'
import { 
  UBICACION_LOCAL, 
  calcularDistanciaKm, 
  MAPA_TILES_URL, 
  MAPA_ATTRIBUTION, 
  MAPA_SUBDOMAINS,
  obtenerRutaConduccion,
  obtenerRutaMultiParada
} from '@/lib/ubicacion'
import { Navigation, Compass, Home, Bike, CheckCircle2, Layers, BellRing } from 'lucide-react'
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

// Helper: Distancia euclidiana al cuadrado (rápida para proyectar el cadete sobre la ruta)
function distanciaEuclidianaCuad(p1: [number, number], p2: [number, number]): number {
  const dLat = p1[0] - p2[0]
  const dLng = p1[1] - p2[1]
  return dLat * dLat + dLng * dLng
}

// Helper: Buscar índice más cercano en la ruta sin retroceder
function encontrarIndiceMasCercano(
  pos: [number, number],
  ruta: [number, number][],
  indiceMinimo: number = 0
): number {
  if (!ruta || ruta.length === 0) return 0
  let mejorIndice = indiceMinimo
  let menorDistancia = Infinity

  const inicio = Math.max(0, Math.min(indiceMinimo, ruta.length - 1))
  for (let i = inicio; i < ruta.length; i++) {
    const d = distanciaEuclidianaCuad(pos, ruta[i])
    if (d < menorDistancia) {
      menorDistancia = d
      mejorIndice = i
    }
  }
  return mejorIndice
}

// Helper: Map Matching — distancia mínima en METROS del punto a cualquier SEGMENTO de la polilínea.
// Usa proyección punto→segmento: si el pie de la perpendicular cae dentro del segmento, devuelve
// esa distancia perpendicular (exacta). Si cae fuera, devuelve la distancia al vértice más cercano.
// Esto es lo que usan Uber/Waze para detectar desvíos reales vs. estar en medio de una calle larga.
function distanciaMinAPolilinea(
  pos: [number, number],          // [lat, lng] del cadete
  ruta: [number, number][],       // polilínea descargada de OSRM
  desdeIndice: number = 0         // solo evaluar tramo restante (no ya recorrido)
): number {
  if (!ruta || ruta.length < 2) return Infinity
  const cosLat = Math.cos(pos[0] * Math.PI / 180)
  const M = 111320  // metros por grado de latitud

  let minDist = Infinity
  const inicio = Math.max(0, desdeIndice - 2)  // un poco antes por si el índice está desfasado

  for (let i = inicio; i < ruta.length - 1; i++) {
    const ax = (ruta[i][0] - pos[0]) * M          // Δlat en metros
    const ay = (ruta[i][1] - pos[1]) * M * cosLat  // Δlng en metros
    const bx = (ruta[i+1][0] - ruta[i][0]) * M
    const by = (ruta[i+1][1] - ruta[i][1]) * M * cosLat
    const segLenCuad = bx * bx + by * by

    let distSeg: number
    if (segLenCuad < 1e-10) {
      // Segmento degenerado (puntos idénticos) — distancia al punto
      distSeg = Math.sqrt(ax * ax + ay * ay)
    } else {
      // Proyección del cadete sobre el segmento, clamped a [0,1]
      const t = Math.max(0, Math.min(1, -(ax * bx + ay * by) / segLenCuad))
      const px = ax + t * bx
      const py = ay + t * by
      distSeg = Math.sqrt(px * px + py * py)
    }
    if (distSeg < minDist) minDist = distSeg
  }
  return minDist
}

export default function MapaSeguimiento({ pedido }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const leafletMapRef = useRef<any>(null)
  const markersRef = useRef<{ local?: any; cliente?: any; cadete?: any; paradas?: any[] }>({ paradas: [] })
  const polylineRef = useRef<{
    recorrida?: any
    glow?: any
    core?: any
    dash?: any
    siguientesParadasCasing?: any
    siguientesParadasCore?: any
    siguientesParadasDash?: any
  }>({})
  const rutaGeometriaRef = useRef<[number, number][]>([])
  const estaVisibleRef = useRef<boolean>(true)
  const indiceRutaRef = useRef<number>(0)
  const ultimoRenderPolilineaRef = useRef<number>(0)
  const ultimoIndiceRutaDibujadoRef = useRef<number>(-1)

  // ── Detección de Desvío y Re-cálculo Adaptativo ────────────────────────────
  const ultimoRecalculoRef = useRef<number>(0)       // timestamp del último recálculo
  const recalculandoRef = useRef<boolean>(false)     // evita llamadas paralelas

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
  const esVolviendoAlLocal = Boolean(
    (pedido as any).cadete_volviendo_al_local ||
    (pedido.estado === 'entregado' && Boolean(pedido.cadete_coordenadas))
  )

  const itinerario: any[] = useMemo(() => {
    return (pedido as any)?.itinerario_paradas || []
  }, [(pedido as any)?.itinerario_paradas])

  // Firma única de la secuencia de paradas: reacciona inmediatamente al reordenar pedidos en cadetería
  const paradasSignature = useMemo(() => {
    return itinerario
      .map((p: any) => `${p.id}:${p.orden}:${p.coordenadas?.latitud},${p.coordenadas?.longitud}`)
      .join('|')
  }, [itinerario])

  useEffect(() => {
    modoCamaraRef.current = modoCamara
  }, [modoCamara])

  // ── 1. Calcular distancia en tiempo real (sin ETA de minutos para no generar ansiedad) ──
  useEffect(() => {
    if (esVolviendoAlLocal && pedido.cadete_coordenadas) {
      const distDirecta = calcularDistanciaKm(pedido.cadete_coordenadas, UBICACION_LOCAL)
      const distRuta = distDirecta * 1.3
      setDistanciaRestanteKm(distRuta)
    } else if (pedido.cadete_coordenadas && pedido.coordenadas && ['listo', 'en_camino'].includes(pedido.estado)) {
      const distDirecta = calcularDistanciaKm(pedido.cadete_coordenadas, pedido.coordenadas)
      const distRuta = distDirecta * 1.3 // Factor de aproximación de calles
      setDistanciaRestanteKm(distRuta)
    } else {
      setDistanciaRestanteKm(null)
    }
  }, [
    pedido.cadete_coordenadas?.latitud, 
    pedido.cadete_coordenadas?.longitud, 
    pedido.coordenadas?.latitud, 
    pedido.coordenadas?.longitud, 
    pedido.estado,
    esVolviendoAlLocal
  ])

  // ── 1.1. Ref siempre actualizado con el último pedido (sin stale closures) ──────
  // Esto es clave: cuando el recálculo se dispara desde el loop de animación,
  // necesita leer la posición ACTUAL del cadete, no la del último useEffect.
  const pedidoRef = useRef(pedido)
  useEffect(() => { pedidoRef.current = pedido })

  // Función de recálculo estable (no recrea en cada render, lee todo desde refs)
  const recalcularRutaRef = useRef<(() => Promise<void>) | null>(null)
  useEffect(() => {
    recalcularRutaRef.current = async () => {
      const p = pedidoRef.current
      const posActual = posicionAnimadaRef.current

      // Origen: posición animada actual del cadete (o GPS si no hay animación)
      let origen: { latitud: number; longitud: number } = posActual
        ? { latitud: posActual.latitud, longitud: posActual.longitud }
        : (p.cadete_coordenadas?.latitud ? p.cadete_coordenadas : UBICACION_LOCAL)

      const esVolviendo = Boolean(
        (p as any).cadete_volviendo_al_local ||
        (p.estado === 'entregado' && Boolean(p.cadete_coordenadas))
      )

      const itinerario: any[] = (p as any).itinerario_paradas || []
      let destino: { latitud: number; longitud: number } = UBICACION_LOCAL

      if (esVolviendo) {
        destino = UBICACION_LOCAL
      } else if (itinerario.length > 0 && itinerario[0]?.coordenadas) {
        destino = itinerario[0].coordenadas
      } else {
        destino = p.coordenadas || UBICACION_LOCAL
      }

      try {
        const ruta = await obtenerRutaConduccion(origen, destino)
        if (!ruta || ruta.puntos.length < 2) return

        // Swap atómico: la ruta vieja sigue visible hasta que llega la nueva
        rutaGeometriaRef.current = ruta.puntos

        const posCadete: [number, number] = [origen.latitud, origen.longitud]
        const idx = encontrarIndiceMasCercano(posCadete, ruta.puntos, 0)
        indiceRutaRef.current = idx

        if (typeof ruta.distanciaKm === 'number') {
          setDistanciaRestanteKm(ruta.distanciaKm)
        }

        // Actualizar polilíneas inmediatamente con la ruta recalculada
        if (leafletMapRef.current) {
          const puntosRecorridos = [...ruta.puntos.slice(0, idx + 1), posCadete]
          const puntosRestantes = [posCadete, ...ruta.puntos.slice(idx + 1)]
          polylineRef.current.recorrida?.setLatLngs(puntosRecorridos)
          polylineRef.current.glow?.setLatLngs(puntosRestantes)
          polylineRef.current.core?.setLatLngs(puntosRestantes)
          polylineRef.current.dash?.setLatLngs(puntosRestantes)
        }

        // Actualizar tramo siguiente de paradas múltiples si existen
        if (!esVolviendo && itinerario.length > 1) {
          const coordsRestantes = itinerario.map((it: any) => it.coordenadas)
          const rutaSiguientes = await obtenerRutaMultiParada(coordsRestantes)
          if (leafletMapRef.current && rutaSiguientes) {
            polylineRef.current.siguientesParadasCasing?.setLatLngs(rutaSiguientes.puntos)
            polylineRef.current.siguientesParadasCore?.setLatLngs(rutaSiguientes.puntos)
            polylineRef.current.siguientesParadasDash?.setLatLngs(rutaSiguientes.puntos)
          }
        } else if (leafletMapRef.current) {
          polylineRef.current.siguientesParadasCasing?.setLatLngs([])
          polylineRef.current.siguientesParadasCore?.setLatLngs([])
          polylineRef.current.siguientesParadasDash?.setLatLngs([])
        }
      } catch (_) {
        // Sin crash: si falla, la ruta vieja sigue en pantalla
      }
    }
  }, []) // [] → se crea una sola vez; lee TODO desde refs, nunca stale

  // ── 1.2. Carga inicial de ruta (cuando cambia destino/estado/itinerario) ───────
  useEffect(() => {
    let cancelado = false
    const abortCtrl = new AbortController()

    const cargarRutaInicial = async () => {
      try {
        const itinerario: any[] = (pedido as any).itinerario_paradas || []
        let origen: { latitud: number; longitud: number } = UBICACION_LOCAL
        let destino: { latitud: number; longitud: number } | null | undefined = null

        if (esVolviendoAlLocal) {
          origen = pedido.cadete_coordenadas?.latitud
            ? pedido.cadete_coordenadas
            : (pedido.coordenadas || UBICACION_LOCAL)
          destino = UBICACION_LOCAL
        } else {
          origen = pedido.cadete_coordenadas?.latitud
            ? pedido.cadete_coordenadas
            : UBICACION_LOCAL

          if (itinerario.length > 0 && itinerario[0]?.coordenadas) {
            destino = itinerario[0].coordenadas
          } else {
            destino = pedido.coordenadas || UBICACION_LOCAL
          }
        }

        if (!destino) return

        const ruta = await obtenerRutaConduccion(origen, destino, abortCtrl.signal)
        if (cancelado || !ruta) return

        // Swap atómico
        rutaGeometriaRef.current = ruta.puntos

        const posCadete: [number, number] = posicionAnimadaRef.current
          ? [posicionAnimadaRef.current.latitud, posicionAnimadaRef.current.longitud]
          : [origen.latitud, origen.longitud]

        const idx = encontrarIndiceMasCercano(posCadete, ruta.puntos, 0)
        indiceRutaRef.current = idx

        if (typeof ruta.distanciaKm === 'number') {
          setDistanciaRestanteKm(ruta.distanciaKm)
        }

        if (mapaListo && leafletMapRef.current) {
          const puntosRecorridos = [...ruta.puntos.slice(0, idx + 1), posCadete]
          const puntosRestantes = [posCadete, ...ruta.puntos.slice(idx + 1)]
          polylineRef.current.recorrida?.setLatLngs(puntosRecorridos)
          polylineRef.current.glow?.setLatLngs(puntosRestantes)
          polylineRef.current.core?.setLatLngs(puntosRestantes)
          polylineRef.current.dash?.setLatLngs(puntosRestantes)
        }

        // Cargar trazado secundario para los siguientes destinos en el itinerario
        if (!esVolviendoAlLocal && itinerario.length > 1) {
          const coordsRestantes = itinerario.map((it: any) => it.coordenadas)
          const rutaSiguientes = await obtenerRutaMultiParada(coordsRestantes, abortCtrl.signal)
          if (!cancelado && leafletMapRef.current && rutaSiguientes) {
            polylineRef.current.siguientesParadasCasing?.setLatLngs(rutaSiguientes.puntos)
            polylineRef.current.siguientesParadasCore?.setLatLngs(rutaSiguientes.puntos)
            polylineRef.current.siguientesParadasDash?.setLatLngs(rutaSiguientes.puntos)
          }
        } else if (leafletMapRef.current) {
          polylineRef.current.siguientesParadasCasing?.setLatLngs([])
          polylineRef.current.siguientesParadasCore?.setLatLngs([])
          polylineRef.current.siguientesParadasDash?.setLatLngs([])
        }
      } catch (_) {
        // Ignorar cancelaciones
      }
    }

    cargarRutaInicial().catch(() => {})

    return () => {
      cancelado = true
      abortCtrl.abort()
    }
  }, [
    mapaListo,
    pedido.coordenadas?.latitud,
    pedido.coordenadas?.longitud,
    pedido.cadete_coordenadas ? 'cadete-activo' : 'local',
    esProximaEntrega,
    esVolviendoAlLocal,
    paradasSignature
  ])

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

      // Capa HD (Google Maps con máxima compatibilidad y carga inmediata sin API key)
      L.tileLayer(MAPA_TILES_URL, {
        attribution: MAPA_ATTRIBUTION,
        subdomains: MAPA_SUBDOMAINS,
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
            <div style="background: white; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border-radius: 50%; border: 2.5px solid #2A6348; box-shadow: 0 4px 8px rgba(0,0,0,0.2);">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2A6348" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/></svg>
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
        if (markersRef.current.paradas) {
          markersRef.current.paradas.forEach((m: any) => m.remove())
        }
        markersRef.current = { paradas: [] }
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
    const esEntregado = pedido.estado === 'entregado' || esVolviendoAlLocal

    const clienteIcon = L.divIcon({
      html: `
        <div style="display:flex;flex-direction:column;align-items:center;user-select:none;">
          <div style="background:${esEntregado ? '#059669' : '#2563EB'};color:#fff;width:38px;height:38px;display:flex;align-items:center;justify-content:center;border-radius:50%;border:2.5px solid #fff;box-shadow:0 4px 10px ${esEntregado ? 'rgba(5,150,105,0.45)' : 'rgba(37,99,235,0.4)'};">
            ${esEntregado
              ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>'
              : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>'
            }
          </div>
          <div style="margin-top:2px;background:${esEntregado ? '#065F46' : '#1e40af'};color:#ffffff;font-size:11px;font-weight:800;padding:2px 8px;border-radius:10px;box-shadow:0 2px 6px rgba(0,0,0,0.25);white-space:nowrap;max-width:140px;overflow:hidden;text-overflow:ellipsis;border:1.5px solid #ffffff;letter-spacing:0.2px;">
            ${pedido.cliente || 'Tu Domicilio'} ${totalParadas > 1 && !esEntregado ? `(Parada ${paradaActual})` : ''} ${esEntregado ? '(Entregado ✓)' : ''}
          </div>
        </div>
      `,
      className: 'custom-cliente-tracking-icon',
      iconSize: [140, 68],
      iconAnchor: [70, 19],
      popupAnchor: [0, -22],
    })

    if (markersRef.current.cliente) {
      markersRef.current.cliente.setLatLng([latitud, longitud])
      markersRef.current.cliente.setIcon(clienteIcon)
    } else {
      markersRef.current.cliente = L.marker([latitud, longitud], {
        icon: clienteIcon,
        zIndexOffset: 200,
      }).addTo(leafletMapRef.current).bindPopup(`Destino de entrega: ${pedido.cliente}${esEntregado ? ' (Entregado)' : ''}`)
    }
  }, [mapaListo, pedido.coordenadas?.latitud, pedido.coordenadas?.longitud, pedido.cliente, pedido.estado, esVolviendoAlLocal, totalParadas, paradaActual])

  // ── 3.1. Marcadores de Paradas Múltiples / Itinerario ───────────────────────
  useEffect(() => {
    if (!mapaListo || !leafletMapRef.current) return
    const L = require('leaflet')
    const itinerario: any[] = (pedido as any).itinerario_paradas || []

    // Limpiar paradas previas
    if (markersRef.current.paradas) {
      markersRef.current.paradas.forEach((m: any) => m.remove())
      markersRef.current.paradas = []
    }

    if (esVolviendoAlLocal) return

    itinerario.forEach((parada: any) => {
      if (!parada.es_mi_pedido && parada.coordenadas?.latitud && parada.coordenadas?.longitud) {
        const paradaIcon = L.divIcon({
          html: `
            <div style="display:flex;flex-direction:column;align-items:center;user-select:none;">
              <div style="background:#f59e0b;color:#ffffff;width:30px;height:30px;border-radius:50%;border:2.5px solid #ffffff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:900;box-shadow:0 4px 10px rgba(245,158,11,0.5);">
                ${parada.orden}
              </div>
              <div style="margin-top:2px;background:#b45309;color:#fef3c7;font-size:9.5px;font-weight:900;padding:1.5px 7px;border-radius:8px;box-shadow:0 2px 5px rgba(0,0,0,0.3);white-space:nowrap;border:1px solid #fde68a;letter-spacing:0.2px;">
                Entrega previa #${parada.orden}
              </div>
            </div>
          `,
          className: 'custom-parada-icon',
          iconSize: [110, 54],
          iconAnchor: [55, 15],
        })

        const m = L.marker([parada.coordenadas.latitud, parada.coordenadas.longitud], {
          icon: paradaIcon,
          zIndexOffset: 150,
        }).addTo(leafletMapRef.current).bindPopup(`<b>Parada ${parada.orden}</b><br/>Entrega previa en camino antes de tu domicilio`)

        markersRef.current.paradas?.push(m)
      }
    })
  }, [mapaListo, paradasSignature, esVolviendoAlLocal])

  // ── 3.2. Suspensión de recursos al pasar a segundo plano (Battery/CPU Saver) ─
  useEffect(() => {
    const handleVisibilidad = () => {
      const visible = !document.hidden
      estaVisibleRef.current = visible
      if (!visible) {
        if (animFrameRef.current) {
          cancelAnimationFrame(animFrameRef.current)
          animFrameRef.current = null
        }
      } else {
        if (markersRef.current.cadete && posicionDestinoRef.current) {
          markersRef.current.cadete.setLatLng([
            posicionDestinoRef.current.latitud,
            posicionDestinoRef.current.longitud
          ])
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilidad)
    return () => document.removeEventListener('visibilitychange', handleVisibilidad)
  }, [])

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

    // ── Map Matching Eficiente: Se ejecuta SOLO al recibir un ping GPS nuevo (cada 3-5 seg),
    // NUNCA dentro del requestAnimationFrame a 60 FPS. Esto libera el 100% de CPU en cada cuadro.
    const rutaActualMatching = rutaGeometriaRef.current
    if (rutaActualMatching && rutaActualMatching.length >= 2) {
      const posGps: [number, number] = [targetLat, targetLng]
      const idxGps = encontrarIndiceMasCercano(posGps, rutaActualMatching, indiceRutaRef.current)
      const distanciaDesvioM = distanciaMinAPolilinea(posGps, rutaActualMatching, idxGps)

      const THRESHOLD_DESVIO_M = 60 // 60 metros fuera de la calle → desvío real
      const COOLDOWN_MS = 8_000     // 8s mínimo entre recálculos

      if (
        distanciaDesvioM > THRESHOLD_DESVIO_M &&
        !recalculandoRef.current &&
        Date.now() - ultimoRecalculoRef.current > COOLDOWN_MS &&
        recalcularRutaRef.current
      ) {
        recalculandoRef.current = true
        ultimoRecalculoRef.current = Date.now()
        recalcularRutaRef.current()
          .catch(() => {})
          .finally(() => { recalculandoRef.current = false })
      }
    }


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
            <span class="cadete-moto-flip" style="display:inline-flex; align-items:center; justify-content:center; line-height:1; transition:transform 0.15s ease-out; transform:${esOesteInicial ? 'scaleX(-1)' : 'scaleX(1)'};">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/></svg>
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
      }).addTo(leafletMapRef.current).bindPopup(`Repartidor: ${pedido.cadete_nombre || 'En camino'}`)
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
      if (!estaVisibleRef.current) return

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

      // 3. Acortar y desvanecer la polilínea de la ruta de forma desacoplada y eficiente
      const itinerario = (pedidoRef.current as any)?.itinerario_paradas || []
      const proximaCoords = itinerario.length > 0 && itinerario[0]?.coordenadas
        ? itinerario[0].coordenadas
        : pedido.coordenadas
      const destinoPuntos = esVolviendoAlLocal ? UBICACION_LOCAL : proximaCoords

      if (destinoPuntos) {
        const rutaCompleta = rutaGeometriaRef.current
        const posCadete: [number, number] = [latActual, lngActual]

        if (rutaCompleta.length >= 2) {
          const nuevoIndice = encontrarIndiceMasCercano(posCadete, rutaCompleta, indiceRutaRef.current)
          indiceRutaRef.current = Math.max(indiceRutaRef.current, nuevoIndice)
          const idx = indiceRutaRef.current

          // Rendimiento crítico:
          // El marcador viaja a 60 FPS fluidos por GPU. Las polilíneas SVG solo se recalculan
          // si el cadete avanzó al siguiente nodo de la ruta o cada ~300ms para conectar la punta.
          // Esto recorta el 95% de mutaciones DOM/SVG por segundo evitando caídas de FPS.
          const debeActualizarRuta =
            idx !== ultimoIndiceRutaDibujadoRef.current ||
            timestamp - ultimoRenderPolilineaRef.current > 300

          if (debeActualizarRuta) {
            ultimoRenderPolilineaRef.current = timestamp
            ultimoIndiceRutaDibujadoRef.current = idx

            const puntosRecorridos: [number, number][] = [
              ...rutaCompleta.slice(0, idx + 1),
              posCadete
            ]

            const puntosRestantes: [number, number][] = [
              posCadete,
              ...rutaCompleta.slice(idx + 1)
            ]

            polylineRef.current.recorrida?.setLatLngs(puntosRecorridos)
            polylineRef.current.glow?.setLatLngs(puntosRestantes)
            polylineRef.current.core?.setLatLngs(puntosRestantes)
            polylineRef.current.dash?.setLatLngs(puntosRestantes)
          }
        } else {
          // Fallback directo si la geometría OSRM aún no cargó
          const debeActualizarFallback = timestamp - ultimoRenderPolilineaRef.current > 350
          if (debeActualizarFallback) {
            ultimoRenderPolilineaRef.current = timestamp
            const rutaDirecta: [number, number][] = [
              posCadete,
              [destinoPuntos.latitud, destinoPuntos.longitud]
            ]
            polylineRef.current.recorrida?.setLatLngs([])
            polylineRef.current.glow?.setLatLngs(rutaDirecta)
            polylineRef.current.core?.setLatLngs(rutaDirecta)
            polylineRef.current.dash?.setLatLngs(rutaDirecta)
          }
        }
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
  }, [mapaListo, pedido.cadete_coordenadas?.latitud, pedido.cadete_coordenadas?.longitud, esProximaEntrega, esVolviendoAlLocal])

  // ── 5. Inicialización de Polilíneas de Ruta (Neón & Flow + Tramo Recorrido + Multi-Paradas) ──
  useEffect(() => {
    if (!mapaListo || !leafletMapRef.current) return
    const L = require('leaflet')

    let puntosRuta: [number, number][] = []
    const itinerario = (pedido as any)?.itinerario_paradas || []
    const destinoCoords = esVolviendoAlLocal
      ? UBICACION_LOCAL
      : (itinerario.length > 0 && itinerario[0]?.coordenadas ? itinerario[0].coordenadas : pedido.coordenadas)

    if (rutaGeometriaRef.current.length >= 2) {
      puntosRuta = rutaGeometriaRef.current
    } else if (posicionAnimadaRef.current && destinoCoords) {
      puntosRuta = [
        [posicionAnimadaRef.current.latitud, posicionAnimadaRef.current.longitud],
        [destinoCoords.latitud, destinoCoords.longitud]
      ]
    } else if (pedido.cadete_coordenadas && destinoCoords) {
      puntosRuta = [
        [pedido.cadete_coordenadas.latitud, pedido.cadete_coordenadas.longitud],
        [destinoCoords.latitud, destinoCoords.longitud]
      ]
    } else if (destinoCoords) {
      puntosRuta = [
        [UBICACION_LOCAL.latitud, UBICACION_LOCAL.longitud],
        [destinoCoords.latitud, destinoCoords.longitud]
      ]
    }

    if (!polylineRef.current.glow && leafletMapRef.current) {
      // 1. Tramo recorrido anterior (desvanecido suavemente)
      polylineRef.current.recorrida = L.polyline([], {
        color: '#065F46',
        weight: 3,
        opacity: 0.22,
        dashArray: '4, 8',
        lineCap: 'round',
        lineJoin: 'round',
        smoothFactor: 1.5,
      }).addTo(leafletMapRef.current)

      // 2. Resplandor Neón exterior translúcido (acelerado por hardware)
      polylineRef.current.glow = L.polyline(puntosRuta, {
        color: '#059669',
        weight: 8,
        opacity: 0.28,
        lineCap: 'round',
        lineJoin: 'round',
        smoothFactor: 1.5,
        className: 'neon-glow-polyline'
      }).addTo(leafletMapRef.current)

      // 3. Núcleo esmeralda vibrante
      polylineRef.current.core = L.polyline(puntosRuta, {
        color: '#10B981',
        weight: 4,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round',
        smoothFactor: 1.5,
      }).addTo(leafletMapRef.current)

      // 4. Estela animada de flujo hacia el destino
      polylineRef.current.dash = L.polyline(puntosRuta, {
        color: '#A7F3D0',
        weight: 2.5,
        dashArray: '10, 16',
        smoothFactor: 1.5,
        className: 'animated-polyline-dash',
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(leafletMapRef.current)

      // 5. Tramo proyectado hacia siguientes paradas (multi-entrega)
      // Capa A: Borde de contraste alto (evita que se pierda en el asfalto o zonas verdes)
      polylineRef.current.siguientesParadasCasing = L.polyline([], {
        color: '#0f172a',
        weight: 7.5,
        opacity: 0.8,
        smoothFactor: 1.5,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(leafletMapRef.current)

      // Capa B: Núcleo azul eléctrico ultra vibrante
      polylineRef.current.siguientesParadasCore = L.polyline([], {
        color: '#2563eb',
        weight: 4.5,
        opacity: 0.95,
        smoothFactor: 1.5,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(leafletMapRef.current)

      // Capa C: Estela punteada animada luminosa (Cyan / Sky)
      polylineRef.current.siguientesParadasDash = L.polyline([], {
        color: '#93c5fd',
        weight: 2.5,
        dashArray: '8, 12',
        smoothFactor: 1.5,
        className: 'animated-polyline-secondary-dash',
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(leafletMapRef.current)
    } else if (polylineRef.current.glow && puntosRuta.length >= 2) {
      polylineRef.current.glow.setLatLngs(puntosRuta)
      polylineRef.current.core?.setLatLngs(puntosRuta)
      polylineRef.current.dash?.setLatLngs(puntosRuta)
    }
  }, [mapaListo, pedido.coordenadas?.latitud, pedido.coordenadas?.longitud, esProximaEntrega, esVolviendoAlLocal, paradasSignature])

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
    if (rutaGeometriaRef.current.length > 0) {
      bounds.extend(rutaGeometriaRef.current)
    }
    leafletMapRef.current.fitBounds(bounds, { padding: [45, 45], maxZoom: 16, animate: true })
  }, [mapaListo, pedido.coordenadas?.latitud, pedido.coordenadas?.longitud, pedido.cadete_coordenadas?.latitud, esVolviendoAlLocal])

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
    if (rutaGeometriaRef.current.length > 0) {
      bounds.extend(rutaGeometriaRef.current)
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
        .neon-glow-polyline {
          pointer-events: none;
        }
        @keyframes polyline-dash {
          to { stroke-dashoffset: -52; }
        }
        .animated-polyline-dash {
          animation: polyline-dash 1.4s linear infinite;
        }
        @keyframes polyline-secondary-dash {
          to { stroke-dashoffset: -40; }
        }
        .animated-polyline-secondary-dash {
          animation: polyline-secondary-dash 1.8s linear infinite;
        }
        .leaflet-container {
          width: 100% !important;
          height: 100% !important;
          background-color: #0b0f19 !important;
        }
      `,
      }} />

      {/* Contenedor del Mapa Leaflet (100% absoluto) */}
      <div ref={mapRef} className="w-full h-full" style={{ width: '100%', height: '100%' }} />

      {/* HUD Superior con Estado Claro (debajo del header flotante) */}
      {esVolviendoAlLocal ? (
        <div className="absolute top-[4.8rem] sm:top-20 left-0 right-0 z-[350] flex justify-center pointer-events-none px-3">
          <div className="bg-gradient-to-r from-[#064e3b]/90 to-[#022c22]/90 backdrop-blur-xl text-white px-4 py-1.5 rounded-full shadow-2xl flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2 border border-emerald-400/40 pointer-events-auto">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="text-xs font-bold text-white/95 tracking-wide">
              {pedido.cadete_nombre ? `¡Pedido entregado! • ${pedido.cadete_nombre} está volviendo al local` : '¡Pedido entregado! • Repartidor volviendo al local'}
            </span>
          </div>
        </div>
      ) : enLaPuerta ? (
        <div className="absolute top-[4.8rem] sm:top-20 left-0 right-0 z-[350] flex justify-center pointer-events-none px-3">
          <div className="bg-gradient-to-r from-[#064e3b]/95 to-[#022c22]/95 backdrop-blur-xl text-white px-4 py-2 rounded-2xl shadow-[0_12px_32px_rgba(0,0,0,0.6)] flex items-center gap-3 border border-emerald-400/50 animate-in fade-in slide-in-from-top-2 duration-300 pointer-events-auto">
            <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 shrink-0">
              <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
              </span>
              <BellRing size={16} className="text-emerald-300" />
            </div>
            <div className="text-left">
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400 block">
                ¡El repartidor está en tu puerta!
              </span>
              <span className="text-xs font-semibold text-white/90 block">
                Por favor salí a recibir tu pedido
              </span>
            </div>
          </div>
        </div>
      ) : paradasPrevias > 0 && !esperandoGps ? (
        <div className="absolute top-[4.8rem] sm:top-20 left-0 right-0 z-[350] flex justify-center pointer-events-none px-3">
          <div className="bg-gradient-to-r from-[#1c1917]/90 to-[#292524]/90 backdrop-blur-xl text-white px-3.5 py-1.5 rounded-full shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2 border border-amber-400/40 pointer-events-auto">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
            <span className="text-xs font-bold text-amber-200 tracking-wide">
              Entrega previa en curso • Tu turno: Parada {paradaActual} de {totalParadas}
            </span>
          </div>
        </div>
      ) : esProximaEntrega && pedido.cadete_coordenadas && ['listo', 'en_camino'].includes(pedido.estado) && !esperandoGps ? (
        <div className="absolute top-[4.8rem] sm:top-20 left-0 right-0 z-[350] flex justify-center pointer-events-none px-3">
          <div className="bg-gradient-to-r from-[#064e3b]/90 to-[#022c22]/90 backdrop-blur-xl text-white px-3.5 py-1.5 rounded-full shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2 border border-emerald-400/40 pointer-events-auto">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="text-xs font-bold text-emerald-200 tracking-wide">
              {pedido.cadete_nombre ? `${pedido.cadete_nombre} va directo a tu domicilio` : 'Repartidor en camino directo a tu domicilio'}
            </span>
          </div>
        </div>
      ) : null}

      {/* HUD de Botones de Cámara Inteligente */}
      <div className="absolute top-28 sm:top-24 right-3.5 z-[350] flex flex-col gap-1.5 bg-white/95 dark:bg-slate-900/95 p-1 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800">
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


