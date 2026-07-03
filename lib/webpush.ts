import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

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

export async function enviarNotificacionCadete(usuarioId: string, titulo: string, cuerpo: string, url: string = '/cadeteria') {
  try {
    const supabase = obtenerSupabaseAdmin()
    
    // Obtener suscripción del cadete
    const { data: sub } = await supabase
      .from('push_subscriptions')
      .select('subscription_json')
      .eq('usuario_id', usuarioId)
      .single()

    if (!sub || !sub.subscription_json) {
      console.log(`No hay suscripción para el cadete ${usuarioId}`)
      return false
    }

    if (!configurarVapid()) {
      return false
    }

    const absoluteUrl = url.startsWith('http')
      ? (url.includes('chefsy.xyz') ? url : `https://chefsy.xyz${new URL(url).pathname}`)
      : `https://chefsy.xyz${url.startsWith('/') ? url : '/' + url}`

    const payload = JSON.stringify({
      title: titulo,
      body: cuerpo,
      url: absoluteUrl
    })

    await webpush.sendNotification(sub.subscription_json, payload)
    return true
  } catch (error) {
    console.error('Error enviando push notification:', error)
    return false
  }
}
