'use client'

import { useState, useEffect } from 'react'

type Suscriptor = (ahora: Date) => void
const suscriptores = new Set<Suscriptor>()
let intervaloId: NodeJS.Timeout | null = null
let fechaActual = new Date()

function iniciarReloj() {
  if (intervaloId !== null) return
  intervaloId = setInterval(() => {
    fechaActual = new Date()
    suscriptores.forEach((suscriptor) => suscriptor(fechaActual))
  }, 1000)
}

function detenerReloj() {
  if (intervaloId !== null && suscriptores.size === 0) {
    clearInterval(intervaloId)
    intervaloId = null
  }
}

/**
 * Hook singleton que suscribe el componente a un reloj maestro global de 1 segundo.
 * Evita que se creen N intervalos en paralelo por cada tarjeta de pedido.
 * @param activo Si es false, no se suscribe al reloj (ej: pedidos entregados/cancelados).
 */
export function useRelojGlobal(activo: boolean = true): Date {
  const [ahora, setAhora] = useState<Date>(() => fechaActual)

  useEffect(() => {
    if (!activo) return

    const suscriptor: Suscriptor = (nuevaFecha) => {
      setAhora(nuevaFecha)
    }

    suscriptores.add(suscriptor)
    iniciarReloj()

    return () => {
      suscriptores.delete(suscriptor)
      detenerReloj()
    }
  }, [activo])

  return ahora
}
