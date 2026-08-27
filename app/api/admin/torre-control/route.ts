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

    // 2. Obtener usuarios para cruzar nombres
    const { data: usuariosData, error: usuariosError } = await supabase
      .from('usuarios')
      .select('usuario, nombre, rol')
      
    if (usuariosError) throw usuariosError

    // 3. Obtener pedidos activos para saber en qué andan
    const { data: pedidosData, error: pedidosError } = await supabase
      .from('pedidos')
      .select('id, cliente, estado, cadete_id')
      .in('estado', ['listo', 'en_camino'])
      .eq('archivado', false)

    if (pedidosError) throw pedidosError

    // 4. Combinar datos: Todos los usuarios cadetes + cualquier registro en tabla cadetes
    const cadetesMap = new Map<string, any>()

    // Agregar todos los usuarios con rol cadete
    for (const u of usuariosData || []) {
      if (u.rol === 'cadete') {
        const idLower = String(u.usuario || '').toLowerCase()
        cadetesMap.set(idLower, {
          id: u.usuario,
          nombre: u.nombre || u.usuario,
        })
      }
    }

    // Agregar o enriquecer con todos los registros de la tabla cadetes
    for (const c of (cadetesData || []) as any[]) {
      const idLower = String(c.id || '').toLowerCase()
      const u = (usuariosData || []).find((usr: any) => String(usr.usuario || '').toLowerCase() === idLower)
      const entry = cadetesMap.get(idLower) || {
        id: c.id,
        nombre: u?.nombre || c.nombre || c.id,
      }
      entry.cadeteDb = c
      cadetesMap.set(idLower, entry)
    }

    const ahora = Date.now()
    const torreData = Array.from(cadetesMap.values()).map((entry) => {
      const cadete = entry.cadeteDb
      const idLower = String(entry.id || '').toLowerCase()
      
      // Buscar pedido activo
      const pedidoActivo = (pedidosData || []).find((p: any) => 
        String(p.cadete_id || '').toLowerCase() === idLower
      )

      const updatedAt = cadete?.updated_at ? new Date(cadete.updated_at).getTime() : 0
      const haceSegundos = updatedAt ? (ahora - updatedAt) / 1000 : 999999
      // Online si reportó en los últimos 3 minutos y gps_activo es true
      const gpsActivo = Boolean(cadete?.gps_activo && haceSegundos < 180 && cadete?.lat != null)

      return {
        id: entry.id,
        nombre: entry.nombre,
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
