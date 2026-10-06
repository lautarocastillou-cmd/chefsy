import { NextResponse } from 'next/server'
import { obtenerSupabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// ─────────────────────────────────────────────────────────────────────────────
// [TEMPORAL: TÚNEL DE PRUEBAS MAPLIBRE PARA FLOTA-WEB]
// ⚠️ ESTE ENDPOINT ES 100% TEMPORAL Y SE PUEDE ELIMINAR EN CUALQUIER MOMENTO.
// Permite leer las ubicaciones de los cadetes activos para probar el motor 3D.
// ─────────────────────────────────────────────────────────────────────────────

const CLAVE_ACCESO_TEMPORAL = 'flota2026'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const clave = searchParams.get('clave')

    // Verificación de clave simple para evitar accesos no intencionales
    if (clave !== CLAVE_ACCESO_TEMPORAL) {
      return NextResponse.json(
        { error: 'Clave de túnel temporal no válida' },
        { status: 403 }
      )
    }

    const supabase = obtenerSupabaseAdmin()

    // 1. Obtener cadetes con su última telemetría
    const { data: cadetesData, error: cadetesError } = await supabase
      .from('cadetes')
      .select('id, nombre, lat, lng, speed, heading, accuracy, bateria, gps_activo, updated_at, apagado_por_admin')
      .order('updated_at', { ascending: false })

    if (cadetesError) {
      console.error('[Túnel Temporal] Error al leer cadetes:', cadetesError)
      return NextResponse.json({ error: 'Error al consultar cadetes' }, { status: 500 })
    }

    // 2. Obtener usuarios para cruzar nombres reales si no están en cadetes
    const { data: usuariosData } = await supabase
      .from('usuarios')
      .select('usuario, nombre')
      .eq('rol', 'cadete')

    const nombresMap = new Map<string, string>()
    for (const u of usuariosData || []) {
      nombresMap.set(String(u.usuario || '').toLowerCase(), u.nombre || u.usuario)
    }

    // 3. Obtener pedidos en camino para saber qué cliente tienen asignado
    const { data: pedidosData } = await supabase
      .from('pedidos')
      .select('id, cliente, direccion, coordenadas, estado, total, cadete_id, cadete_nombre')
      .in('estado', ['listo', 'en_camino'])
      .eq('archivado', false)

    const pedidosMap = new Map<string, any>()
    for (const p of pedidosData || []) {
      if (p.cadete_id) {
        pedidosMap.set(String(p.cadete_id).toLowerCase(), p)
      }
    }

    const ahoraMs = Date.now()
    const SEGUNDOS_GPS_FRESCO = 180 // 3 minutos

    const cadetes = (cadetesData || []).map((c: any) => {
      const idLower = String(c.id || '').toLowerCase()
      const nombreReal = nombresMap.get(idLower) || c.nombre || c.id
      const pedidoActivo = pedidosMap.get(idLower) || null

      const diffSeg = c.updated_at
        ? Math.max(0, Math.floor((ahoraMs - new Date(c.updated_at).getTime()) / 1000))
        : 999999
      const esFresco = diffSeg < SEGUNDOS_GPS_FRESCO
      const gpsActivo = Boolean(c.gps_activo) && esFresco && !c.apagado_por_admin

      return {
        id: c.id,
        nombre: nombreReal,
        lat: typeof c.lat === 'number' ? c.lat : Number(c.lat) || null,
        lng: typeof c.lng === 'number' ? c.lng : Number(c.lng) || null,
        speed: c.speed ?? null,
        heading: c.heading ?? null,
        accuracy: c.accuracy ?? null,
        bateria: c.bateria ?? null,
        gps_activo: gpsActivo,
        updated_at: c.updated_at ?? null,
        segundos_offline: diffSeg,
        pedidoActivo: pedidoActivo
          ? {
              id: pedidoActivo.id,
              cliente: pedidoActivo.cliente,
              direccion: pedidoActivo.direccion,
              coordenadas: pedidoActivo.coordenadas,
              estado: pedidoActivo.estado,
              total: pedidoActivo.total,
            }
          : null,
      }
    })

    return NextResponse.json(
      {
        temporal: true,
        servidor: 'chefsy.xyz',
        timestamp: new Date().toISOString(),
        total_cadetes: cadetes.length,
        cadetes_activos: cadetes.filter((c) => c.gps_activo && c.lat !== null && c.lng !== null).length,
        cadetes,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  } catch (error: any) {
    console.error('[Túnel Temporal] Excepción:', error)
    return NextResponse.json({ error: error?.message || 'Error interno' }, { status: 500 })
  }
}
