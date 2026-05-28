// ─────────────────────────────────────────────────────
// app/api/malu/datos/route.ts
// Endpoint seguro para operaciones CRUD de Malú Clothing.
// Usa service_role para evitar RLS. No tiene relación
// con el endpoint de Chefsy (/api/admin/pedidos).
// ─────────────────────────────────────────────────────

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Verificar contraseña de Malú (sin JWT, simplificado para este sistema)
async function verificarSesionMalu(request: Request): Promise<boolean> {
  // La autenticación de Malú es via API de login + localStorage.
  // El endpoint de datos acepta peticiones autenticadas verificando
  // una cabecera personalizada con la contraseña hasheada.
  // Por simplicidad en esta versión, confía en que el login fue correcto.
  // Para más seguridad, se puede agregar un token de sesión en el header.
  const auth = request.headers.get('x-malu-auth')
  return auth === process.env.MALU_PASS
}

function obtenerAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Variables de entorno Supabase no configuradas')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

export async function POST(request: Request) {
  try {
    if (!await verificarSesionMalu(request)) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
    }

    const body = await request.json()
    const { tabla, accion, datos, id, filtros } = body
    const TABLAS_PERMITIDAS = ['malu_clientas', 'malu_ventas_fiadas', 'malu_pagos', 'malu_productos', 'malu_ventas_mostrador', 'malu_apartados', 'malu_gastos']

    if (!TABLAS_PERMITIDAS.includes(tabla)) {
      return NextResponse.json({ error: 'Tabla no permitida.' }, { status: 400 })
    }

    const supabase = obtenerAdmin()

    switch (accion) {
      case 'listar': {
        let query = supabase.from(tabla).select('*')
        if (filtros?.activa !== undefined) query = query.eq('activa', filtros.activa)
        if (filtros?.activo !== undefined) query = query.eq('activo', filtros.activo)
        if (filtros?.clienta_id) query = query.eq('clienta_id', filtros.clienta_id)
        if (filtros?.order) query = query.order(filtros.order.column, { ascending: filtros.order.ascending ?? true })
        const { data, error } = await query
        if (error) throw error
        return NextResponse.json(data)
      }

      case 'crear': {
        const { data, error } = await supabase.from(tabla).insert(datos).select().single()
        if (error) throw error
        return NextResponse.json(data)
      }

      case 'actualizar': {
        if (!id) return NextResponse.json({ error: 'ID requerido.' }, { status: 400 })
        const { data, error } = await supabase.from(tabla).update(datos).eq('id', id).select().single()
        if (error) throw error
        return NextResponse.json(data)
      }

      case 'eliminar': {
        if (!id) return NextResponse.json({ error: 'ID requerido.' }, { status: 400 })
        const { error } = await supabase.from(tabla).delete().eq('id', id)
        if (error) throw error
        return NextResponse.json({ ok: true })
      }

      default:
        return NextResponse.json({ error: 'Acción inválida.' }, { status: 400 })
    }
  } catch (e: any) {
    console.error('[API Malú] Error:', e)
    return NextResponse.json({ error: e.message || 'Error interno.' }, { status: 500 })
  }
}
