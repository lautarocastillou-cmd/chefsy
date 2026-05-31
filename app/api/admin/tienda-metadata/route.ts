import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { validarCredenciales } from '@/lib/auth-server' // Usamos esto para verificar si es admin? Wait no, las rutas de admin usan el token.
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
    const supabase = obtenerSupabaseAdmin()
    const { data, error } = await supabase.from('tienda_metadata').select('*')
    if (error) throw error
    return NextResponse.json(data || [])
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    // Protección básica: verificar cookie de sesión
    const cookieStore = await cookies()
    const token = cookieStore.get('chefsy-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
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
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
