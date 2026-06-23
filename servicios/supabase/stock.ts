import { supabaseAnon } from '@/lib/supabase'
import { CategoriaInsumo, Insumo, RecetaProducto } from '@/tipos/stock'

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
