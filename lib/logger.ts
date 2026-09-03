'use client'

export interface EntradaLog {
  id: string
  timestamp: number
  hora: string
  nivel: 'error' | 'warn' | 'info'
  modulo: string
  mensaje: string
}

const MAX_LOGS = 10
let logsEnMemoria: EntradaLog[] = []

export function registrarLogSistema(nivel: 'error' | 'warn' | 'info', modulo: string, mensaje: string) {
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

// Capturar excepciones no controladas en el navegador
if (typeof window !== 'undefined') {
  window.addEventListener('error', (e) => {
    if (e.message) {
      registrarLogSistema('error', 'UI Error', e.message)
    }
  })

  window.addEventListener('unhandledrejection', (e) => {
    const razon = e.reason?.message || String(e.reason || 'Promesa asíncrona rechazada')
    registrarLogSistema('error', 'Async/Fetch', razon)
  })
}
