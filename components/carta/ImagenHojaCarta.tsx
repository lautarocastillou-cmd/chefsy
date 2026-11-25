'use client'

import React, { useEffect, useRef, useState } from 'react'
import { ImageOff, Loader2, RefreshCw } from 'lucide-react'
import type { HojaCarta } from '@/lib/carta-digital'

interface PropsImagenHojaCarta {
  hoja: HojaCarta
  alt: string
  esLcp: boolean
  numeroHoja: number
}

const MAX_REINTENTOS_AUTO = 2
const DEMORAS_REINTENTO_MS = [1200, 2500]

function agregarParametroReintento(url: string, intento: number): string {
  if (intento <= 0) return url
  const separador = url.includes('?') ? '&' : '?'
  return `${url}${separador}r=${intento}`
}

export default function ImagenHojaCarta({
  hoja,
  alt,
  esLcp,
  numeroHoja,
}: PropsImagenHojaCarta) {
  const [intento, setIntento] = useState(0)
  const [reintentandoAuto, setReintentandoAuto] = useState(false)
  const [falloDefinitivo, setFalloDefinitivo] = useState(false)
  const timerRef = useRef<number | null>(null)

  const tieneDimensiones = Boolean(hoja.ancho && hoja.alto)

  // Limpiar timer pendiente al desmontar o cambiar de hoja
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current)
      }
    }
  }, [hoja.imagenUrl])

  // Si volvió la señal mientras la hoja estaba caída, reintentar automáticamente
  useEffect(() => {
    if (!falloDefinitivo) return
    const alVolverOnline = () => {
      setFalloDefinitivo(false)
      setReintentandoAuto(false)
      setIntento((prev) => prev + 1)
    }
    window.addEventListener('online', alVolverOnline)
    return () => window.removeEventListener('online', alVolverOnline)
  }, [falloDefinitivo])

  const manejarErrorImagen = () => {
    if (intento < MAX_REINTENTOS_AUTO) {
      const demora = DEMORAS_REINTENTO_MS[intento] ?? 2000
      setReintentandoAuto(true)
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current)
      }
      timerRef.current = window.setTimeout(() => {
        setReintentandoAuto(false)
        setIntento((prev) => prev + 1)
      }, demora)
    } else {
      setReintentandoAuto(false)
      setFalloDefinitivo(true)
    }
  }

  const manejarCargaExitosa = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setReintentandoAuto(false)
    setFalloDefinitivo(false)
  }

  const recargarManual = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setFalloDefinitivo(false)
    setReintentandoAuto(false)
    setIntento((prev) => prev + 1)
  }

  const srcWebp = agregarParametroReintento(hoja.imagenUrl, intento)
  const srcFallback = hoja.imagenFallbackUrl
    ? agregarParametroReintento(hoja.imagenFallbackUrl, intento)
    : undefined

  if (falloDefinitivo) {
    return (
      <div
        style={
          tieneDimensiones
            ? { aspectRatio: `${hoja.ancho} / ${hoja.alto}` }
            : undefined
        }
        className="w-full min-h-56 bg-stone-100 flex flex-col items-center justify-center gap-3 px-6 py-10 text-center"
      >
        <div className="w-11 h-11 rounded-full bg-stone-200/90 text-stone-500 flex items-center justify-center">
          <ImageOff size={20} />
        </div>
        <div className="space-y-1 max-w-xs">
          <p className="text-sm font-bold text-stone-800">
            No se pudo cargar la hoja {numeroHoja}
          </p>
          <p className="text-xs text-stone-500 leading-relaxed">
            La señal se cortó durante la descarga. Tocá el botón para volver a intentarlo.
          </p>
        </div>
        <button
          type="button"
          onClick={recargarManual}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#2A6348] hover:bg-[#22503a] active:bg-[#1b402e] text-white text-sm font-semibold shadow-xs transition-colors cursor-pointer"
        >
          <RefreshCw size={15} />
          <span>Tocar para recargar esta hoja</span>
        </button>
      </div>
    )
  }

  const imgProps = {
    alt,
    width: hoja.ancho,
    height: hoja.alto,
    fetchPriority: esLcp ? ('high' as const) : undefined,
    loading: esLcp ? undefined : ('lazy' as const),
    decoding: esLcp ? ('sync' as const) : ('async' as const),
    draggable: false,
    onLoad: manejarCargaExitosa,
    onError: manejarErrorImagen,
    style: tieneDimensiones ? { aspectRatio: `${hoja.ancho} / ${hoja.alto}` } : undefined,
    className: 'block w-full h-auto bg-stone-200/60 select-none touch-pan-y pointer-events-none',
  }

  return (
    <div className="relative w-full">
      {srcFallback ? (
        <picture className="block w-full">
          <source srcSet={srcWebp} type="image/webp" />
          <img key={`${hoja.id}-${intento}`} src={srcFallback} {...imgProps} />
        </picture>
      ) : (
        <img key={`${hoja.id}-${intento}`} src={srcWebp} {...imgProps} />
      )}

      {reintentandoAuto && (
        <div
          aria-live="polite"
          className="absolute inset-0 bg-stone-100/85 flex flex-col items-center justify-center gap-2 text-stone-600 px-4 text-center"
        >
          <Loader2 size={20} className="animate-spin text-[#2A6348]" />
          <span className="text-xs font-semibold">
            Reintentando cargar hoja {numeroHoja}...
          </span>
        </div>
      )}
    </div>
  )
}
