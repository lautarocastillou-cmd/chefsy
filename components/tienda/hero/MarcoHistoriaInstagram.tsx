'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { Heart, Send, MoreHorizontal, Sparkles } from 'lucide-react'

export interface HistoriaItem {
  id: string
  url: string
  titulo: string
  etiqueta?: string
}

const HISTORIAS_DEFAULT: HistoriaItem[] = [
  {
    id: 'h-1',
    url: '/historias/historia-1.jpg',
    titulo: 'DOBLE SMASH CON CHEDDAR',
    etiqueta: '🔥 La más pedida',
  },
  {
    id: 'h-2',
    url: '/burger-hero.png',
    titulo: 'DOBLE BURGER GOURMET',
    etiqueta: '⭐ 100% Carne vacuna',
  },
  {
    id: 'h-3',
    url: '/historias/historia-2.jpg',
    titulo: 'PAPAS FRITAS CARGADAS',
    etiqueta: '🍟 Con cheddar & verdeo',
  },
  {
    id: 'h-4',
    url: '/historias/historia-3.jpg',
    titulo: 'PIZZA A LA PIEDRA',
    etiqueta: '🍕 Masa madre & mozzarella',
  },
  {
    id: 'h-5',
    url: '/historias/historia-4.jpg',
    titulo: 'LOMITO COMPLETO CHEFSY',
    etiqueta: '🥪 En pan artesanal',
  },
]

const DURACION_HISTORIA_MS = 4500

interface Props {
  historias?: HistoriaItem[]
  logoUrl?: string
  usuarioInstagram?: string
  className?: string
}

export default function MarcoHistoriaInstagram({
  historias = HISTORIAS_DEFAULT,
  logoUrl = '/logo.jpg',
  usuarioInstagram = 'chefsy_fastfood_',
  className = '',
}: Props) {
  const [indiceActual, setIndiceActual] = useState(0)
  const [progreso, setProgreso] = useState(0)
  const [estaPausado, setEstaPausado] = useState(false)
  const [liked, setLiked] = useState(false)
  const animFrameRef = useRef<number | null>(null)
  const tiempoAcumuladoRef = useRef<number>(0)

  const items = historias.length > 0 ? historias : HISTORIAS_DEFAULT
  const historiaActual = items[indiceActual] || items[0]

  const avanzarHistoria = useCallback(() => {
    setIndiceActual((prev) => (prev + 1) % items.length)
    setProgreso(0)
    tiempoAcumuladoRef.current = 0
  }, [items.length])

  const retrocederHistoria = useCallback(() => {
    setIndiceActual((prev) => (prev - 1 + items.length) % items.length)
    setProgreso(0)
    tiempoAcumuladoRef.current = 0
  }, [items.length])

  // Temporizador y animación fluida de la barra de progreso
  useEffect(() => {
    if (estaPausado) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      return
    }

    let start = performance.now() - tiempoAcumuladoRef.current

    const step = (now: number) => {
      const transcurrido = now - start
      tiempoAcumuladoRef.current = transcurrido
      const pct = Math.min((transcurrido / DURACION_HISTORIA_MS) * 100, 100)
      setProgreso(pct)

      if (transcurrido >= DURACION_HISTORIA_MS) {
        avanzarHistoria()
      } else {
        animFrameRef.current = requestAnimationFrame(step)
      }
    }

    animFrameRef.current = requestAnimationFrame(step)

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [indiceActual, estaPausado, avanzarHistoria])

  const handleTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const tercio = rect.width / 3

    if (x < tercio) {
      retrocederHistoria()
    } else {
      avanzarHistoria()
    }
  }

  return (
    <div
      className={`relative select-none ${className}`}
      onMouseEnter={() => setEstaPausado(true)}
      onMouseLeave={() => setEstaPausado(false)}
      onTouchStart={() => setEstaPausado(true)}
      onTouchEnd={() => setEstaPausado(false)}
    >
      {/* Marco simulando pantalla de Smartphone / Historia de Instagram (Aspect Ratio 9:16) */}
      <div className="relative w-[280px] sm:w-[300px] lg:w-[320px] aspect-[9/16] rounded-[32px] overflow-hidden bg-black p-1 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_35px_rgba(34,197,94,0.18)] border-[3.5px] border-white/15 ring-1 ring-black/80 transition-all duration-300">
        
        {/* Notch / Cámara frontal superior */}
        <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-20 h-4 bg-black/90 rounded-full z-40 flex items-center justify-center pointer-events-none">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-700 mr-2" />
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/80 animate-pulse" />
        </div>

        {/* Contenedor Interior de la Historia */}
        <div 
          onClick={handleTap}
          className="relative w-full h-full rounded-[26px] overflow-hidden cursor-pointer"
        >
          {/* Imágenes de la historia con transición suave */}
          {items.map((item, idx) => {
            const esActiva = idx === indiceActual
            return (
              <div
                key={item.id}
                className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                  esActiva ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                }`}
              >
                <Image
                  src={item.url}
                  alt={item.titulo}
                  fill
                  priority={idx === 0}
                  className={`object-cover transition-transform duration-[4500ms] ease-out ${
                    esActiva ? 'scale-108' : 'scale-100'
                  }`}
                  sizes="(max-width: 768px) 300px, 340px"
                />
              </div>
            )
          })}

          {/* Degradados para legibilidad de textos superior e inferior */}
          <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/80 via-black/40 to-transparent z-20 pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/95 via-black/60 to-transparent z-20 pointer-events-none" />

          {/* 1. Barras de progreso superiores (Estilo Instagram Stories) */}
          <div className="absolute top-7 inset-x-3.5 flex gap-1 z-30 pointer-events-none">
            {items.map((_, idx) => {
              let fillWidth = '0%'
              if (idx < indiceActual) fillWidth = '100%'
              else if (idx === indiceActual) fillWidth = `${progreso}%`

              return (
                <div
                  key={idx}
                  className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden backdrop-blur-sm"
                >
                  <div
                    className="h-full bg-white transition-[width] duration-75 ease-linear rounded-full"
                    style={{ width: fillWidth }}
                  />
                </div>
              )
            })}
          </div>

          {/* 2. Cabecera de la Historia (Perfil, Usuario, Tiempo, Opciones) */}
          <div className="absolute top-10 inset-x-3.5 flex items-center justify-between z-30 pointer-events-none">
            <div className="flex items-center gap-2">
              {/* Avatar con anillo degradado tipo Instagram */}
              <div className="w-8 h-8 rounded-full p-[1.5px] bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 shadow-md">
                <div className="w-full h-full rounded-full overflow-hidden relative bg-black">
                  <Image
                    src={logoUrl}
                    alt={usuarioInstagram}
                    fill
                    className="object-cover"
                  />
                </div>
              </div>

              {/* Usuario & Tiempo */}
              <div className="flex flex-col leading-tight">
                <div className="flex items-center gap-1">
                  <span className="text-white text-xs font-bold tracking-tight">
                    {usuarioInstagram}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-emerald-400" />
                  <span className="text-white/60 text-[11px] font-medium">Hace 2h</span>
                </div>
                <span className="text-emerald-400 text-[10px] font-semibold tracking-wider uppercase">
                  Historias de Chefsy
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-white/80">
              <MoreHorizontal size={16} />
            </div>
          </div>

          {/* 3. Indicador de Pausa al pasar el ratón */}
          {estaPausado && (
            <div className="absolute top-20 right-3.5 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full text-[10px] text-white/80 border border-white/10 z-30 pointer-events-none flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
              <span>Pausado</span>
            </div>
          )}

          {/* 4. Pie de la Historia (Título del plato, Badge & Barra de Interacción) */}
          <div className="absolute bottom-3 inset-x-3.5 z-30 flex flex-col gap-2.5">
            {/* Tarjeta de información del plato */}
            <div className="bg-black/60 backdrop-blur-md p-3 rounded-2xl border border-white/15 shadow-lg">
              {historiaActual.etiqueta && (
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[10px] font-bold uppercase tracking-wider mb-1">
                  <Sparkles size={10} />
                  <span>{historiaActual.etiqueta}</span>
                </div>
              )}
              <h4 className="text-white text-sm font-black uppercase tracking-tight leading-snug drop-shadow-sm font-sans">
                {historiaActual.titulo}
              </h4>
            </div>

            {/* Input simulado de mensaje de Instagram + Botón de Me Gusta */}
            <div className="flex items-center gap-2 pt-0.5">
              <div className="flex-1 bg-white/15 hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-full py-2 px-3.5 flex items-center justify-between text-white/70 transition-colors">
                <span className="text-xs font-medium">Enviar mensaje...</span>
                <Send size={13} className="text-white/80 -rotate-12" />
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setLiked(!liked)
                }}
                className={`w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md border transition-all active:scale-75 ${
                  liked
                    ? 'bg-rose-600/30 border-rose-500/50 text-rose-500'
                    : 'bg-white/15 hover:bg-white/25 border-white/20 text-white'
                }`}
                title="Me gusta"
              >
                <Heart
                  size={18}
                  className={`transition-transform duration-200 ${
                    liked ? 'fill-rose-500 scale-110' : ''
                  }`}
                />
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
