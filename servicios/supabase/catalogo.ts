import { supabaseAnon } from '@/lib/supabase'
import { CategoriaCatalogo, ModificadorCatalogo, ProductoCatalogo } from '@/tipos/catalogo'
import { RealtimeChannel } from '@supabase/supabase-js'

export interface CatalogoGuardado {
  id: string
  categorias: CategoriaCatalogo[]
  productos: ProductoCatalogo[]
  modificadores: ModificadorCatalogo[]
}

/**
 * Obtiene el catálogo principal de la base de datos
 */
export async function obtenerCatalogoPrincipal(): Promise<CatalogoGuardado | null> {
  const { data, error } = await supabaseAnon
    .from('catalogo')
    .select('*')
    .eq('id', 'principal')
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // No se encontró fila
    console.error('[Servicio Catalogo] Error al obtener catálogo principal:', error.message)
    throw new Error(error.message)
  }

  return data as CatalogoGuardado
}

/**
 * Inicializa el catálogo principal si no existe
 */
export async function inicializarCatalogo(datosBase: {
  categorias: CategoriaCatalogo[]
  productos: ProductoCatalogo[]
  modificadores: ModificadorCatalogo[]
}): Promise<void> {
  const { error } = await supabase
    .from('catalogo')
    .insert({
      id: 'principal',
      ...datosBase,
    })

  if (error) {
    console.error('[Servicio Catalogo] Error al inicializar catálogo:', error.message)
    throw new Error(error.message)
  }
}

/**
 * Suscribe a los cambios del catálogo en tiempo real
 */
export function suscribirACatalogo(onActualizacion: (catalogo: CatalogoGuardado) => void): RealtimeChannel {
  return supabase
    .channel('tabla-catalogo')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'catalogo' },
      (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const catalogoNuevo = payload.new as CatalogoGuardado
          if (catalogoNuevo && catalogoNuevo.id === 'principal') {
            onActualizacion(catalogoNuevo)
          }
        }
      }
    )
    .subscribe()
}
