import { NextResponse } from 'next/server'
import { obtenerSupabaseAdmin } from '@/lib/supabase-admin'
import { esDomingoArgentina, obtenerEstadoHorarioLocal } from '@/lib/tiempo'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/tienda/turno
 * Ruta pública para consultar si el turno / local está activo en tiempo real.
 * Cero caché (no-store) para garantizar blindaje total de turnos.
 */
export async function GET() {
  try {
    const supabase = obtenerSupabaseAdmin()
    const { data, error } = await supabase
      .from('turnos')
      .select('activo, tipo_turno, fecha_inicio')
      .eq('id', 1)
      .single()

    const turnoActivoEnDb = !error && data ? Boolean(data.activo) : false
    const estadoHorario = obtenerEstadoHorarioLocal(turnoActivoEnDb)

    return NextResponse.json(
      {
        activo: estadoHorario.abierto,
        esDomingo: estadoHorario.esDomingo,
        motivo: estadoHorario.motivo,
        mensaje: estadoHorario.mensaje,
        tipoTurno: data?.tipo_turno || null,
        fechaInicio: data?.fecha_inicio || null,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    )
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
