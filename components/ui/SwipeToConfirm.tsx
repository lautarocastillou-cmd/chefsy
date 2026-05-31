'use client'

import React, { useState, useRef, useEffect } from 'react'
import { ChevronRight, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SwipeToConfirmProps {
  onConfirm: () => Promise<void> | void
  texto?: string
  textoCargando?: string
}

export default function SwipeToConfirm({ 
  onConfirm, 
  texto = 'Deslizá para Entregar',
  textoCargando = 'Guardando...'
}: SwipeToConfirmProps) {
  const [deslizamiento, setDeslizamiento] = useState(0)
  const [estaPresionado, setEstaPresionado] = useState(false)
  const [confirmado, setConfirmado] = useState(false)
  const [cargando, setCargando] = useState(false)
  
  const contenedorRef = useRef<HTMLDivElement>(null)
  const botonRef = useRef<HTMLDivElement>(null)

  const handleStart = () => {
    if (confirmado || cargando) return
    setEstaPresionado(true)
  }

  const handleMove = (clientX: number) => {
    if (!estaPresionado || confirmado || cargando || !contenedorRef.current || !botonRef.current) return

    const bounds = contenedorRef.current.getBoundingClientRect()
    const botonWidth = botonRef.current.offsetWidth
    
    let nuevoX = clientX - bounds.left - (botonWidth / 2)
    const maxDeslizamiento = bounds.width - botonWidth

    // Limitar los bordes
    if (nuevoX < 0) nuevoX = 0
    if (nuevoX > maxDeslizamiento) nuevoX = maxDeslizamiento

    setDeslizamiento(nuevoX)

    // Si llegó al final
    if (nuevoX >= maxDeslizamiento * 0.95) {
      setEstaPresionado(false)
      ejecutarConfirmacion()
    }
  }

  const handleEnd = () => {
    if (!estaPresionado) return
    setEstaPresionado(false)
    if (!confirmado) {
      // Volver a 0 animadamente
      setDeslizamiento(0)
    }
  }

  const ejecutarConfirmacion = async () => {
    if (contenedorRef.current && botonRef.current) {
      setDeslizamiento(contenedorRef.current.offsetWidth - botonRef.current.offsetWidth)
    }
    setConfirmado(true)
    setCargando(true)

    try {
      await onConfirm()
    } catch (error) {
      // Si falla, volvemos al estado inicial
      setConfirmado(false)
      setDeslizamiento(0)
    } finally {
      setCargando(false)
    }
  }

  // Mouse events
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => handleMove(e.clientX)
    const handleMouseUp = () => handleEnd()

    if (estaPresionado) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [estaPresionado])

  // Touch events
  useEffect(() => {
    const handleTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientX)
    const handleTouchEnd = () => handleEnd()

    if (estaPresionado) {
      document.addEventListener('touchmove', handleTouchMove)
      document.addEventListener('touchend', handleTouchEnd)
    }

    return () => {
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [estaPresionado])

  const progreso = contenedorRef.current && botonRef.current
    ? deslizamiento / (contenedorRef.current.offsetWidth - botonRef.current.offsetWidth)
    : 0

  return (
    <div 
      ref={contenedorRef}
      className={cn(
        "relative w-full h-14 rounded-xl flex items-center overflow-hidden transition-colors",
        confirmado 
          ? "bg-emerald-500" 
          : "bg-emerald-950/20 border border-emerald-900/30"
      )}
    >
      {/* Fondo progresivo que se pinta mientras arrastrás */}
      {!confirmado && (
        <div 
          className="absolute top-0 left-0 h-full bg-emerald-500/20"
          style={{ width: `${deslizamiento + 56}px` }} 
        />
      )}

      {/* Texto de fondo */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
        <span className={cn(
          "font-bold text-sm tracking-wide transition-all",
          confirmado ? "text-white scale-110" : "text-emerald-600 dark:text-emerald-400 opacity-80"
        )}>
          {cargando ? textoCargando : confirmado ? '¡Entregado!' : texto}
        </span>
      </div>

      {/* Botón arrastrable */}
      <div 
        ref={botonRef}
        onMouseDown={handleStart}
        onTouchStart={handleStart}
        style={{ transform: `translateX(${deslizamiento}px)` }}
        className={cn(
          "absolute h-12 w-12 rounded-lg left-1 z-20 flex items-center justify-center cursor-grab active:cursor-grabbing",
          confirmado ? "bg-white text-emerald-600 opacity-0" : "bg-emerald-500 text-white shadow-md",
          !estaPresionado && !confirmado && "transition-transform duration-300 ease-out"
        )}
      >
        {cargando ? (
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : confirmado ? (
          <Check size={20} className="stroke-[3px]" />
        ) : (
          <ChevronRight size={24} className="stroke-[3px] ml-0.5 animate-pulse" />
        )}
      </div>
    </div>
  )
}
