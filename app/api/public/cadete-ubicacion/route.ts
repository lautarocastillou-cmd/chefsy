import { NextResponse } from 'next/server'
import { obtenerSupabaseAdmin } from '@/lib/supabase-admin'
import { obtenerIpCliente, verificarRateLimit } from '@/lib/rate-limit'

// GET /api/public/cadete-ubicacion?id=[cadeteIdOIdentificador]
// Endpoint público para consultar la ubicación en tiempo real de un cadete
export async function GET(request: Request) {
  try {
    // 1. Rate Limiting por IP (máximo 45 peticiones por minuto por IP)
    const ip = obtenerIpCliente(request)
    const rateCheck = verificarRateLimit(`cadete-ubicacion:${ip}`, 45, 60)
    if (!rateCheck.permitido) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Por favor esperá unos segundos.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateCheck.segundosParaReset),
            'Cache-Control': 'no-store'
          }
        }
      )
    }

    const { searchParams } = new URL(request.url)
    const rawId = searchParams.get('id')

    if (!rawId || typeof rawId !== 'string' || !rawId.trim()) {
      return NextResponse.json({ error: 'Se requiere el identificador del cadete' }, { status: 400 })
    }

    const query = rawId.trim().toLowerCase()

    // Sanitización estricta anti-inyección PostgREST: solo alfanuméricos, guiones y puntos (1 a 50 caracteres)
    if (!/^[a-z0-9_\-\.]{1,50}$/.test(query)) {
      return NextResponse.json({ error: 'Identificador con formato inválido' }, { status: 400 })
    }

    const supabase = obtenerSupabaseAdmin()

    // 2. Buscar en la tabla cadetes por ID o por Nombre exacto
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

    if (!cadete || cadete.activo === false) {
      return NextResponse.json({ error: 'Cadete no disponible o inactivo' }, { status: 404 })
    }

    // 3. Protección de privacidad: Solo exponer coordenadas si el GPS está activo y la última actualización es reciente (< 15 minutos)
    const esReciente = Boolean(
      cadete.updated_at &&
      Date.now() - new Date(cadete.updated_at).getTime() < 15 * 60 * 1000
    )
    const gpsTransmitiendo = Boolean(cadete.gps_activo && esReciente)

    // 4. Verificar si está en medio de un reparto activo
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
        // Si no está transmitiendo activamente, nunca filtrar coordenadas históricas/privadas
        lat: gpsTransmitiendo ? cadete.lat : null,
        lng: gpsTransmitiendo ? cadete.lng : null,
        speed: gpsTransmitiendo ? cadete.speed : 0,
        heading: gpsTransmitiendo ? cadete.heading : 0,
        accuracy: gpsTransmitiendo ? cadete.accuracy : null,
        bateria: cadete.bateria,
        gps_activo: gpsTransmitiendo,
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
