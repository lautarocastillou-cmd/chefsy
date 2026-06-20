import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// Cliente Admin para saltarse el RLS y leer datos desde el servidor
function obtenerSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Variables Supabase faltantes')
  return createClient(url, key, { auth: { persistSession: false } })
}

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
