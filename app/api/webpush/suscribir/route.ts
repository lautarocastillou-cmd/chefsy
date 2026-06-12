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
    const { usuario_id, subscription } = body

    if (!usuario_id || !subscription) {
      return NextResponse.json({ error: 'Datos incompletos.' }, { status: 400 })
    }

    const supabase = obtenerSupabaseAdmin()

    // Upsert the subscription for this user
    // If a user logs in on a new device, it will overwrite their previous subscription
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        usuario_id: usuario_id,
        subscription_json: subscription
      }, { onConflict: 'usuario_id' })

    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('[WebPush API] Error guardando suscripción:', error)
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor.' },
      { status: 500 }
    )
  }
}
