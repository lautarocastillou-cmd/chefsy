'use client'
// ─────────────────────────────────────────────────────
// hooks/useSincronizacionOffline.ts
// Responsabilidad única: cola de sincronización offline.
// Escucha eventos 'online'/'offline', cambios en la cola local
// y ejecuta reintentos periódicos mientras haya acciones
// pendientes para evitar que pedidos queden atrapados en
// localStorage tras micro-cortes de red.
// ─────────────────────────────────────────────────────

import { useEffect, useRef } from 'react'
import {
  EVENTO_OFFLINE_QUEUE_ACTUALIZADA,
  guardarColaOffline,
  leerColaOffline,
  type ItemColaOffline,
} from '@/lib/pedidos-reconciliacion'

const INTERVALO_REINTENTO_OFFLINE_MS = 8_000

interface UseSincronizacionOfflineProps {
  setDbEstado: (estado: 'conectado' | 'desconectado' | 'cargando') => void
  agregarNotificacion: (mensaje: string, tipo: 'info' | 'success' | 'warning') => void
  isAdmin?: boolean
  onSincronizado?: () => void
}

export function useSincronizacionOffline({
  setDbEstado,
  agregarNotificacion,
  isAdmin = false,
  onSincronizado,
}: UseSincronizacionOfflineProps) {
  const sincronizandoRef = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !isAdmin) return

    const syncOfflineQueue = async () => {
      if (sincronizandoRef.current) return
      if (!navigator.onLine) return

      const { items: queue, descartados } = leerColaOffline(window.localStorage)
      if (descartados > 0) {
        console.warn(`[Offline Sync] Se descartaron ${descartados} acciones vencidas o corruptas de la cola offline.`)
        guardarColaOffline(window.localStorage, queue)
      }
      if (queue.length === 0) return

      sincronizandoRef.current = true
      try {
        console.log(`[Offline Sync] Sincronizando ${queue.length} acciones pendientes...`)
        const nuevasEncoladas: ItemColaOffline[] = []
        let huboExito = false
        const erroresPermanentes: string[] = []

        for (const item of queue) {
          try {
            const respuesta = await fetch('/api/admin/pedidos', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(item.payload),
            })

            if (respuesta.ok) {
              huboExito = true
              continue
            }

            // 4xx (excepto 408/429) son rechazos permanentes del servidor: no trabar la cola indefinidamente
            const esErrorClientePermanente =
              respuesta.status >= 400 &&
              respuesta.status < 500 &&
              respuesta.status !== 408 &&
              respuesta.status !== 429

            if (esErrorClientePermanente) {
              const errorData = await respuesta.json().catch(() => ({}))
              const detalle = errorData?.error || `HTTP ${respuesta.status}`
              console.error('[Offline Sync] Acción rechazada permanentemente por el servidor:', {
                status: respuesta.status,
                detalle,
                accion: item.payload?.accion,
                pedidoId: item.payload?.pedido?.id || item.payload?.id,
              })
              erroresPermanentes.push(detalle)
            } else {
              nuevasEncoladas.push({
                ...item,
                intentos: (item.intentos || 0) + 1,
              })
            }
          } catch (err) {
            console.error('[Offline Sync] Fallo de red al sincronizar acción:', err)
            nuevasEncoladas.push({
              ...item,
              intentos: (item.intentos || 0) + 1,
            })
          }
        }

        // Volver a leer por si se encoló algo nuevo mientras sincronizábamos
        const { items: colaActual } = leerColaOffline(window.localStorage)
        const idsProcesados = new Set(queue.map((q) => `${q.timestamp}:${q.payload?.accion}:${q.payload?.pedido?.id || q.payload?.id || ''}`))
        const nuevosDuranteSync = colaActual.filter(
          (q) => !idsProcesados.has(`${q.timestamp}:${q.payload?.accion}:${q.payload?.pedido?.id || q.payload?.id || ''}`)
        )
        const colaFinal = [...nuevasEncoladas, ...nuevosDuranteSync]

        guardarColaOffline(window.localStorage, colaFinal)

        if (huboExito) {
          onSincronizado?.()
          if (colaFinal.length === 0) {
            agregarNotificacion('Se sincronizaron los pedidos pendientes correctamente.', 'success')
          }
        }

        if (erroresPermanentes.length > 0) {
          agregarNotificacion(
            `Una acción pendiente fue rechazada por el servidor: ${erroresPermanentes[0]}`,
            'warning'
          )
        }
      } catch (e) {
        console.error('[Offline Sync] Error procesando offline queue:', e)
      } finally {
        sincronizandoRef.current = false
      }
    }

    const handleOnline = () => {
      setDbEstado('conectado')
      void syncOfflineQueue()
    }
    const handleOffline = () => {
      setDbEstado('desconectado')
    }
    const handleQueueUpdated = () => {
      if (navigator.onLine) {
        void syncOfflineQueue()
      }
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener(EVENTO_OFFLINE_QUEUE_ACTUALIZADA, handleQueueUpdated)

    // Reintento periódico mientras haya elementos pendientes en la cola
    const intervalo = window.setInterval(() => {
      if (!navigator.onLine) return
      const { items } = leerColaOffline(window.localStorage)
      if (items.length > 0) {
        void syncOfflineQueue()
      }
    }, INTERVALO_REINTENTO_OFFLINE_MS)

    // Intentar sincronizar al arrancar si ya hay conexión
    if (navigator.onLine) {
      void syncOfflineQueue()
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener(EVENTO_OFFLINE_QUEUE_ACTUALIZADA, handleQueueUpdated)
      window.clearInterval(intervalo)
    }
  }, [agregarNotificacion, setDbEstado, isAdmin, onSincronizado])
}
