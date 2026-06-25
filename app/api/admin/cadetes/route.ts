import { NextResponse } from 'next/server'
import { obtenerSupabaseAdmin } from '@/lib/supabase-admin'
import { obtenerSesion } from '@/lib/auth-server'

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
