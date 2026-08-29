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

// ── POST: Actualizar posición GPS del cadete autenticado ─────────────────────
export async function POST(request: Request) {
  try {
    const sesion = await obtenerSesion()
    if (!sesion || (sesion.rol !== 'cadete' && sesion.rol !== 'admin')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { lat, lng, gps_activo } = body || {}
    const cadeteId = String(sesion.usuario).trim().toLowerCase()

    const supabase = obtenerSupabaseAdmin()
    const camposActualizar: any = {
      id: cadeteId,
      nombre: sesion.nombre || cadeteId,
      activo: true,
      updated_at: new Date().toISOString(),
    }

    if (lat !== undefined && lng !== undefined) {
      camposActualizar.lat = Number(lat)
      camposActualizar.lng = Number(lng)
    }

    if (gps_activo !== undefined) {
      camposActualizar.gps_activo = Boolean(gps_activo)
    }

    const { error } = await supabase
      .from('cadetes')
      .upsert(camposActualizar, { onConflict: 'id' })

    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('[API Cadetes] Error POST:', error)
    return NextResponse.json({ error: error?.message || 'Error interno' }, { status: 500 })
  }
}
