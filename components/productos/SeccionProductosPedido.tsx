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
import ModalPromoMixta from './ModalPromoMixta'
import { usarPedidos } from '@/contexto/PedidosContexto'
import { Search, X, Plus, Sparkles } from 'lucide-react'
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
  const [modalPromoAbierto, setModalPromoAbierto] = useState(false)
  const inputBuscadorRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (mostrarBuscador) {
      const focusTimeout = setTimeout(() => {
        if (inputBuscadorRef.current) {
          inputBuscadorRef.current.focus()
          inputBuscadorRef.current.select()
        }
      }, 30)
      return () => clearTimeout(focusTimeout)
    }
  }, [mostrarBuscador])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cerrar buscador con Escape
      if (e.key === 'Escape' && mostrarBuscador) {
        e.preventDefault()
        setMostrarBuscador(false)
        setBusqueda('')
        return
      }

      // Detectar teclas < y > por todos sus caracteres, códigos físicos y keyCode en Windows/Mac/Linux
      const esTeclaMenorMayor = 
        e.key === '<' || 
        e.key === '>' || 
        e.code === 'IntlBackslash' || 
        e.code === 'Backslash' || 
        e.code === 'Backquote' ||
        e.code === 'Comma' ||
        e.code === 'Period' ||
        e.keyCode === 226 ||
        e.keyCode === 188 ||
        e.keyCode === 190 ||
        e.keyCode === 60 ||
        e.keyCode === 62;

      // Acceso directo universal Ctrl + K
      const esBuscarAlternativo = e.key.toLowerCase() === 'k' || e.code === 'KeyK' || e.keyCode === 75;

      if ((e.ctrlKey || e.metaKey) && (esTeclaMenorMayor || esBuscarAlternativo)) {
        e.preventDefault()
        e.stopPropagation()
        setMostrarBuscador(true)
      }
    }

    // Usar useCapture: true para interceptar el evento antes que cualquier input o modal lo detenga
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [mostrarBuscador])

  const agregarProductoRapido = (producto: ProductoCatalogo) => {
    const cat = categorias.find(c => c.id === producto.categoriaId)
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
      }
    ])
    setBusqueda('')
    setMostrarBuscador(false)
  }

  const manejarInsertarPromo = (filasNuevas: FilaProductoPedido[]) => {
    // Si solo había 1 fila vacía, la reemplazamos
    if (filas.length === 1 && !filas[0].idProductoCatalogo) {
      onFilasChange(filasNuevas)
    } else {
      onFilasChange([...filas, ...filasNuevas])
    }
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
        
        <div className="flex items-center gap-2">
          {/* Botón Acceso Rápido Promo Mixta */}
          <button
            type="button"
            onClick={() => setModalPromoAbierto(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-95 text-white rounded-xl text-xs font-black transition-all shadow-sm shadow-amber-500/20"
            title="Armar y agregar combo/promo mixta con descuento de stock automático"
          >
            <Sparkles size={14} />
            <span>🎁 Promo Mixta ($23k)</span>
          </button>

          {/* Botón Buscador */}
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
        </div>

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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
        <button
          type="button"
          onClick={agregarFila}
          className="w-full text-xs font-bold text-slate-600 dark:text-slate-300 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5"
        >
          <Plus size={15} />
          <span>Agregar producto</span>
        </button>

        <button
          type="button"
          onClick={() => setModalPromoAbierto(true)}
          className="w-full text-xs font-bold text-amber-700 dark:text-amber-300 border border-dashed border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl py-2.5 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors flex items-center justify-center gap-1.5"
        >
          <Sparkles size={15} className="text-amber-500" />
          <span>Armar Promo Mixta (1-Click)</span>
        </button>
      </div>

      <div className="flex items-center justify-between bg-chefsy-50 dark:bg-slate-800/60 border border-chefsy-200 dark:border-slate-700 rounded-xl px-4 py-3 mt-4">
        <span className="text-sm font-semibold text-chefsy-700 dark:text-slate-300">Subtotal Productos</span>
        <span className="text-lg font-black text-chefsy-800 dark:text-white">{formatearPrecio(total)}</span>
      </div>

      {/* Modal de Promo Mixta */}
      <ModalPromoMixta
        abierto={modalPromoAbierto}
        onClose={() => setModalPromoAbierto(false)}
        onInsertarPromo={manejarInsertarPromo}
        productos={productos}
        categorias={categorias}
      />
    </section>
  )
}
