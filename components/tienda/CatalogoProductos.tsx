'use client'

import React from 'react'
import { ScrollSpyNavBar } from '@/components/tienda/ScrollSpyNavBar'
import ProductCard from '@/components/tienda/ProductCard'
import { CategoriaCatalogo, ProductoCatalogo } from '@/tipos/catalogo'
import { OBTENER_DETALLES_COMPLEMENTARIOS, OBTENER_DETALLES_CATEGORIA } from '@/lib/tienda-helpers'

// Si imagen_url es un base64 crudo (no configurado Cloudinary), usar fallback
function resolverImagen(imagenUrl: string | undefined, fallback: string): string {
  if (!imagenUrl) return fallback
  // Los data: URIs base64 son enormes y fallan en Chrome moderno
  if (imagenUrl.startsWith('data:')) return fallback
  return imagenUrl
}

interface CatalogoProductosProps {
  categoriasActivas: CategoriaCatalogo[]
  productosFiltrados: ProductoCatalogo[]
  categoriaSeleccionada: string | null
  busqueda: string
  metadata: Record<string, any>
  onAbrirModal: (prod: ProductoCatalogo) => void
}

export default function CatalogoProductos({
  categoriasActivas,
  productosFiltrados,
  categoriaSeleccionada,
  busqueda,
  metadata,
  onAbrirModal,
}: CatalogoProductosProps) {
  const catDetalles = OBTENER_DETALLES_CATEGORIA(categoriaSeleccionada || 'todos')

  if (!categoriaSeleccionada && !busqueda) {
    return null
  }

  const idPatys = categoriasActivas.find(c => c.nombre.toLowerCase().trim() === 'patys')?.id
  const idBurgers = categoriasActivas.find(c => c.nombre.toLowerCase().includes('burger'))?.id
  const esCategoriaCombinada = categoriaSeleccionada === idPatys || categoriaSeleccionada === idBurgers

  return (
    <main className="max-w-6xl mx-auto p-4 space-y-6 pt-10">
      
      {/* Encabezado del Menú Seleccionado */}
      {categoriaSeleccionada && !busqueda && (
        <div className="text-left border-b border-white/10 pb-4 flex items-center justify-between">
          <div>
            <h3 className="text-5xl md:text-6xl font-bebas tracking-wide text-white flex items-center gap-3.5 leading-none">
              {catDetalles.icono === '🍔' ? (
                <img src="/burger-icon.png" alt="Burger" className="w-20 h-20 md:w-24 md:h-24 object-contain drop-shadow-md -translate-y-[2px]" />
              ) : catDetalles.icono.startsWith('/') ? (
                <img src={catDetalles.icono} alt={catDetalles.nombre} className="w-20 h-20 md:w-24 md:h-24 object-contain drop-shadow-md -translate-y-[2px]" />
              ) : (
                <span>{catDetalles.icono}</span>
              )}
              {catDetalles.nombre === 'Menú Especial' ? (categoriasActivas.find(c => c.id === categoriaSeleccionada)?.nombre.toUpperCase() || catDetalles.nombre) : (esCategoriaCombinada ? 'Burgers / Patys' : catDetalles.nombre)}
            </h3>
          </div>
        </div>
      )}

      {/* Listado de Productos */}
      {productosFiltrados.length === 0 ? (
        <div className="text-center py-20 text-slate-300 text-sm bg-black/20 rounded-3xl border border-dashed border-white/20 p-6">
          No encontramos productos activos.
        </div>
      ) : (
        <>
          {/* Barra Scrollspy aislada para no causar re-renders de page.tsx */}
          {(!categoriaSeleccionada || categoriaSeleccionada === 'todos') && (
            <ScrollSpyNavBar 
              categoriasActivas={categoriasActivas} 
              productosFiltrados={productosFiltrados} 
            />
          )}

          <div className="flex flex-col gap-10">
            {categoriasActivas.map(cat => {
              const productosDeCat = productosFiltrados.filter(p => p.categoriaId === cat.id)
              if (productosDeCat.length === 0) return null

              return (
                <div key={cat.id} id={cat.id} className="categoria-seccion flex flex-col gap-4 scroll-mt-36">
                  {/* Título de Categoría en la lista */}
                  {(!categoriaSeleccionada || categoriaSeleccionada === 'todos' || busqueda || esCategoriaCombinada) && (
                    <h3 className="font-bebas text-4xl text-chefsy-300 tracking-wide border-b border-white/10 pb-2 mb-2">
                      {cat.nombre}
                    </h3>
                  )}

                  {/* Productos normales (excluye medias pizzas en la categoría pizzas) */}
                  {productosDeCat.filter(p => !p.esCombo && !(cat.id === 'pizzas' && p.nombre.toLowerCase().includes('media'))).map((prodOriginal, index) => {
                    const meta = metadata[prodOriginal.id]
                    const prod = meta ? { ...prodOriginal, nombre: meta.nombre_publico || prodOriginal.nombre } : prodOriginal
                    const agotado = (prodOriginal.stock !== undefined && prodOriginal.stock !== null) && (prodOriginal.stock || 0) <= 0
                    const detalles = OBTENER_DETALLES_COMPLEMENTARIOS(prodOriginal.categoriaId, prodOriginal.nombre, prodOriginal.id)
                    return (
                      <ProductCard
                        key={prod.id} prod={prod} meta={meta} detalles={detalles}
                        agotado={agotado || false} imagenFinal={resolverImagen(meta?.imagen_url, detalles.img)}
                        index={index} onAbrirModal={onAbrirModal}
                      />
                    )
                  })}

                  {/* Medias Pizzas */}
                  {cat.id === 'pizzas' && productosDeCat.some(p => p.nombre.toLowerCase().includes('media') && !p.esCombo) && (
                    <div className="mt-4 mb-2">
                      <h4 className="font-bebas text-3xl text-white tracking-wide border-b border-white/10 pb-2">
                        MEDIAS PIZZAS
                      </h4>
                    </div>
                  )}

                  {cat.id === 'pizzas' && productosDeCat.filter(p => p.nombre.toLowerCase().includes('media') && !p.esCombo).map((prodOriginal, index) => {
                    const meta = metadata[prodOriginal.id]
                    const prod = meta ? { ...prodOriginal, nombre: meta.nombre_publico || prodOriginal.nombre } : prodOriginal
                    const agotado = (prodOriginal.stock !== undefined && prodOriginal.stock !== null) && (prodOriginal.stock || 0) <= 0
                    const detalles = OBTENER_DETALLES_COMPLEMENTARIOS(prodOriginal.categoriaId, prodOriginal.nombre, prodOriginal.id)
                    return (
                      <ProductCard
                        key={prod.id} prod={prod} meta={meta} detalles={detalles}
                        agotado={agotado || false} imagenFinal={resolverImagen(meta?.imagen_url, detalles.img)}
                        index={index + 50} onAbrirModal={onAbrirModal}
                      />
                    )
                  })}

                  {productosDeCat.some(p => p.esCombo) && (
                    <div className="mt-4 mb-2">
                      <h4 className="font-bebas text-3xl text-white tracking-wide border-b border-white/10 pb-2">
                        PROMOS {cat.nombre.toUpperCase()}
                      </h4>
                    </div>
                  )}

                  {productosDeCat.filter(p => p.esCombo).map((prodOriginal, index) => {
                    const meta = metadata[prodOriginal.id]
                    const prod = meta ? { ...prodOriginal, nombre: meta.nombre_publico || prodOriginal.nombre } : prodOriginal
                    const agotado = (prodOriginal.stock !== undefined && prodOriginal.stock !== null) && (prodOriginal.stock || 0) <= 0
                    const detalles = OBTENER_DETALLES_COMPLEMENTARIOS(prodOriginal.categoriaId, prodOriginal.nombre, prodOriginal.id)
                    return (
                      <ProductCard
                        key={prod.id} prod={prod} meta={meta} detalles={detalles}
                        agotado={agotado || false} imagenFinal={resolverImagen(meta?.imagen_url, detalles.img)}
                        index={index + 100} onAbrirModal={onAbrirModal}
                      />
                    )
                  })}
                </div>
              )
            })}
          </div>
        </>
      )}
    </main>
  )
}
