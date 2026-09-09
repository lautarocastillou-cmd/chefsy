'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { RotateCcw, ImageOff } from 'lucide-react'
import { optimizarUrlImagen, generarBlurUrl, esConexionLenta } from '@/lib/utils'

interface ImagenProgresivaProps {
  src: string
  alt: string
  anchoDeseado?: number
  priority?: boolean
  className?: string
  sizes?: string
  objectFit?: 'cover' | 'contain'
  onLoadSuccess?: () => void
}

export default function ImagenProgresiva({
  src,
  alt,
  anchoDeseado = 800,
  priority = false,
  className = '',
  sizes = '100vw',
  objectFit = 'cover',
  onLoadSuccess,
}: ImagenProgresivaProps) {
  const [cargada, setCargada] = useState(false)
  const [error, setError] = useState(false)
  const [reintentos, setReintentos] = useState(0)
  const [esLenta, setEsLenta] = useState(false)

  useEffect(() => {
    setEsLenta(esConexionLenta())
  }, [])

  // Reset al cambiar de src
  useEffect(() => {
    setCargada(false)
    setError(false)
  }, [src, reintentos])

  if (!src) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#181818] text-neutral-500">
        <ImageOff size={24} className="mb-1 opacity-50" />
        <span className="text-[10px] font-bold">Sin imagen</span>
      </div>
    )
  }

  const urlBlur = generarBlurUrl(src)
  const anchoFinal = esLenta ? Math.min(anchoDeseado, 450) : anchoDeseado
  const urlFinal = optimizarUrlImagen(src, anchoFinal, esLenta)
  const isCdn = src.includes('res.cloudinary.com') || src.includes('supabase.co') || src.includes('unsplash.com') || src.includes('lh3.googleusercontent.com')

  const fitClass = objectFit === 'contain' ? 'object-contain' : 'object-cover'

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#161616]">
      {/* ── 1. Miniatura Blur-Up ultraliviana (< 1 KB) ── */}
      {!cargada && !error && urlBlur && (
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <Image
            src={urlBlur}
            alt=""
            fill
            unoptimized
            aria-hidden
            className={`${fitClass} scale-110 filter blur-md opacity-75`}
          />
          {/* Shimmer suave */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse" />
        </div>
      )}

      {/* ── 2. Imagen Principal en Alta Definición ── */}
      {!error && (
        <Image
          key={`${urlFinal}-${reintentos}`}
          src={urlFinal}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          unoptimized={isCdn}
          onLoad={() => {
            setCargada(true)
            onLoadSuccess?.()
          }}
          onError={() => setError(true)}
          className={`relative z-[1] ${fitClass} transition-opacity duration-300 ${
            cargada ? 'opacity-100' : 'opacity-0'
          } ${className}`}
        />
      )}

      {/* ── 3. Estado de Error con Reintento ── */}
      {error && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-3 bg-[#181818] text-center">
          <ImageOff size={22} className="text-neutral-500 mb-1.5" />
          <p className="text-[11px] font-bold text-neutral-400 mb-2">
            No se pudo cargar la imagen
          </p>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setError(false)
              setReintentos(r => r + 1)
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#252525] hover:bg-[#303030] text-chefsy-400 text-xs font-bold border border-white/10 transition-all active:scale-95 cursor-pointer shadow-md"
          >
            <RotateCcw size={13} />
            <span>Reintentar</span>
          </button>
        </div>
      )}

      {/* ── 4. Indicador sutil de conexión lenta mientras descarga ── */}
      {esLenta && !cargada && !error && (
        <div className="absolute bottom-2 left-2 z-20 px-2 py-0.5 rounded bg-black/75 border border-white/10 text-[9px] font-bold text-chefsy-300 pointer-events-none">
          Optimizando para red móvil...
        </div>
      )}
    </div>
  )
}
