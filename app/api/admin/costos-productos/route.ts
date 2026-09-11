// ─────────────────────────────────────────────────────
// app/api/admin/costos-productos/route.ts
// Gestión de Costos de Mercadería y Elaboración por Plato
// ─────────────────────────────────────────────────────

import { NextResponse } from 'next/server'
import { obtenerSesion } from '@/lib/auth-server'
import { obtenerSupabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
  try {
    const sesion = await obtenerSesion()
    if (!sesion || (sesion.rol !== 'admin' && sesion.rol !== 'cajero')) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
    }

    const supabaseAdmin = obtenerSupabaseAdmin()
    const { data, error } = await supabaseAdmin
      .from('producto_costos')
      .select('producto_id, costo_estimado, insumo_principal, packaging, notas, updated_at')

    if (error) {
      console.error('[API Costos] Error consultando costos:', error)
      return NextResponse.json({ error: 'Error al consultar costos.' }, { status: 500 })
    }

    const mapaCostos: Record<string, {
      productoId: string
      costoEstimado: number
      insumoPrincipal: number
      packaging: number
      notas: string
      updatedAt: string
    }> = {}

    ;(data || []).forEach(row => {
      mapaCostos[row.producto_id] = {
        productoId: row.producto_id,
        costoEstimado: Number(row.costo_estimado) || 0,
        insumoPrincipal: Number(row.insumo_principal) || 0,
        packaging: Number(row.packaging) || 0,
        notas: row.notas || '',
        updatedAt: row.updated_at
      }
    })

    return NextResponse.json({ costos: mapaCostos })
  } catch (error: any) {
    console.error('[API Costos] Error interno GET:', error)
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const sesion = await obtenerSesion()
    if (!sesion || (sesion.rol !== 'admin' && sesion.rol !== 'cajero')) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
    }

    const body = await request.json()
    const { productoId, costoEstimado, insumoPrincipal, packaging, notas } = body

    if (!productoId || typeof productoId !== 'string') {
      return NextResponse.json({ error: 'productoId inválido.' }, { status: 400 })
    }

    const costoNum = Math.max(0, Number(costoEstimado) || 0)
    const insumoNum = Math.max(0, Number(insumoPrincipal) || 0)
    const packNum = Math.max(0, Number(packaging) || 0)

    const supabaseAdmin = obtenerSupabaseAdmin()

    const { data, error } = await supabaseAdmin
      .from('producto_costos')
      .upsert(
        {
          producto_id: productoId,
          costo_estimado: costoNum,
          insumo_principal: insumoNum,
          packaging: packNum,
          notas: notas || '',
          updated_at: new Date().toISOString()
        },
        { onConflict: 'producto_id' }
      )
      .select()
      .single()

    if (error) {
      console.error('[API Costos] Error guardando costo:', error)
      return NextResponse.json({ error: 'Error al guardar costo.' }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      costo: {
        productoId: data.producto_id,
        costoEstimado: Number(data.costo_estimado) || 0,
        insumoPrincipal: Number(data.insumo_principal) || 0,
        packaging: Number(data.packaging) || 0,
        notas: data.notas || '',
        updatedAt: data.updated_at
      }
    })
  } catch (error: any) {
    console.error('[API Costos] Error interno POST:', error)
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 })
  }
}
