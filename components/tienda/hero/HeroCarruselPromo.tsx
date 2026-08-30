'use client'

import React, { useState, useEffect } from 'react'
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

  const handleCtaClick = () => {
    if (slideActual.categoria_id) {
      onSeleccionarCategoria(slideActual.categoria_id)
    }
    // Scroll suave hacia la sección de catálogo
    const catalogoEl = document.getElementById('catalogo-productos')
    if (catalogoEl) {
      catalogoEl.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div className="relative w-full max-w-[1600px] mx-auto px-4 md:px-12 py-4 lg:py-8 select-none">
      
      {/* ── Marco del Carrusel con Bordes Curvos y Sombra ─────────── */}
      <div 
        onMouseEnter={() => setEstaPausado(true)}
        onMouseLeave={() => setEstaPausado(false)}
        onTouchStart={() => setEstaPausado(true)}
        onTouchEnd={() => setEstaPausado(false)}
        className="relative w-full min-h-[360px] md:min-h-[460px] lg:min-h-[520px] rounded-3xl md:rounded-[36px] overflow-hidden border border-white/10 shadow-2xl bg-gradient-to-br from-zinc-950 via-zinc-900 to-black flex items-center"
      >
        {/* Fondo sutil con resplandor del color de la marca */}
        <div 
          className="absolute -right-20 -top-20 w-96 h-96 rounded-full blur-3xl opacity-30 pointer-events-none"
          style={{ backgroundColor: 'var(--chefsy-main, #2A6348)' }}
        />

        {/* Contenido en Grilla: Texto & Promo a la izquierda, Plato en HD a la derecha */}
        <div className="relative z-20 w-full grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 sm:p-10 md:p-14 items-center">
          
          {/* Lado Izquierdo: Textos, Badges y CTA */}
          <div className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left space-y-4">
            
            {/* Badge Promocional */}
            {slideActual.badge && (
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider text-amber-300 bg-amber-500/15 border border-amber-500/30 backdrop-blur-md shadow-lg animate-in fade-in duration-300">
                <Sparkles size={14} className="text-amber-400 animate-pulse" />
                <span>{slideActual.badge}</span>
              </div>
            )}

            {/* Título Principal */}
            <h1 
              key={`titulo-${indiceActual}`}
              className={`${fuenteHeroClase} text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl tracking-tight leading-[0.9] text-white uppercase drop-shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-300`}
            >
              {slideActual.titulo}
            </h1>

            {/* Subtítulo Descriptivo */}
            <p 
              key={`sub-${indiceActual}`}
              className="text-sm sm:text-base md:text-lg text-slate-300 font-medium max-w-xl animate-in fade-in duration-300 line-clamp-2"
            >
              {slideActual.subtitulo}
            </p>

            {/* Botón de Llamada a la Acción (CTA) */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleCtaClick}
                className="group px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl font-black text-sm text-white uppercase tracking-wider transition-all duration-300 active:scale-95 shadow-xl flex items-center gap-3 cursor-pointer"
                style={{
                  backgroundColor: 'var(--chefsy-main, #2A6348)',
                  boxShadow: '0 10px 30px -10px var(--chefsy-main, #2A6348)'
                }}
              >
                <span>{slideActual.boton_texto || 'Explorar Menú'}</span>
                <ArrowRight size={18} className="group-hover:translate-x-1.5 transition-transform" />
              </button>
            </div>
          </div>

          {/* Lado Derecho: Imagen del Producto Flotante */}
          <div className="lg:col-span-5 flex items-center justify-center relative w-full aspect-square max-w-[240px] sm:max-w-[320px] md:max-w-[420px] mx-auto">
            <div className="relative w-full h-full animate-in zoom-in-95 duration-500">
              {/* Sombra de suelo */}
              <div className="absolute inset-x-0 bottom-4 h-1/4 bg-black/60 rounded-full blur-xl -z-10" />
              <Image
                key={`img-${indiceActual}`}
                src={slideActual.imagen_url || '/burger-loca.webp'}
                alt={slideActual.titulo}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 450px"
                className="object-contain drop-shadow-2xl"
              />
            </div>
          </div>

        </div>

        {/* ── Flechas de Navegación (Izquierda y Derecha) ─────────── */}
        {slides.length > 1 && (
          <>
            <button
              type="button"
              onClick={handleAnterior}
              aria-label="Slide anterior"
              className="absolute left-3 md:left-5 top-1/2 -translate-y-1/2 z-30 p-2.5 sm:p-3 rounded-full bg-black/50 hover:bg-black/80 text-white/80 hover:text-white border border-white/10 backdrop-blur-md transition-all active:scale-90 shadow-lg cursor-pointer"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              onClick={handleSiguiente}
              aria-label="Slide siguiente"
              className="absolute right-3 md:right-5 top-1/2 -translate-y-1/2 z-30 p-2.5 sm:p-3 rounded-full bg-black/50 hover:bg-black/80 text-white/80 hover:text-white border border-white/10 backdrop-blur-md transition-all active:scale-90 shadow-lg cursor-pointer"
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}

        {/* ── Indicadores de Puntos (Dots) ────────────────────────── */}
        {slides.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2">
            {slides.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setIndiceActual(idx)}
                className={cn(
                  'h-2 rounded-full transition-all duration-300 cursor-pointer',
                  idx === indiceActual
                    ? 'w-7 bg-white shadow-md'
                    : 'w-2 bg-white/30 hover:bg-white/60'
                )}
                aria-label={`Ir al slide ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Buscador Integrado Debajo del Carrusel ────────────────── */}
      <div className="mt-4 sm:mt-6 max-w-2xl mx-auto relative">
        <input
          id="busqueda_carrusel"
          type="text"
          placeholder="¿Qué tenés ganas de comer hoy? (ej. Bacon, Mozzarella, Papas)..."
          value={busqueda}
          onChange={(e) => onBusquedaChange(e.target.value)}
          className="w-full bg-zinc-900/90 border border-white/15 hover:border-white/30 focus:border-chefsy-400 text-white py-3.5 sm:py-4 pl-12 pr-6 rounded-2xl outline-none transition-all shadow-xl placeholder-slate-400 font-medium text-xs sm:text-sm backdrop-blur-md"
        />
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />

        {sugerenciaBusqueda && (
          <div className="absolute -bottom-8 left-0 animate-in fade-in duration-300">
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
  )
}
