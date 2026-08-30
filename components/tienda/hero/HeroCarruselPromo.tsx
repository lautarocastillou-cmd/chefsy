'use client'

import React, { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { Search, ChevronLeft, ChevronRight, Sparkles, ArrowRight } from 'lucide-react'
import { CategoriaCatalogo } from '@/tipos/catalogo'
import { ConfiguracionTienda, CarruselSlide } from '@/servicios/supabase/configuracion'
import { cn } from '@/lib/utils'

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

const SLIDES_DEFAULT: CarruselSlide[] = [
  {
    id: 'slide-1',
    titulo: 'DOBLE SMASH BURGER',
    subtitulo: '2x 120g de carne seleccionada + Doble Cheddar Fundido & Bacon crocante',
    badge: '🔥 MÁS PEDIDO DE LA CASA',
    imagen_url: '/burger-loca.webp',
    boton_texto: 'Explorar Menú',
  },
  {
    id: 'slide-2',
    titulo: 'SUPER COMBOS NOCHE',
    subtitulo: 'Llevate 2 Burgers + Papas Grandes + Bebida con 20% OFF en delivery',
    badge: '⚡ PROMO EXCLUSIVA',
    imagen_url: '/burger-loca.webp',
    boton_texto: 'Pedir Ahora',
  },
]

export default function HeroCarruselPromo({
  configuracion,
  busqueda,
  sugerenciaBusqueda,
  fuenteHeroClase,
  onBusquedaChange,
  onSeleccionarCategoria,
}: Props) {
  const slides = configuracion?.hero_carrusel_slides?.length
    ? configuracion.hero_carrusel_slides
    : SLIDES_DEFAULT

  const [indiceActual, setIndiceActual] = useState(0)
  const [estaPausado, setEstaPausado] = useState(false)
  const touchStartX = useRef<number | null>(null)

  // Rotación automática cada 5.5 segundos si no está pausado
  useEffect(() => {
    if (estaPausado || slides.length <= 1) return
    const timer = setInterval(() => {
      setIndiceActual((prev) => (prev + 1) % slides.length)
    }, 5500)
    return () => clearInterval(timer)
  }, [estaPausado, slides.length])

  const slideActual = slides[indiceActual] || slides[0]

  const handleSiguiente = () => {
    setIndiceActual((prev) => (prev + 1) % slides.length)
  }

  const handleAnterior = () => {
    setIndiceActual((prev) => (prev - 1 + slides.length) % slides.length)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    setEstaPausado(true)
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    setEstaPausado(false)
    if (touchStartX.current === null) return
    const touchEndX = e.changedTouches[0].clientX
    const diffX = touchStartX.current - touchEndX
    if (diffX > 45) {
      handleSiguiente() // Deslizar hacia la izquierda -> siguiente
    } else if (diffX < -45) {
      handleAnterior() // Deslizar hacia la derecha -> anterior
    }
    touchStartX.current = null
  }

  const handleCtaClick = () => {
    if (slideActual.categoria_id) {
      onSeleccionarCategoria(slideActual.categoria_id)
    }
    const catalogoEl = document.getElementById('catalogo-productos')
    if (catalogoEl) {
      catalogoEl.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div className="relative w-full max-w-[1600px] mx-auto px-3 sm:px-6 md:px-12 py-2 sm:py-6 select-none">
      
      {/* ── Marco del Carrusel con Bordes Curvos y Sombra ─────────── */}
      <div 
        onMouseEnter={() => setEstaPausado(true)}
        onMouseLeave={() => setEstaPausado(false)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="relative w-full rounded-2xl sm:rounded-3xl md:rounded-[36px] overflow-hidden border border-white/10 shadow-2xl bg-gradient-to-br from-zinc-950 via-zinc-900 to-black flex flex-col justify-between"
      >
        {/* Fondo sutil con resplandor de marca */}
        <div 
          className="absolute -right-16 -top-16 w-72 h-72 rounded-full blur-3xl opacity-25 pointer-events-none"
          style={{ backgroundColor: 'var(--chefsy-main, #2A6348)' }}
        />

        {/* Contenido en Grilla Responsive */}
        <div className="relative z-20 w-full grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 p-4 sm:p-8 md:p-12 items-center">
          
          {/* Lado Izquierdo / Superior: Textos, Badges y CTA */}
          <div className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left space-y-2.5 sm:space-y-4">
            
            {/* Badge Promocional */}
            {slideActual.badge && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider text-amber-300 bg-amber-500/15 border border-amber-500/30 backdrop-blur-md shadow-md animate-in fade-in duration-300">
                <Sparkles size={13} className="text-amber-400 animate-pulse" />
                <span>{slideActual.badge}</span>
              </div>
            )}

            {/* Título Principal Proporcional */}
            <h2 
              key={`titulo-${indiceActual}`}
              className={`${fuenteHeroClase} text-2xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl tracking-tight leading-[0.95] text-white uppercase drop-shadow-md animate-in fade-in duration-300 break-words max-w-full`}
            >
              {slideActual.titulo}
            </h2>

            {/* Subtítulo Descriptivo */}
            <p 
              key={`sub-${indiceActual}`}
              className="text-xs sm:text-sm md:text-base text-slate-300/90 font-medium max-w-xl animate-in fade-in duration-300 line-clamp-2"
            >
              {slideActual.subtitulo}
            </p>

            {/* Botón de Llamada a la Acción (CTA) */}
            <div className="pt-1 sm:pt-2">
              <button
                type="button"
                onClick={handleCtaClick}
                className="group px-5 sm:px-7 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm text-white uppercase tracking-wider transition-all duration-300 active:scale-95 shadow-xl flex items-center gap-2.5 cursor-pointer"
                style={{
                  backgroundColor: 'var(--chefsy-main, #2A6348)',
                  boxShadow: '0 8px 24px -6px var(--chefsy-main, #2A6348)'
                }}
              >
                <span>{slideActual.boton_texto || 'Explorar Menú'}</span>
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* Lado Derecho / Inferior: Imagen del Plato */}
          <div className="lg:col-span-5 flex items-center justify-center relative w-full aspect-video sm:aspect-square max-w-[200px] sm:max-w-[280px] md:max-w-[380px] mx-auto">
            <div className="relative w-full h-full animate-in zoom-in-95 duration-500">
              <div className="absolute inset-x-0 bottom-2 h-1/4 bg-black/60 rounded-full blur-lg -z-10" />
              <Image
                key={`img-${indiceActual}`}
                src={slideActual.imagen_url || '/burger-loca.webp'}
                alt={slideActual.titulo}
                fill
                priority
                sizes="(max-width: 768px) 200px, 380px"
                className="object-contain drop-shadow-xl"
              />
            </div>
          </div>

        </div>

        {/* ── Flechas de Navegación (Solo en Tablet / Desktop para no tapar en móvil) ─── */}
        {slides.length > 1 && (
          <div className="hidden sm:contents">
            <button
              type="button"
              onClick={handleAnterior}
              aria-label="Slide anterior"
              className="absolute left-3 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-black/60 hover:bg-black/90 text-white/80 hover:text-white border border-white/10 backdrop-blur-md transition-all active:scale-90 shadow-lg cursor-pointer"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={handleSiguiente}
              aria-label="Slide siguiente"
              className="absolute right-3 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-black/60 hover:bg-black/90 text-white/80 hover:text-white border border-white/10 backdrop-blur-md transition-all active:scale-90 shadow-lg cursor-pointer"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}

        {/* ── Indicadores de Puntos (Dots) ────────────────────────── */}
        {slides.length > 1 && (
          <div className="relative pb-3 flex items-center justify-center gap-1.5 z-30">
            {slides.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setIndiceActual(idx)}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-300 cursor-pointer',
                  idx === indiceActual
                    ? 'w-6 bg-white shadow-md'
                    : 'w-1.5 bg-white/30 hover:bg-white/60'
                )}
                aria-label={`Slide ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Buscador Integrado (Solo Desktop) ─────────────────────── */}
      <div className="hidden md:block mt-6 max-w-2xl mx-auto relative">
        <input
          id="busqueda_carrusel"
          type="text"
          placeholder="¿Qué tenés ganas de comer hoy? (ej. Bacon, Mozzarella, Papas)..."
          value={busqueda}
          onChange={(e) => onBusquedaChange(e.target.value)}
          className="w-full bg-zinc-900/90 border border-white/15 hover:border-white/30 focus:border-chefsy-400 text-white py-3.5 pl-12 pr-6 rounded-2xl outline-none transition-all shadow-xl placeholder-slate-400 font-medium text-xs sm:text-sm backdrop-blur-md"
        />
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
      </div>

    </div>
  )
}
