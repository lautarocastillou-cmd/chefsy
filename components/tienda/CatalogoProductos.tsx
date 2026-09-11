'use client'

import React from 'react'
import { ScrollSpyNavBar } from '@/components/tienda/ScrollSpyNavBar'
import ProductCard from '@/components/tienda/ProductCard'
import { CategoriaCatalogo, ProductoCatalogo, MetaProducto } from '@/tipos/catalogo'
import { OBTENER_DETALLES_COMPLEMENTARIOS, OBTENER_DETALLES_CATEGORIA, esImagenValida } from '@/lib/tienda-helpers'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

// Si imagen_url es un base64 crudo o inválido, usar fallback válido o cadena vacía
function resolverImagen(imagenUrl: string | null | undefined, fallback: string): string {
  if (esImagenValida(imagenUrl)) return imagenUrl!
  if (esImagenValida(fallback)) return fallback
  return ''
}

// Helper interno: construye los props de ProductCard para un producto dado
function buildCardProps(
  prodOriginal: ProductoCatalogo,
  metadata:     Record<string, MetaProducto>,
  index:        number,
  onAbrirModal: (prod: ProductoCatalogo) => void,
) {
  const meta        = metadata[prodOriginal.id] ?? null
  const prod        = meta?.nombre_publico ? { ...prodOriginal, nombre: meta.nombre_publico } : prodOriginal
  const agotado     = (prodOriginal.stock !== undefined && prodOriginal.stock !== null) && (prodOriginal.stock ?? 0) <= 0
  const detalles    = OBTENER_DETALLES_COMPLEMENTARIOS(prodOriginal.categoriaId, prodOriginal.nombre, prodOriginal.id)
  const imagenFinal = resolverImagen(meta?.imagen_url, detalles.img)
  const tieneImagen = esImagenValida(imagenFinal)
  return { prod, meta, agotado, detalles, imagenFinal, tieneImagen, index, onAbrirModal }
}

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface CatalogoProductosProps {
  categoriasActivas:     CategoriaCatalogo[]
  productosFiltrados:    ProductoCatalogo[]
  categoriaSeleccionada: string | null
  busqueda:              string
  /** Map indexado por producto_id → MetaProducto */
  metadata:              Record<string, MetaProducto>
  onAbrirModal:          (prod: ProductoCatalogo) => void
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente
// ─────────────────────────────────────────────────────────────────────────────

function CatalogoProductosComponente({
  categoriasActivas,
  productosFiltrados,
  categoriaSeleccionada,
  busqueda,
  metadata,
  onAbrirModal,
}: CatalogoProductosProps) {
  const catDetalles = OBTENER_DETALLES_CATEGORIA(categoriaSeleccionada || 'todos')

  const idPatys   = categoriasActivas.find(c => c.nombre.toLowerCase().trim() === 'patys')?.id
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
              {catDetalles.nombre === 'Menú Especial'
                ? (categoriasActivas.find(c => c.id === categoriaSeleccionada)?.nombre.toUpperCase() || catDetalles.nombre)
                : (esCategoriaCombinada ? 'Burgers / Patys' : catDetalles.nombre)}
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
            {(() => {
              let totalCardIndex = 0
              return categoriasActivas.map(cat => {
                const productosDeCat = productosFiltrados.filter(p => p.categoriaId === cat.id)
                if (productosDeCat.length === 0) return null

<<<<<<< HEAD
                return (
                  <div key={cat.id} id={cat.id} className="categoria-seccion flex flex-col gap-4 scroll-mt-36">
                    {/* Título de Categoría en la lista */}
                    {(!categoriaSeleccionada || categoriaSeleccionada === 'todos' || busqueda || esCategoriaCombinada) && (
                      <h3 className="font-bebas text-4xl text-chefsy-300 tracking-wide border-b border-white/10 pb-2 mb-2">
                        {cat.nombre}
                      </h3>
                    )}

                    {/* Productos normales (excluye medias pizzas en la categoría pizzas) */}
                    {productosDeCat
                      .filter(p => !p.esCombo && !(cat.id === 'pizzas' && p.nombre.toLowerCase().includes('media')))
                      .map(prodOriginal => {
                        const props = buildCardProps(prodOriginal, metadata, totalCardIndex++, onAbrirModal)
                        return <ProductCard key={props.prod.id} {...props} />
                      })}

                    {/* Medias Pizzas */}
                    {cat.id === 'pizzas' && productosDeCat.some(p => p.nombre.toLowerCase().includes('media') && !p.esCombo) && (
                      <div className="mt-4 mb-2">
                        <h4 className="font-bebas text-3xl text-white tracking-wide border-b border-white/10 pb-2">
                          MEDIAS PIZZAS
                        </h4>
                      </div>
                    )}

                    {cat.id === 'pizzas' && productosDeCat
                      .filter(p => p.nombre.toLowerCase().includes('media') && !p.esCombo)
                      .map(prodOriginal => {
                        const props = buildCardProps(prodOriginal, metadata, totalCardIndex++, onAbrirModal)
                        return <ProductCard key={props.prod.id} {...props} />
                      })}

                    {productosDeCat.some(p => p.esCombo) && (
                      <div className="mt-4 mb-2">
                        <h4 className="font-bebas text-3xl text-white tracking-wide border-b border-white/10 pb-2">
                          PROMOS {cat.nombre.toUpperCase()}
                        </h4>
                      </div>
                    )}

                    {productosDeCat
                      .filter(p => p.esCombo)
                      .map(prodOriginal => {
                        const props = buildCardProps(prodOriginal, metadata, totalCardIndex++, onAbrirModal)
                        return <ProductCard key={props.prod.id} {...props} />
                      })}
                  </div>
                )
              })
            })()}
=======
              const normales = productosDeCat.filter(p => !p.esCombo && !(cat.id === 'pizzas' && p.nombre.toLowerCase().includes('media')))
              const normalesConFoto = normales.filter(p => esImagenValida(metadata[p.id]?.imagen_url))
              const normalesSinFoto = normales.filter(p => !esImagenValida(metadata[p.id]?.imagen_url))

              const medias = cat.id === 'pizzas' ? productosDeCat.filter(p => p.nombre.toLowerCase().includes('media') && !p.esCombo) : []
              const mediasConFoto = medias.filter(p => esImagenValida(metadata[p.id]?.imagen_url))
              const mediasSinFoto = medias.filter(p => !esImagenValida(metadata[p.id]?.imagen_url))

              const promos = productosDeCat.filter(p => p.esCombo)
              const promosConFoto = promos.filter(p => esImagenValida(metadata[p.id]?.imagen_url))
              const promosSinFoto = promos.filter(p => !esImagenValida(metadata[p.id]?.imagen_url))

              return (
                <div key={cat.id} id={cat.id} className="categoria-seccion flex flex-col gap-5 scroll-mt-36">
                  {/* Título de Categoría en la lista */}
                  {(!categoriaSeleccionada || categoriaSeleccionada === 'todos' || busqueda || esCategoriaCombinada) && (
                    <h3 className="font-bebas text-4xl text-chefsy-300 tracking-wide border-b border-white/10 pb-2 mb-2">
                      {cat.nombre}
                    </h3>
                  )}

                  {/* Productos normales con foto (lista horizontal tradicional) */}
                  {normalesConFoto.length > 0 && (
                    <div className="flex flex-col gap-4">
                      {normalesConFoto.map((prodOriginal, index) => {
                        const props = buildCardProps(prodOriginal, metadata, index, onAbrirModal)
                        return <ProductCard key={props.prod.id} {...props} />
                      })}
                    </div>
                  )}

                  {/* Productos normales sin foto (grid de tarjetas placeholder tienda-v2) */}
                  {normalesSinFoto.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {normalesSinFoto.map((prodOriginal, index) => {
                        const props = buildCardProps(prodOriginal, metadata, index + normalesConFoto.length, onAbrirModal)
                        return <ProductCard key={props.prod.id} {...props} />
                      })}
                    </div>
                  )}

                  {/* Medias Pizzas */}
                  {medias.length > 0 && (
                    <div className="mt-4 mb-1">
                      <h4 className="font-bebas text-3xl text-white tracking-wide border-b border-white/10 pb-2">
                        MEDIAS PIZZAS
                      </h4>
                    </div>
                  )}

                  {mediasConFoto.length > 0 && (
                    <div className="flex flex-col gap-4">
                      {mediasConFoto.map((prodOriginal, index) => {
                        const props = buildCardProps(prodOriginal, metadata, index + 50, onAbrirModal)
                        return <ProductCard key={props.prod.id} {...props} />
                      })}
                    </div>
                  )}

                  {mediasSinFoto.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {mediasSinFoto.map((prodOriginal, index) => {
                        const props = buildCardProps(prodOriginal, metadata, index + 70, onAbrirModal)
                        return <ProductCard key={props.prod.id} {...props} />
                      })}
                    </div>
                  )}

                  {/* Promos */}
                  {promos.length > 0 && (
                    <div className="mt-4 mb-1">
                      <h4 className="font-bebas text-3xl text-white tracking-wide border-b border-white/10 pb-2">
                        PROMOS {cat.nombre.toUpperCase()}
                      </h4>
                    </div>
                  )}

                  {promosConFoto.length > 0 && (
                    <div className="flex flex-col gap-4">
                      {promosConFoto.map((prodOriginal, index) => {
                        const props = buildCardProps(prodOriginal, metadata, index + 100, onAbrirModal)
                        return <ProductCard key={props.prod.id} {...props} />
                      })}
                    </div>
                  )}

                  {promosSinFoto.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {promosSinFoto.map((prodOriginal, index) => {
                        const props = buildCardProps(prodOriginal, metadata, index + 120, onAbrirModal)
                        return <ProductCard key={props.prod.id} {...props} />
                      })}
                    </div>
                  )}
                </div>
              )
            })}
>>>>>>> 44305eb (feat: tarjetas de productos sin imagen para tienda oficial segun diseno tienda-v2 y ruta /tienda)
          </div>
        </>
      )}
    </main>
  )
}

const CatalogoProductos = React.memo(CatalogoProductosComponente)
export default CatalogoProductos
