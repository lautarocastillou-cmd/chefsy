import { supabase } from '@/lib/supabase'

export interface ConfiguracionTienda {
  id: number
  color_principal: string
  titulo_principal: string
  palabras_animadas: string[]
  logo_url: string
  hero_image_url: string
  hero_linea_1: string
  hero_linea_2: string
}

export async function obtenerConfiguracionTienda(): Promise<ConfiguracionTienda> {
  const { data, error } = await supabase
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
      hero_linea_2: 'MUCHO CHEDDAR.'
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
