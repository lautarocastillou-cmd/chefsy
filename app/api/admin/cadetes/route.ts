import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { obtenerSesion } from '@/lib/auth-server'

// ── Cliente Supabase de Solo Servidor ──────────────────────────────────────
function obtenerSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Variables de entorno Supabase no configuradas')
  return createClient(url, key, { auth: { persistSession: false } })
}

// ── GET: Obtener lista de cadetes activos ──────────────────────────────────
// Retorna usuarios con rol "cadete" para usarse en selectores de asignación.
// No requiere autenticación de admin ya que es información de lectura necesaria
// para todo el panel (incluyendo la vista de cadetería).
export async function GET() {
  try {
    const sesion = await obtenerSesion()
    if (!sesion) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const supabase = obtenerSupabaseAdmin()
    const { data, error } = await supabase
      .from('usuarios')
      .select('usuario, nombre')
      .eq('rol', 'cadete')
      .order('nombre', { ascending: true })

    if (error) throw error

    // Mapear al formato { id, nombre } que espera el frontend
    const cadetes = (data || []).map((u: any) => ({
      id: u.usuario,
      nombre: u.nombre,
    }))

    return NextResponse.json(cadetes)
  } catch (error) {
    console.error('[API Cadetes] Error GET:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
