import { supabase, supabaseAnon } from '@/lib/supabase'

export interface CarruselSlide {
  id: string
  titulo: string
  subtitulo: string
  badge?: string
  imagen_url: string
  boton_texto?: string
  categoria_id?: string
}

export interface ConfiguracionTienda {
  id: number
  color_principal: string
  titulo_principal: string
  palabras_animadas: string[]
  logo_url: string
  hero_image_url: string
  hero_linea_1: string
  hero_linea_2: string
  fuente_principal?: string
  banner_promocional?: string
  banner_animado?: boolean
  banner_color?: string
  fuente_hero?: string
  hero_pos_x?: number
  hero_pos_y?: number
  hero_escala?: number
  estilo_bordes?: string
  textura_fondo_url?: string
  whatsapp_mensaje?: string
  link_instagram?: string
  link_tiktok?: string
  hero_layout?: 'parallax_doble' | 'carrusel_promo' | 'cinematic_video' | 'centrado_minimalista'
  hero_video_url?: string
  hero_video_overlay_opacity?: number
  hero_badge_texto?: string
  hero_carrusel_slides?: CarruselSlide[]
  hero_mostrar_horario?: boolean
  estilo_tarjetas?: 'glassmorphism' | 'neon_glow' | 'minimalista_clean' | 'compacto_lista'
  mostrar_badges_automaticos?: boolean
  mostrar_badge_descuento?: boolean
  efecto_titulo_hero?: 'none' | 'gradient' | 'neon_glow' | 'stroke'
  color_titulo_secundario?: string
  fuente_tienda_catalogo?: string
}

export async function obtenerConfiguracionTienda(): Promise<ConfiguracionTienda> {
  const { data, error } = await supabaseAnon
    .from('configuracion_tienda')
    .select('*')
    .eq('id', 1)
    .single()

  if (error) {
    console.error('Error al obtener configuración:', error)
    // Devolver valores por defecto si falla
    return {
      id: 1,
      color_principal: '#2A6348|#ffffff|#2A6348|#ffffff',
      titulo_principal: '¿Qué pinta hoy?',
      palabras_animadas: ['LOMOS', 'MILAS', 'ZAPPING', 'BURGERS', 'PIZZAS', 'PATYS'],
      logo_url: '/logo.jpg',
      hero_image_url: '/burger-loca.webp',
      hero_linea_1: 'POCAS PALABRAS.',
      hero_linea_2: 'MUCHO CHEDDAR.',
      fuente_principal: 'bebas',
      banner_promocional: '',
      banner_animado: false,
      banner_color: '#2A6348',
      fuente_hero: 'bebas',
      hero_pos_x: 50,
      hero_pos_y: 50,
      hero_escala: 100,
      estilo_bordes: 'suaves',
      textura_fondo_url: '',
      whatsapp_mensaje: '¡Hola Chefsy! Hice un pedido online:',
      link_instagram: '',
      link_tiktok: '',
      hero_layout: 'parallax_doble',
      hero_video_url: '',
      hero_video_overlay_opacity: 60,
      hero_badge_texto: '⭐ 4.9 en Google • Los mejores de la ciudad',
      hero_carrusel_slides: [
        {
          id: 'slide-1',
          titulo: 'DOBLE SMASH BURGER',
          subtitulo: '2x 120g de carne seleccionada + Doble Cheddar Fundido',
          badge: '🔥 MÁS PEDIDO',
          imagen_url: '/burger-loca.webp',
          boton_texto: 'Ver Hamburguesas',
        },
        {
          id: 'slide-2',
          titulo: 'MIÉRCOLES DE PROMO 2x1',
          subtitulo: 'Aprovechá 2x1 en Lomos y Pizzas durante todo el turno',
          badge: '⚡ PROMO EXCLUSIVA',
          imagen_url: '/burger-loca.webp',
          boton_texto: 'Pedir Ahora',
        }
      ],
      hero_mostrar_horario: true,
      estilo_tarjetas: 'glassmorphism',
      mostrar_badges_automaticos: true,
      mostrar_badge_descuento: true,
      efecto_titulo_hero: 'none',
      color_titulo_secundario: '#F59E0B',
      fuente_tienda_catalogo: 'bebas',
    }
  }

  return data
}

export async function actualizarConfiguracionTienda(config: Partial<ConfiguracionTienda>): Promise<boolean> {
  const { error } = await supabase
    .from('configuracion_tienda')
    .update({ ...config, updated_at: new Date().toISOString() })
    .eq('id', 1)

  if (error) {
    console.error('Error al actualizar configuración:', error)
    return false
  }

  return true
}
