'use client'

import React, { useState, useRef, useEffect } from 'react'
import { MapPin, Navigation, Clock, X } from 'lucide-react'

interface BotonUbicacionLocalProps {
  size?: 'sm' | 'md'
}

export default function BotonUbicacionLocal({ size = 'md' }: BotonUbicacionLocalProps) {
  const [abierto, setAbierto] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const googleMapsUrl = 'https://maps.app.goo.gl/TRGjNnbVmeAABR3t8'

  // Cierre al hacer click afuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAbierto(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setAbierto(true)
  }

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setAbierto(false)
    }, 250)
  }

  const toggleAbierto = (e: React.MouseEvent) => {
    e.stopPropagation()
    setAbierto(prev => !prev)
  }

  return (
    <div 
      ref={containerRef} 
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Botón trigger en el header */}
      <button
        type="button"
        onClick={toggleAbierto}
        aria-label="Ver ubicación del local"
        className={`group flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white/90 hover:text-white border border-white/20 hover:border-emerald-500/40 rounded-full transition-all duration-200 backdrop-blur-md cursor-pointer active:scale-95 shadow-sm ${
          size === 'sm' ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs font-semibold'
        }`}
      >
        <MapPin 
          size={size === 'sm' ? 13 : 15} 
          className="text-emerald-400 group-hover:scale-110 transition-transform shrink-0" 
        />
        <span className="font-semibold tracking-tight whitespace-nowrap">Local</span>
      </button>

      {/* Ventana flotante superpuesta */}
      {abierto && (
        <div 
          className="fixed left-1/2 -translate-x-1/2 md:absolute md:left-0 md:translate-x-0 md:top-full mt-2 z-[9999] w-[calc(100vw-32px)] max-w-sm md:w-80 bg-[#161618]/95 backdrop-blur-xl border border-white/15 text-white rounded-2xl p-4 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200"
          style={{ 
            top: typeof window !== 'undefined' && window.innerWidth < 768 && containerRef.current
              ? (containerRef.current.getBoundingClientRect().bottom + 8) 
              : undefined,
            filter: 'drop-shadow(0 20px 30px rgba(0,0,0,0.6))' 
          }}
        >
          {/* Triángulo indicador superior */}
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 md:left-6 md:translate-x-0 w-4 h-4 bg-[#161618] border-t border-l border-white/15 rotate-45" />

          {/* Encabezado modal */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10 relative z-10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <MapPin size={16} className="text-emerald-400" />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-white">Ubicación del Local</h4>
                <p className="text-[10px] text-slate-400 font-medium">San Fernando del Valle de Catamarca</p>
              </div>
            </div>

            <button
              onClick={() => setAbierto(false)}
              className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
              aria-label="Cerrar"
            >
              <X size={14} />
            </button>
          </div>

          {/* Cuerpo con la dirección y horarios */}
          <div className="py-3 space-y-3 text-left relative z-10">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Dirección</span>
              <p className="text-xs font-semibold text-slate-200 leading-snug">
                Rivadavia 195 (antes de Almagro)
              </p>
            </div>

            <div className="space-y-1.5 pt-1 border-t border-white/5">
              <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider flex items-center gap-1">
                <Clock size={11} /> Horarios de atención (Lunes a Sábado)
              </span>
              <div className="text-xs font-medium text-slate-300 space-y-0.5">
                <p>☀️ Mediodía: <strong className="text-white">11:30 hs a 14:00 hs</strong></p>
                <p>🌙 Noche: <strong className="text-white">20:30 hs a 01:00 hs</strong></p>
              </div>
              <p className="text-[11px] text-slate-400 italic pt-0.5">
                Domingos cerrado
              </p>
            </div>
          </div>

          {/* Botón de acción Google Maps */}
          <div className="pt-2 relative z-10">
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-lg transition-all duration-200 active:scale-95 border border-emerald-400/30 group"
            >
              <Navigation size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              <span>CÓMO LLEGAR EN GOOGLE MAPS</span>
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
