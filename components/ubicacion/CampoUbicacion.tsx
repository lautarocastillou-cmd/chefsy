'use client'

import { useState } from 'react'
import { Coordenadas } from '@/tipos'
import { crearEnlaceGoogleMaps, formatearCoordenadas } from '@/lib/ubicacion'
import ModalSelectorUbicacion from './ModalSelectorUbicacion'

interface PropsCampoUbicacion {
  direccion: string
  onDireccionChange: (valor: string) => void
  coordenadas: Coordenadas | null
  onCoordenadasChange: (coordenadas: Coordenadas | null) => void
  claseInput?: string
  obligatorio?: boolean
}

export default function CampoUbicacion({
  direccion,
  onDireccionChange,
  coordenadas,
  onCoordenadasChange,
  claseInput = 'w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-chefsy focus:border-transparent',
  obligatorio = false,
}: PropsCampoUbicacion) {
  const [modalAbierto, setModalAbierto] = useState(false)

  const manejarConfirmar = (nuevasCoordenadas: Coordenadas, direccionInversa?: string) => {
    onCoordenadasChange(nuevasCoordenadas)
    if (direccionInversa) {
      onDireccionChange(direccionInversa)
    }
    setModalAbierto(false)
  }

  return (
    <div className="space-y-2">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Dirección {obligatorio && <span className="text-red-400">*</span>}
        </label>
        <input
          type="text"
          value={direccion}
          onChange={(e) => onDireccionChange(e.target.value)}
          placeholder="Calle 123, Barrio Centro"
          className={claseInput}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setModalAbierto(true)}
          className="text-sm border border-chefsy-300 text-chefsy-700 px-3 py-2 rounded-md hover:bg-chefsy-50"
        >
          📍 Señalar ubicación
        </button>

        {coordenadas && (
          <button
            type="button"
            onClick={() => onCoordenadasChange(null)}
            className="text-sm border border-gray-300 text-gray-600 px-3 py-2 rounded-md hover:bg-gray-50"
          >
            Quitar pin
          </button>
        )}
      </div>

      {coordenadas && (
        <div className="text-xs text-gray-600 bg-green-50 border border-green-200 rounded-md px-3 py-2">
          <p>✅ Ubicación señalada: {formatearCoordenadas(coordenadas)}</p>
          <a
            href={crearEnlaceGoogleMaps(coordenadas)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-chefsy-700 underline mt-0.5 inline-block"
          >
            Ver en mapa
          </a>
        </div>
      )}

      <ModalSelectorUbicacion
        abierto={modalAbierto}
        direccion={direccion}
        coordenadasIniciales={coordenadas}
        onConfirmar={manejarConfirmar}
        onCerrar={() => setModalAbierto(false)}
      />
    </div>
  )
}
