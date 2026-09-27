// app/api/clientes/pedidos/route.ts
// Devuelve el historial de pedidos de un cliente logueado.

import { NextResponse } from 'next/server'
import { obtenerSesionCliente } from '@/lib/auth-cliente-server'
import { obtenerSupabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: Request) {
  try {
    const sesion = await obtenerSesionCliente()
    if (!sesion || !sesion.clienteId) {
      return NextResponse.json(
        { error: 'Iniciá sesión para ver tu historial de pedidos.', pedidos: [] },
        { status: 401 }
      )
    }

    let clienteId: string = sesion.clienteId
    let telefono: string | undefined = sesion.telefono

    const supabase = obtenerSupabaseAdmin()

    // Buscar los datos vigentes del cliente en la BD por seguridad
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

    let filtros: string[] = []
    if (clienteId && /^[0-9a-fA-F\-]{36}$/.test(clienteId)) {
      filtros.push(`cliente_id.eq.${clienteId}`)
    }
    if (telefono && typeof telefono === 'string') {
      const telLimpio = telefono.replace(/[^\d+]/g, '')
      if (telLimpio.length >= 6) {
        filtros.push(`telefono.eq.${telLimpio}`)
      }
    }

    if (filtros.length === 0) {
      return NextResponse.json({ pedidos: [] }, { status: 200 })
    }

    // Columnas esenciales para historial de cliente (excluye ruta_historial, push_subscription, etc.)
    const COLUMNAS_HISTORIAL_CLIENTE = 'id, created_at, fecha, hora, total, costoEnvio, tipoEntrega, direccion, productos, puntos_ganados, estado'

    const { data: pedidos, error } = await supabase
      .from('pedidos')
      .select(COLUMNAS_HISTORIAL_CLIENTE)
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
