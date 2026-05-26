'use client'

// ─────────────────────────────────────────────────────
// app/(principal)/pedidos/page.tsx
// Lista completa de pedidos con filtros por estado.
// ─────────────────────────────────────────────────────

import { useState } from 'react'
import { usarPedidos } from '@/contexto/PedidosContexto'
import TarjetaPedido from '@/components/pedidos/TarjetaPedido'
import { EstadoPedido, TipoEntrega } from '@/tipos'
import { opcionesTipoEntrega } from '@/lib/entrega'
import { cn } from '@/lib/utils'

// Opciones del filtro de estado
const opcionesFiltro: { valor: EstadoPedido | 'todos'; etiqueta: string }[] = [
  { valor: 'todos',      etiqueta: 'Todos' },
  { valor: 'nuevo',      etiqueta: 'Nuevos' },
  { valor: 'en_cocina',  etiqueta: 'En Cocina' },
  { valor: 'listo',      etiqueta: 'Listos' },
  { valor: 'en_reparto', etiqueta: 'En Reparto' },
  { valor: 'entregado',  etiqueta: 'Entregados' },
  { valor: 'cancelado',  etiqueta: 'Cancelados' },
]

export default function PaginaPedidos() {
  const { pedidos } = usarPedidos()
  const [filtroActivo, setFiltroActivo] = useState<EstadoPedido | 'todos'>('todos')
  const [filtroEntrega, setFiltroEntrega] = useState<TipoEntrega | 'todos'>('todos')

  const pedidosFiltrados = pedidos.filter((p) => {
    const coincideEstado = filtroActivo === 'todos' || p.estado === filtroActivo
    const coincideEntrega = filtroEntrega === 'todos' || p.tipoEntrega === filtroEntrega
    return coincideEstado && coincideEntrega
  })

  return (
    <div className="space-y-5">

      {/* ── Barra superior ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Filtros */}
        <div className="flex flex-wrap gap-1.5">
          {opcionesFiltro.map((opcion) => (
            <button
              key={opcion.valor}
              onClick={() => setFiltroActivo(opcion.valor)}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium',
                filtroActivo === opcion.valor
                  ? 'bg-chefsy text-white'
                  : 'bg-white border border-chefsy-200 text-gray-600 hover:bg-chefsy-50'
              )}
            >
              {opcion.etiqueta}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
          <button
            onClick={() => setFiltroEntrega('todos')}
            className={cn(
              'px-3 py-1.5 rounded-md text-xs font-medium border',
              filtroEntrega === 'todos'
                ? 'bg-gray-800 text-white border-gray-800'
                : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
            )}
          >
            Todos los tipos
          </button>
          {opcionesTipoEntrega.map((opcion) => (
            <button
              key={opcion.valor}
              onClick={() => setFiltroEntrega(opcion.valor)}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium border',
                filtroEntrega === opcion.valor
                  ? 'bg-gray-800 text-white border-gray-800'
                  : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
              )}
            >
              {opcion.icono} {opcion.etiqueta}
            </button>
          ))}
        </div>


      </div>

      {/* ── Contador ── */}
      <p className="text-sm text-gray-400">
        {pedidosFiltrados.length}{' '}
        {pedidosFiltrados.length === 1 ? 'pedido' : 'pedidos'}
      </p>

      {/* ── Lista de pedidos ── */}
      {pedidosFiltrados.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          No hay pedidos en este estado.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {pedidosFiltrados.map((pedido) => (
            <TarjetaPedido key={pedido.id} pedido={pedido} />
          ))}
        </div>
      )}

    </div>
  )
}
