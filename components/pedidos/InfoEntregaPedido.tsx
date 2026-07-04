import { useState } from 'react'
import { Pedido } from '@/tipos'
import { crearEnlaceGoogleMaps } from '@/lib/ubicacion'
import { esPedidoDelivery, obtenerResumenEntrega } from '@/lib/entrega'
import BadgeTipoEntrega from './BadgeTipoEntrega'
import { cn } from '@/lib/utils'
import ModalVistaMapa from './ModalVistaMapa'

interface PropsInfoEntregaPedido {
  pedido: Pedido
  /** Estilo destacado para cadetería */
  destacado?: boolean
}

export default function InfoEntregaPedido({ pedido, destacado = false }: PropsInfoEntregaPedido) {
  const [mostrarMapa, setMostrarMapa] = useState(false)
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
          onClick={() => { if (pedido.coordenadas) setMostrarMapa(true) }}
          className={cn(
            'border rounded-xl p-3 shadow-sm transition-all',
            pedido.coordenadas ? 'cursor-pointer hover:shadow-md' : '',
            esDelivery
              ? 'bg-chefsy-50/50 border-chefsy-100 hover:border-chefsy-200'
              : 'bg-slate-50/50 border-slate-100'
          )}
        >
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
            {esDelivery ? 'Dirección de entrega' : 'Modalidad'}
            {esDelivery && pedido.coordenadas && <span className="text-chefsy-600">(Ver mapa)</span>}
            {esDelivery && !pedido.coordenadas && <a href={crearEnlaceGoogleMaps(null, pedido.direccion)} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-0.5 ml-1 font-extrabold" onClick={(e) => e.stopPropagation()}>(🔍 Buscar en Maps)</a>}
          </p>
          <p className="text-sm font-semibold text-slate-800 leading-snug">{resumen}</p>
        </div>
        {mostrarMapa && pedido.coordenadas && (
          <ModalVistaMapa pedido={pedido} onClose={() => setMostrarMapa(false)} />
        )}
      </div>
    )
  }

  return (
    <div className="flex items-center flex-wrap gap-2 text-xs text-gray-600">
      <BadgeTipoEntrega tipoEntrega={pedido.tipoEntrega} className="text-[10px] px-1.5 py-0" />
      {esDelivery ? (
        pedido.coordenadas ? (
          <>
            <button
              onClick={() => setMostrarMapa(true)}
              className="hover:underline flex items-center gap-1 font-medium text-chefsy-800 transition-colors text-left"
              title="Ver ubicación en mapa"
            >
              <span>📍</span>
              <span className="truncate max-w-[180px]">{resumen}</span>
              {typeof pedido.distanciaKm === 'number' && (
                <span className="text-gray-400 font-normal shrink-0">({pedido.distanciaKm.toFixed(1)} km)</span>
              )}
            </button>
            {mostrarMapa && (
              <ModalVistaMapa pedido={pedido} onClose={() => setMostrarMapa(false)} />
            )}
          </>
        ) : (
          <a
            href={crearEnlaceGoogleMaps(null, pedido.direccion)}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline flex items-center gap-1 font-medium text-blue-600 transition-colors text-left"
            title="Buscar dirección en Google Maps"
          >
            <span>📍</span>
            <span className="truncate max-w-[180px]">{resumen}</span>
            <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded ml-1 font-bold">🔍 Maps</span>
          </a>
        )
      ) : (
        <span className="font-medium">🏪 {resumen}</span>
      )}
    </div>
  )
}
