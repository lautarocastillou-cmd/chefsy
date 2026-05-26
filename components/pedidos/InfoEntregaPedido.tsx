import { Pedido } from '@/tipos'
import { crearEnlaceGoogleMaps } from '@/lib/ubicacion'
import { esPedidoDelivery, obtenerResumenEntrega } from '@/lib/entrega'
import BadgeTipoEntrega from './BadgeTipoEntrega'
import { cn } from '@/lib/utils'

interface PropsInfoEntregaPedido {
  pedido: Pedido
  /** Estilo destacado para cadetería */
  destacado?: boolean
}

export default function InfoEntregaPedido({ pedido, destacado = false }: PropsInfoEntregaPedido) {
  const esDelivery = esPedidoDelivery(pedido)
  const resumen = obtenerResumenEntrega(pedido)

  if (destacado) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <BadgeTipoEntrega tipoEntrega={pedido.tipoEntrega} className="text-xs" />
          {typeof pedido.distanciaKm === 'number' && (
            <span className="text-xs text-slate-500">({pedido.distanciaKm.toFixed(1)} km)</span>
          )}
        </div>
        <div
          className={cn(
            'border rounded-xl p-3 shadow-sm transition-all',
            esDelivery
              ? 'bg-chefsy-50/50 border-chefsy-100 hover:border-chefsy-200'
              : 'bg-slate-50/50 border-slate-100'
          )}
        >
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
            {esDelivery ? 'Dirección de entrega' : 'Modalidad'}
          </p>
          <p className="text-sm font-semibold text-slate-800 leading-snug">{resumen}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center flex-wrap gap-2 text-xs text-gray-600">
      <BadgeTipoEntrega tipoEntrega={pedido.tipoEntrega} className="text-[10px] px-1.5 py-0" />
      {esDelivery ? (
        pedido.coordenadas ? (
          <a
            href={crearEnlaceGoogleMaps(pedido.coordenadas)}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline flex items-center gap-1 font-medium text-chefsy-800 transition-colors"
            title="Ver ubicación en mapa"
          >
            <span>📍</span>
            <span className="truncate max-w-[180px]">{resumen}</span>
            {typeof pedido.distanciaKm === 'number' && (
              <span className="text-gray-400 font-normal">({pedido.distanciaKm.toFixed(1)} km)</span>
            )}
          </a>
        ) : (
          <span className="truncate max-w-[180px] font-medium">📍 {resumen}</span>
        )
      ) : (
        <span className="font-medium">🏪 {resumen}</span>
      )}
    </div>
  )
}
