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
    // Solo 'en_camino' significa que el cadete está EN VIAJE.
    // 'en_cocina' y 'listo' significan que el pedido está esperando en el local.
    const { data: pedidosData, error: pedidosError } = await supabase
      .from('pedidos')
      .select('id, cliente, estado, cadete_id')
      .eq('estado', 'en_camino')
      .eq('archivado', false)

    if (pedidosError) throw pedidosError

    // 4. Combinar datos basados en todos los usuarios cadetes registrados
    const torreData = (usuariosData || []).map((u: any) => {
      // Buscar registro en cadetes por id o username (case-insensitive)
      const cadete = (cadetesData || []).find((c: any) => 
        String(c.id || '').toLowerCase() === String(u.usuario || '').toLowerCase() ||
        String(c.username || '').toLowerCase() === String(u.usuario || '').toLowerCase()
      )
      
      // Buscar pedido activo
      const pedidoActivo = (pedidosData || []).find((p: any) => 
        String(p.cadete_id || '').toLowerCase() === String(u.usuario || '').toLowerCase()
      )

      const updatedAt = cadete?.updated_at ? new Date(cadete.updated_at).getTime() : 0
      const haceSegundos = updatedAt ? (Date.now() - updatedAt) / 1000 : 999999
      // Online si reportó en los últimos 3 minutos y gps_activo es true
      const gpsActivo = Boolean(cadete?.gps_activo && haceSegundos < 180 && cadete?.lat != null)

      return {
        id: u.usuario,
        nombre: u.nombre || u.usuario,
        lat: cadete?.lat ?? null,
        lng: cadete?.lng ?? null,
        gps_activo: gpsActivo,
        bateria: cadete?.bateria ?? null,
        updated_at: cadete?.updated_at ?? null,
        segundos_offline: updatedAt ? Math.floor(haceSegundos) : null,
        pedidoActivo: pedidoActivo ? {
          id: pedidoActivo.id,
          cliente: pedidoActivo.cliente,
          estado: pedidoActivo.estado
        } : null
      }
    })

    // Ordenar: primero los que tienen GPS activo, luego por última actualización
    torreData.sort((a: any, b: any) => {
      if (a.gps_activo && !b.gps_activo) return -1
      if (!a.gps_activo && b.gps_activo) return 1
      const dateA = a.updated_at ? new Date(a.updated_at).getTime() : 0
      const dateB = b.updated_at ? new Date(b.updated_at).getTime() : 0
      return dateB - dateA
    })

    return NextResponse.json(torreData)
  } catch (error) {
    console.error('[API Torre Control] Error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
