'use client'

import { useState, useEffect } from 'react'
import { ExternalLink, Camera, Compass, AlertCircle, Sparkles, MapPin, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StreetViewInfo {
  disponible: boolean
  urlImagenProxy?: string
  urlImagenDirecta?: string
  fecha?: string | null
  copyright?: string
  urlDirectaPano: string
  motivo?: 'sin_api_key' | 'sin_cobertura' | 'error_metadata' | 'error_interno'
  mensaje?: string
}

interface PropsStreetViewFachada {
  lat: number
  lng: number
  titulo?: string
  subtitulo?: string
  compacto?: boolean
  className?: string
  modoCadete?: boolean
}

export default function StreetViewFachada({
  lat,
  lng,
  titulo,
  subtitulo,
  compacto = false,
  className,
  modoCadete = false,
}: PropsStreetViewFachada) {
  const [info, setInfo] = useState<StreetViewInfo | null>(null)
  const [cargando, setCargando] = useState(true)
  const [imagenCargada, setImagenCargada] = useState(false)
  const [errorImagen, setErrorImagen] = useState(false)

  useEffect(() => {
    let activo = true
    setCargando(true)
    setImagenCargada(false)
    setErrorImagen(false)

    // Debounce sutil de 400ms para no saturar al arrastrar el pin
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/streetview?lat=${lat}&lng=${lng}&w=600&h=350`)
        if (!res.ok) throw new Error('Error al consultar Street View')
        const data: StreetViewInfo = await res.json()
        if (activo) {
          setInfo(data)
          setCargando(false)
        }
      } catch (err) {
        if (activo) {
          setInfo({
            disponible: false,
            motivo: 'error_interno',
            urlDirectaPano: `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`,
          })
          setCargando(false)
        }
      }
    }, 350)

    return () => {
      activo = false
      clearTimeout(timer)
    }
  }, [lat, lng])

  const tituloPorDefecto = modoCadete
    ? 'Fachada de entrega (Google Street View)'
    : '¿Es esta la fachada de tu domicilio?'

  const subtituloPorDefecto = modoCadete
    ? 'Revisá el frente de la casa para reconocerla al llegar.'
    : 'Si la foto no coincide, ajustá el pin del mapa unos metros hacia tu puerta.'

  return (
    <div
      className={cn(
        'rounded-2xl border overflow-hidden transition-all duration-300',
        modoCadete
          ? 'bg-slate-900 border-slate-700/80 text-white'
          : 'bg-white border-slate-200 text-slate-800 shadow-sm',
        className
      )}
    >
      {/* Encabezado */}
      {!compacto && (
        <div
          className={cn(
            'px-4 py-2.5 flex items-center justify-between border-b text-xs',
            modoCadete
              ? 'border-slate-800 bg-slate-950/60'
              : 'border-slate-100 bg-slate-50/80'
          )}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={cn(
                'w-6 h-6 rounded-lg flex items-center justify-center shrink-0',
                modoCadete
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-chefsy-100 text-chefsy-700'
              )}
            >
              <Camera size={13} />
            </div>
            <div className="min-w-0">
              <p className="font-bold truncate text-[12px]">{titulo || tituloPorDefecto}</p>
            </div>
          </div>

          {info?.urlDirectaPano && (
            <a
              href={info.urlDirectaPano}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'inline-flex items-center gap-1 font-semibold text-[11px] px-2.5 py-1 rounded-lg transition-all shrink-0 active:scale-95',
                modoCadete
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-xs'
              )}
              title="Abrir vista panorámica 360 interactiva"
            >
              <Compass size={12} className="text-emerald-500" />
              <span>Ver 360°</span>
              <ExternalLink size={10} className="opacity-60" />
            </a>
          )}
        </div>
      )}

      {/* Contenedor de la Imagen / Skeleton / Fallback */}
      <div className="relative w-full aspect-[16/9] min-h-[170px] max-h-[300px] overflow-hidden bg-slate-950 flex items-center justify-center">
        {cargando ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-4 text-center animate-pulse bg-slate-900">
            <div className="w-10 h-10 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-500">
              <Camera size={20} className="animate-bounce" />
            </div>
            <p className="text-xs font-medium text-slate-400">
              Obteniendo fotografía de fachada de Google Maps...
            </p>
          </div>
        ) : info?.disponible && info.urlImagenProxy && !errorImagen ? (
          <>
            {/* Skeleton mientras descarga los bytes de la imagen */}
            {!imagenCargada && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900 animate-pulse z-0">
                <div className="w-8 h-8 border-3 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
              </div>
            )}

            {/* Imagen de la Fachada */}
            <img
              src={info.urlImagenProxy}
              alt="Fachada del domicilio según Google Street View"
              className={cn(
                'w-full h-full object-cover transition-opacity duration-300',
                imagenCargada ? 'opacity-100' : 'opacity-0'
              )}
              onLoad={() => setImagenCargada(true)}
              onError={() => setErrorImagen(true)}
            />

            {/* Badges superiores sobre la imagen */}
            <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none z-10">
              <span className="bg-black/70 backdrop-blur-md text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1 border border-white/10">
                <MapPin size={10} className="text-emerald-400" />
                <span>Google Street View</span>
              </span>

              {info.fecha && (
                <span className="bg-black/70 backdrop-blur-md text-slate-300 text-[10px] font-semibold px-2.5 py-1 rounded-full shadow-lg border border-white/10">
                  {info.fecha}
                </span>
              )}
            </div>

            {/* Botón flotante para ver en 360 interactivo */}
            <a
              href={info.urlDirectaPano}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute bottom-2.5 right-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[11px] px-3 py-1.5 rounded-xl shadow-xl flex items-center gap-1.5 transition-all active:scale-95 z-10"
            >
              <Eye size={12} />
              <span>Girar 360° en Maps</span>
            </a>
          </>
        ) : (
          /* Estado de Fallback (Sin cobertura o API key pendiente) */
          <div className="w-full h-full p-4 flex flex-col items-center justify-center text-center bg-slate-900/90 text-slate-300">
            <div className="w-10 h-10 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400 mb-2 border border-slate-700">
              <Camera size={18} />
            </div>

            <p className="text-xs font-bold text-white mb-0.5">
              {info?.motivo === 'sin_api_key'
                ? 'Vista interactiva disponible'
                : 'Sin foto de calle registrada en este punto'}
            </p>
            <p className="text-[11px] text-slate-400 max-w-xs mb-3 leading-tight">
              {info?.motivo === 'sin_api_key'
                ? 'Podés abrir Street View 360 directamente en Google Maps con un clic.'
                : 'El vehículo de Google aún no fotografió esta cuadra o es un pasaje interno.'}
            </p>

            <a
              href={info?.urlDirectaPano || `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl transition-all shadow-md flex items-center gap-1.5 active:scale-95 cursor-pointer"
            >
              <Compass size={13} />
              <span>Abrir Street View en Google Maps</span>
              <ExternalLink size={11} className="opacity-80" />
            </a>
          </div>
        )}
      </div>

      {/* Pie de foto / Instrucción al cliente o cadete */}
      {!compacto && (
        <div
          className={cn(
            'p-3 text-[11px] border-t flex items-start gap-2',
            modoCadete
              ? 'border-slate-800 bg-slate-950/40 text-slate-300'
              : 'border-slate-100 bg-slate-50/50 text-slate-600'
          )}
        >
          <Sparkles
            size={14}
            className={cn(
              'shrink-0 mt-0.5',
              modoCadete ? 'text-emerald-400' : 'text-chefsy-600'
            )}
          />
          <p className="leading-snug">
            {subtitulo || subtituloPorDefecto}
          </p>
        </div>
      )}
    </div>
  )
}
