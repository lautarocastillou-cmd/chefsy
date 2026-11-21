'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import dynamic from 'next/dynamic'
import { Coordenadas } from '@/tipos'
import { buscarDireccionPorCoordenadas, MAPA_ATTRIBUTION } from '@/lib/ubicacion'
import { X, MapPin, ExternalLink } from 'lucide-react'

const MapaSelector = dynamic(() => import('./MapaSelector'), { ssr: false })


interface PropsModalVistaUbicacion {
  coordenadas: Coordenadas
  direccion?: string
  distanciaKm?: number
  onClose: () => void
}

export default function ModalVistaUbicacion({
  coordenadas,
  direccion,
  distanciaKm,
  onClose,
}: PropsModalVistaUbicacion) {
  const [montado, setMontado] = useState(false)
  const [direccionLegible, setDireccionLegible] = useState(direccion || '')
  const direccionParaMostrar = direccionLegible || `${coordenadas.latitud.toFixed(5)}, ${coordenadas.longitud.toFixed(5)}`

  useEffect(() => {
    setMontado(true)
  }, [])

  useEffect(() => {
    if (direccion && !/^(https?:\/\/|geo:|-?\d+\.\d+\s*,)/i.test(direccion)) {
      setDireccionLegible(direccion)
      return
    }

    let cancelado = false
    buscarDireccionPorCoordenadas(coordenadas).then((resultado) => {
      if (!cancelado && resultado) setDireccionLegible(resultado)
    })
    return () => { cancelado = true }
  }, [coordenadas.latitud, coordenadas.longitud, direccion])

  useEffect(() => {
    const manejarTecla = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', manejarTecla)
    return () => window.removeEventListener('keydown', manejarTecla)
  }, [onClose])

  if (!montado || typeof document === 'undefined') return null

  const googleMapsUrl = `https://www.google.com/maps?q=${coordenadas.latitud},${coordenadas.longitud}`

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/75 p-3 sm:p-5 animate-in fade-in duration-150"
      onClick={onClose}
      role="presentation"
    >
      <section
        className="bg-slate-900 border border-slate-700/80 text-slate-100 w-full max-w-3xl h-[76vh] max-h-[680px] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-label="Vista rápida de ubicación"
        onClick={(evento) => evento.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-slate-800 shrink-0">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-sm sm:text-base font-extrabold text-white">
              <MapPin size={17} className="text-chefsy-400 shrink-0" />
              Comparar ubicación
            </h2>
            <p className="text-[11px] text-slate-400 truncate mt-0.5">
              {direccionParaMostrar}
            </p>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300" aria-label="Cerrar">
            <X size={18} />
          </button>
        </header>

        <div className="relative flex-1 min-h-0 bg-slate-950">
          <MapaSelector
            centro={coordenadas}
            coordenadas={coordenadas}
            onCoordenadasChange={() => undefined}
            className="h-full w-full rounded-none border-0"
          />
          <div className="absolute left-3 bottom-3 rounded-lg bg-slate-900/90 border border-slate-700 px-2.5 py-1.5 text-[10px] text-slate-300 shadow-lg">
            {MAPA_ATTRIBUTION.replace('&copy; ', '© ')}
          </div>
        </div>

        <footer className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-t border-slate-800 shrink-0">
          <span className="text-[11px] text-slate-400">
            {distanciaKm !== undefined ? `${distanciaKm.toFixed(1)} km del local` : 'Ubicación señalada'}
          </span>
          <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold">
            Abrir Google Maps <ExternalLink size={13} />
          </a>
        </footer>
      </section>
    </div>,
    document.body,
  )
}
