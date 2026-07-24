'use client'

import { useState, useEffect, useRef } from 'react'
import { Coordenadas } from '@/tipos'
import { 
  crearEnlaceGoogleMaps, 
  formatearCoordenadas,
  buscarSugerenciasDireccion,
  SugerenciaDireccion,
  buscarDireccionPorCoordenadas
} from '@/lib/ubicacion'
import ModalSelectorUbicacion from './ModalSelectorUbicacion'

function dmsToDecimal(degrees: number, minutes: number, seconds: number, direction: string): number {
  let decimal = degrees + minutes / 60 + seconds / 3600;
  if (['S', 's', 'W', 'w', 'O', 'o'].includes(direction)) {
    decimal = -decimal;
  }
  return decimal;
}

// Helper para extraer coordenadas de un texto o link de Google Maps
function extraerCoordenadasDeTexto(rawTexto: string): Coordenadas | null {
  if (!rawTexto) return null
  let texto = rawTexto
  try {
    texto = decodeURIComponent(rawTexto)
  } catch (e) {}

  // 1. Intentar extraer coordenadas específicas del pin (formato data de Google Maps !3d...!4d)
  const match3d4d = texto.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/)
  if (match3d4d) {
    return { latitud: parseFloat(match3d4d[1]), longitud: parseFloat(match3d4d[2]) }
  }

  // 2. Formato query string q=lat,lng o query=lat,lng (ej: q=-28.4593648%2C-65.7796141 o q=-28.468200,-65.782100)
  const matchQ = texto.match(/[?&](?:q|query)=(-?\d+\.\d+)\s*(?:,|%2[cC])\s*(-?\d+\.\d+)/i)
  if (matchQ) {
    return { latitud: parseFloat(matchQ[1]), longitud: parseFloat(matchQ[2]) }
  }

  // 3. Formato destino daddr=lat,lng (ej: daddr=-28.468200,-65.782100)
  const matchDaddr = texto.match(/[?&]daddr=(-?\d+\.\d+)\s*(?:,|%2[cC])\s*(-?\d+\.\d+)/i)
  if (matchDaddr) {
    return { latitud: parseFloat(matchDaddr[1]), longitud: parseFloat(matchDaddr[2]) }
  }

  // 4. Formato ll=lat,lng / center=lat,lng / sll=lat,lng
  const matchLl = texto.match(/[?&](?:ll|sll|center)=(-?\d+\.\d+)\s*(?:,|%2[cC])\s*(-?\d+\.\d+)/i)
  if (matchLl) {
    return { latitud: parseFloat(matchLl[1]), longitud: parseFloat(matchLl[2]) }
  }

  // 5. Formato /place/lat,lng o /dir/.../lat,lng
  const matchPath = texto.match(/\/(?:place|dir)\/(?:[^\/]+\/)?(-?\d+\.\d+)\s*(?:,|%2[cC])\s*(-?\d+\.\d+)/i)
  if (matchPath) {
    return { latitud: parseFloat(matchPath[1]), longitud: parseFloat(matchPath[2]) }
  }

  // 6. Formato @lat,lng (como fallback si no hay pin explícito)
  const matchAt = texto.match(/@(-?\d+\.\d+)\s*(?:,|%2[cC])\s*(-?\d+\.\d+)/i)
  if (matchAt) {
    return { latitud: parseFloat(matchAt[1]), longitud: parseFloat(matchAt[2]) }
  }

  // 7. Formato DMS (Degrees, Minutes, Seconds - ej: 28°27'13.5"S 65°47'00.5"W)
  const dmsRegex = /(\d+)\s*°\s*(\d+)\s*'\s*(\d+(?:\.\d+)?)\s*"\s*([NSns])\s*[,/]?\s*(\d+)\s*°\s*(\d+)\s*'\s*(\d+(?:\.\d+)?)\s*"\s*([WOEwoeOo])/
  const matchDms = texto.match(dmsRegex)
  if (matchDms) {
    const lat = dmsToDecimal(parseFloat(matchDms[1]), parseFloat(matchDms[2]), parseFloat(matchDms[3]), matchDms[4])
    const lng = dmsToDecimal(parseFloat(matchDms[5]), parseFloat(matchDms[6]), parseFloat(matchDms[7]), matchDms[8])
    return { latitud: lat, longitud: lng }
  }

  // 8. Coordenadas sueltas pegadas directamente (ej: -28.468200, -65.782100 o con %2C)
  const matchCoordsSueltas = texto.match(/(-?\d+\.\d+)\s*(?:,|%2[cC])\s*(-?\d+\.\d+)/i)
  if (matchCoordsSueltas) {
    const lat = parseFloat(matchCoordsSueltas[1])
    const lng = parseFloat(matchCoordsSueltas[2])
    // Validar rangos geográficos para evitar falsos positivos con numeraciones de calle
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { latitud: lat, longitud: lng }
    }
  }

  return null
}

function extraerUrlDeGoogleMaps(texto: string): string | null {
  const match = texto.match(/(?:https?:\/\/)?(?:[a-zA-Z0-9-]+\.)?google\.[a-z]+(?:\.[a-z]+)?\/maps[^\s]*|(?:https?:\/\/)?maps\.app\.goo\.gl\/[^\s]*|(?:https?:\/\/)?goo\.gl\/maps\/[^\s]*/i)
  return match ? match[0] : null
}

interface PropsCampoUbicacion {
  direccion: string
  onDireccionChange: (valor: string) => void
  coordenadas: Coordenadas | null
  onCoordenadasChange: (coordenadas: Coordenadas | null) => void
  claseInput?: string
  obligatorio?: boolean
  distanciaKm?: number
}

export default function CampoUbicacion({
  direccion,
  onDireccionChange,
  coordenadas,
  onCoordenadasChange,
  claseInput = 'w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-chefsy focus:border-transparent',
  obligatorio = false,
  distanciaKm,
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

  // Referencias para evitar llamadas de geolocalización repetidas o innecesarias
  const coordenadasProcesadasRef = useRef<string | null>(null)
  const forzarGeocodificacionRef = useRef<boolean>(false)
  const prevDireccionRef = useRef<string>(direccion)

  // Mantener actualizado el valor anterior de la dirección en cada render
  useEffect(() => {
    prevDireccionRef.current = direccion
  })

  // Sincronizar coordenadas manuales si cambian por fuera (mapa, CRM, etc.)
  useEffect(() => {
    setLatManual(coordenadas?.latitud.toString() || '')
    setLonManual(coordenadas?.longitud.toString() || '')
  }, [coordenadas])

  // Autocompletar la dirección si cambian las coordenadas
  useEffect(() => {
    if (!coordenadas) {
      coordenadasProcesadasRef.current = null
      return
    }

    const key = `${coordenadas.latitud},${coordenadas.longitud}`
    
    // Si las coordenadas ya fueron procesadas, no hacer nada (a menos que forcemos resolución)
    if (coordenadasProcesadasRef.current === key && !forzarGeocodificacionRef.current) {
      return
    }

    // Si la dirección cambió en este mismo render por otros motivos,
    // asumimos que es autocompletado y no sobreescribimos, a menos que forzarGeocodificacionRef esté activo.
    if (prevDireccionRef.current !== direccion && !forzarGeocodificacionRef.current) {
      coordenadasProcesadasRef.current = key
      return
    }

    // Consumir el flag de forzado
    forzarGeocodificacionRef.current = false
    coordenadasProcesadasRef.current = key

    let activo = true
    const reverseGeocode = async () => {
      setBuscando(true)
      try {
        const dir = await buscarDireccionPorCoordenadas(coordenadas)
        if (dir && activo) {
          onDireccionChange(dir)
        }
      } catch (e) {
        console.error('Error al resolver dirección por coordenadas:', e)
      } finally {
        if (activo) setBuscando(false)
      }
    }
    reverseGeocode()

    return () => {
      activo = false
    }
  }, [coordenadas, onDireccionChange, direccion])

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

    const controller = new AbortController()

    const timer = setTimeout(async () => {
      setBuscando(true)
      try {
        const resultados = await buscarSugerenciasDireccion(direccion, controller.signal)
        setSugerencias(resultados)
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Error buscando sugerencias:', err)
        }
      } finally {
        if (!controller.signal.aborted) {
          setBuscando(false)
        }
      }
    }, 800) // Debounce

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [direccion])

  const manejarSeleccionSugerencia = (sug: SugerenciaDireccion) => {
    const key = `${sug.coordenadas.latitud},${sug.coordenadas.longitud}`
    coordenadasProcesadasRef.current = key
    onDireccionChange(sug.nombre)
    onCoordenadasChange(sug.coordenadas)
    setMostrarSugerencias(false)
    setSugerencias([])
  }

  const manejarConfirmarModal = (nuevasCoordenadas: Coordenadas, direccionInversa?: string) => {
    const key = `${nuevasCoordenadas.latitud},${nuevasCoordenadas.longitud}`
    coordenadasProcesadasRef.current = key
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
            onChange={async (e) => {
              const valor = e.target.value
              onDireccionChange(valor)
              setMostrarSugerencias(true)

              if (valor.trim() === '') {
                onCoordenadasChange(null)
                coordenadasProcesadasRef.current = null
                forzarGeocodificacionRef.current = false
                return
              }

              // Extraer link de Google Maps si está embebido en el texto
              let urlExtraida = extraerUrlDeGoogleMaps(valor)
              if (urlExtraida && !urlExtraida.startsWith('http://') && !urlExtraida.startsWith('https://')) {
                urlExtraida = 'https://' + urlExtraida
              }

              const esCoordenadasSueltas = /(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/.test(valor)
              const esCoordenadasDms = /(\d+)\s*°\s*(\d+)\s*'\s*(\d+(?:\.\d+)?)\s*"\s*([NSns])/.test(valor)

              if (urlExtraida || esCoordenadasSueltas || esCoordenadasDms) {
                setMostrarSugerencias(false)
                
                // Resetear el tracker y activar bandera de forzado para garantizar geocodificación
                forzarGeocodificacionRef.current = true
                coordenadasProcesadasRef.current = null

                // Intentar extraer de inmediato si es un link largo o si contiene coordenadas
                const coordsLocales = extraerCoordenadasDeTexto(urlExtraida || valor)
                if (coordsLocales) {
                  // No sobreescribir con "Resolviendo..." para no perder el texto ingresado
                  onCoordenadasChange(coordsLocales)
                } else if (urlExtraida && (urlExtraida.includes('maps.app.goo.gl') || urlExtraida.includes('goo.gl/maps'))) {
                  // Es un link acortado, requiere resolución en servidor
                  onDireccionChange('Procesando enlace de Google Maps...')
                  setBuscando(true)
                  try {
                    const res = await fetch(`/api/resolve-maps?url=${encodeURIComponent(urlExtraida)}`)
                    if (res.ok) {
                      const data = await res.json()
                      if (data.latitud && data.longitud) {
                        forzarGeocodificacionRef.current = true
                        coordenadasProcesadasRef.current = null
                        onCoordenadasChange({ latitud: data.latitud, longitud: data.longitud })
                      } else {
                        onDireccionChange(valor)
                      }
                    } else {
                      onDireccionChange(valor)
                    }
                  } catch (err) {
                    console.error('Error al resolver link acortado:', err)
                    onDireccionChange(valor)
                  } finally {
                    setBuscando(false)
                  }
                }
              }
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
            {distanciaKm !== undefined && distanciaKm > 0 && (
              <p className="mt-0.5 text-chefsy-700 font-medium text-[11px] uppercase tracking-wide">📏 Distancia al local: <span className="font-bold text-chefsy-900">{distanciaKm} km</span></p>
            )}
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
