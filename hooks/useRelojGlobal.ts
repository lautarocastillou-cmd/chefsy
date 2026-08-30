'use client'

import { useState, useEffect } from 'react'

type Suscriptor = (ahoraMs: number) => void
const suscriptores = new Set<Suscriptor>()
let intervaloId: NodeJS.Timeout | null = null
let timestampActual = Date.now()

function iniciarReloj() {
  if (intervaloId !== null) return
  intervaloId = setInterval(() => {
    timestampActual = Date.now()
    suscriptores.forEach((suscriptor) => suscriptor(timestampActual))
  }, 1000)
}

function detenerReloj() {
  if (intervaloId !== null && suscriptores.size === 0) {
    clearInterval(intervaloId)
    intervaloId = null
  }
}

/**
 * Hook singleton ultraliviano que suscribe el componente a un reloj maestro global de 1 segundo (milisegundos).
 * Evita instanciar objetos Date() constantes y reduce a cero la presión sobre el Garbage Collector.
 * @param activo Si es false, no se suscribe al reloj (ej: pedidos entregados/cancelados).
 */
export function useRelojGlobal(activo: boolean = true): number {
  const [ahoraMs, setAhoraMs] = useState<number>(() => timestampActual)

  useEffect(() => {
    if (!activo) return

    const suscriptor: Suscriptor = (nuevoMs) => {
      setAhoraMs(nuevoMs)
    }

    suscriptores.add(suscriptor)
    iniciarReloj()

    return () => {
      suscriptores.delete(suscriptor)
      detenerReloj()
    }
  }, [activo])

  return ahoraMs
}

