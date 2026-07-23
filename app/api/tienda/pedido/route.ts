// app/api/tienda/pedido/route.ts
// Endpoint para que los clientes de la tienda creen pedidos.
// Usa el cliente admin (service_role) para bypassear RLS.
// No requiere autenticación — la validación de datos se hace aquí.

import { NextResponse } from 'next/server'
import { obtenerSupabaseAdmin } from '@/lib/supabase-admin'

// Validación básica del payload del pedido
function validarPedido(body: any): string | null {
  if (!body || typeof body !== 'object') return 'Payload inválido'
  if (!body.id || typeof body.id !== 'string') return 'ID de pedido requerido'
  if (!body.cliente || typeof body.cliente !== 'string' || !body.cliente.trim()) return 'Nombre de cliente requerido'
  if (!body.telefono || typeof body.telefono !== 'string') return 'Teléfono requerido'
  if (!Array.isArray(body.productos) || body.productos.length === 0) return 'Productos requeridos'
  if (!['delivery', 'retiro'].includes(body.tipoEntrega)) return 'Tipo de entrega inválido'
  if (!['efectivo', 'tarjeta', 'transferencia'].includes(body.metodoPago)) return 'Método de pago inválido'
  if (typeof body.total !== 'number' || body.total < 0) return 'Total inválido'
  return null
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validar datos de entrada
    const errorValidacion = validarPedido(body)
    if (errorValidacion) {
      return NextResponse.json({ error: errorValidacion }, { status: 400 })
    }

    const supabaseAdmin = obtenerSupabaseAdmin()

    // Ejecutar transacción de puntos si el cliente está logueado y hay puntos
    if (body.cliente_id && (body.puntos_gastados > 0 || body.puntos_ganados > 0)) {
      const { error: rpcError } = await supabaseAdmin.rpc('procesar_compra_puntos', {
        p_cliente_id: body.cliente_id,
        p_puntos_a_gastar: body.puntos_gastados || 0,
        p_puntos_a_ganar: body.puntos_ganados || 0,
      })
      if (rpcError) {
        console.error('[API Pedido Tienda] Error RPC puntos:', rpcError.message)
        // No bloqueamos el pedido si falla el sistema de puntos
      }
    }

    // Insertar el pedido usando service_role (bypasea RLS)
    const { error } = await supabaseAdmin
      .from('pedidos')
      .insert({ ...body, archivado: false })

    if (error) {
      console.error('[API Pedido Tienda] Error al insertar:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, id: body.id })
  } catch (err: any) {
    console.error('[API Pedido Tienda] Error inesperado:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
