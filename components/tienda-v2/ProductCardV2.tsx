'use client'

import React, { useRef, useState, useEffect } from 'react'
import Image from 'next/image'
import { Plus, Utensils, Flame } from 'lucide-react'
import { formatearPrecio, optimizarUrlImagen, cn } from '@/lib/utils'
import { ProductoCatalogo, MetaProducto, DetallesComplementarios } from '@/tipos/catalogo'
import { usarCarrito } from '@/contexto/CarritoContexto'

interface ProductCardV2Props {
  prod: ProductoCatalogo
  meta: MetaProducto | undefined | null
  detalles: DetallesComplementarios
  agotado: boolean
  imagenFinal: string
  index: number
  onAbrirModal: (prod: ProductoCatalogo) => void
}

export default function ProductCardV2({
  prod,
  meta,
  detalles,
  agotado,
  imagenFinal,
  index,
  onAbrirModal,
}: ProductCardV2Props) {
  const { turnoActivo, esDomingoCerrado, mensajeCierre } = usarCarrito()
  const estaCerrado = turnoActivo === false || esDomingoCerrado

  const [imgError, setImgError] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(index < 8)

  useEffect(() => {
    if (index < 8) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.05 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [index])

  const rawSrc = (imagenFinal.includes(' | ') ? imagenFinal.split(' | ')[0] : imagenFinal).trim()
  const isCdnOptimized =
    rawSrc.includes('res.cloudinary.com') ||
    rawSrc.includes('supabase.co') ||
    rawSrc.includes('unsplash.com') ||
    rawSrc.includes('lh3.googleusercontent.com')

  const optimizedSrc = isCdnOptimized ? optimizarUrlImagen(rawSrc, 400) : rawSrc
  const esPrioritario = index < 4

  const nombreVisible = meta?.nombre_publico || prod.nombre
  const descripcionVisible = meta?.descripcion_publica || detalles.desc

  const handleClick = () => {
    if (estaCerrado) {
      alert(
        mensajeCierre ||
          'El local se encuentra cerrado en este momento. Horarios: Lunes a Sábados de 11:30 a 14:00 y 20:30 a 01:00 hs. Domingos cerrado.'
      )
      return
    }
    if (!agotado) {
      onAbrirModal(prod)
    }
  }

  return (
    <div
      ref={ref}
      onClick={handleClick}
      style={{
        contentVisibility: 'auto',
        containIntrinsicSize: '0 320px',
        transitionDelay: visible ? `${(index % 4) * 40}ms` : '0ms',
      }}
      className={cn(
        'group flex flex-col bg-slate-900/50 hover:bg-slate-900/85 border border-white/5 hover:border-white/15 rounded-2xl md:rounded-3xl overflow-hidden shadow-lg transition-all duration-300 cursor-pointer select-none relative',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3',
        agotado || estaCerrado ? 'opacity-65 cursor-not-allowed' : 'active:scale-[0.99]'
      )}
    >
      {/* ── 1. Foto Superior Grande (16:10) ─────────────────────────────────── */}
      <div className="relative w-full aspect-[16/10] bg-slate-950 overflow-hidden">
        {!imgError && optimizedSrc ? (
          <Image
            src={optimizedSrc}
            alt={nombreVisible}
            fill
            priority={esPrioritario}
            loading={esPrioritario ? undefined : 'lazy'}
            unoptimized={isCdnOptimized}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 350px"
            onError={() => setImgError(true)}
            className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          /* Placeholder oscuro elegante para imágenes rotas o inexistentes */
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 flex flex-col items-center justify-center gap-2 text-slate-600">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500">
              <Utensils size={22} />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Chefsy
            </span>
          </div>
        )}

        {/* Badge Combo */}
        {prod.esCombo && (
          <div className="absolute top-2.5 left-2.5 bg-emerald-600/90 text-white font-black text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-lg shadow-md backdrop-blur-xs">
            Combo
          </div>
        )}

        {/* Overlay Agotado */}
        {agotado && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
            <span className="bg-red-600 text-white font-extrabold text-xs px-3 py-1 rounded-full uppercase tracking-wider shadow-lg">
              Agotado
            </span>
          </div>
        )}
      </div>

      {/* ── 2. Cuerpo: Título, Descripción y Precio ─────────────────────────── */}
      <div className="flex-1 flex flex-col justify-between p-4 sm:p-5 gap-3">
        <div className="space-y-1.5">
          {/* Título en tipografía clara natural, sin cortes con '...' */}
          <h3 className="font-sans font-bold text-sm sm:text-base md:text-lg text-white leading-snug line-clamp-2 group-hover:text-amber-400 transition-colors">
            {nombreVisible}
          </h3>

          {/* Descripción con ingredientes legible */}
          {descripcionVisible && (
            <p className="text-xs text-slate-400 font-normal leading-relaxed line-clamp-2">
              {descripcionVisible}
            </p>
          )}
        </div>

        {/* ── 3. Pie: Precio Destacado y Botón Cómodo ────────────────────────── */}
        <div className="flex items-center justify-between pt-3 border-t border-white/5 mt-auto">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              Precio
            </span>
            <span className="font-mono font-black text-base sm:text-lg text-emerald-400 tracking-tight">
              {formatearPrecio(prod.precio)}
            </span>
          </div>

          <button
            type="button"
            className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={15} />
            <span>Agregar</span>
          </button>
        </div>
      </div>
    </div>
  )
}
