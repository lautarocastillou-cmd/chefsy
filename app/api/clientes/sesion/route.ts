// app/api/clientes/sesion/route.ts
// Devuelve el perfil del cliente logueado desde la cookie JWT.

import { NextResponse } from 'next/server'
import { obtenerSesionCliente } from '@/lib/auth-cliente-server'
import { obtenerSupabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
  try {
    const sesion = await obtenerSesionCliente()
    if (!sesion) {
      return NextResponse.json({ perfil: null }, { status: 200 })
    }

    // Refrescar puntos desde la BD
    const supabase = obtenerSupabaseAdmin()
    const { data: cliente } = await supabase
      .from('clientes')
      .select('id, nombre, telefono, puntos_actuales')
      .eq('id', sesion.clienteId)
      .maybeSingle()

    if (!cliente) {
      return NextResponse.json({ perfil: null }, { status: 200 })
    }

    return NextResponse.json({
      perfil: {
        id:              cliente.id,
        nombre:          cliente.nombre,
        telefono:        cliente.telefono,
        puntos_actuales: cliente.puntos_actuales,
      },
    })
  } catch (err) {
    console.error('[ClienteSesion] Error:', err)
    return NextResponse.json({ perfil: null }, { status: 200 })
  }
}
