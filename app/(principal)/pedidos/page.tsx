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
import Link from 'next/link'
import { Plus, X } from 'lucide-react'
import FormularioPedido from '@/components/pedidos/FormularioPedido'

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
  const [modalNuevoPedidoAbierto, setModalNuevoPedidoAbierto] = useState(false)

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

      {/* ── Botón Flotante para Crear Pedido ── */}
      <button
        onClick={() => setModalNuevoPedidoAbierto(true)}
        className="fixed bottom-6 right-6 z-40 bg-chefsy hover:bg-chefsy-700 text-white font-bold py-3 px-5 rounded-full shadow-lg shadow-chefsy/20 flex items-center gap-2 hover:scale-105 active:scale-95 transition-all text-sm cursor-pointer"
      >
        <Plus size={18} />
        <span>Crear Pedido</span>
      </button>

      {/* ── Modal de Nuevo Pedido ── */}
      {modalNuevoPedidoAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 rounded-3xl p-6 shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
            {/* Header del Modal */}
            <div className="flex items-center justify-between border-b border-gray-150 dark:border-slate-800 pb-3 mb-4 shrink-0">
              <div>
                <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
                  📝 Nuevo Pedido
                </h2>
                <p className="text-xs text-gray-400 dark:text-slate-400">Registrar una orden desde el panel</p>
              </div>
              <button
                onClick={() => setModalNuevoPedidoAbierto(false)}
                className="text-slate-450 hover:text-slate-600 dark:hover:text-white p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none"
              >
                <X size={20} />
              </button>
            </div>
            {/* Contenido del Modal (Scrollable) */}
            <div className="flex-1 overflow-y-auto pr-1">
              <FormularioPedido onClose={() => setModalNuevoPedidoAbierto(false)} />
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
