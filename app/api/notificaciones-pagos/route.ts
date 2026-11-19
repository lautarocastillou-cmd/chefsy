import { NextResponse } from 'next/server'
import { obtenerSesion } from '@/lib/auth-server'
import { obtenerSupabaseAdmin } from '@/lib/supabase-admin'
import { notificarCambioPedido } from '@/lib/pedidos-broadcast'

// Notificaciones de pago para verificación interna (solo admin/local).
// Se almacenan en la tabla existente `cadetes_pagos_extras` con motivo
// 'verificar_pago' para no crear tablas nuevas. No usa Supabase Realtime
// directamente desde el cliente (evita saturar la cuota free); el Flutter
// consulta por polling HTTP ligero cada 30s cuando el modo está activo.

export async function GET(request: Request) {
  try {
    const sesion = await obtenerSesion()
    if (!sesion || (sesion.rol !== 'admin' && sesion.rol !== 'cajero')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const cadeteId = searchParams.get('cadeteId')
    const pedidoId = searchParams.get('pedidoId')
    const soloNoLeidas = searchParams.get('noLeidas') === '1'

    const supabaseAdmin = obtenerSupabaseAdmin()

    let query = supabaseAdmin
      .from('cadetes_pagos_extras')
      .select('*')
      .eq('motivo', 'verificar_pago')
      .order('created_at', { ascending: false })

    if (cadeteId) query = query.eq('cadete_id', cadeteId)
    if (pedidoId) query = query.eq('pedido_id', pedidoId)
    if (soloNoLeidas) query = query.eq('leida', false)

    const { data, error } = await query.limit(50)

    if (error) {
      return NextResponse.json({ ok: true, notificaciones: [] })
    }

    return NextResponse.json({ ok: true, notificaciones: data || [] })
  } catch (error: any) {
    return NextResponse.json({ ok: true, notificaciones: [], error: error.message })
  }
}

export async function POST(request: Request) {
  try {
    const sesion = await obtenerSesion()
    if (!sesion || sesion.rol !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const body = await request.json()
    const { cadeteId, cadeteNombre, monto, pedidoId, metodo, comprobanteUrl, mensaje } = body

    if (!monto) {
      return NextResponse.json({ error: 'Falta el monto' }, { status: 400 })
    }

    const supabaseAdmin = obtenerSupabaseAdmin()
    const ahora = new Date().toISOString()
    const fechaHoy = ahora.slice(0, 10)
    const cadeteLocal = cadeteId || 'local'
    const nombreLocal = cadeteNombre || 'Local / Mostrador'

    const { error } = await supabaseAdmin.from('cadetes_pagos_extras').insert({
      cadete_id: cadeteLocal,
      cadete_nombre: nombreLocal,
      monto: Number(monto),
      motivo: 'verificar_pago',
      creado_en: ahora,
      fecha: fechaHoy,
      notas: mensaje || (pedidoId ? `Pedido ${pedidoId}` : null),
      comprobante_url: comprobanteUrl || null,
      metodo_pago: metodo || 'efectivo',
      leida: false,
    })

    if (error) {
      return NextResponse.json(
        { error: 'Error al registrar notificación de pago: ' + error.message },
        { status: 500 }
      )
    }

    // Señal ligera por broadcast (no satura cuota Realtime: es solo aviso, sin datos de tabla)
    try {
      await notificarCambioPedido(cadeteLocal, 'update')
    } catch {
      // Ignorar fallo de broadcast
    }

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const sesion = await obtenerSesion()
    if (!sesion || (sesion.rol !== 'admin' && sesion.rol !== 'cajero')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    }

    const supabaseAdmin = obtenerSupabaseAdmin()
    const { error } = await supabaseAdmin
      .from('cadetes_pagos_extras')
      .update({ leida: true })
      .eq('id', id)
      .eq('motivo', 'verificar_pago')

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 })
  }
}
