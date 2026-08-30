'use client'

import React from 'react'
import { CategoriaCatalogo } from '@/tipos/catalogo'
import { usarConfiguracionTienda } from '@/contexto/ConfiguracionTiendaContexto'
import HeroParallaxDoble from './HeroParallaxDoble'
import HeroCarruselPromo from './HeroCarruselPromo'
import HeroCinematicVideo from './HeroCinematicVideo'
import HeroCentradoMinimalista from './HeroCentradoMinimalista'

interface HeroManagerProps {
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

export default function HeroManager(props: HeroManagerProps) {
  const { configuracion } = usarConfiguracionTienda()

  const fuenteHeroClase = {
    bebas: 'font-bebas',
    montserrat: 'font-montserrat',
    inter: 'font-inter',
    anton: 'font-anton',
    playfair: 'font-playfair',
    outfit: 'font-outfit',
    plus_jakarta: 'font-plus-jakarta',
    syne: 'font-syne',
    permanent_marker: 'font-permanent-marker',
    cinzel: 'font-cinzel',
  }[configuracion?.fuente_hero || 'bebas'] || 'font-bebas'

  const layout = configuracion?.hero_layout || 'parallax_doble'

  switch (layout) {
    case 'carrusel_promo':
      return (
        <HeroCarruselPromo
          {...props}
          configuracion={configuracion}
          fuenteHeroClase={fuenteHeroClase}
        />
      )

    case 'cinematic_video':
      return (
        <HeroCinematicVideo
          {...props}
          configuracion={configuracion}
          fuenteHeroClase={fuenteHeroClase}
        />
      )

    case 'centrado_minimalista':
      return (
        <HeroCentradoMinimalista
          {...props}
          configuracion={configuracion}
          fuenteHeroClase={fuenteHeroClase}
        />
      )

    case 'parallax_doble':
    default:
      return (
        <HeroParallaxDoble
          {...props}
          configuracion={configuracion}
          fuenteHeroClase={fuenteHeroClase}
        />
      )
  }
}
