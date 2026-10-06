import { NextRequest, NextResponse } from 'next/server'
import { enviarAlertaTelegram } from '@/lib/telegram-alertas'
import { obtenerIpCliente, verificarRateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

// Errores comunes causados por extensiones del navegador de clientes, WebViews o cancelaciones normales de peticiones fetch (AbortController)
const ERRORES_IGNORADOS = [
  'ResizeObserver loop completed with undelivered notifications',
  'ResizeObserver loop limit exceeded',
  'chrome-extension://',
  'moz-extension://',
  'safari-extension://',
  'Script error.',
  'Failed to fetch', // A menudo usuarios que cierran la pestaña o se quedan sin 4G súbitamente
  'NetworkError when attempting to fetch resource',
  'The operation was aborted',
  'signal is aborted without reason',
  'The user aborted a request',
  'AbortError',
  'aborted without reason',
  'user aborted a request',
  'signal is aborted',
  'Java object is gone', // WebView de Meta/Instagram/Facebook al cerrar o cambiar de app
  'iabjs://', // Scripts inyectados por el navegador interno de Instagram/Facebook
  'navigation_performance_logger',
  'postMessage: Java object is gone',
  'Text content does not match server-rendered HTML',
  'Minified React error #418',
  'Minified React error #423',
  'Minified React error #425',
  'Hydration failed because',
  'error while hydrating',
]

export async function POST(req: NextRequest) {
  try {
    // 1. Rate Limiting por IP: máximo 5 reportes por minuto por IP para evitar saturar el bot de Telegram
    const ip = obtenerIpCliente(req)
    const rateCheck = verificarRateLimit(`reportar-error:${ip}`, 5, 60)
    if (!rateCheck.permitido) {
      return NextResponse.json(
        { ok: false, error: 'Demasiados reportes enviados. Intente más tarde.' },
        { status: 429, headers: { 'Retry-After': String(rateCheck.segundosParaReset) } }
      )
    }

    const cuerpo = await req.json()
    const { mensaje, modulo, url, stack, usuario, severidad, contexto } = cuerpo

    if (!mensaje || typeof mensaje !== 'string') {
      return NextResponse.json({ ok: false, error: 'Mensaje requerido' }, { status: 400 })
    }

    // Filtrar falsos positivos de extensiones de clientes
    const esErrorIgnorable = ERRORES_IGNORADOS.some(
      (patron) =>
        mensaje.toLowerCase().includes(patron.toLowerCase()) ||
        (stack && typeof stack === 'string' && stack.toLowerCase().includes(patron.toLowerCase()))
    )

    if (esErrorIgnorable) {
      return NextResponse.json({ ok: true, filtrado: true })
    }

    const userAgent = req.headers.get('user-agent') || 'Desconocido'

    // Despacho asíncrono no bloqueante a Telegram (no detiene la respuesta al cliente)
    enviarAlertaTelegram({
      titulo: 'Excepción Capturada en Cliente',
      mensaje: mensaje.slice(0, 500),
      modulo: (typeof modulo === 'string' ? modulo.slice(0, 60) : '') || 'Frontend / Tienda',
      severidad: severidad || 'error',
      url: (typeof url === 'string' ? url.slice(0, 200) : '') || req.headers.get('referer')?.slice(0, 200) || undefined,
      stack: typeof stack === 'string' ? stack.slice(0, 1000) : undefined,
      usuario: typeof usuario === 'string' ? usuario.slice(0, 60) : undefined,
      contexto: {
        ...(contexto || {}),
        navegador: userAgent.slice(0, 150),
        ip_origen: ip,
      },
    }).catch((err) => console.error('[API reportar-error] Fallo alerta Telegram:', err))

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[API reportar-error] Error procesando reporte:', error)
    return NextResponse.json({ ok: false, error: 'Error procesando reporte' }, { status: 500 })
  }
}
