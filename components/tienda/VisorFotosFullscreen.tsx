'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'
import { optimizarUrlImagen } from '@/lib/utils'

interface VisorFotosFullscreenProps {
  fotos: string[]
  indiceInicial?: number
  nombreProducto: string
  abierto: boolean
  onCerrar: () => void
}

export default function VisorFotosFullscreen({
  fotos,
  indiceInicial = 0,
  nombreProducto,
  abierto,
  onCerrar,
}: VisorFotosFullscreenProps) {
  const [montado, setMontado] = useState(false)
  const [indiceActivo, setIndiceActivo] = useState(indiceInicial)
  const [zoom, setZoom] = useState(1)
  const [posicion, setPosicion] = useState({ x: 0, y: 0 })
  const [arrastrando, setArrastrando] = useState(false)
  const arrastreInicioRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 })
  const touchInicioRef = useRef<{ x: number; y: number; time: number } | null>(null)
  const pinchDistInicioRef = useRef<number | null>(null)
  const pinchZoomInicioRef = useRef<number>(1)
  const ultimoTapRef = useRef<number>(0)
  const contenedorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMontado(true)
  }, [])

  // Sincronizar índice inicial cuando se abre
  useEffect(() => {
    if (abierto) {
      setIndiceActivo(Math.min(Math.max(0, indiceInicial), fotos.length - 1))
      setZoom(1)
      setPosicion({ x: 0, y: 0 })
    }
  }, [abierto, indiceInicial, fotos.length])

  // Reset zoom al cambiar de foto
  const cambiarFoto = useCallback((nuevoIndice: number) => {
    setIndiceActivo(nuevoIndice)
    setZoom(1)
    setPosicion({ x: 0, y: 0 })
  }, [])

  const fotoAnterior = useCallback(() => {
    if (fotos.length <= 1) return
    cambiarFoto((indiceActivo - 1 + fotos.length) % fotos.length)
  }, [indiceActivo, fotos.length, cambiarFoto])

  const fotoSiguiente = useCallback(() => {
    if (fotos.length <= 1) return
    cambiarFoto((indiceActivo + 1) % fotos.length)
  }, [indiceActivo, fotos.length, cambiarFoto])

  // Atajos de teclado y bloqueo de scroll
  useEffect(() => {
    if (!abierto) return

    const manejarKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCerrar()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        fotoAnterior()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        fotoSiguiente()
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault()
        setZoom(z => Math.min(3.5, Number((z + 0.5).toFixed(2))))
      } else if (e.key === '-') {
        e.preventDefault()
        setZoom(z => {
          const nuevo = Math.max(1, Number((z - 0.5).toFixed(2)))
          if (nuevo === 1) setPosicion({ x: 0, y: 0 })
          return nuevo
        })
      } else if (e.key === '0') {
        e.preventDefault()
        setZoom(1)
        setPosicion({ x: 0, y: 0 })
      }
    }

    window.addEventListener('keydown', manejarKeyDown)

    // Manejar historial en móviles para que el botón "Atrás" de Android cierre primero este lightbox
    window.history.pushState({ visorFullscreen: true }, '', window.location.href)
    const manejarPopState = () => {
      onCerrar()
    }
    window.addEventListener('popstate', manejarPopState)

    return () => {
      window.removeEventListener('keydown', manejarKeyDown)
      window.removeEventListener('popstate', manejarPopState)
      if (window.history.state?.visorFullscreen) {
        window.history.back()
      }
    }
  }, [abierto, fotoAnterior, fotoSiguiente, onCerrar])

  // Manejo de rueda de ratón para zoom
  const manejarWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const delta = e.deltaY > 0 ? -0.25 : 0.25
    setZoom(z => {
      const nuevo = Math.min(3.5, Math.max(1, Number((z + delta).toFixed(2))))
      if (nuevo === 1) setPosicion({ x: 0, y: 0 })
      return nuevo
    })
  }

  // Doble clic o doble tap para toggle zoom (1x <-> 2.2x)
  const manejarDobleTap = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation()
    if (zoom > 1.2) {
      setZoom(1)
      setPosicion({ x: 0, y: 0 })
    } else {
      setZoom(2.2)
    }
  }

  // Mouse Drag / Pan cuando zoom > 1
  const onMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return
    e.preventDefault()
    setArrastrando(true)
    arrastreInicioRef.current = {
      x: e.clientX,
      y: e.clientY,
      posX: posicion.x,
      posY: posicion.y,
    }
  }

  const onMouseMove = (e: React.MouseEvent) => {
    if (!arrastrando || zoom <= 1) return
    const dx = e.clientX - arrastreInicioRef.current.x
    const dy = e.clientY - arrastreInicioRef.current.y
    const limiteX = (zoom - 1) * 250
    const limiteY = (zoom - 1) * 250
    setPosicion({
      x: Math.min(limiteX, Math.max(-limiteX, arrastreInicioRef.current.posX + dx)),
      y: Math.min(limiteY, Math.max(-limiteY, arrastreInicioRef.current.posY + dy)),
    })
  }

  const onMouseUp = () => {
    setArrastrando(false)
  }

  // Touch handlers: Swipe (cuando zoom=1), Pinch to zoom, y Pan (cuando zoom>1)
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Iniciar Pinch
      const t1 = e.touches[0]
      const t2 = e.touches[1]
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY)
      pinchDistInicioRef.current = dist
      pinchZoomInicioRef.current = zoom
      return
    }

    if (e.touches.length === 1) {
      const touch = e.touches[0]
      const ahora = Date.now()

      // Detección de doble tap
      if (ahora - ultimoTapRef.current < 300) {
        manejarDobleTap(e)
        ultimoTapRef.current = 0
        return
      }
      ultimoTapRef.current = ahora

      touchInicioRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: ahora,
      }

      if (zoom > 1) {
        setArrastrando(true)
        arrastreInicioRef.current = {
          x: touch.clientX,
          y: touch.clientY,
          posX: posicion.x,
          posY: posicion.y,
        }
      }
    }
  }

  const onTouchMove = (e: React.TouchEvent) => {
    // Pinch to zoom
    if (e.touches.length === 2 && pinchDistInicioRef.current !== null) {
      const t1 = e.touches[0]
      const t2 = e.touches[1]
      const distActual = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY)
      const ratio = distActual / pinchDistInicioRef.current
      const nuevoZoom = Math.min(3.5, Math.max(1, Number((pinchZoomInicioRef.current * ratio).toFixed(2))))
      setZoom(nuevoZoom)
      if (nuevoZoom === 1) setPosicion({ x: 0, y: 0 })
      return
    }

    // Drag / Pan con zoom > 1
    if (e.touches.length === 1 && zoom > 1 && arrastrando) {
      const touch = e.touches[0]
      const dx = touch.clientX - arrastreInicioRef.current.x
      const dy = touch.clientY - arrastreInicioRef.current.y
      const limiteX = (zoom - 1) * 250
      const limiteY = (zoom - 1) * 250
      setPosicion({
        x: Math.min(limiteX, Math.max(-limiteX, arrastreInicioRef.current.posX + dx)),
        y: Math.min(limiteY, Math.max(-limiteY, arrastreInicioRef.current.posY + dy)),
      })
    }
  }

  const onTouchEnd = (e: React.TouchEvent) => {
    pinchDistInicioRef.current = null
    setArrastrando(false)

    // Si estaba en zoom 1, evaluar swipe horizontal para cambiar foto o swipe vertical abajo para cerrar
    if (zoom === 1 && touchInicioRef.current && e.changedTouches.length === 1) {
      const touch = e.changedTouches[0]
      const deltaX = touch.clientX - touchInicioRef.current.x
      const deltaY = touch.clientY - touchInicioRef.current.y
      const deltaTime = Date.now() - touchInicioRef.current.time

      // Deslizar abajo rápido para cerrar
      if (deltaY > 100 && Math.abs(deltaX) < 80 && deltaTime < 400) {
        onCerrar()
        return
      }

      // Deslizar horizontal para cambiar foto
      if (Math.abs(deltaX) > 60 && Math.abs(deltaY) < 60 && deltaTime < 500) {
        if (deltaX < 0) {
          fotoSiguiente()
        } else {
          fotoAnterior()
        }
      }
    }
    touchInicioRef.current = null
  }

  if (!montado || !abierto || fotos.length === 0) return null

  const fotoActual = fotos[indiceActivo] || fotos[0]
  const fotoOptimizada = optimizarUrlImagen(fotoActual, 1600)
  const isCdn = fotoActual.includes('res.cloudinary.com') || fotoActual.includes('supabase.co') || fotoActual.includes('unsplash.com') || fotoActual.includes('lh3.googleusercontent.com')

  return createPortal(
    <div
      ref={contenedorRef}
      className="fixed inset-0 z-[100000] flex flex-col justify-between bg-black/95 backdrop-blur-xl select-none animate-in fade-in duration-200"
      onWheel={manejarWheel}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
    >
      {/* ── BARRA SUPERIOR ── */}
      <div className="relative z-50 flex items-center justify-between px-4 sm:px-6 py-3.5 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
        <div className="flex items-center gap-3 max-w-[70%]">
          <div className="w-2 h-2 rounded-full bg-chefsy-400 animate-pulse shrink-0" />
          <div className="truncate">
            <h4 className="font-bebas text-lg sm:text-xl text-white tracking-wide truncate drop-shadow">
              {nombreProducto}
            </h4>
            <p className="text-[11px] font-semibold text-slate-400">
              {fotos.length > 1 ? `Foto ${indiceActivo + 1} de ${fotos.length}` : 'Vista en alta definición'}
            </p>
          </div>
        </div>

        {/* Acciones superiores: Zoom Reset & Cerrar */}
        <div className="flex items-center gap-2">
          {zoom > 1 && (
            <button
              type="button"
              onClick={() => {
                setZoom(1)
                setPosicion({ x: 0, y: 0 })
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/10 backdrop-blur-md transition-all active:scale-95 cursor-pointer"
              title="Restablecer zoom"
            >
              <RotateCcw size={13} />
              <span>{Math.round(zoom * 100)}%</span>
            </button>
          )}

          <button
            type="button"
            onClick={onCerrar}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center border border-white/15 backdrop-blur-md transition-all active:scale-90 shadow-xl cursor-pointer"
            aria-label="Cerrar visor"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* ── ÁREA CENTRAL DE IMAGEN ── */}
      <div 
        className="relative flex-1 w-full flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing"
        onDoubleClick={manejarDobleTap}
      >
        <div
          className="relative w-full h-full max-w-5xl max-h-[85vh] flex items-center justify-center transition-transform duration-75 will-change-transform"
          style={{
            transform: `scale(${zoom}) translate(${posicion.x / zoom}px, ${posicion.y / zoom}px)`,
            touchAction: zoom > 1 ? 'none' : 'pan-y',
          }}
        >
          <Image
            src={fotoOptimizada}
            alt={`${nombreProducto} - Foto ${indiceActivo + 1}`}
            fill
            unoptimized={isCdn}
            priority
            className="object-contain pointer-events-none drop-shadow-2xl"
            sizes="(max-width: 768px) 100vw, 1200px"
          />
        </div>

        {/* Flechas de navegación (Desktop & Tablets) */}
        {fotos.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                fotoAnterior()
              }}
              className="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 z-40 w-12 h-12 rounded-full bg-black/60 hover:bg-black/85 text-white items-center justify-center border border-white/20 backdrop-blur-md transition-all hover:scale-110 active:scale-95 shadow-2xl cursor-pointer"
              aria-label="Foto anterior"
            >
              <ChevronLeft size={28} />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                fotoSiguiente()
              }}
              className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 z-40 w-12 h-12 rounded-full bg-black/60 hover:bg-black/85 text-white items-center justify-center border border-white/20 backdrop-blur-md transition-all hover:scale-110 active:scale-95 shadow-2xl cursor-pointer"
              aria-label="Foto siguiente"
            >
              <ChevronRight size={28} />
            </button>
          </>
        )}
      </div>

      {/* ── BARRA INFERIOR / MINIATURAS Y CONTROLES DE ZOOM ── */}
      <div className="relative z-50 flex flex-col items-center gap-3 px-4 py-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
        {/* Controles de Zoom Flotantes */}
        <div className="flex items-center gap-2 bg-black/60 border border-white/15 px-3 py-1.5 rounded-full backdrop-blur-md shadow-lg">
          <button
            type="button"
            onClick={() => {
              setZoom(z => {
                const nuevo = Math.max(1, Number((z - 0.4).toFixed(2)))
                if (nuevo === 1) setPosicion({ x: 0, y: 0 })
                return nuevo
              })
            }}
            disabled={zoom <= 1}
            className="w-7 h-7 rounded-full flex items-center justify-center text-white/80 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            title="Alejar (-)"
          >
            <ZoomOut size={16} />
          </button>

          <span className="text-[11px] font-bold text-white px-1.5 min-w-[3rem] text-center">
            {Math.round(zoom * 100)}%
          </span>

          <button
            type="button"
            onClick={() => setZoom(z => Math.min(3.5, Number((z + 0.4).toFixed(2))))}
            disabled={zoom >= 3.5}
            className="w-7 h-7 rounded-full flex items-center justify-center text-white/80 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            title="Acercar (+)"
          >
            <ZoomIn size={16} />
          </button>
        </div>

        {/* Miniaturas en carrusel horizontal si hay más de 1 foto */}
        {fotos.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto max-w-full px-2 py-1 scrollbar-hide">
            {fotos.map((foto, idx) => {
              const miniUrl = optimizarUrlImagen(foto, 150)
              const seleccionada = idx === indiceActivo
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => cambiarFoto(idx)}
                  className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer active:scale-95 ${
                    seleccionada
                      ? 'border-chefsy-400 ring-2 ring-chefsy-400/50 scale-105 shadow-md shadow-chefsy-500/20'
                      : 'border-white/20 opacity-50 hover:opacity-100 hover:border-white/50'
                  }`}
                >
                  <Image
                    src={miniUrl}
                    alt={`Miniatura ${idx + 1}`}
                    fill
                    unoptimized={miniUrl.includes('res.cloudinary.com')}
                    className="object-cover"
                  />
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
