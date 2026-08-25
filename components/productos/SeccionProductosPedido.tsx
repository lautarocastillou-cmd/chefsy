'use client'

// ─────────────────────────────────────────────────────
// components/productos/SeccionProductosPedido.tsx
// Lista de productos del pedido con buscador, acceso rápido Ctrl + K y catálogo integrado.
// ─────────────────────────────────────────────────────

import { useState, useRef, useEffect } from 'react'
import { FilaProductoPedido, ProductoCatalogo } from '@/tipos/catalogo'
import { calcularTotalFilas } from '@/lib/catalogo'
import { formatearPrecio, generarIdProducto } from '@/lib/utils'
import FilaProductoPedidoComponente from './FilaProductoPedido'
import { usarPedidos } from '@/contexto/PedidosContexto'
import { Plus, Search, X } from 'lucide-react'

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

  // Autofoco al abrir el buscador
  useEffect(() => {
    if (mostrarBuscador) {
      const focusTimeout = setTimeout(() => {
        if (inputBuscadorRef.current) {
          inputBuscadorRef.current.focus()
          inputBuscadorRef.current.select()
        }
      }, 40)
      return () => clearTimeout(focusTimeout)
    }
  }, [mostrarBuscador])

  // Atajo de teclado universal Ctrl + K y Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mostrarBuscador) {
        e.preventDefault()
        setMostrarBuscador(false)
        setBusqueda('')
        return
      }

      // Detectar Ctrl+K o Cmd+K
      const esCtrlK = (e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'k' || e.code === 'KeyK')
      if (esCtrlK) {
        e.preventDefault()
        e.stopPropagation()
        setMostrarBuscador(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [mostrarBuscador])

  const agregarProductoRapido = (producto: ProductoCatalogo) => {
    const cat = categorias.find((c) => c.id === producto.categoriaId)
    // Si la única fila existente está vacía, la reemplazamos
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
    setBusqueda('')
    setMostrarBuscador(false)
  }

  const productosFiltrados =
    busqueda.trim() === ''
      ? []
      : productos
          .filter(
            (p) =>
              p.activo &&
              (p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
                categorias
                  .find((c) => c.id === p.categoriaId)
                  ?.nombre.toLowerCase()
                  .includes(busqueda.toLowerCase()))
          )
          .slice(0, 8)

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
      {/* Cabecera de la Sección con Buscador Rápido Ctrl + K */}
      <div className="flex items-center justify-between mb-3 relative">
        <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Productos del Pedido
        </h3>

        <div className="flex items-center gap-2">
          {/* Botón Buscador Rápido con Badge Ctrl + K */}
          <button
            type="button"
            onClick={() => {
              setMostrarBuscador(!mostrarBuscador)
              if (mostrarBuscador) setBusqueda('')
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors shadow-2xs cursor-pointer"
            title="Buscar producto rápidamente (Ctrl + K)"
          >
            <Search size={13} className="text-chefsy" />
            <span>Buscador</span>
            <kbd className="text-[10px] font-black bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 px-1.5 py-0.5 rounded">
              Ctrl + K
            </kbd>
          </button>
        </div>

        {/* Modal / Popover flotante del Buscador Rápido Ctrl + K */}
        {mostrarBuscador && (
          <div className="absolute top-8 right-0 w-full sm:w-96 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-2xl z-[60] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="p-2.5 border-b border-gray-100 dark:border-slate-800 flex items-center gap-2 bg-slate-50/50 dark:bg-slate-800/40">
              <Search size={16} className="text-chefsy ml-1 shrink-0" />
              <input
                ref={inputBuscadorRef}
                type="text"
                placeholder="Escribí para buscar (ej: lomo, coca, mila)..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full bg-transparent border-none focus:ring-0 text-sm p-1 outline-none text-slate-900 dark:text-white placeholder:text-gray-400"
              />
              {busqueda && (
                <button
                  type="button"
                  onClick={() => setBusqueda('')}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-full"
                >
                  <X size={14} />
                </button>
              )}
              <button
                type="button"
                onClick={() => setMostrarBuscador(false)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-full ml-1"
                title="Cerrar (Esc)"
              >
                <kbd className="text-[10px] font-black text-slate-400 bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                  ESC
                </kbd>
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-gray-50 dark:divide-slate-800/50">
              {busqueda.trim() !== '' && productosFiltrados.length === 0 ? (
                <div className="p-5 text-center text-xs text-gray-400">
                  No se encontraron productos con "{busqueda}".
                </div>
              ) : (
                (busqueda.trim() === ''
                  ? productos.filter((p) => p.activo).slice(0, 8)
                  : productosFiltrados
                ).map((prod) => {
                  const catNombre = categorias.find((c) => c.id === prod.categoriaId)?.nombre
                  return (
                    <button
                      key={prod.id}
                      type="button"
                      onClick={() => agregarProductoRapido(prod)}
                      className="w-full text-left px-4 py-2.5 hover:bg-chefsy-50/50 dark:hover:bg-slate-800 flex items-center justify-between group transition-colors cursor-pointer"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-chefsy truncate">
                          {prod.nombre}
                        </div>
                        <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                          {catNombre || 'General'}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-black text-slate-700 dark:text-slate-300">
                          {formatearPrecio(prod.precio)}
                        </span>
                        <span className="p-1 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-400 group-hover:bg-chefsy group-hover:text-white transition-colors">
                          <Plus size={13} />
                        </span>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Encabezado (desktop) */}
      <div className="hidden sm:grid sm:grid-cols-[1fr_1.4fr_64px_96px_32px] gap-2 mb-1 px-1 text-slate-400 dark:text-slate-500 font-semibold text-[11px] uppercase tracking-wider">
        <span>Categoría (opc.)</span>
        <span>Producto / Buscador</span>
        <span className="text-center">Cant.</span>
        <span className="text-right">Precio unit.</span>
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

      <div className="mt-2.5">
        <button
          type="button"
          onClick={agregarFila}
          className="w-full text-xs font-bold text-slate-700 dark:text-slate-200 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-[0.99]"
        >
          <Plus size={15} />
          <span>+ Agregar otro producto</span>
        </button>
      </div>

      <div className="flex items-center justify-between bg-chefsy-50 dark:bg-slate-800/60 border border-chefsy-200 dark:border-slate-700 rounded-xl px-4 py-3 mt-4">
        <span className="text-sm font-semibold text-chefsy-700 dark:text-slate-300">Subtotal Productos</span>
        <span className="text-lg font-black text-chefsy-800 dark:text-white">{formatearPrecio(total)}</span>
      </div>
    </section>
  )
}
