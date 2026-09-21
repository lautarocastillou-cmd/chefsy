import { NextResponse } from 'next/server'
import { obtenerSupabaseAdmin } from '@/lib/supabase-admin'

// GET /api/public/cadete-ubicacion?id=[cadeteIdOIdentificador]
// Endpoint público para consultar la ubicación en tiempo real de un cadete sin autenticación
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const rawId = searchParams.get('id')

    if (!rawId || typeof rawId !== 'string' || !rawId.trim()) {
      return NextResponse.json({ error: 'Se requiere el identificador del cadete' }, { status: 400 })
    }

    const query = rawId.trim().toLowerCase()
    const supabase = obtenerSupabaseAdmin()

    // 1. Buscar en la tabla cadetes por ID o por Nombre (insensible a mayúsculas)
    const { data: cadetesEncontrados, error: cadeteError } = await supabase
      .from('cadetes')
      .select('id, nombre, lat, lng, speed, heading, accuracy, bateria, gps_activo, updated_at, activo')
      .or(`id.ilike.${query},nombre.ilike.${query}`)
      .limit(1)

    if (cadeteError) {
      console.error('[API cadete-ubicacion] Error al consultar cadetes:', cadeteError)
      return NextResponse.json({ error: 'Error al consultar la base de datos' }, { status: 500 })
    }

    const cadete = cadetesEncontrados?.[0]

    if (!cadete) {
      return NextResponse.json({ error: 'Cadete no encontrado' }, { status: 404 })
    }

    // 2. Verificar si está en medio de un reparto activo (opcional informativo)
    let enReparto = false
    let totalPedidosActivos = 0

    try {
      const { data: pedidosActivos } = await supabase
        .from('pedidos')
        .select('id')
        .ilike('cadete_id', cadete.id)
        .in('estado', ['listo', 'en_camino'])
        .eq('archivado', false)
        .eq('tipoEntrega', 'delivery')

      if (pedidosActivos && pedidosActivos.length > 0) {
        enReparto = true
        totalPedidosActivos = pedidosActivos.length
      }
    } catch (_) {}

    return NextResponse.json({
      cadete: {
        id: cadete.id,
        nombre: cadete.nombre || cadete.id,
        lat: cadete.lat,
        lng: cadete.lng,
        speed: cadete.speed,
        heading: cadete.heading,
        accuracy: cadete.accuracy,
        bateria: cadete.bateria,
        gps_activo: cadete.gps_activo,
        updated_at: cadete.updated_at,
        activo: cadete.activo ?? true,
      },
      en_reparto: enReparto,
      total_pedidos_activos: totalPedidosActivos,
      servidor_tiempo: new Date().toISOString(),
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      }
    })
  } catch (err: any) {
    console.error('[API cadete-ubicacion] Error no controlado:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
