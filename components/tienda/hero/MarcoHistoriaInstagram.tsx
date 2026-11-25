'use client'

import React, { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { Pause, Play } from 'lucide-react'
import { ImagenLoopHero, IMAGENES_LOOP_DEFAULT, TransicionLoopHero } from '@/servicios/supabase/configuracion'

interface Props {
  imagenesLoop?: ImagenLoopHero[]
  transicion?: TransicionLoopHero
  className?: string
}

function esUrlVideo(url: string): boolean {
  return /\.(mp4|webm|mov)(\?.*)?$/i.test(url.trim())
}

export default function MarcoHistoriaInstagram({
  imagenesLoop = IMAGENES_LOOP_DEFAULT,
  transicion = 'fade',
  className = '',
}: Props) {
  const [indiceActual, setIndiceActual] = useState(0)
  const [indiceAnterior, setIndiceAnterior] = useState<number | null>(null)
  const [pausado, setPausado] = useState(false)
  const videoRefs = useRef<Record<number, HTMLVideoElement | null>>({})
  const lista = (imagenesLoop && imagenesLoop.length > 0) ? imagenesLoop : IMAGENES_LOOP_DEFAULT

  // Respetar prefers-reduced-motion: si el usuario prefiere menos movimiento, arrancar en pausa
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setPausado(true)
    }
  }, [])

  useEffect(() => {
    if (lista.length <= 1 || pausado) return

    const itemActual = lista[indiceActual] || lista[0]
    const duracionMs = Math.max((itemActual.duracionSegundos || 4) * 1000, 1500)

    const timer = setTimeout(() => {
      setIndiceAnterior(indiceActual)
      setIndiceActual((prev) => (prev + 1) % lista.length)
    }, duracionMs)

    return () => clearTimeout(timer)
  }, [indiceActual, lista, pausado])

  // Reproducir solo el video activo y pausar los demás para ahorrar batería y CPU
  useEffect(() => {
    Object.entries(videoRefs.current).forEach(([idxStr, el]) => {
      if (!el) return
      const idx = Number(idxStr)
      if (idx === indiceActual && !pausado) {
        el.currentTime = 0
        el.play().catch(() => undefined)
      } else {
        el.pause()
      }
    })
  }, [indiceActual, pausado, lista])

  useEffect(() => {
    if (indiceAnterior !== null) {
      const clearTimer = setTimeout(() => {
        setIndiceAnterior(null)
      }, 750)
      return () => clearTimeout(clearTimer)
    }
  }, [indiceAnterior])

  const obtenerClasesTransicion = (idx: number) => {
    const esActiva = idx === indiceActual
    const esSaliendo = idx === indiceAnterior

    switch (transicion) {
      case 'slide_left':
        if (esActiva) return 'translate-x-0 opacity-100 z-10 transition-all duration-700 ease-out'
        if (esSaliendo) return '-translate-x-full opacity-0 z-0 transition-all duration-700 ease-out'
        return 'translate-x-full opacity-0 z-0 pointer-events-none transition-none'

      case 'slide_up':
        if (esActiva) return 'translate-y-0 opacity-100 z-10 transition-all duration-700 ease-out'
        if (esSaliendo) return '-translate-y-full opacity-0 z-0 transition-all duration-700 ease-out'
        return 'translate-y-full opacity-0 z-0 pointer-events-none transition-none'

      case 'zoom':
        if (esActiva) return 'scale-100 opacity-100 z-10 transition-all duration-700 ease-out'
        if (esSaliendo) return 'scale-110 opacity-0 z-0 transition-all duration-700 ease-out'
        return 'scale-90 opacity-0 z-0 pointer-events-none transition-none'

      case 'flip':
        if (esActiva) return '[transform:rotateY(0deg)] opacity-100 z-10 transition-all duration-700 ease-out'
        if (esSaliendo) return '[transform:rotateY(90deg)] opacity-0 z-0 transition-all duration-700 ease-out'
        return '[transform:rotateY(-90deg)] opacity-0 z-0 pointer-events-none transition-none'

      case 'blur':
        if (esActiva) return 'blur-0 scale-100 opacity-100 z-10 transition-all duration-700 ease-out'
        if (esSaliendo) return 'blur-md scale-105 opacity-0 z-0 transition-all duration-700 ease-out'
        return 'blur-md scale-95 opacity-0 z-0 pointer-events-none transition-none'

      case 'fade':
      default:
        if (esActiva) return 'opacity-100 z-10 transition-opacity duration-700 ease-in-out'
        return 'opacity-0 z-0 pointer-events-none transition-opacity duration-700 ease-in-out'
    }
  }

  return (
    <div className={`relative select-none ${className}`}>
      {/* Marco proporción 9:16 adaptado para celular, iPad y PC */}
      <div className="relative w-[210px] xs:w-[230px] sm:w-[270px] md:w-[310px] lg:w-[350px] xl:w-[390px] 2xl:w-[420px] aspect-[9/16] rounded-3xl overflow-hidden bg-black/60 border border-white/15 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] ring-1 ring-white/10 [perspective:1000px]">
        {/* Barras de progreso estilo Historias */}
        {lista.length > 1 && (
          <div className="absolute top-3 inset-x-3 z-30 flex gap-1.5 pointer-events-none">
            {lista.map((_, i) => (
              <div
                key={i}
                className="h-1 rounded-full flex-1 overflow-hidden bg-white/25"
              >
                <div
                  className={`h-full transition-all duration-300 ${
                    i === indiceActual
                      ? 'w-full bg-white shadow-[0_0_8px_rgba(255,255,255,1)]'
                      : i < indiceActual
                        ? 'w-full bg-white/70'
                        : 'w-0'
                  }`}
                />
              </div>
            ))}
          </div>
        )}

        {/* Control accesible para pausar o reanudar las historias/videos (WCAG 2.2.2) */}
        {lista.length > 1 && (
          <button
            type="button"
            onClick={() => setPausado((p) => !p)}
            aria-label={pausado ? 'Reanudar historias' : 'Pausar historias'}
            className="absolute bottom-3 right-3 z-30 w-8 h-8 rounded-full bg-black/55 hover:bg-black/75 border border-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            {pausado ? <Play size={13} className="translate-x-[1px]" /> : <Pause size={13} />}
          </button>
        )}

        {lista.map((item, idx) => {
          const esVideo = esUrlVideo(item.url)
          return (
            <div
              key={item.id || `${item.url}-${idx}`}
              className={`absolute inset-0 ${obtenerClasesTransicion(idx)}`}
            >
              {esVideo ? (
                <video
                  ref={(el) => {
                    videoRefs.current[idx] = el
                  }}
                  src={item.url}
                  muted
                  loop
                  playsInline
                  preload={idx <= 1 ? 'auto' : 'metadata'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <img
                  src={item.url}
                  alt="Plato Chefsy"
                  loading={idx === 0 ? 'eager' : 'lazy'}
                  decoding={idx === 0 ? 'sync' : 'async'}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
