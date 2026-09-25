'use client'

import React, { useState, useRef } from 'react'
import { Search } from 'lucide-react'
import MarcoHistoriaInstagram from './MarcoHistoriaInstagram'
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

export default function HeroParallaxDoble({
  configuracion,
  busqueda,
  sugerenciaBusqueda,
  fuenteHeroClase,
  onBusquedaChange,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [rotateX, setRotateX] = useState(0)
  const [rotateY, setRotateY] = useState(0)
  const [isHovered, setIsHovered] = useState(false)


  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current || typeof window === 'undefined' || window.innerWidth < 768) return
    const rect = containerRef.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const percentX = (e.clientX - centerX) / (rect.width / 2)
    const percentY = (e.clientY - centerY) / (rect.height / 2)
    setRotateX(-percentY * 10)
    setRotateY(percentX * 10)
    setIsHovered(true)
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    setRotateX(0)
    setRotateY(0)
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
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full flex flex-col px-4 md:px-12 pt-1 pb-4 md:py-10 lg:py-16 overflow-visible select-none min-h-0 md:min-h-[360px] lg:min-h-[420px]"
    >

      {/* Contenedor Principal del Hero en Grilla */}
      <div className="relative z-40 flex-1 grid grid-cols-1 lg:grid-cols-[1fr_auto] max-w-[1400px] mx-auto w-full gap-x-6 gap-y-4 md:gap-y-6 items-center">
        
        {/* 1. Tipografía Gigante (Hero) Adaptada a Móvil y Desktop */}
        <div className="flex flex-col items-center lg:items-start text-center lg:text-left z-30 pointer-events-none order-1 lg:col-start-1 lg:row-start-1">
          <h1 
            className={`hero-title-1 ${fuenteHeroClase} text-3xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl tracking-tight leading-[0.88] uppercase drop-shadow-xl break-words`}
            style={{ color: 'var(--chefsy-text-hero-1, #ffffff)' }}
          >
            {configuracion?.hero_linea_1 || 'POCAS PALABRAS.'}
          </h1>
          <h2 
            className={`hero-title-2 ${fuenteHeroClase} text-3xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl tracking-tight leading-[0.88] uppercase drop-shadow-xl mt-1 break-words`}
            style={efectoEstiloLinea2}
          >
            {configuracion?.hero_linea_2 || 'MUCHO CHEDDAR.'}
          </h2>
        </div>

        {/* 2. Subtítulo y Buscador (Centrado en iPad / Mobile y arriba del carrusel; a la izquierda en PC) */}
        <div className="hidden md:flex flex-col items-center lg:items-start text-center lg:text-left gap-4 w-full max-w-md mx-auto lg:mx-0 relative z-40 order-2 lg:order-3 lg:col-start-1 lg:row-start-2 lg:self-start lg:pt-2">
          <p 
            className="font-bebas text-4xl md:text-5xl lg:text-6xl tracking-wide leading-none uppercase text-center lg:text-left"
            style={{ color: 'var(--chefsy-text-menu, #ffffff)' }}
          >
            {configuracion?.titulo_principal || '¿QUÉ PINTA HOY?'}
          </p>

          <div className="relative w-full">
            <input
              id="busqueda_hero"
              type="text"
              placeholder="Ej. Cheddar, Papas, Mila especial..."
              value={busqueda}
              onChange={(e) => onBusquedaChange(e.target.value)}
              className="w-full bg-black/40 border border-white/20 hover:border-white/40 focus:border-chefsy-400 text-white py-3.5 pl-12 pr-6 rounded-2xl outline-none transition-all shadow-xl placeholder-slate-400 font-medium text-sm"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />

            {sugerenciaBusqueda && (
              <div className="absolute -bottom-8 left-0 right-0 lg:right-auto flex justify-center lg:justify-start animate-in fade-in duration-300">
                <button
                  onClick={() => onBusquedaChange(sugerenciaBusqueda)}
                  className="flex items-center gap-1.5 px-3 py-1 bg-chefsy-500/20 hover:bg-chefsy-500/30 border border-chefsy-500/40 rounded-full text-xs font-medium text-white transition-all shadow-lg"
                >
                  <span className="text-slate-300">¿Quisiste decir</span>
                  <span className="text-chefsy-400 font-bold">{sugerenciaBusqueda}</span>
                  <span className="text-slate-300">?</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 3. Marco de Historias de Instagram (Carrusel de Promociones / Imágenes) */}
        <div 
          className="relative flex items-center justify-center lg:justify-end z-20 order-3 lg:order-2 lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:pl-6 transition-transform duration-200 ease-out w-full"
          style={{
            transform: isHovered 
              ? `perspective(1000px) rotateX(${rotateX * 0.5}deg) rotateY(${rotateY * 0.5}deg) scale(1.02)` 
              : 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)'
          }}
        >
          <MarcoHistoriaInstagram
            imagenesLoop={configuracion?.hero_loop_imagenes}
          />
        </div>

      </div>

    </div>
  )
}
