// ─────────────────────────────────────────────────────
// app/api/admin/catalogo/route.ts
// Endpoint seguro para sincronizar el catálogo desde el servidor.
// Valida sesión de administrador y escribe usando service_role.
// ─────────────────────────────────────────────────────

import { NextResponse } from 'next/server'
import { obtenerSesion } from '@/lib/auth-server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  // 1. Validar sesión del administrador en el servidor
  const sesion = await obtenerSesion()
  if (!sesion || sesion.rol !== 'admin') {
    return NextResponse.json(
      { error: 'Acceso denegado. Se requiere sesión de administrador.' },
      { status: 403 }
    )
  }

  try {
    const payload = await request.json()
    const { categorias, productos, modificadores } = payload

    if (!categorias || !productos || !modificadores) {
      return NextResponse.json(
        { error: 'Datos de catálogo incompletos.' },
        { status: 400 }
      )
    }

    // 2. Inicializar cliente de Supabase administrativo con service_role
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !serviceRoleKey) {
      console.error('[API Catalogo] Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en variables de entorno.')
      return NextResponse.json(
        { error: 'Configuración del servidor incompleta.' },
        { status: 500 }
      )
    }

    const supabaseAdmin = createClient(url, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    })

    // 3. Escribir de forma segura en la base de datos (evitando RLS público)
    const { error } = await supabaseAdmin
      .from('catalogo')
      .upsert({
        id: 'principal',
        categorias,
        productos,
        modificadores,
        updated_at: new Date().toISOString()
      })

    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('[API Catalogo] Error al sincronizar:', error)
    return NextResponse.json(
      { error: error.message || 'Error al guardar el catálogo en el servidor.' },
      { status: 500 }
    )
  }
}
