'use client'

import React from 'react'
import Image from 'next/image'
import { Search, Star, Clock, Sparkles } from 'lucide-react'
import { CategoriaCatalogo } from '@/tipos/catalogo'
import { ConfiguracionTienda } from '@/servicios/supabase/configuracion'
import { usarCarrito } from '@/contexto/CarritoContexto'

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
  const { turnoActivo, esDomingoCerrado } = usarCarrito()
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
    <div className="relative w-full max-w-4xl mx-auto px-4 md:px-8 py-5 sm:py-10 md:py-14 flex flex-col items-center text-center select-none space-y-4 sm:space-y-6">
      
      {/* ── Logo Central Prominente con Ring y Glow ───────────────── */}
      <div className="relative group">
        <div 
          className="absolute -inset-2 rounded-[28px] blur-xl opacity-35 transition duration-500 group-hover:opacity-70"
          style={{ backgroundColor: 'var(--chefsy-main, #2A6348)' }}
        />
        <div className="relative w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-2xl sm:rounded-3xl overflow-hidden border-2 border-white/20 shadow-2xl bg-zinc-900">
          <Image
            src={configuracion?.logo_url || '/logo.jpg'}
            alt="Logo del Restaurante"
            fill
            priority
            sizes="(max-width: 768px) 80px, 128px"
            className="object-cover"
          />
        </div>
      </div>

      {/* ── Badges de Confianza y Rating ⭐ 4.9 ───────────────────── */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {/* Rating Google */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 backdrop-blur-md shadow-md">
          <Star size={13} className="fill-amber-400 text-amber-400" />
          <span>{configuracion?.hero_badge_texto || '⭐ 4.9 en Google (+500 reseñas)'}</span>
        </div>

        {/* Estado en Vivo / Horario */}
        {configuracion?.hero_mostrar_horario !== false && (
          turnoActivo ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 backdrop-blur-md shadow-md">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Abierto hoy • Recibiendo pedidos</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold text-rose-300 bg-rose-500/10 border border-rose-500/30 backdrop-blur-md shadow-md">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>{esDomingoCerrado ? 'Cerrado los domingos' : 'Cerrado en este momento'}</span>
            </div>
          )
        )}
      </div>

      {/* ── Título Principal y Subtítulo Minimalista ──────────────── */}
      <div className="space-y-1 sm:space-y-2 max-w-2xl">
        <h1 
          className={`${fuenteHeroClase} text-3xl sm:text-5xl md:text-6xl lg:text-7xl tracking-tight leading-[0.95] text-white uppercase drop-shadow-md`}
        >
          {configuracion?.hero_linea_1 || 'POCAS PALABRAS.'}{' '}
          <span style={efectoEstiloLinea2}>
            {configuracion?.hero_linea_2 || 'MUCHO CHEDDAR.'}
          </span>
        </h1>
        <p 
          className="font-bebas text-xl sm:text-2xl md:text-3xl text-slate-300 tracking-wide uppercase"
          style={{ color: 'var(--chefsy-text-menu, #ffffff)' }}
        >
          {configuracion?.titulo_principal || '¿QUÉ PINTA HOY?'}
        </p>
      </div>

      {/* ── Buscador Redondeado (Solo Desktop) ────────────────────── */}
      <div className="hidden md:block w-full max-w-lg relative pt-1">
        <input
          id="busqueda_minimalista"
          type="text"
          placeholder="Escribí para buscar en el menú..."
          value={busqueda}
          onChange={(e) => onBusquedaChange(e.target.value)}
          className="w-full bg-zinc-900/90 border border-white/20 hover:border-white/40 focus:border-chefsy-400 text-white py-3.5 pl-12 pr-6 rounded-full outline-none transition-all shadow-xl placeholder-slate-400 font-medium text-xs sm:text-sm backdrop-blur-md"
        />
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
      </div>

    </div>
  )
}
