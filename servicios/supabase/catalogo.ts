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
 * Obtiene el catálogo principal exclusivamente desde las tablas normalizadas.
 */
export async function obtenerCatalogoPrincipal(): Promise<CatalogoGuardado | null> {
  const [catRes, prodRes, modRes] = await Promise.all([
    supabaseAnon.from('categorias').select('*').order('orden'),
    supabaseAnon.from('productos').select('*'),
    supabaseAnon.from('modificadores').select('*'),
  ])

  if (catRes.error || prodRes.error || modRes.error) {
    const err = catRes.error || prodRes.error || modRes.error
    console.error('[Servicio Catalogo] Error al leer tablas normalizadas:', err?.message)
    return null
  }

  if ((catRes.data?.length ?? 0) === 0) {
    try {
      const { data: legacyData, error: legacyError } = await supabaseAnon
        .from('catalogo')
        .select('*')
        .eq('id', 'principal')
        .single()

      if (!legacyError && legacyData) {
        console.log('[Servicio Catalogo] Tablas normalizadas vacías. Cargando desde fallback legacy (tabla "catalogo")')
        return {
          id:           'principal',
          categorias:   legacyData.categorias || [],
          productos:    legacyData.productos || [],
          modificadores:legacyData.modificadores || [],
        }
      }
    } catch (e) {
      console.error('[Servicio Catalogo] Error al leer tabla legacy catalogo:', e)
    }
    return null
  }

  return {
    id:           'principal',
    categorias:   (catRes.data  ?? []).map(mapCategoria),
    productos:    (prodRes.data ?? []).map(mapProducto),
    modificadores:(modRes.data  ?? []).map(mapModificador),
  }
}

// ── Inicializar (solo si la tabla no existe) ──────────

/**
 * Inicializa el catálogo escribiendo en las tablas normalizadas.
 */
export async function inicializarCatalogo(datosBase: {
  categorias:   CategoriaCatalogo[]
  productos:    ProductoCatalogo[]
  modificadores:ModificadorCatalogo[]
}): Promise<void> {
  const [catRes, prodRes, modRes] = await Promise.all([
    supabase.from('categorias').insert(
      datosBase.categorias.map((c) => ({
        id:     c.id,
        nombre: c.nombre,
        orden:  c.orden,
        activa: c.activa,
      }))
    ),
    supabase.from('productos').insert(
      datosBase.productos.map((p) => ({
        id:                p.id,
        categoria_id:      p.categoriaId,
        nombre:            p.nombre,
        precio:            p.precio,
        precio_puntos:     p.precio_puntos ?? null,
        activo:            p.activo,
        es_combo:          p.esCombo ?? false,
        stock:             p.stock ?? null,
        modificadores_ids: p.modificadoresIds ?? [],
      }))
    ),
    supabase.from('modificadores').insert(
      datosBase.modificadores.map((m) => ({
        id:           m.id,
        nombre:       m.nombre,
        precio_extra: m.precioExtra,
      }))
    ),
  ])

  if (catRes.error || prodRes.error || modRes.error) {
    const err = catRes.error || prodRes.error || modRes.error
    console.error('[Servicio Catalogo] Error al inicializar catálogo normalizado:', err?.message)
    throw new Error(err?.message || 'Error al inicializar catálogo normalizado')
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
