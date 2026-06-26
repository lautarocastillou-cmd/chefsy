import { supabase, supabaseAnon } from '@/lib/supabase'
import { CategoriaCatalogo, ModificadorCatalogo, ProductoCatalogo } from '@/tipos/catalogo'
import { RealtimeChannel } from '@supabase/supabase-js'

// ─────────────────────────────────────────────────────
// servicios/supabase/catalogo.ts
// Lee desde las tablas normalizadas (categorias, productos,
// modificadores). Si están vacías, hace fallback al blob
// legacy (tabla "catalogo") para máxima resiliencia.
// ─────────────────────────────────────────────────────

export interface CatalogoGuardado {
  id: string
  categorias: CategoriaCatalogo[]
  productos: ProductoCatalogo[]
  modificadores: ModificadorCatalogo[]
}

// ── Mappers DB → TypeScript ───────────────────────────

function mapCategoria(row: any): CategoriaCatalogo {
  return {
    id:     row.id,
    nombre: row.nombre,
    orden:  row.orden  ?? 0,
    activa: row.activa ?? true,
  }
}

function mapProducto(row: any): ProductoCatalogo {
  return {
    id:                row.id,
    categoriaId:       row.categoria_id,
    nombre:            row.nombre,
    precio:            Number(row.precio),
    precio_puntos:     row.precio_puntos ?? undefined,
    activo:            row.activo ?? true,
    stock:             row.stock  ?? null,
    esCombo:           row.es_combo ?? false,
    modificadoresIds:  row.modificadores_ids ?? [],
  }
}

function mapModificador(row: any): ModificadorCatalogo {
  return {
    id:          row.id,
    nombre:      row.nombre,
    precioExtra: Number(row.precio_extra),
  }
}

// ── Obtener catálogo completo ─────────────────────────

/**
 * Obtiene el catálogo principal.
 * Intenta las tablas normalizadas primero; si están vacías
 * hace fallback al blob legacy para máxima resiliencia.
 */
export async function obtenerCatalogoPrincipal(): Promise<CatalogoGuardado | null> {
  // 1. Intentar leer desde tablas normalizadas
  const [catRes, prodRes, modRes] = await Promise.all([
    supabaseAnon.from('categorias').select('*').order('orden'),
    supabaseAnon.from('productos').select('*'),
    supabaseAnon.from('modificadores').select('*'),
  ])

  const hayDatos =
    !catRes.error &&
    !prodRes.error &&
    (catRes.data?.length ?? 0) > 0

  if (hayDatos) {
    return {
      id:           'principal',
      categorias:   (catRes.data  ?? []).map(mapCategoria),
      productos:    (prodRes.data ?? []).map(mapProducto),
      modificadores:(modRes.data  ?? []).map(mapModificador),
    }
  }

  // 2. Fallback: blob legacy
  console.warn('[Catalogo] Tablas normalizadas vacías o con error — usando blob de respaldo.')
  const { data, error } = await supabaseAnon
    .from('catalogo')
    .select('*')
    .eq('id', 'principal')
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    console.error('[Servicio Catalogo] Error al obtener catálogo:', error.message)
    throw new Error(error.message)
  }

  return data as CatalogoGuardado
}

// ── Inicializar (solo si la tabla no existe) ──────────

/**
 * Inicializa el catálogo principal si no existe.
 * Escribe en el blob legacy para compatibilidad con sistemas anteriores.
 */
export async function inicializarCatalogo(datosBase: {
  categorias:   CategoriaCatalogo[]
  productos:    ProductoCatalogo[]
  modificadores:ModificadorCatalogo[]
}): Promise<void> {
  const { error } = await supabase
    .from('catalogo')
    .insert({ id: 'principal', ...datosBase })

  if (error) {
    console.error('[Servicio Catalogo] Error al inicializar catálogo:', error.message)
    throw new Error(error.message)
  }
}

// ── Realtime ──────────────────────────────────────────

/**
 * Suscribe a cambios en las 3 tablas normalizadas.
 * Cualquier cambio en cualquiera de ellas dispara una
 * recarga completa del catálogo.
 */
export function suscribirACatalogo(
  onActualizacion: (catalogo: CatalogoGuardado) => void
): RealtimeChannel {
  const recargar = async () => {
    try {
      const catalogo = await obtenerCatalogoPrincipal()
      if (catalogo) onActualizacion(catalogo)
    } catch (err) {
      console.error('[Realtime Catalogo] Error al recargar:', err)
    }
  }

  return supabase
    .channel('catalogo-normalizado')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'categorias' },   recargar)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'productos' },    recargar)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'modificadores' }, recargar)
    .subscribe()
}
