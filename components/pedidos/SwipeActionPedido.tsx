'use client'

import { useState, useRef, useEffect } from 'react'
import { ArrowRight, Check, Loader2, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PropsSwipeActionPedido {
  texto: string
  textoConfirmado?: string
  icono?: React.ReactNode
  colorFondo?: string
  colorThumb?: string
  colorTexto?: string
  onConfirmar: () => Promise<void> | void
  deshabilitado?: boolean
  className?: string
}

export default function SwipeActionPedido({
  texto,
  textoConfirmado = '¡Completado!',
  icono = <ArrowRight size={16} />,
  colorFondo = 'bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80',
  colorThumb = 'bg-chefsy text-white shadow-md shadow-chefsy/30',
  colorTexto = 'text-slate-600 dark:text-slate-300',
  onConfirmar,
  deshabilitado = false,
  className,
}: PropsSwipeActionPedido) {
  const [arrastrando, setArrastrando] = useState(false)
  const [posicionX, setPosicionX] = useState(0)
  const [completado, setCompletado] = useState(false)
  const [cargando, setCargando] = useState(false)

  const trackRef = useRef<HTMLDivElement>(null)
  const inicioXRef = useRef<number>(0)
  const maxArrastreRef = useRef<number>(0)

  const vibrar = (patron: number | number[] = 25) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(patron)
    }
  }

  const calcularMaxArrastre = () => {
    if (trackRef.current) {
      const trackWidth = trackRef.current.clientWidth
      const thumbWidth = 44 // ancho aproximado del tirador
      maxArrastreRef.current = Math.max(0, trackWidth - thumbWidth - 8)
    }
  }

  useEffect(() => {
    calcularMaxArrastre()
    window.addEventListener('resize', calcularMaxArrastre)
    return () => window.removeEventListener('resize', calcularMaxArrastre)
  }, [])

  // Iniciar Arrastre (Touch / Mouse)
  const iniciarArrastre = (clientX: number) => {
    if (deshabilitado || cargando || completado) return
    calcularMaxArrastre()
    setArrastrando(true)
    inicioXRef.current = clientX
    vibrar(10)
  }

  // Mover Arrastre
  const moverArrastre = (clientX: number) => {
    if (!arrastrando || deshabilitado || cargando || completado) return
    const deltaX = clientX - inicioXRef.current
    const nuevoX = Math.max(0, Math.min(deltaX, maxArrastreRef.current))
    setPosicionX(nuevoX)
  }

  // Finalizar Arrastre
  const finalizarArrastre = async () => {
    if (!arrastrando) return
    setArrastrando(false)

    const porcentaje = maxArrastreRef.current > 0 ? posicionX / maxArrastreRef.current : 0

    // Si se arrastró más del 60%, confirmamos la acción
    if (porcentaje >= 0.6) {
      setPosicionX(maxArrastreRef.current)
      setCompletado(true)
      setCargando(true)
      vibrar([20, 40, 30])

      try {
        await onConfirmar()
      } catch {
        // En caso de error, volvemos
        setCompletado(false)
        setPosicionX(0)
      } finally {
        setCargando(false)
        // Reset suave
        setTimeout(() => {
          setCompletado(false)
          setPosicionX(0)
        }, 500)
      }
    } else {
      // Si no llegó al umbral, snap back al inicio
      setPosicionX(0)
    }
  }

  // Click directo como fallback rápido (1 tap en el botón)
  const handleClickDirecto = async () => {
    if (deshabilitado || cargando || completado) return
    setCargando(true)
    setCompletado(true)
    setPosicionX(maxArrastreRef.current)
    vibrar(25)
    try {
      await onConfirmar()
    } finally {
      setCargando(false)
      setTimeout(() => {
        setCompletado(false)
        setPosicionX(0)
      }, 500)
    }
  }

  const porcentajeProgreso = maxArrastreRef.current > 0 ? posicionX / maxArrastreRef.current : 0

  return (
    <div
      ref={trackRef}
      className={cn(
        'relative h-11 rounded-2xl flex items-center select-none overflow-hidden transition-colors cursor-pointer',
        colorFondo,
        deshabilitado && 'opacity-50 cursor-not-allowed',
        className
      )}
      onClick={handleClickDirecto}
    >
      {/* Fondo de progreso coloreado a medida que se arrastra */}
      <div
        className="absolute left-0 top-0 bottom-0 bg-emerald-500/20 dark:bg-emerald-500/30 transition-all duration-75"
        style={{ width: `${Math.max(10, porcentajeProgreso * 100)}%` }}
      />

      {/* Texto central con animación de desvanecimiento */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-12">
        <span
          className={cn(
            'text-xs font-black uppercase tracking-wider transition-opacity duration-150 flex items-center gap-1.5',
            colorTexto
          )}
          style={{ opacity: completado ? 0 : Math.max(0.2, 1 - porcentajeProgreso * 1.5) }}
        >
          {texto}
        </span>
        {completado && (
          <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1 animate-in zoom-in-95">
            <Check size={14} className="stroke-[3]" />
            {textoConfirmado}
          </span>
        )}
      </div>

      {/* Tirador deslizante táctil (Thumb) */}
      <div
        className={cn(
          'absolute left-1 top-1 bottom-1 w-10 rounded-xl flex items-center justify-center cursor-grab active:cursor-grabbing z-10 transition-transform duration-75',
          colorThumb,
          arrastrando ? 'scale-105 shadow-xl' : 'transition-all duration-200'
        )}
        style={{
          transform: `translateX(${posicionX}px)`,
        }}
        onClick={(e) => e.stopPropagation()} // Prevenir doble disparo al tocar el thumb
        onTouchStart={(e) => {
          e.stopPropagation()
          iniciarArrastre(e.touches[0].clientX)
        }}
        onTouchMove={(e) => {
          e.stopPropagation()
          moverArrastre(e.touches[0].clientX)
        }}
        onTouchEnd={(e) => {
          e.stopPropagation()
          finalizarArrastre()
        }}
        onTouchCancel={finalizarArrastre}
        onMouseDown={(e) => {
          e.stopPropagation()
          iniciarArrastre(e.clientX)
          const onMouseMove = (ev: MouseEvent) => moverArrastre(ev.clientX)
          const onMouseUp = () => {
            finalizarArrastre()
            window.removeEventListener('mousemove', onMouseMove)
            window.removeEventListener('mouseup', onMouseUp)
          }
          window.addEventListener('mousemove', onMouseMove)
          window.addEventListener('mouseup', onMouseUp)
        }}
      >
        {cargando ? (
          <Loader2 size={16} className="animate-spin" />
        ) : completado ? (
          <Check size={16} className="stroke-[3] text-white" />
        ) : (
          icono
        )}
      </div>
    </div>
  )
}
