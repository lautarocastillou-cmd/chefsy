'use client'

import { Pedido } from '@/tipos'
import MapaSeguimiento from '@/components/ubicacion/MapaSeguimiento'

interface Props {
  pedido: Pedido
  onClose: () => void
}

export default function ModalVistaMapa({ pedido, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-2xl shadow-xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100">Ubicación de entrega</h3>
            <p className="text-xs text-slate-500">{pedido.cliente} • {pedido.direccion}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full w-8 h-8 flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>
        <div className="p-0 h-[400px] w-full">
          {/* Reutilizamos el mapa de seguimiento que ya tiene toda la lógica visual */}
          <MapaSeguimiento pedido={pedido} />
        </div>
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-end">
          <a
            href={`https://maps.google.com/?q=${pedido.coordenadas?.latitud},${pedido.coordenadas?.longitud}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
          >
            📍 Abrir en App de Google Maps
          </a>
        </div>
      </div>
    </div>
  )
}
