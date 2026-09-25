'use client'

export interface EntradaLog {
  id: string
  timestamp: number
  hora: string
  nivel: 'error' | 'warn' | 'info'
  modulo: string
  mensaje: string
}

const MAX_LOGS = 20
let logsEnMemoria: EntradaLog[] = []

// Despacho no bloqueante al servidor para alertar en Telegram
function enviarReporteAlServidor(modulo: string, mensaje: string, stack?: string) {
  if (typeof window === 'undefined') return

  try {
    const payload = JSON.stringify({
      mensaje,
      modulo,
      url: window.location.href,
      stack,
      severidad: 'error',
    })

    // navigator.sendBeacon es el método más seguro y no bloqueante en navegadores
    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' })
      navigator.sendBeacon('/api/reportar-error', blob)
    } else {
      fetch('/api/reportar-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => {})
    }
  } catch {
    // Si falla el reporte silencioso, no generar error adicional en consola
  }
}

export function registrarLogSistema(
  nivel: 'error' | 'warn' | 'info',
  modulo: string,
  mensaje: string,
  stack?: string
) {
  if (typeof window === 'undefined') return

  const ahora = new Date()
  const entrada: EntradaLog = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: Date.now(),
    hora: ahora.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    nivel,
    modulo,
    mensaje,
  }

  logsEnMemoria = [entrada, ...logsEnMemoria.slice(0, MAX_LOGS - 1)]
  window.dispatchEvent(new CustomEvent('chefsy:nuevo-log', { detail: entrada }))

  // Si es un error real, enviarlo al bot de Telegram
  if (nivel === 'error') {
    enviarReporteAlServidor(modulo, mensaje, stack)
  }
}

/**
 * Permite reportar manualmente un error atrapado en un bloque catch de cualquier componente
 */
export function reportarErrorManualmente(
  error: unknown,
  modulo = 'Manual',
  contexto?: Record<string, unknown>
) {
  const mensaje = error instanceof Error ? error.message : String(error)
  const stack = error instanceof Error ? error.stack : undefined

  registrarLogSistema('error', modulo, mensaje, stack)

  if (contexto && typeof window !== 'undefined') {
    try {
      fetch('/api/reportar-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mensaje,
          modulo,
          url: window.location.href,
          stack,
          contexto,
          severidad: 'error',
        }),
        keepalive: true,
      }).catch(() => {})
    } catch {
      // Ignorar fallo de envío
    }
  }
}

export function obtenerLogsSistema(): EntradaLog[] {
  return [...logsEnMemoria]
}

export function limpiarLogsSistema(): void {
  logsEnMemoria = []
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('chefsy:nuevo-log'))
  }
}

// Capturar excepciones no controladas en el navegador del cliente
if (typeof window !== 'undefined') {
  const esAbortError = (msg: string, errObj?: any) => {
    const texto = (msg || '').toLowerCase()
    const nombre = (errObj?.name || '').toLowerCase()
    return (
      nombre === 'aborterror' ||
      texto.includes('abort') ||
      texto.includes('aborted without reason') ||
      texto.includes('the user aborted a request') ||
      texto.includes('the operation was aborted')
    )
  }

  window.addEventListener('error', (e) => {
    if (e.message) {
      if (esAbortError(e.message, e.error)) {
        return
      }
      // Ignorar fallos de in-app browsers de terceros (ej: Instagram/Facebook WebView cerrándose)
      if (e.message.includes('Java object is gone') || e.message.includes('iabjs://') || e.filename?.includes('iabjs://')) {
        return
      }
      registrarLogSistema('error', 'UI Crash', e.message, e.error?.stack)
    }
  })

  window.addEventListener('unhandledrejection', (e) => {
    const razon = e.reason instanceof Error ? e.reason.message : String(e.reason || 'Promesa asíncrona rechazada')
    if (esAbortError(razon, e.reason)) {
      return
    }
    if (razon.includes('Java object is gone') || razon.includes('iabjs://')) {
      return
    }
    const stack = e.reason instanceof Error ? e.reason.stack : undefined
    registrarLogSistema('error', 'Async Rejection', razon, stack)
  })
}
