import { NextResponse } from 'next/server'
import { obtenerSesion } from '@/lib/auth-server'
import { createClient } from '@supabase/supabase-js'

function obtenerSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Faltan credenciales de Supabase')
  return createClient(url, key, { auth: { persistSession: false } })
}

export async function GET() {
  try {
    const supabase = obtenerSupabaseAdmin()
    const { data, error } = await supabase.from('turnos').select('*').eq('id', 1).single()
    
    if (error || !data) {
      // Si falla, devolvemos un estado inactivo por defecto
      return NextResponse.json({
        activo: false,
        cajaInicial: 0,
        fechaInicio: null
      })
    }
    
    return NextResponse.json({
      activo: data.activo,
      cajaInicial: data.caja_inicial,
      fechaInicio: data.fecha_inicio
    })
  } catch (error: any) {
    console.error('[API Turno] Error al leer estado del turno:', error)
    return NextResponse.json({ error: 'Error al leer el turno.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const sesion = await obtenerSesion()
  if (!sesion || sesion.rol !== 'admin') {
    return NextResponse.json(
      { error: 'Acceso denegado. Operación reservada para administradores.' },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()
    const { activo, cajaInicial, fechaInicio } = body

    if (activo === undefined) {
      return NextResponse.json({ error: 'Datos incompletos.' }, { status: 400 })
    }

    const supabase = obtenerSupabaseAdmin()
    
    // Upsert a la fila con ID 1
    const { error } = await supabase
      .from('turnos')
      .upsert({ 
        id: 1, 
        activo, 
        caja_inicial: cajaInicial, 
        fecha_inicio: fechaInicio 
      })

    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('[API Turno] Error al escribir estado del turno:', error)
    return NextResponse.json(
      { error: error.message || 'Error al guardar el turno en Supabase.' },
      { status: 500 }
    )
  }
}
