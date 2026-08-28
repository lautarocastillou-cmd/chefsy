import { NextResponse } from 'next/server'
import { obtenerSupabaseAdmin } from '@/lib/supabase-admin'
import { obtenerSesion } from '@/lib/auth-server'

// ── GET: Obtener lista de cadetes con estado GPS/Turno en tiempo real ────────
export async function GET() {
  try {
    const sesion = await obtenerSesion()
    if (!sesion) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const supabase = obtenerSupabaseAdmin()

    // 1. Obtener usuarios con rol cadete
    const { data: usuarios, error: errUsuarios } = await supabase
      .from('usuarios')
      .select('usuario, nombre')
      .eq('rol', 'cadete')
      .order('nombre', { ascending: true })

    if (errUsuarios) throw errUsuarios

    // 2. Obtener estado de GPS / turno en vivo desde la tabla cadetes
    const { data: cadetesGPS } = await supabase
      .from('cadetes')
      .select('id, gps_activo, lat, lng, updated_at, bateria')

    const gpsMap = new Map<string, any>()
    for (const c of (cadetesGPS || []) as any[]) {
      gpsMap.set(String(c.id || '').toLowerCase(), c)
    }

    // 3. Mapear con información de turno / GPS
    const cadetes = (usuarios || []).map((u: any) => {
      const infoGps = gpsMap.get(String(u.usuario || '').toLowerCase())
      const gpsActivo = Boolean(infoGps?.gps_activo)

      return {
        id: u.usuario,
        nombre: u.nombre,
        gps_activo: gpsActivo,
        online: gpsActivo,
        bateria: infoGps?.bateria ?? null,
        lat: infoGps?.lat ?? null,
        lng: infoGps?.lng ?? null,
        updated_at: infoGps?.updated_at ?? null,
      }
    })

    return NextResponse.json(cadetes)
  } catch (error) {
    console.error('[API Cadetes] Error GET:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
