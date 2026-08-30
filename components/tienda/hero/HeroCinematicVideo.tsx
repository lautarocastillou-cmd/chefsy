'use client'

import React, { useRef } from 'react'
import { Search, Flame, Play, Volume2, VolumeX } from 'lucide-react'
import { CategoriaCatalogo } from '@/tipos/catalogo'
import { ConfiguracionTienda } from '@/servicios/supabase/configuracion'

interface Props {
  configuracion: ConfiguracionTienda | null
  categoriasActivas: CategoriaCatalogo[]
  categoriaSeleccionada: string | null
  busqueda: string
  sugerenciaBusqueda?: string | null
  fuenteHeroClase: string
  onBusquedaChange: (valor: string) => void
  onToggleSelector: () => void
  onSeleccionarCategoria: (id: string | null) => void
}

export default function HeroCinematicVideo({
  configuracion,
  busqueda,
  sugerenciaBusqueda,
  fuenteHeroClase,
  onBusquedaChange,
  onSeleccionarCategoria,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [estaMuteado, setEstaMuteado] = React.useState(true)

  const videoUrl =
    configuracion?.hero_video_url ||
    (configuracion?.textura_fondo_url?.endsWith('.mp4') ||
    configuracion?.textura_fondo_url?.endsWith('.webm')
      ? configuracion.textura_fondo_url
      : '')

  const opacidadOverlay = (configuracion?.hero_video_overlay_opacity ?? 65) / 100

  const toggleAudio = () => {
    if (!videoRef.current) return
    videoRef.current.muted = !videoRef.current.muted
    setEstaMuteado(videoRef.current.muted)
  }

  return (
    <div className="relative w-full min-h-[50vh] lg:min-h-[80vh] flex flex-col justify-center px-4 md:px-12 py-10 lg:py-16 overflow-hidden select-none">
      
      {/* ── Background: Video Cinemático o Textura con Fallback ─── */}
      <div className="absolute inset-0 w-full h-full -z-20 overflow-hidden bg-black">
        {videoUrl ? (
          <video
            ref={videoRef}
            src={videoUrl}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover scale-105 filter brightness-90"
          />
        ) : (
          <div 
            className="w-full h-full bg-cover bg-center filter brightness-50"
            style={{
              backgroundImage: `url(${configuracion?.textura_fondo_url || '/burger-loca.webp'})`
            }}
          />
        )}
      </div>

      {/* ── Filtro de Oscurecimiento Regulable (Overlay Gradiente) ─── */}
      <div 
        className="absolute inset-0 -z-10 bg-gradient-to-t from-black via-black/80 to-transparent transition-opacity duration-300"
        style={{
          opacity: opacidadOverlay
        }}
      />

      {/* ── Botón de Sonido Flotante si hay Video ─────────────────── */}
      {videoUrl && (
        <button
          type="button"
          onClick={toggleAudio}
          className="absolute top-6 right-6 z-30 p-2.5 rounded-full bg-black/60 hover:bg-black/90 text-white/80 hover:text-white border border-white/15 backdrop-blur-md transition-all active:scale-90 shadow-lg cursor-pointer"
          title={estaMuteado ? 'Activar sonido' : 'Silenciar video'}
        >
          {estaMuteado ? <VolumeX size={18} /> : <Volume2 size={18} className="text-emerald-400" />}
        </button>
      )}

      {/* ── Contenido Central Cinemático ─────────────────────────── */}
      <div className="relative z-20 max-w-4xl mx-auto w-full text-center flex flex-col items-center space-y-5 my-auto">
        
        {/* Badge Gourmet */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest text-amber-300 bg-black/60 border border-amber-500/40 backdrop-blur-md shadow-2xl">
          <Flame size={15} className="text-amber-400 animate-bounce" />
          <span>{configuracion?.hero_badge_texto || 'COCINA EN VIVO • SABOR ARTESANAL'}</span>
        </div>

        {/* Título Principal Tipográfico Gigante */}
        <div className="space-y-1">
          <h1 
            className={`${fuenteHeroClase} text-4xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl tracking-tight leading-[0.9] text-white uppercase drop-shadow-[0_10px_30px_rgba(0,0,0,0.8)]`}
          >
            {configuracion?.hero_linea_1 || 'POCAS PALABRAS.'}
          </h1>
          <h2 
            className={`${fuenteHeroClase} text-4xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl tracking-tight leading-[0.9] uppercase drop-shadow-[0_10px_30px_rgba(0,0,0,0.8)]`}
            style={{ color: 'var(--chefsy-text-hero-2, var(--chefsy-main))' }}
          >
            {configuracion?.hero_linea_2 || 'MUCHO CHEDDAR.'}
          </h2>
        </div>

        {/* Subtítulo / Frase */}
        <p className="font-bebas text-2xl sm:text-3xl md:text-4xl text-slate-200 tracking-wider uppercase drop-shadow-md">
          {configuracion?.titulo_principal || '¿QUÉ PINTA HOY?'}
        </p>

        {/* Buscador Central Cinemático */}
        <div className="w-full max-w-xl relative pt-2">
          <input
            id="busqueda_cinematic"
            type="text"
            placeholder="Buscá tu plato favorito (ej. Doble Smash, Lomo, Mozzarella)..."
            value={busqueda}
            onChange={(e) => onBusquedaChange(e.target.value)}
            className="w-full bg-black/60 border border-white/25 hover:border-white/50 focus:border-chefsy-400 text-white py-4 pl-12 pr-6 rounded-2xl outline-none transition-all shadow-2xl placeholder-slate-400 font-medium text-xs sm:text-sm backdrop-blur-xl"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />

          {sugerenciaBusqueda && (
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 animate-in fade-in duration-300">
              <button
                onClick={() => onBusquedaChange(sugerenciaBusqueda)}
                className="text-xs text-chefsy-400 hover:text-chefsy-300 font-semibold flex items-center gap-1 bg-black/90 px-3 py-1 rounded-full border border-white/15 backdrop-blur-sm shadow-md cursor-pointer"
              >
                <span>¿Buscabas</span>
                <span className="underline font-bold text-white">{sugerenciaBusqueda}</span>
                <span>?</span>
              </button>
            </div>
          )}
        </div>

      </div>

    </div>
  )
}
