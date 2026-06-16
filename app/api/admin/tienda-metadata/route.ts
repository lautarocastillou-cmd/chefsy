import { NextResponse } from 'next/server'
import { obtenerSesion } from '@/lib/auth-server'
import { createClient } from '@supabase/supabase-js'

// Cliente de Supabase Admin para saltarse el RLS
function obtenerSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Variables Supabase faltantes')
  return createClient(url, key, { auth: { persistSession: false } })
}

export async function GET() {
  try {
    const sesion = await obtenerSesion()
    if (!sesion || sesion.rol !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const supabase = obtenerSupabaseAdmin()
    const { data, error } = await supabase.from('tienda_metadata').select('*')
    if (error) throw error
    return NextResponse.json(data || [])
  } catch (error: any) {
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    // Protección estricta: verificar sesión y rol
    const sesion = await obtenerSesion()
    if (!sesion || sesion.rol !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const body = await req.json()
    const { producto_id, nombre_publico, descripcion_publica, imagen_url } = body

    if (!producto_id) {
      return NextResponse.json({ error: 'producto_id es requerido' }, { status: 400 })
    }

    const supabase = obtenerSupabaseAdmin()
    
    // Upsert (inserta o actualiza)
    const { data, error } = await supabase
      .from('tienda_metadata')
      .upsert({ 
        producto_id, 
        nombre_publico, 
        descripcion_publica, 
        imagen_url,
        updated_at: new Date().toISOString()
      }, { onConflict: 'producto_id' })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Error guardando metadata:', error)
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 })
  }
}
