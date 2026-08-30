'use client'

import React, { useState, useRef, useCallback } from 'react'
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
    setRotateX(-percentY * 12)
    setRotateY(percentX * 12)
    setIsHovered(true)
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    setRotateX(0)
    setRotateY(0)
  }

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative min-h-[40vh] lg:min-h-[85vh] w-full flex flex-col px-4 md:px-12 py-2 lg:py-10 overflow-visible select-none"
    >
      <style jsx>{`
        @keyframes floatSlow1 {
          0% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-12px) rotate(1.5deg); }
          100% { transform: translateY(0px) rotate(0deg); }
        }
        @keyframes floatSlow2 {
          0% { transform: translateY(-8px) rotate(-1deg); }
          50% { transform: translateY(6px) rotate(1deg); }
          100% { transform: translateY(-8px) rotate(-1deg); }
        }
        .anim-float-1 {
          animation: floatSlow1 6s ease-in-out infinite;
        }
        .anim-float-2 {
          animation: floatSlow2 7s ease-in-out infinite;
        }
      `}</style>

      {/* Contenedor Principal del Hero en Grilla */}
      <div className="relative z-40 flex-1 grid grid-cols-1 lg:grid-cols-2 pt-2 lg:pt-0 max-w-[1600px] mx-auto w-full gap-x-8 gap-y-2 lg:gap-y-4 items-center">
        
        {/* 1. Tipografía Gigante (Hero) */}
        <div className="flex flex-col items-center lg:items-start text-center lg:text-left z-30 pointer-events-none order-1 mt-2 lg:mt-0">
          <h1 
            className={`hero-title-1 ${fuenteHeroClase} text-[4rem] sm:text-[5rem] md:text-[6rem] lg:text-[7rem] xl:text-[8.5rem] 2xl:text-[9.5rem] tracking-normal leading-[0.85] uppercase drop-shadow-2xl`}
            style={{ color: 'var(--chefsy-text-hero-1, #ffffff)' }}
          >
            {configuracion?.hero_linea_1 || 'POCAS PALABRAS.'}
          </h1>
          <h1 
            className={`hero-title-2 ${fuenteHeroClase} text-[4rem] sm:text-[5rem] md:text-[6rem] lg:text-[7rem] xl:text-[8.5rem] 2xl:text-[9.5rem] tracking-normal leading-[0.85] uppercase drop-shadow-2xl`}
            style={{ color: 'var(--chefsy-text-hero-2, var(--chefsy-main))' }}
          >
            {configuracion?.hero_linea_2 || 'MUCHO CHEDDAR.'}
          </h1>
        </div>

        {/* 2. Imagen de Producto Gigante Flotante (o Doble Producto con Parallax) */}
        <div className="relative w-full flex items-center justify-center lg:justify-end z-20 order-2 lg:row-span-2 pt-1 lg:pt-0">
          <div 
            className="burger-float-wrapper relative w-full max-w-[260px] sm:max-w-[380px] md:max-w-[650px] xl:max-w-[850px] aspect-square transition-transform duration-200 ease-out"
            style={{
              transform: isHovered ? `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)` : 'none'
            }}
          >
            {/* Sombra de apoyo en el suelo */}
            <div className="absolute inset-x-0 bottom-6 h-1/3 bg-black/40 rounded-full blur-2xl -z-10 opacity-70"></div>
            
            {/* Imagen Principal */}
            <div className="w-full h-full relative anim-float-1">
              <Image 
                src={img1} 
                alt="Plato Estrella Chefsy" 
                fill
                priority
                sizes="(max-width: 768px) 100vw, 850px"
                className="object-contain"
                style={{
                  objectPosition: `${configuracion?.hero_pos_x ?? 50}% ${configuracion?.hero_pos_y ?? 50}%`,
                  transform: `scale(${(configuracion?.hero_escala ?? 100) / 100})`
                }}
              />
            </div>

            {/* Imagen Secundaria Flotante (si está configurada) */}
            {img2 && (
              <div className="absolute -bottom-4 -left-6 md:-bottom-8 md:-left-12 w-1/2 h-1/2 relative anim-float-2 z-30 drop-shadow-2xl">
                <Image 
                  src={img2} 
                  alt="Acompañamiento Chefsy" 
                  fill
                  sizes="(max-width: 768px) 50vw, 400px"
                  className="object-contain"
                />
              </div>
            )}
          </div>
        </div>

        {/* 3. Selector de Categorías y Buscador */}
        <div className="hero-controls flex flex-col gap-3 lg:gap-5 w-full max-w-lg relative z-40 order-3 lg:self-start mt-2 lg:mt-0">
          <p 
            className="font-bebas text-4xl md:text-7xl tracking-wide leading-none whitespace-nowrap text-center lg:text-left uppercase"
            style={{ color: 'var(--chefsy-text-menu, #ffffff)' }}
          >
            {configuracion?.titulo_principal || '¿QUÉ PINTA HOY?'}
          </p>
          <div className="relative w-full">
            <input
              id="busqueda_hero"
              name="busqueda_hero"
              type="text"
              placeholder="Ej. Cheddar, Papas, Mila especial..."
              value={busqueda}
              onChange={(e) => onBusquedaChange(e.target.value)}
              className="w-full bg-black/40 border border-white/20 hover:border-white/40 focus:border-chefsy-400 text-white py-4 pl-12 pr-6 rounded-2xl outline-none transition-all shadow-2xl placeholder-slate-400 font-medium text-sm backdrop-blur-md"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            
            {/* Sugerencia: ¿Quisiste decir? */}
            {sugerenciaBusqueda && (
              <div className="absolute -bottom-8 left-0 animate-in fade-in slide-in-from-top-2 duration-300">
                <button
                  onClick={() => onBusquedaChange(sugerenciaBusqueda)}
                  className="text-xs text-chefsy-400 hover:text-chefsy-300 font-semibold flex items-center gap-1 bg-black/80 px-3 py-1 rounded-full border border-white/10 backdrop-blur-sm shadow-md cursor-pointer"
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
    </div>
  )
}
