'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Lock, Search } from 'lucide-react'
import { CategoriaCatalogo } from '@/tipos/catalogo'
import SelectorCategorias from '@/components/tienda/SelectorCategorias'

interface HeroSectionProps {
  categoriasActivas: CategoriaCatalogo[]
  categoriaSeleccionada: string | null
  busqueda: string
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
  selectorAbierto,
  animatedWordIndex,
  animatedWords,
  onBusquedaChange,
  onToggleSelector,
  onSeleccionarCategoria,
}: HeroSectionProps) {
  return (
    <>
      {/* --- CABECERA DE LA TIENDA --- */}
      <header className="bg-transparent px-4 py-6 relative z-40 border-b border-white/5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden relative">
              <Image 
                src="/logo.jpg" 
                alt="Chefsy" 
                fill
                className="object-cover"
              />
            </div>
            <span className="font-bebas text-2xl md:text-3xl text-white tracking-wider">CHEFSY</span>
              {/* Navegación */}
              <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
                <Link href="/" className="text-white font-semibold transition-colors cursor-pointer">Tienda</Link>
                <Link href="/sobre-nosotros" className="text-slate-400 hover:text-white transition-colors cursor-pointer">Nosotros</Link>
              </nav>
          </div>

          <div className="flex items-center gap-4">
            {/* Acceso Empleados */}
            <Link
              href="/dashboard"
              className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all flex items-center gap-2 text-xs font-medium"
              title="Acceso Personal"
            >
              <Lock size={16} />
              <span className="hidden sm:inline">Personal</span>
            </Link>
          </div>
        </div>
      </header>

      {/* --- HERO SECTION TIPO SQEW --- */}
      <div className="relative min-h-[40vh] lg:min-h-[85vh] w-full flex flex-col px-4 md:px-12 py-2 lg:py-10 overflow-visible">
        
        {/* Contenedor Principal del Hero */}
        <div className="relative z-50 flex-1 grid grid-cols-1 lg:grid-cols-2 pt-2 lg:pt-0 max-w-[1600px] mx-auto w-full gap-x-8 gap-y-2 lg:gap-y-4 items-center">
          
          {/* 1. Tipografía Gigante (Hero) */}
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left z-30 pointer-events-none order-1 mt-2 lg:mt-0">
            <h1 className="hero-title-1 font-bebas text-[3rem] md:text-[6rem] lg:text-[6.5rem] xl:text-[8rem] 2xl:text-[9rem] text-white tracking-normal leading-[0.85]">
              POCAS PALABRAS.
            </h1>
            <h1 className="hero-title-2 font-bebas text-[3rem] md:text-[6rem] lg:text-[6.5rem] xl:text-[8rem] 2xl:text-[9rem] text-chefsy tracking-normal leading-[0.85]">
              MUCHO CHEDDAR.
            </h1>
          </div>

          {/* 2. Imagen de Producto Gigante Flotante */}
          <div className="relative w-full flex items-center justify-center lg:justify-end pointer-events-none z-20 order-2 lg:row-span-2 pt-1 lg:pt-0">
            <div className="burger-float-wrapper relative w-full max-w-[200px] sm:max-w-[300px] md:max-w-[600px] xl:max-w-[800px] aspect-square drop-shadow-[0_30px_60px_rgba(0,0,0,0.8)]">
              <Image 
                src="/burger-loca.webp" 
                alt="Chefsy Burger" 
                fill
                priority
                placeholder="blur"
                blurDataURL="data:image/jpeg;base64,/9j/2wBDACgcHiMeGSgjISMtKygwPGRBPDc3PHtYXUlkkYCZlo+AjIqgtObDoKrarYqMyP/L2u71////m8H////6/+b9//j/2wBDASstLTw1PHZBQXb4pYyl+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj/wAARCAAWABQDASIAAhEBAxEB/8QAGQABAAIDAAAAAAAAAAAAAAAAAAIDAQQF/8QAGxAAAgMAAwAAAAAAAAAAAAAAAAECAxESITH/xAAXAQEBAQEAAAAAAAAAAAAAAAABAAID/8QAFxEBAQEBAAAAAAAAAAAAAAAAABEBAv/aAAwDAQACEQMRAD8A0a6dJzoxeF1LWE7GsOe9N5jnSr7BfJrkBoiELWjMrXgBRKXN6ABgf//Z"
                sizes="(max-width: 768px) 100vw, 800px"
                className="object-contain object-top drop-shadow-2xl"
              />
            </div>
          </div>

          {/* 3. Selector de Categorías y Subtítulo */}
          <div className="hero-controls flex flex-col gap-3 lg:gap-5 w-full max-w-lg relative z-40 order-3 lg:self-start mt-2 lg:mt-0">
            <p className="font-bebas text-4xl md:text-7xl text-white tracking-wide leading-none whitespace-nowrap text-center lg:text-left">
              ¿QUÉ PINTA HOY?
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
