// app/api/clientes/sesion/route.ts
// Devuelve el perfil del cliente logueado desde la cookie JWT.

import { NextResponse } from 'next/server'
import { obtenerSesionCliente } from '@/lib/auth-cliente-server'
import { obtenerSupabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export async function GET() {
  const headers = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  }

  try {
    const sesion = await obtenerSesionCliente()
    if (!sesion) {
      return NextResponse.json({ perfil: null }, { status: 200, headers })
    }

    // Refrescar puntos desde la BD
    const supabase = obtenerSupabaseAdmin()
    const { data: cliente } = await supabase
      .from('clientes')
      .select('id, nombre, telefono, puntos_actuales')
      .eq('id', sesion.clienteId)
      .maybeSingle()

    if (!cliente) {
      return NextResponse.json({ perfil: null }, { status: 200, headers })
    }

    return NextResponse.json({
      perfil: {
        id:              cliente.id,
        nombre:          cliente.nombre,
        telefono:        cliente.telefono,
        puntos_actuales: cliente.puntos_actuales,
      },
    }, { status: 200, headers })
  } catch (err) {
    console.error('[ClienteSesion] Error:', err)
    return NextResponse.json({ perfil: null }, { status: 200, headers })
  }
}
