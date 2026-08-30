'use client'

import { useState, useMemo } from 'react'
import { FilaProductoPedido, ProductoCatalogo } from '@/tipos/catalogo'
import { usarPedidos } from '@/contexto/PedidosContexto'
import { formatearPrecio, generarIdProducto } from '@/lib/utils'
import { Search, Plus, Minus, Check, Sparkles, X, ShoppingBag } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PropsSelectorCatalogoTactilMobile {
  filas: FilaProductoPedido[]
  onFilasChange: (filas: FilaProductoPedido[]) => void
}

export default function SelectorCatalogoTactilMobile({
  filas,
  onFilasChange,
}: PropsSelectorCatalogoTactilMobile) {
  const { productos, categorias } = usarPedidos()
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>('todas')
  const [busqueda, setBusqueda] = useState('')

  const vibrar = (ms = 15) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(ms)
    }
  }

  // Filtrado de productos por categoría y texto
  const productosFiltrados = useMemo(() => {
    return productos.filter((p) => {
      if (!p.activo) return false
      const coincideCat =
        categoriaSeleccionada === 'todas' || p.categoriaId === categoriaSeleccionada
      const coincideTexto =
        busqueda.trim() === '' ||
        p.nombre.toLowerCase().includes(busqueda.toLowerCase())
      return coincideCat && coincideTexto
    })
  }, [productos, categoriaSeleccionada, busqueda])

  // Mapa de cantidades actuales por productoId
  const cantidadesPorProducto = useMemo(() => {
    const mapa: Record<string, number> = {}
    filas.forEach((f) => {
      if (f.idProductoCatalogo) {
        mapa[f.idProductoCatalogo] = (mapa[f.idProductoCatalogo] || 0) + (f.cantidad || 1)
      }
    })
    return mapa
  }, [filas])

  const agregarOIncrementar = (producto: ProductoCatalogo) => {
    vibrar(20)
    const cat = categorias.find((c) => c.id === producto.categoriaId)

    // Buscar si ya está en las filas
    const indexExistente = filas.findIndex((f) => f.idProductoCatalogo === producto.id)

    if (indexExistente >= 0) {
      const copia = [...filas]
      copia[indexExistente] = {
        ...copia[indexExistente],
        cantidad: (copia[indexExistente].cantidad || 1) + 1,
      }
      onFilasChange(copia)
    } else {
      // Si la única fila existente está vacía, la usamos
      if (filas.length === 1 && !filas[0].idProductoCatalogo) {
        onFilasChange([
          {
            id: filas[0].id,
            idCategoria: producto.categoriaId,
            idProductoCatalogo: producto.id,
            nombreProducto: producto.nombre,
            nombreCategoria: cat?.nombre,
            cantidad: 1,
            precio: producto.precio,
          },
        ])
      } else {
        onFilasChange([
          ...filas,
          {
            id: generarIdProducto(),
            idCategoria: producto.categoriaId,
            idProductoCatalogo: producto.id,
            nombreProducto: producto.nombre,
            nombreCategoria: cat?.nombre,
            cantidad: 1,
            precio: producto.precio,
          },
        ])
      }
    }
  }

  const decrementarOQuitar = (productoId: string) => {
    vibrar(15)
    const indexExistente = filas.findIndex((f) => f.idProductoCatalogo === productoId)
    if (indexExistente < 0) return

    const copia = [...filas]
    const cantActual = copia[indexExistente].cantidad || 1

    if (cantActual > 1) {
      copia[indexExistente] = {
        ...copia[indexExistente],
        cantidad: cantActual - 1,
      }
      onFilasChange(copia)
    } else {
      // Si era 1, lo eliminamos
      const filtradas = copia.filter((_, i) => i !== indexExistente)
      if (filtradas.length === 0) {
        // Dejar una fila vacía
        onFilasChange([
          {
            id: generarIdProducto(),
            idCategoria: '',
            idProductoCatalogo: '',
            cantidad: 1,
            precio: 0,
          },
        ])
      } else {
        onFilasChange(filtradas)
      }
    }
  }

  const categoriasConProductos = useMemo(() => {
    const idsConProductos = new Set(productos.filter((p) => p.activo).map((p) => p.categoriaId))
    return categorias.filter((c) => idsConProductos.has(c.id))
  }, [categorias, productos])

  return (
    <div className="space-y-3">
      {/* ── Buscador Táctil con botón Clear ──────────────────────── */}
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        />
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar plato o bebida..."
          className="w-full pl-10 pr-10 py-2.5 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-2xl text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
        />
        {busqueda && (
          <button
            type="button"
            onClick={() => setBusqueda('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200 rounded-full"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* ── Pestañas de Categorías Horizontales con Snap ─────────── */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none snap-x py-0.5 -mx-1 px-1">
        <button
          type="button"
          onClick={() => {
            vibrar(10)
            setCategoriaSeleccionada('todas')
          }}
          className={cn(
            'snap-start shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 select-none cursor-pointer',
            categoriaSeleccionada === 'todas'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          )}
        >
          🔥 Todos
        </button>

        {categoriasConProductos.map((cat) => {
          const activa = categoriaSeleccionada === cat.id
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                vibrar(10)
                setCategoriaSeleccionada(cat.id)
              }}
              className={cn(
                'snap-start shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 select-none cursor-pointer',
                activa
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              )}
            >
              {cat.nombre}
            </button>
          )
        })}
      </div>

      {/* ── Grilla / Lista de Productos Táctiles ─────────────────── */}
      {productosFiltrados.length === 0 ? (
        <div className="text-center py-8 text-xs text-slate-400 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800">
          No hay productos disponibles en esta categoría.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[360px] overflow-y-auto pr-1">
          {productosFiltrados.map((producto) => {
            const cantEnPedido = cantidadesPorProducto[producto.id] || 0
            const seleccionado = cantEnPedido > 0

            return (
              <div
                key={producto.id}
                className={cn(
                  'flex items-center justify-between p-3 rounded-2xl border transition-all select-none',
                  seleccionado
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-500/40 shadow-xs'
                    : 'bg-white dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800/80 hover:border-slate-300'
                )}
              >
                <div className="min-w-0 flex-1 pr-2">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">
                      {producto.nombre}
                    </h4>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 block mt-0.5">
                    {formatearPrecio(producto.precio)}
                  </span>
                </div>

                {/* Controles Táctiles: Stepper si ya está agregado, o botón + */}
                {seleccionado ? (
                  <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-emerald-500/30 rounded-xl p-1 shadow-xs">
                    <button
                      type="button"
                      onClick={() => decrementarOQuitar(producto.id)}
                      className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 flex items-center justify-center active:scale-85 transition-transform"
                    >
                      <Minus size={14} className="stroke-[3]" />
                    </button>
                    <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 px-1 min-w-[18px] text-center font-mono">
                      {cantEnPedido}
                    </span>
                    <button
                      type="button"
                      onClick={() => agregarOIncrementar(producto)}
                      className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center active:scale-85 transition-transform"
                    >
                      <Plus size={14} className="stroke-[3]" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => agregarOIncrementar(producto)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-extrabold flex items-center gap-1 active:scale-90 transition-transform cursor-pointer"
                  >
                    <Plus size={14} className="stroke-[3]" />
                    <span>Agregar</span>
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
