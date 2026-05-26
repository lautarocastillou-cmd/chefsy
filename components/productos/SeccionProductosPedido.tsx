'use client'

// ─────────────────────────────────────────────────────
// components/productos/SeccionProductosPedido.tsx
// Lista de productos del pedido con catálogo centralizado.
// ─────────────────────────────────────────────────────

import { FilaProductoPedido } from '@/tipos/catalogo'
import { calcularTotalFilas } from '@/lib/catalogo'
import { formatearPrecio, generarIdProducto } from '@/lib/utils'
import FilaProductoPedidoComponente from './FilaProductoPedido'

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
    <section>
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
        Productos
      </h3>

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
