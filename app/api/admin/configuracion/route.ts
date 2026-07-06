import { NextResponse } from 'next/server'
import { obtenerSesion } from '@/lib/auth-server'
import { obtenerSupabaseAdmin } from '@/lib/supabase-admin'
import configuracionFallback from '@/config/operacion.json'

// ─────────────────────────────────────────────────────
// app/api/admin/configuracion/route.ts
// Lee y escribe la configuración operativa desde Supabase.
// Fallback a config/operacion.json si la tabla no responde.
// ─────────────────────────────────────────────────────

export async function GET() {
  const sesion = await obtenerSesion()
  if (!sesion) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  try {
    const supabase = obtenerSupabaseAdmin()

    const { data, error } = await supabase
      .from('configuracion_operativa')
      .select('limites, prioridades')
      .eq('id', 1)
      .single()

    if (error || !data) {
      console.warn('[API Config] Supabase no disponible, usando fallback local:', error?.message)
      return NextResponse.json(configuracionFallback)
    }

    return NextResponse.json({
      limites: data.limites,
      prioridades: data.prioridades,
    })
  } catch (error: any) {
    console.error('[API Config] Error al leer la configuración:', error)
    // Fallback al JSON estático en caso de error inesperado
    return NextResponse.json(configuracionFallback)
  }
}

export async function POST(request: Request) {
  // Validar sesión del administrador
  const sesion = await obtenerSesion()
  if (!sesion || sesion.rol !== 'admin') {
    return NextResponse.json(
      { error: 'Acceso denegado. Operación reservada para administradores.' },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()
    const { limites, prioridades } = body

    if (!limites || !prioridades) {
      return NextResponse.json(
        { error: 'Datos incompletos. Se requieren limites y prioridades.' },
        { status: 400 }
      )
    }

    const supabase = obtenerSupabaseAdmin()

    const { error } = await supabase
      .from('configuracion_operativa')
      .upsert(
        { id: 1, limites, prioridades, updated_at: new Date().toISOString() },
        { onConflict: 'id' }
      )

    if (error) {
      console.error('[API Config] Error al guardar en Supabase:', error)
      return NextResponse.json(
        { error: 'Error al guardar la configuración en la base de datos.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('[API Config] Error al procesar la solicitud:', error)
    return NextResponse.json(
      { error: 'Error interno al procesar la configuración.' },
      { status: 500 }
    )
  }
}
