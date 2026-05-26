'use client'

import { useCallback, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Coordenadas } from '@/tipos'
import {
  CENTRO_POR_DEFECTO,
  buscarDireccionPorCoordenadas,
  buscarCoordenadasPorDireccion,
  crearEnlaceGoogleMaps,
  formatearCoordenadas,
  obtenerUbicacionActual,
} from '@/lib/ubicacion'

const MapaSelector = dynamic(() => import('./MapaSelector'), {
  ssr: false,
  loading: () => (
    <div className="h-64 w-full rounded-md border border-gray-300 bg-gray-50 flex items-center justify-center text-sm text-gray-500">
      Cargando mapa…
    </div>
  ),
})

interface PropsModalSelectorUbicacion {
  abierto: boolean
  direccion: string
  coordenadasIniciales: Coordenadas | null
  onConfirmar: (coordenadas: Coordenadas, direccionInversa?: string) => void
  onCerrar: () => void
}

export default function ModalSelectorUbicacion({
  abierto,
  direccion,
  coordenadasIniciales,
  onConfirmar,
  onCerrar,
}: PropsModalSelectorUbicacion) {
  const [centroMapa, setCentroMapa] = useState<Coordenadas>(
    coordenadasIniciales ?? CENTRO_POR_DEFECTO
  )
  const [coordenadasSeleccionadas, setCoordenadasSeleccionadas] = useState<Coordenadas | null>(
    coordenadasIniciales
  )
  const [cargando, setCargando] = useState(false)
  const [mensaje, setMensaje] = useState('')

  useEffect(() => {
    if (!abierto) return

    setMensaje('')
    setCoordenadasSeleccionadas(coordenadasIniciales)

    const centrarMapa = async () => {
      if (coordenadasIniciales) {
        setCentroMapa(coordenadasIniciales)
        return
      }

      if (direccion.trim()) {
        setCargando(true)
        const encontradas = await buscarCoordenadasPorDireccion(direccion)
        setCargando(false)

        if (encontradas) {
          setCentroMapa(encontradas)
          setCoordenadasSeleccionadas(encontradas)
          setMensaje('Ubicación aproximada según la dirección. Ajustá el pin si hace falta.')
          return
        }

        setMensaje('No se encontró la dirección. Marcá el punto en el mapa.')
      }

      setCentroMapa(CENTRO_POR_DEFECTO)
    }

    centrarMapa()
  }, [abierto, direccion, coordenadasIniciales])

  const manejarGps = async () => {
    setMensaje('')
    setCargando(true)

    try {
      const ubicacion = await obtenerUbicacionActual()
      setCentroMapa(ubicacion)
      setCoordenadasSeleccionadas(ubicacion)
      setMensaje('Ubicación GPS obtenida.')
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : 'Error al usar GPS.')
    } finally {
      setCargando(false)
    }
  }

  const manejarConfirmar = async () => {
    if (!coordenadasSeleccionadas) {
      setMensaje('Marcá un punto en el mapa antes de confirmar.')
      return
    }
    
    setCargando(true)
    setMensaje('Obteniendo dirección...')
    const direccionInversa = await buscarDireccionPorCoordenadas(coordenadasSeleccionadas)
    setCargando(false)
    
    onConfirmar(coordenadasSeleccionadas, direccionInversa || undefined)
  }

  const manejarCoordenadasChange = useCallback((nuevas: Coordenadas) => {
    setCoordenadasSeleccionadas(nuevas)
  }, [])

  if (!abierto) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg rounded-t-lg sm:rounded-lg shadow-lg flex flex-col max-h-[95vh] overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">Señalar ubicación</h2>
          <button
            type="button"
            onClick={onCerrar}
            className="text-gray-400 hover:text-gray-600 text-lg leading-none px-1"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto px-4 py-3 space-y-3">
          <p className="text-xs text-gray-500">
            Tocá el mapa para mover el pin. Usá GPS si estás en el domicilio del cliente.
          </p>

          <button
            type="button"
            onClick={manejarGps}
            disabled={cargando}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {cargando ? 'Obteniendo ubicación…' : '📍 Usar mi ubicación (GPS)'}
          </button>

          <MapaSelector
            key={`${centroMapa.latitud}-${centroMapa.longitud}`}
            centro={centroMapa}
            coordenadas={coordenadasSeleccionadas}
            onCoordenadasChange={manejarCoordenadasChange}
          />

          {coordenadasSeleccionadas && (
            <div className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-md px-3 py-2 space-y-1">
              <p>
                <span className="font-medium">Coordenadas:</span>{' '}
                {formatearCoordenadas(coordenadasSeleccionadas)}
              </p>
              <a
                href={crearEnlaceGoogleMaps(coordenadasSeleccionadas)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-chefsy-700 underline"
              >
                Abrir en Google Maps para verificar
              </a>
            </div>
          )}

          {mensaje && <p className="text-xs text-gray-600">{mensaje}</p>}
        </div>

        <div className="border-t border-gray-200 px-4 py-3 flex gap-2">
          <button
            type="button"
            onClick={manejarConfirmar}
            className="flex-1 bg-chefsy text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-chefsy-700"
          >
            Confirmar ubicación
          </button>
          <button
            type="button"
            onClick={onCerrar}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md text-sm hover:bg-gray-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
