'use client'

import { useSyncExternalStore } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// hooks/useRelojGlobal.ts
//
// Store externo de reloj global singleton.
// Usa useSyncExternalStore (React 18) para que todos los TimerPedido activos
// que lean el mismo store sean batched por React en un único ciclo de render
// por segundo — en lugar de N setState independientes que generaban N ciclos
// separados de reconciliación.
// ─────────────────────────────────────────────────────────────────────────────

let timestampActual = Date.now()
let intervaloId: ReturnType<typeof setInterval> | null = null
const suscriptores = new Set<() => void>()

function notificarSuscriptores() {
  suscriptores.forEach((fn) => fn())
}

function suscribir(fn: () => void): () => void {
  suscriptores.add(fn)

  // Arrancar el reloj global la primera vez que hay un suscriptor
  if (intervaloId === null) {
    intervaloId = setInterval(() => {
      timestampActual = Date.now()
      notificarSuscriptores()
    }, 1000)
  }

  return () => {
    suscriptores.delete(fn)
    // Detener el reloj cuando no hay más suscriptores activos
    if (suscriptores.size === 0 && intervaloId !== null) {
      clearInterval(intervaloId)
      intervaloId = null
    }
  }
}

function obtenerSnapshot(): number {
  return timestampActual
}

function obtenerSnapshotServidor(): number {
  // En SSR, devolver un valor estable (0) — los timers son siempre client-only
  return 0
}

/**
 * Hook singleton ultraliviano que suscribe el componente al reloj maestro global.
 * Con useSyncExternalStore, React 18 batchea TODOS los TimerPedido activos
 * en un único ciclo de reconciliación por segundo, eliminando los N re-renders
 * independientes que causaban jank visible en listas largas.
 *
 * @param activo Si es false, retorna el timestamp actual sin suscribirse al reloj.
 *               Úsalo para pedidos en estado final (entregado/cancelado) que no
 *               necesitan actualización en tiempo real.
 */
export function useRelojGlobal(activo: boolean = true): number {
  const snapshot = useSyncExternalStore(
    activo ? suscribir : (_fn: () => void) => () => {},
    obtenerSnapshot,
    obtenerSnapshotServidor
  )
  return snapshot
}
