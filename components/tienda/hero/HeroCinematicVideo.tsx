'use client'

import React, { useRef } from 'react'
import { Search, Flame, Volume2, VolumeX } from 'lucide-react'
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

  const efectoTitulo = configuracion?.efecto_titulo_hero || 'none'
  const colorSecundario = configuracion?.color_titulo_secundario || '#F59E0B'

  let efectoEstiloLinea2: React.CSSProperties = {
    color: 'var(--chefsy-text-hero-2, var(--chefsy-main))',
  }

  if (efectoTitulo === 'gradient') {
    efectoEstiloLinea2 = {
      backgroundImage: `linear-gradient(135deg, var(--chefsy-text-hero-2, var(--chefsy-main)), ${colorSecundario})`,
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
    }
  } else if (efectoTitulo === 'neon_glow') {
    efectoEstiloLinea2 = {
      color: 'var(--chefsy-text-hero-2, var(--chefsy-main))',
      filter: 'drop-shadow(0 0 20px var(--chefsy-main))',
    }
  } else if (efectoTitulo === 'stroke') {
    efectoEstiloLinea2 = {
      WebkitTextStroke: '2px var(--chefsy-text-hero-2, var(--chefsy-main))',
      color: 'transparent',
    }
  }

  return (
    <div className="relative w-full flex flex-col justify-center px-4 md:px-12 py-6 sm:py-10 md:py-16 overflow-hidden select-none">
      
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
          className="absolute top-4 right-4 z-30 p-2 rounded-full bg-black/80 hover:bg-black text-white/80 hover:text-white border border-white/15 transition-all active:scale-90 shadow-lg cursor-pointer"
          title={estaMuteado ? 'Activar sonido' : 'Silenciar video'}
        >
          {estaMuteado ? <VolumeX size={15} /> : <Volume2 size={15} className="text-emerald-400" />}
        </button>
      )}

      {/* ── Contenido Central Cinemático Proporcionado ───────────── */}
      <div className="relative z-20 max-w-4xl mx-auto w-full text-center flex flex-col items-center space-y-3 sm:space-y-4 my-auto">
        
        {/* Badge Gourmet */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider text-amber-300 bg-black/80 border border-amber-500/40 shadow-xl">
          <Flame size={13} className="text-amber-400 animate-bounce" />
          <span>{configuracion?.hero_badge_texto || 'COCINA EN VIVO • SABOR ARTESANAL'}</span>
        </div>

        {/* Título Principal Tipográfico Proporcional */}
        <div className="space-y-0.5">
          <h1 
            className={`${fuenteHeroClase} text-3xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl tracking-tight leading-[0.9] text-white uppercase drop-shadow-[0_8px_20px_rgba(0,0,0,0.8)]`}
          >
            {configuracion?.hero_linea_1 || 'POCAS PALABRAS.'}
          </h1>
          <h2 
            className={`${fuenteHeroClase} text-3xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl tracking-tight leading-[0.9] uppercase drop-shadow-[0_8px_20px_rgba(0,0,0,0.8)]`}
            style={efectoEstiloLinea2}
          >
            {configuracion?.hero_linea_2 || 'MUCHO CHEDDAR.'}
          </h2>
        </div>

        {/* Subtítulo / Frase */}
        <p className="font-bebas text-xl sm:text-2xl md:text-3xl text-slate-200 tracking-wider uppercase drop-shadow-md">
          {configuracion?.titulo_principal || '¿QUÉ PINTA HOY?'}
        </p>

        {/* Buscador Central Cinemático (Solo Desktop) */}
        <div className="hidden md:block w-full max-w-xl relative pt-2">
          <input
            id="busqueda_cinematic"
            type="text"
            placeholder="Buscá tu plato favorito (ej. Doble Smash, Lomo, Mozzarella)..."
            value={busqueda}
            onChange={(e) => onBusquedaChange(e.target.value)}
            className="w-full bg-black/80 border border-white/25 hover:border-white/50 focus:border-chefsy-400 text-white py-3.5 pl-12 pr-6 rounded-2xl outline-none transition-all shadow-2xl placeholder-slate-400 font-medium text-xs sm:text-sm"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
        </div>

      </div>

    </div>
  )
}
