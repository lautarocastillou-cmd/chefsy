import { NextResponse } from 'next/server'
import { obtenerSupabaseAdmin } from '@/lib/supabase-admin'
import { esDomingoArgentina, obtenerEstadoHorarioLocal } from '@/lib/tiempo'
import { obtenerDeCache, guardarEnCache } from '@/lib/cache-servidor'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/tienda/turno
 * Ruta pública para consultar si el turno / local está activo en tiempo real.
 * Utiliza caché en memoria de 10s para proteger la cuota de Supabase contra polling masivo.
 */
export async function GET() {
  try {
    const CACHE_KEY = 'turno_tienda_publico'
    const cacheado = obtenerDeCache<any>(CACHE_KEY)
    if (cacheado) {
      return NextResponse.json(cacheado, {
        headers: {
          'Cache-Control': 'no-store, no-cache, max-age=0',
          'X-Chefsy-Cache': 'HIT',
        },
      })
    }

    const supabase = obtenerSupabaseAdmin()
    const { data, error } = await supabase
      .from('turnos')
      .select('activo, tipo_turno, fecha_inicio')
      .eq('id', 1)
      .single()

    const turnoActivoEnDb = !error && data ? Boolean(data.activo) : false
    const estadoHorario = obtenerEstadoHorarioLocal(turnoActivoEnDb)

    const payload = {
      activo: estadoHorario.abierto,
      esDomingo: estadoHorario.esDomingo,
      motivo: estadoHorario.motivo,
      mensaje: estadoHorario.mensaje,
      tipoTurno: data?.tipo_turno || null,
      fechaInicio: data?.fecha_inicio || null,
    }

    guardarEnCache(CACHE_KEY, payload, 10) // 10 segundos de TTL

    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 'no-store, no-cache, max-age=0',
        'X-Chefsy-Cache': 'MISS',
      },
    })
  } catch (error: any) {
    console.error('[API pública tienda/turno] Error:', error)
    return NextResponse.json(
      {
        activo: false,
        esDomingo: esDomingoArgentina(),
        motivo: 'error_conexion',
        mensaje: 'El local se encuentra cerrado temporalmente.',
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        },
      }
    )
  }
}
