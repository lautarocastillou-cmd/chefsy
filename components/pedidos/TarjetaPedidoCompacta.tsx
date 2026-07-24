'use client'

import { Pedido } from '@/tipos'
import { formatearPrecio } from '@/lib/utils'
import { obtenerSiguienteEstado } from '@/lib/entrega'
import IconoTipoEntrega from '@/components/ui/IconoTipoEntrega'
import { useRelojGlobal } from '@/hooks/useRelojGlobal'
import { cn } from '@/lib/utils'
import { ChevronRight } from 'lucide-react'
import { usarPedidos } from '@/contexto/PedidosContexto'

const bordesPorEstado: Record<Pedido['estado'], string> = {
  nuevo:      'border-l-[4px] border-l-blue-500',
  en_cocina:  'border-l-[4px] border-l-orange-500',
  listo:      'border-l-[4px] border-l-amber-500',
  en_camino:  'border-l-[4px] border-l-indigo-500',
  entregado:  'border-l-[4px] border-l-green-500',
  cancelado:  'border-l-[4px] border-l-red-500',
}

interface PropsTarjetaCompacta {
  pedido: Pedido
  onClickDetalle?: () => void
}

import React from 'react'

const TarjetaPedidoCompacta = React.memo(function TarjetaPedidoCompacta({ pedido, onClickDetalle }: PropsTarjetaCompacta) {
  const { cambiarEstado } = usarPedidos()
  const siguienteEstado = obtenerSiguienteEstado(pedido.estado, pedido.tipoEntrega)
  const esFinal = pedido.estado === 'entregado' || pedido.estado === 'cancelado'
  const ahoraDate = useRelojGlobal(!esFinal)
  const ahora = ahoraDate.getTime()

  // Calcular tiempo transcurrido total para mostrar
  const tInicial = new Date(pedido.created_at || ahora).getTime()
  const diffTotal = Math.floor((ahora - tInicial) / 60000)
  const minutos = diffTotal >= 60 ? `${Math.floor(diffTotal / 60)}h ${diffTotal % 60}m` : `${diffTotal}m`

  // Calcular si está demorado en su etapa actual
  let esAtrasado = false
  if (!esFinal) {
    let fechaInicio: string | null | undefined = null
    let limiteMs = 0

    if (pedido.estado === 'nuevo') {
      fechaInicio = pedido.created_at
      limiteMs = 1 * 60 * 1000 // 1 min
    } else if (pedido.estado === 'en_cocina') {
      fechaInicio = pedido.cocina_at || pedido.created_at
      limiteMs = 45 * 60 * 1000 // 45 min
    } else if (pedido.estado === 'listo') {
      fechaInicio = pedido.listo_at || pedido.cocina_at || pedido.created_at
      limiteMs = 10 * 60 * 1000 // 10 min
    }

    if (fechaInicio) {
      const startMs = new Date(fechaInicio).getTime()
      esAtrasado = ahora - startMs >= limiteMs
    }
  }

  const cantidadItems = pedido.productos.reduce((sum, p) => sum + p.cantidad, 0)
  const iconoEntrega = obtenerIconoTipoEntrega(pedido.tipoEntrega)

  const manejarAvance = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (siguienteEstado) {
      cambiarEstado(pedido.id, siguienteEstado)
    }
  }

  return (
    <div 
      onClick={onClickDetalle}
      className={cn(
        "bg-white dark:bg-[#252525] border border-slate-100 dark:border-[#3d3d3d] hover:border-slate-200 dark:hover:border-[#4d4d4d] rounded-xl p-2.5 flex flex-col gap-1.5 shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden cursor-pointer group",
        bordesPorEstado[pedido.estado],
        esAtrasado && "border-amber-300 dark:border-amber-900 bg-amber-50/20 dark:bg-amber-950/10 shadow-[0_0_10px_rgba(245,158,11,0.1)]"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <IconoTipoEntrega tipo={pedido.tipoEntrega} className="text-slate-500 dark:text-slate-400" />
            <h4 className="font-extrabold text-slate-800 dark:text-[#e6e6e6] text-sm truncate leading-none" title={pedido.cliente}>
              {pedido.cliente}
            </h4>
          </div>
        </div>
        
        <div className="flex items-center gap-1.5 shrink-0">
          {esAtrasado && (
            <span className="relative flex h-2 w-2">
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
          )}
          <span className="text-[10px] font-bold bg-slate-100 dark:bg-[#333] text-slate-600 dark:text-[#a8a8a8] px-1.5 py-0.5 rounded-md">
            {minutos}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between mt-0.5">
        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-[#a8a8a8] font-medium">
          <span>{cantidadItems} {cantidadItems === 1 ? 'item' : 'items'}</span>
          <span className="text-slate-300 dark:text-[#686868]">•</span>
          <span className="font-bold text-slate-700 dark:text-[#e6e6e6]">{formatearPrecio(pedido.total)}</span>
          {pedido.metodoPago === 'sin_especificar' && (
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 ml-1" title="Falta método de pago" />
          )}
        </div>

        {!esFinal && siguienteEstado && (
          <button
            onClick={manejarAvance}
            className="p-1 rounded-full bg-chefsy-50 dark:bg-chefsy-900/30 text-chefsy hover:bg-chefsy hover:text-white transition-colors border border-chefsy/20 hover:scale-110 active:scale-95"
            title="Avanzar pedido"
          >
            <ChevronRight size={14} strokeWidth={3} />
          </button>
        )}
      </div>
    </div>
  )
})

export default TarjetaPedidoCompacta
