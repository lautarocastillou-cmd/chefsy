'use client'

import React from 'react'
import Image from 'next/image'
import { Plus } from 'lucide-react'
import { formatearPrecio, optimizarUrlImagen, generarBlurUrl } from '@/lib/utils'

interface ProductCardProps {
  prod: any
  meta: any
  detalles: any
  agotado: boolean
  imagenFinal: string
  index: number
  modoTienda?: 'normal' | 'chefsitos'
  onAbrirModal: (prod: any) => void
}

function ProductCard({
  prod,
  meta,
  detalles,
  agotado,
  imagenFinal,
  index,
  modoTienda = 'normal',
  onAbrirModal
}: ProductCardProps) {
  if (modoTienda === 'chefsitos' && (!prod.precio_puntos || prod.precio_puntos <= 0)) {
    return null
  }

  // Optimización de imágenes inteligente (CDN Cloudinary o Next.js Image Optimization)
  const rawSrc = (imagenFinal.includes(' | ') ? imagenFinal.split(' | ')[0] : imagenFinal).trim()
  const isCloudinary = rawSrc.includes('res.cloudinary.com')
  
  const optimizedSrc = optimizarUrlImagen(rawSrc, 250)
  const blurSrc = generarBlurUrl(rawSrc)

  return (
    <div
      onClick={() => !agotado && onAbrirModal(prod)}
      className={`bg-transparent group flex items-start gap-4 cursor-pointer transition-all duration-150 animate-in fade-in slide-in-from-bottom-4 touch-pan-y ${
        agotado ? 'opacity-50 grayscale' : 'md:hover:bg-white/5 active:bg-white/10 active:scale-[0.99] p-2 -m-2 rounded-2xl'
      }`}
    >
      {/* Imagen a la izquierda */}
      <div className="relative h-20 w-20 md:h-24 md:w-24 shrink-0 overflow-hidden rounded-xl bg-black/20 mt-0.5">
        <Image
          src={optimizedSrc}
          alt={prod.nombre}
          fill
          unoptimized={isCloudinary}
          priority={index < 6}
          placeholder="blur"
          blurDataURL={blurSrc}
          sizes="(max-width: 768px) 80px, 96px"
          className="object-cover transition-transform duration-700 group-hover:scale-105"
        />
        {prod.esCombo && (
          <span className="absolute top-1 left-1 text-[8px] font-black bg-chefsy text-white px-2 py-0.5 rounded-full uppercase tracking-wider shadow-lg">
            Combo
          </span>
        )}
        {agotado && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center">
            <span className="bg-red-500 text-white font-extrabold text-[8px] px-2 py-1 rounded uppercase tracking-wider shadow-lg">
              Agotado
            </span>
          </div>
        )}
      </div>

      {/* Contenido a la derecha */}
      <div className="flex-1 flex flex-col justify-center text-left py-0.5">
        <div className="flex justify-between items-start gap-2">
          <h4 className="font-bebas text-xl sm:text-2xl md:text-4xl text-white leading-none tracking-wide">
            {prod.nombre}
          </h4>
          <div className="flex flex-col items-end shrink-0 mt-0.5">
            {modoTienda === 'chefsitos' ? (
              <span className="font-bebas text-lg sm:text-xl md:text-2xl text-chefsy-400 drop-shadow-[0_0_8px_rgba(234,179,8,0.3)]">
                🪙 {prod.precio_puntos} Chefsitos
              </span>
            ) : (
              <>
                <span className="font-sans font-bold text-xs sm:text-sm md:text-base text-chefsy-400">
                  {formatearPrecio(prod.precio)}
                </span>
                {prod.precio_puntos > 0 && (
                  <span className="text-[10px] sm:text-xs font-black text-chefsy-500 bg-chefsy-500/10 px-1.5 py-0.5 rounded-md mt-1 border border-chefsy-500/20">
                    o {prod.precio_puntos} pts
                  </span>
                )}
              </>
            )}
          </div>
        </div>
        {(meta?.descripcion_publica || detalles?.desc) ? (
          <p className="text-xs sm:text-sm md:text-base text-slate-300 font-medium leading-snug mt-1.5">
            {meta?.descripcion_publica || detalles?.desc}
          </p>
        ) : null}
      </div>
    </div>
  )
}

export default React.memo(ProductCard, (prevProps, nextProps) => {
  return (
    prevProps.prod.id === nextProps.prod.id &&
    prevProps.prod.nombre === nextProps.prod.nombre &&
    prevProps.prod.precio_puntos === nextProps.prod.precio_puntos &&
    prevProps.agotado === nextProps.agotado &&
    prevProps.imagenFinal === nextProps.imagenFinal &&
    prevProps.modoTienda === nextProps.modoTienda &&
    prevProps.meta?.descripcion_publica === nextProps.meta?.descripcion_publica &&
    prevProps.meta?.nombre_publico === nextProps.meta?.nombre_publico
  )
})
