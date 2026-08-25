'use client'

// ─────────────────────────────────────────────────────
// components/productos/SeccionProductosPedido.tsx
// Lista de productos del pedido con buscador y catálogo integrado.
// ─────────────────────────────────────────────────────

import { FilaProductoPedido } from '@/tipos/catalogo'
import { calcularTotalFilas } from '@/lib/catalogo'
import { formatearPrecio, generarIdProducto } from '@/lib/utils'
import FilaProductoPedidoComponente from './FilaProductoPedido'
import { Plus } from 'lucide-react'

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
  const total = calcularTotalFilas(filas)

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
        <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Productos del Pedido
        </h3>
      </div>

      {/* Encabezado (desktop) */}
      <div className="hidden sm:grid sm:grid-cols-[1fr_1.3fr_64px_96px_32px] gap-2 mb-1 px-1">
        <span className="text-xs font-semibold text-gray-400">Categoría (opcional)</span>
        <span className="text-xs font-semibold text-gray-400">Producto / Buscador</span>
        <span className="text-xs font-semibold text-gray-400 text-center">Cant.</span>
        <span className="text-xs font-semibold text-gray-400 text-right">Precio unit.</span>
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
