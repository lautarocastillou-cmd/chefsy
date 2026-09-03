'use client'

import React, { useState, useEffect, useRef } from 'react'
import ProductCardV2 from './ProductCardV2'
import { CategoriaCatalogo, ProductoCatalogo, MetaProducto } from '@/tipos/catalogo'
import { OBTENER_DETALLES_COMPLEMENTARIOS } from '@/lib/tienda-helpers'
import { cn } from '@/lib/utils'

function resolverImagen(imagenUrl: string | null | undefined, fallback: string): string {
  if (!imagenUrl) return fallback
  if (imagenUrl.startsWith('data:')) return fallback
  return imagenUrl
}

function buildCardProps(
  prodOriginal: ProductoCatalogo,
  metadata: Record<string, MetaProducto>,
  index: number,
  onAbrirModal: (prod: ProductoCatalogo) => void
) {
  const meta = metadata[prodOriginal.id] ?? null
  const prod = meta?.nombre_publico ? { ...prodOriginal, nombre: meta.nombre_publico } : prodOriginal
  const agotado =
    prodOriginal.stock !== undefined && prodOriginal.stock !== null && (prodOriginal.stock ?? 0) <= 0
  const detalles = OBTENER_DETALLES_COMPLEMENTARIOS(
    prodOriginal.categoriaId,
    prodOriginal.nombre,
    prodOriginal.id
  )
  const imagenFinal = resolverImagen(meta?.imagen_url, detalles.img)
  return { prod, meta, agotado, detalles, imagenFinal, index, onAbrirModal }
}

interface CatalogoV2Props {
  categoriasActivas: CategoriaCatalogo[]
  productosFiltrados: ProductoCatalogo[]
  categoriaSeleccionada: string | null
  busqueda: string
  metadata: Record<string, MetaProducto>
  onAbrirModal: (prod: ProductoCatalogo) => void
  onSeleccionarCategoria: (id: string | null) => void
}

export default function CatalogoV2({
  categoriasActivas,
  productosFiltrados,
  categoriaSeleccionada,
  busqueda,
  metadata,
  onAbrirModal,
  onSeleccionarCategoria,
}: CatalogoV2Props) {
  const [categoriaVisible, setCategoriaVisible] = useState<string>('')
  const tabsRef = useRef<HTMLDivElement>(null)

  // Scrollspy para marcar automáticamente la categoría visible al scrollear
  useEffect(() => {
    if (categoriaSeleccionada) return

    const observador = new IntersectionObserver(
      (entradas) => {
        entradas.forEach((entrada) => {
          if (entrada.isIntersecting) {
            setCategoriaVisible(entrada.target.id)
          }
        })
      },
      { rootMargin: '-20% 0px -65% 0px' }
    )

    const secciones = document.querySelectorAll('section[data-cat-id]')
    secciones.forEach((s) => observador.observe(s))

    return () => observador.disconnect()
  }, [productosFiltrados, categoriaSeleccionada])

  const scrollToSection = (catId: string | null) => {
    onSeleccionarCategoria(catId)
    if (!catId) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    const el = document.getElementById(`cat-${catId}`)
    if (el) {
      const yOffset = -120
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset
      window.scrollTo({ top: y, behavior: 'smooth' })
    }
  }

  // Combinación y filtrado de categorías con productos
  const categoriasConProductos = categoriasActivas.filter((cat) =>
    productosFiltrados.some((p) => p.categoriaId === cat.id)
  )

  return (
    <div className="w-full">
      {/* ── Barra de Navegación de Categorías Minimalista y Sticky ───────── */}
      <nav className="sticky top-[61px] md:top-[69px] z-30 bg-[#07090E]/95 backdrop-blur-md border-b border-white/5 py-2.5 px-3 sm:px-6">
        <div
          ref={tabsRef}
          className="max-w-6xl mx-auto flex items-center gap-1.5 overflow-x-auto scrollbar-none"
        >
          <button
            type="button"
            onClick={() => scrollToSection(null)}
            className={cn(
              'px-3.5 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition-all shrink-0 cursor-pointer',
              !categoriaSeleccionada && !categoriaVisible
                ? 'bg-white text-slate-950 font-bold shadow-xs'
                : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-white/5'
            )}
          >
            Todos
          </button>

          {categoriasConProductos.map((cat) => {
            const esActiva =
              categoriaSeleccionada === cat.id ||
              (!categoriaSeleccionada && categoriaVisible === cat.id)

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => scrollToSection(cat.id)}
                className={cn(
                  'px-3.5 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition-all shrink-0 cursor-pointer',
                  esActiva
                    ? 'bg-white text-slate-950 font-bold shadow-xs'
                    : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-white/5'
                )}
              >
                {cat.nombre}
              </button>
            )
          })}
        </div>
      </nav>

      {/* ── Listado Limpio de Productos ─────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
        {productosFiltrados.length === 0 ? (
          <div className="text-center py-20 text-slate-400 text-sm bg-slate-900/30 rounded-2xl border border-white/5 p-6">
            No hay productos disponibles en este momento.
          </div>
        ) : (
          <div className="flex flex-col gap-10">
            {(() => {
              let totalIndex = 0

              const listaCategorias = categoriaSeleccionada
                ? categoriasActivas.filter((c) => c.id === categoriaSeleccionada)
                : categoriasActivas

              return listaCategorias.map((cat) => {
                const productosDeCat = productosFiltrados.filter(
                  (p) => p.categoriaId === cat.id
                )
                if (productosDeCat.length === 0) return null

                return (
                  <section
                    key={cat.id}
                    id={`cat-${cat.id}`}
                    data-cat-id={cat.id}
                    className="flex flex-col gap-4 scroll-mt-32"
                  >
                    {/* Título de Categoría Limpio y Minimalista (Sin emojis ni adornos pesados) */}
                    <div className="border-b border-white/10 pb-2">
                      <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight uppercase">
                        {cat.nombre}
                      </h2>
                    </div>

                    {/* Grilla de Productos Verticales estilo UberEats / McDonald's */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 md:gap-6">
                      {productosDeCat.map((prodOriginal) => {
                        const props = buildCardProps(
                          prodOriginal,
                          metadata,
                          totalIndex++,
                          onAbrirModal
                        )
                        return <ProductCardV2 key={props.prod.id} {...props} />
                      })}
                    </div>
                  </section>
                )
              })
            })()}
          </div>
        )}
      </div>
    </div>
  )
}
