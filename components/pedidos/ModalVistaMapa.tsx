'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Pedido } from '@/tipos'
import MapaSeguimiento from '@/components/ubicacion/MapaSeguimiento'
import { X, ExternalLink, MapPin, Copy, Bike, Check } from 'lucide-react'
import { copiarConNotificacion } from '@/lib/notificaciones'

interface Props {
  pedido: Pedido
  onClose: () => void
}

export default function ModalVistaMapa({ pedido, onClose }: Props) {
  const [montado, setMontado] = useState(false)
  const [copiado, setCopiado] = useState(false)

  useEffect(() => {
    setMontado(true)
  }, [])

  // Cerrar al presionar Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  if (!montado || typeof document === 'undefined') return null

  const copiarLinkRastreo = async () => {
    const url = `https://chefsy.xyz/cadete-en-vivo/${pedido.id}`
    const ok = await copiarConNotificacion(url, '¡Link de seguimiento copiado al portapapeles!')
    if (ok) {
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 p-3 sm:p-5 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700/80 text-slate-100 w-full max-w-4xl lg:max-w-5xl h-[88vh] max-h-[820px] rounded-2xl shadow-2xl overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del Modal */}
        <div className="flex items-center justify-between p-3.5 sm:p-4 px-4 sm:px-6 border-b border-slate-800 bg-slate-900 z-10 shrink-0">
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <MapPin size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-white text-base sm:text-lg leading-tight truncate">
                  {pedido.cliente}
                </h3>
                {pedido.cadete_nombre && (
                  <span className="text-xs bg-emerald-950/80 text-emerald-400 border border-emerald-700/60 px-2 py-0.5 rounded-lg font-bold flex items-center gap-1 shrink-0">
                    <Bike size={13} />
                    <span>{pedido.cadete_nombre}</span>
                  </span>
                )}
                {typeof pedido.distanciaKm === 'number' && (
                  <span className="text-xs font-extrabold text-slate-300 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-lg shrink-0">
                    ~{pedido.distanciaKm.toFixed(1)} km
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm font-medium text-slate-300 truncate mt-0.5">
                {pedido.direccion || 'Sin dirección especificada'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden sm:inline-flex text-[10px] font-bold text-slate-400 bg-slate-800 border border-slate-700 px-2 py-1 rounded-md tracking-wider">
              ESC
            </span>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl w-9 h-9 flex items-center justify-center transition-colors cursor-pointer"
              title="Cerrar mapa (Escape)"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Contenedor del Mapa Leaflet amplio para el monitor */}
        <div className="relative flex-1 w-full overflow-hidden bg-slate-950">
          <MapaSeguimiento pedido={pedido} />
        </div>

        {/* Footer del Modal */}
        <div className="p-3 sm:p-4 px-4 sm:px-6 border-t border-slate-800 bg-slate-900 flex items-center justify-between gap-2 z-10 shrink-0 flex-wrap">
          <div className="min-w-0 flex-1">
            {pedido.observaciones && (
              <p className="text-xs text-amber-300 bg-amber-950/50 border border-amber-800/50 px-3 py-1.5 rounded-xl truncate max-w-md inline-block">
                ⚠️ <strong className="font-bold">Nota:</strong> {pedido.observaciones}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={copiarLinkRastreo}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold rounded-xl transition-all border border-slate-700 flex items-center gap-1.5 cursor-pointer"
              title="Copiar link de seguimiento en vivo del cliente"
            >
              {copiado ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span>{copiado ? '¡Copiado!' : 'Copiar Link'}</span>
            </button>

            {pedido.coordenadas && (
              <a
                href={`https://maps.google.com/?q=${pedido.coordenadas.latitud},${pedido.coordenadas.longitud}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-black py-2 px-3.5 rounded-xl transition-all shadow-md flex items-center gap-1.5 active:scale-95 cursor-pointer"
              >
                <span>Google Maps</span>
                <ExternalLink size={13} />
              </a>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer border border-slate-700"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
