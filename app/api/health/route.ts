import { NextResponse } from 'next/server'
import { supabaseAnon } from '@/lib/supabase'
import { enviarAlertaTelegram } from '@/lib/telegram-alertas'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const TIEMPO_INICIO = Date.now()

export async function GET() {
  const inicioVerificacion = Date.now()
  let dbConectada = false
  let dbLatencia = 0
  let errorDbMensaje = ''

  try {
    const dbInicio = Date.now()
    // Verificación rápida con timeout de 4 segundos
    const timeoutPromesa = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout de 4000ms al conectar con Supabase')), 4000)
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
      // Si hay un error real de conexión/permisos (no simplemente que la tabla esté vacía)
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

  // Si la base de datos no responde, notificamos a Telegram y devolvemos 503
  if (!dbConectada) {
    // Despacho no bloqueante de alerta a Telegram
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

    return NextResponse.json(
      {
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
      },
      {
        status: 503,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    )
  }

  // Todo operativo: 200 OK
  return NextResponse.json(
    {
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
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  )
}
