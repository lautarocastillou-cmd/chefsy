'use client'

// ─────────────────────────────────────────────────────
// components/productos/FilaProductoPedido.tsx
// Una fila: categoría + producto + cantidad + precio + modificadores.
// ─────────────────────────────────────────────────────

import { FilaProductoPedido as FilaProducto, ModificadorCatalogo } from '@/tipos/catalogo'
import { obtenerProductoCatalogoPorId } from '@/lib/catalogo'
import { usarPedidos } from '@/contexto/PedidosContexto'
import SelectorCategoria from './SelectorCategoria'
import SelectorProducto from './SelectorProducto'

interface PropsFilaProductoPedido {
  fila: FilaProducto
  indice: number
  puedeEliminar: boolean
  onCambio: (indice: number, fila: FilaProducto) => void
  onEliminar: (indice: number) => void
}

const claseSelect =
  'w-full border border-gray-300 dark:border-slate-700 rounded-md px-2 py-2 text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-chefsy focus:border-transparent dark:bg-slate-800 dark:text-slate-100'

const claseNumero =
  'border border-gray-300 dark:border-slate-700 rounded-md px-2 py-2 text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 w-full dark:bg-slate-800 dark:text-slate-100'

export default function FilaProductoPedido({
  fila,
  indice,
  puedeEliminar,
  onCambio,
  onEliminar,
}: PropsFilaProductoPedido) {
  const { modificadores, categorias } = usarPedidos()

  const actualizar = (parcial: Partial<FilaProducto>) => {
    onCambio(indice, { ...fila, ...parcial })
  }

  const manejarCategoria = (idCategoria: string) => {
    const cat = categorias.find(c => c.id === idCategoria)
    onCambio(indice, {
      ...fila,
      idCategoria,
      nombreCategoria: cat?.nombre,
      idProductoCatalogo: '',
      nombreProducto: undefined,
      precio: 0,
      modificadoresSeleccionadosIds: [],
    })
  }

  const manejarProducto = (idProductoCatalogo: string) => {
    const producto = obtenerProductoCatalogoPorId(idProductoCatalogo)
    onCambio(indice, {
      ...fila,
      idProductoCatalogo,
      nombreProducto: producto?.nombre,
      precio: producto?.precio ?? 0,
      modificadoresSeleccionadosIds: [],
    })
  }

  // Cargar modificadores asociados al producto seleccionado
  const productoCatalogo = fila.idProductoCatalogo
    ? obtenerProductoCatalogoPorId(fila.idProductoCatalogo)
    : null

  const modificadoresDisponibles = productoCatalogo?.modificadoresIds || []

  const listadoModificadores = modificadores.filter((m) =>
    modificadoresDisponibles.includes(m.id)
  )

  const alternarModificador = (mod: ModificadorCatalogo) => {
    const seleccionados = fila.modificadoresSeleccionadosIds || []
    const existe = seleccionados.includes(mod.id)
    const nuevosIds = existe
      ? seleccionados.filter((id) => id !== mod.id)
      : [...seleccionados, mod.id]

    // Recalcular precio: base + modificadores seleccionados
    const basePrice = productoCatalogo?.precio ?? 0
    let totalExtra = 0
    nuevosIds.forEach((id) => {
      const m = modificadores.find((x) => x.id === id)
      if (m) {
        totalExtra += m.precioExtra
      }
    })

    onCambio(indice, {
      ...fila,
      modificadoresSeleccionadosIds: nuevosIds,
      precio: basePrice + totalExtra,
    })
  }

  return (
    <div className="flex flex-col gap-2 border border-slate-200 dark:border-slate-800/80 p-3.5 rounded-2xl bg-white dark:bg-slate-900/40 sm:border-0 sm:p-0 sm:bg-transparent transition-colors">
      {/* Grid de Controles */}
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_64px_96px_32px] gap-2 items-center">
        <SelectorCategoria
          valor={fila.idCategoria}
          onCambio={manejarCategoria}
          claseSelect={claseSelect}
        />

        <SelectorProducto
          idCategoria={fila.idCategoria}
          valor={fila.idProductoCatalogo}
          onCambio={manejarProducto}
          claseSelect={claseSelect}
        />

        <div>
          <label className="block sm:hidden text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">
            Cant.
          </label>
          <input
            type="number"
            value={fila.cantidad}
            min={1}
            onChange={(e) =>
              actualizar({ cantidad: Math.max(1, parseInt(e.target.value) || 1) })
            }
            className={`${claseNumero} text-center`}
            aria-label="Cantidad"
          />
        </div>

        <div>
          <label className="block sm:hidden text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">
            Precio unit.
          </label>
          <input
            type="number"
            value={fila.precio}
            min={0}
            step={100}
            onChange={(e) =>
              actualizar({ precio: parseFloat(e.target.value) || 0 })
            }
            className={`${claseNumero} text-right`}
            aria-label="Precio unitario"
          />
        </div>

        <button
          type="button"
          onClick={() => onEliminar(indice)}
          disabled={!puedeEliminar}
          className="hidden sm:flex text-slate-400 hover:text-red-500 disabled:opacity-20 text-lg items-center justify-center h-full focus:outline-none"
          title="Eliminar producto"
        >
          ✕
        </button>
      </div>

      {/* Modificadores */}
      {listadoModificadores.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-1 py-1 mt-0.5 border-t border-dashed border-slate-100 dark:border-slate-800/60 sm:border-0 sm:pt-0">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider self-center mr-1 select-none">
            Adicionales:
          </span>
          {listadoModificadores.map((mod) => {
            const estaSeleccionado = fila.modificadoresSeleccionadosIds?.includes(mod.id)
            return (
              <label
                key={mod.id}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-bold cursor-pointer select-none transition-colors ${
                  estaSeleccionado
                    ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-300'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 text-slate-500 dark:text-slate-400 hover:bg-slate-100/60'
                }`}
              >
                <input
                  type="checkbox"
                  checked={estaSeleccionado}
                  onChange={() => alternarModificador(mod)}
                  className="hidden"
                />
                <span>{mod.nombre}</span>
                {mod.precioExtra > 0 && (
                  <span className="text-[9px] text-slate-400 font-medium ml-0.5">
                    (+${mod.precioExtra})
                  </span>
                )}
              </label>
            )
          })}
        </div>
      )}

      {/* Botón de eliminación en móvil para facilidad de uso */}
      <button
        type="button"
        onClick={() => onEliminar(indice)}
        disabled={!puedeEliminar}
        className="sm:hidden w-full py-1 bg-red-50/30 dark:bg-red-950/10 border border-red-100/40 dark:border-red-950/20 text-red-500 hover:text-red-600 disabled:opacity-20 text-[10px] font-bold rounded-lg focus:outline-none"
      >
        ✕ Quitar producto
      </button>
    </div>
  )
}
