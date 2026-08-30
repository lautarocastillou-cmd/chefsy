'use client'

import React, { useRef, useState, useEffect } from 'react'
import Image from 'next/image'
import { Plus } from 'lucide-react'
import { formatearPrecio, optimizarUrlImagen, generarBlurUrl } from '@/lib/utils'
import { ProductoCatalogo, MetaProducto, DetallesComplementarios } from '@/tipos/catalogo'

interface ProductCardProps {
  prod:        ProductoCatalogo
  meta:        MetaProducto | undefined | null
  detalles:    DetallesComplementarios
  agotado:     boolean
  imagenFinal: string
  index:       number
  onAbrirModal: (prod: ProductoCatalogo) => void
}

function ProductCard({
  prod,
  meta,
  detalles,
  agotado,
  imagenFinal,
  index,
  onAbrirModal
}: ProductCardProps) {

  // ── Animación de entrada escalonada con IntersectionObserver ──────────────
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(index < 4) // primeros 4 ya visibles (above the fold)

  useEffect(() => {
    if (index < 4) return // ya visibles, no observar
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

  // Optimización de imágenes inteligente (CDN Cloudinary o Next.js Image Optimization)
  const rawSrc = (imagenFinal.includes(' | ') ? imagenFinal.split(' | ')[0] : imagenFinal).trim()
  const isCloudinary = rawSrc.includes('res.cloudinary.com')
  
  const optimizedSrc = optimizarUrlImagen(rawSrc, 250)
  const blurSrc = generarBlurUrl(rawSrc)
  const esPrioritario = index < 4

  // Nombre visible: el admin puede renombrarlo en el panel
  const nombreVisible = meta?.nombre_publico || prod.nombre
  // Descripción visible
  const descripcionVisible = meta?.descripcion_publica || detalles.desc

  return (
    <div
      ref={ref}
      onClick={() => !agotado && onAbrirModal(prod)}
      style={{
        contentVisibility: 'auto',
        containIntrinsicSize: '0 90px',
        // Delay escalonado según posición relativa en el grupo (0-4 items por grupo visual)
        transitionDelay: visible ? `${(index % 5) * 55}ms` : '0ms',
      }}
      className={`bg-transparent group flex items-start gap-4 cursor-pointer touch-manipulation
        transition-all duration-500
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
        ${agotado ? 'opacity-50 grayscale' : 'md:hover:bg-white/5 active:bg-white/10 active:scale-[0.99] p-2 -m-2 rounded-2xl'}
      `}
    >
      {/* Imagen a la izquierda */}
      <div className="relative h-20 w-20 md:h-24 md:w-24 shrink-0 overflow-hidden rounded-xl bg-black/20 mt-0.5">
        <Image
          src={optimizedSrc}
          alt={nombreVisible ?? prod.nombre}
          fill
          priority={esPrioritario}
          loading={esPrioritario ? undefined : 'lazy'}
          unoptimized={isCloudinary}
          placeholder="blur"
          blurDataURL={blurSrc}
          sizes="(max-width: 768px) 50vw, 250px"
          className="object-cover transition-transform duration-700 group-hover:scale-105"
        />
        {prod.esCombo && (
          <span className="absolute top-1 left-1 text-[8px] font-black bg-chefsy text-white px-2 py-0.5 rounded-full uppercase tracking-wider shadow-lg">
            Combo
          </span>
        )}
        {agotado && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
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
            {nombreVisible}
          </h4>
          <div className="flex flex-col items-end shrink-0 mt-0.5">
            <span className="font-sans font-bold text-xs sm:text-sm md:text-base text-chefsy-400">
              {formatearPrecio(prod.precio)}
            </span>
          </div>
        </div>
        {descripcionVisible ? (
          <p className="text-xs sm:text-sm md:text-base text-slate-300 font-medium leading-snug mt-1.5">
            {descripcionVisible}
          </p>
        ) : null}
      </div>
    </div>
  )
}

export default React.memo(ProductCard, (prevProps, nextProps) => {
  return (
    prevProps.prod.id          === nextProps.prod.id          &&
    prevProps.prod.nombre      === nextProps.prod.nombre      &&
    prevProps.prod.precio      === nextProps.prod.precio      &&
    prevProps.prod.stock       === nextProps.prod.stock       &&
    prevProps.agotado          === nextProps.agotado          &&
    prevProps.imagenFinal      === nextProps.imagenFinal      &&
    prevProps.meta?.descripcion_publica === nextProps.meta?.descripcion_publica &&
    prevProps.meta?.nombre_publico      === nextProps.meta?.nombre_publico      &&
    prevProps.meta?.imagen_url          === nextProps.meta?.imagen_url
  )
})
