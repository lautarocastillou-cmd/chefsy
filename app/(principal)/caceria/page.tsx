'use client'

import { useState, useEffect } from 'react'
import { Trophy, Gift, CheckCircle, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'

const TARGET_COORDS = { lat: -28.4690, lng: -65.7792 }

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
  const [distance, setDistance] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMode, setSuccessMode] = useState(false)
  const [debugMode, setDebugMode] = useState(false)

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Tu navegador no soporta geolocalización.')
      return
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        const dist = getDistanceFromLatLonInM(latitude, longitude, TARGET_COORDS.lat, TARGET_COORDS.lng)
        setDistance(dist)
        setError(null)
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

    return () => navigator.geolocation.clearWatch(watchId)
  }, [])

  const getStatusInfo = (dist: number | null) => {
    if (dist === null) return { state: 'LOADING', text: 'BUSCANDO GPS...', color: 'border-slate-500', bg: 'bg-slate-500/20', textColor: 'text-slate-400', animation: 'animate-pulse' }
    if (dist <= 10) return { state: 'EXITO', text: '¡ESTÁS ENCIMA DEL TESORO!', color: 'border-green-500', bg: 'bg-green-500/20', textColor: 'text-green-400 drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]', animation: '' }
    if (dist <= 100) return { state: 'CALIENTE', text: '¡¡CALIENTE, CALIENTE!!', color: 'border-red-500', bg: 'bg-red-500/20', textColor: 'text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]', animation: 'animate-[ping_1s_cubic-bezier(0,0,0.2,1)_infinite]' }
    if (dist <= 300) return { state: 'TIBIO', text: 'Tibio... Te estás acercando', color: 'border-orange-500', bg: 'bg-orange-500/20', textColor: 'text-orange-400', animation: 'animate-[pulse_1.5s_cubic-bezier(0.4,0,0.6,1)_infinite]' }
    return { state: 'FRIO', text: 'Frío... Estás muy lejos', color: 'border-blue-500', bg: 'bg-blue-500/20', textColor: 'text-blue-400', animation: 'animate-[pulse_3s_cubic-bezier(0.4,0,0.6,1)_infinite]' }
  }

  const status = getStatusInfo(distance)
  const isButtonEnabled = distance !== null && distance <= 10

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

        <div className="z-10 bg-slate-800/80 p-8 rounded-3xl border border-green-500/30 backdrop-blur-xl shadow-[0_0_50px_rgba(34,197,94,0.3)] text-center max-w-md w-full animate-in zoom-in duration-500">
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

      {/* Header */}
      <div className="text-center mb-8 z-10 w-full animate-in fade-in slide-in-from-top-4 duration-500">
        <h1 className="text-3xl font-black text-white uppercase tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400 drop-shadow-sm">
          Cacería Chefsy
        </h1>
        <p className="text-slate-400 font-medium mt-1">¡Buscá el Tesoro Escondido!</p>
        <button 
          onClick={() => setDebugMode(!debugMode)} 
          className="text-[10px] text-slate-700 hover:text-slate-500 mt-2 transition-colors focus:outline-none uppercase tracking-widest"
        >
          {debugMode ? 'Ocultar dist' : 'Modo debug'}
        </button>
      </div>

      {/* Radar Central */}
      <div className="relative w-64 h-64 sm:w-80 sm:h-80 mb-10 flex-shrink-0 z-10 animate-in zoom-in duration-700">
        {/* Anillo exterior animado según estado */}
        <div className={cn("absolute inset-0 rounded-full border-4 opacity-50", status.color, status.animation)} />
        
        {/* Contenedor del Radar */}
        <div className={cn("absolute inset-2 rounded-full border border-slate-700 backdrop-blur-md overflow-hidden flex items-center justify-center transition-colors duration-500", status.bg)}>
          {/* Círculos concéntricos */}
          <div className="absolute w-[80%] h-[80%] rounded-full border border-slate-600/30" />
          <div className="absolute w-[60%] h-[60%] rounded-full border border-slate-600/30" />
          <div className="absolute w-[40%] h-[40%] rounded-full border border-slate-600/30" />
          <div className="absolute w-[20%] h-[20%] rounded-full border border-slate-600/30" />
          
          {/* Líneas en cruz */}
          <div className="absolute w-full h-[1px] bg-slate-600/30" />
          <div className="absolute h-full w-[1px] bg-slate-600/30" />

          {/* Línea de barrido (Radar Sweep) */}
          {distance !== null && status.state !== 'EXITO' && (
            <div className="absolute top-0 right-1/2 bottom-1/2 left-0 origin-bottom-right animate-[spin_3s_linear_infinite] z-10">
              <div className={cn("w-full h-full bg-gradient-to-tr from-transparent via-transparent border-r-2", status.color, "opacity-60")} />
            </div>
          )}

          {/* Marcador central (el usuario) */}
          <div className="absolute w-3 h-3 bg-white rounded-full shadow-[0_0_15px_#fff] z-20" />
          
          {/* Punto simulado del tesoro (solo en modo caliente o exito) */}
          {(status.state === 'CALIENTE' || status.state === 'EXITO') && (
            <div className="absolute w-4 h-4 bg-red-500 rounded-full top-[30%] left-[60%] animate-bounce shadow-[0_0_20px_#ef4444] z-20" />
          )}
        </div>
      </div>

      {/* Tarjeta de Estado */}
      <div className="w-full max-w-sm bg-slate-800/80 backdrop-blur-xl rounded-2xl p-6 border border-slate-700 shadow-2xl text-center z-10 mb-8 transition-all duration-300">
        <h2 className={cn("text-2xl sm:text-3xl font-black uppercase tracking-widest transition-colors", status.textColor)}>
          {status.text}
        </h2>
        {debugMode && distance !== null && (
          <div className="mt-3 inline-block bg-slate-900 px-3 py-1 rounded-md border border-slate-800">
            <p className="text-slate-400 font-mono text-sm">
              Distancia: <span className="text-white font-bold">{(distance).toFixed(1)}</span> mts
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
    </div>
  )
}
