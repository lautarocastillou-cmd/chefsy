'use client'

import { useState, useEffect, useRef } from 'react'
import { Trophy, Gift, CheckCircle, MapPin, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import 'leaflet/dist/leaflet.css'

function getDistanceFromLatLonInM(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function CaceriaPage() {
  const [gpsDistance, setGpsDistance] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMode, setSuccessMode] = useState(false)
  const [debugMode, setDebugMode] = useState(false)

  // Novedades: Coordenadas personalizadas y Simulador
  const [targetCoords, setTargetCoords] = useState({ lat: -28.4690, lng: -65.7792 })
  const [customCoordsInput, setCustomCoordsInput] = useState('')
  const [isSimulatorActive, setIsSimulatorActive] = useState(false)
  const [simulatedDistance, setSimulatedDistance] = useState<number>(500)

  // Leaflet refs
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const leafletMapRef = useRef<any>(null)
  const markersRef = useRef<{ user?: any, target?: any }>({})
  
  // Ref para acceder a las coordenadas destino dentro del watchPosition sin recrear el listener
  const targetCoordsRef = useRef(targetCoords)
  useEffect(() => {
    targetCoordsRef.current = targetCoords
    // Actualizar dinámicamente la posición del marcador del tesoro en el mapa
    if (markersRef.current.target) {
      markersRef.current.target.setLatLng([targetCoords.lat, targetCoords.lng])
    }
  }, [targetCoords])

  // Distancia efectiva a usar (Simulada o Real)
  const effectiveDistance = isSimulatorActive ? simulatedDistance : gpsDistance

  // Geolocalización y actualización del mapa
  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Tu navegador no soporta geolocalización.')
      return
    }

    let isMapInitialized = false;

    const initMap = (initialLat: number, initialLng: number) => {
      if (typeof window === 'undefined' || !mapContainerRef.current || leafletMapRef.current) return
      
      const L = require('leaflet')
      
      // Inicializar mapa
      leafletMapRef.current = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false,
        dragging: false, // Bloquear interacción manual
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false
      }).setView([initialLat, initialLng], 17)

      // Capa base: CartoDB Dark Matter
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19
      }).addTo(leafletMapRef.current)

      // Icono Tesoro
      const crearIconoTesoro = () => L.divIcon({
        html: `<div style="background: red; width: 16px; height: 16px; border-radius: 50%; box-shadow: 0 0 15px #ef4444; border: 2px solid white;"></div>`,
        className: 'custom-radar-target',
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      })

      // Marcador del tesoro inicial
      markersRef.current.target = L.marker([targetCoordsRef.current.lat, targetCoordsRef.current.lng], {
        icon: crearIconoTesoro(),
        zIndexOffset: 100
      }).addTo(leafletMapRef.current)

      isMapInitialized = true;
    }

    const updateMapPosition = (lat: number, lng: number) => {
      if (!leafletMapRef.current) return;
      const L = require('leaflet')

      // Centrar el mapa en el usuario de forma suave
      leafletMapRef.current.panTo([lat, lng], { animate: true, duration: 1 })

      // Marcador de usuario
      if (markersRef.current.user) {
        markersRef.current.user.setLatLng([lat, lng])
      } else {
        const crearIconoUsuario = () => L.divIcon({
          html: `<div style="background: white; width: 12px; height: 12px; border-radius: 50%; box-shadow: 0 0 10px #fff;"></div>`,
          className: 'custom-radar-user',
          iconSize: [12, 12],
          iconAnchor: [6, 6]
        })
        markersRef.current.user = L.marker([lat, lng], {
          icon: crearIconoUsuario(),
          zIndexOffset: 200
        }).addTo(leafletMapRef.current)
      }
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        
        // Calculamos la distancia real usando la Ref
        const dist = getDistanceFromLatLonInM(latitude, longitude, targetCoordsRef.current.lat, targetCoordsRef.current.lng)
        setGpsDistance(dist)
        setError(null)

        if (!isMapInitialized) {
          initMap(latitude, longitude)
        }
        updateMapPosition(latitude, longitude)
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setError('Permiso de ubicación denegado. Activalo para jugar.')
        } else {
          setError('Error obteniendo tu ubicación.')
        }
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
    )

    return () => {
      navigator.geolocation.clearWatch(watchId)
      if (leafletMapRef.current) {
        leafletMapRef.current.remove()
        leafletMapRef.current = null
        markersRef.current = {}
      }
    }
  }, []) // El array vacío evita recrear el mapa, las coords objetivo se manejan por ref

  const handleUpdateCoords = () => {
    const partes = customCoordsInput.split(',')
    if (partes.length === 2) {
      const lat = parseFloat(partes[0].trim())
      const lng = parseFloat(partes[1].trim())
      if (!isNaN(lat) && !isNaN(lng)) {
        setTargetCoords({ lat, lng })
        setCustomCoordsInput('')
        alert('¡Ubicación del Tesoro actualizada con éxito!')
      } else {
        alert('Error: Asegurate de ingresar números válidos para Latitud y Longitud.')
      }
    } else {
      alert('Error: Formato inválido. Usá el formato: latitud, longitud (Ej: -28.4690, -65.7792)')
    }
  }

  const getStatusInfo = (dist: number | null) => {
    if (dist === null) return { state: 'LOADING', text: 'BUSCANDO GPS...', color: 'border-slate-500', bg: 'bg-slate-500/20', textColor: 'text-slate-400', animation: 'animate-pulse' }
    if (dist <= 10) return { state: 'EXITO', text: '¡ESTÁS ENCIMA DEL TESORO!', color: 'border-green-500', bg: 'bg-green-500/20', textColor: 'text-green-400 drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]', animation: '' }
    if (dist <= 100) return { state: 'CALIENTE', text: '¡¡CALIENTE, CALIENTE!!', color: 'border-red-500', bg: 'bg-red-500/20', textColor: 'text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]', animation: 'animate-[ping_1s_cubic-bezier(0,0,0.2,1)_infinite]' }
    if (dist <= 300) return { state: 'TIBIO', text: 'Tibio... Te estás acercando', color: 'border-orange-500', bg: 'bg-orange-500/20', textColor: 'text-orange-400', animation: 'animate-[pulse_1.5s_cubic-bezier(0.4,0,0.6,1)_infinite]' }
    return { state: 'FRIO', text: 'Frío... Estás muy lejos', color: 'border-blue-500', bg: 'bg-blue-500/20', textColor: 'text-blue-400', animation: 'animate-[pulse_3s_cubic-bezier(0.4,0,0.6,1)_infinite]' }
  }

  const status = getStatusInfo(effectiveDistance)
  const isButtonEnabled = effectiveDistance !== null && effectiveDistance <= 10

  const handleClaim = () => {
    if (isButtonEnabled) {
      setSuccessMode(true)
    }
  }

  if (error) {
    return (
      <div className="min-h-[80vh] bg-slate-900 rounded-3xl p-6 flex flex-col items-center justify-center text-center">
        <MapPin size={48} className="text-red-500 mb-4 animate-bounce" />
        <h2 className="text-2xl font-black text-white mb-2 uppercase">GPS Necesario</h2>
        <p className="text-slate-400 max-w-sm">{error}</p>
      </div>
    )
  }

  if (successMode) {
    return (
      <div className="min-h-[80vh] bg-slate-900 rounded-3xl p-6 flex flex-col items-center justify-center relative overflow-hidden">
        {/* CSS Confetti simulación de fondo */}
        <div className="absolute inset-0 pointer-events-none opacity-30 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]" />
        
        {/* Partículas de confeti simuladas en CSS */}
        <div className="absolute w-3 h-3 bg-red-500 rounded-full top-10 left-10 animate-[bounce_1s_infinite]" />
        <div className="absolute w-3 h-3 bg-blue-500 rounded-sm top-20 right-20 animate-[spin_2s_infinite]" />
        <div className="absolute w-3 h-3 bg-green-500 rounded-full bottom-20 left-1/4 animate-[ping_1.5s_infinite]" />
        <div className="absolute w-3 h-3 bg-yellow-400 rounded-sm bottom-10 right-1/3 animate-[bounce_1.2s_infinite]" />

        <div className="z-10 bg-slate-900/95 p-8 rounded-3xl border border-green-500/30 shadow-[0_0_50px_rgba(34,197,94,0.3)] text-center max-w-md w-full animate-in zoom-in duration-500 will-change-transform">
          <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(34,197,94,0.5)] border border-green-500/50">
            <Trophy size={48} className="text-green-400 drop-shadow-md" />
          </div>
          <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-wide">¡Tesoro Encontrado!</h2>
          <p className="text-green-400 font-bold text-lg mb-6">Voucher Único Generado</p>
          
          <div className="bg-slate-900 rounded-xl p-4 mb-6 border border-slate-700 shadow-inner">
            <span className="font-mono text-2xl font-bold tracking-widest text-emerald-300">
              CHEF-PLAZA-9831
            </span>
          </div>
          
          <div className="bg-white/5 rounded-xl p-4 text-left border border-white/10">
            <h3 className="text-white font-bold mb-2 flex items-center gap-2">
              <CheckCircle size={18} className="text-green-400" />
              Instrucciones
            </h3>
            <p className="text-slate-300 text-sm leading-relaxed">
              ¡Felicitaciones! Encontraste el tesoro escondido. Acercate a la caja de Chefsy y mostrá este código único para reclamar tus <strong className="text-white">Papas Grandes Gratis</strong>.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[80vh] bg-slate-900 rounded-3xl p-6 flex flex-col items-center relative overflow-hidden font-sans border border-slate-800 shadow-2xl">
      {/* Background decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[80px] pointer-events-none" />

      {/* Botón de configuración/debug superior derecho */}
      <button 
        onClick={() => setDebugMode(!debugMode)}
        className={cn(
          "absolute top-4 right-4 p-2.5 rounded-full transition-all z-20 shadow-lg",
          debugMode ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30" : "bg-slate-800/50 text-slate-400 hover:text-white"
        )}
        title="Opciones de Debug"
      >
        <Settings size={20} className={debugMode ? "animate-[spin_4s_linear_infinite]" : ""} />
      </button>

      {/* Header */}
      <div className="text-center mb-6 z-10 w-full animate-in fade-in slide-in-from-top-4 duration-500 mt-2">
        <h1 className="text-3xl font-black text-white uppercase tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400 drop-shadow-sm">
          Cacería Chefsy
        </h1>
        <p className="text-slate-400 font-medium mt-1">¡Buscá el Tesoro Escondido!</p>
      </div>

      {/* Panel de Debug / Herramientas de Testeo */}
      {debugMode && (
        <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-xl p-5 mb-6 z-20 animate-in slide-in-from-top-2 shadow-2xl">
          <h3 className="text-white font-bold mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
            <Settings size={16} className="text-emerald-400"/> Panel de Herramientas
          </h3>
          
          {/* Asignar Coordenadas */}
          <div className="mb-5">
            <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">
              1. Coordenadas del Tesoro (Lat, Lng)
            </label>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Ej: -28.4690, -65.7792"
                value={customCoordsInput}
                onChange={e => setCustomCoordsInput(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
              />
              <button 
                onClick={handleUpdateCoords}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-md active:scale-95"
              >
                Set
              </button>
            </div>
            <p className="text-[10px] text-slate-500 mt-2 font-mono">
              <span className="text-slate-400">Actual:</span> {targetCoords.lat}, {targetCoords.lng}
            </p>
          </div>

          {/* Simulador de Distancia */}
          <div className="border-t border-slate-700 pt-4">
            <label className="flex items-center gap-3 cursor-pointer mb-3 select-none">
              <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                <input 
                  type="checkbox" 
                  name="toggle" 
                  id="toggle" 
                  checked={isSimulatorActive}
                  onChange={(e) => setIsSimulatorActive(e.target.checked)}
                  className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer transition-transform duration-300 peer"
                  style={{ transform: isSimulatorActive ? 'translateX(1.25rem)' : 'translateX(0)', borderColor: isSimulatorActive ? '#10b981' : '#475569' }}
                />
                <label 
                  htmlFor="toggle" 
                  className={cn("toggle-label block overflow-hidden h-5 rounded-full cursor-pointer transition-colors duration-300", isSimulatorActive ? "bg-emerald-500" : "bg-slate-600")}
                ></label>
              </div>
              <span className="text-sm font-bold text-white uppercase tracking-wide">
                2. Simulador de Distancia
              </span>
            </label>
            
            <div className={cn("transition-all duration-300", isSimulatorActive ? "opacity-100 h-12" : "opacity-30 pointer-events-none h-12")}>
              <div className="flex justify-between text-[10px] text-slate-400 mb-2 font-bold uppercase tracking-wider">
                <span>0m (Éxito)</span>
                <span className="text-emerald-400 font-black text-xs">{simulatedDistance}m</span>
                <span>500m (Lejos)</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="500" 
                value={simulatedDistance}
                onChange={(e) => setSimulatedDistance(Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Radar Central con Mapa */}
      <div className="relative w-64 h-64 sm:w-80 sm:h-80 mb-8 flex-shrink-0 z-10 animate-in zoom-in duration-700">
        {/* Anillo exterior animado según estado */}
        <div className={cn("absolute inset-0 rounded-full border-4 opacity-50 z-20 pointer-events-none", status.color, status.animation)} />
        
        {/* Contenedor del Radar y el Mapa */}
        <div className={cn("absolute inset-2 rounded-full border border-slate-700 overflow-hidden transition-colors duration-500", status.bg)}>
          
          {/* MAPA DE FONDO */}
          <div ref={mapContainerRef} className="absolute inset-0 z-0 bg-slate-900" />

          {/* Superposición Oscurecedora (opcional para dar tono según el estado) */}
          <div className={cn("absolute inset-0 z-10 pointer-events-none mix-blend-color transition-colors duration-1000", status.bg)} />

          {/* Círculos concéntricos (Superpuestos) */}
          <div className="absolute w-[80%] h-[80%] rounded-full border border-slate-600/50 z-20 pointer-events-none" />
          <div className="absolute w-[60%] h-[60%] rounded-full border border-slate-600/50 z-20 pointer-events-none" />
          <div className="absolute w-[40%] h-[40%] rounded-full border border-slate-600/50 z-20 pointer-events-none" />
          <div className="absolute w-[20%] h-[20%] rounded-full border border-slate-600/50 z-20 pointer-events-none" />
          
          {/* Líneas en cruz (Superpuestos) */}
          <div className="absolute w-full h-[1px] bg-slate-600/50 z-20 pointer-events-none" />
          <div className="absolute h-full w-[1px] bg-slate-600/50 z-20 pointer-events-none" />

          {/* Línea de barrido (Radar Sweep) (Superpuesto) */}
          {effectiveDistance !== null && status.state !== 'EXITO' && (
            <div className="absolute top-0 right-1/2 bottom-1/2 left-0 origin-bottom-right animate-[spin_3s_linear_infinite] z-30 pointer-events-none">
              <div className={cn("w-full h-full bg-gradient-to-tr from-transparent via-transparent border-r-2", status.color, "opacity-70")} />
            </div>
          )}

        </div>
      </div>

      {/* Tarjeta de Estado */}
      <div className="w-full max-w-sm bg-slate-900/95 rounded-2xl p-6 border border-slate-700 shadow-2xl text-center z-10 mb-8 transition-all duration-300">
        <h2 className={cn("text-2xl sm:text-3xl font-black uppercase tracking-widest transition-colors", status.textColor)}>
          {status.text}
        </h2>
        
        {/* Distancia mostrada siempre, indica si es simulada */}
        {effectiveDistance !== null && (
          <div className="mt-3 inline-block bg-slate-900 px-3 py-1 rounded-md border border-slate-800">
            <p className="text-slate-400 font-mono text-sm">
              Distancia {isSimulatorActive && <span className="text-orange-400 font-sans font-bold">(Simulada)</span>}: <span className="text-white font-bold">{(effectiveDistance).toFixed(1)}</span> mts
            </p>
          </div>
        )}
      </div>

      {/* Botón Reclamar */}
      <button
        onClick={handleClaim}
        disabled={!isButtonEnabled}
        className={cn(
          "w-full max-w-sm py-5 rounded-2xl font-black text-xl uppercase tracking-wider transition-all duration-300 z-10 flex items-center justify-center gap-3",
          isButtonEnabled 
            ? "bg-gradient-to-r from-green-400 to-emerald-600 text-white shadow-[0_0_40px_rgba(52,211,153,0.4)] hover:scale-[1.02] active:scale-95 border border-green-400" 
            : "bg-slate-800/80 text-slate-500 cursor-not-allowed border border-slate-700 opacity-80"
        )}
      >
        <Gift size={24} className={isButtonEnabled ? "animate-bounce" : "opacity-50"} />
        ¡Reclamar Tesoro!
      </button>

      {/* Estilos globales inyectados para ocultar atribución de leaflet y forzar modo oscuro sobre los controles */}
      <style dangerouslySetInnerHTML={{__html: `
        .leaflet-container {
          background: #0f172a !important; /* slate-900 */
        }
      `}} />
    </div>
  )
}
