'use client'

import React from 'react'
import Image from 'next/image'
import { Search, Star, Clock, Sparkles, MapPin } from 'lucide-react'
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

export default function HeroCentradoMinimalista({
  configuracion,
  busqueda,
  sugerenciaBusqueda,
  fuenteHeroClase,
  onBusquedaChange,
}: Props) {
  return (
    <div className="relative w-full max-w-4xl mx-auto px-4 md:px-8 py-8 sm:py-14 flex flex-col items-center text-center select-none space-y-6">
      
      {/* ── Logo Central Prominente con Ring y Glow ───────────────── */}
      <div className="relative group">
        <div 
          className="absolute -inset-2 rounded-[32px] blur-xl opacity-40 transition duration-500 group-hover:opacity-75"
          style={{ backgroundColor: 'var(--chefsy-main, #2A6348)' }}
        />
        <div className="relative w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-3xl overflow-hidden border-2 border-white/20 shadow-2xl bg-zinc-900">
          <Image
            src={configuracion?.logo_url || '/logo.jpg'}
            alt="Logo del Restaurante"
            fill
            priority
            sizes="(max-width: 768px) 96px, 128px"
            className="object-cover"
          />
        </div>
      </div>

      {/* ── Badges de Confianza y Rating ⭐ 4.9 ───────────────────── */}
      <div className="flex flex-wrap items-center justify-center gap-2.5">
        {/* Rating Google */}
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 backdrop-blur-md shadow-md">
          <Star size={14} className="fill-amber-400 text-amber-400" />
          <span>{configuracion?.hero_badge_texto || '⭐ 4.9 en Google (+500 reseñas)'}</span>
        </div>

        {/* Estado en Vivo / Horario */}
        {configuracion?.hero_mostrar_horario !== false && (
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 backdrop-blur-md shadow-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Abierto hoy • 20:30 a 01:00 hs</span>
          </div>
        )}
      </div>

      {/* ── Título Principal y Subtítulo Minimalista ──────────────── */}
      <div className="space-y-2 max-w-2xl">
        <h1 
          className={`${fuenteHeroClase} text-4xl sm:text-5xl md:text-6xl lg:text-7xl tracking-tight leading-[0.95] text-white uppercase drop-shadow-md`}
        >
          {configuracion?.hero_linea_1 || 'POCAS PALABRAS.'}{' '}
          <span style={{ color: 'var(--chefsy-text-hero-2, var(--chefsy-main))' }}>
            {configuracion?.hero_linea_2 || 'MUCHO CHEDDAR.'}
          </span>
        </h1>
        <p 
          className="font-bebas text-2xl sm:text-3xl text-slate-300 tracking-wide uppercase"
          style={{ color: 'var(--chefsy-text-menu, #ffffff)' }}
        >
          {configuracion?.titulo_principal || '¿QUÉ PINTA HOY?'}
        </p>
      </div>

      {/* ── Buscador Redondeado Estilo Píldora ────────────────────── */}
      <div className="w-full max-w-lg relative pt-1">
        <input
          id="busqueda_minimalista"
          type="text"
          placeholder="Escribí para buscar en el menú..."
          value={busqueda}
          onChange={(e) => onBusquedaChange(e.target.value)}
          className="w-full bg-zinc-900/90 border border-white/20 hover:border-white/40 focus:border-chefsy-400 text-white py-3.5 sm:py-4 pl-12 pr-6 rounded-full outline-none transition-all shadow-xl placeholder-slate-400 font-medium text-xs sm:text-sm backdrop-blur-md"
        />
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />

        {sugerenciaBusqueda && (
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 animate-in fade-in duration-300">
            <button
              onClick={() => onBusquedaChange(sugerenciaBusqueda)}
              className="text-xs text-chefsy-400 hover:text-chefsy-300 font-semibold flex items-center gap-1 bg-black/90 px-3 py-1 rounded-full border border-white/10 backdrop-blur-sm shadow-md cursor-pointer"
            >
              <span>¿Buscabas</span>
              <span className="underline font-bold text-white">{sugerenciaBusqueda}</span>
              <span>?</span>
            </button>
          </div>
        )}
      </div>

    </div>
  )
}
