'use client'
// ─────────────────────────────────────────────────────
// hooks/useAlertasInactividad.ts
// Responsabilidad única: intervalo de 10 segundos que
// detecta pedidos que llevan demasiado tiempo en un
// estado y dispara notificaciones de advertencia.
//
// Usa useRef para acceder a los pedidos actuales sin
// que el intervalo se recree cada vez que llega un
// pedido nuevo por realtime (M4 de la auditoría).
// ─────────────────────────────────────────────────────

import { useEffect, useRef, MutableRefObject } from 'react'
import { Pedido, EstadoPedido } from '@/tipos'
import { reproducirSonidoNotificacion } from '@/contexto/TemaNotificacionContexto'
import { Usuario } from '@/contexto/AuthContexto'

interface UseAlertasInactividadProps {
  pedidos: Pedido[]
  usuarioActivo: Usuario | null
  agregarNotificacion: (mensaje: string, tipo: 'info' | 'success' | 'warning') => void
}

export function useAlertasInactividad({
  pedidos,
  usuarioActivo,
  agregarNotificacion,
}: UseAlertasInactividadProps) {
  // Ref para acceder al array de pedidos actual dentro del intervalo
  // sin convertirlo en dependencia (evita recrear el intervalo en cada cambio)
  const pedidosRef = useRef<Pedido[]>(pedidos)
  useEffect(() => {
    pedidosRef.current = pedidos
  }, [pedidos])

  // Ref para la función agregarNotificacion (estabiliza la dependencia del efecto)
  const agregarNotificacionRef = useRef(agregarNotificacion)
  useEffect(() => {
    agregarNotificacionRef.current = agregarNotificacion
  }, [agregarNotificacion])

  // Registro de alertas ya enviadas para evitar repeticiones no controladas
  const alertasEnviadasRef = useRef<Record<string, number>>({})

  useEffect(() => {
    // Solo corre para administradores
    if (usuarioActivo?.rol !== 'admin') return

    const interval = setInterval(() => {
      const ahora = Date.now()

      pedidosRef.current.forEach((pedido) => {
        const estadoActual = pedido.estado as EstadoPedido
        if (!['nuevo', 'en_cocina', 'listo'].includes(estadoActual)) return

        let fechaInicio: string | null | undefined = null
        if (estadoActual === 'nuevo') {
          fechaInicio = pedido.created_at
        } else if (estadoActual === 'en_cocina') {
          fechaInicio = pedido.cocina_at || pedido.created_at
        } else if (estadoActual === 'listo') {
          fechaInicio = pedido.listo_at || pedido.cocina_at || pedido.created_at
        }

        if (!fechaInicio) return
        const startMs = new Date(fechaInicio).getTime()
        const transcurridoMs = ahora - startMs

        let limiteMs = 0
        let repeticionMs: number | null = null
        let msgEstado = ''

        if (estadoActual === 'nuevo') {
          limiteMs = 1 * 60 * 1000
          repeticionMs = 1 * 60 * 1000
          msgEstado = 'nuevo'
        } else if (estadoActual === 'en_cocina') {
          limiteMs = 45 * 60 * 1000
          repeticionMs = null
          msgEstado = 'en cocina'
        } else if (estadoActual === 'listo') {
          limiteMs = 10 * 60 * 1000
          repeticionMs = null
          msgEstado = 'listo'
        }

        if (transcurridoMs >= limiteMs) {
          const key = `${pedido.id}_${estadoActual}`
          const ultimaAlerta = alertasEnviadasRef.current[key]

          let deberiaAlertar = false
          if (!ultimaAlerta) {
            deberiaAlertar = true
          } else if (repeticionMs !== null) {
            deberiaAlertar = ahora - ultimaAlerta >= repeticionMs
          }

          if (deberiaAlertar) {
            alertasEnviadasRef.current[key] = ahora
            const tiempoMinutos = Math.round(transcurridoMs / (60 * 1000))
            const msg = `⚠️ El pedido de ${pedido.cliente} lleva ${tiempoMinutos} min en estado "${msgEstado}".`
            agregarNotificacionRef.current(msg, 'warning')
            reproducirSonidoNotificacion()
          }
        }
      })
    }, 10000)

    return () => clearInterval(interval)
  }, [usuarioActivo?.rol]) // Solo se recrea si cambia el rol — no en cada pedido nuevo
}
