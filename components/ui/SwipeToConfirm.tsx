'use client'

import React, { useState, useRef, useEffect } from 'react'
import { ChevronRight, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SwipeToConfirmProps {
  onConfirm: () => Promise<void> | void
  texto?: string
  textoCargando?: string
  variante?: 'verde' | 'rojo' | 'azul'
}

export default function SwipeToConfirm({ 
  onConfirm, 
  texto = 'Deslizá para Entregar',
  textoCargando = 'Guardando...',
  variante = 'verde'
}: SwipeToConfirmProps) {
  const esRojo = variante === 'rojo'
  const esAzul = variante === 'azul'
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

  // Colores según variante
  const colorFondoConfirmado = esRojo ? 'bg-red-500' : esAzul ? 'bg-blue-500' : 'bg-emerald-500'
  const colorFondoBase = esRojo ? 'bg-red-950/20 border border-red-900/30' : esAzul ? 'bg-blue-950/20 border border-blue-900/30' : 'bg-green-950/20 border border-green-900/30'
  const colorProgreso = esRojo ? 'bg-red-500/20' : esAzul ? 'bg-blue-500/20' : 'bg-green-500/20'
  const colorTexto = esRojo ? 'text-red-600 dark:text-red-400' : esAzul ? 'text-blue-600 dark:text-blue-400' : 'text-green-700 dark:text-green-400'
  const colorBoton = esRojo ? 'bg-red-500' : esAzul ? 'bg-blue-500' : 'bg-green-500'
  const textoConfirmado = esRojo ? '¡Entregado!' : esAzul ? '¡En Camino!' : '¡Listo!'

  return (
    <div 
      ref={contenedorRef}
      className={cn(
        "relative w-full rounded-xl flex items-center overflow-hidden transition-colors",
        esRojo ? 'h-14' : 'h-16',
        confirmado ? colorFondoConfirmado : colorFondoBase
      )}
    >
      {/* Fondo progresivo que se pinta mientras arrastrás */}
      {!confirmado && (
        <div 
          className={cn('absolute top-0 left-0 h-full', colorProgreso)}
          style={{ width: `${deslizamiento + 56}px` }} 
        />
      )}

      {/* Texto de fondo */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 gap-0.5">
        {!esRojo && !esAzul && !confirmado && !cargando && (
          <span className="text-[10px] font-black uppercase tracking-widest text-green-800 dark:text-green-400 opacity-90">
            ¿ESTÁ LISTO?
          </span>
        )}
        <span className={cn(
          "font-bold tracking-wide transition-all",
          esRojo ? 'text-sm' : 'text-xs font-black uppercase',
          confirmado ? 'text-white scale-110' : colorTexto
        )}>
          {cargando ? textoCargando : confirmado ? textoConfirmado : texto}
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
          confirmado ? 'opacity-0' : cn(colorBoton, 'text-white shadow-md'),
          !estaPresionado && !confirmado && 'transition-transform duration-300 ease-out'
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
