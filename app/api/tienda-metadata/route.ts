import { NextResponse } from 'next/server'
import { obtenerSupabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'
export const revalidate = 60

/**
 * GET /api/tienda-metadata
 * Ruta pública — no requiere autenticación.
 * Devuelve los metadatos públicos de productos (descripción, imagen, nombre público).
 * Optimizado con caché Edge (s-maxage=60, stale-while-revalidate=300).
 */
export async function GET() {
  try {
    const supabase = obtenerSupabaseAdmin()
    const { data, error } = await supabase.from('tienda_metadata').select('*')
    if (error) throw error
    return NextResponse.json(data || [], {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      }
    })
  } catch (error: any) {
    console.error('[API pública tienda-metadata]', error)
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 })
  }
}
