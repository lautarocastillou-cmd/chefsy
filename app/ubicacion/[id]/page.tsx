'use client'

import React, { use, useEffect, useState, useRef, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { supabaseAnon } from '@/lib/supabase'
import {
  Bike,
  Navigation,
  Clock,
  Battery,
  Gauge,
  MapPin,
  Share2,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  Copy,
  Check
} from 'lucide-react'

// Cargar mapa dinámico sin SSR
const MapaSeguimientoCadetePublico = dynamic(
  () => import('@/components/cadeteria/MapaSeguimientoCadetePublico'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-slate-400 gap-3">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-medium tracking-wide">Cargando mapa satelital en vivo...</p>
      </div>
    )
  }
)

interface CadeteInfo {
  id: string
  nombre: string
  lat: number | null
  lng: number | null
  speed: number | null
  heading: number | null
  accuracy: number | null
  bateria: number | null
  gps_activo: boolean | null
  updated_at: string | null
  activo: boolean
}

export default function PaginaUbicacionPublica({ params }: { params: Promise<{ id: string }> }) {
  const { id: cadeteIdParam } = use(params)
  const cadeteId = decodeURIComponent(cadeteIdParam || '').trim()

  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cadete, setCadete] = useState<CadeteInfo | null>(null)
  const [enReparto, setEnReparto] = useState(false)
  const [historialPuntos, setHistorialPuntos] = useState<Array<{ lat: number; lng: number }>>([])
  const [copiado, setCopiado] = useState(false)
  const [ahora, setAhora] = useState<number>(Date.now())

  // Actualizar timer de "hace X segundos" cada segundo
  useEffect(() => {
    const timer = setInterval(() => setAhora(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  // 1. Cargar datos iniciales del cadete
  const cargarDatos = async (silencioso = false) => {
    if (!silencioso) setCargando(true)
    try {
      const res = await fetch(`/api/public/cadete-ubicacion?id=${encodeURIComponent(cadeteId)}`, {
        cache: 'no-store'
      })
      if (!res.ok) {
        if (res.status === 404) {
          setError('El cadete o usuario no fue encontrado. Verificá que el link sea correcto.')
        } else {
          setError('No pudimos obtener la ubicación en este momento.')
        }
        setCargando(false)
        return
      }

      const data = await res.json()
      if (data?.cadete) {
        setCadete(data.cadete)
        setEnReparto(Boolean(data.en_reparto))
        setError(null)

        // Agregar al historial si tiene coordenadas válidas
        if (data.cadete.lat && data.cadete.lng) {
          setHistorialPuntos(prev => {
            const ultimo = prev[prev.length - 1]
            if (!ultimo || Math.abs(ultimo.lat - data.cadete.lat) > 0.00003 || Math.abs(ultimo.lng - data.cadete.lng) > 0.00003) {
              const nuevo = [...prev, { lat: data.cadete.lat, lng: data.cadete.lng }]
              return nuevo.slice(-30) // Mantener últimos 30 puntos
            }
            return prev
          })
        }
      }
    } catch (err) {
      if (!silencioso) setError('Error de conexión al cargar la ubicación.')
    } finally {
      if (!silencioso) setCargando(false)
    }
  }

  useEffect(() => {
    cargarDatos()
  }, [cadeteId])

  // 2. Suscripción en Tiempo Real con Supabase Realtime + Polling de Respaldo
  useEffect(() => {
    if (!cadete?.id) return

    const idReal = cadete.id

    // Canal Realtime para cambios instantáneos
    const canal = supabaseAnon
      .channel(`cadete-live-${idReal}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'cadetes',
          filter: `id=eq.${idReal}`
        },
        (payload) => {
          const nuevo = payload.new as any
          if (nuevo) {
            setCadete(prev => prev ? {
              ...prev,
              lat: nuevo.lat ?? prev.lat,
              lng: nuevo.lng ?? prev.lng,
              speed: nuevo.speed ?? prev.speed,
              heading: nuevo.heading ?? prev.heading,
              accuracy: nuevo.accuracy ?? prev.accuracy,
              bateria: nuevo.bateria ?? prev.bateria,
              gps_activo: nuevo.gps_activo ?? prev.gps_activo,
              updated_at: nuevo.updated_at ?? prev.updated_at,
            } : null)

            if (nuevo.lat && nuevo.lng) {
              setHistorialPuntos(prev => {
                const ultimo = prev[prev.length - 1]
                if (!ultimo || Math.abs(ultimo.lat - nuevo.lat) > 0.00003 || Math.abs(ultimo.lng - nuevo.lng) > 0.00003) {
                  return [...prev, { lat: nuevo.lat, lng: nuevo.lng }].slice(-30)
                }
                return prev
              })
            }
          }
        }
      )
      .subscribe()

    // Polling de respaldo cada 3.5 segundos para máxima confiabilidad
    const intervalPolling = setInterval(() => {
      cargarDatos(true)
    }, 3500)

    return () => {
      supabaseAnon.removeChannel(canal)
      clearInterval(intervalPolling)
    }
  }, [cadete?.id])

  // Calcular segundos transcurridos desde el último ping de GPS
  const segundosDesdeUpdate = useMemo(() => {
    if (!cadete?.updated_at) return 9999
    const ts = new Date(cadete.updated_at).getTime()
    return Math.max(0, Math.floor((ahora - ts) / 1000))
  }, [cadete?.updated_at, ahora])

  const estaEnVivo = segundosDesdeUpdate < 90 && cadete?.gps_activo !== false

  // Formato de velocidad en km/h
  const velocidadKmH = useMemo(() => {
    if (cadete?.speed == null) return 0
    // Si la velocidad viene en m/s (ej: geolocator suele reportar < 30 m/s)
    let v = Number(cadete.speed)
    if (v > 0 && v < 45) {
      // Si parece m/s lo multiplicamos o si ya es km/h
      v = v > 20 ? v : v * 3.6
    }
    return Math.round(v)
  }, [cadete?.speed])

  // Copiar enlace al portapapeles
  const copiarEnlace = () => {
    if (typeof window === 'undefined') return
    navigator.clipboard.writeText(window.location.href)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  // Compartir nativo
  const compartirLink = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Ubicación en vivo de ${cadete?.nombre || 'Cadete'}`,
          text: `Seguí la ubicación en tiempo real de ${cadete?.nombre || 'Cadete'} en el mapa:`,
          url: window.location.href,
        })
        return
      } catch (_) {}
    }
    copiarEnlace()
  }

  if (cargando) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center animate-pulse mb-4">
          <Bike className="w-6 h-6" />
        </div>
        <h1 className="text-base font-bold text-slate-100">Conectando con el GPS...</h1>
        <p className="text-xs text-slate-400 mt-1">Cargando ubicación en tiempo real</p>
      </div>
    )
  }

  if (error || !cadete) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white text-center">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-4">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h1 className="text-lg font-bold text-slate-100">Ubicación no disponible</h1>
        <p className="text-xs text-slate-400 max-w-xs mt-1 leading-relaxed">
          {error || 'No se pudo encontrar la información solicitada.'}
        </p>
        <button
          type="button"
          onClick={() => cargarDatos()}
          className="mt-5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors"
        >
          <RefreshCw size={14} /> Reintentar
        </button>
      </div>
    )
  }

  const tieneCoordenadas = Boolean(cadete.lat && cadete.lng)

  return (
    <div className="relative w-full h-[100dvh] bg-slate-950 flex flex-col overflow-hidden text-white font-sans select-none">
      
      {/* Barra Superior Flotante */}
      <header className="absolute top-3 inset-x-3 z-[500] max-w-lg mx-auto bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-2xl p-3 shadow-2xl flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-400 flex items-center justify-center shrink-0 shadow-inner">
            <Bike className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-extrabold text-white truncate">
                {cadete.nombre || 'Cadete'}
              </h1>
              {estaEnVivo ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-400/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  En Vivo
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30">
                  Pausado
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 truncate mt-0.5">
              {estaEnVivo
                ? segundosDesdeUpdate < 5 ? 'Señal en tiempo real' : `Actualizado hace ${segundosDesdeUpdate}s`
                : segundosDesdeUpdate < 3600
                  ? `Última señal hace ${Math.floor(segundosDesdeUpdate / 60)} min`
                  : 'Sin señal reciente'}
              {enReparto ? ' • En reparto' : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={compartirLink}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer flex items-center justify-center"
            title="Compartir este mapa"
          >
            <Share2 size={16} />
          </button>
        </div>
      </header>

      {/* Mapa en Pantalla Completa */}
      <main className="flex-1 w-full h-full relative z-0">
        {tieneCoordenadas ? (
          <MapaSeguimientoCadetePublico
            cadeteNombre={cadete.nombre}
            posicion={{
              lat: cadete.lat!,
              lng: cadete.lng!,
              speed: cadete.speed,
              heading: cadete.heading,
              accuracy: cadete.accuracy,
              updated_at: cadete.updated_at
            }}
            historialPuntos={historialPuntos}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 p-6 text-center text-slate-400 gap-3">
            <MapPin className="w-10 h-10 text-slate-600 animate-bounce" />
            <h2 className="text-base font-bold text-slate-200">Esperando señal de GPS</h2>
            <p className="text-xs max-w-xs leading-relaxed">
              El dispositivo de {cadete.nombre} aún no ha enviado coordenadas. En cuanto empiece a transmitir, aparecerá automáticamente en el mapa.
            </p>
          </div>
        )}
      </main>

      {/* Tarjeta Inferior de Telemetría y Navegación */}
      {tieneCoordenadas && (
        <footer className="absolute bottom-3 inset-x-3 z-[500] max-w-lg mx-auto bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl p-3.5 shadow-2xl flex flex-col gap-3">
          
          {/* Métricas en vivo (Velocidad, Batería, Estado) */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-slate-800/70 border border-slate-700/60 rounded-xl p-2 flex flex-col items-center justify-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                <Gauge size={12} className="text-blue-400" /> Velocidad
              </span>
              <p className="text-sm font-black text-white mt-0.5">
                {velocidadKmH} <span className="text-[10px] font-normal text-slate-400">km/h</span>
              </p>
            </div>

            <div className="bg-slate-800/70 border border-slate-700/60 rounded-xl p-2 flex flex-col items-center justify-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                <Battery size={12} className="text-emerald-400" /> Batería
              </span>
              <p className="text-sm font-black text-white mt-0.5">
                {cadete.bateria != null ? `${cadete.bateria}%` : '--'}
              </p>
            </div>

            <div className="bg-slate-800/70 border border-slate-700/60 rounded-xl p-2 flex flex-col items-center justify-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                <Navigation size={12} className="text-amber-400" /> Estado
              </span>
              <p className="text-xs font-black text-white mt-1 truncate">
                {velocidadKmH > 3 ? 'En marcha' : 'Detenido'}
              </p>
            </div>
          </div>

          {/* Acciones Rápidas */}
          <div className="flex items-center gap-2">
            {/* Abrir en Google Maps para navegar directamente a la posición */}
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${cadete.lat},${cadete.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-extrabold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-900/30 cursor-pointer"
            >
              <ExternalLink size={15} />
              <span>Navegar en Google Maps</span>
            </a>

            {/* Copiar enlace */}
            <button
              type="button"
              onClick={copiarEnlace}
              className="p-2.5 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="Copiar enlace"
            >
              {copiado ? (
                <>
                  <Check size={15} className="text-emerald-400" />
                  <span className="text-emerald-400">Copiado</span>
                </>
              ) : (
                <>
                  <Copy size={15} />
                  <span>Copiar</span>
                </>
              )}
            </button>
          </div>
        </footer>
      )}
    </div>
  )
}
