import { NextResponse } from 'next/server'
import { obtenerSesion } from '@/lib/auth-server'
import { obtenerSupabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = obtenerSupabaseAdmin()
    const { data, error } = await supabase
      .from('configuracion_tienda')
      .select('*')
      .eq('id', 1)
      .single()

    if (error) {
      console.error('[API Config Tienda GET] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, data })
  } catch (error: any) {
    console.error('[API Config Tienda GET] Error inesperado:', error)
    return NextResponse.json({ error: error.message || 'Error del servidor' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  // Validar sesión del administrador
  const sesion = await obtenerSesion()
  if (!sesion || sesion.rol !== 'admin') {
    return NextResponse.json(
      { error: 'Acceso denegado. Se requiere sesión de administrador.' },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Datos de configuración inválidos.' },
        { status: 400 }
      )
    }

    const { id, created_at, ...datosAActualizar } = body

    const supabase = obtenerSupabaseAdmin()
    const { data, error } = await supabase
      .from('configuracion_tienda')
      .update({
        ...datosAActualizar,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1)
      .select()
      .single()

    if (error) {
      console.error('[API Config Tienda POST] Error al actualizar:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, data })
  } catch (error: any) {
    console.error('[API Config Tienda POST] Error inesperado:', error)
    return NextResponse.json({ error: error.message || 'Error del servidor' }, { status: 500 })
  }
}
