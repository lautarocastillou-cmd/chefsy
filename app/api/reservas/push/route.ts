import { NextResponse } from 'next/server'
import webpush from 'web-push'
import { autorizarReservas, corsHeaders } from '@/lib/reservas-auth'
import { obtenerSupabaseAdmin } from '@/lib/supabase-admin'

function configurarVapid() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!publicKey || !privateKey) throw new Error('Web Push no está configurado en Chefsy.')
  webpush.setVapidDetails('mailto:soporte@chefsy.app', publicKey, privateKey)
  return publicKey
}

export async function OPTIONS(request: Request) {
  const headers = corsHeaders(request.headers.get('origin'))
  headers.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  return new NextResponse(null, { status: 204, headers })
}

export async function GET(request: Request) {
  const headers = corsHeaders(request.headers.get('origin'))
  if (!await autorizarReservas(request)) return NextResponse.json({ error: 'Sesión vencida.' }, { status: 401, headers })
  try {
    return NextResponse.json({ vapidPublicKey: configurarVapid() }, { headers })
  } catch (error) {
    console.error('[Reservas Push] Configuración:', error)
    return NextResponse.json({ error: 'Notificaciones no configuradas en el servidor.' }, { status: 503, headers })
  }
}

export async function POST(request: Request) {
  const headers = corsHeaders(request.headers.get('origin'))
  if (!await autorizarReservas(request)) return NextResponse.json({ error: 'Sesión vencida.' }, { status: 401, headers })
  try {
    const body = await request.json()
    const subscription = body?.subscription
    if (typeof subscription?.endpoint !== 'string' || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      return NextResponse.json({ error: 'Suscripción Web Push inválida.' }, { status: 400, headers })
    }
    const { error } = await obtenerSupabaseAdmin().from('reservas_malu_push').upsert({
      endpoint: subscription.endpoint,
      subscription_json: subscription,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'endpoint' })
    if (error) throw error
    return NextResponse.json({ ok: true }, { headers })
  } catch (error) {
    console.error('[Reservas Push] Error guardando suscripción:', error)
    return NextResponse.json({ error: 'No se pudo guardar la suscripción.' }, { status: 500, headers })
  }
}
