// ─────────────────────────────────────────────────────
// app/api/admin/torre-control/route.ts
// Obtiene la ubicación en vivo de todos los cadetes y sus pedidos activos.
// ─────────────────────────────────────────────────────

import { NextResponse } from 'next/server'
import { obtenerSupabaseAdmin } from '@/lib/supabase-admin'
import { obtenerSesion } from '@/lib/auth-server'

export async function GET() {
  try {
    const sesion = await obtenerSesion()
    if (!sesion || sesion.rol !== 'admin') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 401 })
    }

    const supabase = obtenerSupabaseAdmin()

    // 1. Obtener cadetes con su ubicación
    const { data: cadetesData, error: cadetesError } = await supabase
      .from('cadetes')
      .select('id, lat, lng, gps_activo, bateria, updated_at')

    if (cadetesError) throw cadetesError

    // 2. Obtener nombres de los cadetes (de la tabla usuarios)
    const { data: usuariosData, error: usuariosError } = await supabase
      .from('usuarios')
      .select('usuario, nombre')
      .eq('rol', 'cadete')
      
    if (usuariosError) throw usuariosError

    // 3. Obtener pedidos activos para saber en qué andan
    const { data: pedidosData, error: pedidosError } = await supabase
      .from('pedidos')
      .select('id, cliente, estado, cadete_id')
      .in('estado', ['en_cocina', 'listo', 'en_camino'])
      .eq('archivado', false)

    if (pedidosError) throw pedidosError

    // 4. Combinar datos
    const torreData = cadetesData.map((cadete: any) => {
      // Buscar nombre
      const usuario = usuariosData.find((u: any) => u.usuario === cadete.id)
      
      // Buscar pedido activo
      const pedidoActivo = pedidosData.find((p: any) => p.cadete_id === cadete.id)

      return {
        id: cadete.id,
        nombre: usuario?.nombre || 'Cadete Desconocido',
        lat: cadete.lat,
        lng: cadete.lng,
        gps_activo: cadete.gps_activo,
        bateria: cadete.bateria,
        updated_at: cadete.updated_at,
        pedidoActivo: pedidoActivo ? {
          id: pedidoActivo.id,
          cliente: pedidoActivo.cliente,
          estado: pedidoActivo.estado
        } : null
      }
    })

    // Ordenar por última actualización (los más recientes primero)
    torreData.sort((a: any, b: any) => {
      const dateA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
      const dateB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
      return dateB - dateA;
    });

    return NextResponse.json(torreData)
  } catch (error) {
    console.error('[API Torre Control] Error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
