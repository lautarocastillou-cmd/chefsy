'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { ArrowRight, ChevronLeft, ChevronRight, Clock3, Grid2X2, Search } from 'lucide-react'
import { CategoriaCatalogo } from '@/tipos/catalogo'
import { ConfiguracionTienda, CarruselSlide } from '@/servicios/supabase/configuracion'
import { usarCarrito } from '@/contexto/CarritoContexto'
import PanelResultadosBusqueda from '@/components/tienda/PanelResultadosBusqueda'
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

const SLIDE_RESPALDO: CarruselSlide = {
  id: 'portada-app-respaldo',
  titulo: 'HOY SE COME RICO.',
  subtitulo: 'Burgers, lomos y milas al toque.',
  badge: 'CHEFSY FAST FOOD',
  imagen_url: '/burger-hero.png',
  boton_texto: 'Ver el menú',
}

export default function HeroPortadaApp({
  configuracion,
  categoriasActivas,
  categoriaSeleccionada,
  busqueda,
  fuenteHeroClase,
  onBusquedaChange,
  onSeleccionarCategoria,
}: Props) {
  const { turnoActivo, esDomingoCerrado } = usarCarrito()
  const slides = useMemo(() => {
    const configurados = configuracion?.hero_carrusel_slides?.filter((slide) => slide.imagen_url || slide.titulo)
    return configurados?.length ? configurados : [SLIDE_RESPALDO]
  }, [configuracion?.hero_carrusel_slides])
  const [slideIndex, setSlideIndex] = useState(0)
  const slide = slides[slideIndex] || slides[0]
  const localCerrado = turnoActivo === false || esDomingoCerrado

  useEffect(() => {
    if (slides.length < 2) return
    const timer = window.setInterval(() => {
      setSlideIndex((actual) => (actual + 1) % slides.length)
    }, 6500)
    return () => window.clearInterval(timer)
  }, [slides.length])

  const seleccionarSlide = (indice: number) => {
    setSlideIndex((indice + slides.length) % slides.length)
  }

  const ejecutarAccionSlide = () => {
    if (slide.categoria_id) {
      onSeleccionarCategoria(slide.categoria_id)
      return
    }
    document.getElementById('catalogo-productos')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <section className="relative w-full px-3.5 pb-3 pt-3 md:px-8 md:pb-8 md:pt-8 lg:px-12">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,0.92fr)_minmax(420px,0.86fr)] lg:items-center lg:gap-12">
        <div className="order-2 flex min-w-0 flex-col items-center text-center lg:order-1 lg:items-start lg:text-left">
          <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-300">
            <span className={cn('h-1.5 w-1.5 rounded-full', localCerrado ? 'bg-rose-400' : 'bg-emerald-400')} />
            {localCerrado ? 'Local cerrado' : 'Abierto ahora'}
            <span className="font-medium tracking-normal text-slate-500">· 20:30–01:00</span>
          </div>

          <h1 className={cn('max-w-xl text-5xl uppercase leading-[0.88] tracking-tight text-white sm:text-6xl lg:text-8xl', fuenteHeroClase)}>
            {configuracion?.hero_linea_1 || 'HOY SE COME'}
            <span className="block text-emerald-300">{configuracion?.hero_linea_2 || 'RICO.'}</span>
          </h1>

          {configuracion?.titulo_principal && (
            <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-400 lg:text-base">
              {configuracion.titulo_principal}
            </p>
          )}

          <div className="mt-5 hidden w-full max-w-xl lg:block">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-300" size={18} />
              <input
                id="busqueda_portada_app"
                type="text"
                placeholder="Buscar en el menú..."
                value={busqueda}
                data-buscador-input
                onChange={(event) => onBusquedaChange(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-zinc-950/80 py-3.5 pl-11 pr-4 text-sm text-white outline-none transition-colors placeholder:text-slate-500 focus:border-emerald-400/70"
              />
              <PanelResultadosBusqueda />
            </div>
          </div>

          <button
            type="button"
            onClick={ejecutarAccionSlide}
            className="mt-5 hidden items-center gap-2 rounded-full bg-emerald-700 px-5 py-3 text-sm font-extrabold text-white transition-colors hover:bg-emerald-600 lg:inline-flex"
          >
            {slide.boton_texto || 'Ver el menú'}
            <ArrowRight size={16} />
          </button>
        </div>

        <div className="order-1 lg:order-2">
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#f3eee3] text-[#173a28] shadow-[0_18px_45px_rgba(0,0,0,0.3)]">
            <div className="relative min-h-[188px] p-5 sm:min-h-[220px] lg:min-h-[320px] lg:p-7">
              <div className="relative z-10 max-w-[55%] lg:max-w-[48%]">
                {slide.badge && (
                  <span className="text-[9px] font-black uppercase tracking-[0.16em] text-[#2A6348]">{slide.badge}</span>
                )}
                <h2 className="mt-2 whitespace-pre-line font-bebas text-4xl uppercase leading-[0.86] tracking-wide sm:text-5xl lg:text-6xl">
                  {slide.titulo || 'Elegí tu próximo pedido'}
                </h2>
                {slide.subtitulo && (
                  <p className="mt-2 max-w-[210px] text-[10px] font-semibold leading-relaxed text-[#173a28]/70 sm:text-xs">
                    {slide.subtitulo}
                  </p>
                )}
                <button
                  type="button"
                  onClick={ejecutarAccionSlide}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#173a28] px-3.5 py-2 text-[10px] font-extrabold text-[#f3eee3]"
                >
                  {slide.boton_texto || 'Ver el menú'}
                  <ArrowRight size={12} />
                </button>
              </div>

              <div className="absolute -right-5 -bottom-8 h-[210px] w-[210px] sm:-right-4 sm:h-[250px] sm:w-[250px] lg:-right-7 lg:-bottom-12 lg:h-[360px] lg:w-[360px]">
                <Image
                  src={slide.imagen_url || configuracion?.hero_image_url || '/burger-hero.png'}
                  alt={slide.titulo || 'Promoción Chefsy'}
                  fill
                  sizes="(max-width: 1024px) 55vw, 360px"
                  className="object-contain mix-blend-multiply drop-shadow-[0_18px_18px_rgba(23,58,40,0.2)]"
                />
              </div>

              {slides.length > 1 && (
                <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5 lg:bottom-5 lg:right-5">
                  <button type="button" onClick={() => seleccionarSlide(slideIndex - 1)} className="rounded-full bg-[#173a28]/10 p-1.5" aria-label="Promoción anterior">
                    <ChevronLeft size={12} />
                  </button>
                  {slides.map((item, indice) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => seleccionarSlide(indice)}
                      aria-label={`Ver promoción ${indice + 1}`}
                      className={cn('h-1.5 rounded-full transition-all', indice === slideIndex ? 'w-4 bg-[#2A6348]' : 'w-1.5 bg-[#173a28]/25')}
                    />
                  ))}
                  <button type="button" onClick={() => seleccionarSlide(slideIndex + 1)} className="rounded-full bg-[#173a28]/10 p-1.5" aria-label="Promoción siguiente">
                    <ChevronRight size={12} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="order-3 lg:col-span-2">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              type="button"
              onClick={() => onSeleccionarCategoria(null)}
              className={cn(
                'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-[11px] font-bold transition-colors',
                !categoriaSeleccionada ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-white/10 bg-zinc-900 text-slate-400 hover:text-white'
              )}
            >
              <Grid2X2 size={13} /> Todos
            </button>
            {categoriasActivas.map((categoria) => (
              <button
                key={categoria.id}
                type="button"
                onClick={() => onSeleccionarCategoria(categoria.id)}
                className={cn(
                  'shrink-0 rounded-full border px-3 py-2 text-[11px] font-bold transition-colors',
                  categoriaSeleccionada === categoria.id ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-white/10 bg-zinc-900 text-slate-400 hover:text-white'
                )}
              >
                {categoria.nombre}
              </button>
            ))}
          </div>
          <div className="mt-2 hidden items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 lg:flex">
            <Clock3 size={12} /> Elegí una categoría para ir directo al menú
          </div>
        </div>
      </div>
    </section>
  )
}
