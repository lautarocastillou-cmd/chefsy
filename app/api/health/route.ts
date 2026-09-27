import { NextResponse } from 'next/server'
import { supabaseAnon } from '@/lib/supabase'
import { enviarAlertaTelegram } from '@/lib/telegram-alertas'
import { obtenerDeCache, guardarEnCache } from '@/lib/cache-servidor'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const TIEMPO_INICIO = Date.now()
const CACHE_KEY_HEALTH = 'health_check_status'
const CACHE_KEY_LAST_ALERT = 'health_check_last_alert'

export async function GET() {
  // 1. Revisar caché en memoria (15 segundos) para no saturar Postgres ni el event loop
  const cached = obtenerDeCache<any>(CACHE_KEY_HEALTH)
  if (cached) {
    return NextResponse.json(cached.body, {
      status: cached.status,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Health-Cache': 'HIT',
      }
    })
  }

  const inicioVerificacion = Date.now()
  let dbConectada = false
  let dbLatencia = 0
  let errorDbMensaje = ''

  try {
    const dbInicio = Date.now()
    // Verificación con timeout acotado a 2500ms
    const timeoutPromesa = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout de 2500ms al conectar con Supabase')), 2500)
    )

    const consultaPromesa = supabaseAnon
      .from('configuracion_tienda')
      .select('id')
      .limit(1)

    const resultado = (await Promise.race([consultaPromesa, timeoutPromesa])) as {
      error: { message: string } | null
    }

    dbLatencia = Date.now() - dbInicio

    if (resultado.error && !resultado.error.message.includes('PGRST116')) {
      errorDbMensaje = resultado.error.message
      dbConectada = false
    } else {
      dbConectada = true
    }
  } catch (err: unknown) {
    dbConectada = false
    errorDbMensaje = err instanceof Error ? err.message : String(err)
    dbLatencia = Date.now() - inicioVerificacion
  }

  const uptimeSegundos = Math.floor((Date.now() - TIEMPO_INICIO) / 1000)
  const fechaIso = new Date().toISOString()

  // Si la base de datos no responde, notificamos a Telegram (máximo 1 alerta cada 5 minutos) y devolvemos 503
  if (!dbConectada) {
    const yaAlerto = obtenerDeCache<boolean>(CACHE_KEY_LAST_ALERT)
    if (!yaAlerto) {
      guardarEnCache(CACHE_KEY_LAST_ALERT, true, 300) // 5 min de throttling
      enviarAlertaTelegram({
        titulo: 'Fallo de Servidor / Base de Datos en Health Check',
        modulo: 'API /health',
        severidad: 'critico',
        mensaje: `El endpoint de salud detectó una falla al consultar Supabase.\nDetalle: ${errorDbMensaje}\nLatencia acumulada: ${dbLatencia}ms`,
        url: '/api/health',
        contexto: {
          uptime_segundos: uptimeSegundos,
          fecha: fechaIso,
        },
      }).catch(() => {})
    }

    const errorBody = {
      status: 'error',
      mensaje: 'Falla en servicio de base de datos',
      timestamp: fechaIso,
      uptime_segundos: uptimeSegundos,
      servicios: {
        web: 'operativo',
        supabase: {
          estado: 'desconectado',
          error: errorDbMensaje,
          latencia_ms: dbLatencia,
        },
      },
    }
    guardarEnCache(CACHE_KEY_HEALTH, { status: 503, body: errorBody }, 15)
    return NextResponse.json(errorBody, {
      status: 503,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    })
  }

  // Todo operativo: 200 OK
  const okBody = {
    status: 'ok',
    mensaje: 'Todos los servicios operativos',
    timestamp: fechaIso,
    uptime_segundos: uptimeSegundos,
    latencia_total_ms: Date.now() - inicioVerificacion,
    servicios: {
      web: 'operativo',
      supabase: {
        estado: 'conectado',
        latencia_ms: dbLatencia,
      },
    },
  }
  guardarEnCache(CACHE_KEY_HEALTH, { status: 200, body: okBody }, 15)
  return NextResponse.json(okBody, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  })
}
