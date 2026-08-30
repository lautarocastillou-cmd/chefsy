import { NextResponse } from 'next/server'
import { obtenerSupabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'
export const revalidate = 15

/**
 * GET /api/tienda/turno
 * Ruta pública para consultar si el turno / local está activo.
 * Optimizado con caché Edge (s-maxage=15, stale-while-revalidate=45).
 */
export async function GET() {
  try {
    const supabase = obtenerSupabaseAdmin()
    const { data, error } = await supabase.from('turnos').select('activo').eq('id', 1).single()
    
    if (error || !data) {
      return NextResponse.json({ activo: false }, {
        headers: { 'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=45' }
      })
    }
    
    return NextResponse.json({ activo: data.activo }, {
      headers: { 'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=45' }
    })
  } catch (error: any) {
    console.error('[API pública tienda/turno]', error)
    return NextResponse.json({ activo: false }, {
      headers: { 'Cache-Control': 'no-store, max-age=0' }
    })
  }
}
