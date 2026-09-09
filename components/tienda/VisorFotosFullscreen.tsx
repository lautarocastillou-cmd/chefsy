'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'
import { optimizarUrlImagen, esConexionLenta } from '@/lib/utils'
import ImagenProgresiva from './ImagenProgresiva'
import { esFotoVista, registrarFotoVista } from '@/lib/visorCache'

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

  const trackRef = useRef<HTMLDivElement>(null)
  const touchInicioRef = useRef<{ x: number; y: number; time: number } | null>(null)
  const dragOffsetRef = useRef<number>(0)
  const isDraggingRef = useRef<boolean>(false)
  const rafDragRef = useRef<number>(0)

  const arrastreRef = useRef({
    activo: false,
    startX: 0,
    startY: 0,
    posX: 0,
    posY: 0,
    rafId: 0,
  })

  const ultimoTapRef = useRef<number>(0)
  const pinchDistInicioRef = useRef<number | null>(null)
  const pinchZoomInicioRef = useRef<number>(1)
  const onCerrarRef = useRef(onCerrar)

  useEffect(() => {
    onCerrarRef.current = onCerrar
  }, [onCerrar])

  useEffect(() => {
    setMontado(true)
  }, [])

  // Cambiar foto con animación fluida en el track GPU
  const cambiarFoto = useCallback((nuevoIndice: number) => {
    const idxValido = Math.min(Math.max(0, nuevoIndice), Math.max(0, fotos.length - 1))
    setIndiceActivo(idxValido)
    setZoom(1)
    setPosicion({ x: 0, y: 0 })
    if (trackRef.current) {
      trackRef.current.style.transition = 'transform 0.28s cubic-bezier(0.22, 1, 0.36, 1)'
      trackRef.current.style.transform = `translate3d(-${idxValido * 100}%, 0, 0)`
    }
  }, [fotos.length])

  // Sincronizar índice inicial cuando se abre
  useEffect(() => {
    if (abierto) {
      const idx = Math.min(Math.max(0, indiceInicial), Math.max(0, fotos.length - 1))
      setIndiceActivo(idx)
      setZoom(1)
      setPosicion({ x: 0, y: 0 })
      if (trackRef.current) {
        trackRef.current.style.transition = 'none'
        trackRef.current.style.transform = `translate3d(-${idx * 100}%, 0, 0)`
      }
    }
  }, [abierto, indiceInicial, fotos.length])

  const fotoAnterior = useCallback(() => {
    if (fotos.length <= 1) return
    cambiarFoto((indiceActivo - 1 + fotos.length) % fotos.length)
  }, [indiceActivo, fotos.length, cambiarFoto])

  const fotoSiguiente = useCallback(() => {
    if (fotos.length <= 1) return
    cambiarFoto((indiceActivo + 1) % fotos.length)
  }, [indiceActivo, fotos.length, cambiarFoto])

  const fotoAnteriorRef = useRef(fotoAnterior)
  const fotoSiguienteRef = useRef(fotoSiguiente)
  useEffect(() => {
    fotoAnteriorRef.current = fotoAnterior
    fotoSiguienteRef.current = fotoSiguiente
  }, [fotoAnterior, fotoSiguiente])

  // Atajos de teclado (Esc, Flechas, +, -, 0)
  useEffect(() => {
    if (!abierto) return

    const manejarKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onCerrarRef.current()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        fotoAnteriorRef.current()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        fotoSiguienteRef.current()
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
    return () => {
      window.removeEventListener('keydown', manejarKeyDown)
    }
  }, [abierto])

  // Manejo de rueda de ratón con requestAnimationFrame
  const wheelRafRef = useRef<number>(0)
  const manejarWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const delta = e.deltaY > 0 ? -0.3 : 0.3

    if (wheelRafRef.current) cancelAnimationFrame(wheelRafRef.current)
    wheelRafRef.current = requestAnimationFrame(() => {
      setZoom(z => {
        const nuevo = Math.min(3.5, Math.max(1, Number((z + delta).toFixed(2))))
        if (nuevo === 1) setPosicion({ x: 0, y: 0 })
        return nuevo
      })
    })
  }, [])

  // Doble clic o doble tap para toggle zoom (1x <-> 2.2x)
  const manejarDobleTap = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation()
    setZoom(z => {
      if (z > 1.2) {
        setPosicion({ x: 0, y: 0 })
        return 1
      }
      return 2.2
    })
  }, [])

  // Drag / Pan ultra-optimizado con puntero
  const onPointerDown = (e: React.PointerEvent) => {
    if (zoom <= 1) return
    e.preventDefault()
    setArrastrando(true)
    arrastreRef.current = {
      activo: true,
      startX: e.clientX,
      startY: e.clientY,
      posX: posicion.x,
      posY: posicion.y,
      rafId: 0,
    }
  }

  useEffect(() => {
    if (!arrastrando) return

    const onPointerMove = (e: PointerEvent) => {
      if (!arrastreRef.current.activo || zoom <= 1) return
      const dx = e.clientX - arrastreRef.current.startX
      const dy = e.clientY - arrastreRef.current.startY
      const limiteX = (zoom - 1) * 280
      const limiteY = (zoom - 1) * 280

      if (arrastreRef.current.rafId) cancelAnimationFrame(arrastreRef.current.rafId)
      arrastreRef.current.rafId = requestAnimationFrame(() => {
        setPosicion({
          x: Math.min(limiteX, Math.max(-limiteX, arrastreRef.current.posX + dx)),
          y: Math.min(limiteY, Math.max(-limiteY, arrastreRef.current.posY + dy)),
        })
      })
    }

    const onPointerUp = () => {
      arrastreRef.current.activo = false
      setArrastrando(false)
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)

    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
    }
  }, [arrastrando, zoom])

  // Gestos táctiles en móvil (Swipe fluido & Pinch-to-zoom)
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const t1 = e.touches[0]
      const t2 = e.touches[1]
      pinchDistInicioRef.current = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY)
      pinchZoomInicioRef.current = zoom
      return
    }

    if (e.touches.length === 1) {
      const touch = e.touches[0]
      const ahora = Date.now()

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
      dragOffsetRef.current = 0
      isDraggingRef.current = true

      if (zoom === 1 && trackRef.current) {
        trackRef.current.style.transition = 'none'
      }
    }
  }

  const onTouchMove = (e: React.TouchEvent) => {
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

    if (e.touches.length === 1 && zoom === 1 && touchInicioRef.current && isDraggingRef.current && fotos.length > 1) {
      const touch = e.touches[0]
      const dx = touch.clientX - touchInicioRef.current.x
      const dy = touch.clientY - touchInicioRef.current.y

      // Si el desplazamiento es predominantemente horizontal, seguimos el dedo 1:1 en tiempo real
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 6) {
        let finalDx = dx
        // Resistencia elástica en los extremos
        if ((indiceActivo === 0 && dx > 0) || (indiceActivo === fotos.length - 1 && dx < 0)) {
          finalDx = dx * 0.25
        }
        dragOffsetRef.current = finalDx

        if (rafDragRef.current) cancelAnimationFrame(rafDragRef.current)
        rafDragRef.current = requestAnimationFrame(() => {
          if (trackRef.current) {
            trackRef.current.style.transform = `translate3d(calc(-${indiceActivo * 100}% + ${finalDx}px), 0, 0)`
          }
        })
      }
    }
  }

  const onTouchEnd = (e: React.TouchEvent) => {
    pinchDistInicioRef.current = null
    isDraggingRef.current = false

    if (zoom === 1 && touchInicioRef.current && e.changedTouches.length === 1) {
      const touch = e.changedTouches[0]
      const dx = dragOffsetRef.current || (touch.clientX - touchInicioRef.current.x)
      const dy = touch.clientY - touchInicioRef.current.y
      const deltaTime = Date.now() - touchInicioRef.current.time

      // Swipe down rápido para cerrar el visor
      if (dy > 110 && Math.abs(dx) < 60 && deltaTime < 400) {
        onCerrarRef.current()
        touchInicioRef.current = null
        return
      }

      // Swipe horizontal fluido
      if (fotos.length > 1) {
        const threshold = 45
        const isFlick = deltaTime < 350 && Math.abs(dx) > 25
        let nuevoIndice = indiceActivo

        if ((dx < -threshold || (isFlick && dx < 0)) && indiceActivo < fotos.length - 1) {
          nuevoIndice = indiceActivo + 1
        } else if ((dx > threshold || (isFlick && dx > 0)) && indiceActivo > 0) {
          nuevoIndice = indiceActivo - 1
        }

        cambiarFoto(nuevoIndice)
      }
    }

    touchInicioRef.current = null
    dragOffsetRef.current = 0
  }

  if (!montado || !abierto || fotos.length === 0) return null

  const fotoActual = fotos[indiceActivo] || fotos[0]

  return createPortal(
    <div
      className="fixed inset-0 z-[100000] w-screen h-[100dvh] flex flex-col justify-between bg-[#0a0a0a] select-none animate-in fade-in duration-150 pointer-events-auto"
      onClick={(e) => {
        e.stopPropagation()
        if (e.target === e.currentTarget && zoom === 1) {
          onCerrarRef.current()
        }
      }}
      onWheel={manejarWheel}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* ── BARRA SUPERIOR ── */}
      <div 
        className="relative z-50 flex items-center justify-between px-4 sm:px-6 py-3 bg-[#111] border-b border-white/5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 max-w-[70%]">
          <div className="w-2 h-2 rounded-full bg-chefsy-400 shrink-0" />
          <div className="truncate">
            <h4 className="font-bebas text-lg sm:text-xl text-white tracking-wide truncate">
              {nombreProducto}
            </h4>
            <p className="text-[11px] font-semibold text-neutral-400">
              {fotos.length > 1 ? `Foto ${indiceActivo + 1} de ${fotos.length}` : 'Alta definición'}
            </p>
          </div>
        </div>

        {/* Acciones superiores: Zoom Reset & Cerrar */}
        <div className="flex items-center gap-2">
          {zoom > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setZoom(1)
                setPosicion({ x: 0, y: 0 })
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#222] hover:bg-[#333] text-white text-xs font-bold border border-white/10 transition-colors active:scale-95 cursor-pointer"
              title="Restablecer zoom"
            >
              <RotateCcw size={13} />
              <span>{Math.round(zoom * 100)}%</span>
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onCerrarRef.current()
            }}
            className="w-10 h-10 rounded-full bg-[#222] hover:bg-[#333] text-white flex items-center justify-center border border-white/10 transition-colors active:scale-90 shadow-lg cursor-pointer"
            aria-label="Cerrar visor"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* ── ÁREA CENTRAL DE IMAGEN CON MARCO MEDIO OSCURO ── */}
      <div 
        className={`relative flex-1 w-full flex items-center justify-center p-0 sm:p-6 overflow-hidden ${
          zoom > 1 ? (arrastrando ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'
        }`}
        onDoubleClick={manejarDobleTap}
        onPointerDown={onPointerDown}
        onClick={(e) => {
          if (e.target === e.currentTarget && zoom === 1) {
            onCerrarRef.current()
          }
        }}
      >
        {/* Fondo medio oscuro que delimita y resalta la comida: cubre toda la pantalla en móvil y marco en PC */}
        <div
          className="relative w-full h-full sm:max-w-4xl sm:h-[75vh] sm:max-h-[750px] flex items-center justify-center rounded-none sm:rounded-3xl bg-[#141414] sm:bg-[#171717] border-0 sm:border sm:border-[#2b2b2b] shadow-none sm:shadow-2xl overflow-hidden will-change-transform"
          style={{
            transform: `translate3d(${posicion.x}px, ${posicion.y}px, 0) scale(${zoom})`,
            transition: arrastrando ? 'none' : 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
            touchAction: zoom > 1 ? 'none' : 'pan-y',
          }}
        >
          {/* Pista deslizante horizontal fluida con aceleración por hardware */}
          <div
            ref={trackRef}
            className="flex w-full h-full will-change-transform"
            style={{
              transform: `translate3d(-${indiceActivo * 100}%, 0, 0)`,
              transition: 'transform 0.28s cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          >
            {fotos.map((url, idx) => {
              const esActiva = idx === indiceActivo
              const yaFueVista = esFotoVista(url)
              // Regla estricta: solo carga la activa o las que el usuario ya vio previamente en el visor.
              // Las fotos no vistas NO descargan datos hasta que el usuario se desplace a ellas.
              const debeCargar = esActiva || yaFueVista

              return (
                <div
                  key={idx}
                  className="relative w-full h-full shrink-0 flex items-center justify-center p-2 sm:p-4"
                  style={{ width: '100%', height: '100%' }}
                >
                  {debeCargar ? (
                    <ImagenProgresiva
                      src={url}
                      alt={`${nombreProducto} - Foto ${idx + 1}`}
                      anchoDeseado={1100}
                      priority={esActiva || yaFueVista}
                      objectFit="contain"
                      sizes="(max-width: 768px) 95vw, 1000px"
                      onLoadSuccess={() => registrarFotoVista(url)}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#141414]">
                      <span className="w-2.5 h-2.5 rounded-full bg-white/10" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Puntos indicadores de foto actual (•••) en la parte inferior de la imagen */}
          {fotos.length > 1 && (
            <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/75 border border-white/10 shadow-xl pointer-events-auto">
              {fotos.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    cambiarFoto(i)
                  }}
                  className={`rounded-full transition-all duration-300 cursor-pointer ${
                    i === indiceActivo
                      ? 'w-5 h-1.5 bg-chefsy-400 shadow-sm shadow-chefsy-400/50'
                      : 'w-1.5 h-1.5 bg-white/35 hover:bg-white/65'
                  }`}
                  aria-label={`Ir a foto ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Flechas de navegación flotantes (Desktop) */}
        {fotos.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                fotoAnterior()
              }}
              className="hidden sm:flex absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 z-40 w-11 h-11 rounded-full bg-[#181818]/90 hover:bg-[#252525] text-white items-center justify-center border border-white/15 transition-transform hover:scale-105 active:scale-95 shadow-xl cursor-pointer"
              aria-label="Foto anterior"
            >
              <ChevronLeft size={24} />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                fotoSiguiente()
              }}
              className="hidden sm:flex absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 z-40 w-11 h-11 rounded-full bg-[#181818]/90 hover:bg-[#252525] text-white items-center justify-center border border-white/15 transition-transform hover:scale-105 active:scale-95 shadow-xl cursor-pointer"
              aria-label="Foto siguiente"
            >
              <ChevronRight size={24} />
            </button>
          </>
        )}
      </div>

      {/* ── BARRA INFERIOR / MINIATURAS Y CONTROLES DE ZOOM ── */}
      <div 
        className="relative z-50 flex flex-col items-center gap-3 px-4 py-3 bg-[#111]/90 border-t border-white/5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Controles de Zoom Flotantes */}
        <div className="flex items-center gap-1.5 bg-[#1a1a1a] border border-white/10 px-3 py-1 rounded-full shadow-md">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setZoom(z => {
                const nuevo = Math.max(1, Number((z - 0.4).toFixed(2)))
                if (nuevo === 1) setPosicion({ x: 0, y: 0 })
                return nuevo
              })
            }}
            disabled={zoom <= 1}
            className="w-7 h-7 rounded-full flex items-center justify-center text-neutral-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            title="Alejar (-)"
          >
            <ZoomOut size={15} />
          </button>

          <span className="text-[11px] font-bold text-white px-2 min-w-[3rem] text-center font-mono">
            {Math.round(zoom * 100)}%
          </span>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setZoom(z => Math.min(3.5, Number((z + 0.4).toFixed(2))))
            }}
            disabled={zoom >= 3.5}
            className="w-7 h-7 rounded-full flex items-center justify-center text-neutral-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            title="Acercar (+)"
          >
            <ZoomIn size={15} />
          </button>
        </div>

        {/* Miniaturas en carrusel horizontal si hay más de 1 foto */}
        {fotos.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto max-w-full px-2 py-0.5 scrollbar-hide">
            {fotos.map((foto, idx) => {
              const miniUrl = optimizarUrlImagen(foto, 120, true)
              const seleccionada = idx === indiceActivo
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    cambiarFoto(idx)
                  }}
                  className={`relative w-11 h-11 sm:w-12 sm:h-12 rounded-lg overflow-hidden border-2 transition-transform shrink-0 cursor-pointer active:scale-95 ${
                    seleccionada
                      ? 'border-chefsy-400 scale-105 shadow-md shadow-chefsy-500/20'
                      : 'border-white/10 opacity-50 hover:opacity-100'
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
