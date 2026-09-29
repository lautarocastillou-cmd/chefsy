// ─────────────────────────────────────────────────────
// app/api/admin/catalogo/stock/route.ts
// Endpoint PATCH para actualizar el stock de un producto individual.
// Evita sincronizar el catálogo completo (D-2) cada vez que se
// descuenta stock por un consumo del personal.
// ─────────────────────────────────────────────────────

import { NextResponse } from 'next/server'
import { obtenerSesion } from '@/lib/auth-server'
import { obtenerSupabaseAdmin } from '@/lib/supabase-admin'

export async function PATCH(request: Request) {
  const sesion = await obtenerSesion()
  if (!sesion || sesion.rol !== 'admin') {
    return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 })
  }

  try {
    const { productoId, stock } = await request.json() as { productoId?: string; stock?: number }

    if (!productoId || typeof productoId !== 'string' || productoId.trim().length === 0) {
      return NextResponse.json({ error: 'productoId requerido.' }, { status: 400 })
    }
    if (typeof stock !== 'number' || stock < 0 || !isFinite(stock)) {
      return NextResponse.json({ error: 'stock debe ser un número >= 0.' }, { status: 400 })
    }

    const supabase = obtenerSupabaseAdmin()

    const { error } = await supabase
      .from('productos')
      .update({ stock: Math.floor(stock) })
      .eq('id', productoId.trim())

    if (error) {
      console.error('[API Catalogo/Stock] Error actualizando stock:', error)
      return NextResponse.json({ error: 'Error al actualizar el stock.' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    console.error('[API Catalogo/Stock] Error inesperado:', err)
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 })
  }
}
