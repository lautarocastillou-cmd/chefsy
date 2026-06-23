import { createClient } from '@supabase/supabase-js'

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
}

// Creamos un cliente limpio que no lee la sesión del LocalStorage
// Esto evita el problema donde RLS bloquea la lectura a usuarios autenticados
const supabaseAnon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  }
)

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
      color_principal: '#2A6348',
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
      link_tiktok: ''
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
