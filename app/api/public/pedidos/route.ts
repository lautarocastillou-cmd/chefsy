import { NextResponse } from 'next/server'
import { obtenerSupabaseAdmin } from '@/lib/supabase-admin'
import { obtenerFechaNegocio } from '@/lib/tiempo'

// Token compartido con la app Flutter
const FLUTTER_SECRET_TOKEN = 'chefsy_expo_secure_track_99XQ'

// GET /api/public/pedidos?cadeteId=paulo
// Devuelve los pedidos listos o en_camino asignados al cadete, del día actual.
// Autenticado con token Bearer estático para evitar exponer sesiones.
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${FLUTTER_SECRET_TOKEN}`) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const cadeteId = searchParams.get('cadeteId')

    if (!cadeteId) {
      return NextResponse.json({ error: 'cadeteId requerido' }, { status: 400 })
    }

    const supabase = obtenerSupabaseAdmin()
    const fechaHoy = obtenerFechaNegocio()

    const { data, error } = await supabase
      .from('pedidos')
      .select('id, cliente, telefono, direccion, estado, metodoPago, total, hora, cadete_id, cadete_nombre')
      .eq('cadete_id', cadeteId)
      .in('estado', ['en_cocina', 'listo', 'en_camino'])
      .eq('fecha', fechaHoy)
      .eq('archivado', false)
      .order('hora', { ascending: true })

    if (error) throw error

    return NextResponse.json({ pedidos: data || [] })
  } catch (error) {
    console.error('[API Pública Pedidos] Error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
