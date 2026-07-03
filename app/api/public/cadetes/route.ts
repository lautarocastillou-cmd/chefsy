import { NextResponse } from 'next/server'
import { obtenerSupabaseAdmin } from '@/lib/supabase-admin'

// Token compartido con la app Flutter
const FLUTTER_SECRET_TOKEN = 'chefsy_expo_secure_track_99XQ'

// GET /api/public/cadetes
// Devuelve la lista de cadetes activos para que la app Flutter llene el selector dinámicamente.
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${FLUTTER_SECRET_TOKEN}`) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
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
