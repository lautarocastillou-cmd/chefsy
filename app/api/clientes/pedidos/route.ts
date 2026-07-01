// app/api/clientes/pedidos/route.ts
// Devuelve el historial de pedidos de un cliente logueado.

import { NextResponse } from 'next/server'
import { obtenerSesionCliente } from '@/lib/auth-cliente-server'
import { obtenerSupabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: Request) {
  try {
    let clienteId: string | undefined
    let telefono: string | undefined

    const sesion = await obtenerSesionCliente()
    if (sesion) {
      clienteId = sesion.clienteId
      telefono = sesion.telefono
    } else {
      try {
        const body = await req.json()
        clienteId = body?.clienteId
        telefono = body?.telefono
      } catch { /* ignorar cuerpo vacío o inválido */ }
    }

    if (!clienteId && !telefono) {
      return NextResponse.json({ error: 'Falta identificación del cliente', pedidos: [] }, { status: 400 })
    }

    const supabase = obtenerSupabaseAdmin()

    // Si tenemos clienteId, buscar los datos reales del cliente en la BD por seguridad
    if (clienteId) {
      const { data: clienteDB } = await supabase
        .from('clientes')
        .select('id, telefono')
        .eq('id', clienteId)
        .maybeSingle()

      if (clienteDB) {
        clienteId = clienteDB.id
        if (clienteDB.telefono) {
          telefono = clienteDB.telefono
        }
      }
    }

    let filtros: string[] = []
    if (clienteId) filtros.push(`cliente_id.eq.${clienteId}`)
    if (telefono && telefono.trim() !== '') filtros.push(`telefono.eq.${telefono.trim()}`)

    if (filtros.length === 0) {
      return NextResponse.json({ pedidos: [] }, { status: 200 })
    }

    const { data: pedidos, error } = await supabase
      .from('pedidos')
      .select('*')
      .or(filtros.join(','))
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('[ClientePedidos] Error de BD:', error.message)
      return NextResponse.json({ pedidos: [] }, { status: 200 })
    }

    return NextResponse.json({ pedidos: pedidos || [] }, { status: 200 })
  } catch (err) {
    console.error('[ClientePedidos] Error general:', err)
    return NextResponse.json({ pedidos: [] }, { status: 500 })
  }
}
