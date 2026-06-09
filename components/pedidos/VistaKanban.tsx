'use client'

import { Pedido } from '@/tipos'
import TarjetaPedidoCompacta from './TarjetaPedidoCompacta'
import { PlusCircle, ChefHat, CheckCircle2, Bike } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PropsVistaKanban {
  pedidos: Pedido[]
  onEditarPedido: (pedido: Pedido) => void
}

export default function VistaKanban({ pedidos, onEditarPedido }: PropsVistaKanban) {
  // Filtramos pedidos cancelados o entregados (para no mostrar basura en el kanban)
  const pedidosActivos = pedidos.filter(p => p.estado !== 'cancelado' && p.estado !== 'entregado')

  // Agrupamos por columna
  const nuevos = pedidosActivos.filter(p => p.estado === 'nuevo')
  const enCocina = pedidosActivos.filter(p => p.estado === 'en_cocina')
  const listos = pedidosActivos.filter(p => p.estado === 'listo')
  
  // "En Reparto" es un estado derivado para pedidos que ya pasaron de listo pero no están "entregados"
  // (En nuestro flujo actual, si es delivery y se marcó como listo y tiene cadete, está en reparto.
  // Pero formalmente nuestro estado llega a 'entregado'. Vamos a agrupar todo lo demás acá si hubiera).
  // Como solo nos quedan activos, en_cocina, listo y nuevo, la columna "En Reparto" va a estar vacía
  // a menos que haya estados intermedios. Para que sea útil, vamos a cambiar la lógica del KANBAN:
  // Columna 1: Nuevos
  // Columna 2: En Cocina
  // Columna 3: Listos
  // Columna 4: En Reparto (vamos a poner los listos que son delivery acá si queremos separarlos, 
  // pero para no romper la lógica actual, mostraremos los que su tipoEntrega sea delivery y estén listos).
  
  // Mejor agrupamos exactamente por los estados reales para no confundir:
  // 1. Nuevos (nuevo)
  // 2. En Cocina (en_cocina)
  // 3. Listos para entregar (listo)
  // 4. Entregados recientes (entregado, limitados a los últimos 5 para tener un registro visual)
  // El usuario pidió "Nuevos | En Cocina | Listos | En Reparto".
  // Haremos:
  const enReparto = pedidosActivos.filter(p => p.estado === 'listo' && p.tipoEntrega === 'delivery')
  const listosLocal = pedidosActivos.filter(p => p.estado === 'listo' && p.tipoEntrega !== 'delivery')

  const columnas = [
    {
      id: 'nuevo',
      titulo: 'Nuevos',
      icono: PlusCircle,
      color: 'text-blue-500',
      bg: 'bg-blue-500',
      borde: 'border-blue-200 dark:border-blue-900/50',
      fondo: 'bg-blue-50/50 dark:bg-blue-950/10',
      items: nuevos,
    },
    {
      id: 'en_cocina',
      titulo: 'En Cocina',
      icono: ChefHat,
      color: 'text-orange-500',
      bg: 'bg-orange-500',
      borde: 'border-orange-200 dark:border-orange-900/50',
      fondo: 'bg-orange-50/50 dark:bg-orange-950/10',
      items: enCocina,
    },
    {
      id: 'listo',
      titulo: 'Listos',
      icono: CheckCircle2,
      color: 'text-amber-500',
      bg: 'bg-amber-500',
      borde: 'border-amber-200 dark:border-amber-900/50',
      fondo: 'bg-amber-50/50 dark:bg-amber-950/10',
      items: listosLocal,
    },
    {
      id: 'en_reparto',
      titulo: 'En Reparto',
      icono: Bike,
      color: 'text-green-500',
      bg: 'bg-green-500',
      borde: 'border-green-200 dark:border-green-900/50',
      fondo: 'bg-green-50/50 dark:bg-green-950/10',
      items: enReparto,
    },
  ]

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory">
      {columnas.map(col => {
        const Icono = col.icono
        return (
          <div 
            key={col.id} 
            className={cn(
              "flex flex-col min-w-[280px] w-[280px] lg:flex-1 shrink-0 rounded-2xl border bg-white dark:bg-[#1a1a1a] snap-center overflow-hidden",
              col.borde
            )}
          >
            {/* Header de la columna */}
            <div className={cn("p-3 border-b flex items-center justify-between", col.borde, col.fondo)}>
              <div className="flex items-center gap-2">
                <Icono size={18} className={col.color} />
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                  {col.titulo}
                </h3>
              </div>
              <span className={cn(
                "px-2 py-0.5 rounded-full text-xs font-bold text-white shadow-sm",
                col.bg
              )}>
                {col.items.length}
              </span>
            </div>

            {/* Lista de tarjetas (scrollable vertical) */}
            <div className={cn("flex-1 p-2.5 overflow-y-auto space-y-2.5 max-h-[calc(100vh-280px)]", col.fondo)}>
              {col.items.length === 0 ? (
                <div className="h-full min-h-[150px] flex items-center justify-center p-4 border-2 border-dashed border-slate-200 dark:border-[#333] rounded-xl">
                  <span className="text-sm font-medium text-slate-400 dark:text-[#666]">
                    0 pedidos
                  </span>
                </div>
              ) : (
                col.items.map(pedido => (
                  <TarjetaPedidoCompacta 
                    key={pedido.id} 
                    pedido={pedido} 
                    onClickDetalle={() => onEditarPedido(pedido)}
                  />
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
