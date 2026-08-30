'use client'

import React, { useRef, useState, useEffect } from 'react'
import Image from 'next/image'
import { Plus, Flame, Star, Leaf, Sparkles } from 'lucide-react'
import { formatearPrecio, optimizarUrlImagen, generarBlurUrl, cn } from '@/lib/utils'
import { ProductoCatalogo, MetaProducto, DetallesComplementarios } from '@/tipos/catalogo'
import { usarConfiguracionTienda } from '@/contexto/ConfiguracionTiendaContexto'

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
  const { configuracion } = usarConfiguracionTienda()
  
  const estiloTarjeta = configuracion?.estilo_tarjetas || 'glassmorphism'
  const mostrarBadges = configuracion?.mostrar_badges_automaticos !== false
  const mostrarDescuento = configuracion?.mostrar_badge_descuento !== false

  // ── Animación de entrada escalonada con IntersectionObserver ──────────────
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(index < 4)

  useEffect(() => {
    if (index < 4) return
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

  // Optimización de imágenes inteligente
  const rawSrc = (imagenFinal.includes(' | ') ? imagenFinal.split(' | ')[0] : imagenFinal).trim()
  const isCdnOptimized =
    rawSrc.includes('res.cloudinary.com') ||
    rawSrc.includes('supabase.co') ||
    rawSrc.includes('unsplash.com') ||
    rawSrc.includes('lh3.googleusercontent.com')
  
  const optimizedSrc = optimizarUrlImagen(rawSrc, 250)
  const blurSrc = generarBlurUrl(rawSrc)
  const esPrioritario = index < 4

  const nombreVisible = meta?.nombre_publico || prod.nombre
  const descripcionVisible = meta?.descripcion_publica || detalles.desc

  // Cálculo de Descuento si existe precio anterior / promocional
  const precioAnterior = (meta as any)?.precio_anterior || (prod as any)?.precio_anterior
  const porcentajeDescuento =
    precioAnterior && precioAnterior > prod.precio
      ? Math.round(((precioAnterior - prod.precio) / precioAnterior) * 100)
      : null

  // Estilos de Tarjeta Dinámicos
  const contenedorEstilos = {
    glassmorphism:
      'bg-white/[0.04] hover:bg-white/[0.08] backdrop-blur-md border border-white/10 hover:border-white/20 p-3.5 rounded-2xl shadow-xl',
    neon_glow:
      'bg-zinc-950/90 border border-emerald-500/25 hover:border-emerald-400 p-3.5 rounded-2xl shadow-[0_0_15px_-4px_rgba(42,99,72,0.4)] hover:shadow-[0_0_25px_0px_rgba(42,99,72,0.6)]',
    minimalista_clean:
      'bg-transparent hover:bg-white/5 border border-transparent p-2.5 rounded-2xl',
    compacto_lista:
      'bg-zinc-900/70 hover:bg-zinc-900 border border-white/5 p-2.5 rounded-xl items-center',
  }[estiloTarjeta] || 'bg-white/[0.04] p-3.5 rounded-2xl border border-white/10'

  return (
    <div
      ref={ref}
      onClick={() => !agotado && onAbrirModal(prod)}
      style={{
        contentVisibility: 'auto',
        containIntrinsicSize: '0 90px',
        transitionDelay: visible ? `${(index % 5) * 55}ms` : '0ms',
      }}
      className={cn(
        'group flex items-start gap-3.5 cursor-pointer touch-manipulation transition-all duration-300 select-none relative',
        contenedorEstilos,
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
        agotado
          ? 'opacity-50 grayscale'
          : 'active:scale-[0.98]'
      )}
    >
      {/* Imagen a la izquierda */}
      <div className={cn(
        'relative shrink-0 overflow-hidden bg-black/20',
        estiloTarjeta === 'compacto_lista'
          ? 'h-16 w-16 md:h-18 md:w-18 rounded-lg'
          : 'h-20 w-20 sm:h-24 sm:w-24 md:h-26 md:w-26 rounded-xl'
      )}>
        <Image
          src={optimizedSrc}
          alt={nombreVisible ?? prod.nombre}
          fill
          priority={esPrioritario}
          loading={esPrioritario ? undefined : 'lazy'}
          unoptimized={isCdnOptimized}
          placeholder="blur"
          blurDataURL={blurSrc}
          sizes="(max-width: 768px) 50vw, 250px"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Badge de Descuento Porcentual */}
        {mostrarDescuento && porcentajeDescuento && (
          <span className="absolute top-1 right-1 text-[9px] font-black bg-red-600 text-white px-1.5 py-0.5 rounded-md uppercase tracking-wider shadow-lg">
            -{porcentajeDescuento}%
          </span>
        )}

        {/* Badge Combo */}
        {prod.esCombo && (
          <span className="absolute top-1 left-1 text-[8px] font-black bg-emerald-600 text-white px-1.5 py-0.5 rounded uppercase tracking-wider shadow-lg">
            Combo
          </span>
        )}

        {/* Badge Agotado */}
        {agotado && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
            <span className="bg-red-500 text-white font-extrabold text-[8px] px-2 py-1 rounded uppercase tracking-wider shadow-lg">
              Agotado
            </span>
          </div>
        )}
      </div>

      {/* Contenido a la derecha */}
      <div className="flex-1 flex flex-col justify-center text-left min-w-0">
        
        {/* Badges Automáticos del Producto */}
        {mostrarBadges && (
          <div className="flex flex-wrap items-center gap-1 mb-1">
            {((meta as any)?.es_mas_pedido || prod.esCombo) && (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-black text-amber-300 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.2 rounded-md">
                <Flame size={10} className="text-amber-400" />
                <span>MÁS PEDIDO</span>
              </span>
            )}
            {(meta as any)?.es_recomendado && (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-black text-purple-300 bg-purple-500/15 border border-purple-500/30 px-1.5 py-0.2 rounded-md">
                <Star size={10} className="text-purple-400" />
                <span>CHEF</span>
              </span>
            )}
            {(meta as any)?.es_veggie && (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-black text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.2 rounded-md">
                <Leaf size={10} className="text-emerald-400" />
                <span>VEGGIE</span>
              </span>
            )}
            {(meta as any)?.es_nuevo && (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-black text-sky-300 bg-sky-500/15 border border-sky-500/30 px-1.5 py-0.2 rounded-md">
                <Sparkles size={10} className="text-sky-400" />
                <span>NUEVO</span>
              </span>
            )}
          </div>
        )}

        <div className="flex justify-between items-start gap-2">
          <h4 className="font-bebas text-lg sm:text-xl md:text-3xl text-white leading-none tracking-wide truncate">
            {nombreVisible}
          </h4>
          <div className="flex flex-col items-end shrink-0">
            <span className="font-mono font-black text-xs sm:text-sm md:text-base text-emerald-400">
              {formatearPrecio(prod.precio)}
            </span>
          </div>
        </div>

        {descripcionVisible && estiloTarjeta !== 'compacto_lista' ? (
          <p className="text-[11px] sm:text-xs md:text-sm text-slate-300/90 font-medium leading-snug mt-1 line-clamp-2">
            {descripcionVisible}
          </p>
        ) : null}
      </div>

      {/* Botón táctil de agregar rápido en estilo compacto */}
      {estiloTarjeta === 'compacto_lista' && !agotado && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onAbrirModal(prod)
          }}
          className="p-2 bg-emerald-600 text-white rounded-lg shadow-md hover:bg-emerald-500 transition-colors shrink-0"
        >
          <Plus size={14} className="stroke-[3]" />
        </button>
      )}
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
