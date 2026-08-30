'use client'

import React, { useState, useRef } from 'react'
import Image from 'next/image'
import { Search } from 'lucide-react'
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

  // Separar imagen principal y secundaria si vienen con '|'
  const imagenes = (configuracion?.hero_image_url || '/burger-loca.webp').split('|')
  const img1 = imagenes[0]?.trim() || '/burger-loca.webp'
  const img2 = imagenes[1]?.trim() || ''

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
      className="relative w-full flex flex-col px-4 md:px-12 py-4 md:py-8 lg:py-12 overflow-visible select-none"
    >
      {/* Estilos CSS para animaciones flotantes */}
      <style jsx>{`
        @keyframes floatSlow1 {
          0% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-8px) rotate(1deg); }
          100% { transform: translateY(0px) rotate(0deg); }
        }
        @keyframes floatSlow2 {
          0% { transform: translateY(-6px) rotate(-1deg); }
          50% { transform: translateY(4px) rotate(1deg); }
          100% { transform: translateY(-6px) rotate(-1deg); }
        }
        .anim-float-1 {
          animation: floatSlow1 5s ease-in-out infinite;
        }
        .anim-float-2 {
          animation: floatSlow2 6s ease-in-out infinite;
        }
      `}</style>

      {/* Contenedor Principal del Hero en Grilla */}
      <div className="relative z-40 flex-1 grid grid-cols-1 lg:grid-cols-2 max-w-[1600px] mx-auto w-full gap-x-8 gap-y-4 items-center">
        
        {/* 1. Tipografía Gigante (Hero) Adaptada a Móvil */}
        <div className="flex flex-col items-center lg:items-start text-center lg:text-left z-30 pointer-events-none order-1">
          <h1 
            className={`hero-title-1 ${fuenteHeroClase} text-3xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl tracking-tight leading-[0.9] uppercase drop-shadow-xl`}
            style={{ color: 'var(--chefsy-text-hero-1, #ffffff)' }}
          >
            {configuracion?.hero_linea_1 || 'POCAS PALABRAS.'}
          </h1>
          <h2 
            className={`hero-title-2 ${fuenteHeroClase} text-3xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl tracking-tight leading-[0.9] uppercase drop-shadow-xl mt-0.5`}
            style={efectoEstiloLinea2}
          >
            {configuracion?.hero_linea_2 || 'MUCHO CHEDDAR.'}
          </h2>
        </div>

        {/* 2. Imagen de Producto Flotante Proporcionada */}
        <div className="relative w-full flex items-center justify-center lg:justify-end z-20 order-2 lg:row-span-2">
          <div 
            className="burger-float-wrapper relative w-full max-w-[200px] sm:max-w-[280px] md:max-w-[480px] lg:max-w-[620px] aspect-square transition-transform duration-200 ease-out"
            style={{
              transform: isHovered ? `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)` : 'none'
            }}
          >
            {/* Sombra de apoyo en el suelo */}
            <div className="absolute inset-x-0 bottom-4 h-1/4 bg-black/40 rounded-full blur-xl -z-10 opacity-70"></div>
            
            {/* Imagen Principal */}
            <div className="w-full h-full relative anim-float-1">
              <Image 
                src={img1} 
                alt="Plato Estrella" 
                fill
                priority
                sizes="(max-width: 768px) 200px, 620px"
                className="object-contain transition-all duration-300"
                style={{
                  objectPosition: `${configuracion?.hero_pos_x ?? 50}% ${configuracion?.hero_pos_y ?? 50}%`,
                  transform: `scale(${(configuracion?.hero_escala ?? 100) / 100})`
                }}
              />
            </div>

            {/* Imagen Secundaria si existe */}
            {img2 && (
              <div className="absolute -bottom-2 -left-4 sm:-bottom-4 sm:-left-8 w-2/3 h-2/3 anim-float-2 z-10">
                <Image 
                  src={img2} 
                  alt="Acompañamiento" 
                  fill
                  sizes="(max-width: 768px) 140px, 350px"
                  className="object-contain"
                />
              </div>
            )}
          </div>
        </div>

        {/* 3. Subtítulo y Buscador (Solo Desktop, ya que mobile tiene buscador superior) */}
        <div className="hidden md:flex flex-col gap-3 w-full max-w-lg relative z-40 order-3 lg:self-start">
          <p 
            className="font-bebas text-3xl md:text-5xl tracking-wide leading-none uppercase"
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
              <div className="absolute -bottom-8 left-0 animate-in fade-in duration-300">
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

      </div>

    </div>
  )
}
