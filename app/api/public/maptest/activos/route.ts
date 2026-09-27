import { NextResponse } from 'next/server'
import { obtenerSupabaseAdmin } from '@/lib/supabase-admin'
import { obtenerSesion } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const sesion = await obtenerSesion()
    if (!sesion || (sesion.rol !== 'admin' && sesion.rol !== 'cajero')) {
      return NextResponse.json(
        { error: 'Acceso no autorizado. Se requieren permisos de personal.' },
        { status: 401 }
      )
    }

    const supabase = obtenerSupabaseAdmin()

    // 1. Obtener pedidos activos de delivery
    const { data: pedidosData, error: pedidosError } = await supabase
      .from('pedidos')
      .select('id, cliente, direccion, estado, total, cadete_id, cadete_nombre, coordenadas, created_at, orden_entrega')
      .eq('tipoEntrega', 'delivery')
      .in('estado', ['nuevo', 'en_cocina', 'listo', 'en_camino'])
      .eq('archivado', false)
      .order('created_at', { ascending: false })
      .limit(30)

    if (pedidosError) {
      console.error('[maptest/activos] Error al consultar pedidos:', pedidosError)
    }

    // 2. Obtener cadetes registrados con su último estado GPS
    const { data: cadetesData, error: cadetesError } = await supabase
      .from('cadetes')
      .select('id, nombre, lat, lng, speed, heading, bateria, gps_activo, updated_at')

    if (cadetesError) {
      console.error('[maptest/activos] Error al consultar cadetes:', cadetesError)
    }

    // 3. Obtener usuarios para cruzar nombres de cadetes
    const { data: usuariosData } = await supabase
      .from('usuarios')
      .select('usuario, nombre')
      .eq('rol', 'cadete')

    const nombresMap = new Map<string, string>()
    for (const u of usuariosData || []) {
      nombresMap.set(String(u.usuario || '').toLowerCase(), u.nombre || u.usuario)
    }

    const cadetes = (cadetesData || []).map((c: any) => {
      const idLower = String(c.id || '').toLowerCase()
      const nombreUsuario = nombresMap.get(idLower)
      return {
        id: c.id,
        nombre: nombreUsuario || c.nombre || c.id,
        lat: c.lat,
        lng: c.lng,
        speed: c.speed,
        heading: c.heading,
        bateria: c.bateria,
        gps_activo: c.gps_activo,
        updated_at: c.updated_at,
        tiene_coordenadas: typeof c.lat === 'number' && typeof c.lng === 'number' && c.lat !== 0 && c.lng !== 0,
      }
    })

    return NextResponse.json({
      pedidos: pedidosData || [],
      cadetes,
      timestamp: new Date().toISOString(),
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      }
    })
  } catch (err: any) {
    console.error('[maptest/activos] Error inesperado:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
