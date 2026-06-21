'use client'
// ─────────────────────────────────────────────────────
// hooks/useSincronizacionOffline.ts
// Responsabilidad única: cola de sincronización offline.
// Escucha los eventos 'online'/'offline' del navegador,
// actualiza dbEstado y reintenta las acciones encoladas
// cuando la conectividad se recupera.
// ─────────────────────────────────────────────────────

import { useEffect } from 'react'

interface UseSincronizacionOfflineProps {
  setDbEstado: (estado: 'conectado' | 'desconectado' | 'cargando') => void
  agregarNotificacion: (mensaje: string, tipo: 'info' | 'success' | 'warning') => void
}

export function useSincronizacionOffline({
  setDbEstado,
  agregarNotificacion,
}: UseSincronizacionOfflineProps) {
  useEffect(() => {
    if (typeof window === 'undefined') return

    const syncOfflineQueue = async () => {
      const queueStr = localStorage.getItem('chefsy-offline-queue')
      if (!queueStr) return
      try {
        const queue = JSON.parse(queueStr)
        if (!Array.isArray(queue) || queue.length === 0) return

        console.log(`[Offline Sync] Sincronizando ${queue.length} acciones pendientes...`)
        const nuevasEncoladas: typeof queue = []
        let huboExito = false

        for (const item of queue) {
          try {
            const respuesta = await fetch('/api/admin/pedidos', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(item.payload),
            })
            if (respuesta.ok) {
              huboExito = true
            } else {
              nuevasEncoladas.push(item)
            }
          } catch (err) {
            console.error('[Offline Sync] Fallo al sincronizar acción:', err)
            nuevasEncoladas.push(item)
          }
        }

        if (nuevasEncoladas.length === 0) {
          localStorage.removeItem('chefsy-offline-queue')
          if (huboExito) {
            agregarNotificacion('Se sincronizaron los cambios pendientes correctamente.', 'success')
          }
        } else {
          localStorage.setItem('chefsy-offline-queue', JSON.stringify(nuevasEncoladas))
        }
      } catch (e) {
        console.error('Error procesando offline queue:', e)
        localStorage.removeItem('chefsy-offline-queue')
      }
    }

    const handleOnline = () => {
      setDbEstado('conectado')
      syncOfflineQueue()
    }
    const handleOffline = () => {
      setDbEstado('desconectado')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Intentar sincronizar al arrancar si ya hay conexión
    if (navigator.onLine) {
      syncOfflineQueue()
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [agregarNotificacion, setDbEstado])
}
