import { NextResponse } from 'next/server'
import { obtenerSupabaseAdmin } from '@/lib/supabase-admin'
import { obtenerSesion } from '@/lib/auth-server'

// Un cierre de caja es información financiera: el navegador nunca debe leerlo
// directamente con la anon key. Este route handler corre con service_role
// (que saltea RLS) y devuelve solo los tres campos que la comparativa necesita.
const COLUMNAS =
  'fecha, facturacion_neta, total_pedidos, ticket_promedio, efectivo_ventas, transferencia_total, total_envios_delivery'

interface SnapshotCierre {
  fecha: string
  facturacion_neta: number | null
  total_pedidos: number | null
  ticket_promedio: number | null
  efectivo_ventas: number | null
  transferencia_total: number | null
  total_envios_delivery: number | null
}

function restarDias(fechaStr: string, dias: number): string {
  const [y, m, d] = fechaStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() - dias)
  const yy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

export async function GET(request: Request) {
  try {
    const sesion = await obtenerSesion()
    if (!sesion || sesion.rol !== 'admin') {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const fechaHoy = searchParams.get('fecha')
    const turnoTipo = searchParams.get('turno_tipo')

    if (!fechaHoy || !/^\d{4}-\d{2}-\d{2}$/.test(fechaHoy) || !turnoTipo) {
      return NextResponse.json(
        { error: 'Parámetros inválidos. Se espera fecha=YYYY-MM-DD y turno_tipo.' },
        { status: 400 }
      )
    }

    const supabase = obtenerSupabaseAdmin()
    const fechaSemanaPasada = restarDias(fechaHoy, 7)

    // 1) Intento exacto: mismo día de la semana anterior, mismo tipo de turno.
    const { data: exacto, error: errorExacto } = await supabase
      .from('cierres_diarios')
      .select(COLUMNAS)
      .eq('fecha', fechaSemanaPasada)
      .eq('turno_tipo', turnoTipo)
      .limit(1)

    if (errorExacto) throw errorExacto

    let snapshot: SnapshotCierre | null = exacto?.[0] ?? null

    // 2) Fallback: el último cierre anterior de ese mismo tipo de turno.
    if (!snapshot) {
      const { data: ultimos, error: errorUltimos } = await supabase
        .from('cierres_diarios')
        .select(COLUMNAS)
        .eq('turno_tipo', turnoTipo)
        .lt('fecha', fechaHoy)
        .order('fecha', { ascending: false })
        .limit(1)

      if (errorUltimos) throw errorUltimos
      snapshot = ultimos?.[0] ?? null
    }

    return NextResponse.json({
      fechaAnterior: fechaSemanaPasada,
      snapshot: snapshot ?? null,
    })
  } catch (error: unknown) {
    const mensaje = error instanceof Error ? error.message : String(error)
    console.error('[API Comparativa] Error obteniendo cierre de referencia:', mensaje)
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 })
  }
}
