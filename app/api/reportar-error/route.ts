import { NextRequest, NextResponse } from 'next/server'
import { enviarAlertaTelegram } from '@/lib/telegram-alertas'

export const dynamic = 'force-dynamic'

// Errores comunes causados por extensiones del navegador de clientes que no competen al código de Chefsy
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
]

export async function POST(req: NextRequest) {
  try {
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
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'Desconocida'

    // Despacho asíncrono a Telegram
    await enviarAlertaTelegram({
      titulo: 'Excepción Capturada en Cliente',
      mensaje,
      modulo: modulo || 'Frontend / Tienda',
      severidad: severidad || 'error',
      url: url || req.headers.get('referer') || undefined,
      stack,
      usuario,
      contexto: {
        ...(contexto || {}),
        navegador: userAgent.slice(0, 150),
        ip_origen: ip.split(',')[0].trim(),
      },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[API reportar-error] Error procesando reporte:', error)
    return NextResponse.json({ ok: false, error: 'Error procesando reporte' }, { status: 500 })
  }
}
