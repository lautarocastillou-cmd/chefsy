'use client'

import { useEffect } from 'react'
import { Pedido } from '@/tipos'
import MapaSeguimiento from '@/components/ubicacion/MapaSeguimiento'
import { X, ExternalLink, MapPin } from 'lucide-react'

interface Props {
  pedido: Pedido
  onClose: () => void
}

export default function ModalVistaMapa({ pedido, onClose }: Props) {
  // Cerrar al presionar Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-800 text-slate-100 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 relative"
        onClick={e => e.stopPropagation()}
      >
        {/* Cabecera del Modal */}
        <div className="flex items-center justify-between p-4 px-5 border-b border-slate-800 bg-slate-900/90 z-10 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <div className="w-8 h-8 rounded-xl bg-chefsy-500/10 border border-chefsy-500/20 flex items-center justify-center text-chefsy-400 shrink-0">
              <MapPin size={16} />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-white text-sm sm:text-base leading-tight truncate">
                Ubicación de entrega: {pedido.cliente}
              </h3>
              <p className="text-xs text-slate-400 truncate mt-0.5">
                {pedido.direccion}
                {typeof pedido.distanciaKm === 'number' && ` • ${pedido.distanciaKm.toFixed(1)} km`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl w-8 h-8 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="Cerrar mapa"
          >
            <X size={18} />
          </button>
        </div>

        {/* Contenedor del Mapa Leaflet con RELATIVE estricto */}
        <div className="relative h-[380px] sm:h-[420px] w-full overflow-hidden bg-slate-950">
          <MapaSeguimiento pedido={pedido} />
        </div>

        {/* Footer del Modal */}
        <div className="p-3.5 px-5 border-t border-slate-800 bg-slate-950 flex items-center justify-between z-10 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Cerrar
          </button>

          {pedido.coordenadas && (
            <a
              href={`https://maps.google.com/?q=${pedido.coordenadas.latitud},${pedido.coordenadas.longitud}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-black py-2 px-4 rounded-xl transition-all shadow-md flex items-center gap-1.5 active:scale-95 cursor-pointer"
            >
              <span>Abrir en Google Maps</span>
              <ExternalLink size={13} />
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
