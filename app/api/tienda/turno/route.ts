import { NextResponse } from 'next/server'
import { obtenerSupabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

/**
 * GET /api/tienda/turno
 * Ruta pública para consultar si el turno / local está activo.
 */
export async function GET() {
  try {
    const supabase = obtenerSupabaseAdmin()
    const { data, error } = await supabase.from('turnos').select('activo').eq('id', 1).single()
    
    if (error || !data) {
      return NextResponse.json({ activo: false }, {
        headers: { 'Cache-Control': 'no-store, max-age=0' }
      })
    }
    
    return NextResponse.json({ activo: data.activo }, {
      headers: { 'Cache-Control': 'no-store, max-age=0' }
    })
  } catch (error: any) {
    console.error('[API pública tienda/turno]', error)
    return NextResponse.json({ activo: false }, {
      headers: { 'Cache-Control': 'no-store, max-age=0' }
    })
  }
}
