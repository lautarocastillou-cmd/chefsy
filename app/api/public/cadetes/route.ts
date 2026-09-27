import { NextResponse } from 'next/server'
import { obtenerSupabaseAdmin } from '@/lib/supabase-admin'
import { verificarTokenFlutter } from '@/lib/auth-flutter'

// GET /api/public/cadetes
// Devuelve la lista de cadetes activos para que la app Flutter llene el selector dinámicamente.
export async function GET(request: Request) {
  try {
    const auth = verificarTokenFlutter(request)
    if (!auth.autorizado) {
      return auth.errorResponse!
    }

    const supabase = obtenerSupabaseAdmin()
    const { data, error } = await supabase
      .from('usuarios')
      .select('usuario, nombre')
      .eq('rol', 'cadete')
      .order('nombre', { ascending: true })

    if (error) throw error

    const cadetes = (data || []).map((u: any) => ({
      id: u.usuario,
      nombre: u.nombre,
    }))

    return NextResponse.json({ cadetes })
  } catch (error) {
    console.error('[API Pública Cadetes] Error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
