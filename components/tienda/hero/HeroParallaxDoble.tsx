'use client'

import React, { useState, useRef } from 'react'
import { Search, X } from 'lucide-react'
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
    setRotateX(-percentY * 8)
    setRotateY(percentX * 8)
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
    textShadow: '0 0 35px rgba(34, 197, 94, 0.25)',
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
      filter: 'drop-shadow(0 0 20px var(--chefsy-text-hero-2, var(--chefsy-main)))',
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
      className="relative w-full flex flex-col px-4 md:px-12 pt-2 pb-6 md:py-10 lg:py-14 overflow-visible select-none min-h-0 md:min-h-[380px] lg:min-h-[460px]"
    >

      {/* Contenedor Principal del Hero: Flex Unificado (Desktop: Lado a Lado | Mobile/iPad: Centrado y Apilado) */}
      <div className="relative z-40 flex-1 flex flex-col lg:flex-row items-center justify-between max-w-[1440px] mx-auto w-full gap-8 lg:gap-12 xl:gap-16">
        
        {/* COLUMNA IZQUIERDA (o SUPERIOR en Tablet/Mobile): Textos + Subtítulo + Buscador UNIFICADOS */}
        <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left z-30 w-full max-w-2xl xl:max-w-3xl">
          
          {/* Títulos Principales del Hero */}
          <div className="space-y-1 sm:space-y-2 pointer-events-none w-full">
            <h1 
              className={`hero-title-1 ${fuenteHeroClase} text-4xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl 2xl:text-[104px] tracking-tight leading-[0.88] uppercase drop-shadow-2xl break-words`}
              style={{ color: 'var(--chefsy-text-hero-1, #ffffff)' }}
            >
              {configuracion?.hero_linea_1 || 'POCAS PALABRAS.'}
            </h1>
            <h2 
              className={`hero-title-2 ${fuenteHeroClase} text-4xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl 2xl:text-[104px] tracking-tight leading-[0.88] uppercase drop-shadow-2xl mt-1 break-words`}
              style={efectoEstiloLinea2}
            >
              {configuracion?.hero_linea_2 || 'MUCHO CHEDDAR.'}
            </h2>
          </div>

          {/* Subtítulo / Frase Integrada */}
          {configuracion?.titulo_principal && (
            <div className="mt-3 sm:mt-4 md:mt-5">
              <p 
                className={`${fuenteHeroClase} text-2xl sm:text-3xl md:text-4xl lg:text-5xl tracking-wide uppercase font-bold drop-shadow-lg`}
                style={{ color: 'var(--chefsy-text-menu, #e2e8f0)' }}
              >
                {configuracion.titulo_principal}
              </p>
            </div>
          )}

          {/* Buscador Prominente (Grande y organizado) - Visible en Tablet y Desktop */}
          <div className="hidden md:flex flex-col items-center lg:items-start w-full max-w-xl xl:max-w-2xl mt-6 lg:mt-8 relative z-40">
            <div className="relative w-full group">
              <input
                id="busqueda_hero"
                type="text"
                placeholder="Buscar hamburguesas, papas, bebidas, promos..."
                value={busqueda}
                onChange={(e) => onBusquedaChange(e.target.value)}
                className="w-full bg-zinc-950/80 backdrop-blur-xl border-2 border-white/15 hover:border-emerald-500/50 focus:border-emerald-400 text-white py-4 sm:py-5 pl-14 sm:pl-16 pr-12 rounded-2xl sm:rounded-3xl outline-none transition-all shadow-[0_10px_35px_rgba(0,0,0,0.6)] focus:shadow-[0_0_35px_rgba(52,211,153,0.3)] placeholder:text-slate-400 font-medium text-base sm:text-lg focus:ring-4 focus:ring-emerald-500/20"
              />
              <Search className="absolute left-5 sm:left-6 top-1/2 -translate-y-1/2 text-emerald-400 group-hover:scale-110 transition-transform duration-200" size={22} />
              
              {busqueda && (
                <button
                  type="button"
                  onClick={() => onBusquedaChange('')}
                  className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors cursor-pointer"
                  title="Limpiar búsqueda"
                >
                  <X size={16} />
                </button>
              )}

              {sugerenciaBusqueda && (
                <div className="absolute -bottom-9 left-0 right-0 lg:right-auto flex justify-center lg:justify-start animate-in fade-in duration-300">
                  <button
                    onClick={() => onBusquedaChange(sugerenciaBusqueda)}
                    className="flex items-center gap-1.5 px-3.5 py-1 bg-emerald-950/80 hover:bg-emerald-900/90 border border-emerald-500/40 rounded-full text-xs font-semibold text-emerald-300 transition-all shadow-lg"
                  >
                    <span className="text-slate-400">¿Quisiste decir</span>
                    <span className="text-emerald-400 font-bold">{sugerenciaBusqueda}</span>
                    <span className="text-slate-400">?</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA (o INFERIOR en Tablet/Mobile): Marco de Historias en Grande */}
        <div 
          className="relative flex items-center justify-center lg:justify-end z-20 shrink-0 transition-transform duration-200 ease-out"
          style={{
            transform: isHovered 
              ? `perspective(1000px) rotateX(${rotateX * 0.5}deg) rotateY(${rotateY * 0.5}deg) scale(1.02)` 
              : 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)'
          }}
        >
          <div className="relative">
            {/* Resplandor ambiental de fondo */}
            <div className="absolute -inset-6 bg-emerald-500/15 rounded-[44px] blur-3xl -z-10 pointer-events-none" />
            
            <MarcoHistoriaInstagram
              imagenesLoop={configuracion?.hero_loop_imagenes}
              transicion={configuracion?.hero_loop_transicion}
            />
          </div>
        </div>

      </div>

    </div>
  )
}
