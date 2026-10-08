import { NextResponse } from 'next/server'
import webpush from 'web-push'
import { obtenerSupabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  const authorization = request.headers.get('authorization')
  if (!secret || authorization !== `Bearer ${secret}`) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!publicKey || !privateKey) return NextResponse.json({ error: 'Web Push no configurado.' }, { status: 503 })
  webpush.setVapidDetails('mailto:soporte@chefsy.app', publicKey, privateKey)

  const supabase = obtenerSupabaseAdmin()
  const { data: reservas, error } = await supabase
    .from('reservas_malu')
    .select('id,nombre,recordatorio_at')
    .eq('estado', 'active')
    .not('recordatorio_at', 'is', null)
    .is('notificado_at', null)
    .lte('recordatorio_at', new Date().toISOString())
    .limit(100)
  if (error) {
    console.error('[Reservas Cron] Error consultando reservas:', error)
    return NextResponse.json({ error: 'Error consultando recordatorios.' }, { status: 500 })
  }
  if (!reservas?.length) return NextResponse.json({ sent: 0 })

  const { data: subs, error: subsError } = await supabase.from('reservas_malu_push').select('endpoint,subscription_json')
  if (subsError) {
    console.error('[Reservas Cron] Error consultando suscripciones:', subsError)
    return NextResponse.json({ error: 'Error consultando suscripciones.' }, { status: 500 })
  }
  if (!subs?.length) return NextResponse.json({ sent: 0, pending: reservas.length, reason: 'no_subscriptions' })

  let sent = 0
  const staleEndpoints: string[] = []
  for (const reserva of reservas) {
    const payload = JSON.stringify({
      title: 'Malú · Recordatorio de reserva',
      body: `Revisá la reserva de ${reserva.nombre}.`,
      url: `${process.env.RESERVAS_APP_URL || 'https://malu-reservas.vercel.app'}/#reservations`,
      tag: `reserva-${reserva.id}`,
    })
    let delivered = false
    for (const sub of subs) {
      try {
        await webpush.sendNotification(sub.subscription_json, payload)
        delivered = true
        sent += 1
      } catch (pushError: unknown) {
        const statusCode = typeof pushError === 'object' && pushError !== null && 'statusCode' in pushError ? Number(pushError.statusCode) : 0
        if (statusCode === 404 || statusCode === 410) staleEndpoints.push(sub.endpoint)
        else console.error('[Reservas Cron] Error enviando push:', pushError)
      }
    }
    if (delivered) {
      await supabase.from('reservas_malu').update({ notificado_at: new Date().toISOString() }).eq('id', reserva.id)
    }
  }
  if (staleEndpoints.length) await supabase.from('reservas_malu_push').delete().in('endpoint', [...new Set(staleEndpoints)])
  return NextResponse.json({ sent, reservations: reservas.length })
}
