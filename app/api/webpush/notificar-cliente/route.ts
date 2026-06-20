import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'
import { obtenerSesion } from '@/lib/auth-server'

let vapidConfigured = false

function configurarVapid() {
  if (vapidConfigured) return true
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  
  if (!publicKey || !privateKey) {
    console.warn('Faltan claves VAPID para enviar notificaciones web push.')
    return false
  }
  
  webpush.setVapidDetails(
    'mailto:soporte@chefsy.app',
    publicKey,
    privateKey
  )
  vapidConfigured = true
  return true
}

function obtenerSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Faltan credenciales de Supabase')
  return createClient(url, key, { auth: { persistSession: false } })
}

export async function POST(request: Request) {
  try {
    const sesion = await obtenerSesion()
    if (!sesion) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { pedidoId, mensaje } = body

    if (!pedidoId || !mensaje) {
      return NextResponse.json({ error: 'Faltan parámetros.' }, { status: 400 })
    }

    const supabase = obtenerSupabaseAdmin()

    // Obtener el token del cliente desde la tabla pedidos
    const { data: pedido, error: dbError } = await supabase
      .from('pedidos')
      .select('push_subscription')
      .eq('id', pedidoId)
      .single()

    if (dbError || !pedido || !pedido.push_subscription) {
      console.log(`[WebPush] No hay suscripción push para el pedido ${pedidoId}`)
      // No devolvemos error 500 porque es común que el cliente no haya aceptado notificaciones
      return NextResponse.json({ ok: false, error: 'Cliente no suscrito a notificaciones' })
    }

    if (!configurarVapid()) {
      return NextResponse.json({ error: 'VAPID no configurado' }, { status: 500 })
    }

    const payload = JSON.stringify({
      title: 'Aviso de tu pedido 🍔',
      body: mensaje,
      url: '/'
    })

    await webpush.sendNotification(pedido.push_subscription, payload)

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('[WebPush API] Error enviando notificación push al cliente:', error)
    // Si la suscripción expiró, webpush tirará un StatusCodeError (410 Gone)
    if (error.statusCode === 410 || error.statusCode === 404) {
       console.log('La suscripción push del cliente ya no es válida o expiró.')
    }
    return NextResponse.json(
      { error: 'Error al enviar notificación' },
      { status: 500 }
    )
  }
}
