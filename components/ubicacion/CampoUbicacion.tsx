'use client'

import { useState, useEffect, useRef } from 'react'
import { Coordenadas } from '@/tipos'
import { 
  crearEnlaceGoogleMaps, 
  formatearCoordenadas,
  buscarSugerenciasDireccion,
  SugerenciaDireccion
} from '@/lib/ubicacion'
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

  // Autocomplete
  const [sugerencias, setSugerencias] = useState<SugerenciaDireccion[]>([])
  const [buscando, setBuscando] = useState(false)
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false)
  
  // Coordenadas manuales
  const [ingresoManual, setIngresoManual] = useState(false)
  const [latManual, setLatManual] = useState(coordenadas?.latitud.toString() || '')
  const [lonManual, setLonManual] = useState(coordenadas?.longitud.toString() || '')

  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickFuera = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setMostrarSugerencias(false)
      }
    }
    document.addEventListener('mousedown', handleClickFuera)
    return () => document.removeEventListener('mousedown', handleClickFuera)
  }, [])

  useEffect(() => {
    if (direccion.length < 4) {
      setSugerencias([])
      return
    }

    const timer = setTimeout(async () => {
      setBuscando(true)
      const resultados = await buscarSugerenciasDireccion(direccion)
      setSugerencias(resultados)
      setBuscando(false)
    }, 800) // Debounce

    return () => clearTimeout(timer)
  }, [direccion])

  const manejarSeleccionSugerencia = (sug: SugerenciaDireccion) => {
    onDireccionChange(sug.nombre)
    onCoordenadasChange(sug.coordenadas)
    setMostrarSugerencias(false)
    setSugerencias([])
  }

  const manejarConfirmarModal = (nuevasCoordenadas: Coordenadas, direccionInversa?: string) => {
    onCoordenadasChange(nuevasCoordenadas)
    if (direccionInversa) {
      onDireccionChange(direccionInversa)
    }
    setModalAbierto(false)
  }

  const aplicarManual = () => {
    const lat = parseFloat(latManual)
    const lon = parseFloat(lonManual)
    if (!isNaN(lat) && !isNaN(lon)) {
      onCoordenadasChange({ latitud: lat, longitud: lon })
      setIngresoManual(false)
    }
  }

  return (
    <div className="space-y-2">
      <div ref={wrapperRef} className="relative">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Dirección {obligatorio && <span className="text-red-400">*</span>}
        </label>
        <div className="relative">
          <input
            type="text"
            value={direccion}
            onChange={(e) => {
              onDireccionChange(e.target.value)
              setMostrarSugerencias(true)
            }}
            onFocus={() => setMostrarSugerencias(true)}
            placeholder="Calle 123, Barrio Centro"
            className={claseInput}
            autoComplete="off"
          />
          {buscando && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-chefsy-300 border-t-chefsy rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Dropdown de sugerencias */}
        {mostrarSugerencias && sugerencias.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto animate-[slideIn_0.15s_ease-out]">
            {sugerencias.map((sug, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => manejarSeleccionSugerencia(sug)}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-chefsy-50 hover:text-chefsy-900 border-b border-gray-100 last:border-0"
              >
                <p className="truncate font-medium">{sug.nombre.split(',')[0]}</p>
                <p className="truncate text-xs text-gray-400">{sug.nombre}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setModalAbierto(true)}
          className="text-sm border border-chefsy-300 text-chefsy-700 px-3 py-2 rounded-md hover:bg-chefsy-50 shadow-sm"
        >
          📍 Señalar ubicación en el mapa
        </button>

        <button
          type="button"
          onClick={() => setIngresoManual(!ingresoManual)}
          className="text-sm border border-gray-300 text-gray-600 px-3 py-2 rounded-md hover:bg-gray-50 shadow-sm"
        >
          ✏️ Ingresar coordenadas manualmente
        </button>

        {coordenadas && (
          <button
            type="button"
            onClick={() => onCoordenadasChange(null)}
            className="text-sm text-red-600 px-3 py-2 hover:bg-red-50 rounded-md transition-colors"
          >
            Quitar pin
          </button>
        )}
      </div>

      {ingresoManual && (
        <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex flex-col sm:flex-row gap-2 items-end animate-[slideIn_0.15s_ease-out]">
          <div className="flex-1 w-full">
            <label className="block text-xs font-medium text-slate-500 mb-1">Latitud</label>
            <input 
              type="number" 
              step="any"
              value={latManual} 
              onChange={e => setLatManual(e.target.value)}
              placeholder="-28.4682"
              className="w-full border border-slate-300 rounded text-sm px-2 py-1.5 focus:border-chefsy outline-none"
            />
          </div>
          <div className="flex-1 w-full">
            <label className="block text-xs font-medium text-slate-500 mb-1">Longitud</label>
            <input 
              type="number" 
              step="any"
              value={lonManual} 
              onChange={e => setLonManual(e.target.value)}
              placeholder="-65.7821"
              className="w-full border border-slate-300 rounded text-sm px-2 py-1.5 focus:border-chefsy outline-none"
            />
          </div>
          <button
            type="button"
            onClick={aplicarManual}
            className="bg-slate-800 text-white text-sm px-4 py-1.5 rounded hover:bg-slate-700 font-medium whitespace-nowrap w-full sm:w-auto mt-2 sm:mt-0"
          >
            Aplicar
          </button>
        </div>
      )}

      {coordenadas && (
        <div className="text-xs text-gray-600 bg-green-50 border border-green-200 rounded-md px-3 py-2 flex items-center justify-between shadow-sm">
          <div>
            <p>✅ <span className="font-semibold">Ubicación señalada:</span> {formatearCoordenadas(coordenadas)}</p>
            <a
              href={crearEnlaceGoogleMaps(coordenadas)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-chefsy-700 underline mt-0.5 inline-block"
            >
              Ver en mapa
            </a>
          </div>
        </div>
      )}

      <ModalSelectorUbicacion
        abierto={modalAbierto}
        direccion={direccion}
        coordenadasIniciales={coordenadas}
        onConfirmar={manejarConfirmarModal}
        onCerrar={() => setModalAbierto(false)}
      />
    </div>
  )
}
