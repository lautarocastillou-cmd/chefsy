import React, { useEffect, useRef, useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Pedido, PuntoRutaBreadcrumb } from '@/tipos'
import { UBICACION_LOCAL, calcularDistanciaKm } from '@/lib/ubicacion'
import { formatearPrecio } from '@/lib/utils'
import {
  X,
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Navigation,
  Clock,
  Gauge,
  MapPin,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Bike
} from 'lucide-react'
import 'leaflet/dist/leaflet.css'

interface ModalBreadcrumbTrailProps {
  pedido: Pedido
  onCerrar: () => void
}

export default function ModalBreadcrumbTrail({ pedido, onCerrar }: ModalBreadcrumbTrailProps) {
  const [montado, setMontado] = useState(false)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const polylineRef = useRef<any>(null)
  const motoMarkerRef = useRef<any>(null)

  const [indiceActual, setIndiceActual] = useState(0)
  const [estaReproduciendo, setEstaReproduciendo] = useState(false)
  const [velocidadReproduccion, setVelocidadReproduccion] = useState<1 | 2 | 5 | 10>(2)

  useEffect(() => {
    setMontado(true)
  }, [])

  // Extraer puntos reales o fallback
  const puntos: PuntoRutaBreadcrumb[] = useMemo(() => {
    if (pedido.ruta_historial && Array.isArray(pedido.ruta_historial) && pedido.ruta_historial.length > 0) {
      return pedido.ruta_historial
    }
    // Fallback: si no hay historial previo, armar 2 puntos entre local y destino
    const destLat = pedido.coordenadas?.latitud || UBICACION_LOCAL.latitud
    const destLng = pedido.coordenadas?.longitud || UBICACION_LOCAL.longitud
    const fechaRef = pedido.en_camino_at || pedido.created_at || new Date().toISOString()
    return [
      { lat: UBICACION_LOCAL.latitud, lng: UBICACION_LOCAL.longitud, t: fechaRef, speed: 0 },
      { lat: destLat, lng: destLng, t: pedido.entregado_at || new Date().toISOString(), speed: 25 }
    ]
  }, [pedido])

  // Métricas de telemetría del recorrido
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

      // Detectar si estuvo parado más de 3 minutos
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

  // Inicializar Mapa Leaflet
  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current || mapInstanceRef.current) return

    const L = require('leaflet')

    if ((mapContainerRef.current as any)._leaflet_id) {
      delete (mapContainerRef.current as any)._leaflet_id
    }

    const map = L.map(mapContainerRef.current, {
      center: [puntos[0].lat, puntos[0].lng],
      zoom: 14,
      zoomControl: true,
    })

    L.tileLayer('https://mt1.google.com/vt/lyrs=r&x={x}&y={y}&z={z}', {
      attribution: '&copy; Google Maps',
      maxZoom: 20,
    }).addTo(map)

    mapInstanceRef.current = map

    // 1. Icono del Local
    const localIcon = L.divIcon({
      html: `
        <div style="display:flex;align-items:center;justify-content:center;width:38px;height:38px;background:#DC2626;border:3px solid #fff;border-radius:50%;box-shadow:0 4px 10px rgba(220,38,38,0.5);font-size:20px;user-select:none;">
          🏪
        </div>
      `,
      className: 'custom-local-icon',
      iconSize: [38, 38],
      iconAnchor: [19, 19],
    })
    L.marker([UBICACION_LOCAL.latitud, UBICACION_LOCAL.longitud], { icon: localIcon })
      .addTo(map)
      .bindPopup('<b>🏪 Local Chefsy (Origen)</b>')

    // 2. Icono de Destino Cliente
    if (pedido.coordenadas?.latitud && pedido.coordenadas?.longitud) {
      const clienteIcon = L.divIcon({
        html: `
          <div style="display:flex;align-items:center;justify-content:center;width:38px;height:38px;background:#2563EB;border:3px solid #fff;border-radius:50%;box-shadow:0 4px 10px rgba(37,99,235,0.5);font-size:20px;user-select:none;">
            🏠
          </div>
        `,
        className: 'custom-client-icon',
        iconSize: [38, 38],
        iconAnchor: [19, 19],
      })
      L.marker([pedido.coordenadas.latitud, pedido.coordenadas.longitud], { icon: clienteIcon })
        .addTo(map)
        .bindPopup(`<b>🏠 ${pedido.cliente}</b><br/>${pedido.direccion || ''}`)
    }

    // 3. Polyline de la Trayectoria Completa
    const latlngs = puntos.map(p => [p.lat, p.lng])
    const polyline = L.polyline(latlngs, {
      color: '#3B82F6',
      weight: 5,
      opacity: 0.85,
      lineCap: 'round',
      lineJoin: 'round',
      dashArray: puntos.length <= 2 ? '8, 8' : undefined
    }).addTo(map)
    polylineRef.current = polyline

    // Ajustar zoom a toda la ruta
    try {
      map.fitBounds(polyline.getBounds(), { padding: [40, 40] })
    } catch {}

    // 4. Marcador animado de la moto en la posición actual
    const motoIcon = L.divIcon({
      html: `
        <div style="display:flex;align-items:center;justify-content:center;width:42px;height:42px;background:#10B981;border:3px solid #fff;border-radius:50%;box-shadow:0 0 16px rgba(16,185,129,0.7);font-size:22px;user-select:none;transform:scale(1.05);transition:transform 0.2s ease;">
          🛵
        </div>
      `,
      className: 'custom-moto-animated-icon',
      iconSize: [42, 42],
      iconAnchor: [21, 21],
    })

    const initialPoint = puntos[0]
    const motoMarker = L.marker([initialPoint.lat, initialPoint.lng], { icon: motoIcon, zIndexOffset: 1000 }).addTo(map)
    motoMarkerRef.current = motoMarker

    setTimeout(() => map.invalidateSize(), 200)

    return () => {
      map.remove()
      mapInstanceRef.current = null
    }
  }, [puntos, pedido])

  // Efecto de Reproducción / Animación
  useEffect(() => {
    if (!estaReproduciendo) return

    const intervaloMs = 400 / velocidadReproduccion
    const intervalId = setInterval(() => {
      setIndiceActual(prev => {
        if (prev >= puntos.length - 1) {
          setEstaReproduciendo(false)
          return prev
        }
        const nuevoIndice = prev + 1
        const punto = puntos[nuevoIndice]
        if (motoMarkerRef.current) {
          motoMarkerRef.current.setLatLng([punto.lat, punto.lng])
        }
        return nuevoIndice
      })
    }, intervaloMs)

    return () => clearInterval(intervalId)
  }, [estaReproduciendo, puntos, velocidadReproduccion])

  const puntoSeleccionado = puntos[indiceActual] || puntos[0]

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value)
    setIndiceActual(val)
    const punto = puntos[val]
    if (motoMarkerRef.current && punto) {
      motoMarkerRef.current.setLatLng([punto.lat, punto.lng])
    }
  }

  const reiniciarAnimacion = () => {
    setIndiceActual(0)
    setEstaReproduciendo(false)
    if (motoMarkerRef.current && puntos[0]) {
      motoMarkerRef.current.setLatLng([puntos[0].lat, puntos[0].lng])
    }
  }

  const formatearSegundosMin = (seg: number) => {
    const m = Math.floor(seg / 60)
    const s = seg % 60
    return `${m}m ${s.toString().padStart(2, '0')}s`
  }

  if (!montado || typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 bg-black/85 animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl h-[90vh] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-white">
        
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-xl">
              🛵
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white">
                  Historial de Ruta (Breadcrumb Trail)
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 border border-blue-400/40 text-blue-300 font-bold">
                  Pedido #{pedido.id.slice(-6)}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Cadete: <strong className="text-slate-200">{pedido.cadete_nombre || pedido.cadete_id || 'Asignado'}</strong> • Cliente: <strong className="text-slate-200">{pedido.cliente}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onCerrar}
            className="p-2 rounded-xl bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Telemetry Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 bg-slate-950/60 border-b border-slate-800 shrink-0">
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-2.5 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-sm font-bold shrink-0">
              <Clock size={16} />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Duración Total</p>
              <p className="text-sm font-black text-slate-100">{formatearSegundosMin(metricas.duracionSegundos)}</p>
            </div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-2.5 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center text-sm font-bold shrink-0">
              <Navigation size={16} />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Distancia</p>
              <p className="text-sm font-black text-slate-100">{metricas.distanciaTotalKm} km</p>
            </div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-2.5 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center text-sm font-bold shrink-0">
              <Gauge size={16} />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Vel. Máx / Prom</p>
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
              <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Detenciones &gt;3m</p>
              <p className={`text-sm font-black ${metricas.paradasLargas > 0 ? 'text-amber-300' : 'text-slate-300'}`}>
                {metricas.paradasLargas === 0 ? 'Sin desvíos' : `${metricas.paradasLargas} parada(s)`}
              </p>
            </div>
          </div>
        </div>

        {/* Mapa Leaflet Interactivo */}
        <div className="flex-1 relative w-full h-full min-h-[250px] bg-slate-950">
          <div ref={mapContainerRef} className="w-full h-full" />

          {/* Info flotante de la posición actual */}
          <div className="absolute top-3 right-3 z-[1000] bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-xl text-xs space-y-1">
            <p className="text-[11px] text-slate-400">
              Punto <strong className="text-white">{indiceActual + 1}</strong> de <strong className="text-white">{puntos.length}</strong>
            </p>
            <p className="text-slate-200">
              Hora: <strong className="text-emerald-400">{puntoSeleccionado?.t ? new Date(puntoSeleccionado.t).toLocaleTimeString() : '--:--'}</strong>
            </p>
            {puntoSeleccionado?.speed != null && (
              <p className="text-slate-200">
                Velocidad: <strong className="text-blue-400">{Math.round(puntoSeleccionado.speed)} km/h</strong>
              </p>
            )}
          </div>
        </div>

        {/* Player Controls (Barra inferior de simulación) */}
        <div className="px-5 py-4 bg-slate-950 border-t border-slate-800 flex flex-col gap-3 shrink-0">
          {/* Slider de progreso */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-slate-400 w-12 text-right">
              {puntos[0]?.t ? new Date(puntos[0].t).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : '00:00'}
            </span>
            <input
              type="range"
              min={0}
              max={Math.max(0, puntos.length - 1)}
              value={indiceActual}
              onChange={handleSliderChange}
              className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <span className="text-xs font-mono text-slate-400 w-12">
              {puntos[puntos.length - 1]?.t ? new Date(puntos[puntos.length - 1].t).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : '00:00'}
            </span>
          </div>

          {/* Botones de acción */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setEstaReproduciendo(!estaReproduciendo)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
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
              {([1, 2, 5, 10] as const).map((vel) => (
                <button
                  key={vel}
                  type="button"
                  onClick={() => setVelocidadReproduccion(vel)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-black transition-colors ${
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
