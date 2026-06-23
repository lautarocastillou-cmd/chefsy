'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Lock, Search } from 'lucide-react'
import { CategoriaCatalogo } from '@/tipos/catalogo'
import SelectorCategorias from '@/components/tienda/SelectorCategorias'
import { usarConfiguracionTienda } from '@/contexto/ConfiguracionTiendaContexto'

interface HeroSectionProps {
  categoriasActivas: CategoriaCatalogo[]
  categoriaSeleccionada: string | null
  busqueda: string
  sugerenciaBusqueda?: string | null
  selectorAbierto: boolean
  animatedWordIndex: number
  animatedWords: string[]
  onBusquedaChange: (valor: string) => void
  onToggleSelector: () => void
  onSeleccionarCategoria: (id: string | null) => void
}

export default function HeroSection({
  categoriasActivas,
  categoriaSeleccionada,
  busqueda,
  sugerenciaBusqueda,
  selectorAbierto,
  animatedWordIndex,
  animatedWords,
  onBusquedaChange,
  onToggleSelector,
  onSeleccionarCategoria,
}: HeroSectionProps) {
  const { configuracion } = usarConfiguracionTienda()

  const fuenteHeroClase = {
    bebas: 'font-bebas',
    montserrat: 'font-montserrat',
    inter: 'font-inter',
    anton: 'font-anton'
  }[configuracion?.fuente_hero || 'bebas'] || 'font-bebas'

  return (
    <>
      {/* --- CABECERA DE LA TIENDA --- */}
      <header className="bg-transparent px-4 py-6 relative z-40 border-b border-white/5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden relative">
              <Image 
                src={configuracion?.logo_url || "/logo.jpg"} 
                alt="Chefsy" 
                fill
                className="object-cover"
              />
            </div>
            <span className="font-bebas text-2xl md:text-3xl text-white tracking-wider">CHEFSY</span>
              {/* Navegación eliminada por ahora para enfocar en el menú online */}
          </div>

          <div className="flex items-center gap-4">
            {/* El botón de acceso a personal fue removido por seguridad. Se accede ingresando a /dashboard */}
          </div>
        </div>
      </header>

      {/* --- HERO SECTION TIPO SQEW --- */}
      <div className="relative min-h-[40vh] lg:min-h-[85vh] w-full flex flex-col px-4 md:px-12 py-2 lg:py-10 overflow-visible">
        
        {/* Contenedor Principal del Hero */}
        <div className="relative z-50 flex-1 grid grid-cols-1 lg:grid-cols-2 pt-2 lg:pt-0 max-w-[1600px] mx-auto w-full gap-x-8 gap-y-2 lg:gap-y-4 items-center">
          
          {/* 1. Tipografía Gigante (Hero) */}
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left z-30 pointer-events-none order-1 mt-2 lg:mt-0">
            <h1 className={`hero-title-1 ${fuenteHeroClase} text-[4rem] sm:text-[5rem] md:text-[6rem] lg:text-[7rem] xl:text-[8.5rem] 2xl:text-[9.5rem] text-white tracking-normal leading-[0.85] uppercase`}>
              {configuracion?.hero_linea_1 || 'POCAS PALABRAS.'}
            </h1>
            <h1 className={`hero-title-2 ${fuenteHeroClase} text-[4rem] sm:text-[5rem] md:text-[6rem] lg:text-[7rem] xl:text-[8.5rem] 2xl:text-[9.5rem] text-chefsy tracking-normal leading-[0.85] uppercase`}>
              {configuracion?.hero_linea_2 || 'MUCHO CHEDDAR.'}
            </h1>
          </div>

          {/* 2. Imagen de Producto Gigante Flotante */}
          <div className="relative w-full flex items-center justify-center lg:justify-end pointer-events-none z-20 order-2 lg:row-span-2 pt-1 lg:pt-0">
            <div className="burger-float-wrapper relative w-full max-w-[250px] sm:max-w-[350px] md:max-w-[650px] xl:max-w-[850px] aspect-square">
              {/* Sombra de alto rendimiento (Radial Gradient en lugar de drop-shadow CSS que laguea celulares) */}
              <div className="absolute inset-x-0 bottom-10 h-1/2 bg-black/60 blur-3xl rounded-full scale-y-50 -z-10 mix-blend-multiply opacity-70"></div>
              
              <Image 
                src={configuracion?.hero_image_url || "/burger-loca.webp"} 
                alt="Chefsy Hero" 
                fill
                priority
                sizes="(max-width: 768px) 100vw, 850px"
                className="object-contain transition-all duration-200"
                style={{
                  objectPosition: `${configuracion?.hero_pos_x ?? 50}% ${configuracion?.hero_pos_y ?? 50}%`,
                  transform: `scale(${(configuracion?.hero_escala ?? 100) / 100})`
                }}
              />
            </div>
          </div>

          {/* 3. Selector de Categorías y Subtítulo */}
          <div className="hero-controls flex flex-col gap-3 lg:gap-5 w-full max-w-lg relative z-40 order-3 lg:self-start mt-2 lg:mt-0">
            <p className="font-bebas text-4xl md:text-7xl text-white tracking-wide leading-none whitespace-nowrap text-center lg:text-left uppercase">
              {configuracion?.titulo_principal || '¿QUÉ PINTA HOY?'}
            </p>
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Ej. Cheddar, Papas, Mila especial..."
                value={busqueda}
                onChange={(e) => onBusquedaChange(e.target.value)}
                className="w-full bg-white/5 backdrop-blur-xl border border-white/20 hover:border-white/40 focus:border-chefsy-400 text-white py-4 pl-12 pr-6 rounded-2xl outline-none transition-all shadow-2xl placeholder-slate-400 font-medium"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              
              {/* Sugerencia: ¿Quisiste decir? */}
              {sugerenciaBusqueda && (
                <div className="absolute -bottom-8 left-0 animate-in fade-in slide-in-from-top-2 duration-300">
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
            <div className="flex items-center gap-4 w-full">
              <SelectorCategorias
                categoriasActivas={categoriasActivas}
                categoriaSeleccionada={categoriaSeleccionada}
                selectorAbierto={selectorAbierto}
                onToggleSelector={onToggleSelector}
                onSeleccionarCategoria={onSeleccionarCategoria}
              />
              <div className="word-carousel w-[50%] h-[60px]">
                <h2
                  key={animatedWordIndex}
                  className="word-enter font-bebas text-4xl sm:text-5xl md:text-6xl text-white tracking-wide"
                >
                  {animatedWords[animatedWordIndex]}
                </h2>
              </div>
            </div>
          </div>

        </div>

      </div>
    </>
  )
}
