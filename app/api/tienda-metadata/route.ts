import { NextResponse } from 'next/server'
import { obtenerSupabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

/**
 * GET /api/tienda-metadata
 * Ruta pública — no requiere autenticación.
 * Devuelve los metadatos públicos de productos (descripción, imagen, nombre público).
 */
export async function GET() {
  try {
    const supabase = obtenerSupabaseAdmin()
    const { data, error } = await supabase.from('tienda_metadata').select('*')
    if (error) throw error
    return NextResponse.json(data || [], {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      }
    })
  } catch (error: any) {
    console.error('[API pública tienda-metadata]', error)
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 })
  }
}
