import { NextResponse } from 'next/server'
import { obtenerSesion } from '@/lib/auth-server'
import { obtenerSupabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: Request) {
  try {
    const sesion = await obtenerSesion()
    if (!sesion) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    if (sesion.rol !== 'admin') {
      return NextResponse.json({ error: 'Operación reservada para administradores.' }, { status: 403 })
    }

    // Obtener los últimos 30 cierres ordenados por fecha ascendente para que el gráfico fluya hacia adelante
    const supabaseAdmin = obtenerSupabaseAdmin()
    const { data, error } = await supabaseAdmin
      .from('cierres_diarios')
      .select('*')
      .order('fecha', { ascending: true })
      .limit(30)

    if (error) {
      throw error
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('[API Cierres] Error al leer historial de cierres:', error)
    return NextResponse.json({ error: 'Error al leer el historial de cierres.' }, { status: 500 })
  }
}
