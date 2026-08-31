import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Pedido, PuntoRutaBreadcrumb } from '@/tipos'
import { UBICACION_LOCAL, calcularDistanciaKm } from '@/lib/ubicacion'
import {
  X,
  Play,
  Pause,
  RotateCcw,
  Navigation,
  Clock,
  Gauge,
  AlertTriangle,
  Compass,
  Bike,
  Home,
  Store,
  LocateFixed
} from 'lucide-react'
import 'leaflet/dist/leaflet.css'

interface ModalBreadcrumbTrailProps {
  pedido: Pedido
  onCerrar: () => void
}

// Helper: Calcular ángulo de rumbo (0° a 360°)
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

function formatearSegundosMin(seg: number) {
  const m = Math.floor(seg / 60)
  const s = seg % 60
  return `${m}m ${s.toString().padStart(2, '0')}s`
}

export default function ModalBreadcrumbTrail({ pedido, onCerrar }: ModalBreadcrumbTrailProps) {
  const [montado, setMontado] = useState(false)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const polylineTotalRef = useRef<any>(null)
  const polylineRecorridaRef = useRef<any>(null)
  const motoMarkerRef = useRef<any>(null)

  // ── Estados de Reproducción / Simulación ────────────────────────────────────
  const [progresoDecimal, setProgresoDecimal] = useState<number>(0) // De 0 a (puntos.length - 1)
  const [estaReproduciendo, setEstaReproduciendo] = useState(false)
  const [velocidadReproduccion, setVelocidadReproduccion] = useState<1 | 2 | 5 | 10 | 20>(2)
  const [seguirCamara, setSeguirCamara] = useState(true)

  const progresoDecimalRef = useRef<number>(0)
  const estaReproduciendoRef = useRef<boolean>(false)
  const velocidadReproduccionRef = useRef<number>(2)
  const seguirCamaraRef = useRef<boolean>(true)
  const animFrameRef = useRef<number | null>(null)
  const lastTimestampRef = useRef<number>(0)

  useEffect(() => {
    progresoDecimalRef.current = progresoDecimal
  }, [progresoDecimal])

  useEffect(() => {
    estaReproduciendoRef.current = estaReproduciendo
  }, [estaReproduciendo])

  useEffect(() => {
    velocidadReproduccionRef.current = velocidadReproduccion
  }, [velocidadReproduccion])

  useEffect(() => {
    seguirCamaraRef.current = seguirCamara
  }, [seguirCamara])

  useEffect(() => {
    setMontado(true)
  }, [])

  // ── Extraer puntos de telemetría reales o fallback ──────────────────────────
  const puntos: PuntoRutaBreadcrumb[] = useMemo(() => {
    if (pedido.ruta_historial && Array.isArray(pedido.ruta_historial) && pedido.ruta_historial.length >= 2) {
      return pedido.ruta_historial
    }
    // Fallback interpolado si hay 0 o 1 punto
    const destLat = pedido.coordenadas?.latitud || UBICACION_LOCAL.latitud
    const destLng = pedido.coordenadas?.longitud || UBICACION_LOCAL.longitud
    const fechaRef = pedido.en_camino_at || pedido.created_at || new Date().toISOString()
    const fechaFin = pedido.entregado_at || new Date(Date.now() + 600000).toISOString()

    // Si no hay historial, generar al menos 10 puntos de muestra suaves para simulación
    const samplePoints: PuntoRutaBreadcrumb[] = []
    const steps = 10
    for (let i = 0; i <= steps; i++) {
      const frac = i / steps
      samplePoints.push({
        lat: UBICACION_LOCAL.latitud + (destLat - UBICACION_LOCAL.latitud) * frac,
        lng: UBICACION_LOCAL.longitud + (destLng - UBICACION_LOCAL.longitud) * frac,
        t: new Date(new Date(fechaRef).getTime() + (new Date(fechaFin).getTime() - new Date(fechaRef).getTime()) * frac).toISOString(),
        speed: i === 0 || i === steps ? 0 : 25 + Math.sin(i) * 5
      })
    }
    return samplePoints
  }, [pedido])

  // ── Métricas de telemetría calculadas ───────────────────────────────────────
  const metricas = useMemo(() => {
    if (puntos.length < 2) {
      return {
        distanciaTotalKm: 0,
        duracionSegundos: 0,
        velocidadMaxima: 0,
        velocidadPromedio: 0,
        paradasLargas: 0
      }
    }

    let distanciaTotalKm = 0
    let velMax = 0
    let sumaVelocidades = 0
    let cantVelocidades = 0
    let paradasLargas = 0

    for (let i = 1; i < puntos.length; i++) {
      const pAnt = puntos[i - 1]
      const pAct = puntos[i]
      distanciaTotalKm += calcularDistanciaKm(
        { latitud: pAnt.lat, longitud: pAnt.lng },
        { latitud: pAct.lat, longitud: pAct.lng }
      )

      if (pAct.speed != null) {
        velMax = Math.max(velMax, pAct.speed)
        sumaVelocidades += pAct.speed
        cantVelocidades++
      }

      const tAnt = new Date(pAnt.t).getTime()
      const tAct = new Date(pAct.t).getTime()
      if (tAct - tAnt > 180000 && pAct.speed != null && pAct.speed < 3) {
        paradasLargas++
      }
    }

    const tInicio = new Date(puntos[0].t).getTime()
    const tFin = new Date(puntos[puntos.length - 1].t).getTime()
    const duracionSegundos = Math.max(0, Math.floor((tFin - tInicio) / 1000))

    return {
      distanciaTotalKm: Number(distanciaTotalKm.toFixed(2)),
      duracionSegundos,
      velocidadMaxima: Math.round(velMax),
      velocidadPromedio: cantVelocidades > 0 ? Math.round(sumaVelocidades / cantVelocidades) : 0,
      paradasLargas
    }
  }, [puntos])

  // ── Helper: Aplicar posición, rumbo y traza en tiempo real ──────────────────
  const aplicarFrameEnMapa = useCallback((progreso: number) => {
    if (!mapInstanceRef.current || !motoMarkerRef.current || puntos.length === 0) return

    const maxIdx = puntos.length - 1
    const clampedProg = Math.max(0, Math.min(progreso, maxIdx))
    const segIdx = Math.floor(clampedProg)
    const segFrac = clampedProg - segIdx

    const p1 = puntos[segIdx]
    const p2 = puntos[Math.min(segIdx + 1, maxIdx)]

    // Interpolación de Coordenadas
    const lat = p1.lat + (p2.lat - p1.lat) * segFrac
    const lng = p1.lng + (p2.lng - p1.lng) * segFrac

    // Mover marcador de Leaflet
    motoMarkerRef.current.setLatLng([lat, lng])

    // Calcular y aplicar rumbo / rotación
    let rumbo = 0
    if (Math.abs(p2.lat - p1.lat) > 0.000001 || Math.abs(p2.lng - p1.lng) > 0.000001) {
      rumbo = Math.round(calcularRumbo(p1.lat, p1.lng, p2.lat, p2.lng))
    }

    const markerEl = motoMarkerRef.current.getElement()
    if (markerEl) {
      const rotatables = markerEl.querySelectorAll('.cadete-rotatable')
      rotatables.forEach((el: any) => {
        if (el.classList.contains('cadete-direction-arrow')) {
          el.style.transform = `rotate(${rumbo}deg) translateY(-24px)`
        } else {
          el.style.transform = `rotate(${rumbo}deg)`
        }
      })
    }

    // Actualizar polilínea recorrida (viva / iluminada)
    if (polylineRecorridaRef.current) {
      const traza = [
        ...puntos.slice(0, segIdx + 1).map(p => [p.lat, p.lng]),
        [lat, lng]
      ]
      polylineRecorridaRef.current.setLatLngs(traza)
    }

    // Acompañar cámara si está activado
    if (seguirCamaraRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.panTo([lat, lng], { animate: false })
    }
  }, [puntos])

  // ── Inicialización Segura del Mapa Leaflet ──────────────────────────────────
  useEffect(() => {
    if (!montado || typeof window === 'undefined' || !mapContainerRef.current) return

    const L = require('leaflet')

    if ((mapContainerRef.current as any)._leaflet_id) {
      delete (mapContainerRef.current as any)._leaflet_id
    }

    const initialPoint = puntos[0] || { lat: UBICACION_LOCAL.latitud, lng: UBICACION_LOCAL.longitud }

    const map = L.map(mapContainerRef.current, {
      center: [initialPoint.lat, initialPoint.lng],
      zoom: 15,
      zoomControl: false,
      attributionControl: false,
    })

    // Capa de Mapa Google Maps HD
    L.tileLayer('https://mt1.google.com/vt/lyrs=r&x={x}&y={y}&z={z}', {
      attribution: '&copy; Google Maps',
      maxZoom: 20,
    }).addTo(map)

    L.control.zoom({ position: 'bottomright' }).addTo(map)

    mapInstanceRef.current = map

    // Si el usuario arrastra el mapa con el mouse/dedo, pausar seguimiento automático de cámara
    map.on('dragstart', () => {
      setSeguirCamara(false)
    })

    // 1. Icono del Local Chefsy (Origen)
    const localIcon = L.divIcon({
      html: `
        <div style="display:flex;flex-direction:column;align-items:center;user-select:none;">
          <div style="width:36px;height:36px;background:#2A6348;border:2.5px solid #fff;border-radius:50%;box-shadow:0 4px 10px rgba(0,0,0,0.35);font-size:18px;display:flex;align-items:center;justify-content:center;">
            🏪
          </div>
          <div style="margin-top:2px;background:#2A6348;color:#fff;font-size:9px;font-weight:900;padding:1px 5px;border-radius:6px;border:1px solid #fff;">
            Local
          </div>
        </div>
      `,
      className: 'custom-local-icon',
      iconSize: [60, 52],
      iconAnchor: [30, 18],
    })
    L.marker([UBICACION_LOCAL.latitud, UBICACION_LOCAL.longitud], { icon: localIcon, zIndexOffset: 200 })
      .addTo(map)
      .bindPopup('<b>🏪 Local Chefsy (Punto de Partida)</b>')

    // 2. Icono del Destino (Cliente)
    if (pedido.coordenadas?.latitud && pedido.coordenadas?.longitud) {
      const clienteIcon = L.divIcon({
        html: `
          <div style="display:flex;flex-direction:column;align-items:center;user-select:none;">
            <div style="width:36px;height:36px;background:#2563EB;border:2.5px solid #fff;border-radius:50%;box-shadow:0 4px 10px rgba(37,99,235,0.4);font-size:18px;display:flex;align-items:center;justify-content:center;">
              🏠
            </div>
            <div style="margin-top:2px;background:#1E40AF;color:#fff;font-size:9px;font-weight:900;padding:1px 5px;border-radius:6px;border:1px solid #fff;max-width:90px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
              ${pedido.cliente || 'Destino'}
            </div>
          </div>
        `,
        className: 'custom-client-icon',
        iconSize: [90, 52],
        iconAnchor: [45, 18],
      })
      L.marker([pedido.coordenadas.latitud, pedido.coordenadas.longitud], { icon: clienteIcon, zIndexOffset: 200 })
        .addTo(map)
        .bindPopup(`<b>🏠 ${pedido.cliente}</b><br/>${pedido.direccion || ''}`)
    }

    // 3. Polilínea Total de Fondo (Gris / Azul guía)
    const latlngs = puntos.map(p => [p.lat, p.lng])
    polylineTotalRef.current = L.polyline(latlngs, {
      color: '#475569',
      weight: 5,
      opacity: 0.5,
      lineCap: 'round',
      lineJoin: 'round',
      dashArray: '6, 8'
    }).addTo(map)

    // 4. Polilínea Viva Recorrida (Verde Esmeralda Brillante)
    polylineRecorridaRef.current = L.polyline([[initialPoint.lat, initialPoint.lng]], {
      color: '#10B981',
      weight: 6,
      opacity: 0.95,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map)

    // 5. Marcador de la Moto con Faro Delantero y Radar
    const motoIcon = L.divIcon({
      html: `
        <div class="cadete-marker-outer" style="position:relative; width:54px; height:54px; display:flex; align-items:center; justify-content:center;">
          <div class="cadete-headlight-cone cadete-rotatable" style="transform: rotate(0deg);"></div>
          <div class="cadete-radar-pulse"></div>
          <div class="cadete-moto-badge cadete-rotatable" style="transform: rotate(0deg); width:40px; height:40px; background:#E11D48; border:2.5px solid white; border-radius:50%; box-shadow:0 4px 14px rgba(225,29,72,0.6); display:flex; align-items:center; justify-content:center; font-size:22px; cursor:pointer;">
            🛵
          </div>
          <div class="cadete-direction-arrow cadete-rotatable" style="position:absolute; top:2px; transform: rotate(0deg) translateY(-24px); font-size:11px; color:#E11D48; font-weight:900; text-shadow:0 1px 2px #fff;">
            ▲
          </div>
        </div>
      `,
      className: 'custom-moto-animated-icon',
      iconSize: [54, 54],
      iconAnchor: [27, 27],
    })

    motoMarkerRef.current = L.marker([initialPoint.lat, initialPoint.lng], {
      icon: motoIcon,
      zIndexOffset: 1000
    }).addTo(map)

    // Auto-encuadre inicial de la ruta
    try {
      map.fitBounds(polylineTotalRef.current.getBounds(), { padding: [50, 50], maxZoom: 16 })
    } catch {}

    // InvalidateSize continuo con ResizeObserver para evitar pantalla negra
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

    const t1 = setTimeout(invalidate, 50)
    const t2 = setTimeout(invalidate, 200)
    const t3 = setTimeout(invalidate, 500)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
      if (ro) ro.disconnect()
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [montado, puntos, pedido])

  // ── Bucle de Reproducción a 60 FPS (RequestAnimationFrame) ───────────────────
  useEffect(() => {
    if (!estaReproduciendo) {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
        animFrameRef.current = null
      }
      return
    }

    lastTimestampRef.current = performance.now()

    const pasoAnimacion = (timestamp: number) => {
      if (!estaReproduciendoRef.current) return

      const deltaMs = timestamp - lastTimestampRef.current
      lastTimestampRef.current = timestamp

      // Velocidad: 1x avanza 1 segmento cada 400ms
      const velocidad = velocidadReproduccionRef.current
      const incrementoSegmentos = (deltaMs / 400) * velocidad

      const nuevoProgreso = progresoDecimalRef.current + incrementoSegmentos
      const maxProgreso = puntos.length - 1

      if (nuevoProgreso >= maxProgreso) {
        progresoDecimalRef.current = maxProgreso
        setProgresoDecimal(maxProgreso)
        aplicarFrameEnMapa(maxProgreso)
        setEstaReproduciendo(false)
        return
      }

      progresoDecimalRef.current = nuevoProgreso
      setProgresoDecimal(nuevoProgreso)
      aplicarFrameEnMapa(nuevoProgreso)

      animFrameRef.current = requestAnimationFrame(pasoAnimacion)
    }

    animFrameRef.current = requestAnimationFrame(pasoAnimacion)

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
        animFrameRef.current = null
      }
    }
  }, [estaReproduciendo, puntos.length, aplicarFrameEnMapa])

  // ── Datos del punto interpolado en tiempo real ──────────────────────────────
  const datosMomentoActual = useMemo(() => {
    if (puntos.length === 0) return { hora: '--:--', velocidad: 0, indice: 1, porcentaje: 0 }

    const maxIdx = puntos.length - 1
    const clampedProg = Math.max(0, Math.min(progresoDecimal, maxIdx))
    const segIdx = Math.floor(clampedProg)
    const segFrac = clampedProg - segIdx

    const p1 = puntos[segIdx]
    const p2 = puntos[Math.min(segIdx + 1, maxIdx)]

    const v1 = p1?.speed ?? 0
    const v2 = p2?.speed ?? 0
    const velocidad = Math.round(v1 + (v2 - v1) * segFrac)

    let hora = '--:--'
    if (p1?.t && p2?.t) {
      const t1 = new Date(p1.t).getTime()
      const t2 = new Date(p2.t).getTime()
      const tInterpolado = new Date(t1 + (t2 - t1) * segFrac)
      hora = tInterpolado.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    }

    const porcentaje = Math.round((clampedProg / maxIdx) * 100)

    return {
      hora,
      velocidad,
      indice: segIdx + 1,
      porcentaje
    }
  }, [progresoDecimal, puntos])

  // ── Handlers de Controles ──────────────────────────────────────────────────
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value)
    setProgresoDecimal(val)
    progresoDecimalRef.current = val
    aplicarFrameEnMapa(val)
  }

  const togglePlayPause = () => {
    if (progresoDecimal >= puntos.length - 1) {
      // Si llegó al final, reiniciar desde el principio
      setProgresoDecimal(0)
      progresoDecimalRef.current = 0
      aplicarFrameEnMapa(0)
    }
    setEstaReproduciendo(!estaReproduciendo)
  }

  const reiniciarAnimacion = () => {
    setEstaReproduciendo(false)
    setProgresoDecimal(0)
    progresoDecimalRef.current = 0
    aplicarFrameEnMapa(0)
  }

  const encuadrarRutaCompleta = () => {
    if (!mapInstanceRef.current || !polylineTotalRef.current) return
    setSeguirCamara(false)
    mapInstanceRef.current.fitBounds(polylineTotalRef.current.getBounds(), { padding: [50, 50], maxZoom: 16, animate: true })
  }

  const enfocarMoto = () => {
    if (!mapInstanceRef.current || !motoMarkerRef.current) return
    setSeguirCamara(true)
    const latlng = motoMarkerRef.current.getLatLng()
    mapInstanceRef.current.flyTo(latlng, 16, { duration: 0.6 })
  }

  if (!montado || typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 bg-black/80 animate-in fade-in duration-150">
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
      `,
      }} />

      <div className="relative w-full max-w-4xl h-[90vh] max-h-[820px] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-white">
        
        {/* Header */}
        <div className="px-4 py-3 bg-slate-800/95 border-b border-slate-700 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-xl shrink-0">
              🛵
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-black text-white truncate">
                  Historial de Ruta (Breadcrumb Trail)
                </h2>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-bold">
                  Pedido #{pedido.id ? pedido.id.slice(-6).toUpperCase() : ''}
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate">
                Cadete: <strong className="text-slate-200">{pedido.cadete_nombre || 'Leonel'}</strong> • Cliente: <strong className="text-slate-200">{pedido.cliente}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCerrar}
            className="p-2 rounded-xl bg-slate-700/60 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        {/* Telemetry Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-slate-950/70 border-b border-slate-800 shrink-0 text-xs">
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-2.5 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-sm font-bold shrink-0">
              <Clock size={16} />
            </div>
            <div>
              <p className="text-[9px] text-slate-400 uppercase font-black tracking-wider">Duración Total</p>
              <p className="text-sm font-black text-slate-100">{formatearSegundosMin(metricas.duracionSegundos)}</p>
            </div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-2.5 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center text-sm font-bold shrink-0">
              <Navigation size={16} />
            </div>
            <div>
              <p className="text-[9px] text-slate-400 uppercase font-black tracking-wider">Distancia</p>
              <p className="text-sm font-black text-slate-100">{metricas.distanciaTotalKm} km</p>
            </div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-2.5 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center text-sm font-bold shrink-0">
              <Gauge size={16} />
            </div>
            <div>
              <p className="text-[9px] text-slate-400 uppercase font-black tracking-wider">Vel. Máx / Prom</p>
              <p className="text-sm font-black text-slate-100">{metricas.velocidadMaxima} / {metricas.velocidadPromedio} km/h</p>
            </div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-2.5 flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
              metricas.paradasLargas > 0 ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700/40 text-slate-400'
            }`}>
              <AlertTriangle size={16} />
            </div>
            <div>
              <p className="text-[9px] text-slate-400 uppercase font-black tracking-wider">Detenciones &gt;3m</p>
              <p className={`text-sm font-black ${metricas.paradasLargas > 0 ? 'text-amber-300' : 'text-slate-300'}`}>
                {metricas.paradasLargas === 0 ? 'Sin desvíos' : `${metricas.paradasLargas} parada(s)`}
              </p>
            </div>
          </div>
        </div>

        {/* Mapa Leaflet Interactivo (Contenedor 100% garantizado) */}
        <div className="flex-1 relative w-full min-h-0 bg-slate-950 overflow-hidden">
          <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />

          {/* Telemetría Flotante en Vivo */}
          <div className="absolute top-3 right-3 z-[500] bg-slate-900/95 border border-slate-700 rounded-xl p-3 shadow-2xl text-xs space-y-1.5 backdrop-blur-none pointer-events-none min-w-[130px]">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Punto:</span>
              <strong className="text-white font-mono">{datosMomentoActual.indice} de {puntos.length}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Hora:</span>
              <strong className="text-emerald-400 font-mono">{datosMomentoActual.hora}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Velocidad:</span>
              <strong className="text-blue-400 font-mono">{datosMomentoActual.velocidad} km/h</strong>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden mt-1">
              <div className="bg-emerald-500 h-full transition-all duration-75" style={{ width: `${datosMomentoActual.porcentaje}%` }} />
            </div>
          </div>

          {/* Botones Flotantes de Cámara */}
          <div className="absolute top-3 left-3 z-[500] flex flex-col gap-1.5 bg-slate-900/95 border border-slate-700 p-1 rounded-xl shadow-xl">
            <button
              type="button"
              onClick={enfocarMoto}
              className={`p-2 rounded-lg transition-all cursor-pointer ${
                seguirCamara ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title="Seguir a la moto"
            >
              <Bike size={16} />
            </button>
            <button
              type="button"
              onClick={encuadrarRutaCompleta}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
              title="Ver ruta completa"
            >
              <Compass size={16} />
            </button>
          </div>
        </div>

        {/* Player Controls (Barra inferior de simulación) */}
        <div className="px-4 py-3 bg-slate-950 border-t border-slate-800 flex flex-col gap-2.5 shrink-0">
          {/* Slider de progreso */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-slate-400 w-12 text-right">
              {puntos[0]?.t ? new Date(puntos[0].t).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : '00:00'}
            </span>
            <input
              type="range"
              min={0}
              max={Math.max(0, puntos.length - 1)}
              step={0.01}
              value={progresoDecimal}
              onChange={handleSliderChange}
              className="flex-1 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <span className="text-xs font-mono text-slate-400 w-12">
              {puntos[puntos.length - 1]?.t ? new Date(puntos[puntos.length - 1].t).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : '00:00'}
            </span>
          </div>

          {/* Botones de acción y velocidad */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={togglePlayPause}
                className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-md cursor-pointer ${
                  estaReproduciendo
                    ? 'bg-amber-600 hover:bg-amber-500 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                {estaReproduciendo ? <Pause size={15} /> : <Play size={15} />}
                <span>{estaReproduciendo ? 'Pausar' : 'Simular Trayecto'}</span>
              </button>

              <button
                type="button"
                onClick={reiniciarAnimacion}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors cursor-pointer"
                title="Reiniciar al inicio"
              >
                <RotateCcw size={15} />
              </button>
            </div>

            {/* Selector de Velocidad */}
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl">
              {([1, 2, 5, 10, 20] as const).map((vel) => (
                <button
                  key={vel}
                  type="button"
                  onClick={() => setVelocidadReproduccion(vel)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-black transition-colors cursor-pointer ${
                    velocidadReproduccion === vel
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {vel}x
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

