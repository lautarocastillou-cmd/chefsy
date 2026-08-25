import { NextResponse } from 'next/server'
import { obtenerSesion } from '@/lib/auth-server'
import { obtenerSupabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: Request) {
  const sesion = await obtenerSesion()
  if (!sesion || sesion.rol !== 'admin') {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
  }

  try {
    const { accion, payload } = await request.json()
    const supabaseAdmin = obtenerSupabaseAdmin()

    switch (accion) {
      case 'upsert_categoria': {
        const { error } = await supabaseAdmin.from('stock_categorias').upsert(payload)
        if (error) throw error
        return NextResponse.json({ ok: true })
      }
      case 'delete_categoria': {
        const { error } = await supabaseAdmin.from('stock_categorias').delete().eq('id', payload.id)
        if (error) throw error
        return NextResponse.json({ ok: true })
      }
      case 'upsert_insumo': {
        const { error } = await supabaseAdmin.from('stock_insumos').upsert(payload)
        if (error) throw error
        return NextResponse.json({ ok: true })
      }
      case 'delete_insumo': {
        const { error } = await supabaseAdmin.from('stock_insumos').delete().eq('id', payload.id)
        if (error) throw error
        return NextResponse.json({ ok: true })
      }
      case 'update_stock': {
        // Actualización manual de stock rápido (directo o por delta)
        const { id, stock_actual, delta } = payload
        if (delta !== undefined && Number(delta) !== 0) {
          const { data: insumo } = await supabaseAdmin
            .from('stock_insumos')
            .select('stock_actual')
            .eq('id', id)
            .single()
          const nuevoStock = (insumo?.stock_actual || 0) + Number(delta)
          const { error } = await supabaseAdmin
            .from('stock_insumos')
            .update({ stock_actual: nuevoStock, updated_at: new Date().toISOString() })
            .eq('id', id)
          if (error) throw error
          return NextResponse.json({ ok: true, stock_actual: nuevoStock })
        }
        const { error } = await supabaseAdmin
          .from('stock_insumos')
          .update({ stock_actual, updated_at: new Date().toISOString() })
          .eq('id', id)
        if (error) throw error
        return NextResponse.json({ ok: true })
      }
      case 'upsert_receta': {
        // Reemplaza toda la receta de un producto
        const { producto_id, insumos } = payload
        // 1. Borrar vieja
        await supabaseAdmin.from('stock_recetas').delete().eq('producto_id', producto_id)
        // 2. Insertar nuevos
        if (insumos && insumos.length > 0) {
          const insertData = insumos.map((i: any) => ({
            producto_id,
            insumo_id: i.insumo_id,
            cantidad: i.cantidad
          }))
          const { error } = await supabaseAdmin.from('stock_recetas').insert(insertData)
          if (error) throw error
        }
        return NextResponse.json({ ok: true })
      }
      default:
        return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('[API Stock] Error:', error)
    return NextResponse.json({ error: error.message || 'Error del servidor' }, { status: 500 })
  }
}
