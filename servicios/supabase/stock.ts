import { supabaseAnon } from '@/lib/supabase'
import { CategoriaInsumo, Insumo, RecetaProducto, MovimientoStock } from '@/tipos/stock'

// Obtener todas las categorías de insumos
export async function obtenerStockCategorias(): Promise<CategoriaInsumo[]> {
  const { data, error } = await supabaseAnon.from('stock_categorias').select('*').order('nombre')
  if (error) throw new Error(error.message)
  return data
}

// Obtener todos los insumos
export async function obtenerStockInsumos(): Promise<Insumo[]> {
  const { data, error } = await supabaseAnon.from('stock_insumos').select('*').order('nombre')
  if (error) throw new Error(error.message)
  return data
}

// Obtener recetas (agrupadas por producto_id)
export async function obtenerStockRecetas(): Promise<RecetaProducto[]> {
  const { data, error } = await supabaseAnon.from('stock_recetas').select('producto_id, insumo_id, cantidad')
  if (error) throw new Error(error.message)
  
  const recetasMap = new Map<string, any>()
  for (const row of data) {
    if (!recetasMap.has(row.producto_id)) {
      recetasMap.set(row.producto_id, { producto_id: row.producto_id, insumos: [] })
    }
    recetasMap.get(row.producto_id).insumos.push({
      insumo_id: row.insumo_id,
      cantidad: Number(row.cantidad)
    })
  }
  return Array.from(recetasMap.values())
}

// Obtener movimientos de Kardex para un insumo específico
export async function obtenerMovimientosPorInsumo(
  insumoId: string,
  limite: number = 50
): Promise<MovimientoStock[]> {
  const { data, error } = await supabaseAnon
    .from('stock_movimientos')
    .select('*')
    .eq('insumo_id', insumoId)
    .order('created_at', { ascending: false })
    .limit(limite)

  if (error) {
    console.error('[Supabase Stock] Error al obtener movimientos de insumo:', error)
    return []
  }
  return (data || []) as MovimientoStock[]
}

// Obtener movimientos de Kardex generales con filtros opcionales
export async function obtenerMovimientosStockGenerales(opciones?: {
  tipo?: string
  insumoId?: string
  desde?: string
  hasta?: string
  limite?: number
}): Promise<MovimientoStock[]> {
  let query = supabaseAnon
    .from('stock_movimientos')
    .select('*')
    .order('created_at', { ascending: false })

  if (opciones?.insumoId && opciones.insumoId !== 'todos') {
    query = query.eq('insumo_id', opciones.insumoId)
  }

  if (opciones?.tipo && opciones.tipo !== 'todos') {
    query = query.eq('tipo_movimiento', opciones.tipo)
  }

  if (opciones?.desde) {
    query = query.gte('created_at', opciones.desde)
  }

  if (opciones?.hasta) {
    query = query.lte('created_at', opciones.hasta)
  }

  query = query.limit(opciones?.limite || 100)

  const { data, error } = await query

  if (error) {
    console.error('[Supabase Stock] Error al obtener movimientos generales:', error)
    return []
  }
  return (data || []) as MovimientoStock[]
}
