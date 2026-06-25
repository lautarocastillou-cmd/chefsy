export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { obtenerSesion } from '@/lib/auth-server'
import { obtenerSupabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
  try {
    const sesion = await obtenerSesion()
    if (!sesion) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const supabase = obtenerSupabaseAdmin()
    const { data, error } = await supabase.from('turnos').select('*').eq('id', 1).single()
    
    if (error || !data) {
      console.error('[API Turno] Error de base de datos:', error)
      // Si falla, devolvemos un estado inactivo por defecto
      return NextResponse.json({
        activo: false,
        cajaInicial: 0,
        fechaInicio: null
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
        }
      })
    }
    
    return NextResponse.json({
      activo: data.activo,
      cajaInicial: data.caja_inicial,
      fechaInicio: data.fecha_inicio
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
      }
    })
  } catch (error: any) {
    console.error('[API Turno] Error al leer estado del turno:', error)
    return NextResponse.json({ error: 'Error al leer el turno.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const sesion = await obtenerSesion()
  if (!sesion) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }
  if (sesion.rol !== 'admin') {
    return NextResponse.json(
      { error: 'Acceso denegado. Operación reservada para administradores.' },
      { status: 403 }
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
      { error: 'Error al guardar el turno en Supabase.' },
      { status: 500 }
    )
  }
}
