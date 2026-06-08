'use client'

// ─────────────────────────────────────────────────────
// components/productos/SeccionProductosPedido.tsx
// Lista de productos del pedido con catálogo centralizado.
// ─────────────────────────────────────────────────────

import { FilaProductoPedido } from '@/tipos/catalogo'
import { ProductoCatalogo } from '@/tipos/catalogo'
import { calcularTotalFilas } from '@/lib/catalogo'
import { formatearPrecio, generarIdProducto } from '@/lib/utils'
import FilaProductoPedidoComponente from './FilaProductoPedido'
import { usarPedidos } from '@/contexto/PedidosContexto'
import { Search, X, Plus } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

interface PropsSeccionProductosPedido {
  filas: FilaProductoPedido[]
  onFilasChange: (filas: FilaProductoPedido[]) => void
}

export function crearFilaProductoVacia(): FilaProductoPedido {
  return {
    id: generarIdProducto(),
    idCategoria: '',
    idProductoCatalogo: '',
    cantidad: 1,
    precio: 0,
  }
}

export default function SeccionProductosPedido({
  filas,
  onFilasChange,
}: PropsSeccionProductosPedido) {
  const { productos, categorias } = usarPedidos()
  const total = calcularTotalFilas(filas)

  const [mostrarBuscador, setMostrarBuscador] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const inputBuscadorRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (mostrarBuscador && inputBuscadorRef.current) {
      inputBuscadorRef.current.focus()
    }
  }, [mostrarBuscador])

  const agregarProductoRapido = (producto: ProductoCatalogo) => {
    onFilasChange([
      ...filas,
      {
        id: generarIdProducto(),
        idCategoria: producto.categoriaId,
        idProductoCatalogo: producto.id,
        cantidad: 1,
        precio: producto.precio,
      }
    ])
    setBusqueda('')
    setMostrarBuscador(false)
  }

  const productosFiltrados = busqueda.trim() === '' 
    ? [] 
    : productos.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()) && p.activo).slice(0, 6)

  const manejarCambioFila = (indice: number, fila: FilaProductoPedido) => {
    const copia = [...filas]
    copia[indice] = fila
    onFilasChange(copia)
  }

  const agregarFila = () => {
    onFilasChange([...filas, crearFilaProductoVacia()])
  }

  const eliminarFila = (indice: number) => {
    if (filas.length === 1) return
    onFilasChange(filas.filter((_, i) => i !== indice))
  }

  return (
    <section className="relative">
      <div className="flex items-center justify-between mb-3 relative">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Productos
        </h3>
        <button
          type="button"
          onClick={() => {
            setMostrarBuscador(!mostrarBuscador)
            if (mostrarBuscador) setBusqueda('')
          }}
          className="text-gray-400 hover:text-chefsy focus:outline-none p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          title="Buscar producto"
        >
          {mostrarBuscador ? <X size={16} /> : <Search size={16} />}
        </button>

        {/* Buscador Desplegable */}
        {mostrarBuscador && (
          <div className="absolute top-8 right-0 w-full sm:w-80 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="p-2 border-b border-gray-100 dark:border-slate-700 flex items-center gap-2">
              <Search size={16} className="text-gray-400 ml-1" />
              <input
                ref={inputBuscadorRef}
                type="text"
                placeholder="Buscar producto..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full bg-transparent border-none focus:ring-0 text-sm p-1 outline-none dark:text-white"
              />
            </div>
            
            <div className="max-h-60 overflow-y-auto">
              {busqueda.trim() !== '' && productosFiltrados.length === 0 ? (
                <div className="p-4 text-center text-xs text-gray-500">
                  No se encontraron productos.
                </div>
              ) : (
                productosFiltrados.map(prod => (
                  <button
                    key={prod.id}
                    type="button"
                    onClick={() => agregarProductoRapido(prod)}
                    className="w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-slate-700/50 flex items-center justify-between group transition-colors border-b border-gray-50 dark:border-slate-700/30 last:border-0"
                  >
                    <div>
                      <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-chefsy">{prod.nombre}</div>
                      <div className="text-[10px] text-gray-400">
                        {categorias.find(c => c.id === prod.categoriaId)?.nombre || 'Categoría'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-600 dark:text-gray-300">{formatearPrecio(prod.precio)}</span>
                      <Plus size={14} className="text-gray-300 group-hover:text-chefsy" />
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Encabezado (desktop) */}
      <div className="hidden sm:grid sm:grid-cols-[1fr_1fr_64px_96px_32px] gap-2 mb-1 px-1">
        <span className="text-xs text-gray-400">Categoría</span>
        <span className="text-xs text-gray-400">Producto</span>
        <span className="text-xs text-gray-400 text-center">Cant.</span>
        <span className="text-xs text-gray-400 text-right">Precio unit.</span>
        <span />
      </div>

      <div className="space-y-2">
        {filas.map((fila, indice) => (
          <FilaProductoPedidoComponente
            key={fila.id}
            fila={fila}
            indice={indice}
            puedeEliminar={filas.length > 1}
            onCambio={manejarCambioFila}
            onEliminar={eliminarFila}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={agregarFila}
        className="mt-2 w-full text-sm text-gray-500 border border-dashed border-gray-300 rounded-md py-2 hover:bg-gray-50 hover:border-gray-400"
      >
        + Agregar producto
      </button>

      <div className="flex items-center justify-between bg-chefsy-50 border border-chefsy-200 rounded-md px-4 py-3 mt-4">
        <span className="text-sm font-medium text-chefsy-700">Total</span>
        <span className="text-lg font-bold text-chefsy-800">{formatearPrecio(total)}</span>
      </div>
    </section>
  )
}
