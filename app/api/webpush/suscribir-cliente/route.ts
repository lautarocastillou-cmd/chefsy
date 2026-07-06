import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function obtenerSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Faltan credenciales de Supabase')
  return createClient(url, key, { auth: { persistSession: false } })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { pedido_id, subscription } = body

    if (!pedido_id || !subscription) {
      return NextResponse.json({ error: 'Datos incompletos.' }, { status: 400 })
    }

    const supabase = obtenerSupabaseAdmin()

    // Verificar que el pedido exista y esté en un estado activo
    const { data: pedidoBd, error: errorBusqueda } = await supabase
      .from('pedidos')
      .select('id, estado, archivado')
      .eq('id', pedido_id)
      .single()

    if (errorBusqueda || !pedidoBd) {
      return NextResponse.json({ error: 'Pedido no encontrado.' }, { status: 404 })
    }

    if (pedidoBd.archivado || ['entregado', 'cancelado'].includes(pedidoBd.estado)) {
      return NextResponse.json({ error: 'El pedido ya fue finalizado o archivado.' }, { status: 403 })
    }

    // Guardar la suscripción push directamente en la columna push_subscription del pedido
    const { error } = await supabase
      .from('pedidos')
      .update({ push_subscription: subscription })
      .eq('id', pedido_id)

    if (error) {
      console.error('[WebPush API] Error Supabase:', error)
      throw error
    }

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('[WebPush API] Error guardando suscripción del cliente:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor.' },
      { status: 500 }
    )
  }
}
