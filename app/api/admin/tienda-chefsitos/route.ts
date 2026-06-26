import { NextResponse } from 'next/server'
import { obtenerSesion } from '@/lib/auth-server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function obtenerSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Variables Supabase faltantes')
  return createClient(url, key, { auth: { persistSession: false } })
}

export async function POST(req: Request) {
  try {
    const sesion = await obtenerSesion()
    if (!sesion || sesion.rol !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const body = await req.json()
    const { producto_id, precio_puntos } = body

    if (!producto_id || typeof precio_puntos !== 'number') {
      return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 })
    }

    const supabase = obtenerSupabaseAdmin()
    
    const { error } = await supabase
      .from('productos')
      .update({ precio_puntos: Math.max(0, precio_puntos) })
      .eq('id', producto_id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[API Tienda Chefsitos] Error actualizando puntos:', error)
    return NextResponse.json({ error: error?.message || 'Error interno del servidor.' }, { status: 500 })
  }
}
